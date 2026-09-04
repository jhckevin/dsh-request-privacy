# 0.4.0-rc.2 acceptance record

Status: **candidate, not a completed release**. Target: Linux x86-64, Node 24.20.0, DSH 0.1.2-rc.1, pnpm 11.7.0. Development and compilation occur only in the isolated remote release worktree; production services are untouched.

## Passed

- TypeScript build and client bundle build.
- 16 tests across six files.
- Native settings bridge → native LLM service → HTTP/SSE mock endpoint: same session on/off/on, new session, compaction, title, credential preservation, byte-identical request payload across modes.
- In-flight request retains its mode; the next dispatch uses the changed setting.
- Revision conflicts reject stale updates; provider registration is withdrawn with its owner.
- Existing redirect refusal, lifecycle cancellation, header policy and configuration tests.
- Official CLI package installation and offline composed-config check: original adapter row disabled; exactly one replacement row inserted. No host source edits.

The new toggle tests use synthetic data and a local HTTP endpoint, **not the public model API**. They cost no model tokens. Historical 0.4.0-rc.1 evidence covered three real API calls (chat, compaction, title), all HTTP 200, 48 input plus 6 output tokens; that earlier result does not certify the new native wrapper.

## Still required before final release

- Real browser interaction with enabled/disabled settings, reload persistence and screenshots.
- Final packed-consumer and public CI gates on the exact release commit.
- Review the published README and installable Release assets.

The local Edge browser displayed `ERR_BLOCKED_BY_CLIENT` for the isolated test page. No browser block was bypassed. Old 0.2.0 screenshots are historical references only and are not presented as screenshots of this candidate.

## Reproduce automated checks

```sh
npm ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmmirror.com
npm run check
node scripts/check-release.mjs
```

No credentials, private session logs, test-home files or authentication URLs belong in release artifacts.
