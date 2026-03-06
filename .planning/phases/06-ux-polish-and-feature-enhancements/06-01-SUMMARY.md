---
phase: 06-ux-polish-and-feature-enhancements
plan: "01"
subsystem: testing
tags: [node-test, test-stubs, risks, milestones, report-generator, esm]

# Dependency graph
requires:
  - phase: 05-ai-reports-yaml-editor
    provides: reportGenerator.js buildPanel() function that needs regression guard
  - phase: 03-project-setup-action-manager
    provides: risks.js and milestones.js route files with PATCH endpoints
provides:
  - POST /api/customers/:id/risks describe block with 4 pending stubs
  - POST /api/customers/:id/milestones describe block with 4 pending stubs
  - client/src/lib/reportGenerator.test.js with 3 pending buildPanel regression stubs
affects: [06-02-reportGenerator-buildPanel-fix, 06-04-POST-risks-milestones-implementation]

# Tech tracking
tech-stack:
  added: []
  patterns: [ESM import for node:test in client tree (package.json type=module), no-callback it() as pending test pattern]

key-files:
  created:
    - client/src/lib/reportGenerator.test.js
  modified:
    - server/routes/risks.test.js
    - server/routes/milestones.test.js

key-decisions:
  - "ESM import syntax required for node:test in client/ tree — client/package.json has type=module so require() fails; use import { describe, it } from 'node:test'"
  - "No-callback it('description') pattern used for pending stubs — node:test treats missing callback as passing todo, consistent with existing server test patterns"

patterns-established:
  - "ESM node:test pattern: use import syntax when running tests from ESM package roots"
  - "Pending stub pattern: it('description') with no callback = pending/todo in node:test"

requirements-completed: [UX-08, UX-07]

# Metrics
duration: 1min
completed: 2026-03-06
---

# Phase 6 Plan 01: Wave 0 Test Stubs Summary

**Three t.todo()-style pending test stubs established via no-callback it() for POST risks, POST milestones endpoints and reportGenerator buildPanel regression guard — full server suite 64/64 passing**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-06T02:28:28Z
- **Completed:** 2026-03-06T02:29:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Appended 4-case POST /api/customers/:id/risks pending describe block to risks.test.js without touching existing PATCH tests
- Appended 4-case POST /api/customers/:id/milestones pending describe block to milestones.test.js without touching existing PATCH tests
- Created client/src/lib/reportGenerator.test.js with 3 ESM pending stubs for buildPanel workstream-filter regression guard
- Full server suite (routes/*.test.js + services/*.test.js) remains 64 tests, 0 failures, exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Add POST stubs to risks.test.js and milestones.test.js** - `2da4422` (test)
2. **Task 2: Create reportGenerator.test.js stub** - `4565cf2` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `server/routes/risks.test.js` - Appended POST /api/customers/:id/risks describe block with 4 pending it() stubs
- `server/routes/milestones.test.js` - Appended POST /api/customers/:id/milestones describe block with 4 pending it() stubs
- `client/src/lib/reportGenerator.test.js` - New file; 3 ESM pending stubs for buildPanel() workstream-group filter regression guard

## Decisions Made
- ESM `import` syntax used for node:test in the client tree because `client/package.json` has `"type": "module"` — `require()` is not available in ESM scope
- No-callback `it('description')` pattern for pending stubs — node:test treats missing callback as a passing todo, consistent with Phase 4 Wave 0 pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ESM import syntax for reportGenerator.test.js**
- **Found during:** Task 2 (Create reportGenerator.test.js stub)
- **Issue:** Plan specified `'use strict'; const { describe, it } = require('node:test');` but client/package.json has `"type": "module"` — node treats .js files as ESM and `require` is not defined in ESM scope, causing exit code 1
- **Fix:** Replaced `require()` with `import { describe, it } from 'node:test'` and removed `'use strict'` directive; file runs cleanly under ESM
- **Files modified:** client/src/lib/reportGenerator.test.js
- **Verification:** `node --test --test-reporter spec client/src/lib/reportGenerator.test.js` — 3 tests pass, exit 0
- **Committed in:** `4565cf2` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — ESM/CJS mismatch in client package)
**Impact on plan:** Fix was essential for correct operation. No scope creep.

## Issues Encountered
- client/package.json "type": "module" means node:test files in client tree must use ESM import syntax — documented as established pattern for future test files in this tree

## Next Phase Readiness
- All Wave 0 stubs established; Nyquist verify path exists for POST risks, POST milestones, and reportGenerator buildPanel
- 06-02 (reportGenerator buildPanel fix) and 06-04 (POST endpoint implementation) can now run against real test expectations
- Full server suite green; no regressions introduced

---
*Phase: 06-ux-polish-and-feature-enhancements*
*Completed: 2026-03-06*
