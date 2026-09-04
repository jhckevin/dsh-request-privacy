import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REQUEST_PRIVACY_CONFIG,
  privacyHeaders,
  requestPrivacyPreview,
  resolveRequestPrivacyConfig,
} from '../src/privacy.ts'

describe('request privacy policy', () => {
  it('uses one truthful neutral identity and omits correlation metadata', () => {
    const config = resolveRequestPrivacyConfig({})
    expect(config).toEqual(DEFAULT_REQUEST_PRIVACY_CONFIG)
    const preview = requestPrivacyPreview(config)
    expect(preview.sent['user-agent']).toMatch(/^private-client\/\d+\.\d+\.\d+(?:-[a-z0-9.]+)? /)
    expect(JSON.stringify(preview).toLowerCase()).not.toContain('deepseek-harness')
    expect(preview.omitted).toEqual([
      'product user id',
      'session correlation id',
      'compaction classification',
    ])
  })

  it('rejects third-party identities and attempts to restore correlation headers', () => {
    expect(() => resolveRequestPrivacyConfig({ identity: 'cherry-studio' as never })).toThrow(/private-client/)
    expect(() => resolveRequestPrivacyConfig({ omitCorrelationHeaders: false as never })).toThrow(/remain omitted/)
  })

  it('restores native attribution when disabled without blocking the route', () => {
    const config = { ...DEFAULT_REQUEST_PRIVACY_CONFIG, enabled: false }
    expect(privacyHeaders(config, { userId: 'fixture-user', sessionId: 'existing-session', purpose: 'compaction' })).toMatchObject({
      'x-deepseek-harness-user-id': 'fixture-user',
      'x-deepseek-harness-session-id': 'existing-session',
      'x-deepseek-harness-compact': '1',
    })
    expect(requestPrivacyPreview(config).sent['user-agent']).toMatch(/^deepseek-harness\//)
    expect(requestPrivacyPreview(config).omitted).toEqual([])
  })
})
