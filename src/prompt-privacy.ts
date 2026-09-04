/** Remove only Harness-owned product-identity prompt sections before model dispatch. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import type { PromptAssembly } from '@deepseek-ai/dsh-system-prompt'
import { REQUEST_PRIVACY_SETTINGS_NAMESPACE, resolveRequestPrivacyConfig } from './privacy.ts'

const NS = REQUEST_PRIVACY_SETTINGS_NAMESPACE

/** Named upstream sections that disclose the Harness product identity. */
export const HARNESS_IDENTITY_SECTION_NAMES = Object.freeze([
  'harness:identity',
  'harness:source',
  'app:web-surface',
] as const)

const BLOCKED = new Set<string>(HARNESS_IDENTITY_SECTION_NAMES)

/** Preserve user messages, tool schemas, contexts, variables, and every non-brand section. */
export function omitHarnessIdentitySections(assembly: PromptAssembly): PromptAssembly {
  return {
    ...assembly,
    sections: assembly.sections.filter(section => !BLOCKED.has(section.name)),
  }
}

export const name = 'request-privacy-prompt'
export const inject = ['settings', 'systemPrompt']

export function apply(ctx: Context): void {
  ctx.on('system-prompt/assemble', async (_assembly, _context, next) => {
    const assembled = await next()
    const descriptor = ctx.settings.describe({ redactSecrets: true }).find(entry => entry.ns === NS)
    if (descriptor === undefined) throw new Error('request-privacy: settings namespace is unavailable')
    const rawEnabled = (descriptor.value as { enabled?: boolean }).enabled
    const enabled = resolveRequestPrivacyConfig(
      rawEnabled === undefined ? {} : { enabled: rawEnabled },
    ).enabled
    return enabled ? omitHarnessIdentitySections(assembled) : assembled
  }, { global: true, prepend: true })
}

export default { name, inject, apply }
