# Source Deploy-Bug Fixes Design

**Date:** 2026-06-29
**Status:** Approved
**Predecessor:** `docs/plans/2026-06-29-linny-live-deploy-implementation.md`

## Goal

Fix 4 source-repo bugs discovered during the linny-live deploy. All four ship-affecting, all in server-side code.

## Scope

### Phase A — Behavior changes

1. **JWT iat collision on refresh token** (`server/routes/auth.fastify.ts:39`)
   Two `fastify.jwt.sign(payload, { expiresIn: '7d' })` calls in the same second produce identical tokens (same payload + same `iat` + same `exp` = same signature) → `refreshToken.token` unique-constraint violation. Affects register→login within the same second, or two logins within the same second.
   **Fix:** Add `jti: crypto.randomUUID()` to the refresh-token payload. Access tokens don't need it (not stored in DB).

2. **Module-load env race** (`server/auth/jwt.ts:4`, `server/config/index.ts:103-147`)
   These modules read `process.env` at module-import time. The server entry calls `dotenv.config()` AFTER imports load, so env reads see empty values → CSRF secret defaults to public string, JWT verification falls back to dev secret.
   **Fix:** Hoist `dotenv.config()` to a preload `import 'dotenv/config'` as the very first statement of `server/index.ts`. Remove the redundant `dotenv.config()` call from `server/config/index.ts`. Make `server/auth/jwt.ts` read env lazily (inside functions) so it always sees current state.

### Phase B — Config tweaks

3. **`trustProxy` missing** (`server/index.ts:210`)
   Behind nginx, `request.ip` returns the socket peer (`127.0.0.1`) instead of the real client IP from `X-Forwarded-For`. Rate limits key on IP → all clients share one bucket → 5-login/15min limit exhausted globally across all users.
   **Fix:** Add `trustProxy: true` to the Fastify instance options.

4. **Cookie maxAge unit** (`server/routes/auth.fastify.ts:25`)
   `@fastify/cookie` interprets `maxAge` as seconds, but the code uses `7 * 24 * 60 * 60 * 1000` (= 604,800,000 seconds ≈ 19 years). Browsers cap at 400 days; some reject the cookie outright.
   **Fix:** Drop the `* 1000`: `maxAge: 7 * 24 * 60 * 60` (= 604,800 seconds = 7 days).

### Out of scope

- Migrating refresh tokens from JWT to UUID (would solve bug 1 differently; bigger change)
- Documenting `VITE_API_URL` convention in CLAUDE.md (deploy-doc concern)
- Other deploy anomalies specific to `/home/linny-live` (those are deploy artifacts, not source bugs)

## Approach

**Ship cadence:** Single branch, 4 commits, one PR.

**Commit order:**
1. jti uniqueness (auth.fastify.ts)
2. env race (jwt.ts, config/index.ts, index.ts)
3. trustProxy (index.ts)
4. cookie maxAge (auth.fastify.ts)

**Test bar:** One regression test per fix, all source-pattern or behavioral unit tests.

## Testing strategy

| # | Bug | Test file | Test type |
|---|-----|-----------|-----------|
| 1 | jti uniqueness | `tests/audit/refresh-token-uniqueness.test.ts` (new) | Behavioral unit |
| 2 | env race | `tests/audit/env-load-order.test.ts` (new) | Source-pattern |
| 3 | trustProxy | `tests/audit/trust-proxy.test.ts` (new) | Source-pattern |
| 4 | maxAge seconds | `tests/audit/cookie-maxage.test.ts` (new) | Source-pattern |

TDD per fix: failing test → implement → passing test → commit.

## Risk analysis

| Fix | Risk | Mitigation |
|---|---|---|
| jti uniqueness | Existing refresh tokens in prod DB don't have jti — they still verify (jti is optional) | Backwards-compatible |
| env race | Test setup may break if env loaded differently | Verify with audit test suite (existing tests still pass) |
| trustProxy | If app NOT behind proxy, malicious client can spoof IP via X-Forwarded-For header | This app IS always behind nginx in prod — trustProxy correct. Dev runs without nginx but dev has `allowList: ['127.0.0.1', '::1']` so rate limiting is bypassed anyway |
| cookie maxAge | Existing refresh-token cookies may be cleared sooner (correct 7-day vs incorrect 7000-day) | Acceptable — current cookies were broken anyway |

## Ship readiness

The branch merges when:
- All 4 commits land
- All audit tests pass (existing + 4 new files)
- Manual smoke: register → login within same second succeeds; rate limit correctly per-IP; refresh-token cookie persists for 7 days
