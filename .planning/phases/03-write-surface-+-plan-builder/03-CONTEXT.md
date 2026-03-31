# Phase 3: Write Surface + Plan Builder — Context

**Gathered:** 2026-03-19
**Status:** Ready for planning
**Source:** User decisions

<domain>
## Phase Boundary

Add all write operations to the existing read-only Phase 2 app: inline editing for workspace tabs (Actions with atomic xlsx dual-write, Risks mitigation log, Milestones, Stakeholders, Architecture), and build the full Project Plan & Task Builder (Phase Board Kanban, Task Board, Gantt Timeline, swimlane view, task dependencies, bulk operations, templates, xlsx import/export, progress rollup). Phase 3 covers PLAN-01 through PLAN-11 only — PLAN-12 (AI-assisted plan generation) and PLAN-13 (weekly sprint summary) are Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Action Editing UI
**Modal dialog** (Option C) — clicking an action opens a shadcn Dialog with the full action form (description, owner, due, status, notes, type). No inline row editing, no slide-out drawer. Simple and consistent with the existing AddNotesModal pattern.

### xlsx Dual-Write for Actions
- PA3_Action_Tracker.xlsx path: `{workspace_path}/PA3_Action_Tracker.xlsx` where `workspace_path` comes from settings (default: `~/Documents/PM Application`). This is where the file already lives in the user's existing workflow.
- **Failed xlsx write blocks the save** — DB transaction rolls back if xlsx write fails. Show an error toast with the failure reason. Never silently persist to DB while xlsx is stale.
- Rationale: data integrity is critical; a diverged xlsx/DB state is worse than a failed save.

### Gantt Timeline
**frappe-gantt** — MIT licensed, works client-side, good enough for project task timelines. No complex license issues.

### Drag-and-Drop (Kanban Phase Board + Task Board)
**@dnd-kit/core** — modern, accessible, works with React 19. Actively maintained.

### Plan Builder Scope
Phase 3 covers PLAN-01 through PLAN-11. PLAN-12 (AI plan generation) and PLAN-13 (weekly sprint summary) are explicitly Phase 7 (deferred to Skill Engine phase). Confirmed by requirement traceability table.

### Optimistic UI
All write operations use optimistic UI with a "Saving..." indicator — standard for the app per memory. Server-side validation errors revert the optimistic state and show an error toast.

### Append-Only Enforcement
- Risks: severity/status editable inline, but mitigation entries are append-only (add new entry, no edit/delete of existing entries) — enforced by DB trigger already in place
- engagement_history and key_decisions: no edit/delete UI — Phase 2 already enforces this; Phase 3 respects it
- Architecture tab (workstreams.state): editable inline in Phase 3

### New Routes (Plan Builder)
```
/customer/[id]/plan               → Phase Board (Kanban)
/customer/[id]/plan/tasks         → Task Board
/customer/[id]/plan/gantt         → Gantt Timeline
/customer/[id]/plan/swimlane      → Team swimlane view
```
These are nested under a new "Plan" tab added to the 9-tab workspace nav (making it 10 tabs in Phase 3).

### Claude's Discretion
- Exact shadcn components for edit modals and forms
- Whether bulk operations use a toolbar or right-click context menu (toolbar preferred)
- Task template instantiation UI (button in Phase Board header)
- Error toast library (shadcn Sonner or equivalent)
- xlsx parse/write library for plan import/export (xlsx/SheetJS already used in migration scripts)

</decisions>

<specifics>
## Specific Requirements

- WORK-02: Actions tab — inline editing (complete, add notes, change owner), every save syncs to PA3_Action_Tracker.xlsx atomically (dual-write). This is the most critical requirement — must use a DB transaction wrapping both the Drizzle update and the xlsx file write.
- PLAN-08: Task templates — one-click instantiation for Biggy Activation, ADR Onboarding, Team Kickoff workstreams. Templates are stored in plan_templates table (already in schema).
- PLAN-10: Excel plan import — KAISER_Biggy_Project_Plan format column mapping. The researcher must inspect the actual xlsx file to determine column names.
- PLAN-11: Plan export to .xlsx in same format as Kaiser plan.
- PLAN-09: Progress rollup — task completion → workstream percent_complete → project health score. This wires into the existing health score formula from Phase 2 (lib/queries.ts).
- PLAN-06: Task dependencies — blocked_by relationship, visualized in Gantt.

</specifics>

<deferred>
## Deferred Ideas

- PLAN-12: AI-assisted plan generation → Phase 7
- PLAN-13: Weekly sprint summary → Phase 7
- Quick Action Bar buttons (Run Tracker, Generate Briefing, Weekly Status Draft) → Phase 5
- Key Decisions add-new UI → Phase 3 (writing to append-only key_decisions IS in scope per REQUIREMENTS.md WORK-07)

</deferred>

---

*Phase: 03-write-surface-+-plan-builder*
*Context gathered: 2026-03-19 via user decisions*
