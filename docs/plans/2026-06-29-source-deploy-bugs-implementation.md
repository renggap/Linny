# Source Deploy-Bug Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 4 source-repo bugs surfaced during the linny-live deploy — JWT iat collision, module-load env race, missing trustProxy, cookie maxAge unit confusion.

**Architecture:** All fixes in server-side TypeScript. Phase A = behavior fixes (jti uniqueness, env race). Phase B = config tweaks (trustProxy, maxAge). Each fix is one commit with a regression test.

**Tech Stack:** Fastify, Prisma, jsonwebtoken, dotenv, Vitest, Node crypto.

---

## Sequencing

4 commits, one PR. Order matters slightly:

1. jti uniqueness — `server/routes/auth.fastify.ts:39`
2. env race — `server/env.ts` (new), `server/index.ts:1,41`, `server/config/index.ts:10`
3. trustProxy — `server/index.ts:210`
4. cookie maxAge — `server/routes/auth.fastify.ts:25`

Tasks are independent — each is revertible on its own.

---

## Task 1: Add `jti` nonce to refresh-token payload

**Files:**
- Modify: `server/routes/auth.fastify.ts:39`
- Test: `tests/audit/refresh-token-uniqueness.test.ts`

### Step 1: Write failing test

Create `tests/audit/refresh-token-uniqueness.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const SECRET = 'test-secret-at-least-32-characters-long-aaaaaaaa';

describe('refresh token uniqueness', () => {
  it('two refresh tokens issued in the same second are NOT identical (jti differs)', () => {
    // Mirror the production signing logic
    const payload = { userId: 'u1', email: 'a@b.com', role: 'Member' };
    const sign = (p: object) =>
      jwt.sign({ ...p, jti: crypto.randomUUID() }, SECRET, { expiresIn: '7d' });

    const t1 = sign(payload);
    const t2 = sign(payload);

    expect(t1).not.toBe(t2);

    const d1 = jwt.verify(t1, SECRET) as any;
    const d2 = jwt.verify(t2, SECRET) as any;
    expect(d1.jti).not.toBe(d2.jti);
    expect(d1.jti.length).toBeGreaterThan(0);
  });

  it('refresh token includes jti claim', () => {
    const payload = { userId: 'u1', email: 'a@b.com', role: 'Member' };
    const token = jwt.sign({ ...payload, jti: crypto.randomUUID() }, SECRET, { expiresIn: '7d' });
    const decoded = jwt.verify(token, SECRET) as any;
    expect(decoded.jti).toBeTruthy();
    // UUID v4 format
    expect(decoded.jti).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe('auth.fastify signs refresh token with jti', () => {
  it('source includes jti: crypto.randomUUID() in refresh token payload', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
      'utf8'
    );
    expect(src).toMatch(/jti:\s*crypto\.randomUUID\(\)/);
    // Must be on the refresh token path (7d expiry), not the access token
    const refreshBlock = src.match(/refreshToken\s*=\s*fastify\.jwt\.sign\([\s\S]*?\}\)/)?.[0] ?? '';
    expect(refreshBlock).toMatch(/jti:\s*crypto\.randomUUID\(\)/);
    expect(refreshBlock).toMatch(/expiresIn:\s*['"]7d['"]/);
  });

  it('imports crypto module', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
      'utf8'
    );
    expect(src).toMatch(/import\s+crypto\s+from\s+['"]crypto['"]/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/refresh-token-uniqueness.test.ts
```
Expected: PASS on the first two `describe` blocks (independent test of the jti pattern), FAIL on the third (no jti in source yet).

### Step 3: Patch the handler

In `server/routes/auth.fastify.ts`:

Add the crypto import at the top (after line 4):

```ts
import crypto from 'crypto';
```

Then at line 39, change:

```ts
const refreshToken = fastify.jwt.sign(payload, { expiresIn: '7d' });
```

to:

```ts
const refreshToken = fastify.jwt.sign(
  { ...payload, jti: crypto.randomUUID() },
  { expiresIn: '7d' }
);
```

Leave the access token line above unchanged — access tokens aren't stored in DB, no collision risk.

### Step 4: Run test

```bash
npx vitest run tests/audit/refresh-token-uniqueness.test.ts
```
Expected: PASS (all 4 tests).

### Step 5: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep auth.fastify | tail -5
```

### Step 6: Commit

```bash
git add server/routes/auth.fastify.ts tests/audit/refresh-token-uniqueness.test.ts
git commit -m "fix(auth): add jti nonce to refresh token to prevent iat collision"
```

---

## Task 2: Fix module-load env race

**Files:**
- Create: `server/env.ts`
- Modify: `server/index.ts:1,26,41` (add env import as first line, remove later dotenv.config call)
- Modify: `server/config/index.ts:7,10` (remove dotenv import + call)
- Test: `tests/audit/env-load-order.test.ts`

### Step 1: Write failing test

Create `tests/audit/env-load-order.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const indexSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/index.ts'),
  'utf8'
);
const configSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/config/index.ts'),
  'utf8'
);
const jwtSrc = fs.readFileSync(
  path.resolve(__dirname, '../../server/auth/jwt.ts'),
  'utf8'
);

