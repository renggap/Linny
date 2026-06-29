# Porsche-inspired Lightning Blue Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Visual polish of the existing Neo Linear UI — Porsche Design System-inspired aesthetic with dark default, sharp corners, Inter Tight font, electric blue (#0066FF) accent replacing the current purple (#5E6AD2), and migration from `framer-motion` to `motion`.

**Architecture:** Tokens-first (CSS variables + Tailwind config + font), then mechanical color sweep across ~35 files, then motion import migration across 19 files, then radius/spacing polish, then component-level polish for Header/Sidebar/modals.

**Tech Stack:** React 19, Tailwind CSS, framer-motion → motion, @fontsource-variable/inter-tight, Vitest.

---

## Sequencing

6 tasks, one PR. Order matters:

1. Foundation tokens (index.css, tailwind.config.js, font install)
2. Color sweep (mechanical find/replace across ~35 component files)
3. Motion library migration (19 components)
4. Radius + spacing polish
5. Header + Sidebar polish
6. Modal polish

Each task has a regression test where applicable.

---

## Task 1: Foundation tokens

**Files:**
- Modify: `index.css` (CSS variables for colors, typography, shadows)
- Modify: `tailwind.config.js` (font family, accent color tokens, default border radius)
- Modify: `package.json` (add `@fontsource-variable/inter-tight`)
- Test: `tests/audit/design-tokens.test.ts`

### Step 1: Write failing test

Create `tests/audit/design-tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const cssSrc = fs.readFileSync(path.resolve(__dirname, '../../index.css'), 'utf8');
const tailwindSrc = fs.readFileSync(path.resolve(__dirname, '../../tailwind.config.js'), 'utf8');
const pkgSrc = fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8');

describe('design tokens', () => {
  it('index.css defines --accent-color: #0066FF', () => {
    expect(cssSrc).toMatch(/--accent-color:\s*#0066FF/i);
  });

  it('index.css defines accent-hover and accent-pressed shades', () => {
    expect(cssSrc).toMatch(/--accent-hover:\s*#0052CC/i);
    expect(cssSrc).toMatch(/--accent-pressed:\s*#003D99/i);
  });

  it('index.css dark mode bg-primary is the new charcoal (#0E0F12)', () => {
    // Find inside .dark block
    const darkBlock = cssSrc.match(/\.dark\s*\{[\s\S]*?\}/)?.[0] ?? '';
    expect(darkBlock).toMatch(/--bg-primary:\s*#0E0F12/i);
  });

  it('tailwind.config.js maps accent colors', () => {
    expect(tailwindSrc).toMatch(/accent:/);
    expect(tailwindSrc).toMatch(/DEFAULT:\s*['"]var\(--accent-color\)['"]/);
  });

  it('tailwind.config.js sets Inter Tight as sans font', () => {
    expect(tailwindSrc).toMatch(/Inter Tight/);
  });

  it('tailwind.config.js sets default border radius to 0', () => {
    expect(tailwindSrc).toMatch(/borderRadius:\s*\{[\s\S]*?DEFAULT:\s*['"]0px?['"]/);
  });

  it('package.json includes @fontsource-variable/inter-tight', () => {
    expect(pkgSrc).toMatch(/@fontsource-variable\/inter-tight/);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/design-tokens.test.ts
```
Expected: most assertions FAIL.

### Step 3: Install Inter Tight

```bash
npm install @fontsource-variable/inter-tight --no-audit --no-fund
```

### Step 4: Patch `index.css`

Replace the dark-mode block (lines 27-41) and light-mode block (lines 11-25):

