# UI Bugfixes Design

**Date:** 2026-06-29
**Status:** Approved

## Goal

Fix 4 functional bugs reported from real usage:

1. Team switch from project page throws `Cannot read properties of undefined (reading 'userId')`.
2. UserAvatar initials too big for small icon contexts.
3. DatePicker clipped when issue detail near bottom of viewport.
4. Notification popover doesn't close on outside click; missing "mark all read".

## Scope

### Bug 1 — ActivityFeed null guard (`components/ActivityFeed.tsx:56`)

`activity.payload.userId` accessed without null-guard. During team switch, payload can be transiently undefined. Optional-chain the access.

### Bug 2 — UserAvatar text size (`components/UserAvatar.tsx:50-55`)

Fixed px text sizes too large for small containers. Shrink defaults: sm 8→6, md 10→9, lg 12→11, xl 16→14. Note: `className` size overrides won't auto-scale text, but the new defaults are more proportionate and address the reported issue.

### Bug 3 — DatePicker viewport flip (`components/DatePicker.tsx:38-43`)

Calendar portal always positioned below input. Detect viewport space and flip upward when insufficient. Also clamp left edge to avoid right-edge overflow.

### Bug 4 — NotificationPopover polish

- **Outside-click close:** Add `useRef` + `useEffect` with `mousedown` listener in NotificationPopover (or Header). Close popover when click target is outside both trigger button and popover container.
- **Mark all read:** Add button in popover header. Wire to existing `api.notifications.markAllRead()` (frontend API client already has it, backend `PATCH /notifications/read-all` already exists). Use `useMutation` with optimistic update, mirroring the existing single-mark-read pattern.

### Out of scope

- Component-level redesign (visual only)
- Mobile responsive pass
- WebSocket reconnect logic for notification live updates
- Edge cases for avatar className size overrides (deferred — fix the reported case now)

## Approach

**Ship cadence:** Single branch, 4 commits, one PR.

**Commit order:**
1. ActivityFeed null guard
2. UserAvatar text size
3. DatePicker viewport flip
4. NotificationPopover: outside-click + mark-all-read

## Testing strategy

All audit-style source-pattern tests:

| # | Fix | Test file |
|---|-----|-----------|
| 1 | ActivityFeed null guard | `tests/audit/activity-feed-null-guard.test.ts` |
| 2 | UserAvatar text size | `tests/audit/avatar-text-size.test.ts` |
| 3 | DatePicker viewport flip | `tests/audit/datepicker-flip.test.ts` |
| 4 | NotificationPopover polish | `tests/audit/notification-outside-click.test.ts` |

TDD per fix: failing test → implement → passing test → commit.

## Risk analysis

| Fix | Risk | Mitigation |
|---|---|---|
| 1 | None — strictly additive null guard | n/a |
| 2 | Existing avatar callers may rely on larger text | New sizes are visually subtle |
| 3 | Calendar position math could be wrong on edge cases | Clamp both top and left |
| 4 | Outside-click could fire on legitimate child clicks | Listener checks `contains()` on wrapper div |

## Ship readiness

Branch merges when:
- All 4 commits land
- All audit tests pass
- Manual smoke: switch team on project page, open issue modal near bottom, click notification bell + outside + mark-all-read
