# Deferred Items (Phase 37)

## Out-of-Scope Test Failures

The following test failures were discovered during Phase 37-06 execution but are **not related to inline editing functionality**:

### Extraction Status Tests (4 failures)
- File: `tests/ingestion/extraction-status.test.ts`
- Error: `default.select(...).from(...).leftJoin is not a function`
- Cause: Mock DB instance missing `leftJoin` method
- Impact: None on Phase 37 functionality
- Note: Pre-existing issue in test setup

### Wizard Tests (2 failures)
- Files: `tests/wizard/create-project.test.ts`, `tests/wizard/launch.test.ts`
- Errors:
  - `db.transaction is not a function`
  - `Cannot read properties of undefined (reading 'projects')`
- Cause: Mock DB instance missing `transaction` and `query` properties
- Impact: None on Phase 37 functionality
- Note: Pre-existing issue in test setup

## Phase 37 Test Status

All Phase 37 inline editing tests are **GREEN**:
- ✓ actions-patch.test.ts (ACTN-02)
- ✓ actions-bulk.test.ts (ACTN-05)
- ✓ risks-patch.test.ts (IEDIT-01, IEDIT-03)
- ✓ milestones-patch.test.ts (IEDIT-02, IEDIT-04)
- ✓ stakeholders-get.test.ts (FORM-02, FORM-03)

**Total: 485 tests passing, 6 out-of-scope failures**
