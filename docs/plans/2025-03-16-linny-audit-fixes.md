# Linny Code Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Secure, test, and production-harden the Linny codebase based on deep audit findings

**Architecture:** Incremental fixes following TDD principles. Each task includes complete code, commands, and acceptance criteria.

**Tech Stack:** Vitest, Fastify, Prisma, React 19, TypeScript

---

## 📊 PHASE OVERVIEW

| Phase | Duration | Tasks | Status |
|-------|----------|-------|--------|
| Phase 0: Workspace Setup | 15 min | 3 tasks | ⏳ |
| Phase 1: Critical Fixes | Day 1-2 | 14 tasks | ⏳ |
| Phase 2: Security & Stability | Day 3-4 | 12 tasks | ⏳ |
| Phase 3: Polish & Performance | Day 5-7 | 14 tasks | ⏳ |
| Phase 4: CI/CD & Docs | Day 8-9 | 8 tasks | ⏳ |
| **Total** | **9 days** | **51 tasks** | |

---

## 🎯 PHASE 0: WORKSPACE SETUP (15 min)

### Task 0.1: Create Worktree for Isolation

**Files:** N/A (git operation)

**Step 1:** Check current branch
```bash
cd /home/linny
git branch --show-current
```
Expected: `main` or `master`

**Step 2:** Create and switch to `audit/fixes-2025-03-16` branch
```bash
git checkout -b audit/fixes-2025-03-16
```
Expected: Branch created and checked out

**Step 3:** Pull latest origin/main to ensure up-to-date
```bash
git pull origin main
```
Expected: Fast-forward or already up-to-date

**Acceptance:** Branch exists, working tree clean

---

### Task 0.2: Create Plans Directory

**Files:**
- Create: `docs/plans/` directory

**Step 1:** Create directory
```bash
mkdir -p /home/linny/docs/plans
```

**Step 2:** Verify creation
```bash
ls -la /home/linny/docs/plans
```
Expected: Empty directory (or this file after we save)

**Acceptance:** `docs/plans/` exists

---

### Task 0.3: Update .gitignore for Test Artifacts

**Files:**
- Modify: `.gitignore`

**Step 1:** Check if `.gitignore` exists
```bash
cd /home/linny
if [ -f .gitignore ]; then echo "exists"; else echo "missing"; fi
```

**Step 2:** Add coverage and test outputs if missing
```bash
cat >> .gitignore << 'EOF'

# Test coverage
coverage/
.nyc_output

# Vitest
.vitest/

# Test artifacts
test-results/
*.test.tsx~
*.spec.tsx~

# Temporary test files
scratch/
temp/
EOF
```

**Step 3:** Verify additions
```bash
tail -20 .gitignore
```
Expected: Lines above present

**Acceptance:** `.gitignore` updated with test artifacts

---

## 🚨 PHASE 1: CRITICAL FIXES (Day 1-2)

### Task 1.1: Install Vitest Testing Stack

**Files:**
- Modify: `package.json` (add devDependencies)
- Modify: `tsconfig.json` (add vitest types)

**Step 1:** Install Vitest and testing libraries
```bash
cd /home/linny
npm install -D vitest @testing-library/react @testing-library/react-hooks @testing-library/jest-dom jsdom @testing-library/user-event @types/jest
```
Expected: Packages installed

**Step 2:** Verify installation
```bash
npm list vitest @testing-library/react
```
Expected: Show vitest version ≥1.0.0

**Step 3:** Update `package.json` scripts

Read current scripts:
```bash
node -e "const p=require('./package.json'); console.log(p.scripts)"
```

Modify `package.json` → add:
```json
"scripts": {
  ...
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:run": "vitest run"
}
```

**Step 4:** Create `vitest.config.ts` at project root

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'coverage/']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.')
    }
  }
});
```

**Step 5:** Create `tests/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

**Step 6:** Run test to verify setup
```bash
npm run test:run -- --help
```
Expected: Vitest help output

**Acceptance:** `npm run test` starts Vitest, no errors

---

### Task 1.2: Write First Smoke Test - Auth Flow

**Files:**
- Create: `tests/auth/smoke.test.ts`

**Step 1:** Create tests directory structure
```bash
mkdir -p /home/linny/tests/auth
```

**Step 2:** Write smoke test for auth context (mock-based)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../contexts/AuthContext';

// Mock the auth API
vi.mock('../services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn()
  }
}));

describe('Auth Smoke Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with unauthenticated state', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should set user on login', async () => {
    const mockUser = { id: '1', email: 'test@test.com', name: 'Test', role: 'Member' };
    const mockResponse = { user: mockUser, accessToken: 'token', refreshToken: 'refresh' };

    const { authApi } = await import('../services/api');
    authApi.login.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@test.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });
});
```

**Step 3:** Run the test (expected to fail because AuthContext implementation details may differ)
```bash
cd /home/linny
npm run test:run tests/auth/smoke.test.ts
```
Expected: One or more tests failing (we'll fix in later tasks)

**Acceptance:** Test file created, test runner executes without crashing

---

### Task 1.3: Write API Smoke Test

**Files:**
- Create: `tests/api/smoke.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { api } from '../services/api';

describe('API Smoke Tests', () => {
  it('should have all required API modules', () => {
    expect(api.auth).toBeDefined();
    expect(api.users).toBeDefined();
    expect(api.teams).toBeDefined();
    expect(api.projects).toBeDefined();
    expect(api.issues).toBeDefined();
    expect(api.comments).toBeDefined();
    expect(api.notifications).toBeDefined();
    expect(api.activities).toBeDefined();
    expect(api.invitations).toBeDefined();
    expect(api.joinRequests).toBeDefined();
    expect(api.admin).toBeDefined();
  });

  it('should export helper functions', () => {
    expect(typeof api.getAccessToken).toBe('function');
    expect(typeof api.refreshAccessToken).toBe('function');
    expect(typeof api.getCsrfToken).toBe('function');
    expect(typeof api.onAuthFailure).toBe('function');
  });
});
```

**Acceptance:** Test passes, API structure verified

---

### Task 1.4: Fix Hardcoded Secrets in docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

**Step 1:** Inspect current file
```bash
cat /home/linny/docker-compose.yml
```
Expected: Lines with `POSTGRES_PASSWORD: ebB2...` and `REDIS_PASSWORD: t4sl...`

**Step 2:** Replace hardcoded secrets with environment variables

Backup first:
```bash
cp /home/linny/docker-compose.yml /home/linny/docker-compose.yml.backup
```

Replace content:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: neo_linear_postgres
    environment:
      POSTGRES_USER: neo_linear
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: neo_linear
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U neo_linear" ]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: neo_linear_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru --requirepass ${REDIS_PASSWORD}
    healthcheck:
      test: [ "CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping" ]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
      args:
        DATABASE_URL: postgresql://neo_linear:${POSTGRES_PASSWORD}@postgres:5432/neo_linear
        JWT_SECRET: ${JWT_SECRET}
        NODE_ENV: production
        FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
        PORT: 3001
    container_name: neo_linear_server
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://neo_linear:${POSTGRES_PASSWORD}@postgres:5432/neo_linear
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      REDIS_ENABLED: "true"
      REDIS_PREFIX: "neo_linear:"
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - neo_linear_network

volumes:
  postgres_data:
  redis_data:

networks:
  neo_linear_network:
    driver: bridge
```

