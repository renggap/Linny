# Reviewer Follow-ups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close 5 cleanup items from the source-deploy-bugs final review — defensive cleanup of JWT/config modules, doc fix, regex typo, /refresh defense-in-depth.

**Architecture:** 5 small independent fixes, all in server-side TS + CLAUDE.md. Each ships its own commit with regression test where applicable.

**Tech Stack:** Fastify, dotenv, jsonwebtoken, Vitest.

---

## Sequencing

5 commits, one PR. Order:

1. Move JWT_SECRET capture into `jwtPlugin` body (`server/index.ts`)
2. Stop auto-calling `validateConfig()` at module import (`server/config/index.ts`, call from `server/index.ts:startServer`)
3. Document `VITE_API_URL` convention in `CLAUDE.md`
4. Fix regex typo in `tests/audit/cookie-maxage.test.ts:21`
5. Switch `/refresh` to lazy `verifyToken()` (`server/routes/auth.fastify.ts`)

Tasks 1, 2, 5 extend `tests/audit/env-load-order.test.ts` with new assertions.

---

## Task 1: Move JWT secret into jwtPlugin body

**Files:**
- Modify: `server/index.ts:129-149` (remove module-scope capture) and `server/index.ts` jwtPlugin function (read env inside)
- Test: extend `tests/audit/env-load-order.test.ts`

### Step 1: Read current state

```bash
sed -n '125,165p' server/index.ts
```

Current state: `const JWT_SECRET = process.env.JWT_SECRET` at module scope (line 129), with `process.exit(1)` validation (lines 131-134) and weak-secret warning (lines 137-139). Then `const JWT_SECRET_VALIDATED = JWT_SECRET as string` somewhere around line 149. Then jwtPlugin uses `JWT_SECRET_VALIDATED`.

### Step 2: Extend the test first

Open `tests/audit/env-load-order.test.ts`. Add a new case inside the existing `describe('env load order', ...)` block:

```ts
it('server/index.ts does NOT capture JWT_SECRET at module scope', () => {
  // The capture must live inside the jwtPlugin function so it reads env at
  // registration time, not module-load time.
  expect(indexSrc).not.toMatch(/^const\s+JWT_SECRET\s*=\s*process\.env\.JWT_SECRET/m);
  expect(indexSrc).not.toMatch(/^const\s+JWT_SECRET_VALIDATED\s*=\s*/m);
});

it('jwtPlugin reads JWT_SECRET inside the function body', () => {
  const block = indexSrc.match(/async function jwtPlugin\([\s\S]*?^\}/m)?.[0] ?? '';
  expect(block).toMatch(/process\.env\.JWT_SECRET/);
});
```

### Step 3: Run test to verify failure

```bash
npx vitest run tests/audit/env-load-order.test.ts
```
Expected: new assertions FAIL.

### Step 4: Patch server/index.ts

Remove the module-scope capture block (lines 129-149 approximately). The lines to remove:

```ts
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

// Warn if using default development secret
if (JWT_SECRET === 'dev-secret-change-in-production' || JWT_SECRET.length < 32) {
  console.error('WARNING: JWT_SECRET is insecure. Use a strong secret in production.');
}

// ... FRONTEND_URL block stays here ...

// Type assertion for TypeScript after validation
const JWT_SECRET_VALIDATED = JWT_SECRET as string;
```

Then update `jwtPlugin` (currently a few lines further down) to read env at registration time:

```ts
async function jwtPlugin(fastify: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
  }
  if (jwtSecret.length < 32) {
    console.error('FATAL: JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }
  await fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: { expiresIn: '3d' }
  });
}
```

