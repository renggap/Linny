# Critical Code Review: Linny Clone

## 1. Critical Issues (Must Fix)

### 🐛 Issue Identifier Collision & Data Integrity
**Severity:** Critical
**File:** `server/routes/issues.fastify.ts`

The logic to generate the next issue identifier (e.g., `TEAM-10`) is fundamentally broken due to string sorting.

```typescript
// Current Code
const highestIssue = await tx.issue.findFirst({
  where: { projectId },
  orderBy: { identifier: 'desc' } // ❌ Sorts alphabetically: "TEAM-9" > "TEAM-10"
});
```
**Impact:** Once a project reaches issue `TEAM-10`, the query will incorrectly return `TEAM-9` as the highest. The system will attempt to create `TEAM-10` again, causing a unique constraint violation or duplicate data.
**Fix:**
- **Short Term:** Fetch top 100 and sort in memory using `parseInt`.
- **Long Term (Recommended):** Add an integer `issueNumber` column to the `Issue` model and sort by that.

### 🔐 XSS Vulnerability: Token Storage
**Severity:** High
**File:** `services/api.ts`

The access token is stored in `localStorage` (`TOKEN_STORAGE_KEY`).
```typescript
localStorage.setItem(TOKEN_STORAGE_KEY, token);
```
**Impact:** Any XSS vulnerability (e.g., in a third-party script or user-generated content) can read `localStorage` and steal the user's session.
**Fix:** Store the access token **only in memory** (React context/state). Rely on the `httpOnly` refresh token cookie to get a new access token on page reload.

### ⛔ Permission Logic Flaw: Team Roles Ignored
**Severity:** High
**File:** `server/routes/teams.fastify.ts` (and middleware)

The `requireAdminOrTeamLead` middleware checks the **Global User Role**, not the **Team Member Role**.
```typescript
// server/middleware/authHooks.ts
if (request.userRole !== 'Administrator' && request.userRole !== 'TeamLead') { ... }
```
**Impact:** A user who is promoted to "Team Lead" within a specific team (in `TeamMember` table) **cannot** add members or manage that team because the middleware checks their global `User` table role.
**Fix:** Update middleware to check `TeamMember` role for the specific `teamId` in the request.

---

## 2. Improvements (Should Fix)

### ⚠️ Security: "requireTeamMember" Misnomer
**File:** `server/middleware/authHooks.ts`
The hook `requireTeamMember` allows access to non-members if the team is "public" (not stealth).
```typescript
if (!membership && (request.userRole as any) !== 'Administrator') {
  // ... if team is NOT stealth, this block is skipped, allowing access
}
```
**Risk:** The name implies strict membership requirement. A developer might use this expecting data privacy, but accidentally expose data from non-stealth teams.
**Fix:** Rename to `requireTeamAccess` or explicitly check `isStealth` in routes where public access is intended.

### ⚡ Performance: Sequential Offline Sync
**File:** `services/api.ts`
The `syncQueuedRequests` function processes offline requests one by one.
```typescript
for (const request of queue) { await fetch(...); }
```
**Impact:** If a user comes online with 50 changes, the app will be unresponsive while it makes 50 sequential round-trips.
**Fix:** Use `Promise.all` with a concurrency limit (e.g., `p-limit`) to process requests in parallel batches.

### 🛡️ Type Safety in API
**File:** `services/api.ts`
Extensive use of `any` in API response handling defeats TypeScript benefits.
```typescript
const data = await handleResponse<{ projects: any[] }>(response);
```
**Fix:** Share `zod` types between server and client (e.g., using `z.infer`) or strictly type the response interfaces in `types.ts` to match backend DTOs.

---

## 3. Security Notes

*   **Password Hashing:** Uses `bcrypt` (salt rounds 10). This is acceptable, but `Argon2id` is the modern standard for new projects.
*   **CSRF Protection:** Good implementation with `X-CSRF-Token` header and separate endpoint.
*   **SQL Injection:** Mitigated by Prisma ORM usage.
*   **Rate Limiting:** Enabled (`100` req/15min) but relatively generous. Consider tightening for sensitive endpoints like `login`.

---

## 4. Performance Notes

*   **Monolithic Frontend Loading:** `App.tsx` fetches users, teams, and projects for the entire workspace on load. This works for < 100 users/issues but will cause massive initial load times as data grows. **Pagination is needed** for these top-level queries.
*   **Prisma N+1 Potential:** Some queries include deep nesting (`include: { assignees: { include: { user: true } } }`). Monitor query times.

---

## 5. Summary

*   **Overall Code Quality Score:** 7/10
*   **Status:** Solid foundation with modern stack (Fastify, Prisma, Vite), but marred by a few critical logic errors in core domains (Auth/Permissions/Data Integrity).

**Top 3 Fixes to Prioritize:**
1.  **Refactor Issue ID Generation** (Prevent duplicates)
2.  **Fix Team Lead Permission Logic** (Enable actual team management)
3.  **Move Access Token to Memory-Only** (Harden security)
