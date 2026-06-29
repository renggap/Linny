# Follow-ups Round 2 Design

**Date:** 2026-06-29
**Status:** Approved
**Predecessors:**
- `docs/plans/2026-06-17-security-and-realtime-bugfixes.md` (merged in `62b52e9`)
- `docs/plans/2026-06-29-followups-design.md` (merged in `a7bb2cf`)

## Goal

Close 5 follow-up findings flagged by the second round's final reviewer. Ship as a single batched PR with one regression test per fix where applicable.

## Scope

### 1. Activity-feed key regression test

The prior round migrated `services/useActivityFeed.ts` from unscoped `['activity']` to scoped `activityKeys.all(currentTeamId)` but added no test. Add `tests/audit/activity-feed-key.test.ts` asserting the scoped key and `useUIStore` integration.

### 2. GET `/activities` membership gate

`server/routes/activities.fastify.ts:19` only has `onRequest: [authenticate]`. Mirror the gate added to `/issues` and `/projects` last round: extract `teamId` from query, look up `teamMember.findUnique`, 403 if missing (Administrator bypass).

### 3. GET `/issues/:id` and `/projects/:id` membership gate

The existing `requireIssueTeamMember` and `requireProjectMember` hooks in `server/middleware/authHooks.ts` already check team membership with Administrator bypass — they're just not wired into the single-entity GET routes. Add `onRequest: [authenticate, requireIssueTeamMember]` and `onRequest: [authenticate, requireProjectMember]` to those two routes.

### 4. Delete dead middleware

`server/middleware/csrf.ts` (Express-style orphan, 0 importers) and `server/middleware/auth.ts` (legacy, 0 importers — everyone uses `authHooks.ts`). Both confirmed dead via `grep -rn`. `git rm` both.

### 5. CSP FRONTEND_URL production guard

`server/index.ts` currently reads `process.env.FRONTEND_URL` for `connectSrc` derivation. If unset in production, CSP collapses to `'self'` and WebSocket/API cross-origin calls silently break. Add a startup check in `startServer()` that exits with a clear FATAL message if `NODE_ENV === 'production'` and `FRONTEND_URL` is unset/empty. Mirror the existing JWT_SECRET validation pattern.

### Out of scope

None. All 5 follow-ups addressed.

## Approach

**Ship cadence:** Single branch, 5 commits, one PR.

**Commit order** — by subsystem within the branch:

1. Activity-feed test (frontend)
2. GET `/activities` gate (backend, list route)
3. GET `/issues/:id` and `/projects/:id` gates (backend, single-entity routes)
4. Delete dead middleware (cleanup)
5. CSP FRONTEND_URL guard (server startup)

**Test bar:** Tests for #1 (new file) and #2/#3 (extend audit tests). #4 and #5 are small enough to verify by grep/startup behavior.

## Testing strategy

| # | Fix | Test file | Test type |
|---|-----|-----------|-----------|
| 1 | Activity-feed key | `tests/audit/activity-feed-key.test.ts` (new) | Source-pattern |
| 2 | GET /activities gate | `tests/audit/activities-membership.test.ts` (new) | Source-pattern |
| 3 | GET /:id gates | extend `tests/audit/get-route-membership.test.ts` | Source-pattern |
| 4 | Dead-code deletion | (diff proves removal) | n/a |
| 5 | CSP FRONTEND_URL guard | `tests/audit/csp-frontend-url-guard.test.ts` (new) | Source-pattern |

TDD per fix where applicable.

## Risk analysis

| Fix | Risk | Mitigation |
|---|---|---|
| Activity-feed test | None — additive test | n/a |
| GET /activities gate | May block frontend flows that omit teamId | Existing frontend always passes teamId from UI store |
| GET /:id gates | May block Administrators debugging cross-team — Administrator bypass preserved in both hooks | Verified hooks already bypass for `userRole === 'Administrator'` |
| Delete middleware | If anything secretly imports them, build breaks | Already grep-verified zero importers |
| CSP FRONTEND_URL guard | Existing prod deploys without FRONTEND_URL will fail to start | Intentional — surfaces the misconfig loudly |

## Ship readiness

The branch merges when:
- All 5 commits land
- All audit tests pass (existing + 3 new files + 1 extended)
- Manual smoke: GET `/activities?teamId=X` returns 403 for non-members, GET `/issues/:id` returns 403 for non-members, server refuses to start in prod without FRONTEND_URL
