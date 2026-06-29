# Security & Cleanup Follow-ups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 12 follow-up findings from the prior plan's final review in a single batched PR.

**Architecture:** Phase 1 = 8 security/correctness fixes (behavior changes). Phase 2 = 4 cleanup fixes (no behavior change). One commit per fix, one regression test per fix.

**Tech Stack:** Fastify, Prisma, `@fastify/helmet`, `@fastify/websocket`, Zod, Vitest, React, TanStack Query.

---

## Sequencing

Commit order within the branch follows the design doc's subsystem grouping:

- **Phase 1 (Tasks 1-8):** register email casing → admin demotion guard → requireTeamMember strict → GET membership checks → WS admin bypass → CSV injection → production CSP → accountLockout PII redaction
- **Phase 2 (Tasks 9-12):** delete dead module → activity feed key → refresh logs strip → lockout `.unref()`

Each task is self-contained and can be reverted independently if review finds an issue.

---

## Task 1: Lowercase email at registration

**Files:**
- Modify: `server/routes/auth.fastify.ts:64, 71, 84`
- Test: `tests/audit/register-email-casing.test.ts`

### Step 1: Write failing test

Create `tests/audit/register-email-casing.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
  'utf8'
);

function extractRegisterHandler(): string {
  const startIdx = src.indexOf(`fastify.post('/register'`);
  if (startIdx === -1) return '';
  const after = src.slice(startIdx);
  const next = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
  return after.slice(0, next ? next.index : after.length);
}

describe('register email casing', () => {
  it('lowercases email before storing and before duplicate check', () => {
    const block = extractRegisterHandler();
    expect(block).toMatch(/const normalizedEmail\s*=\s*email\.toLowerCase\(\)/);
    // Duplicate check uses normalizedEmail
    expect(block).toMatch(/findUnique\(\s*{\s*where:\s*{\s*email:\s*normalizedEmail\s*}\s*}\s*\)/);
    // Prisma create uses normalizedEmail
    expect(block).toMatch(/data:\s*\{[\s\S]*?email:\s*normalizedEmail[\s\S]*?\}/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/register-email-casing.test.ts
```
Expected: FAIL.

### Step 3: Patch the register handler

In `server/routes/auth.fastify.ts`, modify the `/register` handler. Current state at lines 64-90:

```ts
const { name, email, password } = request.body;

const passwordValidation = validatePasswordStrength(password);
if (!passwordValidation.valid) {
  return reply.code(400).send({ error: 'Password does not meet requirements', details: passwordValidation.errors });
}

const existingUser = await prisma.user.findUnique({ where: { email } });
if (existingUser) {
  return reply.code(409).send({ error: 'Email already registered' });
}

const allUsersCount = await prisma.user.count();
const role = allUsersCount === 0 ? UserRole.Administrator : UserRole.Member;

const passwordHash = await hashPassword(password);

const newUser = await prisma.user.create({
  data: {
    name,
    email,
    passwordHash,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    role,
    emailVerified: false
  }
});
```

Replace `email` with `normalizedEmail` in both the duplicate check and the create:

```ts
const { name, email, password } = request.body;
const normalizedEmail = email.toLowerCase();

const passwordValidation = validatePasswordStrength(password);
if (!passwordValidation.valid) {
  return reply.code(400).send({ error: 'Password does not meet requirements', details: passwordValidation.errors });
}

const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
if (existingUser) {
  return reply.code(409).send({ error: 'Email already registered' });
}

const allUsersCount = await prisma.user.count();
const role = allUsersCount === 0 ? UserRole.Administrator : UserRole.Member;

const passwordHash = await hashPassword(password);

const newUser = await prisma.user.create({
  data: {
    name,
    email: normalizedEmail,
    passwordHash,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    role,
    emailVerified: false
  }
});
```

### Step 4: Run test

```bash
npx vitest run tests/audit/register-email-casing.test.ts
```
Expected: PASS.

### Step 5: Commit

```bash
git add server/routes/auth.fastify.ts tests/audit/register-email-casing.test.ts
git commit -m "fix(auth): lowercase email at registration so login matches"
```

---

## Task 2: Block TeamLead from demoting Administrator

**Files:**
- Modify: `server/routes/users.fastify.ts:81-87` (the `/role` handler)
- Test: `tests/audit/admin-demotion-guard.test.ts`

### Step 1: Write failing test

Create `tests/audit/admin-demotion-guard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/users.fastify.ts'),
  'utf8'
);

function extractRoleHandler(): string {
  const startIdx = src.indexOf(`fastify.patch('/:id/role'`);
  if (startIdx === -1) return '';
  const after = src.slice(startIdx);
  const next = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
  return after.slice(0, next ? next.index : after.length);
}

describe('admin demotion guard', () => {
  it('TeamLead cannot demote an existing Administrator', () => {
    const block = extractRoleHandler();
    // Look up the target user's current role and reject if Administrator
    expect(block).toMatch(/findUnique\(\s*{\s*where:\s*{\s*id\s*}\s*}\s*\)/);
    expect(block).toMatch(/user\.role\s*===\s*['"]Administrator['"]/);
    expect(block).toMatch(/request\.userRole\s*===\s*['"]TeamLead['"]/);
    expect(block).toMatch(/Forbidden.*demote.*Administrator|cannot demote Administrator/i);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/admin-demotion-guard.test.ts
```
Expected: FAIL.

### Step 3: Patch the role-change handler

In `server/routes/users.fastify.ts`, modify the `/:id/role` handler. After the self-change guard at line 75 and the TeamLead-assigns-Administrator guard at lines 77-79, add a demotion guard:

```ts
}, async (request: any, reply: any) => {
  const { id } = request.params;
  const { role } = request.body;

  if (id === request.userId) {
    return reply.code(400).send({ error: 'Cannot change your own role' });
  }

  if (request.userRole === 'TeamLead' && role === 'Administrator') {
    return reply.code(403).send({ error: 'Team Leads cannot assign Administrator role' });
  }

  // TeamLead cannot demote an existing Administrator
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return reply.code(404).send({ error: 'User not found' });
  }
  if (targetUser.role === 'Administrator' && request.userRole !== 'Administrator') {
    return reply.code(403).send({ error: 'Forbidden: Only Administrators can modify an Administrator' });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      role: role as any,
      updatedAt: new Date()
    }
  });

  const { passwordHash: _, ...sanitizedUser } = user;
  return { user: sanitizedUser };
});
```

### Step 4: Run test

```bash
npx vitest run tests/audit/admin-demotion-guard.test.ts
```
Expected: PASS.

### Step 5: Commit

```bash
git add server/routes/users.fastify.ts tests/audit/admin-demotion-guard.test.ts
git commit -m "fix(users): block TeamLead from demoting Administrator"
```

---

## Task 3: Make `requireTeamMember` actually strict

**Files:**
- Modify: `server/middleware/authHooks.ts:105-109`
- Test: `tests/audit/require-team-member.test.ts`

### Step 1: Write failing test

Create `tests/audit/require-team-member.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/middleware/authHooks.ts'),
  'utf8'
);

describe('requireTeamMember strict semantics', () => {
  it('is no longer aliased to requireTeamAccess (which allows non-members on non-stealth teams)', () => {
    // Must not be `export const requireTeamMember = requireTeamAccess`
    expect(src).not.toMatch(/export const requireTeamMember\s*=\s*requireTeamAccess/);
  });

  it('declares requireTeamMember as its own function with strict membership check', () => {
    // Find the requireTeamMember function definition
    const block = src.match(/export async function requireTeamMember[\s\S]*?^}/m)?.[0] ?? '';
    expect(block).toMatch(/await authenticate/);
    expect(block).toMatch(/teamMember\.findUnique/);
    // Strict: deny if no membership AND not Administrator
    expect(block).toMatch(/\(request\.userRole as any\)\s*!==\s*['"]Administrator['"]/);
  });

  it('requireTeamAccess still exists for backward-compatibility non-stealth reads', () => {
    expect(src).toMatch(/export async function requireTeamAccess/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/require-team-member.test.ts
```
Expected: FAIL (current code aliases `requireTeamMember` to `requireTeamAccess`).

### Step 3: Add strict `requireTeamMember` function

In `server/middleware/authHooks.ts`, replace lines 105-109 (the `@deprecated` alias) with a real function:

```ts
/**
 * Strict team membership hook.
 * Denies non-members for BOTH stealth and non-stealth teams.
 * Administrators always bypass.
 *
 * Use this for state-changing operations (PATCH, DELETE) on team resources.
 * Use requireTeamAccess for read operations where non-stealth visibility applies.
 */
export async function requireTeamMember(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  const { prisma } = request.server as any;
  const params = request.params as any;
  const body = request.body as any;
  const teamId = params.teamId || params.id || (body && body.teamId);

  if (!teamId) {
    return reply.code(400).send({ error: 'Team ID is required' });
  }

  if ((request.userRole as any) === 'Administrator') {
    return;
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: request.userId } }
  });

  if (!membership) {
    return reply.code(403).send({ error: 'Forbidden: Team membership required' });
  }
}
```

Keep `requireTeamAccess` intact for read routes that still use it.

### Step 4: Audit callers

```bash
grep -rn "requireTeamMember" server/routes/
```

For each caller, decide: should it use strict `requireTeamMember` (state-changing) or permissive `requireTeamAccess` (read)?

- `teams.fastify.ts` PATCH/PUT/DELETE → use strict
- `teams.fastify.ts` GET → use permissive

If any route currently uses `requireTeamMember` for reads, leave it — the new strict version may break legitimate flows. Flag in the commit message if so.

### Step 5: Run test

```bash
npx vitest run tests/audit/require-team-member.test.ts
```
Expected: PASS.

### Step 6: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep -v node_modules | grep authHooks | tail -5
```

### Step 7: Commit

```bash
git add server/middleware/authHooks.ts tests/audit/require-team-member.test.ts
git commit -m "fix(middleware): make requireTeamMember strict, separate from requireTeamAccess"
```

---

## Task 4: Add team-membership checks to GET `/issues` and `/projects`

**Files:**
- Modify: `server/routes/issues.fastify.ts:13` (GET `/`)
- Modify: `server/routes/projects.fastify.ts:78` (GET `/`)
- Test: `tests/audit/get-route-membership.test.ts`

### Step 1: Write failing test

Create `tests/audit/get-route-membership.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const issuesSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/issues.fastify.ts'),
  'utf8'
);
const projectsSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/projects.fastify.ts'),
  'utf8'
);

