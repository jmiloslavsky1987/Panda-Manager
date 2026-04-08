---
phase: 44-navigation-parity
plan: 01
subsystem: navigation
tags: [navigation, ui, routing, layout]
dependency_graph:
  requires: []
  provides:
    - "Flattened Delivery sub-tab structure with Plan first"
    - "WBS, Task Board, Gantt as direct Delivery sub-tabs"
    - "Intel tab removed, Decisions moved to Delivery"
    - "Engagement History moved to Admin"
    - "Dissolved plan/layout.tsx wrapper"
    - "Redirect pages for old /plan/* sub-routes"
    - "Wave 0 test stubs for bulk-update APIs"
  affects:
    - "WorkspaceTabs.tsx TAB_GROUPS structure"
    - "All /plan/* route pages"
    - "Navigation UX across entire workspace"
tech_stack:
  added: []
  patterns:
    - "Next.js redirect() for route migration"
    - "Pass-through layout for legacy route compatibility"
    - "Placeholder pages for upcoming features"
key_files:
  created:
    - "bigpanda-app/app/customer/[id]/wbs/page.tsx"
    - "bigpanda-app/app/customer/[id]/tasks/page.tsx"
    - "bigpanda-app/app/customer/[id]/gantt/page.tsx"
    - "bigpanda-app/app/api/__tests__/risks-bulk-update.test.ts"
    - "bigpanda-app/app/api/__tests__/milestones-bulk-update.test.ts"
  modified:
    - "bigpanda-app/components/WorkspaceTabs.tsx"
    - "bigpanda-app/app/customer/[id]/plan/layout.tsx"
    - "bigpanda-app/app/customer/[id]/plan/page.tsx"
    - "bigpanda-app/app/customer/[id]/plan/board/page.tsx"
    - "bigpanda-app/app/customer/[id]/plan/tasks/page.tsx"
    - "bigpanda-app/app/customer/[id]/plan/gantt/page.tsx"
    - "bigpanda-app/app/customer/[id]/plan/swimlane/page.tsx"
decisions:
  - "Intel tab completely removed — organizational clarity over feature preservation"
  - "Decisions moved to Delivery (alongside execution artifacts) vs Admin"
  - "Engagement History moved to Admin (org/meta concerns) vs remaining in Intel"
  - "Plan layout dissolved entirely — no nested chrome, direct board rendering"
  - "Old /plan/* routes redirect vs 404 — backward compatibility for bookmarks"
  - "WBS placeholder page vs waiting for Phase 45 — show intent, avoid blank nav"
  - "Wave 0 test stubs RED state accepted — tests validate future work in Plans 02/03"
metrics:
  duration: "8h24m (April 7-8, 2026)"
  tasks_completed: 4
  tasks_total: 4
  commits: 3
  files_created: 5
  files_modified: 10
  test_coverage: "2 new test files (expected RED state until Plans 02/03)"
completed_date: "2026-04-08"
---

# Phase 44 Plan 01: Navigation Restructure Summary

Navigation restructure with flattened Delivery sub-tabs, Intel tab removal, dissolved Plan layout, and Wave 0 bulk-update test stubs.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Wave 0 test stubs for bulk-update APIs | a800831 | ✓ Complete |
| 2 | Restructure WorkspaceTabs and create new route files | 6e55e6c | ✓ Complete |
| 3 | Dissolve plan/layout and inline board content | bb24f42 | ✓ Complete |
| 4 | Human verify navigation restructure | (approved) | ✓ Verified |

## What Was Built

### Navigation Structure Changes

**Before:**
```
Delivery (with sub-tabs):
  - Actions, Risks, Milestones
  - Plan (with nested sub-tabs):
    - Board, Task Board, Gantt, Swimlane

Intel (top-level tab with sub-tabs):
  - Decisions
  - Engagement History

Admin (with sub-tabs):
  - Artifacts, Review Queue
```

**After:**
```
Delivery (flattened sub-tabs):
  - Plan (first position, direct board view)
  - WBS
  - Task Board
  - Gantt
  - Actions, Risks, Milestones
  - Decisions (moved from Intel)

Admin (expanded sub-tabs):
  - Artifacts, Review Queue
  - Engagement History (moved from Intel)

Intel tab: REMOVED
```

### Route Architecture Changes

**New Top-Level Routes:**
- `/customer/[id]/wbs` — Placeholder page for upcoming WBS feature
- `/customer/[id]/tasks` — Task Board (promoted from /plan/tasks)
- `/customer/[id]/gantt` — Gantt chart (promoted from /plan/gantt)