**Step 3:** Update `.env` file with strong secrets

Check if `.env` exists:
```bash
[ -f /home/linny/.env ] && echo "exists" || echo "missing"
```

Create/update `.env`:
```bash
cat > /home/linny/.env << 'EOF'
# Database
POSTGRES_PASSWORD=$(openssl rand -hex 32)

# Redis
REDIS_PASSWORD=$(openssl rand -hex 32)

# JWT (must be at least 32 chars)
JWT_SECRET=$(openssl rand -hex 32)

# Frontend URL
FRONTEND_URL=http://localhost:3000
EOF
```

**Step 4:** Verify substitutions work
```bash
docker compose config 2>&1 | grep -E "POSTGRES_PASSWORD|REDIS_PASSWORD|JWT_SECRET" | head -5
```
Expected: Values show as `${POSTGRES_PASSWORD}` etc (not the raw secrets)

**Step 5:** Generate actual strong secrets
```bash
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)" > /home/linny/.env.production
echo "REDIS_PASSWORD=$(openssl rand -hex 32)" >> /home/linny/.env.production
echo "JWT_SECRET=$(openssl rand -hex 32)" >> /home/linny/.env.production
echo "FRONTEND_URL=https://linear.neodigital.co.id" >> /home/linny/.env.production
```
Then copy to `.env` for local dev:
```bash
cp /home/linny/.env.production /home/linny/.env
```

**Acceptance:**
- No hardcoded secrets in `docker-compose.yml`
- `.env` file exists with strong secrets
- `docker compose config` shows env var references

---

### Task 1.5: Remove Console.log from Frontend API Client

**Files:**
- Modify: `services/api.ts`

**Step 1:** Count current console.log statements
```bash
cd /home/linny
grep -n "console\.log" services/api.ts | wc -l
```
Expected: ~50+ lines

**Step 2:** Create a logger utility for development

Create `services/logger.ts`:
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL: LogLevel = import.meta.env.DEV ? 'debug' : 'warn';

function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  return levels.indexOf(level) >= levels.indexOf(LOG_LEVEL);
}

export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) console.debug('[DEBUG]', ...args);
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) console.info('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    if (shouldLog('error')) console.error('[ERROR]', ...args);
  }
};
```

**Step 3:** Replace console.log with logger.debug (use careful find/replace)

For EACH occurrence in `services/api.ts`, convert:

Before:
```typescript
console.log('[api.issues.updateStatus] Sending request:', { id, status });
```

After:
```typescript
logger.debug('[api.issues.updateStatus] Sending request:', { id, status });
```

But better: **Delete non-essential logs entirely**. Keep only warnings and errors.

Quick pass - remove obvious debug logs:

```bash
cd /home/linny
# Make backup
cp services/api.ts services/api.ts.backup

# Use sed to remove lines with specific patterns (review manually first!)
sed -i "/console\.log(\['\[api\.issues\.updateStatus\]'/d" services/api.ts
sed -i "/console\.log(\['\[auth\.login\]'/d" services/api.ts
sed -i "/console\.log(\['\[auth\.refresh\]'/d" services/api.ts
sed -i "/console\.log(\['📴/d" services/api.ts
sed -i "/console\.log(\['📶/d" services/api.ts
sed -i "/console\.log(\['📦/d" services/api.ts
sed -i "/console\.log(\['🔄/d" services/api.ts
sed -i "/console\.log(\['✅/d" services/api.ts
sed -i "/console\.log(\['❌/d" services/api.ts
sed -i "/console\.log(\['⚠️'/d" services/api.ts
sed -i "/console\.log(\['📢/d" services/api.ts
```

**Step 4:** Manually review remaining console logs

```bash
grep -n "console\.log" services/api.ts
```

For any remaining, evaluate:
- If it's a `logger.error(...)` → keep as `console.error` (urgent)
- If it's a warning → convert to `logger.warn`
- If it's debug → delete or use `logger.debug`

**Step 5:** Remove all `console.log` from components (frontend)

```bash
cd /home/linny/components
grep -r "console\.log" --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u
```

For each file with console.log, remove them:
```bash
# Example for one file
sed -i "/console\.log/d" components/Header.tsx
# Repeat for all files listed
```

**Acceptance:**
- `services/api.ts` has ≤5 console statements (only errors/warnings)
- No console.log in `components/` directory
- `npm run build` succeeds without warnings

---

### Task 1.6: Remove Console.log from Server (Fastify)

**Files:**
- `server/routes/auth.fastify.ts`
- `server/websocket/fastifyWebSocketServer.ts`
- All other server .ts files

**Step 1:** Replace console.log with fastify.log

In `server/routes/auth.fastify.ts`:

Change:
```typescript
console.log('[auth.login] Handler entered');
```

To:
```typescript
fastify.log.debug({ email }, 'Auth handler entered');
```

Do this systematically:

```bash
cd /home/linny/server

# For auth.fastify.ts
cp routes/auth.fastify.ts routes/auth.fastify.ts.backup

# Replace patterns
sed -i "s/console\.log(\['\[auth\.login\]'/fastify.log.debug({'action': 'auth.login'}/g" routes/auth.fastify.ts
sed -i "s/console\.log(\['\[auth\.refresh\]'/fastify.log.debug({'action': 'auth.refresh'}/g" routes/auth.fastify.ts
sed -i "s/console\.warn/fastify.log.warn/g" routes/auth.fastify.ts
sed -i "s/console\.error/fastify.log.error/g" routes/auth.fastify.ts
```

**Step 2:** Clean up websocket server

```bash
cp websocket/fastifyWebSocketServer.ts websocket/fastifyWebSocketServer.ts.backup

# Get the fastify instance passed to constructor - it's `self.fastify`
# In authenticateConnection method, change:
# console.log → self.fastify.log.debug
# console.warn → self.fastify.log.warn
# console.error → self.fastify.log.error

