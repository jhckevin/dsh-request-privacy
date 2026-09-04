# 0.4.0-rc.2 acceptance record

Status: **prerelease acceptance record**. Target: Linux x86-64, Node 24.20.0, DSH 0.1.2-rc.1, pnpm 11.7.0. Development and compilation occur only in the isolated remote release worktree; production services are untouched.

## Passed

- TypeScript build and client bundle build.
- 16 tests across six files.
- Native settings bridge → native LLM service → HTTP/SSE mock endpoint: same session on/off/on, new session, compaction, title, credential preservation, byte-identical request payload across modes.
- In-flight request retains its mode; the next dispatch uses the changed setting.
- Revision conflicts reject stale updates; provider registration is withdrawn with its owner.
- Existing redirect refusal, lifecycle cancellation, header policy and configuration tests.
- Official CLI package installation and offline composed-config check: original adapter row disabled; exactly one replacement row inserted. No host source edits.

The new toggle tests use synthetic data and a local HTTP endpoint, **not the public model API**. They cost no model tokens. Historical 0.4.0-rc.1 evidence covered three real API calls (chat, compaction, title), all HTTP 200, 48 input plus 6 output tokens; that earlier result does not certify the new native wrapper.

## Real browser acceptance

- Local Windows Edge connected through a loopback SSH tunnel to an isolated DSH profile, using the normal startup login URL. No browser security settings changed.
- Enabled → disabled → enabled: automatic save confirmation and corresponding header preview.
- Disabled setting persisted across page reload and host restart.
- Restore-deployment-defaults button restored enabled mode and saved successfully.
- All three plugin components enabled and running; native-provider details inspected.
- Chinese and English settings labels, metadata explanations, button contrast and responsive layout inspected.
- Five actual browser screenshots are included in docs/images; no keys, login tokens or private chat content are visible.

An earlier unauthenticated root URL showed `ERR_BLOCKED_BY_CLIENT`; the normal authenticated startup URL loaded successfully. The initial browser-block diagnosis was incorrect. These checks validate UI state and persistence; wire-level behavior is covered separately by the synthetic native-adapter integration tests, not inferred from screenshots.

## Release gates

The public CI builds, runs tests, emits JUnit, scans packaged source and verifies imports from a clean packed consumer. See the commit-specific runs in [Actions](https://github.com/jhckevin/dsh-request-privacy/actions). Release assets include the installable package, checksum and verification receipt. This is not a guarantee against every production failure.

## Reproduce automated checks

```sh
npm ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmmirror.com
npm run check
node scripts/check-release.mjs
```

No credentials, private session logs, test-home files or authentication URLs belong in release artifacts.
