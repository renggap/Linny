# Follow-ups Round 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close 5 follow-up findings from the second-round final review: activity-feed test gap, `/activities` membership gate, single-entity GET gates, dead-middleware deletion, and CSP `FRONTEND_URL` production guard.

**Architecture:** Phase A = test gap + 3 security gates (behavior changes). Phase B = cleanup (delete dead code). Phase C = startup guard. One commit per fix, one regression test per behavior change.

**Tech Stack:** Fastify, Prisma, Vitest, React, TanStack Query.

---

## Sequencing

Commit order within the branch:

1. Activity-feed key regression test (frontend only)
2. GET `/activities` membership gate (backend, list route)
3. GET `/issues/:id` and `/projects/:id` gates (backend, single-entity routes)
4. Delete `server/middleware/csrf.ts` and `server/middleware/auth.ts` (cleanup)
5. CSP `FRONTEND_URL` production startup guard (server startup)

Tasks are independent — each is revertible on its own.

---

## Task 1: Activity-feed key regression test

**Files:**
- Create: `tests/audit/activity-feed-key.test.ts`

### Step 1: Write the test

Create `tests/audit/activity-feed-key.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../services/useActivityFeed.ts'),
  'utf8'
);

describe('useActivityFeed scoped query key', () => {
  it('imports activityKeys and useUIStore', () => {
    expect(src).toMatch(/import\s+\{\s*activityKeys\s*\}\s+from\s+['"][^'"]*queryKeys/);
    expect(src).toMatch(/import\s+\{\s*useUIStore\s*\}\s+from\s+['"][^'"]*uiStore/);
  });

  it('reads currentTeamId from useUIStore', () => {
    expect(src).toMatch(/useUIStore\(/);
    expect(src).toMatch(/currentTeamId/);
  });

  it('uses activityKeys.all(currentTeamId) as the query key', () => {
    expect(src).toMatch(/queryKey:\s*currentTeamId\s*\?\s*activityKeys\.all\(currentTeamId\)/);
  });

  it('disables the query when currentTeamId is missing', () => {
    expect(src).toMatch(/enabled:\s*!!currentTeamId/);
  });

  it('does NOT use the legacy unscoped [\'activity\'] key', () => {
    expect(src).not.toMatch(/queryKey:\s*\['activity'\]/);
  });
});
```

### Step 2: Run test

