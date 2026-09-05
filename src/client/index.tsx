import { useEffect, useState, type ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { RequestPrivacySettingsSnapshot } from '../settings-provider.ts'
import { en, LOCALE_NAMESPACE, METADATA_LABELS, zh, type LocaleKey } from './locale.ts'

const STYLE_ID = 'dsh-request-privacy/webui'
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'settings.requestPrivacy': LocaleKey }
}

interface SettingsRemote {
  read(signal?: AbortSignal): Promise<RequestPrivacySettingsSnapshot>
  update(enabled: boolean, revision: number, signal?: AbortSignal): Promise<RequestPrivacySettingsSnapshot>
  reset(revision: number, signal?: AbortSignal): Promise<RequestPrivacySettingsSnapshot>
}

type Props = PropsRuntime<'settings.section'> & PropsLocale<typeof LOCALE_NAMESPACE> & InjectFace<SettingsRemote>

function RequestPrivacySection({ read, update, reset, t }: Props): ReactNode {
  const [snapshot, setSnapshot] = useState<RequestPrivacySettingsSnapshot>()
  const [enabled, setEnabled] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<'saved' | 'failed'>()
  const [lifecycle] = useState(() => new AbortController())

  useEffect(() => () => {
    lifecycle.abort('request-privacy settings view unmounted')
  }, [lifecycle])

  useEffect(() => {
    const abort = new AbortController()
    void read(abort.signal).then(next => {
      if (abort.signal.aborted) return
      setSnapshot(next)
      setEnabled(next.enabled)
    }, () => { if (!abort.signal.aborted) setNotice('failed') })
    return () => { abort.abort() }
  }, [read])

  if (snapshot === undefined) {
    return <section className="rp-page"><p role="status">{notice === 'failed' ? t('unavailable') : t('loading')}</p></section>
  }

  const run = async (kind: 'save' | 'reset', desired = enabled): Promise<void> => {
    if (lifecycle.signal.aborted) return
    setBusy(true)
    setNotice(undefined)
    try {
      const next = kind === 'save'
        ? await update(desired, snapshot.revision, lifecycle.signal)
        : await reset(snapshot.revision, lifecycle.signal)
      if (lifecycle.signal.aborted) return
      setSnapshot(next)
      setEnabled(next.enabled)
      setNotice('saved')
    } catch {
      if (!lifecycle.signal.aborted) { setEnabled(snapshot.enabled); setNotice('failed') }
    } finally {
      if (!lifecycle.signal.aborted) setBusy(false)
    }
  }

  return (
    <section className="rp-page">
      <header><h2>{t('title')}</h2><p>{t('subtitle')}</p></header>
      <div className="rp-card">
        <label className="rp-toggle"><input type="checkbox" checked={enabled} disabled={!snapshot.writable || busy} onChange={event => { const desired = event.currentTarget.checked; setEnabled(desired); void run('save', desired) }} /><span><strong>{t('enabled')}</strong><small>{t('enabledHint')}</small></span></label>
        <p>{t('boundary')}</p>
        {!snapshot.enabled ? <p>{t('offHint')}</p> : null}
      </div>
      <div className="rp-grid">
        <article><h3>{t('preview')}</h3>{Object.entries(snapshot.preview.sent).map(([key, value]) => <code key={key}>{key}: {value}</code>)}</article>
        <article><h3>{t('omitted')}</h3>{snapshot.preview.omitted.length === 0 ? <p>{t('noneOmitted')}</p> : <ul>{snapshot.preview.omitted.map(value => <li key={value}>{METADATA_LABELS[value] ? t(METADATA_LABELS[value]) : value}</li>)}</ul>}</article>
        <article><h3>{t('immutable')}</h3><ul>{snapshot.preview.immutable.map(value => <li key={value}>{METADATA_LABELS[value] ? t(METADATA_LABELS[value]) : value}</li>)}</ul></article>
      </div>
      <footer>
        <span className={`rp-status ${snapshot.enabled ? 'rp-status-override' : 'rp-status-native'}`} role="status">
          <i className="rp-status-dot" aria-hidden="true" />
          {t(snapshot.enabled ? 'overrideStatus' : 'nativeStatus')}
        </span>
        <button type="button" disabled={!snapshot.writable || busy} onClick={() => { void run('reset') }}>{t('reset')}</button>
      </footer>
      {notice !== undefined ? <p role={notice === 'failed' ? 'alert' : 'status'} className={notice === 'failed' ? 'rp-error' : 'rp-success'}>{t(notice)}</p> : null}
    </section>
  )
}

