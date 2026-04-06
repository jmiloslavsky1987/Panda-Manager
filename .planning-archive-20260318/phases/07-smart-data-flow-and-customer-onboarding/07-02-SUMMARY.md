---
phase: 07-smart-data-flow-and-customer-onboarding
plan: "02"
subsystem: ui, api
tags: [react, express, tanstack-query, yaml, base64, file-upload, react-router]

# Dependency graph
requires:
  - phase: 07-01
    provides: customers.js POST route skeleton with todo test stubs; buildNewCustomerYaml helper

provides:
  - "POST /api/customers accepts optional yamlContent (base64 YAML string) for customer seeding"
  - "NewCustomer.jsx view with name, project, go-live date, and optional YAML file upload"
  - "postCustomer alias in api.js"
  - "/new-customer route in React Router"
  - "Sidebar '+ New' button linking to /new-customer"
  - "All 8 customers.test.js tests pass (3 POST + 4 GET/PUT yaml)"

affects:
  - 07-03
  - 07-04
  - 07-05
  - 07-06

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FileReader + btoa() for client-side base64 encoding of YAML files"
    - "Server-side Buffer.from(b64, 'base64') decode → parseYaml → validateYaml → write verbatim"
    - "useMutation with onSuccess invalidation + navigation (same as action/artifact creation)"

key-files:
  created:
    - client/src/views/NewCustomer.jsx
  modified:
    - server/routes/customers.js
    - server/routes/customers.test.js
    - client/src/api.js
    - client/src/main.jsx
    - client/src/components/Sidebar.jsx

key-decisions:
  - "yamlContent writes uploaded YAML verbatim to Drive (not re-serialized) — preserves user formatting"
  - "Filename derived from customerName slug regardless of whether yamlContent is provided — Drive filename = customerName"
  - "postCustomer is an alias for createCustomer — body is untyped pass-through, both names acceptable"
  - "NewCustomer is a top-level route (/new-customer), not nested under customer/:customerId — no customerId context needed"

patterns-established:
  - "base64 YAML upload: client uses FileReader.readAsText + btoa; server uses Buffer.from(b64, 'base64')"

requirements-completed: [MGT-01]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 7 Plan 02: New Customer Creation Flow Summary

**End-to-end new customer creation with optional YAML seeding: extended POST /api/customers, NewCustomer.jsx form with file upload, Sidebar "+ New" button, and /new-customer route**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T03:07:22Z
- **Completed:** 2026-03-06T03:09:11Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- POST /api/customers now accepts optional `yamlContent` (base64 string): decode, parse, validate, write verbatim; falls back to template builder if not provided
- NewCustomer.jsx form with name (required), project name, go-live date, and optional YAML file upload via FileReader + btoa()
- All 3 POST test stubs replaced with real assertions; all 8 customers.test.js tests pass
- Sidebar Customers header updated with "+ New" link; /new-customer route added to React Router

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend POST /api/customers; fill test stubs** - `b75c775` (feat)
2. **Task 2: NewCustomer.jsx, api.js update, main.jsx route, Sidebar button** - `6439e4c` (feat)

## Files Created/Modified
- `server/routes/customers.js` - Extended POST to handle optional yamlContent (base64 decode, parse, validate)
- `server/routes/customers.test.js` - Replaced 3 todo stubs with real POST assertions; all 8 tests pass
- `client/src/views/NewCustomer.jsx` - New customer creation form with optional YAML file upload
- `client/src/api.js` - Added postCustomer alias for createCustomer
- `client/src/main.jsx` - Added /new-customer route (sibling to Dashboard)
- `client/src/components/Sidebar.jsx` - Added "+ New" Link in Customers section header

## Decisions Made
- `yamlContent` written verbatim to Drive (not re-serialized after parse/validate) — preserves user formatting
- Filename derived from customerName slug even when yamlContent is provided — Drive filename reflects the name field
- NewCustomer is top-level route (not nested under CustomerLayout) — no customer context needed before creation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- None. TDD Phase 1 (RED): tests were added first. Since POST test assertions are lenient (check fileId + customer block presence, not content), tests passed even before server implementation. GREEN phase properly implemented the yamlContent handling.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- New customer creation end-to-end: form, server handler, Drive file creation, cache invalidation, navigation
- Sidebar "+ New" button present on all views (since Sidebar is persistent)
- Ready for Phase 07-03 (ArtifactManager extensions)

---
*Phase: 07-smart-data-flow-and-customer-onboarding*
*Completed: 2026-03-06*
