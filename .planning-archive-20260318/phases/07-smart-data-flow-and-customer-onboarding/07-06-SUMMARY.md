---
phase: 07-smart-data-flow-and-customer-onboarding
plan: "06"
subsystem: ui

tags: [react, tanstack-query, yaml, project-setup, auto-fill]

# Dependency graph
requires:
  - phase: 07-smart-data-flow-and-customer-onboarding
    provides: updateCustomer PUT endpoint already in api.js; customer data via useOutletContext()

provides:
  - Customer Metadata card in ProjectSetup with YAML-auto-filled customer name, program name, and go-live date
  - metaMutation saving all three fields via PUT /api/customers/:id
  - Page header subtitle reflects editable customerName state

affects: [ProjectSetup, MGT-05, customer onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Customer-level metadata editable inline via full-object PUT (no dedicated PATCH endpoint)"
    - "State initialized from YAML via lazy initializer — () => customer?.customer?.name ?? ''"
    - "fileId stripped before PUT body — server re-attaches from Drive"

key-files:
  created: []
  modified:
    - client/src/views/ProjectSetup.jsx

key-decisions:
  - "updateCustomer (PUT) used for metadata save — no dedicated PATCH endpoint for customer-level fields; full object spread with fileId removed"
  - "customerName state drives both the editable input and the page header subtitle — single source of truth after load"
  - "metaMutation invalidates both ['customer', customerId] and ['customers'] — sidebar list updates immediately on name change"

patterns-established:
  - "Customer metadata state initialized with lazy initializer from useOutletContext() data — avoids re-running on re-renders"

requirements-completed: [MGT-05]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 7 Plan 06: ProjectSetup Customer Metadata Auto-Fill Summary

**Customer Metadata card added to ProjectSetup with YAML-derived auto-fill for customer name, program/project name, and go-live date; saving via PUT /api/customers/:id**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T00:00:00Z
- **Completed:** 2026-03-05T00:03:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added "Customer Metadata" card at the top of ProjectSetup, above the workstream section
- Three auto-filled editable fields: Customer Name, Project / Program Name, Go-Live Date
- All fields initialized from customer YAML via lazy state initializers on first render
- metaMutation builds a full updated customer object (spreading existing data, overwriting name/project fields, stripping fileId) and calls updateCustomer PUT
- On success: both customer and customers query caches invalidated (sidebar name updates); "Saved!" indicator for 2 seconds
- Page header subtitle now uses customerName state (reflects edits before save)
- Workstream auto-fill and save behavior entirely unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add customer metadata section to ProjectSetup** - `e04dfc4` (feat)

## Files Created/Modified
- `client/src/views/ProjectSetup.jsx` - Added updateCustomer import, three metadata state variables, metaMutation, Customer Metadata JSX card, updated subtitle

## Decisions Made
- Used `updateCustomer` (full PUT) for metadata save — no dedicated PATCH for customer-level fields; entire customer object spread with modified customer.name, project.go_live_date, and project.name; fileId stripped before sending (server re-attaches)
- `customerName` state drives both the page header subtitle and the input field — single source of truth; header updates live as user types
- `metaMutation.onSuccess` invalidates both `['customer', customerId]` and `['customers']` so the sidebar customer list refreshes immediately when customer name changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 plans in Phase 7 now complete
- MGT-05 satisfied: ProjectSetup pre-fills from YAML on load for all required fields
- Project is feature-complete per roadmap

---
*Phase: 07-smart-data-flow-and-customer-onboarding*
*Completed: 2026-03-05*
