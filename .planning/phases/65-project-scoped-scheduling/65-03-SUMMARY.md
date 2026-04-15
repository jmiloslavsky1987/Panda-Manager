---
phase: 65-project-scoped-scheduling
plan: 03
subsystem: scheduling-ui
tags:
  - project-scheduler
  - skills-tab
  - url-state
  - readOnly-mode
dependency_graph:
  requires:
    - 65-01
    - 65-02
  provides:
    - project-scheduler-ui
    - url-state-persistence
  affects:
    - skills-tab-ux
    - global-scheduler-clarity
tech_stack:
  added:
    - ProjectSchedulerSection component in SkillsTabClient
    - URL param 'sched_expanded' for persistent expand state
  patterns:
    - Controlled/uncontrolled component pattern for expandedId state
    - readOnly mode prop pattern for conditional UI rendering
    - Server-side project job fetching with non-fatal error handling
key_files:
  created: []
  modified:
    - bigpanda-app/app/customer/[id]/skills/page.tsx
    - bigpanda-app/components/SkillsTabClient.tsx
    - bigpanda-app/components/SchedulerJobTable.tsx
    - bigpanda-app/components/SchedulerJobRow.tsx
    - bigpanda-app/app/scheduler/page.tsx
    - bigpanda-app/tests/skills/job-progress.test.tsx
    - bigpanda-app/tests/ui/loading-skeletons.test.tsx
decisions:
  - ProjectSchedulerSection as local component in SkillsTabClient (not separate file) for scope encapsulation
  - Controlled/uncontrolled expandedId pattern allows URL state management in project context while preserving standalone table behavior
  - readOnly mode hides all action controls (Create/Edit/Delete/Toggle/Trigger) for non-admin users
  - Server-side job fetch is non-fatal — skills tab loads even if scheduler API unavailable
  - URL param 'sched_expanded' prefixed with 'sched_' to avoid collision with other tab state params
  - Test file updates treated as Rule 3 deviation (blocking TypeScript errors from new required prop)
metrics:
  duration_seconds: 319
  task_count: 3
  files_created: 0
  files_modified: 7
  commits: 2
  completed_date: "2026-04-15"
---

# Phase 65 Plan 03: Project-Scoped Scheduler UI Integration Summary

**One-liner:** Project Scheduler section added to Skills tab with URL-persisted expand state, readOnly mode for non-admins, and global scheduler subtitle clarifying non-project scope.

## What Was Delivered

1. **Skills tab server-side job fetching** (`skills/page.tsx`)
   - Server Component fetches project-scoped jobs via `/api/projects/${projectId}/jobs`
   - Cookie forwarding ensures authenticated session (same pattern as internal API calls)
   - Non-fatal error handling — skills tab loads even if scheduler API unavailable
   - `initialJobs` prop passed to `SkillsTabClient`

2. **Project Scheduler section in Skills tab** (`SkillsTabClient.tsx`)
   - New `ProjectSchedulerSection` component renders below skills catalog
   - Reads `sched_expanded` URL param on mount to restore expanded row state (SCHED-03)
   - Updates URL param on toggle via `router.replace` with `scroll: false`
   - Uses controlled expandedId pattern to sync with URL state

3. **SchedulerJobTable controlled mode** (`SchedulerJobTable.tsx`)
   - New props: `projectId`, `readOnly`, `expandedId`, `onToggleExpand`
   - Controlled/uncontrolled pattern: accepts external expand state or manages internally
   - readOnly mode hides Create Job button
   - Passes `projectId` to `CreateJobWizard` (connects to plan 02 wizard integration)
   - Passes `readOnly` prop down to `SchedulerJobRow`

4. **SchedulerJobRow readOnly mode** (`SchedulerJobRow.tsx`)
   - readOnly prop hides all action buttons: Toggle (replaced with text), Trigger, Edit, Enable/Disable, Delete
   - Run history panel still visible in expanded state (SCHED-04 requirement)
   - Non-admin users see jobs and history but cannot modify

