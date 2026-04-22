# Phase 75: Schema + Quick Wins + Admin - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

All five DB migrations are live and every broken or missing baseline interaction is working — users can drag task cards across Kanban columns, switch to week view, perform bulk task actions, set milestone statuses, and configure basic project settings including active track toggles.

Creating, editing, or deleting individual entities is out of scope (handled in prior phases). Pickers, dependency links, and risk fields are Phase 76.

</domain>

<decisions>
## Implementation Decisions

### DB Migrations (0038–0042)
- Migration numbering starts at 0038 — current highest is 0037_entity_lifecycle.sql (verify against live db/migrations/ before writing)
- Five migrations required: gantt_baselines table, chat_messages table with project_id index, owner FK columns on tasks/actions/risks/milestones, risk fields (likelihood, impact, target_date) on risks, active_tracks JSONB on projects
- Migration sequence must respect FK dependencies (owner FK columns before Phase 76 pickers)

### Task Board — DnD Cross-Column
- @dnd-kit is already wired in TaskBoard.tsx but empty columns are not droppable targets
- Fix: add useDroppable per column so tasks can be dropped into empty columns
- Existing handleDragEnd logic (finds target column from over.id) should work once columns are droppable

### Task Board — Bulk Delete
- Add a Delete button to BulkToolbar alongside the existing owner/due/phase/status bulk ops
- No confirmation required — Claude's discretion on feedback (e.g. toast or count update)

### Task Board — Week View
- Layout: vertical stacked sections (not horizontal Kanban columns)
- Week header label: date range format — "Apr 21 – Apr 27"
- Rolling 4-week window: current week + 3 weeks ahead
- Unscheduled group at the bottom for tasks with no due date
- Task cards in Week view show a status badge (colored pill: todo/in_progress/blocked/done) since there are no status columns
- View toggle (Board / Week) already lives in TaskBoard; add "Week" option alongside "Board"

### Milestone Status
- milestones table already has milestoneStatusEnum status column — just needs edit surface wiring
- Status options: On Track / At Risk / Complete / Missed (from existing enum)
- Portfolio "Overdue Milestones" counter query: target_date < today AND status != 'complete'

### Admin Settings Form
- Location: Settings page at app/customer/[id]/settings/page.tsx — currently only renders DangerZoneSection
- Layout: new fields above Danger Zone (no separate section headings needed)
- Fields: project name (rename), go-live date, description/notes, ADR Track toggle, Biggy Track toggle
- Note: projects table already has description and go_live_target columns — settings form mostly needs UI + active_tracks JSONB migration
- Save pattern: single Save button for all fields together (not auto-save per field)
- Non-admin users see the settings page as read-only — all fields disabled, Save button absent
- New PATCH fields to expose via /api/projects/[projectId]: name, description, go_live_target, active_tracks

### Active Tracks Toggle
- Track toggle state saves with the single Save button (not immediately on toggle)
- Stored as active_tracks JSONB on projects table (migration 0042 or similar)
- After saving with a track disabled: WBS expandedIds resets to default to prevent stale hidden rows
- Inline helper text under each toggle: "Disabling this track hides it from WBS, Gantt, and Overview for all project members."
- Track filtering is render-layer only — skill context, extraction pipelines, and Gantt baselines always receive the full WBS dataset

### Claude's Discretion
- Exact migration file names and SQL ordering within the 0038–0042 range
- Toast/feedback design for bulk delete completion
- Week view card layout details (spacing, card width, metadata shown)
- active_tracks JSONB schema (e.g. `{ "adr": true, "biggy": false }`)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TaskBoard.tsx` (components/): Full @dnd-kit setup, BulkToolbar, SortableContext per column — extend, don't rewrite
- `milestoneStatusEnum` in db/schema.ts: Already defined with correct values — no enum migration needed, just edit surface wiring
- `projects.description`, `projects.go_live_target` in schema.ts: Columns already exist — settings form reads/writes these directly
- `DangerZoneSection` (components/workspace/): Stays at bottom of settings page as-is
- `/api/projects/[projectId]` PATCH route: Handles status transitions today — extend to accept name/description/go_live_target/active_tracks

### Established Patterns
- Server Component → Client Island: Settings page is a Server Component; wrap new fields in a `ProjectSettingsForm` client component that fires PATCH + router.refresh()
- requireProjectRole() at all route handlers — PATCH for settings fields needs admin gate (already in place for status transitions)
- Drizzle .update().set().where().returning() — standard update pattern throughout codebase

### Integration Points
- WBS tree expandedIds reset: useEffect in WbsTree (or wherever expandedIds Set is managed) watches active_tracks config and resets on change
- Portfolio counter: update getPortfolioData() query to filter overdue milestones with `status != 'complete'`
- TaskBoard view toggle: Add "Week" tab to existing board view switcher

</code_context>

<specifics>
## Specific Ideas

- No specific references mentioned — standard implementation approach acceptable for all areas

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 75-schema-quick-wins-admin*
*Context gathered: 2026-04-22*