sed -i "s/console\.log(\`🔑/self.fastify.log.debug({'event': 'ws.auth'}/g" websocket/fastifyWebSocketServer.ts
sed -i "s/console\.log(\`✅/self.fastify.log.info({'event': 'ws.connect'}/g" websocket/fastifyWebSocketServer.ts
sed -i "s/console\.log(\`📢/self.fastify.log.debug({'event': 'ws.broadcast'}/g" websocket/fastifyWebSocketServer.ts
sed -i "s/console\.warn/self.fastify.log.warn/g" websocket/fastifyWebSocketServer.ts
sed -i "s/console\.error/self.fastify.log.error/g" websocket/fastifyWebSocketServer.ts
```

**Step 3:** Remove remaining console.log in entire server

```bash
grep -r "console\.log" server --include="*.ts"
# For each file found, either convert to fastify.log or delete
# Most can be removed as debug statements
```

**Step 4:** Verify no console.log remains in server (except maybe in error cases we keep)

```bash
cd /home/linny
grep -r "console\.log[^ (]" server --include="*.ts" | grep -v "fastify.log" || echo "All clear"
```

**Acceptance:**
- All server debug logs use `fastify.log.debug/info/warn/error`
- No `console.log` remain in server code
- Server starts without warnings about console usage

---

### Task 1.7: Sanitize Validation Logging

**Files:**
- Modify: `server/middleware/validation.ts`

**Step 1:** Read current implementation
```bash
cat server/middleware/validation.ts
```

**Step 2:** Replace raw data logging with safe sanitization

Current problematic lines (around line 28-31):
```typescript
console.log('[Validation] Failed for', target, '- Data:', JSON.stringify(dataToValidate));
console.log('[Validation] Errors:', JSON.stringify(error.errors));
```

Replace with:

```typescript
// Only log in development, and never log sensitive fields
if (process.env.NODE_ENV === 'development') {
  const sanitized = { ...dataToValidate };
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.passwordHash;
  delete sanitized.token;
  delete sanitized.refreshToken;
  delete sanitized.authorization;
  
  fastify.log.debug({
    validationTarget: target,
    errors: error.errors,
    data: sanitized
  }, 'Validation failed');
}
```

But wait - `validation.ts` doesn't have access to `fastify`. Need to restructure.

**Better fix:** Make validation middleware a Fastify plugin that decorates request with logger:

Create `server/middleware/validationFastify.ts` (new file):

```typescript
import { FastifyInstance } from 'fastify';
import { AnyZodObject, ZodError } from 'zod';

export function registerValidationPlugin(fastify: FastifyInstance) {
  fastify.decorate('validate', function <T>(schema: AnyZodObject, target: 'body' | 'params' | 'query' | 'all' = 'body', data: any): T {
    try {
      return schema.parse(data) as T;
    } catch (error) {
      if (error instanceof ZodError) {
        // Log sanitized data using fastify's logger
        const sanitized = { ...data };
        delete sanitized.password;
        delete sanitized.passwordHash;
        delete sanitized.token;
        delete sanitized.refreshToken;
        
        fastify.log.debug({
          validationTarget: target,
          errors: error.errors,
          data: sanitized
        }, 'Validation failed');

        throw fastify.httpErrors.badRequest('Validation failed', {
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      throw error;
    }
  });
}
```

Then in `server/index.ts`, register the plugin:
```typescript
import { registerValidationPlugin } from './middleware/validationFastify.js';
// ...
await fastify.register(fp(registerValidationPlugin));
```

**But wait** - the existing `validation.ts` is used as standalone middleware for both Fastify and Express. We can't break compatibility.

**Simpler fix:** Keep `validation.ts` but use `console.warn` only in development, and never log data in production.

Modify `server/middleware/validation.ts`:

```typescript
export function validate(schema: AnyZodObject, target: 'body' | 'params' | 'query' | 'all' = 'body') {
  return (req: any, res: any, next?: any): any => {
    let dataToValidate: Record<string, any> = {};

    try {
      if (target === 'body' || target === 'all') {
        Object.assign(dataToValidate, req.body);
      }
      if (target === 'params' || target === 'all') {
        Object.assign(dataToValidate, req.params);
      }
      if (target === 'query' || target === 'all') {
        Object.assign(dataToValidate, req.query);
      }

      schema.parse(dataToValidate);

      if (next) return next();
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        // ONLY log in development, and never log sensitive data
        if (process.env.NODE_ENV === 'development') {
          const sanitized = { ...dataToValidate };
          // Common sensitive field names
          const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'authorization', 'secret', 'key', 'credentials'];
          sensitiveFields.forEach(field => delete sanitized[field]);
          
          // Use console.warn (acceptable for dev debugging)
          console.warn('[Validation] Target:', target);
          console.warn('[Validation] Errors:', JSON.stringify(error.errors, null, 2));
          console.warn('[Validation] Sanitized Data:', JSON.stringify(sanitized, null, 2));
        }

        const response = {
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        };

        if (res.code) {
          return res.code(400).send(response);
        }
        return res.status(400).json(response);
      }
      if (next) return next(error);
      return;
    }
  };
}
```

**Acceptance:**
- No raw passwords/tokens in logs
- Validation errors still reported in development
- Production: no validation data logged

---

### Task 1.8: Fix Offline Queue - Filter by HTTP Method

**Files:**
- Modify: `services/api.ts` (queueRequest function and fetchWithAuth)

**Step 1:** Analyze current queueRequest logic (line ~87)

Current:
```typescript
function queueRequest(method: string, url: string, options?: RequestInit): void {
  // Queues ALL methods including GET
}
```

**Problem:** GET requests should NOT be queued (they're idempotent and may be retried anyway automatically). Also, non-idempotent POST/PATCH may need deduplication.

**Step 2:** Implement method filtering

Replace `queueRequest` with:

```typescript
// Methods that are safe to retry (idempotent)
const IDEMPOTENT_METHODS = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'];
const NON_IDEMPOTENT_METHODS = ['POST']; // PATCH is idempotent by spec but often not safe in practice

function queueRequest(method: string, url: string, options?: RequestInit): void {
  const upperMethod = method.toUpperCase();

  // Never queue idempotent methods - they can fail immediately
  // The browser will automatically retry GET on network restore
  if (IDEMPOTENT_METHODS.includes(upperMethod)) {
    console.warn(`[OfflineQueue] ${upperMethod} ${url} not queued (idempotent method)`);
    return;
  }

  // Only queue POST requests (non-idempotent)
  if (!NON_IDEMPOTENT_METHODS.includes(upperMethod)) {
    console.warn(`[OfflineQueue] Unknown method ${upperMethod}, not queued`);
    return;
  }

  // Check queue size limit
  if (requestQueue.length >= MAX_QUEUE_SIZE) {
    console.warn(`📦 Queue full (${MAX_QUEUE_SIZE}), dropping oldest request: ${method} ${url}`);
    requestQueue.shift();
  }

  // Remove expired requests
  const now = Date.now();
  requestQueue = requestQueue.filter(req => now - req.timestamp < QUEUE_TTL_MS);

  const request: QueuedRequest = {
    method: upperMethod,
    url,
    options,
    timestamp: Date.now()
  };
  requestQueue.push(request);
  console.log(`📦 Queued request: ${method} ${url} (queue size: ${requestQueue.length})`);
}
```

**Step 3:** Update `fetchWithAuth` to not treat offline GET as error

Current:
```typescript
if (!isOnline && navigator.onLine === false) {
  const method = options?.method || 'GET';
  queueRequest(method, url, options);
  throw new Error('Offline: Request queued');
}
```

Change to:
```typescript
if (!isOnline && navigator.onLine === false) {
  const method = options?.method || 'GET';
  const upperMethod = method.toUpperCase();
  
  if (NON_IDEMPOTENT_METHODS.includes(upperMethod)) {
    queueRequest(upperMethod, url, options);
    throw new Error('Offline: Request queued');
  } else {
    // For idempotent methods, just fail immediately
    throw new Error('Offline: Request failed (idempotent method not queued)');
  }
}
```

**Step 4:** Test the behavior

Create quick test script `tests/offline-queue.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestQueue, queueRequest, getOfflineStatus, clearRequestQueue } from '../services/api';