```css
:root {
  /* Light theme colors */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F3F4F6;
  --bg-tertiary: #E5E7EB;
  --text-primary: #0E0F12;
  --text-secondary: #4B5563;
  --text-tertiary: #9CA3AF;
  --border-color: #E5E7EB;
  --accent-color: #0066FF;
  --accent-hover: #0052CC;
  --accent-pressed: #003D99;
  --accent-subtle: rgba(0, 102, 255, 0.12);
  --shadow-color: rgba(0, 0, 0, 0.1);
  --shadow-popover: 0 8px 32px rgba(0, 0, 0, 0.15);
  --scrollbar-thumb: #3F414D;
  --scrollbar-thumb-hover: #52545E;
}

.dark {
  /* Dark theme colors — Porsche-inspired charcoal */
  --bg-primary: #0E0F12;
  --bg-secondary: #16181D;
  --bg-tertiary: #1E2128;
  --text-primary: #F5F6F8;
  --text-secondary: #A8ACB5;
  --text-tertiary: #6B7079;
  --border-color: #2A2D35;
  --accent-color: #0066FF;
  --accent-hover: #0052CC;
  --accent-pressed: #003D99;
  --accent-subtle: rgba(0, 102, 255, 0.12);
  --shadow-color: rgba(0, 0, 0, 0.3);
  --shadow-popover: 0 8px 32px rgba(0, 0, 0, 0.4);
  --scrollbar-thumb: #2A2D35;
  --scrollbar-thumb-hover: #3A3D45;
}
```

Also update `body` font-family (line 45):

```css
body {
  font-family: "Inter Tight Variable", "Inter Tight", "Inter", system-ui, -apple-system, sans-serif;
  /* ...rest unchanged */
}
```

Add at the top of `index.css` after the `@tailwind` directives:

```css
@import '@fontsource-variable/inter-tight';
```

### Step 5: Patch `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
        "./index.tsx"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Inter Tight Variable"', '"Inter Tight"', 'Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                accent: {
                    DEFAULT: 'var(--accent-color)',
                    hover: 'var(--accent-hover)',
                    pressed: 'var(--accent-pressed)',
                    subtle: 'var(--accent-subtle)',
                },
            },
            borderRadius: {
                DEFAULT: '0',
                sm: '0',
                md: '0',
                lg: '0',
                xl: '0',
                '2xl': '0',
                pill: '9999px',
            },
            boxShadow: {
                popover: 'var(--shadow-popover)',
            },
            animation: {
                'fade-in': 'fadeIn 0.15s ease-out',
                'zoom-in-95': 'zoomIn95 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                zoomIn95: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                }
            }
        },
    },
    plugins: [],
}
```

### Step 6: Run test

```bash
npx vitest run tests/audit/design-tokens.test.ts
```
Expected: PASS.

### Step 7: Run full audit suite + typecheck

```bash
npx vitest run tests/audit/
npm run typecheck 2>&1 | grep -E "tailwind|index\.css" | tail -5
```

### Step 8: Commit

```bash
git add index.css tailwind.config.js package.json package-lock.json tests/audit/design-tokens.test.ts
git commit -m "feat(ui): Porsche-inspired tokens — Inter Tight, #0066FF accent, radius 0"
```

---

## Task 2: Color sweep — replace #5E6AD2 with accent token

**Files:**
- Modify: ~35 component files (mechanical sweep)
- Test: `tests/audit/no-legacy-purple.test.ts`

### Step 1: Write failing test

Create `tests/audit/no-legacy-purple.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import glob from 'glob';

const excludePatterns = [
  'server/auth/email.ts',        // Email HTML templates — keep purple (not UI)
  'server/test-email.ts',        // Test fixture
  'utils/consoleBanner.ts',      // ASCII art banner — keep purple
  'index.css',                   // Legacy comment allowed
];

