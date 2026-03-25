---
phase: 13-skill-ux-+-draft-polish
plan: "02"
subsystem: ui
tags: [next.js, react, rsc, postgresql, sql, search]

# Dependency graph
requires:
  - phase: 13-01
    provides: skills page route at /customer/[id]/skills
provides:
  - Contextual "Generate Meeting Summary" Link in history tab heading row
  - Contextual "Create Handoff Doc" Link in stakeholders tab heading row
  - Correct ISO date range filtering for all 8 UNION arms in searchAllRecords()
affects: [13-03, search, history-tab, stakeholders-tab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RSC skill launch: plain next/link <Link> in heading row, no JS required"
    - "Timestamp date normalization: to_char(col, 'YYYY-MM-DD') for WHERE comparisons on timestamptz columns"

key-files:
  created: []
  modified:
    - bigpanda-app/app/customer/[id]/history/page.tsx
    - bigpanda-app/app/customer/[id]/stakeholders/page.tsx
    - bigpanda-app/lib/queries.ts

key-decisions:
  - "Skill launch buttons use plain next/link Link (RSC-safe, no client JS, no onClick)"
  - "Stakeholder heading-row right side wrapped in flex gap-2 div to accommodate two buttons side-by-side"
  - "to_char() applied only at dateBounds() call sites for timestamp arms; SELECT ::text cast kept for display"
  - "Existing ioredis/bullmq TS type mismatch errors are pre-existing and out of scope for this plan"

patterns-established:
  - "Contextual skill navigation: Link in heading row pointing to /customer/[id]/skills without URL params"
  - "SQL date normalization: timestamp columns in UNION arms use to_char(..., 'YYYY-MM-DD') not ::text for date comparisons"

requirements-completed:
  - SKILL-03
  - SKILL-04
  - SKILL-05
  - SKILL-06
  - SKILL-07
  - SKILL-08
  - SKILL-12
  - SKILL-13
  - SRCH-01
  - SRCH-02

# Metrics
duration: 12min
completed: 2026-03-25
---

# Phase 13 Plan 02: Skill Launch Buttons + Search Date Fix Summary

**Contextual skill launch Links added to History and Stakeholders RSC pages; ISO date range filtering fixed for three timestamptz UNION arms in searchAllRecords()**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-25T19:40:00Z
- **Completed:** 2026-03-25T19:52:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- history/page.tsx: "Generate Meeting Summary" Link in heading row, href `/customer/[id]/skills`, primary dark button style
- stakeholders/page.tsx: "Create Handoff Doc" Link next to "+ Add Stakeholder", outlined secondary style, heading row right side wrapped in `flex items-center gap-2`
- queries.ts: Three UNION arms (onboarding_steps, onboarding_phases, integrations) now use `to_char(col, 'YYYY-MM-DD')` in dateBounds() call instead of `col::text`, fixing date range filter for timestamp columns

## Task Commits

1. **Task 1: Add skill launch buttons to History and Stakeholders RSC pages** - `beb1e11` (feat)
2. **Task 2: Fix search date filter — to_char normalization for timestamp columns** - `19fdac1` (fix)

## Files Created/Modified
- `bigpanda-app/app/customer/[id]/history/page.tsx` - Added Link import + "Generate Meeting Summary" button in heading row
- `bigpanda-app/app/customer/[id]/stakeholders/page.tsx` - Added Link import + "Create Handoff Doc" button; heading-row right side now flex gap-2
- `bigpanda-app/lib/queries.ts` - Three dateBounds() call sites changed from `::text` to `to_char(col, 'YYYY-MM-DD')` for onboarding_steps, onboarding_phases, integrations arms

## Decisions Made
- Skill launch buttons use plain `next/link` Link — RSC-compatible, no `'use client'` directive needed, no JS required for navigation
- `::text` cast kept in SELECT for display column; only the WHERE-clause `dateBounds()` call uses `to_char()` — minimal change, does not alter displayed date format
- Pre-existing ioredis/bullmq TypeScript version mismatch errors noted and left out of scope (Rule 4 scope boundary)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TS errors in `app/api/jobs/trigger/route.ts`, `app/api/skills/[skillName]/run/route.ts`, and `worker/index.ts` from ioredis vs bullmq version mismatch — confirmed pre-existing, not introduced by this plan, out of scope.

## Next Phase Readiness
- History and Stakeholders tabs now surface skill navigation without manual routing
- Date range filter accurate for all UNION arms — search results reflect actual date boundaries
- Plan 13-03 can proceed (no shared file conflicts per plan spec)

---
*Phase: 13-skill-ux-+-draft-polish*
*Completed: 2026-03-25*