5. **Global scheduler subtitle** (`scheduler/page.tsx`)
   - Descriptive subtitle: "Global scheduled jobs — not scoped to any project. Project-specific jobs are managed from each project's Skills tab."
   - Completes SCHED-01: visually and functionally separates global vs project-scoped jobs
   - Updated fetch to use `NEXT_PUBLIC_BASE_URL` env var for portability

## Tasks Completed

| Task | Commit  | Description                                               |
| ---- | ------- | --------------------------------------------------------- |
| 1-2  | b48cadf | Project Scheduler section with URL state persistence      |
| 3    | 3b07bb8 | Global scheduler subtitle clarifying non-project scope    |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test file updates for new required prop**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Extended `SkillsTabClientProps` interface with `initialJobs: ScheduledJob[]` broke 7 test render calls
- **Fix:** Added `initialJobs={[]}` to all `SkillsTabClient` renders in test files; added `useSearchParams`/`usePathname` mocks
- **Files modified:** `tests/skills/job-progress.test.tsx`, `tests/ui/loading-skeletons.test.tsx`
- **Commit:** b48cadf (included in main Task 2 commit)

## Technical Notes

**Controlled/uncontrolled component pattern:**
```typescript
// SchedulerJobTable can work in two modes:
// 1. Controlled: parent manages expandedId via props (ProjectSchedulerSection with URL sync)
// 2. Uncontrolled: internal state (global scheduler page)
const expandedId = controlledExpandedId !== undefined ? controlledExpandedId : internalExpandedId;
```

**URL state persistence pattern (SCHED-03):**
```typescript
// Read on mount
const [expandedId, setExpandedId] = useState(() => {
  const param = searchParams.get('sched_expanded');
  return param ? parseInt(param, 10) : null;
});

// Write on toggle
const params = new URLSearchParams(searchParams.toString());
if (newExpandedId !== null) {
  params.set('sched_expanded', newExpandedId.toString());
} else {
  params.delete('sched_expanded');
}
router.replace(`${pathname}?${params.toString()}`, { scroll: false });
```

**readOnly mode implementation:**
- Table: hides Create Job button
- Row: replaces toggle switch with text "Yes"/"No", hides Trigger button
- Expanded panel: hides entire controls section (Edit/Enable/Disable/Delete)
- Run history remains visible (SCHED-04 requirement)

**Run history visibility (SCHED-04):**
Already implemented in `SchedulerJobRow` — expanded panel shows last 10 entries from `run_history_json`. No new code needed; verified existing implementation meets requirement.

## Requirements Completed

- **SCHED-02:** Project Scheduler section in Skills tab ✓
- **SCHED-03:** URL param persistence for job table expand state ✓
- **SCHED-04:** Run history visibility (last 10 entries) ✓
- **SCHED-01:** Global scheduler shows only non-project jobs (subtitle added) ✓

## Self-Check: PASSED

Files created (expected 0):
- (none — all modifications)

Files modified (expected 7):
```bash
FOUND: bigpanda-app/app/customer/[id]/skills/page.tsx
FOUND: bigpanda-app/components/SkillsTabClient.tsx
FOUND: bigpanda-app/components/SchedulerJobTable.tsx
FOUND: bigpanda-app/components/SchedulerJobRow.tsx
FOUND: bigpanda-app/app/scheduler/page.tsx
FOUND: bigpanda-app/tests/skills/job-progress.test.tsx
FOUND: bigpanda-app/tests/ui/loading-skeletons.test.tsx
```

Commits (expected 2):
```bash
FOUND: b48cadf
FOUND: 3b07bb8
```

TypeScript compilation:
- Core implementation files clean (no errors in SkillsTabClient, SchedulerJobTable, SchedulerJobRow, skills/page, scheduler/page)
- Pre-existing test errors in unrelated files (lifecycle tests, front-matter tests) — out of scope

All checks passed.
