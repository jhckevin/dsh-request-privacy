/** Official provider route replacement through the DSH bundle patch, without host edits. */
import type { Context } from '@deepseek-ai/cordis'
import { apply as applyNative, Config } from '../vendor/deepseek.js'
import type { RequestPrivacySettingsBridge } from './settings-provider.ts'

export { Config }
export const name = 'request-privacy-native-provider'
export const inject = ['llm', 'requestPrivacySettings']

export function apply(ctx: Context, config: Config): void {
  applyNative(ctx, config, () => {
    const settings = ctx.get('requestPrivacySettings') as RequestPrivacySettingsBridge | undefined
    if (settings === undefined) throw new Error('request-privacy: settings service is unavailable')
    return settings.read().enabled
  })
}
