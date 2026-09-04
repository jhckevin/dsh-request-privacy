import { describe, expect, it } from 'vitest'
import { PROVIDER, resolveAdapterOptions } from '../src/index.ts'

describe('provider configuration', () => {
  it('uses an independent route and resolves privacy settings in the operation snapshot', () => {
    expect(PROVIDER).toBe('deepseek-private')
    expect(resolveAdapterOptions({})).toMatchObject({
      privacy: { enabled: true, identity: 'private-client', omitCorrelationHeaders: true },
      baseURL: 'https://api.deepseek.com',
    })
  })

  it('keeps an explicitly disabled route disabled', () => {
    expect(resolveAdapterOptions({ enabled: false }).privacy.enabled).toBe(false)
  })
})
