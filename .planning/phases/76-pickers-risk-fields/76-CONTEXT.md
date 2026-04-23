# Phase 76: Pickers & Risk Fields - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace raw ID/text inputs with proper searchable pickers across owner, blocked-by, and milestone fields on tasks; add structured Likelihood/Impact/Target Date fields to risks with auto-computed score display; close the tasks-bulk multi-tenant security gap. All DB columns already exist from Phase 75 migrations — this phase is entirely UX and security hardening.

</domain>

<decisions>
## Implementation Decisions

### Blocked-By Picker
- Single blocker only — keep existing `blocked_by` integer FK column, no junction table migration
- Replace the current number input in TaskEditModal with a searchable single-select dropdown
- Picker shows only non-done tasks from the same project (filter out status = 'done')
- Blocked status is computed live on page load (server query checks blocker's current status at render)
- Picker lives in TaskEditModal only — not inline on Task Board cards

### Owner Picker
- Upgrade the existing `OwnerCell` component to save a stakeholder FK (not just display text)
- Same upgraded OwnerCell used everywhere: Tasks, Actions, Risks, Milestones tables and modals
- Free-text fallback (PICK-02): if user types a name not in the list, auto-create a new stakeholder record with blank role + company; save the new stakeholder's FK
- The existing `owner` text column is kept for display; `owner_id` FK is set when a stakeholder is selected or created

### Risk Fields & Score
- Likelihood and Impact: dropdown UI showing Low / Medium / High — backend stays free-text (no enum migration)
- Target Date: added to RiskEditModal alongside Likelihood and Impact
- All three fields editable in RiskEditModal only (not inline in table rows)
- Risk Score = Likelihood × Impact (Low=1, Medium=2, High=3), computed at render, never stored
- Score display: colored badge with label — 1–2 = green "Low", 3–4 = amber "Medium", 6 = red "High", 9 = red "Critical"
- Score badge appears as a column in the risk table

### Blocked Indicator
- Not explicitly discussed — Claude's discretion on visual treatment
- Must appear on Task Board cards and WBS rows for tasks with unresolved blockers

### Claude's Discretion
- Blocked indicator visual style (badge, icon, border color — consistent with existing status patterns)
- Exact search/filter UX of dropdowns (debounce, min chars, loading state)
- How to surface the auto-created stakeholder to the user (toast confirmation acceptable)
- tasks-bulk multi-tenant gap fix implementation details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OwnerCell.tsx`: Existing inline click-to-edit component using `<datalist>` — upgrade this, don't rewrite. Already fetches `/api/stakeholders?project_id=`. Needs new props: `ownerId: number | null` and updated `onSave` signature to pass both id + text
- `TaskEditModal.tsx`: Already has `blocked_by` (number input) and `milestone_id` (number input) fields — replace both with searchable dropdowns
- `RiskEditModal.tsx`: Target for Likelihood, Impact, Target Date fields — currently has no owner or risk-specific fields exposed
- `RiskHeatMap.tsx`: Existing heat-map component — score badge should use same color conventions (green/amber/red)
- `InlineSelectCell.tsx`: Pattern for inline select cells — reference for dropdown UX consistency

### Established Patterns
- Inline edit pattern: click to edit, blur to save, optimistic update + rollback on error (OwnerCell, DatePickerCell)
- Modal save pattern: form state, single Save button, PATCH to API route (TaskEditModal, MilestoneEditModal)
- `requireProjectRole()` at all mutation routes — tasks-bulk DELETE already has this but may be missing project scoping on task ID resolution

### Integration Points
- `/api/stakeholders`: Already exists and returns stakeholder list for a project — needs a POST endpoint to create a new stakeholder (for auto-create on free-text)
- `blocked_by` → task query: server-side join needed to determine if blocker is unresolved (task.status != 'done') — affects `getTasks()` or equivalent in lib/queries.ts
- Task Board card render: needs `is_blocked` boolean passed down from server query to show indicator
- WBS row render: same `is_blocked` flag needed in WBS data shape

</code_context>

<specifics>
## Specific Ideas

- No specific UI references mentioned — standard implementation approach acceptable
- Score label mapping confirmed: 1–2 Low, 3–4 Medium, 6 High, 9 Critical (note: scores 5, 7, 8 are mathematically impossible with integer 1/2/3 mapping)

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 76-pickers-risk-fields*
*Context gathered: 2026-04-22*