const CSS = `.rp-page{max-width:840px;padding:8px 4px 36px;color:var(--dsw-alias-label-primary)}.rp-page header h2{font-size:22px;margin:0 0 6px}.rp-page header p{color:var(--dsw-alias-label-secondary);line-height:1.5}.rp-card,.rp-grid article{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:16px}.rp-toggle{display:flex;gap:12px;align-items:flex-start}.rp-toggle span,.rp-field{display:flex;flex-direction:column;gap:5px}.rp-toggle small{color:var(--dsw-alias-label-secondary)}.rp-field{margin-top:18px}.rp-field code,.rp-grid code{font-family:ui-monospace,monospace;background:var(--dsw-alias-bg-layer-2);border-radius:6px;padding:7px;overflow-wrap:anywhere}.rp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.rp-grid h3{font-size:13px;margin:0 0 10px}.rp-grid article{display:flex;flex-direction:column;gap:7px}.rp-grid ul{margin:0;padding-left:18px}.rp-page footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:16px}.rp-status{display:inline-flex;align-items:center;gap:7px;margin-right:auto;font-size:12px;font-weight:600}.rp-status-dot{width:9px;height:9px;border-radius:50%;box-shadow:0 0 0 3px color-mix(in srgb,currentColor 16%,transparent)}.rp-status-override{color:var(--dsw-alias-state-success-primary,#22c55e)}.rp-status-native{color:var(--dsw-alias-state-error-primary,#ef4444)}.rp-status-dot{background:currentColor}.rp-page button{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:8px 13px}.rp-page button:last-child{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-on-color)}.rp-page button:disabled{opacity:.55}.rp-success{color:var(--dsw-alias-state-success-primary)}.rp-error{color:var(--dsw-alias-state-error-primary)}@media(max-width:760px){.rp-grid{grid-template-columns:1fr}}`

export const inject = ['slots', 'locale', 'connection', 'remote']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(LOCALE_NAMESPACE, { zh, en }), 'request-privacy webui: dictionaries')
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return () => {}
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-request-privacy'
    style.dataset.pluginCss = STYLE_ID
    style.textContent = CSS + `
      .rp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .rp-grid article:first-child{grid-column:1/-1}
      .rp-page button:last-child{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
      .rp-card p,.rp-grid p,.rp-grid li{line-height:1.5}
      @media(max-width:760px){.rp-grid{grid-template-columns:1fr}}
    `
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'request-privacy webui: styles')
  const connection = ctx.get('connection') as ConnectionHandle
  const remote = createRemote(connection)
  const t = ctx.locale.bind(LOCALE_NAMESPACE)
  ctx.slots.inject('settings.section', () => {
    let unregister: (() => void) | undefined
    let generation = 0
    let disposed = false
    let probe: AbortController | undefined

    const reconcile = (): void => {
      const current = ++generation
      probe?.abort('request-privacy topology changed')
      probe = new AbortController()
      void remote.read(probe.signal).then(() => {
        if (disposed || current !== generation || unregister !== undefined) return
        unregister = ctx.slots.register({
          name: 'settings.section', id: 'request-privacy', order: 19, label: () => t('nav'), locale: LOCALE_NAMESPACE,
          inject: (): SettingsRemote => remote,
        }, RequestPrivacySection)
      }, () => {
        if (disposed || current !== generation) return
        unregister?.()
        unregister = undefined
      })
    }

    reconcile()
    const stopTopology = ctx.remote.$on('llm/adapters-updated', reconcile)
    const stopConnection = ctx.on('connection/reset', reconcile)
    return () => {
      disposed = true
      generation += 1
      probe?.abort('request-privacy client fiber disposed')
      probe = undefined
      stopTopology()
      stopConnection()
      unregister?.()
      unregister = undefined
    }
  })
}

function createRemote(connection: ConnectionHandle): SettingsRemote {
  const call = async <T,>(method: string, args: object, signal?: AbortSignal): Promise<T> => {
    const result = await connection.rpc.call('/api', `requestPrivacySettings/${method}`, { args }, signal)
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
    return result.value as T
  }
  return {
    read: signal => call('read', {}, signal),
    update: (enabled, expectedRevision, signal) => call('update', { request: { enabled, expectedRevision } }, signal),
    reset: (expectedRevision, signal) => call('reset', { request: { expectedRevision } }, signal),
  }
}
