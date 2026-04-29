---
phase: 81-kata-design-system-overhaul
plan: "01"
subsystem: ui
tags: [css-tokens, tailwind4, next-font, material-symbols, dark-mode, design-system]

# Dependency graph
requires:
  - phase: 81-00
    provides: Wave 0 KDS test scaffolds (token-import.test.ts, icon-migration.test.ts, theme-persistence.test.ts)
provides:
  - "components/kata-tokens.css with two-layer token architecture (palette + semantic + [data-theme=dark] isolation)"
  - "app/globals.css wired to kata-tokens.css with full @theme inline shadcn aliases"
  - "Inter + JetBrains Mono loaded via next/font/google with CSS variable injection on <html>"
  - "Material Symbols Outlined CDN link in layout.tsx <head>"
  - "components/Icon.tsx wrapper component rendering material-symbols-outlined spans"
  - "components/ThemeProvider.tsx with kata-theme localStorage key"
  - "Flash-prevention inline script in layout.tsx <head>"
affects: [81-02, 81-03, 81-04, 81-05, 81-06]

# Tech tracking
tech-stack:
  added:
    - "next/font/google (Inter, JetBrains_Mono) — self-hosted, no CDN round-trip"
    - "Material Symbols Outlined via Google Fonts CDN <link>"
  patterns:
    - "Two-layer Kata token architecture: palette layer in :root, semantic layer in .light/:root:not(.dark) and .dark"
    - "[data-theme=dark] CSS attribute scoping for Command Rail dark isolation"
    - "kata-theme localStorage key for theme persistence (replaces no prior theme system)"
    - "Flash-prevention inline <script> in <head> before first paint"
    - "Tailwind 4 @theme inline aliasing: all shadcn tokens bridge to Kata semantic vars"
    - "Icon component wraps Material Symbols web font glyphs via font-variation-settings"

key-files:
  created:
    - "components/kata-tokens.css"
    - "components/Icon.tsx"
    - "components/ThemeProvider.tsx"
  modified:
    - "app/globals.css"
    - "app/layout.tsx"

key-decisions:
  - "[81-01] kata-tokens.css uses two-layer architecture: palette :root vars + semantic .light/.dark vars — components never reference palette directly"
  - "[81-01] [data-theme=dark] on Command Rail <aside> provides CSS-only dark isolation independent of <html class=dark>"
  - "[81-01] ThemeProvider wraps AuthProvider children (not root <html>) to enable client-side useEffect hydration"
  - "[81-01] Flash-prevention inline script placed FIRST in <head> before any <link> tags to guarantee execution before CSS loads"
  - "[81-01] icon-migration Test 3 (lucide removal) intentionally RED — lucide migration is Plan 03 scope"

patterns-established:
  - "Pattern: @theme inline in globals.css bridges Kata semantic tokens to Tailwind/shadcn utility classes"
  - "Pattern: kata-theme localStorage key is the single source of truth for theme preference"
  - "Pattern: Icon component API — <Icon name='search' size={16} /> replaces all lucide-react imports"

requirements-completed: [KDS-01, KDS-02, KDS-08]

# Metrics
duration: 5min
completed: 2026-04-29
---

# Phase 81 Plan 01: Token Foundation Summary

**Kata token CSS foundation wired into Tailwind 4 with Inter/JBM fonts via next/font, Material Symbols CDN, flash-prevention script, ThemeProvider, and Icon component**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-29T03:23:24Z
- **Completed:** 2026-04-29T03:28:48Z
- **Tasks:** 2
- **Files modified/created:** 5 (kata-tokens.css, globals.css, layout.tsx, Icon.tsx, ThemeProvider.tsx)

