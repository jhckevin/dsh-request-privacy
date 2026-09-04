import { describe, expect, it } from 'vitest'
import { HARNESS_IDENTITY_SECTION_NAMES, omitHarnessIdentitySections } from '../src/prompt-privacy.ts'

describe('prompt identity privacy', () => {
  it('removes only named Harness-owned identity sections', () => {
    const tools = [{ name: 'shell', description: 'run', inputSchema: {} }]
    const assembly = omitHarnessIdentitySections({
      sections: [
        { name: 'harness:identity', text: 'product identity' },
        { name: 'harness:source', text: 'checkout identity' },
        { name: 'app:web-surface', text: 'web product identity' },
        { name: 'deployment:persona', text: 'neutral persona' },
        { name: 'user-owned-section', text: 'DeepSeek Harness typed by the user' },
      ],
      contexts: [{ name: 'workspace', text: 'workspace facts' }],
      tools,
      variables: { cwd: '/workspace' },
    } as never)

    expect(HARNESS_IDENTITY_SECTION_NAMES).toHaveLength(3)
    expect(assembly.sections).toEqual([
      { name: 'deployment:persona', text: 'neutral persona' },
      { name: 'user-owned-section', text: 'DeepSeek Harness typed by the user' },
    ])
    expect(assembly.contexts).toEqual([{ name: 'workspace', text: 'workspace facts' }])
    expect(assembly.tools).toBe(tools)
    expect(assembly.variables).toEqual({ cwd: '/workspace' })
  })
})
