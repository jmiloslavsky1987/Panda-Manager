---
phase: 30-context-hub
plan: 01
subsystem: context-hub
tags: [tdd, red-phase, test-infrastructure]
dependency_graph:
  requires: []
  provides:
    - CTX-01 RED stubs (Context tab registration)
    - CTX-02 RED stubs (new entity types: workstream/onboarding_step/integration)
    - CTX-03 RED stubs (completeness endpoint)
    - CTX-04 RED stubs (ContextTab component)
  affects: [tests/context/, tests/ui/workspace-tabs.test.tsx, tests/ingestion/extractor.test.ts]
tech_stack:
  added: []
  patterns: [wave-0-stubs, undefined-toBeDefined]
key_files:
  created:
    - bigpanda-app/tests/context/completeness.test.ts
    - bigpanda-app/tests/context/context-tab.test.tsx
  modified:
    - bigpanda-app/tests/ui/workspace-tabs.test.tsx
    - bigpanda-app/tests/ingestion/extractor.test.ts
decisions: []
metrics:
  duration_seconds: 245
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_modified: 4
  commits: 2
---

# Phase 30 Plan 01: RED Test Stubs for Context Hub Summary

**One-liner:** 26 Wave 0 RED test stubs created across 4 files establishing failing baseline for Phase 30 requirements

## Overview

Created RED test infrastructure for all Phase 30 Context Hub requirements before implementation begins. All stubs use the project's Wave 0 pattern (`const target: any = undefined; expect(target).toBeDefined()`) to fail cleanly without brittle import errors on missing modules.

## Tasks Completed

### Task 1: Create tests/context/ stubs for CTX-03 and CTX-04
**Status:** Complete
**Commit:** 001faad

Created new `tests/context/` directory with two test files:

**completeness.test.ts (5 RED stubs for CTX-03)**
- Returns array with one entry per workspace tab (11 tabs)
- Each entry has tabId, status, and gaps array
- Status is "empty" for template-only records
- Gaps array contains specific record-level descriptions
- Rejects unauthenticated requests with 401

**context-tab.test.tsx (9 RED stubs for CTX-04)**
- Completeness UI (6 stubs): 11 tab rows, status badges, collapse/expand, Analyze button, loading state
- Upload section (1 stub): upload trigger button
- Upload history list (2 stubs): columns display, read-only behavior

**Files created:**
- `bigpanda-app/tests/context/completeness.test.ts`
- `bigpanda-app/tests/context/context-tab.test.tsx`

### Task 2: Extend existing test files for CTX-01 and CTX-02
**Status:** Complete
**Commit:** 5c56ce8

Extended two existing test files without breaking any existing tests:

**workspace-tabs.test.tsx (3 RED stubs for CTX-01)**
- Context tab registered in TAB_GROUPS with standalone: true
- Context tab URL pattern is ?tab=context
- Context tab appears before Admin in tab order

**extractor.test.ts (9 RED stubs for CTX-02)**
- EntityType union includes: workstream, onboarding_step, integration
- EXTRACTION_SYSTEM prompt includes field guidance for all 3 types
- isAlreadyIngested handles all 3 new entity types

**Files modified:**
- `bigpanda-app/tests/ui/workspace-tabs.test.tsx`
- `bigpanda-app/tests/ingestion/extractor.test.ts`

## Verification Results

### Test Execution Summary
```
Test Files  4 failed (4)
     Tests  26 failed | 11 passed (37)
  Duration  419ms
```

**Breakdown:**
- 26 RED failures (as designed)
- 11 existing tests remain GREEN
- No import errors or module crashes
- Clean Wave 0 pattern throughout

**Test files involved:**
1. `tests/context/completeness.test.ts` - 5 RED stubs
2. `tests/context/context-tab.test.tsx` - 9 RED stubs
3. `tests/ui/workspace-tabs.test.tsx` - 3 RED stubs (6 existing GREEN)
4. `tests/ingestion/extractor.test.ts` - 9 RED stubs (5 existing GREEN)

### Success Criteria Met
- ✅ 4 test files exist (2 new, 2 extended)
- ✅ All 26 new stubs fail RED with "expected undefined to be defined"
- ✅ No import errors or brittle crashes
- ✅ Existing 11 tests in extended files remain GREEN
- ✅ tests/context/ directory created

## Deviations from Plan

None - plan executed exactly as written.

## Key Implementation Details

### Wave 0 Pattern Applied
All stubs follow the project convention established in Phase 26:
```typescript
it('description', () => {
  const target: any = undefined;
  expect(target).toBeDefined();
});
```

This pattern:
- Fails RED without requiring imports of unimplemented modules
- Provides clear error messages
- Avoids brittle TypeScript compilation failures
- Enables incremental GREEN implementation in subsequent plans

### Test Organization
- **New directory:** `tests/context/` for Context Hub-specific tests
- **Extended files:** Appended new describe blocks to preserve existing test structure
- **No modifications:** Existing test logic remains untouched

### Requirement Coverage
| Requirement | Test File | Stub Count |
|-------------|-----------|------------|
| CTX-01 | workspace-tabs.test.tsx | 3 |
| CTX-02 | extractor.test.ts | 9 |
| CTX-03 | completeness.test.ts | 5 |
| CTX-04 | context-tab.test.tsx | 9 |

## Next Steps

Phase 30 plans 02-05 will implement features and turn these RED stubs GREEN:
- **30-02-PLAN.md:** New entity types (workstream, onboarding_step, integration)
- **30-03-PLAN.md:** Context tab registration
- **30-04-PLAN.md:** Completeness endpoint
- **30-05-PLAN.md:** ContextTab UI component
- **30-06-PLAN.md:** Integration and verification

## Self-Check

**Created files:**
```bash
[ -f "bigpanda-app/tests/context/completeness.test.ts" ] && echo "FOUND"
[ -f "bigpanda-app/tests/context/context-tab.test.tsx" ] && echo "FOUND"
```

**Modified files:**
```bash
git diff HEAD~2 --name-only | grep -E "workspace-tabs|extractor"
```

**Commits:**
```bash
git log --oneline -2 | grep -E "001faad|5c56ce8"
```

## Self-Check: PASSED

All claims verified:
- ✅ Both new test files exist
- ✅ Both modified files in git history
- ✅ Both commits (001faad, 5c56ce8) present in git log
- ✅ 26 RED failures confirmed in test output
- ✅ 11 existing tests remain GREEN
