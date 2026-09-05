import { Context } from '@deepseek-ai/cordis'
import { LlmRuntime, attributionHeaders } from '@deepseek-ai/dsh-llm'
import { SettingsProvider } from '@deepseek-ai/dsh-settings'
import { createServer, type IncomingHttpHeaders, type ServerResponse } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as plugin from '../src/index.ts'
import * as native from '../src/native-provider.ts'
import { RequestPrivacySettingsBridge } from '../src/settings-provider.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected async load() { return {} }
  protected async persist() { /* Native settings validation/publication; no disk persistence in this test. */ }
}

const cleanup: (() => Promise<unknown>)[] = []
afterEach(async () => {
  for (const dispose of cleanup.splice(0).reverse()) await dispose()
  vi.unstubAllEnvs()
})

async function fixture() {
  const home = await mkdtemp(join(tmpdir(), 'privacy-toggle-'))
  cleanup.push(() => rm(home, { recursive: true, force: true }))
  vi.stubEnv('DSH_HOME', home)
  vi.stubEnv('DEEPSEEK_API_KEY', 'test-key')
  const requests: { headers: IncomingHttpHeaders; body: string }[] = []
  let hold: ((response: ServerResponse) => void) | undefined
  const server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => {
      requests.push({ headers: request.headers, body: Buffer.concat(chunks).toString() })
      if (hold) hold(response)
      else finish(response)
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  cleanup.push(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()) }))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No mock address')
  const ctx = new Context()
  cleanup.push(() => ctx.fiber.dispose())
  new LlmRuntime(ctx)
  new MemorySettings(ctx)
  await ctx.plugin(plugin, {})
  await ctx.plugin({ name: 'privacy-test-settings', inject: ['settings'], apply(child: Context) { new RequestPrivacySettingsBridge(child) } })
  const owner = await ctx.plugin(native, { baseURL: `http://127.0.0.1:${address.port}` })
  const bridge = ctx.get('requestPrivacySettings') as RequestPrivacySettingsBridge
  const toggle = (enabled: boolean) => bridge.update({ enabled, expectedRevision: bridge.read().revision })
  const send = async (sessionId = 'existing-session', purpose?: string) => {
    const chunks = []
    for await (const chunk of ctx.llm.stream({
      provider: 'deepseek-official', model: 'deepseek-v4-flash',
      sessionId, ...(purpose ? { purpose } : {}),
      messages: [], system: 'Keep this exact prompt.',
      tools: [{ name: 'bash', description: 'DeepSeek Harness unchanged tool description', parameters: { type: 'object', properties: {} } }],
    } as never)) chunks.push(chunk)
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'stop' } })
  }
  return { ctx, requests, toggle, send, owner, bridge, hold: (callback?: (response: ServerResponse) => void) => { hold = callback } }
}

function finish(response: ServerResponse) {
  response.writeHead(200, { 'content-type': 'text/event-stream' })
  response.end('data: {"id":"test-response","choices":[{"delta":{"content":"OK"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n')
}

function assertPrivate(headers: IncomingHttpHeaders) {
  expect(headers['user-agent']).toMatch(/^private-client\//)
  expect(Object.keys(headers).filter(key => key.startsWith('x-deepseek-harness-'))).toEqual([])
  expect(headers.authorization).toBe('Bearer test-key')
}

describe('native DeepSeek route: live settings to real HTTP wire', () => {
  it('switches on/off/on in one existing session without changing payload or credentials', async () => {
    const f = await fixture()
    await f.send()
    await f.toggle(false)
    await f.send()
    await f.toggle(true)
    await f.send()
    assertPrivate(f.requests[0]!.headers)
    expect(f.requests[1]!.headers).toMatchObject({ ...attributionHeaders(), 'x-deepseek-harness-session-id': 'existing-session', authorization: 'Bearer test-key' })
    expect(f.requests[1]!.headers['x-deepseek-harness-user-id']).toBeTruthy()
    assertPrivate(f.requests[2]!.headers)
    expect(new Set(f.requests.map(request => request.body)).size).toBe(1)
    expect(f.requests[0]!.body).toContain('DeepSeek Harness unchanged tool description')
    expect(f.ctx.llm.listProviders().filter(provider => provider.id === 'deepseek-official')).toHaveLength(1)
  })

  it('covers new sessions, compaction and title calls, restoring native markers only when off', async () => {
    const f = await fixture()
    for (const purpose of [undefined, 'compaction', 'session-title']) await f.send('new-session', purpose)
    f.requests.forEach(request => assertPrivate(request.headers))
    await f.toggle(false)
    for (const purpose of [undefined, 'compaction', 'session-title']) await f.send('new-session', purpose)
    for (const request of f.requests.slice(3)) expect(request.headers['x-deepseek-harness-session-id']).toBe('new-session')
    expect(f.requests[3]!.headers['x-deepseek-harness-compact']).toBeUndefined()
    expect(f.requests[4]!.headers['x-deepseek-harness-compact']).toBe('1')
    expect(f.requests[5]!.headers['x-deepseek-harness-compact']).toBeUndefined()
  })

  it('does not rewrite an in-flight request when the UI changes mode', async () => {
    const f = await fixture()
    const captured = Promise.withResolvers<ServerResponse>()
    f.hold(response => captured.resolve(response))
    const active = f.send()
    const response = await captured.promise
    await f.toggle(false)
    finish(response)
    await active
    f.hold()
    await f.send()
    assertPrivate(f.requests[0]!.headers)
    expect(f.requests[1]!.headers['user-agent']).toBe(attributionHeaders()['user-agent'])
  })

  it('rejects stale UI updates and removes the native route when its owner unloads', async () => {
    const f = await fixture()
    const stale = f.bridge.read().revision
    await f.toggle(false)
    await expect(f.bridge.update({ enabled: true, expectedRevision: stale })).rejects.toThrow()
    expect(f.bridge.read().enabled).toBe(false)
    await f.owner.dispose()
    expect(f.ctx.llm.listProviders().map(provider => provider.id)).not.toContain('deepseek-official')
  })

  it('accepts only exact settings RPC shapes and resets the override atomically', async () => {
    const f = await fixture()
    const revision = f.bridge.read().revision
    for (const request of [
      null,
      [],
      { enabled: false },
      { enabled: false, expectedRevision: revision, extra: true },
      Object.assign(Object.create({ enabled: false }), { expectedRevision: revision }),
    ]) {
      await expect(f.bridge.update(request as never)).rejects.toThrow(/plain object|exactly/)
    }
    await expect(f.bridge.reset({ expectedRevision: revision, extra: true } as never)).rejects.toThrow(/exactly/)

    const changed = await f.bridge.update({ enabled: false, expectedRevision: revision })
    expect(changed).toMatchObject({ enabled: false, overridden: true })
    const reset = await f.bridge.reset({ expectedRevision: changed.revision })
    expect(reset).toMatchObject({ enabled: true, overridden: false })
  })
})