```bash
npx vitest run tests/audit/activity-feed-key.test.ts
```
Expected: PASS (the prior round's fix already satisfies the assertions). This test guards against regression.

### Step 3: Commit

```bash
git add tests/audit/activity-feed-key.test.ts
git commit -m "test(ui): add regression guard for activity feed scoped key"
```

---

## Task 2: GET `/activities` membership gate

**Files:**
- Modify: `server/routes/activities.fastify.ts:19-43` (the `GET /` handler)
- Test: `tests/audit/activities-membership.test.ts`

### Step 1: Write failing test

Create `tests/audit/activities-membership.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/activities.fastify.ts'),
  'utf8'
);

function extractGetHandler(): string {
  const startIdx = src.indexOf(`fastify.get('/'`);
  if (startIdx === -1) return '';
  const after = src.slice(startIdx);
  const next = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
  return after.slice(0, next ? next.index : after.length);
}

describe('GET /activities membership gate', () => {
  it('checks team membership for the requested teamId', () => {
    const block = extractGetHandler();
    expect(block).toMatch(/request\.userId/);
    expect(block).toMatch(/request\.userRole/);
    expect(block).toMatch(/teamMember\.findUnique/);
    expect(block).toMatch(/Forbidden|403/);
  });

  it('bypasses for Administrators', () => {
    const block = extractGetHandler();
    expect(block).toMatch(/request\.userRole\s*!==\s*['"]Administrator['"]/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/activities-membership.test.ts
```
Expected: FAIL.

### Step 3: Patch the handler

In `server/routes/activities.fastify.ts:19-43`, after the destructured `const { teamId, projectId, limit = 100 } = request.query;` (line 25), insert the membership gate:

```ts
}, async (request: any, reply: any) => {
  const { teamId, projectId, limit = 100 } = request.query;

  // Membership gate (mirror of /issues and /projects list routes)
  if (request.userRole !== 'Administrator') {
    if (!teamId) {
      return reply.code(400).send({ error: 'teamId is required' });
    }
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: request.userId } }
    });
    if (!membership) {
      return reply.code(403).send({
        error: 'Forbidden: You are not a member of this team'
      });
    }
  }

  const activities = await prisma.activity.findMany({
    // ...existing where/orderby/take/include
  });

  return { activities };
});
```

### Step 4: Run test

```bash
npx vitest run tests/audit/activities-membership.test.ts
```
Expected: PASS.

### Step 5: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep activities.fastify | tail -5
```

### Step 6: Commit

```bash
git add server/routes/activities.fastify.ts tests/audit/activities-membership.test.ts
git commit -m "fix(api): scope GET /activities to team members"
```

---

## Task 3: Gate GET `/issues/:id` and `/projects/:id`

**Files:**
- Modify: `server/routes/issues.fastify.ts:95` (the `GET /:id` route)
- Modify: `server/routes/projects.fastify.ts:118` (the `GET /:id` route)
- Test: extend `tests/audit/get-route-membership.test.ts`

### Step 1: Read current state

```bash
sed -n '95,100p' server/routes/issues.fastify.ts
sed -n '118,123p' server/routes/projects.fastify.ts
```

Both routes have `onRequest: [authenticate]`. The existing `requireIssueTeamMember` and `requireProjectMember` hooks already exist in `server/middleware/authHooks.ts` and include Administrator bypass.

### Step 2: Patch issues route

In `server/routes/issues.fastify.ts:95`, change the route registration. The current line:

```ts
fastify.get('/:id', {
  onRequest: [authenticate],
  schema: {
    params: z.object({ id: z.string() })
  }
}, async (request: any, reply: any) => {
```

Change `onRequest: [authenticate]` to `onRequest: [authenticate, requireIssueTeamMember]`:

```ts
fastify.get('/:id', {
  onRequest: [authenticate, requireIssueTeamMember],
  schema: {
    params: z.object({ id: z.string() })
  }
}, async (request: any, reply: any) => {
```

`requireIssueTeamMember` is already imported at line 6: `import { authenticate, requireIssueTeamMember, requireAdmin } from '../middleware/authHooks.js';`

### Step 3: Patch projects route

In `server/routes/projects.fastify.ts:118`, same pattern. The current line:

```ts
fastify.get('/:id', {
  onRequest: [authenticate],
  schema: {
    params: z.object({ id: z.string() })
  }
}, async (request: any, reply: any) => {
```

Change to:

```ts
fastify.get('/:id', {
  onRequest: [authenticate, requireProjectMember],
  schema: {
    params: z.object({ id: z.string() })
  }
}, async (request: any, reply: any) => {
```

`requireProjectMember` is already imported at line 5 of `projects.fastify.ts` (verify by checking the import block; if it's not imported, add it to the existing `authHooks.js` import).

### Step 4: Extend the test

Open `tests/audit/get-route-membership.test.ts` and add cases for the single-entity routes:

```ts
describe('GET /issues/:id membership gate', () => {
  it('declares requireIssueTeamMember in onRequest', () => {
    const block = extractFirstRoute(issuesSrc, '/:id');
    expect(block).toMatch(/onRequest:\s*\[authenticate,\s*requireIssueTeamMember\]/);
  });
});

describe('GET /projects/:id membership gate', () => {
  it('declares requireProjectMember in onRequest', () => {
    const block = extractFirstRoute(projectsSrc, '/:id');
    expect(block).toMatch(/onRequest:\s*\[authenticate,\s*requireProjectMember\]/);
  });
});
```

(`extractFirstRoute` is already defined in the test file from the prior round.)

### Step 5: Run test

```bash
npx vitest run tests/audit/get-route-membership.test.ts
```
Expected: PASS (existing cases + 2 new).

### Step 6: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep -E "issues\.fastify|projects\.fastify" | tail -10
```

### Step 7: Commit

```bash
git add server/routes/issues.fastify.ts server/routes/projects.fastify.ts tests/audit/get-route-membership.test.ts
git commit -m "fix(api): gate GET /issues/:id and /projects/:id with membership hooks"
```

---

## Task 4: Delete dead middleware

**Files:**
- Delete: `server/middleware/csrf.ts` (128 lines, Express-style orphan)
- Delete: `server/middleware/auth.ts` (307 lines, legacy — superseded by `authHooks.ts`)

### Step 1: Re-verify zero importers

```bash
grep -rn "middleware/csrf" server/ services/ hooks/ 2>&1
grep -rn "middleware/auth['\"]" server/ services/ hooks/ 2>&1
```
Expected: zero matches for both.

If either returns any result, STOP — the file is in use. Investigate before deleting.

### Step 2: Delete

```bash
git rm server/middleware/csrf.ts server/middleware/auth.ts
```

### Step 3: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep -v node_modules | tail -10
```
Expected: no new errors.

### Step 4: Run audit suite to confirm nothing depended on them

```bash
npx vitest run tests/audit/ 2>&1 | grep -E "Test Files|Tests " | tail -3
```
Expected: same pass count as before.

### Step 5: Commit

```bash
git commit -m "chore(middleware): remove dead csrf.ts and auth.ts (Express-era orphans)"
```

---

## Task 5: CSP `FRONTEND_URL` production guard

**Files:**
- Modify: `server/index.ts` — add startup guard near the existing JWT_SECRET check (around line 137-147)
- Test: `tests/audit/csp-frontend-url-guard.test.ts`

### Step 1: Write failing test

Create `tests/audit/csp-frontend-url-guard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/index.ts'),
  'utf8'
);

describe('CSP FRONTEND_URL production guard', () => {
  it('checks FRONTEND_URL when NODE_ENV is production', () => {
    // Look for the startup-guard pattern: production env check + FRONTEND_URL presence check + exit
    expect(src).toMatch(/process\.env\.NODE_ENV\s*===\s*['"]production['"]/);
    expect(src).toMatch(/FRONTEND_URL/);
    expect(src).toMatch(/process\.exit\(1\)/);
  });

  it('logs a clear FATAL message about the missing var', () => {
    // Find the guard block and verify it logs a CSP-specific fatal message
    const guardBlock = src.match(/process\.env\.NODE_ENV\s*===\s*['"]production['"][\s\S]*?process\.exit\(1\)/)?.[0] ?? '';
    expect(guardBlock).toMatch(/FRONTEND_URL/);
    expect(guardBlock).toMatch(/FATAL|required|CSP/i);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/csp-frontend-url-guard.test.ts
```
Expected: FAIL on the FRONTEND_URL-specific assertions (current JWT_SECRET check matches NODE_ENV === 'production' but not FRONTEND_URL).

### Step 3: Patch index.ts

In `server/index.ts`, immediately after the JWT_SECRET validation block (after line 147), add a parallel guard for FRONTEND_URL:

```ts
// Production CSP requires FRONTEND_URL so connectSrc can derive wss:// for WebSocket.
// Without it, deployed browsers will block API/WS requests.
if (process.env.NODE_ENV === 'production') {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl || frontendUrl.trim().length === 0) {
    console.error('FATAL: FRONTEND_URL environment variable is required in production (used for CSP connectSrc and WebSocket wss:// derivation)');
    process.exit(1);
  }
}
```

Place it before `const JWT_SECRET_VALIDATED` so it fails fast before any other work.

### Step 4: Run test

```bash
npx vitest run tests/audit/csp-frontend-url-guard.test.ts
```
Expected: PASS.

### Step 5: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep "index.ts" | tail -5
```

### Step 6: Commit

```bash
git add server/index.ts tests/audit/csp-frontend-url-guard.test.ts
git commit -m "fix(security): fail startup in production if FRONTEND_URL is missing"
```

---

## Final verification

After all 5 commits land:

```bash
npm run typecheck
npm run lint
npx vitest run tests/audit/
```

Manual smoke test:

1. Switch teams in UI — activity feed renders for the current team only (Task 1).
2. Member of Team A queries `GET /api/v1/activities?teamId=team-b-id` → 403 (Task 2).
3. Member of Team A queries `GET /api/v1/issues/<team-b-issue-id>` → 403 (Task 3).
4. Member of Team A queries `GET /api/v1/projects/<team-b-project-id>` → 403 (Task 3).
5. Administrator queries the same routes → 200 (bypass works).
6. `node server/dist/index.js` in prod without `FRONTEND_URL` → exits with FATAL message (Task 5).
7. `node server/dist/index.js` in prod with `FRONTEND_URL` → starts normally.
8. Typecheck still clean after deleting `csrf.ts` and `auth.ts` (Task 4).

---

## Sequencing recap

- **One PR, 5 commits, 3 new test files + 1 extended.**
- Each task is independently revertible.
- Server deps must be installed at `server/node_modules/` (`cd server && npm install`).

---

## Out of scope

- `console.error` in `/reset-password` handler (cosmetic; could swap to `fastify.log.error`).
- `console.log` noise in `server/database.ts` and `server/routes/teams.fastify.ts:29` (cosmetic).
- Adding tests for `/auth/login` log absence (existing `tests/audit/refresh-no-logs.test.ts` already covers this).
