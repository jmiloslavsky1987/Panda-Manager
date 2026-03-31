---
phase: 19-external-discovery-scan
plan: 06
subsystem: test, verification
tags: [vitest, discovery, approval, audit, verification]
commit: pending
---

# 19-06 Summary: Phase 19 Verification Checkpoint

## What was done

Task 1 (automated): Fixed 4 failing tests in `tests/discovery/approve.test.ts` and achieved
full GREEN on all 19 discovery tests across 5 test files.

**Root causes fixed:**
- `db.transaction` was not mocked — the approve route wraps all entity inserts in
  `db.transaction(tx => ...)`, but the test mock only had `select/insert/update/delete`.
  Fixed by restructuring the `vi.mock('@/db', ...)` factory to expose `transaction` that
  delegates the callback back through the same mocked `db` object.
- `auditLog` was missing from the `vi.mock('@/db/schema', ...)` — route imports it;
  test would throw on undefined table reference.
- `setupDbInsert()` chain lacked `.returning()` — entity inserts call `.values().returning()`;
  fixed by making `.values()` return `this` and adding `.returning()` resolving to `[{ id: 999 }]`.
- DISC-13 bulk test expected `db.insert` called 2 times (one per item), but the route
  inserts both the entity row AND an auditLog row per item → 4 total. Updated to match actual behavior.

**Pre-existing TypeScript errors in `tests/audit/discovery-approve-audit.test.ts`** (added in
phase 25-01) were identified as out-of-scope; no Phase 19 source files have TypeScript errors.

## Test results

```
Test Files  5 passed (5)
Tests  19 passed (19)
```

## Human verification

Task 2 (human checkpoint) — all 14 verification steps for the complete scan-to-review-to-approve
flow confirmed as passing in the running application.

## Requirements covered

DISC-01 through DISC-17 — full Phase 19 verification complete.
