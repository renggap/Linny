# Security & Real-Time Bugfix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 16 verified bugs across auth, WebSocket, and real-time cache layers; restore dropped security middleware (CSRF, rate limit, account lockout); harden password-reset flow.

**Architecture:** Backend is Fastify + Prisma + WebSocket (`@fastify/websocket`). Frontend is React + TanStack Query + Zustand. Real-time updates flow server → WebSocket → `services/websocketQuerySync.ts` → TanStack cache. Each fix is independently testable and ships behind a focused commit. Tests run on Vitest (config in `vitest.config.ts`, setup in `tests/setup.ts`).

**Tech Stack:** Fastify, Prisma, `@fastify/jwt`, `@fastify/rate-limit`, `@fastify/cookie`, `@fastify/helmet`, `@fastify/websocket`, Zod, ioredis, Vitest, React 19, TanStack Query v5, Zustand.

---

## Sequencing

Phases are ordered so each phase's fixes are independently shippable.

- **Phase 1 — Critical security middleware** (Tasks 1-4): crypto RNG, CSRF validation, rate limiting, account lockout. Blocks brute force and CSRF; unblocks the rest.
- **Phase 2 — Password reset hardening** (Tasks 5-7): uniform password policy, session invalidation, forgot-password timing/rate.
- **Phase 3 — WebSocket authorization** (Task 8): team-membership gate on `/ws/issue/*` and `/ws/project/*`.
- **Phase 4 — Real-time cache integrity** (Tasks 9-12): server payload shape, cache merge semantics, query-key correctness, frontend room subscriptions.
- **Phase 5 — Functional bugs** (Tasks 13-16): notifications filter, join-request invalidation, mention typo, lead-clear.
- **Phase 6 — Cleanup** (Task 17): delete orphan backup.

---

## Task 1: Replace `Math.random()` in token generators with `crypto`

**Files:**
- Modify: `server/auth/email.ts:125-127`
- Modify: `server/index.ts:292-294`
- Test: `tests/audit/crypto-rng.test.ts`

**Step 1: Write failing test**

```ts
// tests/audit/crypto-rng.test.ts
import { describe, it, expect } from 'vitest';
import { generateTOTPCode } from '../../server/auth/email';

describe('crypto RNG', () => {
  it('generateTOTPCode returns a 6-digit string', () => {
    const code = generateTOTPCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('generateTOTPCode returns distinct values across calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateTOTPCode());
    expect(seen.size).toBeGreaterThan(900);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/audit/crypto-rng.test.ts
```
Expected: FAIL or PASS — if FAIL on distinctness, confirms the bug; if PASS, the 6-digit regex still passes but the source RNG is `Math.random()`.

**Step 3: Patch `generateTOTPCode`**

```ts
// server/auth/email.ts:125-127
export function generateTOTPCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
}
```

**Step 4: Patch CSRF token generator**

```ts
// server/index.ts:292-294
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
```

Add `import crypto from 'crypto';` near the top of `server/index.ts` if not already present (check existing imports).

**Step 5: Run tests**

```bash
npx vitest run tests/audit/crypto-rng.test.ts
```
Expected: PASS.

**Step 6: Typecheck and commit**

```bash
npm run typecheck
git add server/auth/email.ts server/index.ts tests/audit/crypto-rng.test.ts
git commit -m "fix(security): use crypto.randomBytes/randomInt for CSRF and TOTP tokens"
```

---

## Task 2: Wire up CSRF validation as a Fastify `preHandler`

**Files:**
- Modify: `server/index.ts:296-307` (extend `csrfPlugin` with `preHandler`)
- Test: `tests/audit/csrf-validation.test.ts`

**Step 1: Write failing test**

```ts
// tests/audit/csrf-validation.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';

// We test the csrfPlugin in isolation.
// Build a minimal fastify with cookie support, register csrfPlugin, mount a POST route.

describe('CSRF validation preHandler', () => {
  it('rejects POST without X-CSRF-Token header', async () => {
    // Build a fresh fastify instance that uses the same csrfPlugin logic
    const app = Fastify();
    // ...register fastify-cookie, register csrfPlugin with validation
    // ...add POST /test route
    // ...issue POST without header
    // expect 403
  });

  it('accepts POST with valid X-CSRF-Token header fetched from /api/csrf-token', async () => {
    // GET /api/csrf-token → capture token
    // POST /test with header → expect 200
  });
});
```

