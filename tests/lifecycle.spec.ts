import { Context } from '@deepseek-ai/cordis'
import { LlmRuntime } from '@deepseek-ai/dsh-llm'
import { afterEach, describe, expect, it } from 'vitest'
import { Config, PROVIDER, apply, inject, name } from '../src/index.ts'
import { RequestPrivacySettingsBridge } from '../src/settings-provider.ts'

const roots: Context[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(ctx => ctx.fiber.dispose()))
})

async function mount(ctx: Context) {
  return await ctx.plugin({ name, inject, Config, apply }, {})
}

describe('Cordis lifecycle', () => {
  it('withdraws every provider registration on hot unload and can load again', async () => {
    const ctx = new Context()
    roots.push(ctx)
    new LlmRuntime(ctx)

    const first = await mount(ctx)
    expect(ctx.llm.listProviders().map(entry => entry.id)).toContain(PROVIDER)
    expect(ctx.llm.listConfigurableProviders().map(entry => entry.provider)).toContain(PROVIDER)

    await first.dispose()
    expect(ctx.llm.listProviders().map(entry => entry.id)).not.toContain(PROVIDER)
    expect(ctx.llm.listConfigurableProviders().map(entry => entry.provider)).not.toContain(PROVIDER)

    const second = await mount(ctx)
    expect(ctx.llm.listProviders().filter(entry => entry.id === PROVIDER)).toHaveLength(1)
    expect(ctx.llm.listConfigurableProviders().filter(entry => entry.provider === PROVIDER)).toHaveLength(1)

    await second.dispose()
    expect(ctx.llm.listProviders().map(entry => entry.id)).not.toContain(PROVIDER)
    expect(ctx.llm.listConfigurableProviders().map(entry => entry.provider)).not.toContain(PROVIDER)
  })

  it('withdraws the settings Remote service and permits a clean remount', async () => {
    const ctx = new Context()
    roots.push(ctx)
    const definition = {
      name: 'request-privacy-settings-fixture',
      apply(child: Context) {
        new RequestPrivacySettingsBridge(child)
      },
    }

    const first = await ctx.plugin(definition)
    expect(ctx.get('requestPrivacySettings')).toBeInstanceOf(RequestPrivacySettingsBridge)
    await first.dispose()
    expect(ctx.get('requestPrivacySettings')).toBeUndefined()

    const second = await ctx.plugin(definition)
    expect(ctx.get('requestPrivacySettings')).toBeInstanceOf(RequestPrivacySettingsBridge)
    await second.dispose()
    expect(ctx.get('requestPrivacySettings')).toBeUndefined()
  })
})