Keep the FRONTEND_URL production check where it is (it's fine as a module-scope check, runs after env preload).

### Step 5: Run test

```bash
npx vitest run tests/audit/env-load-order.test.ts
```
Expected: PASS.

### Step 6: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep index.ts | tail -5
```

### Step 7: Commit

```bash
git add server/index.ts tests/audit/env-load-order.test.ts
git commit -m "refactor(server): move JWT_SECRET capture into jwtPlugin body"
```

---

## Task 2: Stop auto-calling validateConfig at import

**Files:**
- Modify: `server/config/index.ts:194-200` (remove auto-call block)
- Modify: `server/index.ts` `startServer()` (add explicit `validateConfig()` call)
- Test: extend `tests/audit/env-load-order.test.ts`

### Step 1: Extend the test

Open `tests/audit/env-load-order.test.ts`. Add:

```ts
it('server/config/index.ts does NOT auto-call validateConfig at module import', () => {
  // Modules should not call process.exit on import. Validation belongs at startup.
  expect(configSrc).not.toMatch(/^validateConfig\(\)/m);
  expect(configSrc).not.toMatch(/try\s*\{\s*validateConfig\(\)/);
});

it('server/index.ts calls validateConfig from startServer', () => {
  // Find startServer function body
  const block = indexSrc.match(/async function startServer\([\s\S]*?^\}/m)?.[0] ?? '';
  expect(block).toMatch(/validateConfig\(\)/);
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/env-load-order.test.ts
```
Expected: new assertions FAIL.

### Step 3: Patch server/config/index.ts

Remove lines 194-200 (the auto-call block):

```ts
// Validate configuration on import
try {
    validateConfig();
} catch (error) {
    console.error('❌ Configuration validation failed:', error);
    process.exit(1);
}
```

Replace with a comment:

```ts
// validateConfig() should be called explicitly from the server entry (startServer)
// to avoid terminating the process at module-import time.
```

Keep the `validateConfig` function definition (it's now called externally). Keep the `export default config;` at the end.

### Step 4: Patch server/index.ts

Add an import for `validateConfig` at the top of `server/index.ts` (with the other config imports). Check what's already imported — likely nothing from config yet, so:

```ts
import { validateConfig } from './config/index.js';
```

Then inside `startServer()` (find the function near line 380+), add the call early — before `registerPlugins()`:

```ts
async function startServer() {
  try {
    // Validate configuration before any plugins register
    validateConfig();

    // Register plugins
    await registerPlugins();
    // ... rest of function
```

### Step 5: Run test

```bash
npx vitest run tests/audit/env-load-order.test.ts
```
Expected: PASS.

### Step 6: Run full audit suite

```bash
npx vitest run tests/audit/
```
Expected: no regressions.

### Step 7: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep -E "index.ts|config/index.ts" | tail -5
```

### Step 8: Commit

```bash
git add server/config/index.ts server/index.ts tests/audit/env-load-order.test.ts
git commit -m "refactor(config): call validateConfig explicitly from startServer"
```

---

## Task 3: Document VITE_API_URL convention in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (Environment Variables section around line 440)

### Step 1: Read current state

```bash
sed -n '440,465p' CLAUDE.md
```

Current state has `VITE_API_URL=http://localhost:3001` as the example, with no explanation that the code appends `/api/v1`.

### Step 2: Patch CLAUDE.md

Replace the VITE_API_URL line + add an explanation block immediately after the env block. Find:

```env
# Frontend (for production)
VITE_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

Change to:

```env
# Frontend (for production)
# VITE_API_URL must be the ORIGIN ONLY — code in services/api.ts:25 appends /api/v1.
# Correct: https://linny-live.microworker.my.id
# Wrong:   https://linny-live.microworker.my.id/api/v1 (produces /api/v1/api/v1/... 404s)
VITE_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

Also: `http://localhost:3001` as the dev value works because in dev, the frontend (port 3000) calls the API (port 3001). But for the prod example, mention the convention. If CLAUDE.md has a "Production Deployment" section, add a note there too.

### Step 3: Verify doc reads cleanly

```bash
sed -n '455,475p' CLAUDE.md
```

### Step 4: Commit

```bash
git add CLAUDE.md
git commit -m "docs: document VITE_API_URL convention (origin only, code appends /api/v1)"
```

---

## Task 4: Fix regex typo in cookie-maxage test

**Files:**
- Modify: `tests/audit/cookie-maxage.test.ts:21`

### Step 1: Read current state

```bash
sed -n '15,25p' tests/audit/cookie-maxage.test.ts
```

Current line 21: `expect(maxAgeLine).toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60(?!s*\*\s*1000)/);`

The `(?!s*\*\s*1000)` is a negative lookahead. `s*` matches literal `s` chars (zero or more) — should be `\s*` for whitespace.

### Step 2: Patch

Change line 21 from:

```ts
expect(maxAgeLine).toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60(?!s*\*\s*1000)/);
```

to:

```ts
expect(maxAgeLine).toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60(?!\s*\*\s*1000)/);
```

### Step 3: Run test

```bash
npx vitest run tests/audit/cookie-maxage.test.ts
```
Expected: PASS (regex typo fix doesn't change pass/fail outcome since companion assertion at line 15 catches the regression — but the lookahead now actually does what it claims).

### Step 4: Verify the lookahead is now meaningful

The regex should match `7 * 24 * 60 * 60` but NOT match `7 * 24 * 60 * 60 * 1000`. With the fix, the negative lookahead `\s*\*\s*1000` rejects the second case.

Quick mental check:
- Input `7 * 24 * 60 * 60` → matches primary pattern, lookahead succeeds (no `* 1000` follows) → ✓
- Input `7 * 24 * 60 * 60 * 1000` → matches primary pattern, lookahead fails (`* 1000` follows) → regex rejects ✓

### Step 5: Commit

```bash
git add tests/audit/cookie-maxage.test.ts
git commit -m "test(auth): fix regex typo in cookie maxAge negative lookahead"
```

---

## Task 5: Switch /refresh to lazy verifyToken

**Files:**
- Modify: `server/routes/auth.fastify.ts:174` (replace `fastify.jwt.verify` with `verifyToken`)
- Test: extend `tests/audit/env-load-order.test.ts`

### Step 1: Extend the test

Open `tests/audit/env-load-order.test.ts`. Add:

```ts
it('server/routes/auth.fastify.ts /refresh uses verifyToken, not fastify.jwt.verify', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
    'utf8'
  );
  // Find the /refresh handler block
  const block = src.match(/fastify\.post\('\/refresh'[\s\S]*?\n  \}\);/m)?.[0] ?? '';
  expect(block).toMatch(/verifyToken\(/);
  expect(block).not.toMatch(/fastify\.jwt\.verify/);
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/env-load-order.test.ts
```
Expected: new assertion FAIL.

### Step 3: Patch server/routes/auth.fastify.ts

The current import at line 5 is `import { getRefreshTokenExpiryDate } from '../auth/jwt.js';`. Extend it to also import `verifyToken`:

```ts
import { getRefreshTokenExpiryDate, verifyToken } from '../auth/jwt.js';
```

Then at line 174, change:

```ts
const decoded = fastify.jwt.verify(refreshToken) as any;
```

to:

```ts
const decoded = verifyToken(refreshToken);
if (!decoded) {
  return reply.code(401).send({ error: 'Invalid or expired refresh token' });
}
```

The rest of the handler stays the same — `decoded.userId` is still accessible. The downstream `prisma.refreshToken.findUnique` is the authoritative check anyway.

### Step 4: Run test

```bash
npx vitest run tests/audit/env-load-order.test.ts
```
Expected: PASS.

### Step 5: Run full audit suite to confirm no regression

```bash
npx vitest run tests/audit/
```

### Step 6: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep auth.fastify | tail -5
```

### Step 7: Commit

```bash
git add server/routes/auth.fastify.ts tests/audit/env-load-order.test.ts
git commit -m "refactor(auth): use lazy verifyToken in /refresh for defense in depth"
```

---

## Final verification

After all 5 commits:

```bash
npm run typecheck
npx vitest run tests/audit/
```

Manual smoke (in a dev or staging env):

1. Server boots — no FATAL exit
2. `/api/health` returns healthy
3. Login → /refresh → /me round-trip succeeds (proves both old + new JWT secret paths work)
4. Bad refresh token → 401 (proves verifyToken null path works)

---

## Sequencing recap

- **One PR, 5 commits, 1 new test file extended (3 new assertions added across tasks 1, 2, 5).**
- Each task is independently revertible.
- Server deps must be installed at `server/node_modules/`.

---

## Out of scope

- Switching ALL JWT verify call sites to `verifyToken` (only /refresh per reviewer note)
- Removing fastify-jwt plugin entirely
- Backfilling deploy docs for `/home/linny-live`
- Other reviewer-flagged items already shipped
