import type { Context } from '@deepseek-ai/cordis'
import type { Config as NativeConfig } from '@deepseek-ai/dsh-llm-deepseek'
export { Config, DeepSeekAdapter, resolveAdapterOptions } from '@deepseek-ai/dsh-llm-deepseek'
export declare function apply(ctx: Context, config: NativeConfig, requestPrivacyEnabled?: () => boolean): void
