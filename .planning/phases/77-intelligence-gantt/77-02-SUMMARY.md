---
phase: 77-intelligence-gantt
plan: "02"
subsystem: api, ui
tags: [gantt, baselines, drizzle, next-js, toolbar, snapshot]

# Dependency graph
requires:
  - phase: 77-intelligence-gantt
    provides: ganttBaselines table in db/schema.ts (already migrated), GanttChart component with WBS span rows (GANTT-01)

provides:
  - GET /api/projects/[projectId]/gantt-baselines — list baselines for project
  - POST /api/projects/[projectId]/gantt-baselines — create named baseline snapshot
  - GET /api/projects/[projectId]/gantt-baselines/[baselineId] — fetch full snapshot (404 on wrong project)
  - GanttChart toolbar Save Baseline button with inline name input
  - GanttChart Compare dropdown for selecting and loading baseline snapshots
  - activeBaselineSnapshot state in GanttChart (ready for Plan 03 ghost bars)

affects:
  - 77-03 (ghost bar rendering will consume activeBaselineSnapshot state from this plan)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gantt baseline snapshot = flat Record<taskId, {start, end}> — deterministic, compact, sufficient for ghost bars"
    - "All baseline API routes use SET LOCAL app.current_project_id in transaction for RLS enforcement"
    - "Save Baseline flow: saveMode boolean gates inline input; Enter=save, Esc=cancel"

key-files:
  created:
    - app/api/projects/[projectId]/gantt-baselines/route.ts
    - app/api/projects/[projectId]/gantt-baselines/[baselineId]/route.ts
  modified:
    - components/GanttChart.tsx
    - app/customer/[id]/gantt/page.tsx

key-decisions:
  - "activeBaselineSnapshot stored in GanttChart state but not yet consumed — Plan 03 will read it for ghost bar rendering"
  - "Snapshot captures t.start/t.end directly (not drag-in-flight dragOverride) — baseline reflects saved DB state"
  - "Compare dropdown only rendered when baselines.length > 0 — no empty dropdown shown on first visit"
  - "baselineId route returns 404 when baseline not found OR belongs to different project (prevents cross-project access)"

patterns-established:
  - "Baseline API: GET list + POST create in /gantt-baselines/route.ts; GET single in /[baselineId]/route.ts"
  - "Toolbar inline save flow: saveMode boolean → input appears → Enter/button saves → clears back to button"

requirements-completed: [GANTT-02]

# Metrics
duration: 20min
completed: 2026-04-23
---

# Phase 77 Plan 02: Gantt Baseline Snapshot API and Toolbar UX Summary

**Named Gantt baseline snapshots via Drizzle-backed REST API with inline Save Baseline toolbar and Compare dropdown wired into GanttChart**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-23T03:26:00Z
- **Completed:** 2026-04-23T03:46:08Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created two auth-guarded API route files for listing, creating, and fetching Gantt baseline snapshots
- Extended GanttChart toolbar with Save Baseline inline input flow and Compare dropdown
- wired projectId prop through gantt/page.tsx so the client component can call baseline APIs
- activeBaselineSnapshot state is populated on baseline selection and ready for Plan 03 ghost bar rendering

## Task Commits

Each task was committed atomically:

1. **Task 1: Gantt baselines API routes (list/create + fetch single)** - `d582b521` (feat)
2. **Task 2: Save Baseline toolbar UX in GanttChart** - `2fa3b673` (feat)

**Remote push:** `2fa3b673` pushed to `origin/main`

## Files Created/Modified
- `app/api/projects/[projectId]/gantt-baselines/route.ts` - GET list + POST create baseline snapshot; auth-guarded, RLS-enforced
- `app/api/projects/[projectId]/gantt-baselines/[baselineId]/route.ts` - GET single baseline; returns 404 if not found or wrong project
- `components/GanttChart.tsx` - Added projectId prop, baseline state, fetch effect, handleSelectBaseline, handleSaveBaseline, toolbar Save Baseline + Compare UI
- `app/customer/[id]/gantt/page.tsx` - Passes projectId={projectId} to GanttChart

## Decisions Made
- Snapshot format `Record<taskId, {start, end}>` — flat map is deterministic and sufficient for Plan 03 ghost bar overlay
- Snapshot captures `t.start`/`t.end` directly (not drag-in-flight state) — baseline reflects saved DB state
- `activeBaselineSnapshot` stored in state but not yet rendered — Plan 03 consumes it for ghost bars and variance column
- Compare dropdown hidden when no baselines exist (cleaner first-time UX)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript compiled clean for production files. Pre-existing test file errors in `__tests__/` and `tests/` are unrelated to this plan.

## User Setup Required
None - no external service configuration required. The `gantt_baselines` table was already migrated in Phase 75.

## Next Phase Readiness
- Plan 03 (77-03) can immediately read `activeBaselineSnapshot` from GanttChart state to render ghost bars and variance columns
- All three baseline API endpoints are live and auth-guarded
- No blockers

---
*Phase: 77-intelligence-gantt*
*Completed: 2026-04-23*
