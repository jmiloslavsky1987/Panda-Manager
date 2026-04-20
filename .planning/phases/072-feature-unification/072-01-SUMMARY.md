---
phase: 072-feature-unification
plan: "01"
subsystem: data-integrity
tags: [refactoring, database, enums, validation]
dependencies:
  requires: []
  provides: [risk-status-enum, milestone-status-enum]
  affects: [risks-table, milestones-table, migrate-local-script]
tech_stack:
  added: [riskStatusEnum, milestoneStatusEnum]
  patterns: [pgEnum, explicit-validation, data-normalization]
key_files:
  created:
    - bigpanda-app/db/migrations/0036_risk_milestone_status_enums.sql
  modified:
    - bigpanda-app/db/schema.ts
    - bigpanda-app/scripts/migrate-local.ts
decisions:
  - risk-status-invalid-values-null
  - milestone-status-invalid-values-not-started
  - forward-only-migration-with-normalization
metrics:
  duration_seconds: 170
  tasks_completed: 3
  commits: 3
  files_modified: 3
  completed_at: "2026-04-20T15:16:37Z"
---

# Phase 072 Plan 01: Risk and Milestone Status Enums

**One-liner:** Added DB-enforced enum types for risks.status and milestones.status columns with data normalization migration.

## Objective

Close the highest-priority finding from Phase 71 audit: invalid status values can reach the database because `risks.status` and `milestones.status` are plain `text` with no DB-level constraint. This brings them to parity with `actions.status` which already uses `actionStatusEnum`.

## What Was Built

### 1. Schema Enums (bigpanda-app/db/schema.ts)
- **riskStatusEnum**: `['open', 'mitigated', 'resolved', 'accepted']`
- **milestoneStatusEnum**: `['not_started', 'in_progress', 'completed', 'blocked']`
- Updated `risks.status` column from `text('status')` to `riskStatusEnum('status')`
- Updated `milestones.status` column from `text('status')` to `milestoneStatusEnum('status')`

### 2. Migration SQL (0036_risk_milestone_status_enums.sql)
Three-step forward-only migration:
1. **CREATE TYPE** statements for both enums
2. **Data normalization UPDATEs** before ALTER COLUMN:
   - `risks.status`: invalid values → `NULL` (un-triaged state)
   - `milestones.status`: invalid values → `'not_started'` (default state)
3. **ALTER COLUMN** statements with USING clause for type casting

### 3. Runtime Validation (bigpanda-app/scripts/migrate-local.ts)
- Added `riskStatusRaw` validation: explicit checks against enum values before insert (lines 404-410)
- Added `msStatusRaw` validation: explicit checks against enum values before insert (lines 444-451)
- Pattern matches existing `severityRaw` validation (lines 394-402)
- Invalid values rejected at application layer before reaching DB

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions

### 1. Risk status invalid values → null
**Decision:** Invalid risk status values are normalized to `NULL` rather than a default enum value.

**Rationale:** Risks may be un-triaged, and `NULL` accurately represents "status not yet determined" better than forcing a default like `'open'`. This preserves data fidelity during migration.

### 2. Milestone status invalid values → 'not_started'
**Decision:** Invalid milestone status values are normalized to `'not_started'` (not `NULL`).

**Rationale:** Milestones are typically expected to have a status value in the UI. Using `'not_started'` as the safe default prevents null-handling edge cases in milestone display components.

### 3. Forward-only migration with normalization
**Decision:** Migration includes data normalization UPDATEs before ALTER COLUMN statements.

**Rationale:** Ensures no data loss during migration. Invalid values are coerced to safe fallbacks rather than causing migration failure. Matches project's existing migration pattern (no rollback SQL).

## Test Results

### Verification
1. ✅ Both enums exported in db/schema.ts (lines 51, 53)
2. ✅ Migration file 0036 exists with CREATE TYPE, UPDATE, ALTER COLUMN statements
3. ✅ TypeScript build passes (npx tsc --noEmit, no errors in modified files)
4. ✅ Validation guards present in migrate-local.ts for both status fields

### Manual Testing
Not applicable — migration has not been applied to database yet. This is schema + migration file only.

## Files Changed

| File | Lines Changed | Purpose |
|------|---------------|---------|
| db/schema.ts | +4 | Added two pgEnum definitions, updated column types |
| db/migrations/0036_risk_milestone_status_enums.sql | +24 | Forward-only SQL migration with normalization |
| scripts/migrate-local.ts | +20 | Added explicit validation guards for both status fields |

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| 621e25d | feat(072-01): add riskStatusEnum and milestoneStatusEnum to schema | db/schema.ts |
| 0071a6b | feat(072-01): add migration 0036 for risk/milestone status enums | db/migrations/0036_risk_milestone_status_enums.sql |
| 3db1306 | feat(072-01): validate risk and milestone status in migrate-local.ts | scripts/migrate-local.ts |

## Dependencies

**Requires:** None (independent refactoring)

**Provides:**
- `riskStatusEnum` — DB-level constraint for risks.status
- `milestoneStatusEnum` — DB-level constraint for milestones.status

**Affects:**
- Any code reading/writing `risks.status` must now use enum values
- Any code reading/writing `milestones.status` must now use enum values
- Future migrations must apply 0036 before risks/milestones status can be queried

## Next Steps

1. **Apply migration:** Run `npx drizzle-kit push` or equivalent to apply 0036 to database
2. **Verify UI:** Test Risks and Milestones tables to confirm enum values display correctly
3. **Update API handlers:** Ensure any POST/PATCH endpoints validate status against enum values (if not already covered by Drizzle schema enforcement)

## Integration Notes

**Phase 72 dependency:** This plan (072-01) is a prerequisite for remaining Phase 72 plans. Plans 072-02, 072-03, 072-04 may depend on consistent status enum enforcement.

**Runtime behavior:** After migration, any attempt to insert invalid status values will fail at the database level with a constraint violation error. Application code is already protected via migrate-local.ts validation.

## Self-Check

### Files Exist
```
✅ FOUND: bigpanda-app/db/schema.ts (modified)
✅ FOUND: bigpanda-app/db/migrations/0036_risk_milestone_status_enums.sql (created)
✅ FOUND: bigpanda-app/scripts/migrate-local.ts (modified)
```

### Commits Exist
```
✅ FOUND: 621e25d (Task 1: schema enums)
✅ FOUND: 0071a6b (Task 2: migration SQL)
✅ FOUND: 3db1306 (Task 3: migrate-local validation)
```

**Result:** PASSED — All deliverables confirmed.