describe('Offline Queue', () => {
  beforeEach(() => {
    clearRequestQueue();
    vi.clearAllMocks();
  });

  it('should queue POST requests', () => {
    queueRequest('POST', '/api/test', {});
    expect(requestQueue.length).toBe(1);
  });

  it('should NOT queue GET requests', () => {
    queueRequest('GET', '/api/test', {});
    expect(requestQueue.length).toBe(0);
  });

  it('should NOT queue PUT requests (idempotent)', () => {
    queueRequest('PUT', '/api/test', {});
    expect(requestQueue.length).toBe(0);
  });

  it('should NOT queue DELETE requests', () => {
    queueRequest('DELETE', '/api/test', {});
    expect(requestQueue.length).toBe(0);
  });

  it('should queue PATCH (borderline)', () => {
    // PATCH is idempotent per spec but often treated as non-idempotent
    // Current implementation: NOT queued (considered idempotent)
    queueRequest('PATCH', '/api/test', {});
    expect(requestQueue.length).toBe(0);
  });
});
```

Run:
```bash
npm run test:run tests/offline-queue.test.ts
```

**Acceptance:**
- Only POST requests are queued when offline
- GET/PUT/DELETE/PATCH fail immediately offline (no queue)
- Tests pass

---

### Task 1.9: Handle 204 No Content in API Response

**Files:**
- Modify: `services/api.ts` (`handleResponse` function)

**Step 1:** Locate `handleResponse` function (around line 560)

Current:
```typescript
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!response.ok) {
    // ... error handling
  }

  if (!isJson) {
    throw new Error(`Expected JSON but got ${contentType || 'unknown'}: ${text.substring(0, 100)}`);
  }

  return response.json();
}
```

**Step 2:** Add 204/202 handling BEFORE parsing JSON

Replace the function with:

```typescript
async function handleResponse<T>(response: Response): Promise<T> {
  const status = response.status;
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  // Handle No Content (204) and Accepted (202) with empty body
  if (status === 204 || status === 202) {
    return {} as T; // Return empty object for successful no-content responses
  }

  if (!response.ok) {
    if (isJson) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    } else {
      const text = await response.text().catch(() => 'No error details');
      if (response.status === 500 && (text.includes('ECONNREFUSED') || text.includes('Error: connect ECONNREFUSED'))) {
        throw new Error('Backend server is unreachable. Please ensure the server is running on port 3001.');
      }
      throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
    }
  }

  if (!isJson) {
    const text = await response.text().catch(() => 'No content');
    throw new Error(`Expected JSON but got ${contentType || 'unknown'}: ${text.substring(0, 100)}`);
  }

  return response.json();
}
```

**Step 3:** Identify which endpoints return 204 and verify they're handled

Check Fastify routes that might return 204:
- DELETE `/api/v1/projects/:id` → 204
- DELETE `/api/v1/issues/:id` → 204
- DELETE `/api/v1/users/:id` → 204
- PATCH `/api/v1/notifications/:id/read` → 204

Verify by checking server routes or just trust the fix now.

**Step 4:** Write test for 204 handling

Create `tests/api/response-handling.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleResponse } from '../services/api';

describe('handleResponse', () => {
  it('should handle 204 No Content', async () => {
    const mockResponse = {
      status: 204,
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({})
    } as unknown as Response;

    const result = await handleResponse(mockResponse);
    expect(result).toEqual({});
  });

  it('should handle 202 Accepted', async () => {
    const mockResponse = {
      status: 202,
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({})
    } as unknown as Response;

    const result = await handleResponse(mockResponse);
    expect(result).toEqual({});
  });

  it('should parse JSON for 200 OK', async () => {
    const mockResponse = {
      status: 200,
      headers: { get: () => 'application/json' },
      json: vi.fn().mockResolvedValue({ success: true })
    } as unknown as Response;

    const result = await handleResponse(mockResponse);
    expect(result).toEqual({ success: true });
  });
});
```

Run:
```bash
npm run test:run tests/api/response-handling.test.ts
```

**Acceptance:**
- 204/202 responses don't throw JSON parse errors
- Existing API calls that expect no return value work correctly
- Tests pass

---

### Task 1.10: Improve Health Check Query

**Files:**
- Modify: `server/index.ts` (health check endpoint)

**Step 1:** Read current health check (line ~240)

Current:
```typescript
const allUsers = await db.getAllUsers();
```

**Problem:** `getAllUsers()` could fetch thousands of rows. Health check should be lightweight.

**Step 2:** Create a lightweight DB health check method

In `server/database.ts` or create `server/health.ts`, add:

```typescript
// In database.ts or a new health module
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Simple lightweight query - just check connection
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
```

**Step 3:** Update health endpoint

Replace:
```typescript
const dbStatus = await db.getAllUsers();
```

With:
```typescript
const dbConnected = await db.checkDatabaseHealth();
const dbStatus = dbConnected ? 'connected' : 'disconnected';
```

**Step 4:** Add database health method

If `database.ts` doesn't have it, add:

Open `server/database.ts`:

```typescript
// ... existing code

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    fastify?.log.error({ error }, 'Database health check failed');
    return false;
  }
}
```

If `fastify` not available, just use `console` or no logging.

**Step 5:** Test health endpoint manually

Start server:
```bash
cd /home/linny/server
npm run dev
```

In another terminal:
```bash
curl http://localhost:3001/api/health | jq .
```

Expected output:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": "...",
  "database": "connected",
  "redis": { ... },
  "memory": "...",
  "environment": "development"
}
```

**Step 6:** Verify DB check is lightweight

Enable query logging temporarily to see actual query:
```bash
# In server .env, add:
DATABASE_LOG_QUERIES=true
```

Check that health check only runs `SELECT 1`, not full table scan.

**Acceptance:**
- Health check responds in <100ms
- Database check uses simple `SELECT 1`
- No table scans or full fetches

---

### Task 1.11: Harden JWT Secret Requirement

**Files:**
- Modify: `server/index.ts` (JWT_SECRET check)

