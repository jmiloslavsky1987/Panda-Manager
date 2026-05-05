---
phase: 84-discovery-scan-hardening
plan: "03"
subsystem: ui
tags: [discovery, scan, lookback, sse, next.js, react, zod, typescript]

# Dependency graph
requires:
  - phase: 84-00
    provides: Wave 0 RED test scaffolds for scan-config lookback tests
provides:
  - Lookback timeframe selector (7d/14d/1m/3m) in ScanForUpdatesButton dropdown panel
  - scan-config GET returns lookback field with '7d' default
  - scan-config POST accepts and persists lookback alongside sources
  - Scan POST body includes since ISO timestamp derived from lookback
affects:
  - 84-04
  - 84-05

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lookback enum ('7d'|'14d'|'1m'|'3m') stored in JSON config file alongside sources"
    - "lookbackToMs() converts lookback token to milliseconds for since timestamp calculation"

key-files:
  created: []
  modified:
    - app/api/discovery/scan-config/route.ts
    - components/ScanForUpdatesButton.tsx

key-decisions:
  - "scan-config POST uses .optional() lookback Zod field (not .default()) — returns lookback: lookback ?? '7d' in response rather than relying on Zod default, preserving explicit control in handler"
  - "lookbackToMs() placed at module level in ScanForUpdatesButton (not inline) — reusable and testable without component instantiation"
  - "Timeframe <select> uses standard HTML select with Tailwind border/text classes — consistent with source checkbox styling (zinc-700 text, zinc-200 border)"

patterns-established:
  - "Lookback pattern: store string token in config, convert to since ISO timestamp at call time — avoids storing absolute timestamps that go stale"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-05-05
---

# Phase 84 Plan 03: Lookback Timeframe Selector for Discovery Scan Summary

**Lookback dropdown (7d/14d/1m/3m) added to ScanForUpdatesButton with config persistence and since ISO timestamp wired to scan POST body**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-05T04:05:08Z
- **Completed:** 2026-05-05T04:09:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended scan-config route: GET returns lookback field ('7d' default), POST validates and persists lookback via Zod enum
- All 5 scan-config.test.ts tests GREEN (3 were RED gating tests from Wave 0)
- Added lookback dropdown UI (Timeframe selector) in ScanForUpdatesButton panel below source checkboxes
- Scan POST body now includes `since` ISO timestamp derived from `lookbackToMs(lookback)` calculation
- Lookback persists: saved to scan-config on scan start, loaded from config on mount

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend scan-config route to support lookback field** - `bf7f62e8` (feat)
2. **Task 2: Add lookback dropdown to ScanForUpdatesButton and wire since to scan POST** - `e817eb39` (feat)

**Plan metadata:** (docs commit follows)

_Note: Task 1 used TDD — Wave 0 RED tests already existed on disk from Plan 84-00; implementation turned all 5 GREEN_

## Files Created/Modified

- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/discovery/scan-config/route.ts` - Added Lookback type, extended ProjectScanConfig interface, GET returns lookback with '7d' default, POST schema adds optional lookback enum, handler persists lookback in config store
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/ScanForUpdatesButton.tsx` - Added Lookback type, LOOKBACK_OPTIONS constant, lookbackToMs() helper, lookback useState, loadConfig reads lookback from API, config-save includes lookback, scan POST includes since, Timeframe <select> dropdown in panel

## Decisions Made

- scan-config POST uses `.optional()` lookback (not `.default('7d')`) — Zod default would silently coerce missing field; explicit `?? '7d'` fallback in handler code is clearer and testable
- lookbackToMs() placed at module level in ScanForUpdatesButton — pure function, not coupled to component lifecycle
- Standard HTML `<select>` used for timeframe — consistent with scope; Shadcn Select would require additional import and wrapper boilerplate not used elsewhere in this panel

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all Wave 0 tests were already scaffolded by Plan 84-00. Implementation was straightforward.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- scan-config API now carries full {sources, lookback} shape; Plan 84-04 (approve route) and 84-05 (scan extensions) can consume without changes
- ScanForUpdatesButton is fully wired; no further UI changes needed for lookback feature
- All Phase 84 Wave 2 gates for scan-config are GREEN

## Self-Check: PASSED

- FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/app/api/discovery/scan-config/route.ts
- FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/components/ScanForUpdatesButton.tsx
- FOUND: /Users/jmiloslavsky/Documents/Project Assistant Code/.planning/phases/84-discovery-scan-hardening/84-03-SUMMARY.md
- FOUND commit bf7f62e8: feat(84-03): extend scan-config route to support lookback field
- FOUND commit e817eb39: feat(84-03): add lookback dropdown to ScanForUpdatesButton and wire since to scan POST

---
*Phase: 84-discovery-scan-hardening*
*Completed: 2026-05-05*
