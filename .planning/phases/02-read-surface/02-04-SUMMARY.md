---
phase: 02-read-surface
plan: 04
subsystem: client
tags: [react, tanstack-query, customer-overview, inline-edit, optimistic-ui]

# Dependency graph
requires:
  - phase: 02-01
    provides: deriveCustomer.js (WORKSTREAM_CONFIG, getLatestHistory, etc.)
  - phase: 02-02
    provides: PATCH /api/customers/:id/risks/:riskId + milestones endpoints
  - phase: 02-03
    provides: patchRisk + patchMilestone in api.js, StatusBadge, ProgressBar

provides:
  - client/src/views/CustomerOverview.jsx: full implementation replacing placeholder

affects:
  - Phase 3 (Action Manager — same per-customer layout pattern)

# Tech tracking
tech-stack:
  patterns:
    - useOutletContext() — CustomerLayout provides customer, no second useQuery
    - Optimistic mutation: cancelQueries → setQueryData (optimistic) → mutate → onError rollback → onSettled invalidate
    - InlineEditField: click-to-edit with blur/enter save, Escape cancel
    - InlineSelectField: immediate onChange → mutate
    - Saving... indicator: mutation.isPending && mutation.variables?.riskId === risk.id
    - STATUS_DOT_CLASSES lookup — complete literal class strings (Tailwind v4 purge safety)

key-files:
  modified:
    - client/src/views/CustomerOverview.jsx (placeholder → 438-line full implementation)

requirements-completed: [CUST-02, CUST-03, CUST-04, CUST-05, CUST-06, CUST-07, CUST-08, CUST-09, CUST-10]

# Metrics
duration: ~5min
completed: 2026-03-05
commit: d987bb1
---

# Phase 2 Plan 04: CustomerOverview Summary

**Full CustomerOverview with workstream health, inline edit, risks, milestones — all CUST requirements satisfied**

## Accomplishments
- Header: name, StatusBadge, project name, go-live date + days countdown, last updated (history[0].week_ending)
- Workstream Health: 6 sub-rows (ADR×4, Biggy×2) via WORKSTREAM_CONFIG + getLatestHistory()
- Open Actions: count + top 3 overdue with Manage Actions link to /actions
- Risks table: sorted high-first, inline edit on description/severity/status/mitigation, Saving... indicator
- Milestones table: sorted by target_date, inline edit on name/date/status/notes, Saving... indicator
- Both mutations: TanStack Query v5 onMutate/onError/onSettled optimistic pattern
- NO second useQuery — useOutletContext() from CustomerLayout
- CUST-10: no Add buttons — note directs to YAML Editor

---
*Phase: 02-read-surface*
*Completed: 2026-03-05*
