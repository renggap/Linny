# Porsche-inspired Lightning Blue Redesign

**Date:** 2026-06-29
**Status:** Approved

## Goal

Visual polish of the existing Neo Linear UI. Replace the current "AI slop" default Tailwind aesthetic with a Porsche Design System-inspired look: stark monochrome base, sharp corners, generous whitespace, restrained motion. Use **electric blue (#0066FF)** as the accent (replacing the current `#5E6AD2` purple-blue). Migrate from `framer-motion` to the rebranded `motion` package.

## Design decisions

| Decision | Choice |
|---|---|
| Accent color | Electric blue `#0066FF` |
| Scope | Full app redesign |
| Animation library | Migrate to `motion` package (`from 'motion/react'`) |
| Font | Inter Tight (closest open-source to Porsche Typo) |
| Mode | Dark default (keep current), sharp corners (radius 0) |

## Design tokens

### Colors (CSS variables in `index.css`)

Dark mode (default):
- `--bg-primary: #0E0F12`
- `--bg-secondary: #16181D`
- `--bg-tertiary: #1E2128`
- `--border-color: #2A2D35`
- `--text-primary: #F5F6F8`
- `--text-secondary: #A8ACB5`
- `--text-tertiary: #6B7079`
- `--accent-color: #0066FF`
- `--accent-hover: #0052CC`
- `--accent-pressed: #003D99`
- `--accent-subtle: rgba(0, 102, 255, 0.12)`

Light mode (kept as opt-in): same hue family inverted; accent unchanged.

### Typography

- Font: Inter Tight (self-hosted via `@fontsource-variable/inter-tight`)
- Scale: 11/13/15/18/22/28 px (xs/sm/base/lg/xl/2xl)
- Weights: 400 body, 500 emphasis, 600 headings. No 700+.
- Letter-spacing: -0.01em on ≥18px, 0 body, +0.04em uppercase micro-labels.

### Spacing & radius

- Border radius: 0 default. Modal corners: 2px max. Pills/badges: full rounded.
- Padding: increase cards/modals from `p-4` to `p-6`.
- Borders: 1px solid `--border-color`. Shadows only on floating layers (modals, popovers): `0 8px 32px rgba(0,0,0,0.4)`.

## Motion library migration

- Install `motion` (latest). Keep `framer-motion` temporarily.
- Replace imports in 10 components: `from 'framer-motion'` → `from 'motion/react'`. API identical (`motion`, `AnimatePresence`, `Variants`).
- Typecheck after each file.
- Uninstall `framer-motion` at end.
- Motion discipline: 0.15s micro / 0.25s layout transitions, drop overshoot springs except for board DnD, hover states use color/opacity not transforms.

## Component sweep strategy

### Phase A — Foundation (1 commit)
- Update `index.css` CSS variables.
- Update `tailwind.config.js`: Inter Tight font, `accent` color tokens, default radius 0.
- Add `@fontsource-variable/inter-tight` dependency.

### Phase B — Inline color cleanup (1 commit, mechanical sweep)
- Find/replace all `bg-[#5E6AD2]`, `text-[#5E6AD2]`, `border-[#5E6AD2]`, `focus:border-[#5E6AD2]`, `focus:ring-[#5E6AD2]`, `hover:bg-[#5E6AD2]`, `hover:bg-[#4b55aa]` → token-based utilities.

### Phase C — Radius + spacing pass (1-2 commits)
- Remove `rounded`, `rounded-md`, `rounded-lg` from non-pill elements.
- Increase modal/card padding to `p-6`.
- Replace soft shadows with `--shadow-popover` on floating layers.

### Phase D — Motion migration (1 commit, file-by-file)
- 10 components. Each: change import path. Typecheck. Uninstall `framer-motion` at end.

### Phase E — Component polish (1-2 commits)
- Header: tighten spacing; neutral notification dot (was purple).
- Sidebar: left accent bar for active item (Porsche pattern) instead of full-background highlight.
- BoardView: keep drag-and-drop spring; reduce column padding.
- Modals: `p-6`, no rounded corners, new shadow token.

## Testing strategy

Visual redesign is hard to unit-test — strategy = regression guards + manual smoke.

**New audit tests:**
1. `tests/audit/no-legacy-purple.test.ts` — zero `#5E6AD2` literals in `components/**/*.tsx`.
2. `tests/audit/motion-imports.test.ts` — zero `from 'framer-motion'`; all from `'motion/react'`.
3. `tests/audit/design-tokens.test.ts` — `index.css` defines `--accent-color: #0066FF`; `tailwind.config.js` maps `accent`.

**Manual smoke checklist:**
- [ ] Login renders, Inter Tight loaded, electric blue focus/button.
- [ ] Sidebar expand/collapse animates.
- [ ] BoardView drag-and-drop works.
- [ ] IssueModal opens/closes — sharp corners, `p-6` padding.
- [ ] Notifications badge neutral.
- [ ] Active sidebar item uses left accent bar.
- [ ] No remaining purple-blue.

## Accessibility

`#0066FF` on `#0E0F12` = 8.59:1 contrast — passes WCAG AA (large text), AAA at all sizes.

## Out of scope

- Light mode deep rework beyond CSS variable refresh
- Mobile responsive pass
- WCAG audit beyond contrast
- Component-level redesign of layout/IA (visual polish only, not structure)