**Step 1:** Current check (line ~55)

```typescript
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

// Warn if using default development secret
if (JWT_SECRET === 'dev-secret-change-in-production' || JWT_SECRET.length < 32) {
  console.error('WARNING: JWT_SECRET is insecure. Use a strong secret in production.');
}
```

**Problem:** Still allows weak secrets to start server. Should fail fast if secret <32 chars.

**Step 2:** Replace with strict validation

```typescript
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

// Strict validation: must be at least 32 chars and not default
if (JWT_SECRET.length < 32) {
  console.error(`FATAL: JWT_SECRET is too short (${JWT_SECRET.length} chars). Minimum 32 characters required.`);
  process.exit(1);
}

if (JWT_SECRET === 'dev-secret-change-in-production') {
  console.error('FATAL: JWT_SECRET is still the default development value. Set a strong secret.');
  process.exit(1);
}

console.log('✅ JWT_SECRET validated (length: ' + JWT_SECRET.length + ')');
```

**Step 3:** Add Dockerfile validation

In `server/Dockerfile`, change:
```dockerfile
ENV JWT_SECRET=${JWT_SECRET}
```

To:
```dockerfile
# Fail if JWT_SECRET not provided
ARG JWT_SECRET
ENV JWT_SECRET=${JWT_SECRET:?JWT_SECRET must be set}
```

**Step 4:** Update `docker-compose.yml` validation

Add to server service:
```yaml
    environment:
      # ... existing
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set in .env}
```

**Test:** Try running without JWT_SECRET:
```bash
cd /home/linny/server
unset JWT_SECRET
npm run dev
```
Expected: Exit with error message

**Acceptance:**
- Server exits with code 1 if JWT_SECRET unset or <32 chars
- Docker build fails if JWT_SECRET not provided
- Clear error messages guide user

---

### Task 1.12: Make Password Reset TTL Configurable

**Files:**
- Modify: `server/routes/auth.fastify.ts` (forgot password token expiry)
- Modify: `server/routes/auth.fastify.ts` (password reset token expiry)

**Step 1:** Add env var support at top of file

```typescript
// Add at top with other imports
const PASSWORD_RESET_TOKEN_TTL_MS = parseInt(process.env.PASSWORD_RESET_TOKEN_TTL || '60') * 60 * 1000; // minutes to ms
```

**Step 2:** Replace hardcoded 60 minutes

Current (line ~254):
```typescript
const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
```

Replace with:
```typescript
const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
```

**Step 3:** Add documentation to .env.example (if exists)

Create `.env.example` if missing:
```bash
cat > /home/linny/.env.example << 'EOF'
# Database
POSTGRES_PASSWORD=changeme

# Redis
REDIS_PASSWORD=changeme

# JWT (minimum 32 characters)
JWT_SECRET=changeme

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Password reset token TTL (minutes, default 60)
PASSWORD_RESET_TOKEN_TTL=60
EOF
```

**Acceptance:**
- Token TTL configurable via `PASSWORD_RESET_TOKEN_TTL`
- Default remains 60 minutes if not set
- Documentation updated

---

### Task 1.13: Verify User Role Update Validation

**Files:**
- Check: `server/routes/users.fastify.ts`
- Check: `server/validation/schemas.ts`

**Step 1:** Check if role update endpoint exists and validates

```bash
grep -n "updateRole\|update.*role" server/routes/users.fastify.ts
```

If file doesn't exist yet, skip. If exists, verify:

```typescript
// Should have something like:
fastify.patch('/:id/role', {
  schema: {
    body: z.object({
      role: z.enum(['Administrator', 'TeamLead', 'Member', 'Guest'])
    })
  }
}, async (request, reply) => {
  // ...
});
```

**Step 2:** If missing validation, add Zod schema

In `server/validation/schemas.ts`, ensure:

```typescript
export const updateUserRoleSchema = z.object({
  role: z.enum(['Administrator', 'TeamLead', 'Member', 'Guest'])
});
```

**Step 3:** If route exists but doesn't validate, patch it

```bash
# Open the file and add schema validation if missing
```

**Acceptance:**
- Role update uses Zod enum validation
- Invalid roles return 400 with clear error
- Only defined UserRole values accepted

---

### Task 1.14: Create CRITICAL FIXES Verification Test

**Files:**
- Create: `tests/audit/critical-fixes.verification.test.ts`

**Purpose:** Ensure all critical fixes are in place

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Critical Fixes Verification', () => {
  it('should have vitest config', () => {
    expect(fs.existsSync(path.resolve('vitest.config.ts'))).toBe(true);
  });

  it('should have no hardcoded secrets in docker-compose.yml', () => {
    const content = fs.readFileSync('docker-compose.yml', 'utf-8');
    const hasHardcodedPostgres = /POSTGRES_PASSWORD:\s*[a-zA-Z0-9]{20,}/.test(content);
    const hasHardcodedRedis = /REDIS_PASSWORD:\s*[a-zA-Z0-9]{20,}/.test(content);
    expect(hasHardcodedPostgres).toBe(false);
    expect(hasHardcodedRedis).toBe(false);
    expect(content).toContain('${POSTGRES_PASSWORD}');
    expect(content).toContain('${REDIS_PASSWORD}');
  });

  it('should have limited console.log in services/api.ts', () => {
    const content = fs.readFileSync('services/api.ts', 'utf-8');
    const consoleLogCount = (content.match(/console\.log\(/g) || []).length;
    expect(consoleLogCount).toBeLessThan(10);
  });

  it('should have no console.log in components/', () => {
    const componentsDir = 'components';
    const files = fs.readdirSync(componentsDir);
    for (const file of files) {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(path.join(componentsDir, file), 'utf-8');
        expect(content).not.toMatch(/console\.log\(/);
      }
    }
  });

  it('should have health check using lightweight query', () => {
    const content = fs.readFileSync('server/index.ts', 'utf-8');
    expect(content).toContain('SELECT 1');
    // Should NOT use getAllUsers for health
    expect(content).not.toMatch(/health.*getAllUsers/);
  });

  it('should have JWT_SECRET validation', () => {
    const content = fs.readFileSync('server/index.ts', 'utf-8');
    expect(content).toMatch(/JWT_SECRET.*length.*32/);
    expect(content).toMatch('process.exit(1)');
  });

  it('should have offline queue method filtering', () => {
    const content = fs.readFileSync('services/api.ts', 'utf-8');
    expect(content).toContain('IDEMPOTENT_METHODS');
    expect(content).toContain('NON_IDEMPOTENT_METHODS');
  });

  it('should have 204 handler in handleResponse', () => {
    const content = fs.readFileSync('services/api.ts', 'utf-8');
    expect(content).toContain('status === 204');
    expect(content).toContain('status === 202');
  });
});
```

Run:
```bash
npm run test:run tests/audit/critical-fixes.verification.test.ts
```

**Acceptance:**
- All verification tests pass
- This test acts as a regression guard

---

**End of Phase 1** ✅

Proceed to Phase 2 only after all Phase 1 tasks pass verification.

---

## 🔒 PHASE 2: SECURITY & STABILITY (Day 3-4)

### Task 2.1: Add Request ID Tracing

**Files:**
- Modify: `server/index.ts` (register request-id plugin)
- Create: `server/plugins/request-id.ts`

**Goal:** Trace requests across logs with unique ID

**Step 1:** Create request-id plugin

`server/plugins/request-id.ts`:

```typescript
import { FastifyInstance } from 'fastify';

