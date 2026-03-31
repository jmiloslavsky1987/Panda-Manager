# Phase 26 Deferred Items

## Pre-Existing Test Failures (not caused by Phase 26 work)

### 1. tests/scheduler-map.test.ts (6 tests)
**Issue:** `JOB_SCHEDULE_MAP` is not exported from `worker/scheduler.ts` — the symbol doesn't exist in that file.
**Root cause:** Tests were written for a future scheduler refactor that was planned but not implemented in Phase 24.
**Fix needed:** Either export `JOB_SCHEDULE_MAP` from the worker, or delete these test stubs.
**Phase:** Post-Phase 26 (Phase 24 follow-up)

### 2. tests/discovery/approve.test.ts (4 tests)
**Issue:** `db.transaction is not a function` — the test mock for `@/db` doesn't include `transaction`.
**Root cause:** Tests were written against direct `db.insert/update` patterns, but the route now uses `db.transaction()` wrapping (added in Phase 22 for audit log compliance).
**Fix needed:** Add `transaction: vi.fn(async (cb) => cb(tx))` to the db mock with proper chainable `tx` methods.
**Phase:** Phase 26-05 or audit test hardening sprint

### 3. tests/ingestion/write.test.ts (5 tests)
**Issue:** `db.transaction is not a function` — same pattern as above.
**Root cause:** Ingestion approve route uses `db.transaction()` for audit-safe writes, but the test mock lacks it.
**Fix needed:** Add `transaction` to the db mock with a chainable tx object that mirrors `db.insert/update/select/delete`.
**Phase:** Phase 26-05 or audit test hardening sprint

### 4. tests/ingestion/dedup.test.ts (1 test — ING-08 replace path)
**Issue:** Inner `tx.insert` fails inside transaction callback.
**Root cause:** Same as above — `db.transaction` mock is too shallow.
**Fix needed:** Deep mock for tx object inside transaction callback.
**Phase:** Phase 26-05 or audit test hardening sprint

## Wave 0 RED Stubs (expected failures, intentional)

These are RED until their respective plans are implemented:
- `tests/auth/login.test.ts` — Wave 2, Plan 26-04
- `tests/auth/login-page.test.tsx` — Wave 2, Plan 26-04
- `tests/auth/setup-guard.test.ts` — Wave 2, Plan 26-04
- `tests/auth/user-management.test.ts` — Wave 3, Plan 26-05
- `tests/auth/self-mod-guard.test.ts` — Wave 3, Plan 26-05
