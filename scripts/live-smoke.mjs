import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { DeepSeekAdapter, resolveAdapterOptions } from '../lib/index.js'

// Opt-in real API acceptance. Only synthetic prompts; never print credentials or response text.
if (process.env.PRIVACY_LIVE_TEST !== '1') throw new Error('Set PRIVACY_LIVE_TEST=1 to authorize three real API requests')
const key = process.env.DEEPSEEK_API_KEY
if (!key) throw new Error('DEEPSEEK_API_KEY is required')
const originalFetch = globalThis.fetch
const receipts = []
let current
globalThis.fetch = async (url, init) => {
  assert.equal(String(url), 'https://api.deepseek.com/chat/completions')
  assert.equal(init.redirect, 'error')
  const headers = new Headers(init.headers)
  assert.equal(headers.get('authorization'), `Bearer ${key}`)
  assert.match(headers.get('user-agent'), /^private-client\//)
  for (const field of ['x-deepseek-harness-user-id', 'x-deepseek-harness-session-id', 'x-deepseek-harness-compact']) assert.equal(headers.has(field), false)
  const body = JSON.parse(init.body)
  assert.equal(body.model, 'deepseek-v4-flash')
  assert.equal(body.messages.at(-1).content, 'Reply with exactly OK. This is a synthetic connection test.')
  current.headers = Object.fromEntries([...headers].filter(([name]) => name !== 'authorization'))
  current.authorizationPresent = true
  current.correlationHeadersAbsent = true
  current.bodyKeys = Object.keys(body).sort()
  const response = await originalFetch(url, init)
  current.httpStatus = response.status
  return response
}
try {
  for (const purpose of [undefined, 'compaction', 'session-title']) {
    current = { purpose: purpose ?? 'chat', startedAt: new Date().toISOString() }
    receipts.push(current)
    const adapter = new DeepSeekAdapter({ options: () => resolveAdapterOptions({ thinking: 'disabled', reasoningEffort: 'off', maxTokens: 64 }), resolveApiKey: async () => key })
    let outputChars = 0
    for await (const chunk of adapter.stream({ provider: 'deepseek-private', model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply with exactly OK. This is a synthetic connection test.' }] }],
      sessionId: 'synthetic-private-session', ...(purpose === undefined ? {} : { purpose }), maxTokens: 64,
      signal: AbortSignal.timeout(60000),
    })) {
      if (chunk.type === 'text-delta') outputChars += chunk.delta?.length ?? chunk.text?.length ?? 0
      if (chunk.type === 'usage') current.usage = chunk
      if (chunk.type === 'finish') current.finish = chunk.reason
    }
    assert.equal(current.httpStatus, 200)
    current.completedAt = new Date().toISOString()
    current.outputChars = outputChars
    current.passed = true
  }
} catch (error) {
  if (current) current.errorCode = error.code ?? error.name ?? 'ERROR'
  process.exitCode = 1
} finally {
  globalThis.fetch = originalFetch
  const result = { realApi: true, model: 'deepseek-v4-flash', scope: 'deepseek-private adapter outbound requests; not a provider retention assertion', passed: receipts.length === 3 && receipts.every(row => row.passed), receipts }
  if (process.env.PRIVACY_RECEIPT) await writeFile(process.env.PRIVACY_RECEIPT, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 })
  console.log(JSON.stringify(result, null, 2))
}
