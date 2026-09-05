import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const provenance = JSON.parse(readFileSync(join(root, 'vendor/upstream-provenance.json'), 'utf8'))
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const file = path => join(root, path)

assert.equal(provenance.schemaVersion, 1)
for (const [path, expected] of [
  [provenance.local.entry, provenance.local.entrySha256],
  [provenance.local.declaration, provenance.local.declarationSha256],
  [provenance.local.patch, provenance.local.patchSha256],
]) assert.equal(digest(file(path)), expected, `vendor provenance mismatch: ${path}`)

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
assert.equal(manifest.peerDependencies[provenance.upstream.package], provenance.upstream.version)

const flag = process.argv.indexOf('--upstream-tarball')
if (flag !== -1) {
  const archive = process.argv[flag + 1]
  assert(archive, '--upstream-tarball requires a path')
  assert.equal(digest(resolve(archive)), provenance.upstream.tarballSha256, 'upstream tarball digest mismatch')
  const temporary = mkdtempSync(join(tmpdir(), 'privacy-vendor-replay-'))
  try {
    execFileSync('tar', ['-xzf', resolve(archive), '-C', temporary])
    const upstream = join(temporary, provenance.upstream.entry)
    assert.equal(digest(upstream), provenance.upstream.entrySha256, 'upstream entry digest mismatch')
    const patch = readFileSync(file(provenance.local.patch))
    execFileSync('patch', ['--silent', '--batch', upstream], { input: patch })
    assert.equal(digest(upstream), provenance.local.entrySha256, 'replayed adapter digest mismatch')
    assert.deepEqual(readFileSync(upstream), readFileSync(file(provenance.local.entry)), 'replayed adapter differs')
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
}

process.stdout.write(`Vendor provenance: OK (${provenance.upstream.package}@${provenance.upstream.version})\n`)
