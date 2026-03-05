---
phase: 03-project-setup-action-manager
plan: "03"
subsystem: api
tags: [express, yaml, atomic-write, node-test, workstreams]

# Dependency graph
requires:
  - phase: 03-project-setup-action-manager
    provides: workstreams.test.js stubs (5 todos), sample.yaml fixture with 11-subworkstream schema, driveService mock pattern
  - phase: 01-foundation
    provides: yamlService (parseYaml, validateYaml, serializeYaml, normalizeForSerialization), driveService (readYamlFile, writeYamlFile), asyncWrapper middleware
provides:
  - PATCH /api/customers/:id/workstreams endpoint with REQUIRED_GROUPS validation and atomic Drive write
  - workstreams.test.js 5/5 assertions passing (replaces t.todo stubs)
  - Route mounted in server/index.js before error handler
affects:
  - 03-04 (Project Setup view depends on PATCH /api/customers/:id/workstreams)
  - 03-05, 03-06 (Phase 3 UI plans can call workstreams endpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "REQUIRED_GROUPS fast-fail validation before Drive read — 422 returned without touching Drive on bad body"
    - "mergeParams: true on Express router — req.params.id flows from parent /api/customers/:id route"
    - "Atomic PATCH pattern: read -> parseYaml -> validateYaml -> replace key -> normalizeForSerialization -> serializeYaml -> writeYamlFile"

key-files:
  created:
    - server/routes/workstreams.js
  modified:
    - server/routes/workstreams.test.js
    - server/index.js

key-decisions:
  - "REQUIRED_GROUPS validation runs before readYamlFile — fast-fail on malformed body avoids unnecessary Drive API call"
  - "workstreams key replaced wholesale (not merged) — caller owns the full workstreams object, prevents stale sub-workstream keys"

patterns-established:
  - "Pattern: Workstreams PATCH replaces full object atomically — no partial merging at server level"
  - "Pattern: Body validation before Drive read is preferred order for all PATCH routes with required structure"

requirements-completed: [ACT-08]

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 3 Plan 03: PATCH /api/customers/:id/workstreams Route Summary

**Express PATCH workstreams route with REQUIRED_GROUPS validation, atomic Drive write, and all 5 test assertions passing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T15:33:07Z
- **Completed:** 2026-03-05T15:35:09Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created server/routes/workstreams.js with PATCH / handler using mergeParams: true, fast-fail 422 on missing adr/biggy groups, and atomic write pattern identical to risks.js
- Mounted route in server/index.js after history route, before error handler
- Replaced all 5 t.todo() stubs in workstreams.test.js with async assertions — suite exits 0 with 5/5 green

## Task Commits

Each task was committed atomically:

1. **Task 1: Create workstreams.js route and mount in index.js** - `ef17712` (feat)
2. **Task 2: Fill workstreams.test.js assertions** - `a9107b6` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `server/routes/workstreams.js` - New: PATCH / handler, REQUIRED_GROUPS=['adr','biggy'] validation, atomic read-replace-write pattern
- `server/routes/workstreams.test.js` - Updated: 5 t.todo() stubs replaced with async assertions covering 200, writeYamlFile call count, 422 missing group, 422 YAML validation failure, and atomic replace
- `server/index.js` - Added: `app.use('/api/customers/:id/workstreams', require('./routes/workstreams'))` after history mount

## Decisions Made
- REQUIRED_GROUPS validation runs before readYamlFile — fast-fail avoids unnecessary Drive API call on malformed body
- workstreams key is replaced wholesale, not merged — caller owns the full workstreams object to prevent stale sub-workstream keys persisting

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PATCH /api/customers/:id/workstreams is live and test-verified — ready for Plan 03-04 (Project Setup React view)
- Full server test suite green: risks (5), milestones (4), actions (12), workstreams (5) — 26 total passing

---
*Phase: 03-project-setup-action-manager*
*Completed: 2026-03-05*

## Self-Check: PASSED

All files verified present. All commits verified in git history.

| Check | Result |
|-------|--------|
| server/routes/workstreams.js | FOUND |
| server/routes/workstreams.test.js | FOUND |
| server/index.js | FOUND |
| .planning/phases/03-project-setup-action-manager/03-03-SUMMARY.md | FOUND |
| Commit ef17712 | FOUND |
| Commit a9107b6 | FOUND |
