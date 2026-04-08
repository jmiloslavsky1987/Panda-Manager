# Phase 47: Work Breakdown Structure - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the Phase Board at `app/customer/[id]/plan/` with a collapsible WBS tree at `app/customer/[id]/wbs/` — displaying both ADR and Biggy hierarchies with inline CRUD and an AI Generate Plan feature. Phase 46 handles extraction/classification into wbs_items; Phase 47 builds the UI that reads from those populated records and adds the Generate Plan AI gap-fill capability.

Out of scope: wbs_task_assignments link management UI (deferred), schema migrations (name + status is sufficient).

</domain>

<decisions>
## Implementation Decisions

### Track display layout
- **ADR | Biggy tab switcher** — one track visible at a time. ADR is the default on initial load.
- Level 1 section headers expanded by default; Level 2 and Level 3 nodes collapsed.
- Status badge on every node (all three levels) — small colored pill inline with node name.
- Status values: `not_started` (zinc) / `in_progress` (blue) / `complete` (green) — consistent with app-wide color conventions.

### Generate Plan UX (WBS-04)
- **Preview + confirm modal** — AI proposals are shown to the user before any DB write. User reviews the list and confirms before items are committed.
- Generate Plan button placed in the WBS page header area (above the ADR/Biggy tab switcher), visible at all times.
- On re-runs: propose only genuinely new items — AI detects existing nodes and skips duplicates. User sees only net-new additions.
- AI may propose **Level 2 and Level 3** nodes only. Level 1 section headers are protected — AI cannot add new sections.
- Generate Plan runs against both tracks simultaneously (not scoped per-track).

### Node CRUD UX (WBS-05)
- **Inline editing** — clicking a node name makes it an editable input in place. Status changed via a dropdown/select in the same row. Enter to save, Escape to cancel.
- **Add child**: `+` icon appears on row hover. Clicking adds a new empty child node directly below (inline, ready to type).
- **Reorder**: drag handle (`≡`) on every row. Nodes can be dragged to any position in the tree, including reparenting to a different Level 1 section. @dnd-kit/core is already installed (Phase 3).
- **Delete**: clicking delete (trash icon on hover) triggers a confirm dialog — "Delete '[name]' and its N sub-items?" — then removes the node and its entire subtree.
- Level 1 section headers are **locked** — cannot be renamed, added, deleted, or reparented by the user. Only L2 and L3 nodes are fully editable/deletable. The add button does not appear on Level 1 rows for adding siblings; it adds L2 children.

### Node fields
- **Name + status only** — no additional fields (no description, owner, due date). No schema migration required.
- `source_trace` column is internal only — not surfaced in the UI anywhere.
- `wbs_task_assignments` link management deferred to a later phase — no task count badge or link UI in Phase 47.

### Claude's Discretion
- Exact drag-and-drop collision detection and reparenting visual affordance (e.g., indent indicator, drop zone highlight)
- Loading/skeleton state for the WBS tree while data fetches
- Error toast copy and retry behavior for failed saves
- Empty state copy when a section has no L2/L3 children
- Generate Plan modal layout — how proposals are grouped and rendered (by track, by section, etc.)
- AI prompt engineering for the Generate Plan call (context selection, gap detection logic)
- Whether to use optimistic UI for inline edits (consistent with app-wide pattern — yes)

</decisions>

<specifics>
## Specific Ideas

- WBS is navigated from the Plan tab area (Phase 44 created `app/customer/[id]/wbs/page.tsx` as a placeholder — Phase 47 fills it in)
- ADR template structure is authoritative (10 Level-1 sections, ~25 Level-2 sub-items per Phase 45 decisions) — Level 1 headers must not be editable
- Generate Plan must be re-runnable to catch tasks not surfaced in earlier extraction runs (WBS-04 explicit requirement)
- Performance: tree must render without lag at 100+ nodes (PERF-02 future requirement — plan with virtualization in mind)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/customer/[id]/wbs/page.tsx` — placeholder page, will be replaced with full WBS tree implementation
- `@dnd-kit/core`, `@dnd-kit/sortable` — already installed (Phase 3, used in PhaseBoard.tsx); use for reorder drag
- `components/PhaseBoard.tsx` — existing @dnd-kit usage with DndContext, SortableContext, useSortable — reference for drag patterns
- `components/TaskEditModal.tsx` — Dialog pattern for delete confirm dialog; adaptable for the "Delete subtree?" confirmation
- shadcn/ui Dialog, DropdownMenu, Badge, Input — all available for inline edit and status dropdown
- `lib/queries.ts` — `getWbsItems(projectId, track)` already implemented, returns wbs_items ordered by level + display_order

### Established Patterns
- Optimistic UI with `"Saving..."` indicator and toast on error (app-wide standard)
- Status badges: `bg-zinc-100 text-zinc-600` (not_started), `bg-blue-100 text-blue-700` (in_progress), `bg-green-100 text-green-700` (complete) — matches STATUS_COLORS in PhaseBoard.tsx
- Server components fetch data, pass as props to `'use client'` components — follow `app/customer/[id]/plan/page.tsx` → `PhaseBoard` pattern
- AI skill calls via BullMQ job infrastructure (Phase 4/5 pattern) — Generate Plan should queue a job, stream results or poll for completion

### Integration Points
- `app/customer/[id]/wbs/page.tsx` — Phase 47 replaces placeholder with `getWbsItems(projectId, 'ADR')` + `getWbsItems(projectId, 'Biggy')` calls, passes to WBS tree client component
- `db/schema.ts` `wbs_items` — `level`, `parent_id`, `status`, `display_order`, `track` are the key fields for tree rendering and editing
- `app/api/projects/[projectId]/` — WBS CRUD API routes needed (add/edit/delete/reorder nodes); follow existing route patterns under this directory
- Generate Plan skill — new BullMQ skill that reads project context (existing skills pattern from Phase 5) and proposes wbs_items additions

</code_context>

<deferred>
## Deferred Ideas

- `wbs_task_assignments` link management UI (linking Plan Board tasks to WBS nodes) — future phase
- AI-generated Level 1 section proposals — Generate Plan is constrained to L2/L3 only in Phase 47

</deferred>

---

*Phase: 47-work-breakdown-structure*
*Context gathered: 2026-04-08*
