# UI Bugfixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 4 functional UI bugs reported from real usage — ActivityFeed crash on team switch, UserAvatar oversized initials, DatePicker clipping at viewport bottom, NotificationPopover missing outside-click + mark-all-read.

**Architecture:** All fixes in React components under `components/`. Each is a small surgical change with an audit-style regression test.

**Tech Stack:** React 19, TypeScript, Tailwind, TanStack Query, Vitest.

---

## Sequencing

4 commits, one PR. Order:

1. ActivityFeed null guard
2. UserAvatar text size shrink
3. DatePicker viewport flip
4. NotificationPopover: outside-click + mark-all-read

Each task has a regression test.

---

## Task 1: ActivityFeed null guard

**Files:**
- Modify: `components/ActivityFeed.tsx:56`
- Test: `tests/audit/activity-feed-null-guard.test.ts`

### Step 1: Write failing test

Create `tests/audit/activity-feed-null-guard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/ActivityFeed.tsx'),
  'utf8'
);

describe('ActivityFeed null guard on payload', () => {
  it('uses optional chaining when reading payload.userId / payload.actorId', () => {
    // Find the actor lookup line
    const line = src.match(/const actor = users\.find[^;]+;/)?.[0] ?? '';
    expect(line).toMatch(/activity\.payload\?\.userId/);
    expect(line).toMatch(/activity\.payload\?\.actorId/);
  });

  it('does NOT use bare activity.payload.userId (would throw on undefined payload)', () => {
    expect(src).not.toMatch(/activity\.payload\.userId/);
    expect(src).not.toMatch(/activity\.payload\.actorId/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/activity-feed-null-guard.test.ts
```
Expected: FAIL on first test's optional-chaining assertion.

### Step 3: Patch ActivityFeed

In `components/ActivityFeed.tsx:56`, change:

```ts
const actor = users.find(u => u.id === (activity.payload as any).userId || (activity.payload as any).actorId);
```

to:

```ts
const actor = users.find(u => u.id === (activity.payload as any)?.userId || (activity.payload as any)?.actorId);
```

(Add `?` before `.userId` and `.actorId`.)

### Step 4: Run test

```bash
npx vitest run tests/audit/activity-feed-null-guard.test.ts
```
Expected: PASS.

### Step 5: Typecheck

```bash
npm run typecheck 2>&1 | grep ActivityFeed | tail -5
```

### Step 6: Commit

```bash
git add components/ActivityFeed.tsx tests/audit/activity-feed-null-guard.test.ts
git commit -m "fix(ui): null-guard activity.payload during team switch"
```

---

## Task 2: Shrink UserAvatar text sizes

**Files:**
- Modify: `components/UserAvatar.tsx:50-55` (sizeClasses)
- Test: `tests/audit/avatar-text-size.test.ts`

### Step 1: Write failing test

Create `tests/audit/avatar-text-size.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/UserAvatar.tsx'),
  'utf8'
);

describe('UserAvatar text sizes', () => {
  it('sm size uses 6px text (not 8px)', () => {
    const sizeClassesBlock = src.match(/sizeClasses\s*=\s*\{[\s\S]*?\}/)?.[0] ?? '';
    const smLine = sizeClassesBlock.match(/sm:\s*['"]([^'"]+)['"]/)?.[1] ?? '';
    expect(smLine).toMatch(/text-\[6px\]/);
    expect(smLine).not.toMatch(/text-\[8px\]/);
  });

  it('md size uses 9px text (not 10px)', () => {
    const sizeClassesBlock = src.match(/sizeClasses\s*=\s*\{[\s\S]*?\}/)?.[0] ?? '';
    const mdLine = sizeClassesBlock.match(/md:\s*['"]([^'"]+)['"]/)?.[1] ?? '';
    expect(mdLine).toMatch(/text-\[9px\]/);
  });

  it('lg size uses 11px text (not 12px)', () => {
    const sizeClassesBlock = src.match(/sizeClasses\s*=\s*\{[\s\S]*?\}/)?.[0] ?? '';
    const lgLine = sizeClassesBlock.match(/lg:\s*['"]([^'"]+)['"]/)?.[1] ?? '';
    expect(lgLine).toMatch(/text-\[11px\]/);
  });

  it('xl size uses 14px text (not 16px)', () => {
    const sizeClassesBlock = src.match(/sizeClasses\s*=\s*\{[\s\S]*?\}/)?.[0] ?? '';
    const xlLine = sizeClassesBlock.match(/xl:\s*['"]([^'"]+)['"]/)?.[1] ?? '';
    expect(xlLine).toMatch(/text-\[14px\]/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/avatar-text-size.test.ts
```
Expected: FAIL on all 4 size assertions.

### Step 3: Patch UserAvatar

In `components/UserAvatar.tsx:50-55`, change:

```ts
const sizeClasses = {
  sm: 'w-4 h-4 text-[8px]',
  md: 'w-6 h-6 text-[10px]',
  lg: 'w-8 h-8 text-[12px]',
  xl: 'w-12 h-12 text-[16px]',
};
```

