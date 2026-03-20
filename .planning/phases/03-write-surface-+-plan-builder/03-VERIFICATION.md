---
phase: 03-write-surface-+-plan-builder
verified: 2026-03-20T00:00:00Z
status: gaps_found
score: 4/5 success criteria verified
gaps:
  - truth: "Task completion rolls up to workstream percent_complete and the project health score updates accordingly"
    status: partial
    reason: "percent_complete IS updated on task PATCH/POST via updateWorkstreamProgress(), but computeHealth() does not read percent_complete — the health score formula only uses overdue actions, stalled milestones, and high risks. The third link (workstream percent_complete → health score) is unimplemented."
    artifacts:
      - path: "bigpanda-app/lib/queries.ts"
        issue: "computeHealth() ignores workstream.percent_complete entirely; health score cannot reflect task progress rollup"
    missing:
      - "Add workstream percent_complete signal to computeHealth() or document that PLAN-09 health score link is intentionally indirect (task → actions/milestones → health)"
human_verification:
  - test: "Open PA3_Action_Tracker.xlsx in Excel, edit an action in the UI, verify row is updated in the file"
    expected: "Row changes are reflected in the xlsx file immediately after saving"
    why_human: "xlsx file write cannot be verified programmatically without an actual xlsx file present"
  - test: "Drag a task card between phase columns on the Phase Board"
    expected: "Card moves to new column and PATCH /api/tasks/:id is called with updated phase; board reflects change without full reload"
    why_human: "Drag-and-drop interaction cannot be automated reliably in CI without seeded DB"
  - test: "Import a KAISER_Biggy_Project_Plan.xlsx file via Import .xlsx button on Phase Board"
    expected: "Tasks are created and appear on Phase Board after import"
    why_human: "Requires actual KAISER-format xlsx fixture; E2E test only verifies endpoint existence"
  - test: "Instantiate the Biggy Activation template from the template picker"
    expected: "Multiple tasks are created; no 'No templates configured' message"
    why_human: "Requires plan_templates table to be seeded; E2E test correctly defers to human when no templates exist"
---

# Phase 3: Write Surface + Plan Builder Verification Report

**Phase Goal:** All workspace tabs support inline editing with optimistic UI, every action save atomically syncs to PA3_Action_Tracker.xlsx, and the Project Plan & Task Builder (Phase Board, Task Board, Gantt, swimlane, templates, Excel import/export) is fully operational.
**Verified:** 2026-03-20
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Completing/editing/adding notes to an action reflects in both DB and PA3_Action_Tracker.xlsx | VERIFIED | `PATCH /api/actions/[id]/route.ts` calls `updateXlsxRow()` first; xlsx failure blocks DB write; ExcelJS workbook reads/writes xlsx at `settings.workspace_path/PA3_Action_Tracker.xlsx` |
| 2 | Adding risks/stakeholders/engagement history from UI persists to PostgreSQL; engagement_history and key_decisions are append-only with no edit/delete in UI | VERIFIED | `PATCH /api/risks/[id]` (severity/status + append-only mitigation), `PATCH /api/milestones/[id]`, `POST /api/stakeholders`; decisions/history pages explicitly label as append-only with no edit/delete controls |
| 3 | A task created in Task Builder appears on Phase Board and Gantt; dragging a card between phases updates phase assignment | VERIFIED | TaskEditModal → `POST /api/tasks`; PhaseBoard uses `@dnd-kit/core` with `handleDragEnd` → `PATCH /api/tasks/:id {phase}`; GanttPage fetches tasks and maps to frappe-gantt format including `blocked_by` as dependency |
| 4 | Importing a .xlsx project plan (KAISER format) populates tasks; exporting produces matching column headers | VERIFIED | `POST /api/plan-import` parses KAISER headers (Task/Action, Owner, Status, Target Date, Dependencies, Notes); `GET /api/plan-export/[projectId]` writes xlsx with matching KAISER column headers |
| 5 | Task completion rolls up to workstream percent_complete and project health score updates accordingly | PARTIAL | `updateWorkstreamProgress()` correctly updates `workstreams.percent_complete` when tasks are PATCH'd or created with a `workstream_id`. However, `computeHealth()` does NOT read `percent_complete` — health score uses overdue actions, stalled milestones, and high risks only. The final link (workstream percent → health) is absent. |

