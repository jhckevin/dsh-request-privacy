import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'

const root = process.cwd()
const registry = process.env.NPM_CONFIG_REGISTRY || 'https://registry.npmmirror.com'
const sandbox = mkdtempSync(join(tmpdir(), 'privacy-packed-dsh-'))
const runtime = join(sandbox, 'runtime')
const home = join(sandbox, 'home')
const packDir = join(sandbox, 'pack')
mkdirSync(runtime, { recursive: true })
mkdirSync(home, { recursive: true })
mkdirSync(packDir, { recursive: true })

const run = (bin, args, cwd = root, env = process.env) => execFileSync(bin, args, {
  cwd,
  env,
  encoding: 'utf8',
  timeout: 240000,
  maxBuffer: 16 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'pipe'],
})

try {
  const artifact = process.argv[2] === undefined
    ? resolve(packDir, JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', packDir]))[0].filename)
    : resolve(process.argv[2])
  assert(existsSync(artifact), `packed artifact does not exist: ${artifact}`)

  writeFileSync(join(runtime, 'package.json'), '{"private":true}\n')
  run('npm', [
    'install', '--ignore-scripts', '--no-audit', '--no-fund', `--registry=${registry}`,
    '@deepseek-ai/dsh@0.1.2-rc.1', 'pnpm@11.7.0',
  ], runtime)

  const binDir = join(runtime, 'node_modules', '.bin')
  const cli = join(binDir, process.platform === 'win32' ? 'dsh.cmd' : 'dsh')
  const pnpm = join(binDir, process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm')
  const env = {
    ...process.env,
    DSH_HOME: home,
    NPM_CONFIG_REGISTRY: registry,
    PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
  }
  const profile = join(home, 'profiles', 'web')
  const pluginDir = join(profile, 'node_modules', 'dsh-request-privacy')
  const pluginArgs = ['plugin', '--profile', 'web']
  const addArgs = [...pluginArgs, 'add', '--ignore-scripts', `--registry=${registry}`, artifact]

  run(cli, addArgs, root, env)
  assert(existsSync(pluginDir), 'DSH did not materialize the plugin in the web profile')
  run(pnpm, ['peers', 'check'], profile, env)
  const firstDump = run(cli, ['--profile', 'web', '--dump-config'], root, env)
  assert.equal((firstDump.match(/id: request-privacy-bundle/g) ?? []).length, 1)
  assert.equal((firstDump.match(/id: request-privacy-native-provider/g) ?? []).length, 1)
  assert.match(firstDump, /id: llm-deepseek[\s\S]*?disabled: true/)

  run(cli, addArgs, root, env)
  const secondDump = run(cli, ['--profile', 'web', '--dump-config'], root, env)
  assert.equal((secondDump.match(/id: request-privacy-bundle/g) ?? []).length, 1, 'repeat install duplicated the bundle')
  assert.equal((secondDump.match(/id: request-privacy-native-provider/g) ?? []).length, 1, 'repeat install duplicated the provider')

  run(cli, [...pluginArgs, 'remove', 'dsh-request-privacy'], root, env)
  const finalDump = run(cli, ['--profile', 'web', '--dump-config'], root, env)
  assert(!finalDump.includes('request-privacy-bundle'), 'bundle remains after removal')
  assert(!finalDump.includes('request-privacy-native-provider'), 'provider remains after removal')
  assert.match(finalDump, /id: llm-deepseek[\s\S]*?name: '@deepseek-ai\/dsh-llm-deepseek'/)
  assert(!existsSync(pluginDir), 'plugin package remains after removal')

  const profileManifest = JSON.parse(readFileSync(join(profile, 'package.json'), 'utf8'))
  assert(!Object.hasOwn(profileManifest.dependencies ?? {}, 'dsh-request-privacy'))
  console.log(JSON.stringify({
    status: 'pass',
    dsh: '0.1.2-rc.1',
    plugin: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version,
    install: true,
    repeatInstall: true,
    peers: 'clean',
    remove: true,
  }))
} finally {
  rmSync(sandbox, { recursive: true, force: true })
}
