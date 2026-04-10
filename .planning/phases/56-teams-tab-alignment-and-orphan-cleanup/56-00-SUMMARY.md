---
phase: 56-teams-tab-alignment-and-orphan-cleanup
plan: "00"
subsystem: test-infrastructure
tags: [wave-0, tdd, test-stubs, verification]
dependency_graph:
  requires: []
  provides: [wave-0-test-stubs-team-01, wave-0-test-stubs-team-02]
  affects: [tests/teams/, tests/extraction/]
tech_stack:
  added: [tests/extraction/ directory]
  patterns: [vitest-test-stubs, red-before-green]
key_files:
  created:
    - bigpanda-app/tests/teams/team-engagement-map.test.tsx
    - bigpanda-app/tests/extraction/extraction-preview-coverage.test.ts
    - bigpanda-app/tests/extraction/extraction-item-row-fields.test.ts
    - bigpanda-app/tests/extraction/extraction-edit-form-fields.test.ts
  modified: []
  deleted:
    - bigpanda-app/tests/teams/engagement-overview.test.tsx
    - bigpanda-app/tests/teams/warn-banner-trigger.test.tsx
decisions: []
metrics:
  duration_seconds: 92
  completed_at: "2026-04-10T19:19:58Z"
  tasks_completed: 3
  files_created: 4
  files_deleted: 2
  commits: 3
---

# Phase 56 Plan 00: Test Infrastructure for Teams Tab Alignment

Test stubs for 4-section Teams tab and 21-type extraction coverage (RED state before Wave 1 implementation).

## What Was Done

Created test infrastructure for Phase 56 verification by establishing automated feedback loops before implementation tasks run. All tests are currently in RED state (failing) and will pass after Wave 1+ tasks complete the implementation.

### Task 1: Team Engagement Map Test Stub

Created `tests/teams/team-engagement-map.test.tsx` with 3 test cases for TEAM-01 verification:
- Verifies exactly 4 sections rendered (Business Value & Outcomes, End-to-End Workflows, Teams & Engagement Status, Focus Areas)
- Verifies Architecture section NOT present
- Verifies plain text headers without numbered badges (no SectionHeader component usage)

Tests currently FAIL because TeamEngagementMap still has 5 sections with SectionHeader component. Task 56-01-01 will make tests pass.

Commit: `3dadcef`

### Task 2: Extraction Component Test Stubs

Created 3 test files under `tests/extraction/` directory for TEAM-02 verification:

1. **extraction-preview-coverage.test.ts**: Verifies TAB_LABELS and ENTITY_ORDER include all 21 entity types
2. **extraction-item-row-fields.test.ts**: Verifies primaryFieldKeys has entries for all 21 entity types
3. **extraction-edit-form-fields.test.ts**: Verifies ENTITY_FIELDS has entries for all 21 entity types

Tests currently FAIL/INCOMPLETE because components only handle 10 entity types. Task 56-02-* will add the 11 missing types.

21 entity types verified:
- action, risk, decision, milestone, stakeholder
- task, architecture, history, businessOutcome, team
- focus_area, e2e_workflow, wbs_task, note, team_pathway
- workstream, onboarding_step, integration, arch_node
- before_state, weekly_focus

Commit: `6bd6ab2`

### Task 3: Obsolete Test File Cleanup

Deleted 2 obsolete test files for components being removed in Plan 56-01:
- `tests/teams/engagement-overview.test.tsx` — tested TeamEngagementOverview component (being deleted)
- `tests/teams/warn-banner-trigger.test.tsx` — tested WarnBanner in TeamEngagementOverview (being deleted)

No test files now reference deleted components (TeamsPageTabs, TeamEngagementOverview, ArchOverviewSection).

Commit: `1ec02c2`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All 4 required test files created and run without syntax errors:
- `tests/teams/team-engagement-map.test.tsx` ✓
- `tests/extraction/extraction-preview-coverage.test.ts` ✓
- `tests/extraction/extraction-item-row-fields.test.ts` ✓
- `tests/extraction/extraction-edit-form-fields.test.ts` ✓

Test results:
- 7 total tests: 3 passed, 4 failed (RED state expected before Wave 1)
- All tests run without syntax errors
- No references to deleted components remain in test directory

Wave 0 completeness verified:
```bash
✓ tests/teams/team-engagement-map.test.tsx exists
✓ tests/extraction/extraction-preview-coverage.test.ts exists
✓ tests/extraction/extraction-item-row-fields.test.ts exists
✓ tests/extraction/extraction-edit-form-fields.test.ts exists
✓ Obsolete tests deleted
✓ No deleted component references
```

## Next Steps

Wave 1 tasks (Plans 56-01 and 56-02) will implement the changes to make these tests pass:
- Plan 56-01: Update TeamEngagementMap to 4-section design (makes team-engagement-map.test.tsx GREEN)
- Plan 56-02: Add 11 missing entity types to extraction components (makes extraction/*.test.ts GREEN)

## Self-Check

Verifying all claimed files and commits exist:

```bash
# Check test files
✓ tests/teams/team-engagement-map.test.tsx exists
✓ tests/extraction/extraction-preview-coverage.test.ts exists
✓ tests/extraction/extraction-item-row-fields.test.ts exists
✓ tests/extraction/extraction-edit-form-fields.test.ts exists

# Check deleted files removed
✓ tests/teams/engagement-overview.test.tsx deleted
✓ tests/teams/warn-banner-trigger.test.tsx deleted

# Check commits
✓ 3dadcef exists (Task 1)
✓ 6bd6ab2 exists (Task 2)
✓ 1ec02c2 exists (Task 3)
```

## Self-Check: PASSED