describe('GET /issues membership gate', () => {
  it('declares an onRequest hook that checks team membership', () => {
    const block = issuesSrc.match(/fastify\.get\('\/'[\s\S]*?\n  \}\);/m)?.[0] ?? '';
    expect(block).toMatch(/onRequest:\s*\[/);
    // Hook must reference teamMember, requireIssueTeamMember, or requireTeamAccess
    expect(block).toMatch(/teamMember|requireIssueTeamMember|requireTeamAccess|requireTeamMember/);
  });
});

describe('GET /projects membership gate', () => {
  it('declares an onRequest hook that checks team membership', () => {
    const block = projectsSrc.match(/fastify\.get\('\/'[\s\S]*?\n  \}\);/m)?.[0] ?? '';
    expect(block).toMatch(/onRequest:\s*\[/);
    expect(block).toMatch(/teamMember|requireProjectMember|requireTeamAccess|requireTeamMember/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/get-route-membership.test.ts
```
Expected: FAIL on one or both.

### Step 3: Add hooks to GET routes

Read the current `GET /` in both files. The issues route filters by query params but has no auth hook beyond what was there. Add an inline hook that filters results to teams the user belongs to (or is Administrator).

For `server/routes/issues.fastify.ts:13` (GET `/`):

```ts
fastify.get('/', {
  onRequest: [authenticate],
  schema: {
    querystring: z.object({
      projectId: z.string().optional(),
      teamId: z.string().optional(),
      status: z.string().optional(),
      assigneeId: z.string().optional()
    })
  }
}, async (request: any, reply: any) => {
  const userId = request.userId;
  const userRole = request.userRole;
  const { projectId, teamId } = request.query;
  const prisma = fastify.prisma;

  // Resolve which teamIds the caller may see
  let visibleTeamIds: string[] | null = null;
  if (userRole !== 'Administrator') {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true }
    });
    visibleTeamIds = memberships.map((m: any) => m.teamId);

    // If a specific teamId was requested and caller can't see it, return empty
    if (teamId && !visibleTeamIds.includes(teamId)) {
      return { issues: [] };
    }
  }

  // ... existing where-clause logic, ANDed with teamId filter from visibleTeamIds
  // (Leave the existing filter logic; just add the visibility constraint.)
});
```

Apply analogous change to `server/routes/projects.fastify.ts:78` (GET `/`).

If the existing handler already filters by `teamId` from the query string, this is an additive change — the route now scopes to the intersection of (user's visible teams, requested teamId).

### Step 4: Run test

```bash
npx vitest run tests/audit/get-route-membership.test.ts
```
Expected: PASS.

### Step 5: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep -E "issues\.fastify|projects\.fastify" | tail -10
```

### Step 6: Commit

```bash
git add server/routes/issues.fastify.ts server/routes/projects.fastify.ts tests/audit/get-route-membership.test.ts
git commit -m "fix(api): scope GET /issues and /projects to teams the caller can see"
```

---

## Task 5: Add Administrator bypass to WebSocket membership gate

**Files:**
- Modify: `server/websocket/fastifyWebSocketRoutes.ts:272-280` (issue handler)
- Modify: `server/websocket/fastifyWebSocketRoutes.ts:367-375` (project handler)
- Test: extend `tests/audit/ws-membership.test.ts`

### Step 1: Read current state

```bash
sed -n '250,290p' server/websocket/fastifyWebSocketRoutes.ts
sed -n '350,380p' server/websocket/fastifyWebSocketRoutes.ts
```

The handlers check `issue.project.team?.isStealth` → if stealth, require `teamMember.findUnique`. No bypass for `userRole === 'Administrator'`.

### Step 2: Patch issue handler

In `/ws/issue/:issueId` (around line 272), wrap the membership check:

```ts
const teamId = issue.project.teamId;
const isStealth = issue.project.team?.isStealth;

if (isStealth && ws.userRole !== 'Administrator') {
  const membership = await fastify.prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: ws.userId } }
  });
  if (!membership) {
    ws.close(1008, 'Not authorized for this workspace');
    return;
  }
}
```

### Step 3: Patch project handler

In `/ws/project/:projectId` (around line 367), same pattern:

```ts
if (project.team?.isStealth && ws.userRole !== 'Administrator') {
  const membership = await fastify.prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: project.teamId, userId: ws.userId } }
  });
  if (!membership) {
    ws.close(1008, 'Not authorized for this workspace');
    return;
  }
}
```

### Step 4: Extend the existing test

Open `tests/audit/ws-membership.test.ts`. Add a case at the end of the `describe('WebSocket team-membership gate', ...)` block:

```ts
it('both handlers bypass the membership check for Administrators', () => {
  const issueBlock = extractHandler('/ws/issue/:issueId');
  const projectBlock = extractHandler('/ws/project/:projectId');
  // Both must short-circuit when ws.userRole === 'Administrator'
  expect(issueBlock).toMatch(/ws\.userRole\s*!==\s*['"]Administrator['"]/);
  expect(projectBlock).toMatch(/ws\.userRole\s*!==\s*['"]Administrator['"]/);
});
```

### Step 5: Run test

```bash
npx vitest run tests/audit/ws-membership.test.ts
```
Expected: all tests pass (existing + new).

### Step 6: Commit

```bash
git add server/websocket/fastifyWebSocketRoutes.ts tests/audit/ws-membership.test.ts
git commit -m "fix(ws): bypass team membership check for Administrators"
```

---

## Task 6: Escape CSV-injection characters in export

**Files:**
- Modify: `server/routes/export.fastify.ts:80-86` (issues CSV)
- Modify: `server/routes/export.fastify.ts:144-150` (projects CSV)
- Modify: `server/routes/export.fastify.ts:180-186` (users CSV)
- Test: `tests/audit/csv-injection.test.ts`

### Step 1: Write failing test

Create `tests/audit/csv-injection.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

// Mirror the escape function we expect the export route to use.
// Once the route exports it, switch this test to import the real function.
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Prefix cells that start with formula characters to prevent Excel/Sheets execution
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

describe('CSV injection escape', () => {
  it('prefixes cells starting with =', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
  });

  it('prefixes cells starting with +', () => {
    expect(escapeCsvCell('+1+1')).toBe("'+1+1");
  });

  it('prefixes cells starting with -', () => {
    expect(escapeCsvCell('-1-1')).toBe("'-1-1");
  });

  it('prefixes cells starting with @', () => {
    expect(escapeCell('@staticmethod')).toBe("'@staticmethod");
  });

  it('leaves normal text alone', () => {
    expect(escapeCsvCell('hello world')).toBe('hello world');
  });

  it('leaves numbers alone', () => {
    expect(escapeCsvCell(42)).toBe('42');
  });

  it('handles null and undefined', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });
});

// Remove this once the production escape is importable; here we verify the route
// references escape logic that matches the spec.
describe('export route uses escape', () => {
  it('issues CSV builder calls escapeCsvCell on user-controlled fields', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../server/routes/export.fastify.ts'),
      'utf8'
    );
    // Must declare or import an escape function
    expect(src).toMatch(/escapeCsvCell|escapeCsv|sanitizeCsvCell/);
    // Must call it on title, description, name, and email fields
    expect(src).toMatch(/escapeCsvCell\([^)]*title/);
    expect(src).toMatch(/escapeCsvCell\([^)]*description/);
    expect(src).toMatch(/escapeCsvCell\([^)]*name/);
    expect(src).toMatch(/escapeCsvCell\([^)]*email/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/csv-injection.test.ts
```
Expected: FAIL on the second describe block (no escape function exists in the route yet). Note: the test file has a typo `escapeCell` instead of `escapeCsvCell` in one assertion — fix it before saving.

### Step 3: Add escape helper and apply to CSV cells

At the top of `server/routes/export.fastify.ts`, after the imports, add:

```ts
/**
 * Prefix dangerous characters to prevent CSV/formula injection when the
 * exported file is opened in Excel or Google Sheets.
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
```

Then update each CSV builder. In the issues CSV (lines 78-86):

```ts
const csvRows = exportData.map((issue: any) => [
  escapeCsvCell(issue.identifier),
  `"${escapeCsvCell(issue.title).replace(/"/g, '""')}"`,
  `"${escapeCsvCell(issue.description || '').replace(/"/g, '""')}"`,
  escapeCsvCell(issue.status),
  escapeCsvCell(issue.priority),
  escapeCsvCell(issue.project_id),
  `"${escapeCsvCell(issue.assignees.map((a: any) => a.email).join(', ')).replace(/"/g, '""')}"`
]);
```

Apply analogous change to the projects CSV (lines 144-150) and users CSV (lines 180-186).

### Step 4: Run test

```bash
npx vitest run tests/audit/csv-injection.test.ts
```
Expected: PASS.

### Step 5: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep export.fastify | tail -5
```

