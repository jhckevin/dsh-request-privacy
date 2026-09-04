/** Request-metadata minimization policy owned by this extension. */
import { createRequire } from 'node:module'
import { attributionHeaders } from '@deepseek-ai/dsh-llm'
import { getOrCreateAnonymousUserId } from '@deepseek-ai/dsh-anonymous-user-id'

const { version } = createRequire(import.meta.url)('../package.json') as { version: string }

/** Stable settings namespace shared by the host adapter and bounded WebUI bridge. */
export const REQUEST_PRIVACY_SETTINGS_NAMESPACE = 'request-privacy'

/** The only supported, truthful neutral application identity. */
export const PRIVATE_CLIENT_PRODUCT = 'private-client'

/** Settings intentionally exclude arbitrary product labels to prevent third-party impersonation. */
export interface RequestPrivacyConfig {
  /** Whether new model requests use minimized attribution instead of native headers. */
  enabled: boolean
  /** Fixed neutral identity; exposed for explicit preview and future schema migration. */
  identity: typeof PRIVATE_CLIENT_PRODUCT
  /** Optional correlation headers are always omitted in 0.1.x. */
  omitCorrelationHeaders: true
}

export const DEFAULT_REQUEST_PRIVACY_CONFIG: Readonly<RequestPrivacyConfig> = Object.freeze({
  enabled: true,
  identity: PRIVATE_CLIENT_PRODUCT,
  omitCorrelationHeaders: true,
})

/** Resolve a detached, fail-loud policy from the persisted settings section. */
export function resolveRequestPrivacyConfig(
  input: Partial<RequestPrivacyConfig>,
): RequestPrivacyConfig {
  if (input.identity !== undefined && input.identity !== PRIVATE_CLIENT_PRODUCT) {
    throw new TypeError('request-privacy: identity must be "private-client"')
  }
  if (input.omitCorrelationHeaders !== undefined && input.omitCorrelationHeaders !== true) {
    throw new TypeError('request-privacy: optional correlation headers must remain omitted')
  }
  return {
    enabled: input.enabled ?? true,
    identity: PRIVATE_CLIENT_PRODUCT,
    omitCorrelationHeaders: true,
  }
}

/** Build the complete non-secret application metadata sent by this route. */
export function privacyHeaders(config: RequestPrivacyConfig, request: {
  sessionId?: string; purpose?: string; userId?: string
} = {}): Record<string, string> {
  if (!config.enabled) return {
    ...attributionHeaders(),
    'x-deepseek-harness-user-id': request.userId ?? String(getOrCreateAnonymousUserId()),
    ...request.sessionId === undefined ? {} : { 'x-deepseek-harness-session-id': request.sessionId },
    ...request.purpose === 'compaction' ? { 'x-deepseek-harness-compact': '1' } : {},
  }
  return attributionHeaders({ product: config.identity, version, url: 'https://github.com/jhckevin/dsh-request-privacy' })
}

/** Safe WebUI projection of the exact header policy. */
export interface RequestPrivacyPreview {
  readonly sent: Readonly<Record<string, string>>
  readonly omitted: readonly string[]
  readonly immutable: readonly string[]
}

export function requestPrivacyPreview(config: RequestPrivacyConfig): RequestPrivacyPreview {
  return Object.freeze({
    sent: Object.freeze(config.enabled ? privacyHeaders(config) : attributionHeaders()),
    omitted: Object.freeze(config.enabled ? [
      'product user id',
      'session correlation id',
      'compaction classification',
    ] : []),
    immutable: Object.freeze([
      'authorization',
      'content-type',
      'accept',
      'user-authored messages',
      'user-authored extension tool schemas',
      'model parameters',
    ]),
  })
}
