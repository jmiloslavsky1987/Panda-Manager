---
phase: 76-pickers-risk-fields
plan: 03
subsystem: ui
tags: [react, typescript, risk-score, vitest, tdd, zod, drizzle]

# Dependency graph
requires:
  - phase: 75-schema-quick-wins
    provides: likelihood, impact, target_date, owner_id columns on risks table
  - phase: 76-01
    provides: OwnerCell FK picker with owner_id prop; risks PATCH schema deliberately excluded from 76-01

provides:
  - Pure function computeRiskScore(likelihood, impact) -> {score, label, colorClass}
  - Likelihood + Impact + Target Date fields in RiskEditModal
  - Risk Score badge column in RisksTableClient (colored by computed score)
  - PATCH /api/risks/:id accepts likelihood, impact, target_date, owner, owner_id

affects:
  - 77-intelligence-gantt (risk data with likelihood/impact now available for intelligence use)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD red-green: test written before implementation, committed separately
    - Score computed at render from two text fields (never stored as DB column)
    - IIFE in JSX for per-cell score computation without separate component

key-files:
  created:
    - lib/risk-score.ts
    - lib/risk-score.test.ts
  modified:
    - components/RiskEditModal.tsx
    - components/RisksTableClient.tsx
    - app/api/risks/[id]/route.ts

key-decisions:
  - "computeRiskScore accepts null/undefined for both args; returns N/A result if either is missing/invalid"
  - "Score never stored: WEIGHT map * at render time in RisksTableClient IIFE cell"
  - "Score 9=Critical (red), 6=High (red), 3-4=Medium (amber), 1-2=Low (green) per locked CONTEXT.md mapping"
  - "owner_id + owner added to risks PATCH schema here (76-03), as deferred from 76-01 to avoid parallel file conflict"
  - "Pre-existing TypeScript errors in __tests__/ and lib/__tests__/ are out of scope; zero errors in modified files"

patterns-established:
  - "Pure score function: WEIGHT map lookup, null propagation, label/color lookup in score ranges"

requirements-completed:
  - RISK-01
  - RISK-02
  - RISK-03
  - RISK-04

# Metrics
duration: 15min
completed: 2026-04-22
---

# Phase 76 Plan 03: Pickers & Risk Fields — Risk Score & Likelihood/Impact/Target Date Summary

**Risk Score auto-computed from Likelihood x Impact via pure function; badge column in risks table with green/amber/red coloring; three new fields editable in RiskEditModal; PATCH schema accepts all four new fields**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-22T18:16:00Z
- **Completed:** 2026-04-22T18:19:30Z
- **Tasks:** 2 (TDD task = 3 commits: test + feat + task 2 feat)
- **Files modified:** 5

## Accomplishments
- computeRiskScore pure function with 14 test cases (TDD), all passing
- Likelihood, Impact, and Target Date fields added to RiskEditModal with dropdowns/date input
- Risk Score badge column in RisksTableClient: colored (green/amber/red) per computed score, dash when no data
- PATCH /api/risks/:id extended to accept likelihood, impact, target_date, owner, owner_id
- OwnerCell owner_id prop from 76-01 preserved intact in RisksTableClient

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing tests for computeRiskScore** - `2073051f` (test)
2. **Task 1 GREEN: Implement computeRiskScore pure function** - `d7507bb0` (feat)
3. **Task 2: Add likelihood/impact/target-date fields + risk score column** - `e45b57e5` (feat)

## Files Created/Modified
- `lib/risk-score.ts` - Pure function: WEIGHT map, score computation, label/colorClass lookup
- `lib/risk-score.test.ts` - 14 test cases covering all score combinations, null/undefined, case insensitivity
- `components/RiskEditModal.tsx` - Added likelihood, impact, targetDate state + Likelihood/Impact dropdowns + Target Date input + updated handleSave payload
- `components/RisksTableClient.tsx` - Import computeRiskScore; Risk Score column header + badge cell; colSpan 7->8
- `app/api/risks/[id]/route.ts` - patchSchema + patch build: added likelihood, impact, target_date, owner, owner_id

## Decisions Made
- computeRiskScore returns N/A result (score: null) when either likelihood or impact is null/undefined/invalid — avoids showing misleading scores for partially-configured risks
- Score is computed via IIFE in the table cell JSX rather than a separate component — keeps logic local and avoids component creation for a single-use pattern
- owner_id and owner fields added to risks PATCH schema in this plan (76-03) as deferred from 76-01 to avoid parallel file conflict on the same route file
- Pre-existing TypeScript errors in test files (`__tests__/`, `lib/__tests__/`) are out of scope per scope boundary rule; zero errors in files modified by this plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in test files (`__tests__/lifecycle/`, `lib/__tests__/`) were present before this plan and are out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Risk Score computation and display are live; all four new risk fields are editable and persisted
- Phase 76 plans 01, 02, 03, 04 all complete; ready for Phase 77 (Intelligence & Gantt)
- No blockers

## Self-Check: PASSED

- lib/risk-score.ts: FOUND
- lib/risk-score.test.ts: FOUND
- components/RiskEditModal.tsx: FOUND
- components/RisksTableClient.tsx: FOUND
- app/api/risks/[id]/route.ts: FOUND
- Commit 2073051f (test RED): FOUND
- Commit d7507bb0 (feat GREEN): FOUND
- Commit e45b57e5 (feat Task 2): FOUND

---
*Phase: 76-pickers-risk-fields*
*Completed: 2026-04-22*
