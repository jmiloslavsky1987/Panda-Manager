---
phase: 072-feature-unification
plan: "03"
subsystem: components
tags: [refactor, naming, tests, clarity]
completed: 2026-04-20T15:21:43Z
duration_minutes: 5
dependency_graph:
  requires: []
  provides: [clear-component-naming, severity-parity-test]
  affects: [search-components, team-metadata-modals, risk-components]
tech_stack:
  added: []
  patterns: [intentional-scope-comments, enum-parity-tests]
key_files:
  created:
    - bigpanda-app/components/GlobalProjectSearchBar.tsx
    - bigpanda-app/components/WorkspaceSearchBar.tsx
    - bigpanda-app/components/teams/TeamMetadataEditModal.tsx
    - bigpanda-app/tests/schema/severity-enum-parity.test.ts
  modified:
    - bigpanda-app/app/layout.tsx
    - bigpanda-app/app/customer/[id]/layout.tsx
    - bigpanda-app/components/HeaderBar.tsx
    - bigpanda-app/components/AppChrome.tsx
    - bigpanda-app/tests/search/global-search.test.tsx
    - bigpanda-app/components/teams/BusinessOutcomesSection.tsx
    - bigpanda-app/components/teams/E2eWorkflowsSection.tsx
    - bigpanda-app/components/teams/FocusAreasSection.tsx
    - bigpanda-app/components/RisksTableClient.tsx
  deleted:
    - bigpanda-app/components/SearchBar.tsx
    - bigpanda-app/components/GlobalSearchBar.tsx
    - bigpanda-app/components/teams/InlineEditModal.tsx
decisions:
  - name: intentional-scope-comments
    rationale: "Added file-level comments to each renamed component documenting its specific scope to prevent future confusion. Pattern: `// intentional: [ComponentName] [what it does] — [key distinguishing detail]`"
  - name: severity-parity-test-pattern
    rationale: "Created test that asserts UI constant values match DB enum values to prevent silent divergence. Uses bidirectional checks (UI ⊆ DB and DB ⊆ UI) plus length check to ensure exact match."
metrics:
  files_touched: 15
  lines_added: 161
  lines_deleted: 42
  test_coverage: "2 new test cases (severity parity)"
---

# Phase 072 Plan 03: Component Naming Clarity Summary

**One-liner:** Renamed three components to eliminate backwards naming (SearchBar now GlobalProjectSearchBar for all-projects search, GlobalSearchBar now WorkspaceSearchBar for single-project search), added intentional-scope comments, and created severity enum parity test to prevent DB-UI divergence.

## What Was Built

Renamed three components with misleading names, updated all import sites, and added a test to prevent severity enum duplication:

1. **SearchBar → GlobalProjectSearchBar** (7 files updated)
   - Routes to `/search?q=` for cross-project search
   - Intentional comment: "searches across all projects"
   - Updated: app/layout.tsx, HeaderBar.tsx, AppChrome.tsx (comments only)

2. **GlobalSearchBar → WorkspaceSearchBar** (2 files updated)
   - Scoped to single projectId with live dropdown results
   - Intentional comment: "searches within a single project workspace"
   - Updated: customer/[id]/layout.tsx, tests/search/global-search.test.tsx

3. **InlineEditModal → TeamMetadataEditModal** (3 files updated)
   - Clarifies it edits project-level team metadata (not entity rows)
   - Intentional comment: "edits project-level team metadata (business outcomes, focus areas) — not entity rows"
   - Updated: BusinessOutcomesSection.tsx, E2eWorkflowsSection.tsx, FocusAreasSection.tsx

4. **Severity enum parity test** (1 new file)
   - Asserts SEVERITY_OPTIONS UI values exactly match DB severityEnum values
   - 2 test cases: bidirectional containment + length check
   - Prevents silent divergence when DB schema changes
   - Exported SEVERITY_OPTIONS from RisksTableClient.tsx for test access

## Deviations from Plan

None - plan executed exactly as written. All tasks completed successfully.

## Verification Results

- ✅ All renamed files exist; old files deleted
- ✅ Grep-clean checks pass for all three renames (no stale references)
- ✅ severity-enum-parity.test.ts passes (2/2 test cases)
- ✅ Tests specific to renamed components pass (4 passed, 4 skipped in global-search.test.tsx + severity-parity)
- ⚠️ Pre-existing TypeScript error in ingestion/approve/route.ts (out of scope - not caused by this plan's changes)
- ⚠️ Pre-existing test failures in unrelated tests (out of scope - existed before this plan)

## Commits

- `caaf762` — refactor(072-03): rename search components for clarity
- `8a386fe` — refactor(072-03): rename InlineEditModal and add severity parity test

## Technical Notes

**Intentional-scope comment pattern:** Added file-level comments immediately after 'use client' directives following the format: `// intentional: [ComponentName] [action] — [distinguishing detail]`. This pattern documents the component's scope at the point of definition, making it immediately visible to future developers.

**Severity parity test design:** Uses three assertions to ensure exact match:
1. All component values are in DB enum (UI ⊆ DB)
2. All DB enum values are in component (DB ⊆ UI)
3. Arrays have same length (no duplicates)

This catches additions, deletions, and typos in either constant.

**Out-of-scope build error:** The TypeScript error in `app/api/ingestion/approve/route.ts:396` is pre-existing and unrelated to component renames. The error is about milestone status field type mismatch. Per deviation rules, this is out of scope for this plan.

## Impact Summary

**Before:** SearchBar and GlobalSearchBar had backwards names (SearchBar was actually global, GlobalSearchBar was actually scoped). InlineEditModal was ambiguous (what does it edit?). SEVERITY_OPTIONS could diverge from DB enum silently.

**After:** Component names match their actual behavior. File-level intentional comments clarify scope. All import sites updated. Severity parity test prevents DB-UI divergence. Grep-clean verification confirms no stale references.

## Self-Check: PASSED

All created files exist:
```bash
✅ bigpanda-app/components/GlobalProjectSearchBar.tsx
✅ bigpanda-app/components/WorkspaceSearchBar.tsx
✅ bigpanda-app/components/teams/TeamMetadataEditModal.tsx
✅ bigpanda-app/tests/schema/severity-enum-parity.test.ts
```

All deleted files removed:
```bash
✅ bigpanda-app/components/SearchBar.tsx (deleted)
✅ bigpanda-app/components/GlobalSearchBar.tsx (deleted)
✅ bigpanda-app/components/teams/InlineEditModal.tsx (deleted)
```

All commits exist:
```bash
✅ caaf762 — refactor(072-03): rename search components for clarity
✅ 8a386fe — refactor(072-03): rename InlineEditModal and add severity parity test
```

All tests pass:
```bash
✅ tests/search/global-search.test.tsx — 4 passed, 4 skipped
✅ tests/schema/severity-enum-parity.test.ts — 2 passed
```