to:

```ts
const sizeClasses = {
  sm: 'w-4 h-4 text-[6px]',
  md: 'w-6 h-6 text-[9px]',
  lg: 'w-8 h-8 text-[11px]',
  xl: 'w-12 h-12 text-[14px]',
};
```

### Step 4: Run test

```bash
npx vitest run tests/audit/avatar-text-size.test.ts
```
Expected: PASS.

### Step 5: Typecheck

```bash
npm run typecheck 2>&1 | grep UserAvatar | tail -5
```

### Step 6: Commit

```bash
git add components/UserAvatar.tsx tests/audit/avatar-text-size.test.ts
git commit -m "fix(ui): shrink UserAvatar text sizes for small contexts"
```

---

## Task 3: DatePicker viewport flip

**Files:**
- Modify: `components/DatePicker.tsx:38-43` (updateCoords function)
- Test: `tests/audit/datepicker-flip.test.ts`

### Step 1: Write failing test

Create `tests/audit/datepicker-flip.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/DatePicker.tsx'),
  'utf8'
);

describe('DatePicker viewport flip', () => {
  it('updateCoords considers available viewport space', () => {
    // Find the updateCoords function body
    const fnBlock = src.match(/const updateCoords = \(\) => \{[\s\S]*?\};/)?.[0] ?? '';
    expect(fnBlock.length).toBeGreaterThan(0);
    // Must reference window.innerHeight or spaceBelow / openAbove logic
    expect(fnBlock).toMatch(/innerHeight|spaceBelow|openAbove/);
  });

  it('calendar can be positioned above the input when space below is tight', () => {
    const fnBlock = src.match(/const updateCoords = \(\) => \{[\s\S]*?\};/)?.[0] ?? '';
    // Must include logic that subtracts from rect.top (open above)
    expect(fnBlock).toMatch(/rect\.top\s*-\s*\w+/);
  });

  it('left coordinate is clamped to avoid right-edge overflow', () => {
    const fnBlock = src.match(/const updateCoords = \(\) => \{[\s\S]*?\};/)?.[0] ?? '';
    expect(fnBlock).toMatch(/Math\.min|rect\.right|innerWidth/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/datepicker-flip.test.ts
```
Expected: FAIL on the first three assertions.

### Step 3: Patch updateCoords

In `components/DatePicker.tsx`, replace the `updateCoords` function (lines 38-43):

```ts
const updateCoords = () => {
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCoords({ top: rect.bottom + 8, left: rect.left });
    }
};
```

with:

```ts
const updateCoords = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const calendarWidth = 256; // w-64
    const calendarHeight = 320; // approx: header + day grid + padding
    const margin = 8;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < calendarHeight + margin && rect.top > calendarHeight + margin;

    // Clamp left so calendar doesn't overflow right viewport edge
    const maxLeft = window.innerWidth - calendarWidth - margin;
    const left = Math.max(margin, Math.min(rect.left, maxLeft));

    setCoords({
        top: openAbove ? rect.top - calendarHeight - margin : rect.bottom + margin,
        left,
    });
};
```

### Step 4: Run test

```bash
npx vitest run tests/audit/datepicker-flip.test.ts
```
Expected: PASS.

### Step 5: Typecheck

```bash
npm run typecheck 2>&1 | grep DatePicker | tail -5
```

### Step 6: Commit

```bash
git add components/DatePicker.tsx tests/audit/datepicker-flip.test.ts
git commit -m "fix(ui): flip DatePicker above input when viewport space is tight"
```

---

## Task 4: NotificationPopover outside-click + mark-all-read

**Files:**
- Modify: `components/NotificationPopover.tsx` (add outside-click handler, "mark all read" button + mutation)
- Modify: `components/Header.tsx:170-176` (pass `onClose` callback to popover)
- Test: `tests/audit/notification-outside-click.test.ts`

### Step 1: Write failing test

Create `tests/audit/notification-outside-click.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../components/NotificationPopover.tsx'),
  'utf8'
);

describe('NotificationPopover outside-click + mark all read', () => {
  it('declares an onClose prop', () => {
    expect(src).toMatch(/onClose/);
    expect(src).toMatch(/interface NotificationPopoverProps[\s\S]*?onClose/);
  });

  it('adds mousedown listener via useEffect to detect outside clicks', () => {
    expect(src).toMatch(/useEffect/);
    expect(src).toMatch(/addEventListener\(['"]mousedown['"]/);
  });

  it('uses a ref to detect whether the click target is inside the popover', () => {
    expect(src).toMatch(/useRef/);
    expect(src).toMatch(/\.contains\(/);
  });

  it('renders a "Mark all read" button in the header', () => {
    expect(src).toMatch(/Mark all read/i);
  });

  it('wires the button to api.notifications.markAllRead via useMutation', () => {
    expect(src).toMatch(/markAllRead/);
    expect(src).toMatch(/useMutation/);
  });

  it('uses optimistic update to mark all notifications as read in the cache', () => {
    expect(src).toMatch(/setQueryData/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/notification-outside-click.test.ts
```
Expected: FAIL on all assertions (none of these patterns exist yet).

