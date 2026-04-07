# Phase 37: Actions & Inline Editing Foundation - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert the Actions tab from a card layout to a table with inline cell editing. Add inline editing to the existing Risks and Milestones tables. Ship shared date picker and owner autocomplete components reused across all entity types. Scope covers: Actions table (ACTN-01–05), inline editing for Risks and Milestones (IEDIT-01–04), shared form components (FORM-01–03), and Actions text search (SRCH-03). Modal-based editing is retained for description and notes fields only — the modal is not removed.

</domain>

<decisions>
## Implementation Decisions

### Inline edit mechanics
- Click an editable cell (status, owner, due date) → the cell becomes an input in-place — no row-level edit mode
- Status cells: click → `<select>` dropdown appears in-place → onChange → PATCH immediately (no confirm step)
- Owner cells: click → text input with datalist autocomplete → save on blur
- Date cells: click → calendar popover (react-day-picker + Radix Popover) → save on date select
- All saves are optimistic — UI updates immediately, reverts silently on error
- Save errors surface as toast notifications (not inline cell errors)
- Modal retained for description and notes fields — accessible by clicking the non-inline cells (description column or a dedicated edit icon)

### Date picker
- Library: react-day-picker + Radix Popover (install required) — matches shadcn/ui style, consistent with the rest of the UI
- "Clear / TBD" button inside the popover to set the field back to TBD/null (preserves backwards compat for Actions)
- Built as a shared `<DatePickerCell />` component — reused across Actions, Risks, Milestones, and Tasks

### Owner autocomplete
- HTML `<datalist>` pointing to the project's stakeholder names — zero install, browser handles the dropdown
- Freeform entry allowed — unrecognized names saved as-is with no warning (FORM-03 backwards compat)
- Built as a shared `<OwnerCell />` component — reused across Actions, Risks, Milestones, and Tasks
- Stakeholder names fetched from existing `/api/stakeholders?project_id=X` endpoint

### Actions table layout
- Columns (in order): ID | Description | Owner | Due Date | Status | Source — matches ACTN-01 exactly
- Uses existing shadcn `<Table>` component — same as Risks and Milestones pages
- Filter/toolbar row above the table: `[Search box] [Status chips] [Owner filter] [Date range]` — all in one row
- All filters use URL query params (consistent with existing `?status=` pattern — shareable, browser back works)
- Architecture: page remains a Server Component for data fetching; inline editing and filter bar extracted into `<ActionsTableClient />` Client Component

### Bulk actions (ACTN-05)
- Checkbox column added as the first column in the Actions table
- When 1+ rows are selected: floating bar appears above the table — "N selected — [Status ▾] [Clear]"
- Bulk status dropdown shows all 4 statuses: open / in_progress / completed / cancelled
- After bulk save completes: selection clears automatically (deselects all rows)
- Bulk actions are Actions-only — Risks and Milestones tables do not get checkboxes in this phase

### Risk and Milestone inline editing
- Risks table: status (open/mitigated/resolved/accepted — fixed enum per IEDIT-03), owner, and severity cells become inline-editable
- Milestones table: status (not_started/in_progress/completed/blocked — fixed enum per IEDIT-04), target date, and owner cells become inline-editable
- Both use the same `<DatePickerCell />` and `<OwnerCell />` shared components
- Mitigation field on Risks remains append-only (existing modal behavior preserved)
- Notes field on Milestones remains in the modal

### Claude's Discretion
- Calendar popover visual styling details (month navigation, day highlight colors)
- Whether to use a single `<InlineSelectCell />` component for all status dropdowns or per-entity implementations
- Exact toast notification library/component (use whatever toast pattern already exists in the codebase, or add a minimal one)
- Radix Popover positioning (above/below cell, collision avoidance)
- Loading state during stakeholder fetch for datalist (can use empty datalist until loaded)

</decisions>

<specifics>
## Specific Ideas

- The existing `ActionEditModal` is kept but only triggered from description/notes cells or a dedicated edit icon — not from status/owner/date cells
- The floating bulk action bar pattern mirrors Gmail/Linear — familiar to users
- Risks currently stores status as freeform text — IEDIT-03 replaces this with the fixed enum; existing non-conforming values should map to 'open' as the safe default
- Milestones already has `statusBadgeColors` for the 4 enum values in `milestones/page.tsx` — reuse directly

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/table.tsx` — Table, TableHeader, TableBody, TableRow, TableHead, TableCell — already used in Risks and Milestones pages; Actions page needs to adopt the same pattern
- `components/ActionEditModal.tsx` — retain for description/notes editing; remove its wrapping of status/owner/due cells
- `components/RiskEditModal.tsx` — retain for mitigation append; remove its wrapping of status/owner/severity cells
- `components/MilestoneEditModal.tsx` — retain for notes editing; remove its wrapping of status/date/owner cells
- `components/ui/select.tsx` — Radix Select already installed; usable for status dropdowns
- `components/ui/checkbox.tsx` — already exists; use for bulk-select column
- `@radix-ui/react-select` — already in package.json
- Badge color constants (`bg-{color}-100 text-{color}-800`) — established across all prior phases, reuse in table status cells
- `app/api/stakeholders/route.ts` — GET endpoint exists; returns stakeholder names for datalist population
- `app/api/actions/[id]/route.ts` — PATCH endpoint for single action; bulk update needs a new endpoint or loop

### Established Patterns
- `router.refresh()` after PATCH mutations — established in all edit modals; keep for inline edits
- `requireSession()` at every API route handler — locked security boundary
- Drizzle ORM with `db.update()` for mutations
- Server Component pages + Client Component islands — pattern used in GlobalTimeView, PlanTabs; apply same approach to Actions page

### Integration Points
- `app/customer/[id]/actions/page.tsx` — replace card layout with table; extract `<ActionsTableClient />` for filters + inline editing
- `app/customer/[id]/risks/page.tsx` — replace `<RiskEditModal>` row wrapping with per-cell inline edit components
- `app/customer/[id]/milestones/page.tsx` — replace `<MilestoneEditModal>` row wrapping with per-cell inline edit components
- New shared components: `components/DatePickerCell.tsx`, `components/OwnerCell.tsx`, `components/InlineSelectCell.tsx`
- New API endpoint needed: `POST /api/actions/bulk-update` for bulk status changes (or loop PATCH calls client-side)
- `react-day-picker` + `@radix-ui/react-popover` — new installs required

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-actions-inline-editing-foundation*
*Context gathered: 2026-04-03*
