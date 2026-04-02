---
phase: 32-time-tracking-global-view
plan: "03"
subsystem: navigation
tags:
  - time-tracking
  - navigation
  - sidebar
  - workspace-tabs
  - redirect
dependency_graph:
  requires:
    - "32-01: Wave 0 test scaffolds"
  provides:
    - "TIME-03: Navigation migration to global view"
  affects:
    - components/Sidebar.tsx
    - components/WorkspaceTabs.tsx
    - app/customer/[id]/time/page.tsx
tech_stack:
  added: []
  patterns:
    - "Next.js redirect() for route migration"
    - "Lucide React icons (Clock)"
key_files:
  created: []
  modified:
    - bigpanda-app/components/Sidebar.tsx
    - bigpanda-app/components/WorkspaceTabs.tsx
    - bigpanda-app/app/customer/[id]/time/page.tsx
decisions:
  - "Time Tracking link placed after Scheduler in Sidebar bottom section for logical grouping"
  - "Old /customer/[id]/time route preserved with redirect to maintain backward compatibility"
  - "Query parameter ?project=:id used to preserve project context after redirect"
metrics:
  duration_seconds: 76
  completed_at: "2026-04-02T06:08:32Z"
  tasks_completed: 2
  commits: 2
  tests_added: 0
  tests_passing: 1
---

# Phase 32 Plan 03: Navigation Migration to Global Time Tracking Summary

**One-liner:** Added Time Tracking sidebar link with Clock icon, removed Time tab from WorkspaceTabs admin group, and replaced old time page with redirect to preserve backward compatibility.

## Overview

Completed atomic navigation changes that satisfy TIME-03 requirement. Three files changed together to avoid the "tab visible but redirects away" anti-pattern:
1. Added Time Tracking link to Sidebar bottom navigation section
2. Removed time subtab from WorkspaceTabs admin group
3. Replaced /customer/[id]/time page with Next.js redirect to /time-tracking?project=:id

## Tasks Completed

### Task 1: Add Time Tracking link to Sidebar and remove Time tab from WorkspaceTabs
- **Commit:** df875ce
- **Files modified:**
  - bigpanda-app/components/Sidebar.tsx
  - bigpanda-app/components/WorkspaceTabs.tsx
- **Changes:**
  - Added Clock icon import from lucide-react
  - Inserted Time Tracking link after Scheduler in Sidebar bottom section
  - Removed `{ id: 'time', label: 'Time', segment: 'time' }` from admin group children in TAB_GROUPS
- **Verification:** workspace-tabs.test.ts GREEN (TAB_GROUPS admin group has no 'time' child)

### Task 2: Replace /customer/[id]/time/page.tsx with Next.js redirect
- **Commit:** 5ef14fb
- **Files modified:**
  - bigpanda-app/app/customer/[id]/time/page.tsx
- **Changes:**
  - Removed TimeTab component import and render
  - Replaced entire file with redirect() call to `/time-tracking?project=${id}`
  - Maintains TypeScript type safety with params Promise
- **Verification:** TypeScript compilation passes with no errors

## Deviations from Plan

None - plan executed exactly as written.

## Technical Implementation

### Sidebar Navigation Enhancement
```typescript
// Added Clock to imports
import { BookOpen, CalendarClock, Clock, Library, Settings } from 'lucide-react';

// Added Time Tracking link after Scheduler
<Link
  href="/time-tracking"
  className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded px-2 py-1.5 text-sm transition-colors"
  data-testid="sidebar-time-tracking-link"
>
  <Clock className="w-4 h-4" />
  Time Tracking
</Link>
```

### WorkspaceTabs Tab Removal
```typescript
// BEFORE: admin group had 3 children
children: [
  { id: 'time', label: 'Time', segment: 'time' },
  { id: 'artifacts', label: 'Artifacts', segment: 'artifacts' },
  { id: 'queue', label: 'Review Queue', segment: 'queue' },
]

// AFTER: admin group has 2 children
children: [
  { id: 'artifacts', label: 'Artifacts', segment: 'artifacts' },
  { id: 'queue', label: 'Review Queue', segment: 'queue' },
]
```

### Route Redirect Pattern
```typescript
// Complete file replacement
import { redirect } from 'next/navigation'

export default async function TimePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/time-tracking?project=${id}`)
}
```

## Verification Results

**workspace-tabs.test.ts:** ✓ PASS
- TAB_GROUPS admin group does not contain a time subtab

**TypeScript compilation:** ✓ PASS
- No errors in modified files

**Full test suite:**
- workspace-tabs.test.ts: 1 passed
- Pre-existing failing tests (global-view.test.ts, extraction-status.test.ts, launch.test.ts) are Wave 0 RED tests from other plans - not regressions

## Success Criteria Met

- [x] Sidebar.tsx includes Clock icon and /time-tracking link after Scheduler
- [x] TAB_GROUPS admin group has no 'time' subtab (workspace-tabs.test.ts GREEN)
- [x] /customer/[id]/time/page.tsx contains only redirect() call
- [x] No TypeScript errors
- [x] No previously passing tests broken

## Requirements Satisfied

**TIME-03:** Navigation migration complete
- Sidebar shows Time Tracking link in bottom navigation section
- WorkspaceTabs no longer displays Time tab in admin group
- Old route redirects to new global view with project context preserved

## Next Steps

Phase 32 Plan 04 will implement the global time tracking page at /time-tracking with cross-project filtering, bulk actions, and project filter preservation from query parameters.

## Self-Check: PASSED

Verifying created files:
- bigpanda-app/components/Sidebar.tsx: ✓ FOUND (modified)
- bigpanda-app/components/WorkspaceTabs.tsx: ✓ FOUND (modified)
- bigpanda-app/app/customer/[id]/time/page.tsx: ✓ FOUND (modified)

Verifying commits:
- df875ce: ✓ FOUND (Task 1: Add Time Tracking sidebar link and remove Time tab)
- 5ef14fb: ✓ FOUND (Task 2: Replace time page with redirect)

All files modified as expected. All commits present in git history.