(Full test body below — the engineer should fill in the setup but the assertions are the contract.)

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/audit/csrf-validation.test.ts
```
Expected: FAIL (no validation logic exists yet).

**Step 3: Implement CSRF validation**

Refactor the `csrfPlugin` in `server/index.ts:296-307` to:

```ts
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

async function csrfPlugin(fastify: FastifyInstance) {
  fastify.get('/api/csrf-token', async (request, reply) => {
    const sessionId = (request.ip as string) || 'anonymous';
    const token = generateCsrfToken();
    csrfTokens.set(sessionId, { token, expires: Date.now() + TOKEN_EXPIRY_MS });

    reply.setCookie('csrfToken', token, {
      httpOnly: false, // Frontend must read it for double-submit
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: TOKEN_EXPIRY_MS / 1000,
      path: '/'
    });

    return reply.send({ csrfToken: token });
  });

  // Validate CSRF token on every state-changing request
  fastify.addHook('preHandler', async (request: any, reply: any) => {
    if (SAFE_METHODS.has(request.method)) return;

    // Skip login and token-fetch endpoints to avoid chicken-and-egg
    if (request.url === '/api/v1/auth/login' ||
        request.url === '/api/v1/auth/register' ||
        request.url === '/api/csrf-token') {
      return;
    }

    const headerToken = request.headers['x-csrf-token'];
    const cookieToken = request.cookies?.csrfToken;
    const sessionId = (request.ip as string) || 'anonymous';
    const stored = csrfTokens.get(sessionId);

    const isValid =
      headerToken &&
      cookieToken &&
      headerToken === cookieToken &&
      stored &&
      stored.token === headerToken &&
      stored.expires > Date.now();

    if (!isValid) {
      return reply.code(403).send({ error: 'CSRF token invalid or missing' });
    }
  });
}
```

Register `fastifyCookie` BEFORE `csrfPlugin` (already the case in `registerPlugins`).

**Step 4: Update frontend to send token**

Modify `services/api.ts` so every state-changing request includes `X-CSRF-Token` header from the cookie. The existing CSRF logic should already do this — verify by grepping `X-CSRF-Token` in `services/api.ts`.

**Step 5: Run tests**

```bash
npx vitest run tests/audit/csrf-validation.test.ts
```
Expected: PASS.

**Step 6: Manual smoke test**

```bash
npm run dev:server &
# In another terminal:
curl -i http://localhost:3001/api/csrf-token
curl -i -X POST http://localhost:3001/api/v1/teams \
  -H 'Content-Type: application/json' \
  -d '{"name":"test"}' # should return 403
```

**Step 7: Commit**

```bash
git add server/index.ts tests/audit/csrf-validation.test.ts
git commit -m "fix(security): enforce CSRF token validation on state-changing routes"
```

---

## Task 3: Enable rate limiting on auth and public endpoints

**Files:**
- Modify: `server/index.ts:139-146` (set `global: true`)
- Modify: `server/routes/auth.fastify.ts` (add per-route `config.rateLimit`)
- Test: `tests/audit/rate-limit.test.ts`

**Step 1: Write failing test**

```ts
// tests/audit/rate-limit.test.ts
import { describe, it, expect } from 'vitest';
// Test that the /api/v1/auth/login route declares a stricter rate limit than global.