describe('env load order', () => {
  it('server/index.ts has env preload as the first import', () => {
    // Get the first non-comment, non-blank line
    const lines = indexSrc.split('\n');
    const firstImport = lines.find(l => l.startsWith('import '));
    expect(firstImport).toMatch(/['"]\.\/env\.js['"]/);
  });

  it('server/env.ts exists and runs dotenv.config()', () => {
    const envPath = path.resolve(__dirname, '../../server/env.ts');
    expect(fs.existsSync(envPath)).toBe(true);
    const envSrc = fs.readFileSync(envPath, 'utf8');
    expect(envSrc).toMatch(/dotenv\.config\(\)/);
  });

  it('server/config/index.ts no longer calls dotenv.config() itself', () => {
    // config/index.ts is imported transitively AFTER env.ts loads, so it should NOT re-load.
    expect(configSrc).not.toMatch(/^dotenv\.config\(\)/m);
  });

  it('server/auth/jwt.ts does NOT read JWT_SECRET at module top-level', () => {
    // The line `const SECRET = process.env.JWT_SECRET` at module scope is the bug.
    // It must be inside a function so it reads AFTER dotenv loads.
    // Look at the top 30 lines for module-scope const declarations.
    const topLines = jwtSrc.split('\n').slice(0, 30).join('\n');
    expect(topLines).not.toMatch(/^const\s+SECRET\s*=\s*process\.env\.JWT_SECRET/m);
    expect(topLines).not.toMatch(/^const\s+JWT_SECRET\s*=\s*process\.env\.JWT_SECRET/m);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/env-load-order.test.ts
```
Expected: FAIL on most assertions.

### Step 3: Create `server/env.ts`

```ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (parent of server/).
// This file MUST be the first import in server/index.ts so that all
// transitively-imported modules (auth/jwt.ts, config/index.ts) see the
// populated process.env when they evaluate.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
```

### Step 4: Modify `server/index.ts`

Make line 1 (before all other imports):

```ts
import './env.js';
```

Remove the redundant dotenv import and call (currently at lines 26 and 41):

```ts
// Remove these two lines:
import dotenv from 'dotenv';
// ...
dotenv.config({ path: path.resolve(__dirname, '../.env') });
```

The `path` and `fileURLToPath` imports in `server/index.ts` are still needed for other uses (`__dirname` computation), so leave those.

### Step 5: Modify `server/config/index.ts`

Remove the local dotenv load (lines 7 and 10):

```ts
// Remove these two lines:
import dotenv from 'dotenv';
// ...
dotenv.config();
```

The config module is imported AFTER `env.ts` (transitively via `database.ts` or directly), so dotenv is already loaded by the time config evaluates. Keeping the local call was redundant AND wrong (race source).

### Step 6: Modify `server/auth/jwt.ts`

Move the module-scope `const SECRET = process.env.JWT_SECRET` into a lazy getter function. Rewrite the top of the file:

```ts
import jwt from 'jsonwebtoken';

const ACCESS_EXPIRY = '3d';
const REFRESH_EXPIRY = '7d';
const FALLBACK_DEV_SECRET = 'dev-secret-change-in-production';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error(
        'CRITICAL: JWT_SECRET environment variable is required in production. ' +
        'Set a strong, random secret (minimum 32 characters).'
      );
    }
    console.warn(
      '⚠️  WARNING: JWT_SECRET not set. Using development secret. ' +
      'Set JWT_SECRET environment variable for production use.'
    );
    return FALLBACK_DEV_SECRET;
  }

  if (secret.length < 32) {
    throw new Error(
      'CRITICAL: JWT_SECRET must be at least 32 characters long for security. ' +
      'Current length: ' + secret.length + ' characters.'
    );
  }

  return secret;
}

// ... existing interfaces ...

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: ACCESS_EXPIRY });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: REFRESH_EXPIRY });
}

export function generateTokenPair(payload: TokenPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as TokenPayload;
  } catch {
    return null;
  }
}
```

This guarantees env is read at call-time, not at module-load. Even if some import path bypasses `env.ts`, the JWT functions still see current `process.env`.

### Step 7: Run test

```bash
npx vitest run tests/audit/env-load-order.test.ts
```
Expected: PASS (all 4 tests).

### Step 8: Run full audit suite to confirm no regression

```bash
npx vitest run tests/audit/
```

### Step 9: Typecheck

```bash
cd server && npx tsc --noEmit 2>&1 | grep -v node_modules | tail -10
```

### Step 10: Commit

```bash
git add server/env.ts server/index.ts server/config/index.ts server/auth/jwt.ts tests/audit/env-load-order.test.ts
git commit -m "fix(env): preload dotenv before transitive imports read process.env"
```

---

## Task 3: Add `trustProxy: true` to Fastify instance

**Files:**
- Modify: `server/index.ts` (around line 210-224, the `Fastify({...})` call)
- Test: `tests/audit/trust-proxy.test.ts`

### Step 1: Write failing test

Create `tests/audit/trust-proxy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/index.ts'),
  'utf8'
);

