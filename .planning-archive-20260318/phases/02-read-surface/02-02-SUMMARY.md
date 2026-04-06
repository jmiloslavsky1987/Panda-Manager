---
phase: 02-read-surface
plan: 02
subsystem: server
tags: [express, supertest, patch, risks, milestones, atomic-write]

# Dependency graph
requires:
  - phase: 02-01
    provides: supertest installed, test stubs, driveService mock pattern

provides:
  - server/routes/risks.js with PATCH /:riskId (atomic write, 200/404/422)
  - server/routes/milestones.js with PATCH /:milestoneId (atomic write, 200/404)
  - server/routes/risks.test.js: 5 real supertest assertions
  - server/routes/milestones.test.js: 4 real supertest assertions

affects:
  - Phase 2 client (CustomerOverview uses patchRisk/patchMilestone API)

# Tech tracking
tech-stack:
  patterns:
    - Atomic write: read → parse → validate → find → merge → normalize → serialize → write
    - driveService mock via require.cache injection before app load
    - mergeParams: true on router — req.params.id from parent route available

key-files:
  modified:
    - server/routes/risks.js (501 stub → full PATCH implementation)
    - server/routes/milestones.js (501 stub → full PATCH implementation)
    - server/routes/risks.test.js (stubs → 5 real assertions)
    - server/routes/milestones.test.js (stubs → 4 real assertions)

requirements-completed: [CUST-07, CUST-08, CUST-09]

# Metrics
duration: ~5min
completed: 2026-03-05
commit: 5c25059
---

# Phase 2 Plan 02: PATCH Risks + Milestones Summary

**9 server integration tests green (5 risks + 4 milestones); PATCH endpoints implement atomic read/merge/write pattern**

## Accomplishments
- `PATCH /api/customers/:id/risks/:riskId` — returns 200 with merged risk, 404 if not found, 422 if invalid YAML
- `PATCH /api/customers/:id/milestones/:milestoneId` — returns 200 with merged milestone, 404 if not found
- Both endpoints: read → parseYaml → validateYaml → find → merge → normalizeForSerialization → serializeYaml → writeYamlFile
- All tests use require.cache mock injection (CJS-compatible, no ESM mock.module needed)
- yamlService.test.js still green (15/15) — no regressions

---
*Phase: 02-read-surface*
*Completed: 2026-03-05*
