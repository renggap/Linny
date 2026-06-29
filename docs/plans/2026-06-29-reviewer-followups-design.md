# Reviewer Follow-ups Design

**Date:** 2026-06-29
**Status:** Approved
**Predecessor:** `docs/plans/2026-06-29-source-deploy-bugs-design.md` (merged in `b2ff843`)

## Goal

Close 5 cleanup items flagged by the final reviewer of the prior source-deploy-bugs round. All small, all defense-in-depth or documentation.

## Scope

1. **Move JWT secret capture into `jwtPlugin` body** in `server/index.ts`. Currently the module-scope `const JWT_SECRET = process.env.JWT_SECRET` + `process.exit(1)` block captures env at module load. With env preload this works, but the Fastify JWT plugin receives the captured value at registration — same module-load frame. Moving the read into the plugin body defers it to registration time while still failing fast if env isn't loaded.
2. **Stop auto-calling `validateConfig()` at module import** in `server/config/index.ts:194-200`. Modules shouldn't terminate the process on import. Call `validateConfig()` explicitly from `server/index.ts:startServer()`.
3. **Document `VITE_API_URL` convention in `CLAUDE.md`**. Convention: origin only (`https://host`); code in `services/api.ts:25` appends `/api/v1`. Baking `https://host/api/v1` produces `/api/v1/api/v1/...` 404s.
4. **Fix regex typo in `tests/audit/cookie-maxage.test.ts:21`**. `(?!s*\*\s*1000)` uses literal `s` instead of `\s*`.
5. **Switch `/refresh` to lazy `verifyToken()`** in `server/routes/auth.fastify.ts:174`. Defense-in-depth: reads env at call time via `getSecret()` from `auth/jwt.ts`, not the once-captured plugin secret.

### Out of scope

- Refactoring all JWT verify call sites to lazy pattern (just /refresh for now)
- Removing fastify-jwt plugin entirely (would be bigger change)
- Backfilling deploy docs for `/home/linny-live`

## Approach

**Ship cadence:** Single branch, 5 commits, one PR.

**Commit order:**
1. Move JWT_SECRET into jwtPlugin body (server/index.ts)
2. Stop auto-calling validateConfig (server/config/index.ts, server/index.ts)
3. Document VITE_API_URL (CLAUDE.md)
4. Fix regex typo (tests/audit/cookie-maxage.test.ts)
5. Switch /refresh to verifyToken (server/routes/auth.fastify.ts)

## Testing strategy

| # | Fix | Test |
|---|-----|------|
| 1 | JWT secret in jwtPlugin | extend `tests/audit/env-load-order.test.ts` — assert no module-scope `JWT_SECRET` capture in index.ts |
| 2 | validateConfig explicit | extend `tests/audit/env-load-order.test.ts` — assert config module has no auto-call block |
| 3 | VITE_API_URL docs | n/a (doc only) |
| 4 | Regex typo | re-run existing test, still passes |
| 5 | /refresh verifyToken | extend `tests/audit/env-load-order.test.ts` — assert `/refresh` uses `verifyToken` not `fastify.jwt.verify` |

TDD per fix where applicable.

## Risk analysis

| Fix | Risk | Mitigation |
|---|---|---|
| 1 | Plugin registration may now fail later (at server boot) instead of at module load — same observable behavior | Same env validation, just relocated |
| 2 | If startServer doesn't call validateConfig, bad config ships silently | Add explicit call in startServer |
| 3 | Docs only, no risk | n/a |
| 4 | Test regex change — confirm test still guards intended behavior | Companion assertion still covers |
| 5 | verifyToken returns `null` on failure vs `fastify.jwt.verify` throws — error path needs to handle both | Already in try/catch |

## Ship readiness

Branch merges when:
- All 5 commits land
- All existing audit tests still pass
- Manual smoke: server boots, /api/health returns healthy, login → /refresh → /me roundtrip works
