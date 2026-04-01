---
created: 2026-04-01T17:58:15.290Z
title: Fix 13 pre-existing test failures across 6 test files
area: testing
files:
  - bigpanda-app/tests/ingestion/write.test.ts
  - bigpanda-app/tests/ingestion/dedup.test.ts
  - bigpanda-app/tests/wizard/completeness-banner.test.ts
  - bigpanda-app/tests/wizard/completeness.test.ts
  - bigpanda-app/tests/scheduler-map.test.ts
  - bigpanda-app/tests/wizard/launch.test.ts
  - bigpanda-app/worker/scheduler.ts
---

## Problem

Full test suite has 13 pre-existing failures (363 passing) across 6 test files accumulated from earlier phases. None are regressions from Phase 30 — all were documented as out-of-scope at the time but never fixed.

**Breakdown by root cause:**

1. **`tests/scheduler-map.test.ts` — 6 failures (Phase 24)**
   - Root cause: `JOB_SCHEDULE_MAP` export removed from `worker/scheduler.ts` by commit `e6867ac` ("remove Settings Jobs tab, migrate all scheduling to DB-driven /scheduler UI")
   - Fix: Either restore the export (stub/empty map) for backward compat, or delete the test file since the feature was intentionally removed

2. **`tests/ingestion/write.test.ts` — 5 failures (Phase 18-19)**
   - Root cause: `actions.values()` is undefined in `app/api/ingestion/approve/route.ts:234`
   - Fix: Investigate the mock setup in the test — likely a missing mock for the `actions` table import

3. **`tests/ingestion/dedup.test.ts` — 1 failure (Phase 18-19)**
   - Root cause: Same approve route issue (`actions.values()` undefined)
   - Fix: Same as above — likely resolved together with write.test.ts

4. **`tests/wizard/completeness-banner.test.ts` + `tests/wizard/completeness.test.ts` — 2 failures (Phase 20)**
   - Root cause: `Cannot find package '@opentelemetry/api' imported from better-auth/core/dist/instrumentation/tracer.mjs`
   - Fix: Add `@opentelemetry/api` as a dev dependency OR add a vitest alias mock to suppress the import (same pattern as `server-only` mock added in Phase 19)

5. **`tests/wizard/launch.test.ts` — 1 failure (Phase 25/29)**
   - Root cause: `db.query.projects` is undefined — likely a missing/broken db mock
   - Fix: Align mock setup with pattern used in passing tests

## Solution

Address each root cause:
- scheduler-map: Delete test (feature intentionally removed) or add empty-map stub export
- ingestion tests: Fix `actions` mock in test setup
- wizard/completeness tests: Add `@opentelemetry/api` vitest alias mock in `vitest.config.ts`
- wizard/launch: Fix db mock to include `query.projects`

Target: 376 passing, 0 failing.
