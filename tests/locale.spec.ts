import { describe, expect, it } from 'vitest'
import { en, LOCALE_NAMESPACE, METADATA_LABELS, zh } from '../src/client/locale.ts'

describe('WebUI locale dictionaries', () => {
  it('registers under the Request Privacy settings namespace', () => {
    expect(LOCALE_NAMESPACE).toBe('settings.requestPrivacy')
  })

  it('keeps Chinese and English dictionaries structurally identical', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
    expect(Object.values(zh).every(value => value.trim().length > 0)).toBe(true)
    expect(Object.values(en).every(value => value.trim().length > 0)).toBe(true)
  })

  it('provides a translated label for every metadata category', () => {
    for (const key of Object.values(METADATA_LABELS)) {
      expect(zh[key]).toBeTruthy()
      expect(en[key]).toBeTruthy()
    }
  })
})