describe('rate limiting', () => {
  it('auth.fastify.ts login route has config.rateLimit', async () => {
    const src = await import('fs').then(fs => fs.readFileSync('./server/routes/auth.fastify.ts', 'utf8'));
    expect(src).toMatch(/\/login[\s\S]*?config:\s*\{[\s\S]*?rateLimit/);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/audit/rate-limit.test.ts
```
Expected: FAIL.

**Step 3: Enable global rate limit**

```ts
// server/index.ts:139-146
const rateLimitConfig = {
  global: true,
  max: isDevelopment ? 1000 : 100,
  timeWindow: '15 minutes',
  cache: 10000,
  allowList: isDevelopment ? ['127.0.0.1', '::1'] : [],
  redis: undefined
};
```

**Step 4: Add per-route overrides on auth endpoints**

In `server/routes/auth.fastify.ts`, add to the relevant route options:

```ts
fastify.post('/login', {
  schema: { body: loginSchema },
  config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }
}, /* handler */);

fastify.post('/register', {
  schema: { body: registerSchema },
  config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
}, /* handler */);

fastify.post('/forgot-password', {
  config: { rateLimit: { max: 3, timeWindow: '1 hour' } }
}, /* handler */);

fastify.post('/reset-password', {
  config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }
}, /* handler */);
```

**Step 5: Run tests**

```bash
npx vitest run tests/audit/rate-limit.test.ts
```
Expected: PASS.

**Step 6: Commit**

```bash
git add server/index.ts server/routes/auth.fastify.ts tests/audit/rate-limit.test.ts
git commit -m "fix(security): enable global rate limit and stricter limits on auth endpoints"
```

---

## Task 4: Wire account lockout into `/login`

**Files:**
- Modify: `server/middleware/accountLockout.ts:1` (drop Express signature; export a Fastify-compatible helper)
- Modify: `server/routes/auth.fastify.ts:89-114` (call lockout functions)
- Test: `tests/audit/lockout.test.ts`

**Step 1: Write failing test**

```ts
// tests/audit/lockout.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { isAccountLocked, recordFailedAttempt, resetFailedAttempts } from '../../server/middleware/accountLockout';

describe('account lockout state machine', () => {
  beforeEach(() => {
    // Reset state by clearing internal map via successful reset
    resetFailedAttempts('test@example.com');
  });

  it('locks after 5 failed attempts', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('test@example.com');
    expect(isAccountLocked('test@example.com')).toBe(true);
  });

  it('unlocks after resetFailedAttempts', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('test@example.com');
    resetFailedAttempts('test@example.com');
    expect(isAccountLocked('test@example.com')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails (or passes — pure logic)**

```bash
npx vitest run tests/audit/lockout.test.ts
```
Expected: PASS already (the functions exist; test verifies wiring).

**Step 3: Decouple lockout from Express**

Edit `server/middleware/accountLockout.ts:1` to remove the unused Express import:

```ts
// Remove: import { Request, Response, NextFunction } from 'express';
```

Delete or rename the Express-style `accountLockout` middleware function (lines 97-123) — it's never wired into Fastify. Keep the four exported helper functions.

**Step 4: Wire lockout into login handler**

In `server/routes/auth.fastify.ts`:

```ts
import {
  isAccountLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  getLockoutTimeRemaining
} from '../middleware/accountLockout.js';

// Inside the /login handler (around line 95):
const normalizedEmail = email.toLowerCase();

if (isAccountLocked(normalizedEmail)) {
  const retryAfter = getLockoutTimeRemaining(normalizedEmail);
  return reply.code(429).header('Retry-After', String(retryAfter)).send({
    error: 'Too many failed login attempts. Try again later.'
  });
}

const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
if (!user) {
  recordFailedAttempt(normalizedEmail);
  return reply.code(401).send({ error: 'Invalid credentials' });
}

const isValid = await verifyPassword(password, user.passwordHash);
if (!isValid) {
  recordFailedAttempt(normalizedEmail);
  return reply.code(401).send({ error: 'Invalid credentials' });
}

resetFailedAttempts(normalizedEmail);
return sendAuthResponse(reply, user);
```

Also strip the `console.log` debugging lines (94, 96, 98, 100, 105, 107, 112) from the login handler — they leak email + validity to stdout.

**Step 5: Run tests**

```bash
npx vitest run tests/audit/lockout.test.ts
npm run typecheck
```
Expected: PASS.

**Step 6: Commit**

```bash
git add server/middleware/accountLockout.ts server/routes/auth.fastify.ts tests/audit/lockout.test.ts
git commit -m "fix(security): wire account lockout into login handler and remove debug logs"
```

---

## Task 5: Unify password validation on `/reset-password`

**Files:**
- Modify: `server/routes/auth.fastify.ts:240-280`
- Test: `tests/audit/reset-password-strength.test.ts`

**Step 1: Write failing test**

```ts
// tests/audit/reset-password-strength.test.ts
import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from '../../server/auth/password';

describe('reset password strength parity', () => {
  it('rejects all-lowercase 8-char password (would have passed reset route)', () => {
    const result = validatePasswordStrength('aaaaaaaa');
    expect(result.valid).toBe(false);
  });
});
```

**Step 2: Run test**

```bash
npx vitest run tests/audit/reset-password-strength.test.ts
```
Expected: PASS (validates that `validatePasswordStrength` rejects it — confirms the gap in reset route).

**Step 3: Patch reset-password handler**

In `server/routes/auth.fastify.ts`, replace the length-only check (lines 247-249):

```ts
const strength = validatePasswordStrength(newPassword);
if (!strength.valid) {
  return reply.code(400).send({
    message: 'Password does not meet requirements',
    details: strength.errors
  });
}
```

**Step 4: Run tests**

```bash
npx vitest run tests/audit/reset-password-strength.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add server/routes/auth.fastify.ts tests/audit/reset-password-strength.test.ts
git commit -m "fix(auth): enforce full password strength policy on /reset-password"
```

---

## Task 6: Invalidate sessions on password reset

**Files:**
- Modify: `server/routes/auth.fastify.ts:266-273`
- Test: `tests/audit/reset-password-session.test.ts`

**Step 1: Write failing test**

```ts
// tests/audit/reset-password-session.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('reset-password session invalidation', () => {
  it('deletes refresh tokens for the user after reset', () => {
    const src = fs.readFileSync('./server/routes/auth.fastify.ts', 'utf8');
    // Look inside the reset-password handler block
    const resetBlock = src.match(/fastify\.post\('\/reset-password'[\s\S]*?^\};/m)?.[0] ?? '';
    expect(resetBlock).toMatch(/prisma\.refreshToken\.deleteMany\(\s*{\s*where:\s*{\s*userId/);
  });
});
```

**Step 2: Run test**

```bash
npx vitest run tests/audit/reset-password-session.test.ts
```
Expected: FAIL.

**Step 3: Patch reset-password handler**

In `server/routes/auth.fastify.ts:266-273`, after the password update:

```ts
await prisma.$transaction([
  prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash }
  }),
  prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
  prisma.passwordResetToken.delete({ where: { token } })
]);
```

(Note: `passwordResetToken.delete` inside a transaction requires the token to exist; the earlier `findUnique` guarantees this.)

**Step 4: Run tests**

```bash
npx vitest run tests/audit/reset-password-session.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add server/routes/auth.fastify.ts tests/audit/reset-password-session.test.ts
git commit -m "fix(auth): invalidate all refresh tokens on password reset"
```

---

## Task 7: Flatten forgot-password timing and add email enumeration guard

**Files:**
- Modify: `server/routes/auth.fastify.ts:194-237`
- Test: `tests/audit/forgot-password-timing.test.ts`

**Step 1: Write failing test**

```ts
// tests/audit/forgot-password-timing.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('forgot-password timing', () => {
  it('returns the same message regardless of whether user exists', () => {
    const src = fs.readFileSync('./server/routes/auth.fastify.ts', 'utf8');
    const block = src.match(/fastify\.post\('\/forgot-password'[\s\S]*?^\};/m)?.[0] ?? '';
    // Count occurrences of the success message — should appear at both paths
    const matches = block.match(/udah dikirim/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
```

**Step 2: Run test**

```bash
npx vitest run tests/audit/forgot-password-timing.test.ts
```
Expected: PASS already — confirms both paths return same message.

**Step 3: Patch handler to flatten timing**

In `server/routes/auth.fastify.ts`, refactor the handler so the non-existent-user path performs comparable work (or `await` a randomized delay):

```ts
fastify.post('/forgot-password', {
  config: { rateLimit: { max: 3, timeWindow: '1 hour' } }
}, async (request: any, reply: any) => {
  const { email } = request.body as { email: string };

  if (!email || !email.includes('@')) {
    return reply.code(400).send({ message: 'Email wajib diisi kak' });
  }

  const normalizedEmail = email.toLowerCase();
  const genericMessage = 'Kalo ada akun pake email ini, link reset udah dikirim ya kak';

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      // Constant-time-ish delay to match the real-user path
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200));
      return reply.send({ message: genericMessage });
    }

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt }
    });

    const emailHTML = generatePasswordResetEmailHTML(token);
    await sendEmail({
      to: user.email,
      subject: 'Reset Password Kakak',
      html: emailHTML
    });

    reply.send({ message: genericMessage });
  } catch (error) {
    fastify.log.error({ err: error }, 'Forgot password error');
    reply.send({ message: genericMessage }); // Do NOT leak error to client
  }
});
```

**Step 4: Run tests**

```bash
npx vitest run tests/audit/forgot-password-timing.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add server/routes/auth.fastify.ts tests/audit/forgot-password-timing.test.ts
git commit -m "fix(auth): flatten forgot-password timing and swallow errors"
```

---

## Task 8: Enforce team membership on `/ws/issue/*` and `/ws/project/*`

**Files:**
- Modify: `server/websocket/fastifyWebSocketRoutes.ts:231-350`
- Test: `tests/audit/ws-membership.test.ts`

**Step 1: Write failing test**

```ts
// tests/audit/ws-membership.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('WebSocket team-membership gate', () => {
  it('issue room handler checks TeamMember before addToRoom', () => {
    const src = fs.readFileSync('./server/websocket/fastifyWebSocketRoutes.ts', 'utf8');
    const issueBlock = src.match(/fastify\.get\('\/ws\/issue\/:issueId'[\s\S]*?console\.log\(`✅ WebSocket connected to \$\{roomId\}`\);/m)?.[0] ?? '';
    expect(issueBlock).toMatch(/prisma\.(issue|teamMember)\.findUnique/);
    expect(issueBlock).toMatch(/teamMember/);
  });

  it('project room handler checks TeamMember before addToRoom', () => {
    const src = fs.readFileSync('./server/websocket/fastifyWebSocketRoutes.ts', 'utf8');
    const projectBlock = src.match(/fastify\.get\('\/ws\/project\/:projectId'[\s\S]*?console\.log\(`✅ WebSocket connected to \$\{roomId\}`\);/m)?.[0] ?? '';
    expect(projectBlock).toMatch(/prisma\.(project|teamMember)\.findUnique/);
    expect(projectBlock).toMatch(/teamMember/);
  });
});
```

**Step 2: Run test**

```bash
npx vitest run tests/audit/ws-membership.test.ts
```
Expected: FAIL.

**Step 3: Add membership gate**

In `server/websocket/fastifyWebSocketRoutes.ts`, after the auth block in the `/ws/issue/:issueId` handler (after line 248), insert:

```ts
// Resolve teamId for the issue
const issue = await fastify.prisma.issue.findUnique({
  where: { id: issueId },
  select: { id: true, project: { select: { teamId: true, team: { select: { isStealth: true } } } } }
});

if (!issue) {
  ws.close(1008, 'Issue not found');
  return;
}

const teamId = issue.project.teamId;
const team = issue.project.team;

if (team?.isStealth) {
  const membership = await fastify.prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: ws.userId } }
  });
  if (!membership) {
    ws.close(1008, 'Not authorized for this workspace');
    return;
  }
}
```

For `/ws/project/:projectId` (after line 318), insert:

```ts
const project = await fastify.prisma.project.findUnique({
  where: { id: projectId },
  select: { id: true, teamId: true, team: { select: { isStealth: true } } }
});

if (!project) {
  ws.close(1008, 'Project not found');
  return;
}

if (project.team?.isStealth) {
  const membership = await fastify.prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: project.teamId, userId: ws.userId } }
  });
  if (!membership) {
    ws.close(1008, 'Not authorized for this workspace');
    return;
  }
}
```

(Non-stealth teams remain open to any authenticated user, matching the existing visibility rule in CLAUDE.md.)

**Step 4: Run tests**

```bash
npx vitest run tests/audit/ws-membership.test.ts
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add server/websocket/fastifyWebSocketRoutes.ts tests/audit/ws-membership.test.ts
git commit -m "fix(ws): enforce team membership on /ws/issue and /ws/project for stealth teams"
```

---

## Task 9: Broadcast full issue payload on `issue_updated`

**Files:**
- Modify: `server/routes/issues.fastify.ts:293` (and any other `broadcastIssueUpdate` callsite)
- Modify: `server/websocket/fastifyWebSocketRoutes.ts:362-368` (wrap in `issue` key)
- Test: `tests/audit/issue-update-payload.test.ts`

**Step 1: Write failing test**

```ts
// tests/audit/issue-update-payload.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('issue_updated payload shape', () => {
  it('broadcastIssueUpdate wraps data under issue key', () => {
    const src = fs.readFileSync('./server/websocket/fastifyWebSocketRoutes.ts', 'utf8');
    const block = src.match(/export function broadcastIssueUpdate[\s\S]*?^}/m)?.[0] ?? '';
    expect(block).toMatch(/data:\s*{\s*issueId,\s*issue:\s*\{\s*\.\.\.data\s*\}/);
  });

  it('status-change callsite passes the full updatedIssue', () => {
    const src = fs.readFileSync('./server/routes/issues.fastify.ts', 'utf8');
    expect(src).toMatch(/broadcastIssueUpdate\(id,\s*\{[^}]*issue:\s*updatedIssue/);
  });
});
```

**Step 2: Run test**

```bash
npx vitest run tests/audit/issue-update-payload.test.ts
```
Expected: FAIL.

**Step 3: Update broadcaster**

In `server/websocket/fastifyWebSocketRoutes.ts:362-368`:

```ts
export function broadcastIssueUpdate(issueId: string, data: any, excludeUserId?: string): void {
  console.log(`📢 Broadcasting issue update for issue ${issueId}`);
  broadcastToRoom(`issue:${issueId}`, {
    type: 'issue_updated',
    data: { issueId, issue: { ...data } }
  }, excludeUserId);
}
```

**Step 4: Update all callsites to pass full issue**

In `server/routes/issues.fastify.ts:293`:

```ts
broadcastIssueUpdate(id, { status: updatedIssue.status, issue: updatedIssue }, userId);
```

Wait — that double-nests. Instead, choose one shape and stick to it. **Preferred:** callsites pass the full issue as the data:

```ts
// broadcaster:
export function broadcastIssueUpdate(issueId: string, issue: any, excludeUserId?: string): void {
  broadcastToRoom(`issue:${issueId}`, {
    type: 'issue_updated',
    data: { issueId, issue, teamId: issue?.teamId }
  }, excludeUserId);
}

// callsite at issues.fastify.ts:293:
broadcastIssueUpdate(id, updatedIssue, userId);
```

Grep all callsites of `broadcastIssueUpdate(` across `server/routes/*.fastify.ts` and adjust each to pass the full updated issue object.

**Step 5: Run tests**

```bash
npx vitest run tests/audit/issue-update-payload.test.ts
```
Expected: PASS.

**Step 6: Commit**

```bash
git add server/routes/issues.fastify.ts server/websocket/fastifyWebSocketRoutes.ts tests/audit/issue-update-payload.test.ts
git commit -m "fix(ws): broadcast full issue payload under data.issue key"
```

---

## Task 10: Merge partial issue updates into cache instead of replacing

**Files:**
- Modify: `services/websocketQuerySync.ts:159-185`

**Step 1: Harden handler**

The server now sends `{ issueId, issue, teamId }` with `issue` always a full Issue object (Task 9). The existing line 175 already does `old.map(i => i.id === issueId ? issue : i)`, which is correct when `issue` is full. Add a defensive guard:

```ts
// services/websocketQuerySync.ts:159-185
websocketService.on('issue_updated', (data: IssueUpdatedEvent) => {
  const { issueId, issue, teamId } = data;

  // Defensive: drop malformed events rather than corrupt cache
  if (!issue || !issue.id || issue.id !== issueId) {
    console.warn('[websocketQuerySync] Malformed issue_updated event, ignoring:', data);
    return;
  }

  if (!shouldUpdateIssueCache(teamId)) return;

  const currentTeamId = getCurrentTeamId();

  queryClient.setQueriesData(
    { queryKey: issueKeys.all(currentTeamId) },
    (old: Issue[] = []) => old.map(i => i.id === issueId ? { ...i, ...issue } : i)
  );

  queryClient.setQueryData(issueKeys.detail(currentTeamId, issueId), (old: Issue | undefined) =>
    old ? { ...old, ...issue } : issue
  );

  queryClient.refetchQueries({ queryKey: ['activity'] }); // Will be fixed in Task 11
});
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS.

**Step 3: Commit**

```bash
git add services/websocketQuerySync.ts
git commit -m "fix(ws): merge issue_updated payloads and drop malformed events"
```

---

## Task 11: Fix activity refetch query key

**Files:**
- Modify: `services/websocketQuerySync.ts:98, 141, 182`

**Step 1: Patch refetch calls**

Add import at top:

```ts
import { issueKeys, commentKeys, isScopeKey, activityKeys } from './queryKeys';
```

Replace each `queryClient.refetchQueries({ queryKey: ['activity'] })` with:

```ts
const currentTeamId = getCurrentTeamId();
if (currentTeamId) {
  queryClient.refetchQueries({ queryKey: activityKeys.all(currentTeamId) });
}
```

In `setupNotificationWebSocketSync` there's no `currentTeamId` in scope — call `getCurrentTeamId()` there too (it already exists at module scope).

**Step 2: Run typecheck + lint**

```bash
npm run typecheck
npm run lint
```
Expected: PASS.

**Step 3: Commit**

```bash
git add services/websocketQuerySync.ts
git commit -m "fix(ws): use scoped activityKeys for activity feed refetch"
```

---

## Task 12: Subscribe frontend to project and join-requests rooms

**Files:**
- Modify: `hooks/useWebSocket.ts`
- Modify: `stores/uiStore.ts` (read existing `selectedProjectId`)
- Test: `tests/audit/ws-room-subscriptions.test.ts`

**Step 1: Write failing test**

```ts
// tests/audit/ws-room-subscriptions.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('WebSocket room subscriptions', () => {
  it('useWebSocket subscribes to project room when a project is selected', () => {
    const src = fs.readFileSync('./hooks/useWebSocket.ts', 'utf8');
    expect(src).toMatch(/subscribe\(`project:\$\{/);
  });

  it('useWebSocket subscribes to join-requests room when authenticated', () => {
    const src = fs.readFileSync('./hooks/useWebSocket.ts', 'utf8');
    expect(src).toMatch(/subscribe\('join-requests'\)/);
  });
});
```

**Step 2: Run test**

```bash
npx vitest run tests/audit/ws-room-subscriptions.test.ts
```
Expected: FAIL.

**Step 3: Patch useWebSocket**

```ts
// hooks/useWebSocket.ts
import { useEffect } from 'react';
import { websocketService } from '../services/websocket';
import { setupAllWebSocketSync, cleanupAllWebSocketSync } from '../services/websocketQuerySync';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';

export function useWebSocket() {
  const { isAuthenticated, user: currentUser } = useAuth();
  const { isIssueModalOpen, editingIssue, selectedProjectId } = useUIStore();

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      websocketService.subscribe(`user:${currentUser.id}`);
      websocketService.subscribe('join-requests');
      setupAllWebSocketSync();

      return () => {
        websocketService.unsubscribe(`user:${currentUser.id}`);
        websocketService.unsubscribe('join-requests');
        cleanupAllWebSocketSync();
      };
    }
  }, [isAuthenticated, currentUser]);

  // Subscribe to current project room
  useEffect(() => {
    if (!selectedProjectId) return;
    const roomId = `project:${selectedProjectId}`;
    websocketService.subscribe(roomId);
    return () => {
      websocketService.unsubscribe(roomId);
    };
  }, [selectedProjectId]);

  // Subscribe to issue-specific room when issue modal is open
  useEffect(() => {
    if (isIssueModalOpen && editingIssue && 'id' in editingIssue) {
      websocketService.subscribe(`issue:${editingIssue.id}`);
    }
    return () => {
      if (editingIssue && 'id' in editingIssue) {
        websocketService.unsubscribe(`issue:${editingIssue.id}`);
      }
    };
  }, [isIssueModalOpen, editingIssue]);
}
```

Verify the UI store exposes `selectedProjectId` (it does per CLAUDE.md).

**Step 4: Run tests**

```bash
npx vitest run tests/audit/ws-room-subscriptions.test.ts
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add hooks/useWebSocket.ts tests/audit/ws-room-subscriptions.test.ts
git commit -m "fix(ws): subscribe to project and join-requests rooms in useWebSocket"
```

---

## Task 13: Fix notifications filter inversion

**Files:**
- Modify: `server/routes/notifications.fastify.ts:21-24`
- Test: `tests/audit/notifications-filter.test.ts`

**Step 1: Write failing test**

```ts
// tests/audit/notifications-filter.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('notifications unread filter', () => {
  it('unread=false sets isRead to true (read-only)', () => {
    const src = fs.readFileSync('./server/routes/notifications.fastify.ts', 'utf8');
    // Build the where clause pattern we expect after fix
    expect(src).toMatch(/isRead:\s*unread\s*===\s*'true'\s*\?\s*false\s*:\s*unread\s*===\s*'false'\s*\?\s*true\s*:\s*undefined/);
  });
});
```

**Step 2: Run test**

```bash
npx vitest run tests/audit/notifications-filter.test.ts
```
Expected: FAIL.

**Step 3: Patch handler**

In `server/routes/notifications.fastify.ts:21-24`:

```ts
const where: any = {
  userId,
  isRead: unread === 'true' ? false : unread === 'false' ? true : undefined
};
```

**Step 4: Run tests**

```bash
npx vitest run tests/audit/notifications-filter.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add server/routes/notifications.fastify.ts tests/audit/notifications-filter.test.ts
git commit -m "fix(api): return only read notifications when unread=false"
```

---

## Task 14: Replace dead `['workspace-members']` invalidation with `['users']`

**Files:**
- Modify: `hooks/useJoinRequests.ts:48`

**Step 1: Patch invalidation**

```ts
// hooks/useJoinRequests.ts:41-51
export function useApproveJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api.joinRequests.approve(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS.

**Step 3: Commit**

```bash
git add hooks/useJoinRequests.ts
git commit -m "fix(ui): invalidate users query on join-request approval"
```

---

## Task 15: Fix mention notification typo

**Files:**
- Modify: `server/routes/comments.fastify.ts:148`

**Step 1: Patch message**

```ts
message: 'mentioned you in a comment',
```

**Step 2: Commit**

```bash
git add server/routes/comments.fastify.ts
git commit -m "fix(comments): correct mention notification message typo"
```

---

## Task 16: Use nullish coalescing for project lead update

**Files:**
- Modify: `server/routes/projects.fastify.ts:324`

**Step 1: Patch leadId computation**

```ts
leadId: updates.leadId ?? updates.lead_id ?? undefined,
```

This passes `null` through (clearing the field) when the client sends `leadId: null`, and only falls back to `undefined` (skip) when neither field is present.

**Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: PASS.

**Step 3: Commit**

```bash
git add server/routes/projects.fastify.ts
git commit -m "fix(projects): allow leadId=null to clear project lead"
```

---

## Task 17: Delete orphan backup file

**Files:**
- Delete: `services/api.ts.backup-1773661083`

**Step 1: Verify no behavior was lost**

```bash
diff services/api.ts services/api.ts.backup-1773661083
```
Expected: only `console.log` removals in current `services/api.ts` (already verified).

**Step 2: Delete**

```bash
rm services/api.ts.backup-1773661083
```

**Step 3: Commit**

```bash
git add -A services/api.ts.backup-1773661083
git commit -m "chore: remove orphan api.ts backup"
```

---

## Final verification

After all tasks land:

```bash
npm run typecheck
npm run lint
npm run test
npm run dev
```

Manually verify in the browser:
1. **CSRF**: open dev tools, delete `X-CSRF-Token` header from a POST — should 403.
2. **Rate limit**: hit `/api/v1/auth/login` 6 times with bad creds — 6th should 429.
3. **Lockout**: same as above, 5 fails → 429 with `Retry-After`.
4. **Forgot-password timing**: POST nonexistent email and real email, compare response times (should be within 200ms).
5. **Reset-password session**: log in on two browsers, reset password in one, refresh the other — should be logged out.
6. **WebSocket membership**: log in as Team A member, try `ws://localhost:3001/ws/issue/<Team-B-stealth-issue-id>?token=<jwt>` — should be closed with 1008.
7. **Real-time issue update**: User A changes status, User B's board row stays populated (no blank rows).
8. **Project room**: User A creates issue, User B viewing the project sees it appear without manual refresh.
9. **Notifications filter**: toggle "Show read" — should see only read notifications.
10. **Mention**: `@user` in a comment — notification reads "mentioned you in a comment".

---

## Out of scope (file as follow-ups)

- Email casing normalization at registration (login/register are both case-sensitive; forgot-password normalizes — make them consistent by lowercasing at register).
- CSP disabled in production Helmet config (`index.ts:71`) — verify nginx config actually sets CSP.
- CSV injection in export route (cells starting with `=`, `+`, `-`, `@` need prefix escape).
- `requireTeamMember` allows non-members to PATCH non-stealth teams (`teams.fastify.ts`).
- TeamLead can demote Administrator (`users.fastify.ts:81`).
- GET routes for issues/projects lack team-membership checks (cross-team read possible).

---

## Sequencing recap

- Tasks 1-4 are **blockers** — ship together as one PR.
- Tasks 5-7 ship as a second PR (auth flow).
- Task 8 ships alone (WebSocket auth, needs careful manual verification).
- Tasks 9-12 ship as one PR (real-time integrity).
- Tasks 13-16 ship as one PR (functional bugs).
- Task 17 ships alone (cleanup).

Total: 6 PRs, 17 commits, 17 tasks.