**Dissolved Plan Layout:**
- `plan/layout.tsx` → Pass-through only (no PlanTabs, no SprintSummaryPanel wrapper)
- `plan/page.tsx` → Direct board rendering with SprintSummaryPanel inline

**Redirect Pages (backward compatibility):**
- `/plan/board` → redirects to `/plan`
- `/plan/tasks` → redirects to `/tasks`
- `/plan/gantt` → redirects to `/gantt`
- `/plan/swimlane` → redirects to `/plan`

### Wave 0 Test Stubs

Created test files for bulk-update APIs (to be implemented in Plans 02-03):
- `app/api/__tests__/risks-bulk-update.test.ts` — Tests for RISK-02 requirement
- `app/api/__tests__/milestones-bulk-update.test.ts` — Tests for MILE-02 requirement

**Current State:** Both test files are RED (expected) — routes do not exist yet. Plans 02 and 03 will implement the routes and turn these tests GREEN.

## Verification Results

### Automated Tests
- Pre-existing tests (health, sprint-summary, ai-plan): ✓ PASS
- New Wave 0 stubs (risks-bulk-update, milestones-bulk-update): ✗ RED (expected until Plans 02/03)

### Human Verification (Task 4)
User verified all 12 checkpoint criteria:
- ✓ Delivery tab shows flattened structure (Plan first, WBS/Task Board/Gantt promoted)
- ✓ Intel tab removed from top nav
- ✓ Decisions appears under Delivery sub-tabs
- ✓ Engagement History appears under Admin sub-tabs
- ✓ Plan sub-tab shows board content directly (no nested tabs)
- ✓ WBS sub-tab shows placeholder (not 404, not blank)
- ✓ Task Board and Gantt sub-tabs render correctly
- ✓ All 4 old /plan/* routes redirect without 404

**User Response:** "approved"

## Deviations from Plan

None — plan executed exactly as written. All tasks completed without modification, no unexpected issues discovered, no auto-fixes needed.

## Key Files Modified

### Core Navigation
- `bigpanda-app/components/WorkspaceTabs.tsx`
  - TAB_GROUPS array restructured
  - Intel group removed
  - Delivery children: plan (first), wbs, tasks, gantt, actions, risks, milestones, decisions
  - Admin children: artifacts, queue, history (added)

### Layout Dissolution
- `bigpanda-app/app/customer/[id]/plan/layout.tsx`
  - Changed from complex layout (PlanTabs + SprintSummaryPanel wrapper) to simple pass-through
  - Enables /plan/board and other legacy routes to continue working as redirect pages

### Route Restructuring
- `bigpanda-app/app/customer/[id]/plan/page.tsx`
  - Absorbed board content from plan/board/page.tsx
  - Now directly renders: SprintSummaryPanel + AiPlanPanel + PhaseBoard
  - No redirect chain — single page

### New Routes (Promoted)
- `bigpanda-app/app/customer/[id]/wbs/page.tsx` — Placeholder with "coming soon" message
- `bigpanda-app/app/customer/[id]/tasks/page.tsx` — TaskBoard content (copied from plan/tasks)
- `bigpanda-app/app/customer/[id]/gantt/page.tsx` — GanttChart content (copied from plan/gantt)

### Redirect Pages (Backward Compatibility)
- `bigpanda-app/app/customer/[id]/plan/board/page.tsx` → redirects to `/plan`
- `bigpanda-app/app/customer/[id]/plan/tasks/page.tsx` → redirects to `/tasks`
- `bigpanda-app/app/customer/[id]/plan/gantt/page.tsx` → redirects to `/gantt`
- `bigpanda-app/app/customer/[id]/plan/swimlane/page.tsx` → redirects to `/plan`

### Test Infrastructure
- `bigpanda-app/app/api/__tests__/risks-bulk-update.test.ts` — Wave 0 stub for RISK-02
- `bigpanda-app/app/api/__tests__/milestones-bulk-update.test.ts` — Wave 0 stub for MILE-02

## Technical Decisions

1. **Intel Tab Removal**
   - Decision: Completely remove Intel as a top-level tab
   - Rationale: Two items don't justify a top-level tab; better organized under Delivery (Decisions) and Admin (History)
   - Impact: Cleaner top-level nav, better semantic grouping

2. **Decisions Placement**
   - Decision: Move Decisions to Delivery sub-tabs (not Admin)
   - Rationale: Decisions are execution artifacts, belong with delivery tracking items
   - Alternative considered: Admin (rejected — Admin is for org/meta concerns)

3. **Layout Dissolution Strategy**
   - Decision: Keep plan/layout.tsx as pass-through (not delete)
   - Rationale: Next.js App Router requires layout.tsx for child routes; redirect pages under /plan/* need it to exist
   - Alternative considered: Delete layout and move redirects (rejected — breaks Next.js routing conventions)

4. **Backward Compatibility**
   - Decision: Create redirect pages for all old /plan/* sub-routes
   - Rationale: Users may have bookmarked old URLs; gradual migration better than 404s
   - Impact: +4 redirect files, but zero user friction

5. **WBS Placeholder**
   - Decision: Create WBS page with "coming soon" content now (Phase 45 will replace)
   - Rationale: Avoids blank nav tab, shows feature intent, better UX than empty state
   - Alternative considered: Wait until Phase 45 (rejected — poor nav UX in meantime)

6. **Wave 0 Test Strategy**
   - Decision: Write test stubs now (RED state), let Plans 02/03 implement routes (GREEN state)
   - Rationale: Unblocks parallel work, validates future API contracts, follows TDD principles
   - Impact: 2 failing tests are expected and documented; not a blocker

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| NAV-01 | ✓ Complete | WorkspaceTabs.tsx TAB_GROUPS, user verification |
| NAV-02 | ✓ Complete | plan/page.tsx direct rendering, user verification |
| NAV-03 | ✓ Complete | wbs/page.tsx placeholder, user verification |
| NAV-04 | ✓ Complete | TAB_GROUPS intel removed, decisions in Delivery, user verification |
| NAV-05 | ✓ Complete | 4 redirect pages created, user verification |

## Impact on Future Work

**Unblocks:**
- Phase 44 Plan 02 (Risks Bulk Actions) — Wave 0 test stub exists
- Phase 44 Plan 03 (Milestones Bulk Actions) — Wave 0 test stub exists
- Phase 45 (WBS Schema) — placeholder page ready to replace with real feature
- Phase 47 (WBS UI) — route structure and placeholder already in place

**Dependencies Satisfied:**
- All v6.0 navigation requirements (NAV-01 through NAV-05) complete
- Navigation structure now matches v6.0 target state
- No further nav changes needed in remaining v6.0 phases

## Self-Check: PASSED

### Files Created
- ✓ FOUND: bigpanda-app/app/customer/[id]/wbs/page.tsx
- ✓ FOUND: bigpanda-app/app/customer/[id]/tasks/page.tsx
- ✓ FOUND: bigpanda-app/app/customer/[id]/gantt/page.tsx
- ✓ FOUND: bigpanda-app/app/api/__tests__/risks-bulk-update.test.ts
- ✓ FOUND: bigpanda-app/app/api/__tests__/milestones-bulk-update.test.ts

### Commits Exist
- ✓ FOUND: a800831 (Task 1 - Wave 0 test stubs)
- ✓ FOUND: 6e55e6c (Task 2 - Navigation restructure)
- ✓ FOUND: bb24f42 (Task 3 - Dissolve plan layout)

All claimed files and commits verified. Summary is accurate.

## Notes

**Wave 0 Test Philosophy:**
This plan introduces the "Wave 0" test stub pattern — writing tests for APIs that don't exist yet. This approach:
- Unblocks parallel work (Plans 02/03 can start immediately)
- Documents API contracts before implementation
- Validates test infrastructure works
- Follows TDD principles (RED → GREEN → REFACTOR)

The two new test files are intentionally RED. They will turn GREEN when Plans 02 and 03 implement the bulk-update routes. This is expected behavior, not a failure.

**Navigation UX Impact:**
Users will immediately see:
- Simpler top-level nav (one less tab to scan)
- Faster access to Plan (first sub-tab, no nested clicks)
- Better semantic grouping (execution items under Delivery, org items under Admin)
- No 404s when following old bookmarks (redirects handle migration)

**Technical Debt Reduction:**
This plan eliminates the nested Plan sub-tab structure, which was:
- Confusing for users (two-level drill-down for common features)
- Harder to maintain (layout wrapper + sub-nav component)
- Inconsistent with other top-level tabs (no other tab had nested sub-tabs)

The flattened structure is simpler, more maintainable, and more consistent with the rest of the workspace nav.