**Score:** 4/5 truths verified (1 partial)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bigpanda-app/components/ActionEditModal.tsx` | Action edit dialog with all fields, save/error/saving states | VERIFIED | 174 lines; Dialog with description, owner, due, status, notes fields; saving indicator; error display; PATCH fetch |
| `bigpanda-app/app/api/actions/[id]/route.ts` | PATCH handler with xlsx dual-write | VERIFIED | 189 lines; xlsx-first write order; ExcelJS workbook read/write; moves completed rows to Completed sheet |
| `bigpanda-app/components/PhaseBoard.tsx` | Kanban Phase Board with drag-and-drop | VERIFIED | 359 lines; DndContext with SortableContext; optimistic phase update; template picker; import/export buttons |
| `bigpanda-app/components/TaskBoard.tsx` | Task Board with bulk operations | VERIFIED | 377 lines; 4-column Kanban (todo/in_progress/blocked/done); bulk toolbar for owner/due/phase; DndContext status drag |
| `bigpanda-app/components/TaskEditModal.tsx` | Task create/edit modal | VERIFIED | 316 lines; full field set including blocked_by, milestone_id, start_date, priority, type |
| `bigpanda-app/components/GanttChart.tsx` | frappe-gantt wrapper | VERIFIED | 58 lines; dynamic import inside useEffect (SSR-safe); task-to-GanttTask mapping with dependencies from blocked_by |
| `bigpanda-app/components/SwimlaneView.tsx` | Swimlane by workstream | VERIFIED | 208 lines; lanes per workstream; percent_complete progress bars; status dropdown for drag-equivalent status change |
| `bigpanda-app/app/customer/[id]/plan/layout.tsx` | Plan layout with PlanTabs nav | VERIFIED | 20 lines; renders PlanTabs + children; data-testid="plan-layout" |
| `bigpanda-app/components/WorkspaceTabs.tsx` | 10-tab navigation | VERIFIED | 10 tabs defined: Overview, Actions, Risks, Milestones, Teams, Architecture, Decisions, Engagement History, Stakeholders, Plan (subRoute) |
| `bigpanda-app/app/api/plan-import/route.ts` | xlsx import endpoint | VERIFIED | 151 lines; KAISER header mapping; worksheet detection (Tasks > ByTeam > first); status normalization; DB insert |
| `bigpanda-app/app/api/plan-export/[projectId]/route.ts` | xlsx export endpoint | VERIFIED | 79 lines; KAISER column format; bold header row; `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` content-type |
| `bigpanda-app/app/api/tasks/route.ts` | Task GET + POST | VERIFIED | 108 lines; Zod validation with .nullish() for nullable fields; calls updateWorkstreamProgress after insert |
| `bigpanda-app/app/api/tasks/[id]/route.ts` | Task PATCH + DELETE | VERIFIED | 110 lines; PATCH with workstream rollup trigger; DELETE handler present |
| `bigpanda-app/app/api/tasks-bulk/route.ts` | Bulk task update | VERIFIED | 58 lines; accepts task_ids array + patch; supports owner/due/phase/status |
| `bigpanda-app/app/api/risks/[id]/route.ts` | Risk PATCH | VERIFIED | 79 lines; append-only mitigation_append pattern; severity/status editable |
| `bigpanda-app/app/api/milestones/[id]/route.ts` | Milestone PATCH | VERIFIED | 50 lines; status/target/owner/notes editable |
| `bigpanda-app/app/api/stakeholders/route.ts` | Stakeholder POST | VERIFIED | 47 lines; creates new stakeholder for project |
| `bigpanda-app/components/RiskEditModal.tsx` | Risk edit modal | VERIFIED | File exists |
| `bigpanda-app/components/MilestoneEditModal.tsx` | Milestone edit modal | VERIFIED | File exists |
| `bigpanda-app/components/StakeholderEditModal.tsx` | Stakeholder edit modal | VERIFIED | File exists |
| `bigpanda-app/components/PlanTabs.tsx` | Plan sub-navigation | VERIFIED | 40 lines; 4 tabs: Phase Board, Task Board, Gantt, Swimlane |
| `bigpanda-app/lib/queries.ts` → `updateWorkstreamProgress` | PLAN-09 rollup function | PARTIAL | Function exists and correctly updates workstream.percent_complete; health score does not consume it |
| `tests/e2e/phase3.spec.ts` | 18 E2E tests for Phase 3 | VERIFIED | 239 lines; all 18 tests with real assertions covering WORK-02, PLAN-01 through PLAN-11; count-conditional pattern for empty-DB resilience |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ActionEditModal | PATCH /api/actions/[id] | fetch with PATCH + JSON body | WIRED | `fetch(\`/api/actions/${action.id}\`, { method: 'PATCH' })` in handleSubmit |
| PATCH /api/actions/[id] | PA3_Action_Tracker.xlsx | updateXlsxRow() ExcelJS | WIRED | xlsx write called first; DB write only proceeds if xlsx succeeds |
| PATCH /api/actions/[id] | actions DB table | drizzle db.update(actions) | WIRED | Sequential after xlsx write; `last_updated` field also set |
| TaskEditModal | POST /api/tasks | fetch POST | WIRED | `fetch('/api/tasks', { method: 'POST', body })` in handleSubmit |
| TaskEditModal | PATCH /api/tasks/[id] | fetch PATCH | WIRED | `fetch(\`/api/tasks/${task.id}\`, { method: 'PATCH' })` in edit mode |
| PhaseBoard drag | PATCH /api/tasks/[id] | fetch PATCH {phase} | WIRED | handleDragEnd calls `fetch(\`/api/tasks/${taskId}\`, { method: 'PATCH', body: { phase } })` |
| TaskBoard drag | PATCH /api/tasks/[id] | fetch PATCH {status} | WIRED | handleDragEnd calls `fetch(\`/api/tasks/${taskId}\`, { method: 'PATCH', body: { status } })` |
| BulkToolbar | POST /api/tasks-bulk | fetch POST {task_ids, patch} | WIRED | `fetch('/api/tasks-bulk', { method: 'POST', body })` in bulkUpdate() |
| PATCH /api/tasks/[id] | updateWorkstreamProgress | lib/queries | WIRED | Called after db.update when workstream_id or status changes |
| updateWorkstreamProgress | workstreams.percent_complete | drizzle db.update(workstreams) | WIRED | `db.update(workstreams).set({ percent_complete: pct })` |
| workstreams.percent_complete | computeHealth / health score | lib/queries computeHealth | NOT WIRED | computeHealth() reads actions/milestones/risks only; percent_complete is not a health signal |
| GanttPage | getTasksForProject | lib/queries | WIRED | `tasks = await getTasksForProject(projectId)`; maps to GanttTask with dependencies from blocked_by |
| SwimlaneView | PATCH /api/tasks/[id] | fetch PATCH {status} | WIRED | handleStatusChange calls `fetch(\`/api/tasks/${taskId}\`, { method: 'PATCH', body: { status } })` |
| PhaseBoard | POST /api/plan-import | FormData fetch | WIRED | `fetch('/api/plan-import', { method: 'POST', body: formData })` in handleImport |
| PhaseBoard | GET /api/plan-export/[id] | window.location.href | WIRED | `window.location.href = \`/api/plan-export/${projectId}\`` |
| WorkspaceTabs | /customer/[id]/plan | Link href | WIRED | 10th tab points to `plan` segment with subRoute:true active-match |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| WORK-02 | Actions inline editing with xlsx dual-write | SATISFIED | ActionEditModal + PATCH /api/actions/[id] with xlsx-first write order |
| PLAN-01 | Task creation with full field set | SATISFIED | TaskEditModal covers title, description, owner, due, priority, type, phase, blocked_by, milestone_id, start_date |
| PLAN-02 | Phase Board Kanban with drag between phases | SATISFIED | PhaseBoard uses @dnd-kit/core; handleDragEnd PATCHes phase |
| PLAN-03 | Task Board with To Do/In Progress/Blocked/Done | SATISFIED | TaskBoard 4-column Kanban; drag changes status |
| PLAN-04 | Gantt Timeline color-coded by status | SATISFIED | frappe-gantt wrapper; progress mapped from status; custom_class for priority; dependency from blocked_by |
| PLAN-05 | Team swimlane view | SATISFIED | SwimlaneView groups tasks by workstream; progress bar per lane; status dropdown for updates |
| PLAN-06 | Task dependencies (blocked_by) visualized | SATISFIED | blocked_by field in TaskEditModal; displayed in TaskBoard as "blocked by #N"; mapped to frappe-gantt dependencies string |
| PLAN-07 | Bulk operations (owner/due/phase) | SATISFIED | BulkToolbar visible when 2+ tasks selected; POST /api/tasks-bulk |
| PLAN-08 | Task templates one-click instantiation | SATISFIED | TemplatePicker component in PhaseBoard; applyTemplate() POSTs each task from template.data JSON; defers gracefully when no templates seeded |
| PLAN-09 | Progress rollup task → workstream → health | PARTIAL | task status change → updateWorkstreamProgress → workstream.percent_complete WIRED; workstream.percent_complete → health score NOT WIRED |
| PLAN-10 | Excel plan import (KAISER format) | SATISFIED | POST /api/plan-import parses KAISER headers; worksheet detection; status normalization |
| PLAN-11 | Plan export to xlsx (KAISER format) | SATISFIED | GET /api/plan-export/[projectId] writes xlsx with KAISER headers; correct Content-Type header |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `bigpanda-app/app/api/actions/[id]/route.ts` lines 173-187 | xlsx-first sequential write (not atomic DB transaction) — if DB write fails after xlsx succeeds, state diverges | Warning | In the happy path this is fine; on DB failure post-xlsx-success the xlsx is already updated but DB is not. CONTEXT specified "DB transaction rolls back if xlsx write fails" — this is not achievable since xlsx is not DB-transactional. The chosen design (xlsx first, DB blocked on xlsx failure) is the correct pragmatic approach but does not provide the stated DB-level rollback guarantee in the reverse direction. |
| `bigpanda-app/components/GanttChart.tsx` | Only single `blocked_by` FK supported as Gantt dependency — PLAN-06 says "dependency chains"; frappe-gantt accepts comma-separated IDs but only one ancestor is stored | Info | For current schema (single blocked_by integer FK) this is correct; multi-dependency chains would require schema change |

---

## Gaps Summary

**1 gap blocking full goal achievement:**

**PLAN-09 Health Score Link Missing:** The rollup chain `task completion → workstream percent_complete` is fully implemented and wired. However, the final link `workstream percent_complete → project health score` is absent. `computeHealth()` (in `lib/queries.ts`) computes the RAG health signal from overdue actions, stalled milestones, and high risks only — it does not read `workstreams.percent_complete`. PLAN-09 states "progress rollup — task completion → workstream percent_complete → project health score automatically."

The practical impact: completing tasks and watching `percent_complete` rise in the swimlane view is functional. But this progress does not flow into the Dashboard health card. The ROADMAP.md success criterion #5 says "the project health score updates accordingly" — that update path does not exist.

**Resolution options:**
1. Add a check in `computeHealth()` for workstreams below a threshold percent_complete (e.g., any workstream < 20% with tasks → contribute to health score)
2. Accept that health uses the action/risk/milestone signals only and document PLAN-09's health-score link as scoped to the swimlane display (not Dashboard health card)

---

## Human Verification Required

### 1. xlsx Dual-Write End-to-End

**Test:** Open PA3_Action_Tracker.xlsx in Excel. Navigate to /customer/1/actions. Click an action row to open the edit modal. Change the status or owner and save.
**Expected:** After save, the xlsx file reflects the updated row — either in-place (for non-completed) or moved to the Completed sheet (for completed).
**Why human:** File system write verification cannot be automated without an actual xlsx fixture on disk. E2E tests gracefully skip this path when the file is absent.

### 2. Phase Board Drag-and-Drop Phase Change

**Test:** Open /customer/1/plan/board with tasks loaded (DB seeded). Drag a task card from the Discovery column to the Build column.
**Expected:** Card moves to Build column; optimistic update is immediate; PATCH to /api/tasks/:id with {phase: "Build"} succeeds; router.refresh() re-renders RSC data.
**Why human:** @dnd-kit drag simulation in Playwright on an empty DB is not meaningful. SUMMARY confirms human verification was completed and boards were approved.

### 3. Template Instantiation with Seeded Templates

**Test:** Ensure plan_templates table has Biggy Activation, ADR Onboarding, and Team Kickoff rows. Open /customer/1/plan/board. Click Templates button. Select Biggy Activation.
**Expected:** Multiple tasks are created and appear on the Phase Board after reload.
**Why human:** Requires plan_templates table to be seeded with actual template data. E2E test defers to human when no templates are seeded.

### 4. KAISER xlsx Import Round-Trip

**Test:** Obtain or create a KAISER_Biggy_Project_Plan.xlsx file with columns Task/Action, Owner, Status, Target Date, Dependencies, Notes. Import it via the Phase Board Import .xlsx button.
**Expected:** Tasks are created and visible on the Phase Board; count matches non-empty rows in the uploaded file.
**Why human:** Requires an actual xlsx fixture. E2E test only asserts endpoint responds (400 acceptable if no file provided).

---

_Verified: 2026-03-20_
_Verifier: Claude (gsd-verifier)_