describe('no legacy #5E6AD2 purple in UI source', () => {
  it('components/**/*.tsx contains zero #5E6AD2 literals', () => {
    const files = glob.sync('components/**/*.tsx');
    const offenders: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      if (/#5E6AD2/i.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('App.tsx contains zero #5E6AD2 literals', () => {
    const src = fs.readFileSync('App.tsx', 'utf8');
    expect(src).not.toMatch(/#5E6AD2/i);
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/no-legacy-purple.test.ts
```
Expected: FAIL — list of ~30 component files.

### Step 3: Mechanical sweep

For each file in `components/` and `App.tsx`, replace:

| Old | New |
|---|---|
| `bg-[#5E6AD2]` | `bg-accent` |
| `text-[#5E6AD2]` | `text-accent` |
| `border-[#5E6AD2]` | `border-accent` |
| `focus:border-[#5E6AD2]` | `focus:border-accent` |
| `focus:ring-[#5E6AD2]` | `focus:ring-accent` |
| `hover:bg-[#5E6AD2]` | `hover:bg-accent` |
| `hover:bg-[#4b55aa]` | `hover:bg-accent-hover` |
| `bg-[#5E6AD2]/10` | `bg-accent-subtle` |
| `border-[#5E6AD2]/20` | `border-accent/30` |
| `from-[#5E6AD2]` | `from-accent` |
| `to-[#5E6AD2]` | `to-accent` |
| `ring-[#5E6AD2]` | `ring-accent` |
| `shadow-purple-900/20` | `shadow-accent/20` |
| `shadow-purple-600/30` | `shadow-accent/30` |

Use sed for the bulk replacements, then verify with grep:

```bash
# Replace across all component files
find components -name "*.tsx" -exec sed -i 's/bg-\[#5E6AD2\]/bg-accent/g' {} +
find components -name "*.tsx" -exec sed -i 's/text-\[#5E6AD2\]/text-accent/g' {} +
find components -name "*.tsx" -exec sed -i 's/border-\[#5E6AD2\]/border-accent/g' {} +
find components -name "*.tsx" -exec sed -i 's/focus:border-\[#5E6AD2\]/focus:border-accent/g' {} +
find components -name "*.tsx" -exec sed -i 's/focus:ring-\[#5E6AD2\]/focus:ring-accent/g' {} +
find components -name "*.tsx" -exec sed -i 's/hover:bg-\[#5E6AD2\]/hover:bg-accent/g' {} +
find components -name "*.tsx" -exec sed -i 's/hover:bg-\[#4b55aa\]/hover:bg-accent-hover/g' {} +
find components -name "*.tsx" -exec sed -i 's/bg-\[#5E6AD2\]\/10/bg-accent-subtle/g' {} +
find components -name "*.tsx" -exec sed -i 's/border-\[#5E6AD2\]\/20/border-accent\/30/g' {} +
find components -name "*.tsx" -exec sed -i 's/from-\[#5E6AD2\]/from-accent/g' {} +
find components -name "*.tsx" -exec sed -i 's/to-\[#5E6AD2\]/to-accent/g' {} +
find components -name "*.tsx" -exec sed -i 's/ring-\[#5E6AD2\]/ring-accent/g' {} +
find components -name "*.tsx" -exec sed -i 's/shadow-purple-900\/20/shadow-accent\/20/g' {} +
find components -name "*.tsx" -exec sed -i 's/shadow-purple-600\/30/shadow-accent\/30/g' {} +

# Same for App.tsx
sed -i 's/bg-\[#5E6AD2\]/bg-accent/g; s/text-\[#5E6AD2\]/text-accent/g; s/border-\[#5E6AD2\]/border-accent/g' App.tsx
```

Verify:
```bash
grep -rn "5E6AD2\|4b55aa" components/ App.tsx 2>&1 | head -10
```
Expected: zero matches.

### Step 4: Run test

```bash
npx vitest run tests/audit/no-legacy-purple.test.ts
```
Expected: PASS.

### Step 5: Typecheck + lint

```bash
npm run typecheck 2>&1 | tail -10
npm run lint 2>&1 | tail -10
```

### Step 6: Commit

```bash
git add components/ App.tsx tests/audit/no-legacy-purple.test.ts
git commit -m "refactor(ui): replace #5E6AD2 literals with accent tokens"
```

---

## Task 3: Migrate framer-motion → motion

**Files:**
- Modify: 19 component files
- Modify: `package.json` (add `motion`, remove `framer-motion`)
- Test: `tests/audit/motion-imports.test.ts`

### Step 1: Write failing test

Create `tests/audit/motion-imports.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import glob from 'glob';

describe('motion library migration', () => {
  it('no source file imports from framer-motion', () => {
    const files = [...glob.sync('components/**/*.tsx'), ...glob.sync('contexts/**/*.tsx'), ...glob.sync('hooks/**/*.ts')];
    const offenders: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      if (/from\s+['"]framer-motion['"]/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('motion package is in package.json dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.dependencies).toHaveProperty('motion');
  });

  it('framer-motion is NOT in package.json dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.dependencies).not.toHaveProperty('framer-motion');
  });
});
```

### Step 2: Run test to verify failure

```bash
npx vitest run tests/audit/motion-imports.test.ts
```
Expected: FAIL on first and third assertions.

### Step 3: Install motion, keep framer-motion temporarily

```bash
npm install motion --no-audit --no-fund
```

### Step 4: Migrate imports file-by-file

For each of the 19 components:

```bash
grep -rln "framer-motion" components/
```

For each file, replace `from 'framer-motion'` with `from 'motion/react'`:

```bash
find components -name "*.tsx" -exec sed -i "s/from 'framer-motion'/from 'motion\/react'/g" {} +
```

Verify each file individually compiles (typecheck after the bulk replacement).

### Step 5: Uninstall framer-motion

```bash
npm uninstall framer-motion --no-audit --no-fund
```

### Step 6: Run test

```bash
npx vitest run tests/audit/motion-imports.test.ts
```
Expected: PASS.

### Step 7: Typecheck + full audit suite

```bash
npm run typecheck 2>&1 | tail -10
npx vitest run tests/audit/
```

### Step 8: Commit

```bash
git add components/ package.json package-lock.json tests/audit/motion-imports.test.ts
git commit -m "refactor(ui): migrate framer-motion to motion package"
```

---

## Task 4: Radius + spacing polish

**Files:**
- Modify: component files with `rounded-md`, `rounded-lg`, `p-4` on modals/cards

### Step 1: Audit current radius usage

```bash
grep -rn "rounded-md\|rounded-lg\|rounded-xl\|rounded-2xl" components/ | wc -l
grep -rn "rounded-full" components/ | wc -l
```

The Tailwind config override (radius DEFAULT = 0) makes `rounded` use 0, but explicit `rounded-md` etc. still apply. Need to sweep.

### Step 2: Sweep — remove radius from non-pill elements

```bash
# Replace rounded-md/lg/xl/2xl with nothing (defaults to 0 via config)
find components -name "*.tsx" -exec sed -i 's/ rounded-md//g; s/ rounded-lg//g; s/ rounded-xl//g; s/ rounded-2xl//g' {} +
# Keep rounded-full (pills, avatars, badges)
# Keep conditional like rounded-md: — won't match because of the colon
```

**Manual inspection required:** some elements NEED radius (avatars, status dots, pills). `rounded-full` is preserved. Other radius variants that should be kept:
- `rounded-full` (avatars, dots, pills)
- `rounded-r-full`, `rounded-l-full` (transitional pill shapes)
- Conditional `rounded` based on position — review manually

### Step 3: Increase modal/card padding

Manually edit the modal components (IssueModal, ProjectModal, TeamModal, etc.) to bump `p-4` → `p-6` on the main modal container.

### Step 4: Replace soft shadows

```bash
find components -name "*.tsx" -exec sed -i 's/shadow-lg shadow-purple-900\/20//g; s/shadow-2xl/shadow-popover/g' {} +
```

### Step 5: Typecheck + manual smoke

```bash
npm run typecheck 2>&1 | tail -5
```

Manual: `npm run dev:frontend` and visually inspect.

### Step 6: Commit

```bash
git add components/
git commit -m "refactor(ui): sharp corners (radius 0), p-6 modals, popover shadows"
```

---

## Task 5: Header + Sidebar polish

**Files:**
- Modify: `components/Header.tsx`
- Modify: `components/Sidebar.tsx`

### Step 1: Header changes

Open `components/Header.tsx`. Apply:
- Tighten vertical padding from `py-3` to `py-2.5`.
- Notification dot: change from `bg-accent` to `bg-red-500` (Porsche uses red for alerts, our accent stays for interactive only). Or use `bg-text-tertiary` for neutral.
- Search input: remove remaining `rounded`, use `border-b-2 border-transparent focus:border-accent` (underline-only on focus, Porsche pattern).
- Primary CTA button: `bg-accent text-white px-3 py-1.5 hover:bg-accent-hover`, no `rounded`, replace `shadow-lg shadow-accent/20` with no shadow.

### Step 2: Sidebar changes

Open `components/Sidebar.tsx`. Apply Porsche-style active item:
- Active item: replace full-background highlight with `border-l-2 border-accent bg-bg-tertiary` (left accent bar, subtle bg).
- Inactive hover: `hover:bg-bg-tertiary` only.
- Remove any `rounded` from nav items.
- Section labels: uppercase, `text-xs text-text-tertiary tracking-wider` (Porsche pattern).

### Step 3: Typecheck + smoke

```bash
npm run typecheck 2>&1 | grep -E "Header|Sidebar" | tail -5
```

### Step 4: Commit

```bash
git add components/Header.tsx components/Sidebar.tsx
git commit -m "refactor(ui): Porsche-style Header + Sidebar with left-accent active state"
```

---

## Task 6: Modal polish

**Files:**
- Modify: `components/IssueModal.tsx`, `ProjectModal.tsx`, `TeamModal.tsx`, `WorkspaceSettingsModal.tsx`, `UserManagementModal.tsx`, `PasswordResetModal.tsx`, `JoinRequestManagementModal.tsx`, `ProjectSettingsModal.tsx`, `UserProfileModal.tsx`

### Step 1: Apply consistent modal chrome

For each modal component:
- Outer panel: `bg-bg-secondary border border-border-color shadow-popover` (no `rounded`).
- Header: `p-6 pb-4 border-b border-border-color`.
- Body: `p-6 pt-4`.
- Footer (CTAs): `p-6 pt-4 border-t border-border-color flex justify-end gap-2`.
- Primary CTA: `bg-accent text-white px-4 py-2 hover:bg-accent-hover`.
- Secondary CTA: `bg-transparent border border-border-color text-text-secondary hover:bg-bg-tertiary`.
- Close (X) button: `text-text-tertiary hover:text-text-primary`.

### Step 2: Motion transitions (already migrated in Task 3)

Reduce duration on AnimatePresence transitions from `0.2s` to `0.15s` (micro). Drop any `scale: 0.95` initial — Porsche uses pure opacity for modal entry.

### Step 3: Typecheck + manual smoke each modal

```bash
npm run typecheck 2>&1 | tail -10
npm run dev:frontend
```

Open each modal in the browser, verify chrome.

### Step 4: Commit

```bash
git add components/
git commit -m "refactor(ui): consistent modal chrome — p-6 padding, sharp corners, restrained motion"
```

---

## Final verification

After all 6 commits:

```bash
npm run typecheck
npm run lint
npx vitest run tests/audit/
npm run build  # verify Vite build succeeds
```

**Manual smoke checklist:**
- [ ] `npm run dev` — app boots
- [ ] Login page: Inter Tight loaded, electric blue on focus + button, sharp corners
- [ ] Sidebar: active item has left accent bar, expands/collides smoothly (motion package)
- [ ] BoardView: drag-and-drop works, no rounded cards
- [ ] IssueModal: opens/closes with 0.15s fade, sharp corners, p-6 padding
- [ ] No remaining `#5E6AD2` purple in UI (regression test passes)
- [ ] `grep -r "framer-motion" components/` returns zero
- [ ] Production build succeeds, no console errors

---

## Sequencing recap

- **One PR, 6 commits, 3 new test files.**
- Tasks 1-3 are mechanical (tokens, sweep, migration).
- Tasks 4-6 are component polish (manual inspection).
- Each task is independently revertible.

---

## Out of scope

- Light mode deep rework beyond CSS variable refresh
- Mobile responsive pass
- WCAG audit beyond contrast
- Component-level redesign of layout/IA (visual polish only, not structure)
- Server email HTML templates (keep purple — not UI)
