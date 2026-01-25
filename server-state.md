# Server State Ownership Standard

> **Prevent future realtime/state bugs by following these rules.**

---

## Server State Rule

> **Definition:**
> Server state is any data that:
>
> * comes from the backend
> * can change without direct user interaction
> * may be updated by WebSocket or background events

### Examples of Server State:

* comments
* notifications
* activities
* unread counts
* audit logs

### Ownership Rules:

* Server state **MUST** be owned by TanStack Query
* UI components **MUST** render server state directly from `useQuery`
* Server state **MUST NOT** be:

  * stored in App.tsx
  * stored in local `useState`
  * passed via props
  * synced via `useEffect`

---

## WebSocket Rule

> WebSocket handlers may ONLY:
> * patch TanStack Query cache
> * deduplicate by `id`

WebSocket must NEVER:

* update React state
* trigger refetches
* manipulate UI directly

---

## Modal Rule

> Modals are NOT data owners.

Modals:

* must render server state via `useQuery`
* must not sync data on open
* must not store server state locally

---

## Anti-Patterns (Forbidden)

* `issue.comments`
* `props.notifications`
* `useEffect(() => setX(serverData))`
* duplicating server data in local state

---

## Single Source of Truth Principle

> If refresh fixes the bug,
> the mutation worked — the render source is wrong.
