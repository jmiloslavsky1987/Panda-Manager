---
phase: 02-read-surface
plan: 03
subsystem: client
tags: [react, tanstack-query, tailwind-v4, dashboard, statusbadge, progressbar, deriverCustomer]

# Dependency graph
requires:
  - phase: 02-01
    provides: deriveCustomer.js skeleton + clsx installed

provides:
  - client/src/lib/deriveCustomer.test.js: 20 real assertions (replaces stubs)
  - client/src/components/StatusBadge.jsx with VARIANTS lookup table
  - client/src/components/ProgressBar.jsx with inline style width
  - client/src/api.js: patchRisk + patchMilestone added
  - client/src/views/Dashboard.jsx: real grid with sorted customer cards

affects:
  - Phase 2 CustomerOverview (imports StatusBadge, ProgressBar, api.patchRisk/patchMilestone)

# Tech tracking
tech-stack:
  patterns:
    - Tailwind v4 purge safety: VARIANTS lookup object with complete literal class strings
    - ProgressBar: inline style for dynamic width, NOT Tailwind w-[${n}%]
    - Dashboard: useQuery(['customers'], getCustomers, staleTime:30_000)
    - Sort: sortCustomers() — at_risk=0, on_track=1, off_track=2

key-files:
  created:
    - client/src/components/StatusBadge.jsx
    - client/src/components/ProgressBar.jsx
  modified:
    - client/src/lib/deriveCustomer.test.js (stubs → 20 real assertions)
    - client/src/api.js (patchRisk + patchMilestone appended)
    - client/src/views/Dashboard.jsx (placeholder → real component)

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, UI-01, UI-02]

# Metrics
duration: ~8min
completed: 2026-03-05
commit: 82bb363
---

# Phase 2 Plan 03: Dashboard + Components Summary

**20/20 deriveCustomer tests pass; Dashboard renders real Drive data sorted At Risk first**

## Accomplishments
- StatusBadge: VARIANTS lookup for on_track/at_risk/off_track and all sub-values — no dynamic class construction
- ProgressBar: `style={{ width: \`${pct}%\` }}` — never Tailwind dynamic w-[n%]
- api.js: patchRisk/patchMilestone appended (getCustomers/getCustomer/updateCustomer preserved)
- Dashboard: grid of CustomerCards, sorted At Risk→On Track→Off Track, each showing name/status/progress/days/actions/risks
- 20/20 deriveCustomer tests — all real assertions covering all 9 exported functions

---
*Phase: 02-read-surface*
*Completed: 2026-03-05*