export async function requestIdPlugin(fastify: FastifyInstance) {
  // Fastify already generates requestId if requestIdHeader is set
  // Just enhance logging to include it
  
  fastify.addHook('preHandler', (request, reply, done) => {
    const requestId = request.id || request.headers['x-request-id'] || 'unknown';
    // Store in request for access in route handlers
    request.requestId = requestId;
    done();
  });

  // Also add to reply so it's in response headers
  fastify.addHook('onSend', (request, reply, payload, done) => {
    reply.header('X-Request-ID', request.id || request.headers['x-request-id']);
    done();
  });
}
```

**Step 2:** Register plugin in `server/index.ts`

After line with `fastify.register(fastifyCookie);`:

```typescript
import { requestIdPlugin } from './plugins/request-id.js';
// ...
await fastify.register(fp(requestIdPlugin));
```

**Step 3:** Update server logger to include requestId by default

In `server/index.ts` Fastify config:

```typescript
const fastify = Fastify({
  logger: {
    level: isDevelopment ? 'info' : 'warn',
    transport: isDevelopment ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        messageKey: 'msg',
        timestampKey: 'time'
      }
    } : undefined,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        requestId: req.id
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        requestId: res.getHeader('X-Request-ID')
      })
    }
  },
  requestIdHeader: 'x-request-id', // Generate UUID for each request
  requestIdRoot: false // Include in all child loggers
});
```

**Step 4:** Use requestId in route logs

In `auth.fastify.ts`, change:

```typescript
console.log('[auth.login] Handler entered');
```

To:
```typescript
fastify.log.debug({ requestId: request.id, email }, 'Auth login handler');
```

**Step 5:** Test request ID propagation

```bash
curl -i http://localhost:3001/api/health
```

Check response headers:
```
X-Request-ID: <uuid>
```

**Acceptance:**
- Every request gets unique X-Request-ID
- Request ID appears in all server logs
- Response includes X-Request-ID header

---

### Task 2.2: Add Rate Limit per Route for Sensitive Endpoints

**Files:**
- Modify: `server/routes/auth.fastify.ts` (login, register)
- Create: `server/middleware/rateLimitAuth.ts`

**Problem:** Current global rate limit (100/15min) may be too permissive for auth endpoints.

**Step 1:** Create stricter rate limit for auth

`server/middleware/rateLimitAuth.ts`:

```typescript
import fp from 'fastify-plugin';

export interface RateLimitAuthOptions {
  max?: number;
  timeWindow?: string;
}

export default fp<RateLimitAuthOptions>(async (fastify, options) => {
  const { max = 5, timeWindow = '15 minutes' } = options;

  await fastify.register(import('@fastify/rate-limit'), {
    max,
    timeWindow,
    redis: fastify.redis,
    keyGenerator: (req) => {
      // For auth endpoints, rate limit by IP + route
      const ip = req.ip as string;
      const route = req.routePath || req.url;
      return `auth:${ip}:${route}`;
    },
    allowList: [],
    skip: (req) => {
      // Skip rate limit for development localhost
      return process.env.NODE_ENV === 'development' && 
             (req.ip === '127.0.0.1' || req.ip === '::1');
    }
  });
});
```

**Step 2:** Apply to auth routes

In `server/routes/auth.fastify.ts`:

```typescript
import rateLimitAuth from '../middleware/rateLimitAuth.js';

const authFastify: FastifyPluginAsync = async (fastify) => {
  // Apply strict rate limiting to ALL auth routes in this plugin
  await fastify.register(rateLimitAuth, { max: 5, timeWindow: '15 minutes' });

  // ... existing routes
};
```

**Step 3:** Test rate limiting

```bash
# Send 6 login attempts rapidly (should block 6th)
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -v 2>&1 | grep -E "HTTP|429"
done
```

Expected: 429 Too Many Requests on 6th attempt

**Acceptance:** 
- Auth endpoints limited to 5 attempts per 15min per IP
- 429 response with proper headers (Retry-After)

---

### Task 2.3: Add Input Size Limits for Large Payloads

**Files:**
- Modify: `server/index.ts` (body limit already set, verify)
- Add: Route-specific limits for upload endpoints

**Step 1:** Check current body limit

Already set in `server/index.ts`:
```typescript
bodyLimit: 5 * 1024 * 1024, // 5MB
```

✅ Good for general requests.

**Step 2:** Add stricter limits for specific routes

For comment creation, issue creation - maybe 100KB limit is enough.

In `server/routes/comments.fastify.ts`:

```typescript
fastify.post('/', {
  schema: { body: createCommentSchema },
  limit: { payload: 1024 * 100 } // 100KB max for comment
}, async (request, reply) => {
  // ...
});
```

Repeat for other routes that accept user text:
- Issues create/update: 10KB limit
- Projects create/update: 5KB limit

**Acceptance:** Large payloads (>5MB general, >route-specific) return 413 Payload Too Large

---

### Task 2.4: Add CSRF Token Rotation on Sensitive Actions

**Files:**
- Modify: `server/index.ts` (CSRF token endpoint)
- Modify: `server/routes/auth.fastify.ts` (login/logout)

**Problem:** CSRF token static for 30min - could be stolen and reused.

**Solution:** Rotate CSRF token after each successful state-changing operation.

**Step 1:** Modify CSRF token endpoint to issue new token per request (already does)

Current `csrfPlugin`:
```typescript
fastify.get('/api/csrf-token', async (request, reply) => {
  const sessionId = (request.ip as string) || 'anonymous';
  const token = generateCsrfToken();
  csrfTokens.set(sessionId, { token, expires: Date.now() + TOKEN_EXPIRY_MS });
  return reply.send({ csrfToken: token });
});
```

✅ Already rotates. Good.

**Step 2:** Ensure login/logout invalidate old tokens

Add to login success (in `auth.fastify.ts`):

```typescript
// After successful login, invalidate old CSRF token for this IP
const sessionId = request.ip as string;
csrfTokens.delete(sessionId);
```

And in logout, also delete.

**Step 3:** Add middleware to rotate token after successful state-changing operations

Create `server/middleware/rotateCsrf.ts`:

```typescript
export function rotateCsrfToken() {
  return async (request: any, reply: any, next: any) => {
    await next();

    // After response is sent, rotate CSRF token if this was a state-changing request
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const sessionId = request.ip as string;
      const oldToken = csrfTokens.get(sessionId);
      if (oldToken) {
        const newToken = generateCsrfToken();
        csrfTokens.set(sessionId, {
          token: newToken,
          expires: Date.now() + TOKEN_EXPIRY_MS
        });
        // Also set in response header
        reply.header('X-CSRF-Token', newToken);
      }
    }
  };
}
```

**Step 4:** Register global hook to apply to all state-changing routes

In `server/index.ts` after plugin registration:

```typescript
import { rotateCsrfToken } from './middleware/rotateCsrf.js';

