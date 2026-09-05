import { afterEach, describe, expect, it } from 'vitest'
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import { DeepSeekAdapter } from '../src/adapter.ts'
import { resolveAdapterOptions } from '../src/index.ts'
import { neutralizePlatformToolDescription } from '../src/serialize.ts'

const servers: Server[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => { resolve() }))))
})

async function listen(handler: Parameters<typeof createServer>[0]): Promise<{ url: string; server: Server }> {
  const server = createServer(handler)
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('mock server did not bind')
  return { url: `http://127.0.0.1:${address.port}`, server }
}

function adapter(
  baseURL: string,
  lifecycleSignal?: AbortSignal,
  overrides: Record<string, unknown> = {},
): DeepSeekAdapter {
  return new DeepSeekAdapter({
    options: () => resolveAdapterOptions({ baseURL, ...overrides }),
    resolveApiKey: () => Promise.resolve('test-key'),
    lifecycleSignal,
  })
}

async function consume(target: DeepSeekAdapter, overrides: Record<string, unknown> = {}): Promise<void> {
  for await (const _chunk of target.stream({
    provider: 'deepseek-private',
    model: 'deepseek-v4-flash',
    messages: [],
    ...overrides,
  } as never)) { /* consume */ }
}

describe('wire metadata', () => {
  it('neutralizes product branding in stock tool descriptions without rewriting extension tools', () => {
    expect(neutralizePlatformToolDescription('bash', 'Run inside DeepSeek Harness.'))
      .toBe('Run inside agent runtime.')
    expect(neutralizePlatformToolDescription('custom_tool', 'User-owned DeepSeek Harness label.'))
      .toBe('User-owned DeepSeek Harness label.')
  })

  it('sends no product-name or correlation fields even for session compaction calls', async () => {
    let headers: IncomingHttpHeaders | undefined
    const mock = await listen((request, response) => {
      headers = request.headers
      request.resume()
      request.on('end', () => {
        response.writeHead(200, { 'content-type': 'text/event-stream' })
        response.end('data: {"choices":[{"delta":{"content":""},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n')
      })
    })
    await consume(adapter(mock.url), { sessionId: 'session-secret', purpose: 'compaction' })
    const serialized = JSON.stringify(headers).toLowerCase()
    expect(serialized).not.toContain('deepseek-harness')
    expect(headers?.['user-agent']).toMatch(/^private-client\/\d+\.\d+\.\d+(?:-[a-z0-9.]+)? /)
    expect(headers?.authorization).toBe('Bearer test-key')
    expect(headers).not.toHaveProperty('x-deepseek-harness-user-id')
    expect(headers).not.toHaveProperty('x-deepseek-harness-session-id')
    expect(headers).not.toHaveProperty('x-deepseek-harness-compact')
  })

  it('rejects redirects before credentials or request data reach the target', async () => {
    let targetHits = 0
    const target = await listen((_request, response) => { targetHits += 1; response.writeHead(200).end() })
    const origin = await listen((request, response) => {
      request.resume()
      request.on('end', () => { response.writeHead(307, { location: `${target.url}/chat/completions` }).end() })
    })
    await expect(consume(adapter(origin.url))).rejects.toMatchObject({ code: 'TRANSPORT' })
    expect(targetHits).toBe(0)
  })

  it('preserves stable HTTP error metadata for retry and diagnosis', async () => {
    const mock = await listen((request, response) => {
      request.resume()
      request.on('end', () => {
        response.writeHead(429, {
          'content-type': 'application/json',
          'retry-after': '2',
          'x-request-id': 'request-test-1',
        })
        response.end(JSON.stringify({ error: { message: 'slow down', type: 'rate_limit' } }))
      })
    })
    await expect(consume(adapter(mock.url))).rejects.toMatchObject({
      code: 'RATE_LIMIT',
      failure: {
        code: 'RATE_LIMIT',
        status: 429,
        providerRetryAfterMs: 2_000,
        requestId: 'request-test-1',
      },
    })
  })

  it('rejects a truncated SSE response even when it contains a finish reason', async () => {
    const mock = await listen((request, response) => {
      request.resume()
      request.on('end', () => {
        response.writeHead(200, { 'content-type': 'text/event-stream' })
        response.end('data: {"choices":[{"delta":{"content":"partial"},"finish_reason":"stop"}]}\n\n')
      })
    })
    await expect(consume(adapter(mock.url))).rejects.toMatchObject({ code: 'STREAM_CLOSED' })
  })

  it('maps caller cancellation separately from plugin lifecycle cancellation', async () => {
    const started = Promise.withResolvers<void>()
    const closed = Promise.withResolvers<void>()
    const mock = await listen((request, response) => {
      request.resume()
      request.on('end', () => {
        response.writeHead(200, { 'content-type': 'text/event-stream' })
        response.write(': stream-open\n\n')
        started.resolve()
      })
      response.on('close', () => { closed.resolve() })
    })
    const caller = new AbortController()
    const pending = consume(adapter(mock.url), { signal: caller.signal })
    await started.promise
    caller.abort('test caller cancellation')
    await expect(pending).rejects.toMatchObject({ code: 'ABORTED' })
    await closed.promise
  })

  it('terminates a silent provider stream at the configured idle deadline', async () => {
    const started = Promise.withResolvers<void>()
    const closed = Promise.withResolvers<void>()
    const mock = await listen((request, response) => {
      request.resume()
      request.on('end', () => {
        response.writeHead(200, { 'content-type': 'text/event-stream' })
        response.write(': stream-open\n\n')
        started.resolve()
      })
      response.on('close', () => { closed.resolve() })
    })
    const pending = consume(adapter(mock.url, undefined, { streamIdleTimeoutMs: 30 }))
    await started.promise
    await expect(pending).rejects.toMatchObject({ code: 'TIMEOUT' })
    await closed.promise
  })

  it('aborts an active provider stream when the owning plugin unloads', async () => {
    const started = Promise.withResolvers<void>()
    const closed = Promise.withResolvers<void>()
    const mock = await listen((request, response) => {
      request.resume()
      request.on('end', () => {
        response.writeHead(200, { 'content-type': 'text/event-stream' })
        response.write(': stream-open\n\n')
        started.resolve()
      })
      response.on('close', () => { closed.resolve() })
    })
    const lifecycle = new AbortController()
    const stream = adapter(mock.url, lifecycle.signal).stream({
      provider: 'deepseek-private',
      model: 'deepseek-v4-flash',
      messages: [],
    } as never)[Symbol.asyncIterator]()
    const pending = stream.next()
    await started.promise
    lifecycle.abort('test plugin unload')
    await expect(pending).rejects.toMatchObject({ code: 'ABORTED' })
    await closed.promise
  })
})
