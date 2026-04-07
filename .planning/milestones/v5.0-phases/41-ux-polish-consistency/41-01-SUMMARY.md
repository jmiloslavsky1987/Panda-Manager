---
phase: 41-ux-polish-consistency
plan: 01
subsystem: ui-testing
tags: [tdd, red-first, empty-states, skeletons, overdue]
dependency_graph:
  requires: []
  provides: [UXPOL-01-tests, UXPOL-02-tests, UXPOL-03-tests, EmptyState-component]
  affects: [empty-state-pattern, overdue-pattern, skeleton-pattern]
tech_stack:
  added: [EmptyState-component]
  patterns: [vitest-jsdom-testing, tdd-red-first]
key_files:
  created:
    - bigpanda-app/components/EmptyState.tsx
    - bigpanda-app/tests/ui/empty-states.test.tsx
    - bigpanda-app/tests/ui/overdue-highlighting.test.tsx
    - bigpanda-app/tests/ui/loading-skeletons.test.tsx
  modified: []
decisions: []
metrics:
  tasks_completed: 2
  tests_added: 16
  tests_passing: 5
  tests_red: 10
  duration_seconds: 198
  completed_at: "2026-04-07T06:41:31Z"
---

# Phase 41 Plan 01: TDD Scaffolds & EmptyState Component Summary

**One-liner:** Created 16 RED-first tests for empty states, overdue highlighting, and loading skeletons; implemented shared EmptyState component (5 tests GREEN).

## Objective

Wave 0 TDD scaffolds for Phase 41 UX Polish. Established failing tests for UXPOL-01 (9 empty state CTAs), UXPOL-02 (4 overdue highlighting behaviors), and UXPOL-03 (3 loading skeleton states). Created shared EmptyState component to pass direct empty state tests.

## Outcomes

### What Was Built

1. **Test Scaffolds (RED-first)**
   - `empty-states.test.tsx`: 9 tests covering Actions, Risks, Milestones, Decisions tables + 5 standalone empty states
   - `overdue-highlighting.test.tsx`: 4 tests for Actions/Milestones overdue row styling
   - `loading-skeletons.test.tsx`: 3 tests for OverviewMetrics, HealthDashboard, SkillsTabClient loading states

2. **EmptyState Component (GREEN)**
   - Shared component with title, description, and optional action button
   - Uses Button component from ui/button library
   - Client component (interactive onClick handler)
   - 5 direct tests passing (Stakeholders, Artifacts, History, Teams, Architecture)

### Success Criteria Status

✅ 3 test files exist in bigpanda-app/tests/ui/
✅ EmptyState.tsx exists and compiles (no TypeScript errors)
✅ Tests that directly test EmptyState component pass GREEN (5/9 empty-states tests)
✅ Tests for table client behaviors remain RED (correct — implementations come in plans 41-02 and 41-03)
✅ Full test suite shows no regressions (24 tests passing total, 10 expected RED)

## Technical Implementation

### Test Pattern

All tests follow the jsdom pattern established in workspace-tabs.test.tsx:
- Mock next/navigation (useRouter, useSearchParams)
- Use @testing-library/react render and screen utilities
- Test accessibility via role queries

### EmptyState Component Interface

```typescript
interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}
```

### Test Results Breakdown

**Empty States (9 tests):**
- ✅ Stakeholders empty state (EmptyState direct)
- ✅ Artifacts empty state (EmptyState direct)
- ✅ History empty state (EmptyState direct, no button)
- ✅ Teams empty state (EmptyState direct)
- ✅ Architecture empty state (EmptyState direct)
- ❌ Actions table empty state (needs implementation)
- ❌ Risks table empty state (needs implementation)
- ❌ Milestones table empty state (needs implementation)
- ❌ Decisions table empty state (needs implementation)

**Overdue Highlighting (4 tests):**
- ❌ Actions table overdue open action (needs border-red-500 bg-red-50)
- ❌ Actions table completed action (should NOT have overdue styling)
- ❌ Milestones table overdue incomplete milestone (needs border-red-500 bg-red-50)
- ❌ Milestones table completed milestone (should NOT have overdue styling)

**Loading Skeletons (3 tests):**
- ❌ OverviewMetrics 3-card skeleton grid (currently shows 1 skeleton)
- ✅ HealthDashboard skeleton (already implemented)
- ❌ SkillsTabClient initial mount skeleton (no loading state exists)

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

**Wave 1 Plans (41-02, 41-03):**
1. Implement empty state CTAs for table clients (Actions, Risks, Milestones, Decisions)
2. Implement overdue row highlighting for Actions and Milestones tables
3. Implement/fix loading skeletons for OverviewMetrics and SkillsTabClient

**Wave 2 Plan (41-04):**
- Phase gate verification

## Testing

```bash
# Run new test suites
cd bigpanda-app && npm test tests/ui/empty-states.test.tsx tests/ui/overdue-highlighting.test.tsx tests/ui/loading-skeletons.test.tsx -- --run

# Current results: 5 GREEN (EmptyState direct), 10 RED (implementations needed), 1 GREEN (HealthDashboard already working)
```

## Files Changed

**Created:**
- `bigpanda-app/components/EmptyState.tsx` (26 lines)
- `bigpanda-app/tests/ui/empty-states.test.tsx` (85 lines)
- `bigpanda-app/tests/ui/overdue-highlighting.test.tsx` (112 lines)
- `bigpanda-app/tests/ui/loading-skeletons.test.tsx` (61 lines)

## Commits

- `f76d269`: test(41-01): add failing tests for UXPOL-01, UXPOL-02, UXPOL-03
- `760e31c`: feat(41-01): create shared EmptyState component

## Self-Check

Verifying plan deliverables:

**Files:**
- ✅ bigpanda-app/components/EmptyState.tsx exists
- ✅ bigpanda-app/tests/ui/empty-states.test.tsx exists
- ✅ bigpanda-app/tests/ui/overdue-highlighting.test.tsx exists
- ✅ bigpanda-app/tests/ui/loading-skeletons.test.tsx exists

**Commits:**
- ✅ f76d269 exists in git log
- ✅ 760e31c exists in git log

**Test Results:**
- ✅ 5 EmptyState tests passing (GREEN)
- ✅ 10 implementation tests failing (RED - expected)
- ✅ 1 HealthDashboard test passing (already implemented)
- ✅ No regressions (24 tests passing overall)

## Self-Check: PASSED