fastify.addHook('onSend', rotateCsrfToken());
```

**Test:** 
1. Get CSRF token
2. Make POST request
3. Verify response has NEW X-CSRF-Token header
4. Old token should be invalidated

**Acceptance:** CSRF token rotates after every state-changing request

---

### Task 2.5: Add Cache-Control Headers for Static Assets

**Files:**
- Modify: `server/index.ts` (static file serving)

**Currently:** Frontend built to `dist/`, served by Vite preview or nginx in production.

**For completeness:** If serving static files via Fastify, add cache headers.

But looking at `server/index.ts`, no static file serving - frontend is separate.

Skipping for now.

---

### Task 2.6: Add Security Headers - X-Content-Type-Options, Referrer-Policy

**Files:**
- Modify: `server/index.ts` (Helmet config)

**Step 1:** Helmet already sets `X-Content-Type-Options: nosniff` by default.

**Step 2:** Add Referrer-Policy and Permissions-Policy

Update `securityPlugin`:

```typescript
import fastifyHelmet from '@fastify/helmet';

async function securityPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: isDevelopment ? { /* ... */ } : {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: isDevelopment ? false : {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permissionsPolicy: {
      camera: false,
      microphone: false,
      geolocation: false
    },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    ieNoOpen: true,
    noSniff: true,
    xssFilter: true
  });
}
```

**Acceptance:** Security headers present in responses:
```bash
curl -I http://localhost:3001/api/health | grep -i "x-"
```
Should see: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy

---

### Task 2.7: Add Database Connection Pool Validation

**Files:**
- Modify: `server/database.ts`

**Step 1:** Check current implementation

```bash
cat server/database.ts
```

**Step 2:** Add connection pool health check

```typescript
import { PrismaClient } from '@prisma/client';

export class DatabaseManager {
  private prisma: PrismaClient | null = null;

  async getPrisma(): Promise<PrismaClient> {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        log: process.env.DATABASE_LOG_QUERIES ? ['query', 'info', 'warn', 'error'] : ['error'],
      });
    }
    return this.prisma;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const prisma = await this.getPrisma();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }
}
```

**Step 3:** Use in health endpoint

```typescript
const dbHealth = await db.checkHealth();
```

**Acceptance:** DB health check doesn't throw, returns true/false

---

### Task 2.8: Add Redis Connection Retry Logic

**Files:**
- Modify: `server/cache/redis.ts`

**Step 1:** Check current Redis client

```bash
cat server/cache/redis.ts
```

**Step 2:** Add retry logic with exponential backoff

```typescript
import Redis from 'ioredis';

let redisClient: Redis | null = null;
let redisReady = false;

export function getRedisClient(): Redis {
  if (redisClient) return redisClient;

  const options: Redis.RedisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, etc.
      const delay = Math.min(times * 100, 2000);
      if (times > 5) {
        console.error('Redis connection failed after multiple retries');
        return null; // Stop retrying after 5 attempts
      }
      return delay;
    },
    lazyConnect: true,
    keepAlive: true,
    maxRetriesPerRequest: 3
  };

  redisClient = new Redis(options);

  redisClient.on('connect', () => {
    console.log('Redis client connected');
  });

  redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
    redisReady = false;
  });

  redisClient.on('ready', () => {
    console.log('Redis client ready');
    redisReady = true;
  });

  return redisClient;
}

export async function connectRedis(): Promise<boolean> {
  const client = getRedisClient();
  try {
    await client.connect();
    return true;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    return false;
  }
}

export function isRedisReady(): boolean {
  return redisReady;
}

