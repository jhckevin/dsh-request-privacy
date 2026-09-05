import { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { Config } from './index.ts'
import { REQUEST_PRIVACY_SETTINGS_NAMESPACE, requestPrivacyPreview, resolveRequestPrivacyConfig } from './privacy.ts'
import type { RequestPrivacyPreview } from './privacy.ts'

const NS = REQUEST_PRIVACY_SETTINGS_NAMESPACE

function assertExactRequest(
  request: unknown,
  operation: 'update' | 'reset',
  expectedKeys: readonly string[],
): asserts request is Record<string, unknown> {
  if (typeof request !== 'object' || request === null || Array.isArray(request)) {
    throw new TypeError(`request-privacy: ${operation} request must be a plain object`)
  }
  const prototype = Object.getPrototypeOf(request)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`request-privacy: ${operation} request must be a plain object`)
  }
  const keys = Reflect.ownKeys(request)
  if (
    keys.length !== expectedKeys.length
    || keys.some(key => typeof key !== 'string' || !expectedKeys.includes(key))
    || expectedKeys.some(key => !Object.hasOwn(request, key))
  ) {
    throw new TypeError(
      `request-privacy: ${operation} request must contain exactly ${expectedKeys.join(', ')}`,
    )
  }
}

export interface RequestPrivacySettingsSnapshot {
  readonly enabled: boolean
  readonly identity: 'private-client'
  readonly preview: RequestPrivacyPreview
  readonly revision: number
  readonly writable: boolean
  readonly overridden: boolean
}

export interface RequestPrivacySettingsUpdate {
  readonly enabled: boolean
  readonly expectedRevision: number
}

export interface RequestPrivacySettingsReset {
  readonly expectedRevision: number
}

/** Bounded WebUI Remote: no credentials, endpoint, paths or arbitrary namespaces cross the wire. */
export class RequestPrivacySettingsBridge extends TypertRemoteService {
  static inject = ['settings']

  constructor(ctx: Context) {
    super(ctx, 'requestPrivacySettings')
  }

  @Remote('read')
  read(): RequestPrivacySettingsSnapshot {
    return this.snapshot()
  }

  @Remote('update')
  async update(request: RequestPrivacySettingsUpdate): Promise<RequestPrivacySettingsSnapshot> {
    assertExactRequest(request, 'update', ['enabled', 'expectedRevision'])
    if (typeof request.enabled !== 'boolean') {
      throw new TypeError('request-privacy: enabled must be a boolean')
    }
    if (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) {
      throw new TypeError('request-privacy: expectedRevision must be a non-negative safe integer')
    }
    await this.ctx.settings.update(NS, { enabled: request.enabled }, request.expectedRevision)
    return this.snapshot()
  }

  @Remote('reset')
  async reset(request: RequestPrivacySettingsReset): Promise<RequestPrivacySettingsSnapshot> {
    assertExactRequest(request, 'reset', ['expectedRevision'])
    if (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) {
      throw new TypeError('request-privacy: expectedRevision must be a non-negative safe integer')
    }
    await this.ctx.settings.mutate(NS, [{ op: 'unset', path: ['enabled'] }], request.expectedRevision)
    return this.snapshot()
  }

  private snapshot(): RequestPrivacySettingsSnapshot {
    const descriptor = this.ctx.settings.describe({ redactSecrets: true }).find(entry => entry.ns === NS)
    if (descriptor === undefined) throw new Error('request-privacy: settings namespace is unavailable')
    const value = descriptor.value as Config
    const user = (descriptor.user ?? {}) as Partial<Config>
    const privacy = resolveRequestPrivacyConfig(value)
    return Object.freeze({
      enabled: privacy.enabled,
      identity: privacy.identity,
      preview: requestPrivacyPreview(privacy),
      revision: descriptor.revision,
      writable: this.ctx.settings.writable,
      overridden: Object.hasOwn(user, 'enabled'),
    })
  }
}

export default RequestPrivacySettingsBridge