### Step 6: Commit

```bash
git add server/routes/export.fastify.ts tests/audit/csv-injection.test.ts
git commit -m "fix(export): escape CSV injection characters in user-controlled fields"
```

---

## Task 7: Enable Helmet CSP in production

**Files:**
- Modify: `server/index.ts:60-72`
- Test: `tests/audit/csp-config.test.ts`

### Step 1: Write failing test

Create `tests/audit/csp-config.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/index.ts'),
  'utf8'
);

describe('Helmet CSP production config', () => {
  it('does NOT set contentSecurityPolicy: false in production branch', () => {
    // The current code does `isDevelopment ? {...} : false` — flag the `: false`
    expect(src).not.toMatch(/contentSecurityPolicy:\s*isDevelopment\s*\?[^:]+:\s*false/);
  });

  it('declares CSP directives that apply in both dev and prod', () => {
    // Pull the securityPlugin block
    const block = src.match(/async function securityPlugin[\s\S]*?^\}/m)?.[0] ?? '';
    expect(block).toMatch(/defaultSrc/);
    expect(block).toMatch(/scriptSrc/);
    expect(block).toMatch(/frameSrc/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/csp-config.test.ts
```
Expected: FAIL on the first test.

### Step 3: Patch Helmet config

In `server/index.ts`, extract the CSP directives into a constant above `securityPlugin`, then reference it in both branches:

