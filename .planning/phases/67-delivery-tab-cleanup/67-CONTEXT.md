# Phase 67: Delivery Tab Cleanup - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Streamline delivery tabs: permanently hide noisy ID/Source columns in Actions, Risks, and Milestones; remove the Plan sub-tab from the Delivery group (moving Generate Plan functionality to Task Board); update Decisions entry form copy; enable stakeholder move-between-sections and delete inside the edit modal; upgrade Generate Plan to de-duplicate against existing tasks and write committed tasks to both Task Board and WBS tree.

Out of scope: new column visibility toggle UI, any changes to Gantt or Task Board beyond receiving the Generate Plan panel, changes to Skills/Scheduler, new schema fields for Decisions.

</domain>

<decisions>
## Implementation Decisions

### Column hiding (DLVRY-07, DLVRY-08, DLVRY-09)
- ID column is **permanently removed** from Risks and Milestones tables — no toggle affordance
- ID and Source columns are **permanently removed** from Actions table — no toggle affordance
- Simple JSX deletion of the `<TableHead>` and corresponding `<TableCell>` for those columns

### Plan tab removal (DLVRY-05)
- Remove `{ id: 'plan', label: 'Plan', segment: 'plan' }` from the Delivery children array in `WorkspaceTabs.tsx`
- **Phase Board and Swimlane are removed entirely** — they are Plan-tab-only views; Task Board and Gantt already exist as standalone Delivery sub-tabs
- The `AiPlanPanel` (Generate Plan button + proposed tasks UI) moves from `/customer/[id]/plan/page.tsx` into the Task Board page (`/customer/[id]/tasks/page.tsx`) — placed above the task table
- Generate Plan functionality must be fully preserved — only its location changes
- The `/customer/[id]/plan` route and `PlanTabs` component can be deleted after migration

### Decisions entry form (DLVRY-10)
- Update labels and placeholder text in `AddDecisionModal` only — no schema change
- Rename "Decision" label → "Decision / Action" and update placeholder to guide operational impact (e.g. "What was decided or agreed operationally?")
- Rename "Context" label → "Operational Impact / Rationale" with placeholder like "Why this decision? What does it affect operationally?"
- No new fields, no type/category dropdown

### Stakeholder operations (TEAM-01, TEAM-02)
- **Sections** = the two existing company-based groups: BigPanda contacts vs Customer contacts
- **Move** (TEAM-01): "Move to [other section]" button inside `StakeholderEditModal` — toggles the stakeholder's company value between the project's customer company name and "BigPanda"
- **Delete** (TEAM-02): Delete button inside `StakeholderEditModal` — calls `DELETE /api/projects/[projectId]/stakeholders/[stakeholderId]`, no confirmation dialog (consistent with Phase 66 pattern)
- Both operations require a new `DELETE` endpoint for stakeholders and a `PATCH` endpoint (or extend existing) for company reassignment

### Generate Plan — de-duplication and WBS placement (DLVRY-06)
- **De-duplication**: Before displaying proposed tasks, filter out any whose title is similar (case-insensitive substring or fuzzy match) to an existing task in the tasks table for this project. Excluded items are either hidden or shown as greyed-out "already exists" entries.
- **WBS commit**: When the user commits selected proposed tasks, each task is written to **both** the tasks table AND the WBS tree as a level-3 item under the appropriate parent
- **WBS placement**: The `ai-plan-generator` skill prompt is updated to output two additional fields per task: `track` (ADR | Biggy) and `wbs_phase` (the level-2 WBS parent item name). The commit logic uses these to find or create the matching WBS parent and inserts the task as a child item.
- The existing `AiPlanPanel` commit loop is extended to call the WBS POST endpoint (`/api/projects/[projectId]/wbs`) for each committed task after writing to tasks

### Claude's Discretion
- Exact similarity threshold for de-duplication (e.g. 60% match, or simple includes check)
- Whether to show de-duplicated items as greyed-out or silently exclude them
- Exact placeholder/label wording beyond the direction given above
- How to handle WBS parent not found (create it dynamically or skip WBS insertion for that task)

</decisions>

<specifics>
## Specific Ideas

- "Generate Plan must identify tasks not yet already part of the project (as a task or WBS item) and be able to place them into the right areas under both tabs" — user's explicit intent
- Generate Plan stays fully functional after Plan tab removal — just relocated to Task Board

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ActionsTableClient.tsx`: ID column at line 297, Source column at line 302 — delete both `<TableHead>` and their matching `<TableCell>` rows
- `components/RisksTableClient.tsx`: ID column at line 310 — delete head and cell
- `components/MilestonesTableClient.tsx`: ID column at line 306 — delete head and cell
- `components/AiPlanPanel.tsx`: Full Generate Plan panel (generate button, proposed task list, commit loop) — move into `/customer/[id]/tasks/page.tsx`
- `components/AddDecisionModal.tsx`: Label/placeholder updates only — lines ~65-85 for Decision field, ~72-80 for Context field
- `components/StakeholderEditModal.tsx`: Add Move and Delete controls inside the existing modal
- `app/customer/[id]/plan/page.tsx`: Hosts AiPlanPanel + PhaseBoard + SprintSummaryPanel — delete after migration
- `app/customer/[id]/tasks/page.tsx`: Receives AiPlanPanel at top of page

### Established Patterns
- Inline deletes: no confirmation dialog (Phase 66 pattern — `DELETE` on click, router.refresh())
- `requireProjectRole(numericId, 'user')` guard on all project-scoped DELETE/PATCH routes
- WBS POST endpoint: `/api/projects/[projectId]/wbs` — accepts `{ name, parent_id, level, track }`
- De-duplication: title-based similarity check at commit time (no DB stored similarity state)
- AI skill output schema: task fields `{ title, description, priority, type, phase, due }` — extend with `track` and `wbs_phase`

### Integration Points
- `components/WorkspaceTabs.tsx` → remove Plan entry from Delivery children array (line 27)
- `app/customer/[id]/tasks/page.tsx` → import and render `AiPlanPanel` above task list
- `app/api/projects/[projectId]/generate-plan/route.ts` → returns tasks; no change needed (skill prompt updated separately)
- `app/api/projects/[projectId]/stakeholders/[stakeholderId]/route.ts` → new file for DELETE + PATCH
- `ai-plan-generator` skill YAML/prompt → add `track` and `wbs_phase` fields to output schema

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 67-delivery-tab-cleanup*
*Context gathered: 2026-04-16*