## Accomplishments
- Created `components/kata-tokens.css` with palette layer (13 gray steps + 6 accent colors), semantic light/dark layers, and `[data-theme="dark"]` Command Rail isolation block
- Rewired `app/globals.css` to import kata-tokens.css and aliased all 13 shadcn component tokens to Kata semantic vars via `@theme inline` — covers every token used by components/ui/*
- Updated `app/layout.tsx` with Inter + JetBrains Mono via `next/font/google`, Material Symbols CDN link, flash-prevention inline script, and ThemeProvider wrapper
- Created `components/Icon.tsx` Material Symbols wrapper with `fontVariationSettings` for correct weight rendering
- Created `components/ThemeProvider.tsx` client component persisting theme via `kata-theme` localStorage key

## Task Commits

Each task was committed atomically:

1. **Task 1: kata-tokens.css** + **Task 2: globals.css, Icon.tsx, ThemeProvider.tsx, layout.tsx** - `716ada15` (feat: kata token foundation)

**Note:** Wave 0 test scaffold for `icon-migration.test.ts` was created inline as a deviation fix (blocking dependency from Plan 81-00). Test files are gitignored by project design.

## Files Created/Modified
- `components/kata-tokens.css` - Two-layer token file: palette :root + semantic light/dark/[data-theme="dark"] layers
- `app/globals.css` - @import kata-tokens.css + full @theme inline aliases for all 13 shadcn tokens + font-family update
- `app/layout.tsx` - next/font Inter+JBM, Material Symbols CDN, flash-prevention script, ThemeProvider wrapper
- `components/Icon.tsx` - Material Symbols Outlined wrapper, exports `Icon` component
- `components/ThemeProvider.tsx` - Client component using `kata-theme` localStorage key

## Decisions Made
- ThemeProvider wraps children inside AuthProvider (not at html root) — enables clean client component boundaries while AuthProvider remains server-capable
- `[data-theme="dark"]` isolation approach (pure CSS attribute selector) chosen over JS-driven class toggling — zero runtime overhead, prevents flash
- Flash-prevention script placed as first child of `<head>` before any `<link>` tags to guarantee execution order before CSS applies
- icon-migration Test 3 (lucide-react removal across 22 files) is intentionally RED per plan spec — lucide removal is Plan 03's scope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing icon-migration.test.ts Wave 0 scaffold**
- **Found during:** Task 2 verification setup
- **Issue:** Plan 81-01 depends_on 81-00, but 81-00 had not been executed. `tests/kds/icon-migration.test.ts` referenced by Task 2's verify block was missing. Only `token-import.test.ts` and `theme-persistence.test.ts` existed.
- **Fix:** Created `tests/kds/icon-migration.test.ts` with the 3-test KDS-02/KDS-07 Wave 0 scaffold (source-scan pattern matching 81-00 plan spec). Tests 1+2 verified RED, then GREEN after Icon.tsx creation. Test 3 remains RED (expected).
- **Files modified:** `tests/kds/icon-migration.test.ts` (new, gitignored)
- **Verification:** All 3 tests ran cleanly — Tests 1+2 GREEN, Test 3 RED as expected per plan done criteria
- **Committed in:** Not committed (tests/ dir is gitignored by project design per STATE.md `[79-00]` note)

---

**Total deviations:** 1 auto-fixed (blocking — missing Wave 0 test file)
**Impact on plan:** No scope creep. The missing test was a prerequisite artifact from Plan 81-00 that had not yet been executed. Fix was necessary to verify Task 2 completion per plan spec.

## Issues Encountered
- None — build compiled cleanly (existing BETTER_AUTH_SECRET warnings are pre-existing noise from route compilation, unrelated to this plan)

## Next Phase Readiness
- Token foundation complete. All plans that build on kata-tokens.css, Icon.tsx, and ThemeProvider.tsx can proceed
- Plan 81-02 (Command Rail rebuild) can use `data-theme="dark"` isolation pattern now available in kata-tokens.css
- Plan 81-03 (lucide → Icon migration) can use Icon.tsx wrapper; icon-migration Test 3 will turn GREEN after Plan 03 completes

---
*Phase: 81-kata-design-system-overhaul*
*Completed: 2026-04-29*