describe('Fastify trustProxy', () => {
  it('declares trustProxy: true in the Fastify constructor', () => {
    // Find the Fastify({...}) block and check for trustProxy: true
    const block = src.match(/const\s+fastify\s*=\s*Fastify\(\s*\{[\s\S]*?\}\s*\)/)?.[0] ?? '';
    expect(block).toMatch(/trustProxy:\s*true/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/trust-proxy.test.ts
```
Expected: FAIL.

### Step 3: Patch Fastify constructor

In `server/index.ts`, inside the `Fastify({...})` block (currently around lines 210-225), add `trustProxy: true` next to the other options:

```ts
const fastify = Fastify({
  logger: { /* ... */ },
  bodyLimit: 5 * 1024 * 1024,
  requestIdHeader: 'x-request-id',
  trustProxy: true, // Behind nginx — read X-Forwarded-For so rate limits key per-client
  disableRequestLogging: !isDevelopment
});
```

### Step 4: Run test

```bash
npx vitest run tests/audit/trust-proxy.test.ts
```
Expected: PASS.

### Step 5: Commit

```bash
git add server/index.ts tests/audit/trust-proxy.test.ts
git commit -m "fix(server): enable trustProxy so rate limits key per-client behind nginx"
```

---

## Task 4: Fix cookie maxAge unit (seconds, not milliseconds)

**Files:**
- Modify: `server/routes/auth.fastify.ts:25`
- Test: `tests/audit/cookie-maxage.test.ts`

### Step 1: Write failing test

Create `tests/audit/cookie-maxage.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../server/routes/auth.fastify.ts'),
  'utf8'
);

describe('refresh token cookie maxAge', () => {
  it('does NOT multiply by 1000 (would mean milliseconds-seconds confusion)', () => {
    // Find the setRefreshTokenCookie block
    const block = src.match(/setRefreshTokenCookie[\s\S]*?path:\s*['"]\/['"]/)?.[0] ?? '';
    expect(block.length).toBeGreaterThan(0);
    // The maxAge line must NOT end in * 1000
    const maxAgeLine = block.match(/maxAge:\s*([^,]+)/)?.[0] ?? '';
    expect(maxAgeLine).not.toMatch(/\*\s*1000/);
  });

  it('maxAge evaluates to 7 days in seconds (604800)', () => {
    // The expression should be 7 * 24 * 60 * 60 (no extra * 1000)
    const block = src.match(/setRefreshTokenCookie[\s\S]*?path:\s*['"]\/['"]/)?.[0] ?? '';
    const maxAgeLine = block.match(/maxAge:\s*([^,]+)/)?.[0] ?? '';
    expect(maxAgeLine).toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60(?!s*\*\s*1000)/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/cookie-maxage.test.ts
```
Expected: FAIL (current code has `* 1000`).

### Step 3: Patch the cookie helper

In `server/routes/auth.fastify.ts:25`, change:

```ts
maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
```

to:

```ts
maxAge: 7 * 24 * 60 * 60, // 7 days in seconds (@fastify/cookie uses seconds, not ms)
```

### Step 4: Run test

```bash
npx vitest run tests/audit/cookie-maxage.test.ts
```
Expected: PASS.

### Step 5: Commit

```bash
git add server/routes/auth.fastify.ts tests/audit/cookie-maxage.test.ts
git commit -m "fix(auth): correct refresh-token cookie maxAge unit (seconds, not ms)"
```

---

## Final verification

After all 4 commits:

```bash
npm run typecheck
npx vitest run tests/audit/
```

Manual smoke (assuming local dev or staging):

1. Register a user — succeeds
2. Log in IMMEDIATELY after register (within same second) — succeeds (jti prevents collision)
3. Restart server, verify no `WARNING: JWT_SECRET not set` in logs
4. Behind a proxy with `X-Forwarded-For: 1.2.3.4`, hit `/api/v1/auth/login` 6 times — 6th returns 429 (rate limit keys on the spoofed IP, proving trustProxy works)
5. Log in successfully, verify the `Set-Cookie: refreshToken=...` header has `Max-Age=604800` (not 604800000)

---

## Sequencing recap

- **One PR, 4 commits, 4 new test files.**
- Each task is independently revertible.
- Server deps must be installed at `server/node_modules/`.

---

## Out of scope

- Documenting `VITE_API_URL` convention in CLAUDE.md (deploy concern, not source bug)
- Moving refresh tokens from JWT to UUID (bigger refactor; jti fixes the immediate bug)
- Other deploy-specific issues from `/home/linny-live` (those are deploy artifacts)