```ts
const cspDirectives = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires unsafe-inline
  scriptSrc: ["'self'"],
  imgSrc: ["'self'", 'data:', 'https://picsum.photos', 'https://ui-avatars.com'],
  connectSrc: ["'self'",
    'http://localhost:3001', 'http://localhost:3000',
    'ws://localhost:3001',
    // Production frontend origin(s) — read from FRONTEND_URL so WebSocket and
    // API requests from the deployed UI are allowed.
    ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])
  ],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"]
};

async function securityPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: { directives: cspDirectives },
    hsts: isDevelopment ? false : {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true
    }
  });
}
```

This removes the `: false` branch entirely so production uses the same CSP as dev. `FRONTEND_URL` is already an env var used in CORS config.

### Step 4: Run test

```bash
npx vitest run tests/audit/csp-config.test.ts
```
Expected: PASS.

### Step 5: Commit

```bash
git add server/index.ts tests/audit/csp-config.test.ts
git commit -m "fix(security): enable Helmet CSP in production instead of relying on nginx"
```

---

## Task 8: Redact email in accountLockout log

**Files:**
- Modify: `server/middleware/accountLockout.ts:77`
- Test: `tests/audit/lockout-pii.test.ts`

### Step 1: Write failing test

Create `tests/audit/lockout-pii.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/middleware/accountLockout.ts'),
  'utf8'
);

describe('accountLockout PII redaction', () => {
  it('does not log the raw email', () => {
    // Find the lockout warning line
    expect(src).not.toMatch(/console\.warn\(`?🔒 Account locked for email: \$\{email\}/);
  });

  it('logs a redacted or hashed identifier', () => {
    const match = src.match(/console\.warn\([^)]+\)/g) ?? [];
    const lockLine = match.find(m => m.includes('locked')) ?? '';
    // Expect a redaction strategy: either hash, prefix-only, or no identifier
    expect(lockLine).toMatch(/hash|redact|prefix|\${.*\.slice|account locked/i);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/lockout-pii.test.ts
```
Expected: FAIL.

### Step 3: Patch the log line

In `server/middleware/accountLockout.ts:77`, replace:

```ts
console.warn(`🔒 Account locked for email: ${email} due to too many failed attempts`);
```

with:

```ts
// Redact: log only a short prefix + length so we can correlate without exposing PII
const redactedId = email.split('@')[0]?.slice(0, 2) + '**' + ` (${email.length} chars)`;
console.warn(`🔒 Account locked for ${redactedId} due to too many failed attempts`);
```

Alternative: use `crypto.createHash('sha256').update(email).digest('hex').slice(0, 8)` if you prefer a stable correlation ID.

### Step 4: Run test

```bash
npx vitest run tests/audit/lockout-pii.test.ts
```
Expected: PASS.

### Step 5: Commit

```bash
git add server/middleware/accountLockout.ts tests/audit/lockout-pii.test.ts
git commit -m "fix(security): redact email in accountLockout warning log"
```

---

## Task 9: Delete `fastifyWebSocketServer.ts`

**Files:**
- Delete: `server/websocket/fastifyWebSocketServer.ts`

### Step 1: Confirm zero importers

```bash
grep -rn "fastifyWebSocketServer" server/ services/ hooks/ 2>&1
```
Expected: zero matches.

### Step 2: Delete

```bash
git rm server/websocket/fastifyWebSocketServer.ts
```

### Step 3: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep -v node_modules | tail -10
```
Expected: no new errors.

### Step 4: Run audit suite to confirm nothing depended on it

```bash
npx vitest run tests/audit/
```
Expected: same pass count as before.

### Step 5: Commit

```bash
git commit -m "chore(ws): remove dead fastifyWebSocketServer.ts module"
```

---

## Task 10: Use scoped activity key in `useActivityFeed`

**Files:**
- Modify: `services/useActivityFeed.ts:71`

### Step 1: Read current state

```bash
sed -n '67,75p' services/useActivityFeed.ts
```

The hook currently uses `queryKey: ['activity']`. The scoped key is `activityKeys.all(currentTeamId)` per `services/queryKeys.ts:87`.

### Step 2: Patch the hook

```ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Comment, Notification } from '../types';
import { activityKeys } from './queryKeys';
import { useUIStore } from '../stores/uiStore';

// ... existing mergeAndSort function unchanged ...

export function useActivityFeed() {
  const queryClient = useQueryClient();
  const currentTeamId = useUIStore(state => state.currentTeamId);

  return useQuery({
    queryKey: currentTeamId ? activityKeys.all(currentTeamId) : ['activity', 'no-team'],
    queryFn: () => {
      // ... existing queryFn unchanged ...
    },
    enabled: !!currentTeamId
  });
}
```

The `['activity', 'no-team']` fallback covers the case where the hook is rendered before a team is selected — the query is disabled in that case anyway.

### Step 3: Typecheck

```bash
npm run typecheck 2>&1 | grep useActivityFeed | tail -5
```

### Step 4: Commit

```bash
git add services/useActivityFeed.ts
git commit -m "fix(ui): scope activity feed query to current team"
```

---

## Task 11: Strip `/auth/refresh` debug logs

**Files:**
- Modify: `server/routes/auth.fastify.ts:157-204`

### Step 1: Write failing test

Create `tests/audit/refresh-no-logs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
  'utf8'
);

describe('/auth/refresh debug log strip', () => {
  it('refresh handler contains zero console.log statements', () => {
    const startIdx = src.indexOf(`fastify.post('/refresh'`);
    expect(startIdx).toBeGreaterThan(-1);
    const after = src.slice(startIdx);
    const next = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
    const block = after.slice(0, next ? next.index : after.length);
    expect(block).not.toMatch(/console\.log/);
  });

  it('keeps structured fastify.log.error for genuine error path', () => {
    const startIdx = src.indexOf(`fastify.post('/refresh'`);
    const after = src.slice(startIdx);
    const next = after.match(/\n\s*fastify\.(post|get|put|patch|delete)\(/);
    const block = after.slice(0, next ? next.index : after.length);
    expect(block).toMatch(/fastify\.log\.error/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/refresh-no-logs.test.ts
```
Expected: FAIL (current handler has 13 console.log lines).

### Step 3: Strip console.log lines

Open `server/routes/auth.fastify.ts` and remove every `console.log(...)` line inside the `/refresh` handler (lines 162, 164, 167, 172, 174, 176, 180, 183, 188, 191, 195, 197, 200). Keep the `fastify.log.error({ err }, 'Refresh token error')` line in the catch block.

The cleaned handler:

```ts
fastify.post('/refresh', {
  schema: {
    body: z.object({})
  }
}, async (request: any, reply: any) => {
  const refreshToken = request.cookies['refreshToken'];

  if (!refreshToken) {
    return reply.code(401).send({ error: 'Refresh token not found' });
  }

  try {
    const decoded = fastify.jwt.verify(refreshToken) as any;

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return reply.code(401).send({ error: 'User not found' });
    }

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    return sendAuthResponse(reply, user);
  } catch (err) {
    fastify.log.error({ err }, 'Refresh token error');
    return reply.code(401).send({ error: 'Invalid or expired refresh token' });
  }
});
```

### Step 4: Run test

```bash
npx vitest run tests/audit/refresh-no-logs.test.ts
```
Expected: PASS.

### Step 5: Commit

```bash
git add server/routes/auth.fastify.ts tests/audit/refresh-no-logs.test.ts
git commit -m "fix(auth): strip debug console.log from /auth/refresh handler"
```

---

## Task 12: Add `.unref()` to accountLockout cleanup interval

**Files:**
- Modify: `server/middleware/accountLockout.ts:28`
- Test: extend `tests/audit/lockout.test.ts`

### Step 1: Read current state

```bash
sed -n '26,30p' server/middleware/accountLockout.ts
```

Currently: `setInterval(cleanupOldRecords, 5 * 60 * 1000);`

### Step 2: Patch

```ts
const lockoutCleanupInterval = setInterval(cleanupOldRecords, 5 * 60 * 1000);
lockoutCleanupInterval.unref();
```

### Step 3: Extend lockout test

Open `tests/audit/lockout.test.ts`. Add a case at the end of the existing describe block:

```ts
it('cleanup interval is unrefed so process can exit cleanly', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../server/middleware/accountLockout.ts'),
    'utf8'
  );
  expect(src).toMatch(/\.unref\(\)/);
});
```

### Step 4: Run test

```bash
npx vitest run tests/audit/lockout.test.ts
```
Expected: PASS.

### Step 5: Commit

```bash
git add server/middleware/accountLockout.ts tests/audit/lockout.test.ts
git commit -m "fix(security): unref accountLockout cleanup interval for clean shutdown"
```

---

## Final verification

After all 12 commits land:

```bash
npm run typecheck
npm run lint
npx vitest run tests/audit/
```

Manual smoke test:

1. Register with `Alice@Example.COM`, log in with `alice@example.com` — both work.
2. TeamLead tries to demote Administrator via PATCH `/api/v1/users/:id/role` → 403.
3. TeamLead tries to PATCH a non-stealth team they're not in → 403.
4. Member of Team A queries GET `/issues?teamId=team-b-id` → empty list (no error).
5. Administrator subscribes to `/ws/issue/<stealth-team-issue-id>` → succeeds.
6. Export issues as CSV, open in Excel — formula-prefixed cells show as text.
7. `curl -I https://production-app/` — `Content-Security-Policy` header present.
8. Trigger 5 failed logins, grep logs — no raw email in warning.
9. `require('./server/websocket/fastifyWebSocketServer.js')` → ENOENT (file deleted).
10. Switch teams in UI — activity feed refreshes per team.
11. Trigger `/auth/refresh` — server logs show no `[auth.refresh]` lines.
12. `kill -SIGTERM` the server process — exits immediately (no `setInterval` keeping it alive).

---

## Sequencing recap

- **One PR, 12 commits, 11 new test files + 2 extended.**
- Each task is independently revertible.
- Tests run on Vitest (config at `vitest.config.ts`); server deps must be installed at `server/node_modules/`.
- Run `cd server && npm install` once before starting if not already installed.

---

## Out of scope (intentionally deferred)

- Email casing migration script (`UPDATE users SET email = LOWER(email)`) — operations task, document in ship notes.
- `useActivityFeed.ts` may need to invalidate on team switch — verify in smoke test; if needed, follow-up.
- WebSocket route that exposes a non-stealth read of a stealth team's issue via REST — pair with Task 4 audit.
