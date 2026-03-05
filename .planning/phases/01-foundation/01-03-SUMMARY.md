---
phase: 01-foundation
plan: 03
subsystem: infra
tags: [js-yaml, json-schema, yamlService, validation, middleware, node-test]

# Dependency graph
requires:
  - phase: 01-01
    provides: yamlService.test.js stubs (t.todo) filled by this plan
  - phase: 01-02
    provides: js-yaml installed in server/package.json

provides:
  - YAML parse/serialize/validate/ID functions (yamlService.js, 7 exports)
  - asyncWrapper middleware (Express async route wrapper)
  - errorHandler middleware (4-param Express error handler)
  - All 15 yamlService tests passing with real assertions

affects:
  - 01-04 (server/index.js uses asyncWrapper + errorHandler)
  - All Phase 2-4 routes that import yamlService for parse/validate/serialize
  - Phase 5 YAML editor uses validateYaml for inline error reporting

# Tech tracking
tech-stack:
  patterns:
    - js-yaml JSON_SCHEMA: prevents YAML 1.1 boolean coercion (on/yes/no/off stay as strings)
    - serializeYaml options: sortKeys:false (preserve key order), lineWidth:-1 (no wrapping), noRefs:true
    - validateYaml: checks both missing AND extra top-level keys; validates 5 array fields
    - assignNextId: scans ALL items including completed (status:'completed') to prevent ID reuse
    - asyncWrapper: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
    - errorHandler: 4-param signature required by Express (removing 'next' silently breaks it)

key-files:
  created:
    - server/services/yamlService.js
    - server/middleware/asyncWrapper.js
    - server/middleware/errorHandler.js
  modified:
    - server/services/yamlService.test.js (stubs → real assertions)

key-decisions:
  - "JSON_SCHEMA is mandatory — default YAML schema coerces on/off/yes/no to booleans, permanently corrupting Drive data"
  - "errorHandler must declare 4 parameters even if 'next' is unused — Express identifies error middleware by arity"
  - "assignNextId scans all items (not just open) to prevent ID reuse after action completion"

patterns-established:
  - "Pattern 5: YAML parse — always yaml.load(content, { schema: yaml.JSON_SCHEMA })"
  - "Pattern 6: YAML serialize — always yaml.dump(data, { sortKeys: false, lineWidth: -1, noRefs: true })"
  - "Pattern 7: Validation — validateYaml(data) before any write; throws ValidationError (422)"

requirements-completed: [INFRA-03, INFRA-04, INFRA-05]

# Metrics
duration: 5min
completed: 2026-03-05
---

# Phase 1 Plan 03: yamlService + Middleware Summary

**YAML data integrity layer and Express middleware — all 15 tests green, JSON_SCHEMA coercion prevention confirmed**

## Performance

- **Duration:** 5 min
- **Completed:** 2026-03-05
- **Tasks:** 3
- **Files created:** 3, **Files modified:** 1

## Accomplishments
- `yamlService.js` implements all 7 exports: `parseYaml`, `serializeYaml`, `validateYaml`, `normalizeForSerialization`, `assignNextId`, `ValidationError`, `REQUIRED_TOP_LEVEL_KEYS`
- `parseYaml('status: on\n').status` confirmed as `string` (not boolean) — JSON_SCHEMA working
- All 15 yamlService tests pass (`node --test` — 0 failures, 0 todo, 0 skipped)
- `asyncWrapper` exports a function with correct `(fn) => (req, res, next)` signature
- `errorHandler` has exactly 4 parameters (arity confirmed: `h.length === 4`)

## Task Commits

1. **Task 1: yamlService.js** - `836a136` (feat)
2. **Task 2: Fill test stubs** - `e31326a` (test)
3. **Task 3: Middleware** - `dc971d3` (feat)

## Test Results

```
▶ parseYaml (3 tests) ✔
▶ serializeYaml (3 tests) ✔
▶ validateYaml (5 tests) ✔
▶ assignNextId (4 tests) ✔
tests 15 | pass 15 | fail 0 | todo 0
```

## Next Phase Readiness
- yamlService.js complete with all 7 exports — Plans 04/05 and all Phase 2-4 routes can use it
- asyncWrapper and errorHandler ready — Plan 04 (server/index.js) can mount them
- All INFRA-03/04/05 requirements satisfied

---
*Phase: 01-foundation*
*Completed: 2026-03-05*