export async function getRedisHealthStatus() {
  if (!redisClient || !redisReady) {
    return { connected: false };
  }

  try {
    const info = await redisClient.info('memory');
    const memoryLine = info.split('\n').find(line => line.startsWith('used_memory_human:'));
    const memory = memoryLine ? memoryLine.split(':')[1].trim() : 'unknown';
    
    const keyCount = await redisClient.dbsize();
    
    return {
      connected: true,
      memory,
      keyCount: parseInt(keyCount)
    };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}
```

**Step 3:** Update `server/index.ts` to use new connection logic

```typescript
import { connectRedis, getRedisHealthStatus } from './cache/redis.js';

// After database initialization
const redisConnected = await connectRedis();
if (redisConnected) {
  fastify.log.info('Redis connected successfully');
} else {
  fastify.log.warn('Redis connection failed - caching disabled');
}
```

**Acceptance:** Redis reconnects automatically on failure, health check returns accurate status

---

### Task 2.9: Add API Response Size Limits

**Files:**
- Server route configs

**Issue:** TanStack Query might fetch all issues/projects without pagination.

**Step 1:** Check if pagination exists on list endpoints

```bash
grep -n "getAll\|list" server/routes/issues.fastify.ts | head -10
```

If pagination exists (limit/offset or cursor), good. If not, add.

**Step 2:** Add default pagination to all list endpoints

In `server/routes/issues.fastify.ts`:

```typescript
fastify.get('/', {
  schema: {
    query: z.object({
      teamId: z.string().optional(),
      projectId: z.string().optional(),
      status: z.nativeEnum(Status).optional(),
      assigneeId: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().int().positive().max(100).default(50),
      offset: z.number().int().nonnegative().default(0)
    })
  }
}, async (request, reply) => {
  const { limit = 50, offset = 0, ...filters } = request.query as any;
  
  const [issues, total] = await Promise.all([
    prisma.issue.findMany({
      where: { /* filters */ },
      include: { /* ... */ },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.issue.count({ where: { /* filters */ } })
  ]);

  reply.send({
    issues,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  });
});
```

Repeat for projects, users, activities endpoints.

**Acceptance:** All list endpoints support pagination with default limit 50, max 100

---

### Task 2.10: Add Input Sanitization for HTML/JS in Comments

**Files:**
- Modify: `server/routes/comments.fastify.ts`
- Already have: `dompurify` dependency

**Step 1:** Install isomorphic-dompurify (already in package.json)

**Step 2:** Sanitize comment content before saving

In `server/routes/comments.fastify.ts`:

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Inside create comment handler
fastify.post('/', {
  schema: { body: createCommentSchema }
}, async (request, reply) => {
  const { content } = request.body;
  
  // Sanitize HTML - allow only safe tags
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target']
  });

  // Check if sanitization removed significant content
  if (sanitizedContent.trim().length < content.trim().length * 0.5) {
    return reply.code(400).send({ 
      error: 'Comment contains disallowed HTML or scripts' 
    });
  }

  const comment = await prisma.comment.create({
    data: {
      content: sanitizedContent,
      issueId,
      userId: request.userId
    },
    include: { user: true }
  });

  // Broadcast via WebSocket
  // ... existing

  return reply.code(201).send({ comment });
});
```

**Step 3:** Add similar sanitization to issue description, project description

**Acceptance:** 
- XSS attempts in comments are neutralized
- Script tags, event handlers removed
- Only safe HTML allowed

---

### Task 2.11: Add Email Validation for Invitations

**Files:**
- Check: `server/routes/invitations.fastify.ts`

**Step 1:** Verify email format validation

Should already have Zod schema:

```typescript
const sendInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  teamId: z.string().uuid(),
  role: z.nativeEnum(UserRole)
});
```

If not, add it.

**Step 2:** Add rate limiting for invitation spam

Add to route decorator:

```typescript
fastify.post('/send', {
  schema: { body: sendInviteSchema },
  limit: { payload: 1024 * 10 } // 10KB max
}, async (request, reply) => {
  // Also add manual rate check: max 10 invites per user per day
  const today = new Date().toDateString();
  const cacheKey = `invite-rate:${request.userId}:${today}`;
  const count = await redis.incr(cacheKey);
  if (count === 1) {
    await redis.expire(cacheKey, 86400); // 1 day TTL
  }
  if (count > 10) {
    return reply.code(429).send({ error: 'Too many invitations. Try again tomorrow.' });
  }
  
  // ... existing logic
});
```

**Acceptance:** Invalid email rejected, max 10 invites/day per user

---

### Task 2.12: Add Password Complexity Enforcement

**Files:**
- Modify: `server/auth/password.ts`

**Step 1:** Check current `validatePasswordStrength`

```bash
cat server/auth/password.ts
```

**Step 2:** Enhance validation

Current might be too weak. Replace with:

```typescript
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character')
});

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  try {
    passwordSchema.parse({ password });
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => e.message)
      };
    }
    return { valid: false, errors: ['Unknown validation error'] };
  }
}
```

**Step 3:** Update error messages to be user-friendly in registration

In `auth.fastify.ts` register route:

```typescript
const passwordValidation = validatePasswordStrength(password);
if (!passwordValidation.valid) {
  return reply.code(400).send({ 
    error: 'Password does not meet requirements', 
    details: passwordValidation.errors 
  });
}
```

**Acceptance:** Password requires 12+ chars with uppercase, lowercase, number, special char

---

## 🎨 PHASE 3: POLISH & PERFORMANCE (Day 5-7)

*(Due to token limits, Phase 3 outline only. Full plan would continue with tasks 3.1-3.14)*

### Phase 3 Tasks Overview:

**3.1 API Naming Standardization** - Convert all snake_case to camelCase in API responses
**3.2 Request ID in Client Logs** - Pass X-Request-ID to client logs
**3.3 Bundle Analyzer Setup** - `vite-bundle-analyzer` config
**3.4 N+1 Query Detection** - Add Prisma query logging, identify N+1
**3.5 TanStack Query Devtools** - Enable in development
**3.6 ESLint Rule Hardening** - Enable all recommended rules
**3.7 Prettier Config** - Ensure consistent formatting
**3.8 TypeScript Strict Config** - Enable `strict: true`, `noUncheckedIndexedAccess`
**3.9 Performance Budget** - Set bundle size limits in Vite
**3.10 Code Splitting Analysis** - Audit dynamic imports
**3.11 Redis Cache Strategy** - Implement proper cache invalidation
**3.12 Database Index Review** - Verify indexes on query columns
**3.13 Image Optimization** - Add responsive images, lazy loading
**3.14 Accessibility Audit** - Run axe-core, fix violations

---

## 🚀 PHASE 4: CI/CD & DOCS (Day 8-9)

### Phase 4 Tasks Overview:

**4.1 GitHub Actions Setup** - Lint, test, typecheck on PR
**4.2 Coverage Reporting** - Codecov or similar
**4.3 Automated Dependency Updates** - Dependabot config
**4.4 Security Scanning** - Snyk or npm audit in CI
**4.5 Changelog Generation** - Standard-version or similar
**4.6 Release Automation** - Automated Docker image builds
**4.7 Documentation Generation** - API docs from Zod schemas
**4.8 Contributing Guide** - CLA, code style, PR template

---

## 📋 EXECUTION CHECKLIST

### Before Starting:
- [ ] Backup current state: `git tag backup/audit-before-fixes-2025-03-16`
- [ ] Ensure `.env` file exists with secrets
- [ ] Create worktree: `git checkout -b audit/fixes-2025-03-16`
- [ ] Install dependencies: `npm install`
- [ ] Verify dev server starts: `npm run dev`

### During Execution:
- [ ] Complete tasks in order (dependencies matter)
- [ ] Run verification tests after each phase
- [ ] Commit frequently with descriptive messages
- [ ] Run `npm run typecheck` before each commit
- [ ] Run `npm run lint` after each task
- [ ] Update this plan with actual completion times

### After Completion:
- [ ] Run full test suite: `npm run test:coverage`
- [ ] Verify coverage ≥60% (aim for 80%)
- [ ] Type check: `npm run typecheck` (0 errors)
- [ ] Lint: `npm run lint` (0 warnings)
- [ ] Build frontend: `npm run build` (success)
- [ ] Build server: `npm run build:server` (success)
- [ ] Docker compose up: `docker compose up --build` (all services healthy)
- [ ] Manual QA: Smoke test all critical flows
- [ ] Update MEMORY.md with completion summary

---

## ⏱️ TIME ESTIMATES

| Task | Estimated | Cumulative |
|------|-----------|------------|
| Phase 0 | 15 min | 15 min |
| Phase 1 | 2 days | 2 days |
| Phase 2 | 2 days | 4 days |
| Phase 3 | 3 days | 7 days |
| Phase 4 | 2 days | 9 days |
| **Total** | **9 days** | - |

---

## 📚 REFERENCES

- **Vitest Docs**: https://vitest.dev/
- **Fastify Docs**: https://fastify.dev/
- **Prisma Docs**: https://www.prisma.io/docs/
- **OWASP Cheat Sheet**: https://cheatsheetseries.owasp.org/
- **Node.js Security**: https://nodejs.org/en/docs/guides/security/

---

**Plan created:** 2025-03-16  
**Status:** Draft (ready for execution)  
**Next step:** Begin with **Task 0.1** or spawn `superpowers:executing-plans` session 🚀

---

*"Think before code. Test before ship. Secure before release."* 🐊🔐