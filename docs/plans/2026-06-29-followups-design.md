# Security & Cleanup Follow-ups Design

**Date:** 2026-06-29
**Status:** Approved
**Predecessor:** `docs/plans/2026-06-17-security-and-realtime-bugfixes.md` (merged in commit `62b52e9`)

## Goal

Close the 12 follow-up findings flagged by the final review of the prior security + real-time bugfix plan. Ship as a single batched PR with one regression test per fix.

## Scope

All 12 follow-ups, grouped by theme.

### Phase 1 — Security & correctness (8 fixes, behavior changes)

1. **Email casing at register.** `/register` stores email as-typed; `/login` normalizes via `.toLowerCase()`. Users who register with mixed case cannot log in. Fix: lowercase email before `prisma.user.create` in `auth.fastify.ts`.

2. **Production CSP.** `server/index.ts:71` sets `contentSecurityPolicy: isDevelopment ? {...} : false`. The `false` branch ships no CSP in production. Fix: use the dev directives in both branches (or a production-tightened variant) and verify nginx isn't expected to override.

3. **CSV injection in `/api/v1/export`.** Cell values starting with `=`, `+`, `-`, `@`, `\t`, `\r` execute formulas when opened in Excel/Sheets. Fix: prefix affected cells with a single quote `'` in the export serializer.

4. **`accountLockout.ts:77` PII leak.** `console.warn` writes the locked user's raw email to stdout. Fix: log a redacted or hashed key, not the raw identifier.

5. **TeamLead-demotes-Administrator.** Role-change endpoints allow TeamLead to demote Administrator. Fix: deny role changes targeting Administrator unless the caller is also Administrator.

6. **`requireTeamMember` hole.** Non-members can PATCH non-stealth teams. Fix: tighten the middleware so non-members are denied even on non-stealth teams for state-changing operations.

7. **GET membership checks.** GET routes for `/issues`, `/projects` lack team-membership checks — cross-team reads are possible. Fix: add membership gates (stealth teams always require membership; non-stealth teams follow existing visibility rule).

8. **WS admin bypass consistency.** `/ws/issue/*` and `/ws/project/*` (Task 8 of prior plan) require TeamMember for stealth teams with no Administrator bypass, while REST allows Administrator. Fix: add `userRole === 'Administrator'` bypass to mirror REST.

### Phase 2 — Cleanup (4 fixes, no behavior change)

9. **Delete `fastifyWebSocketServer.ts`.** ~570 LOC, zero importers confirmed via grep. Pure dead code.

10. **Replace stale activity key.** `services/useActivityFeed.ts:71` still uses unscoped `['activity']`. Prior plan fixed `websocketQuerySync.ts`; this finishes the migration.

11. **Strip `/auth/refresh` debug logs.** Leftover `console.log` lines (prior plan only stripped `/login`).

12. **`accountLockout.ts:28` `.unref()`.** Cleanup interval lacks `.unref()`, blocking clean process exit. CSRF cleanup interval has it (Task 2 of prior plan); this matches.

### Out of scope

None. All 12 follow-ups are addressed.

## Approach

**Ship cadence:** Single branch, 12 commits, one PR.

**Commit ordering** — grouped by subsystem within Phase 1 for review readability:

1. `register` email lowercasing
2. TeamLead-demotes-Administrator guard
3. `requireTeamMember` strict mode
4. GET `/issues`, `/projects` membership checks
5. WS admin bypass (paired with prior plan's WS membership)
6. CSV injection
7. Production CSP
8. `accountLockout` PII redaction
9. Delete `fastifyWebSocketServer.ts`
10. `useActivityFeed` key migration
11. `/auth/refresh` log strip
12. `accountLockout` `.unref()`

**Test bar:** Every fix gets a regression test. Source-pattern tests for config/wiring changes, behavioral tests where a function can be unit-tested directly.

## Testing strategy

| # | Fix | Test file | Test type |
|---|-----|-----------|-----------|
| 1 | Email casing | `tests/audit/register-email-casing.test.ts` | Source-pattern + behavioral |
| 2 | Admin demotion guard | `tests/audit/admin-demotion-guard.test.ts` | Source-pattern |
| 3 | requireTeamMember strict | `tests/audit/require-team-member.test.ts` | Source-pattern |
| 4 | GET membership checks | `tests/audit/get-route-membership.test.ts` | Source-pattern |
| 5 | WS admin bypass | extend existing `tests/audit/ws-membership.test.ts` | Source-pattern |
| 6 | CSV injection | `tests/audit/csv-injection.test.ts` | Behavioral unit |
| 7 | Production CSP | `tests/audit/csp-config.test.ts` | Source-pattern |
| 8 | accountLockout PII redaction | `tests/audit/lockout-pii.test.ts` | Source-pattern |
| 9 | dead code deletion | (diff proves removal) | n/a |
| 10 | useActivityFeed key | `tests/audit/activity-feed-key.test.ts` | Source-pattern |
| 11 | refresh console.log strip | `tests/audit/refresh-no-logs.test.ts` | Source-pattern (absence) |
| 12 | accountLockout `.unref()` | extend existing `tests/audit/lockout.test.ts` | Source-pattern |

TDD loop per fix: write failing test → confirm fail → implement → confirm pass → commit.

## Risk analysis

| Fix | Risk | Mitigation |
|---|---|---|
| Email casing | Existing users with mixed-case emails suddenly become lower-case | One-time data migration script (`UPDATE users SET email = LOWER(email)`) — flag for ops runbook, not in this PR |
| Production CSP | Tight policy may break inline styles / external scripts | Reuse dev directives verbatim; verify with manual smoke after deploy |
| requireTeamMember strict | May break legitimate non-member admin/TeamLead flows | Pair with WS admin bypass (#5) so Administrator always works |
| GET membership checks | May break cross-team admin views | Pair with Administrator bypass |
| CSV injection | Cell-prefix change may break CSV consumers that expect raw `=` | Document the change in export response |
| Delete fastifyWebSocketServer | If anything secretly imports it, build breaks | Already grep-verified; commit is isolated so revert is clean |

## Ship readiness

The branch merges when:
- All 12 commits land
- All audit tests pass (prior suite + 11 new files)
- Manual smoke: register lowercase email, login lowercase email, admin demotion blocked, CSV export opens safely in Excel, production build serves CSP headers
