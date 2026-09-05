import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = process.cwd()
const run = (bin, args, cwd = root) => execFileSync(bin, args, {
  cwd, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024,
})
const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
const tracked = run('git', ['ls-files', '-z']).split('\0').filter(Boolean)
for (const file of tracked) {
  assert(!/(^|\/)(node_modules|acceptance|artifacts|\.env)(\/|$)/.test(file), 'Private/generated source path: ' + file)
  const data = readFileSync(file)
  if (/\.(jpg|png)$/.test(file)) continue
  assert(!/sk-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/.test(data.toString()), 'Potential credential in ' + file)
}
for (const file of ['README.md', 'README.en.md']) {
  const body = readFileSync(file, 'utf8')
  assert(body.includes('0.1.2-rc.1') && body.includes(manifest.version))
  assert(!/github:OWNER|localhost\.invalid/.test(body), 'Outdated installation text: ' + file)
}
mkdirSync('artifacts', { recursive: true })
const pack = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', 'artifacts']))[0]
const paths = new Set(pack.files.map(file => file.path))
for (const required of ['lib/index.js', 'lib/client.js', 'lib/native-provider.js', 'vendor/deepseek.js', 'vendor/deepseek.d.ts', 'vendor/upstream-provenance.json', 'vendor/deepseek.patch', 'cordis.patch.yml', 'README.md', 'README.en.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) assert(paths.has(required), 'Missing packed file: ' + required)
for (const path of paths) assert(!/(^|\/)(node_modules|acceptance|artifacts|\.env)(\/|$)/.test(path), 'Unexpected packed path: ' + path)
const artifact = resolve('artifacts', pack.filename)
const sha = createHash('sha256').update(readFileSync(artifact)).digest('hex')
writeFileSync('artifacts/SHA256SUMS', sha + '  ' + pack.filename + '\n')
const consumer = mkdtempSync(join(tmpdir(), 'privacy-consumer-'))
try {
  writeFileSync(join(consumer, 'package.json'), '{"private":true,"type":"module"}\n')
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund',
    '--registry=https://registry.npmmirror.com', '@deepseek-ai/dsh@0.1.2-rc.1', artifact], consumer)
  run(process.execPath, ['--input-type=module', '-e',
    "const m=await import('dsh-request-privacy'); const n=await import('dsh-request-privacy/native-provider'); if(typeof m.DeepSeekAdapter!=='function'||typeof m.resolveAdapterOptions!=='function'||typeof n.apply!=='function')throw Error('packed imports missing');"], consumer)
} finally {
  rmSync(consumer, { recursive: true, force: true })
}
writeFileSync('artifacts/release-check.json', JSON.stringify({
  package: manifest.name, version: manifest.version, dsh: manifest.peerDependencies['@deepseek-ai/dsh-llm'],
  sourceCommit: run('git', ['rev-parse', 'HEAD']).trim(),
  node: process.version, sha256: sha, packedFiles: paths.size,
  hostConsumerImport: true, sourceCredentialScan: true, modelApiCalled: false,
}, null, 2) + '\n')
console.log('Release checks passed: packed contents, DSH host import, documentation and credential scan')