### Step 3: Patch NotificationPopover

In `components/NotificationPopover.tsx`:

**3a. Add imports** at the top (after existing imports):

```ts
import { useEffect, useRef } from 'react';
```

**3b. Extend the props interface:**

```ts
interface NotificationPopoverProps {
  users: User[];
  onOpenIssue: (issueId: string) => void;
  onClose: () => void;
}
```

**3c. Destructure new prop:**

```ts
export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  users,
  onOpenIssue,
  onClose
}) => {
```

**3d. Add outside-click ref + effect** (after the existing `useNotifications` call):

```ts
const popoverRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
      onClose();
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [onClose]);
```

**3e. Add mark-all-read mutation** (after the existing `markReadMutation`):

```ts
const markAllReadMutation = useMutation({
  mutationFn: () => api.notifications.markAllRead(),

  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: ['notifications'] });
    const previous = queryClient.getQueryData(['notifications']);
    queryClient.setQueryData(['notifications'], (old: Notification[] = []) =>
      old.map(n => n ? { ...n, isRead: true } : n)
    );
    return { previous };
  },

  onError: (err, variables, context) => {
    queryClient.setQueryData(['notifications'], context?.previous);
  },

  onSuccess: () => {
    onClose();
  },
});

const handleMarkAllRead = () => {
  markAllReadMutation.mutate();
};
```

**3f. Wrap the popover root in a ref-attached div.** The current return statements (lines 60-67 and 70+) return a `<div className="absolute top-12 right-0 ...">`. Change the outer `<div>` of BOTH branches to:

```tsx
<div ref={popoverRef} className="absolute top-12 right-0 w-[420px] ...">
```

(Add `ref={popoverRef}` to both empty-state and populated-state root divs.)

**3g. Add "Mark all read" button** to the popover header (currently lines 73-76):

```tsx
<div className="px-6 h-14 border-b border-[#363840]/30 flex items-center justify-between shrink-0">
  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Notification Registry</h3>
  <div className="flex items-center gap-2">
    <span className="text-[10px] bg-[#25262B] px-1.5 py-0.5 rounded text-accent font-mono font-bold">{unreadNotifications.length}</span>
    {unreadNotifications.length > 0 && (
      <button
        onClick={handleMarkAllRead}
        disabled={markAllReadMutation.isPending}
        className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-accent transition-colors disabled:opacity-50"
        title="Mark all as read"
      >
        {markAllReadMutation.isPending ? 'Marking…' : 'Mark all read'}
      </button>
    )}
  </div>
</div>
```

### Step 4: Patch Header to pass onClose

In `components/Header.tsx`, find the NotificationPopover usage (around line 173):

```tsx
{isNotificationOpen && (
  <NotificationPopover
    users={users}
    onOpenIssue={onOpenIssueFromNotification}
  />
)}
```

Change to:

```tsx
{isNotificationOpen && (
  <NotificationPopover
    users={users}
    onOpenIssue={onOpenIssueFromNotification}
    onClose={() => setNotificationOpen(false)}
  />
)}
```

### Step 5: Run test

```bash
npx vitest run tests/audit/notification-outside-click.test.ts
```
Expected: PASS.

### Step 6: Run full audit suite to confirm no regressions

```bash
npx vitest run tests/audit/
```

### Step 7: Typecheck

```bash
npm run typecheck 2>&1 | grep -E "NotificationPopover|Header" | tail -5
```

### Step 8: Commit

```bash
git add components/NotificationPopover.tsx components/Header.tsx tests/audit/notification-outside-click.test.ts
git commit -m "fix(ui): close notification popover on outside click + add Mark all read"
```

---

## Final verification

After all 4 commits:

```bash
npm run typecheck
npm run lint
npx vitest run tests/audit/
npm run build
```

**Manual smoke checklist:**
- [ ] Log in, navigate to a project page (URL like `/team/team-a/project/neo`)
- [ ] Click team switcher top-left → select another team — NO console error
- [ ] Look at small avatar contexts (right sidebar Contributors, IssueModal mentions) — initials fit inside circle
- [ ] Open issue modal, scroll so Start/Due date inputs are near bottom of viewport — calendar opens upward, not clipped
- [ ] Click notification bell in header — popover opens
- [ ] Click outside (e.g., on sidebar) — popover closes
- [ ] Click "Mark all read" — unread count goes to 0, popover closes
- [ ] No new console errors during any of the above

---

## Sequencing recap

- **One PR, 4 commits, 4 new audit test files.**
- Each task independently revertible.
- All changes are component-scoped (no API/backend changes).

---

## Out of scope

- Behavioral/E2E tests for these flows
- WebSocket-triggered notification auto-close
- Mobile responsive adjustments for the new popover button
- Visual redesign beyond what's needed to fix the bugs
