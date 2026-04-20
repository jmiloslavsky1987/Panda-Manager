# Feature Consistency Audit Report

**Date:** 2026-04-20
**Phase:** 71 — Feature Consistency Audit
**Scope:** All duplicate feature implementations and inconsistent UX patterns across table clients, modals, and shared components

---

## Summary Table

| Feature Group | Findings | Type | Severity Note |
|---------------|----------|------|---------------|
| Search & Global Search | 1 | Behavioral Duplication | Two distinct components with overlapping scope — intentional or redundant? |
| Bulk Actions | 2 | Pattern Inconsistency | Decisions and Workstreams lack bulk operations present in Actions/Risks/Milestones |
| Filtering & Search (Table-Level) | 3 | Pattern Inconsistency | Decisions lacks status/owner filters; Workstreams lacks all filters |
| Edit Flows (Modal vs Inline) | 4 | Pattern Inconsistency | Dual-mode editing for Actions/Risks/Milestones; Decisions has no edit modal at all |
| Add / Create Modals | 0 | None | All four Add modals are consistent — same Dialog + form pattern |
| Empty States | 1 | Pattern Inconsistency | Workstreams uses inline text instead of EmptyState component |
| Status Enum Handling | 2 | Behavioral Duplication & Data Integrity Risk | Risks and Milestones have component-level status constants with no DB enum enforcement |
| API Route Patterns | 0 | None | All entity routes use requireSession() consistently — correct pattern |

**Total findings:** 13 (11 Pattern Inconsistencies, 2 Behavioral Duplications / Data Integrity Risks)

---

## 1. Search & Global Search

### Finding: Two search components with overlapping scope

**Components:**
- `SearchBar.tsx` (27 lines): Plain input, routes to `/search?q=` on Enter, lives in app header, placeholder "Search all projects..."
- `GlobalSearchBar.tsx` (126 lines): Dropdown results, live search, workspace header scope, placeholder "Search...", routes to `/customer/[projectId]/[tab]`

**Classification:** **BEHAVIORAL DUPLICATION** (partial)

**Analysis:**
- SearchBar is global (all projects), GlobalSearchBar is project-scoped
- SearchBar provides no live results — dumb navigation only
- GlobalSearchBar provides live results dropdown with grouped sections
- Both are input fields with search behavior, but serve different contexts

**Recommendation:** **Keep both as distinct** — different scopes justify separate implementations. However, rename for clarity:
- `SearchBar.tsx` → `GlobalProjectSearchBar.tsx` (searches across all projects)
- `GlobalSearchBar.tsx` → `WorkspaceSearchBar.tsx` (searches within a single workspace/project)

Rationale: The naming is backwards — "Global" should be the all-projects search, not the workspace-scoped search. Fix naming in Phase 73, but keep both components.

---

## 2. Bulk Actions

### Finding 1: DecisionsTableClient lacks bulk actions

**Current state:**
- Actions, Risks, Milestones: have `selectedIds`, checkbox column, floating bulk bar, `bulkUpdateStatus()` function
- Decisions: NO bulk actions pattern at all — no checkboxes, no floating bar, no bulk operations

**Classification:** **PATTERN INCONSISTENCY**

**Why missing?** Decisions table has no status field in the schema (db/schema.ts lines 213-228 show key_decisions table — no status enum or text column). Bulk status updates would be meaningless.

**Recommendation:** **Intentional exclusion — confirm and document.** Decisions are append-only operational records, not work items with status lifecycle. Bulk actions are not applicable. Mark as intentional design difference in Phase 73 documentation, not a gap to fix.

---

### Finding 2: WorkstreamTableClient lacks bulk actions

**Current state:**
- Actions, Risks, Milestones: full bulk actions pattern
- Workstreams: NO bulk actions — no checkboxes, no floating bar, only inline slider for `percent_complete`

**Classification:** **PATTERN INCONSISTENCY**

**Why missing?** Workstreams table uses a progress slider UX (lines 90-101) for editing completion percentage. The table is sparse (track, lead, state, last_updated, progress) — no status field like Actions/Risks/Milestones. The slider + Save button pattern is a distinct editing model.

**Recommendation:** **Intentional exclusion — confirm and document.** Workstreams are not actionable items with status lifecycles — they are progress trackers. The slider + dirty state + Save button pattern is domain-appropriate. If bulk progress updates are needed (e.g., "mark all as 100% complete"), add bulk actions using ActionsTableClient pattern, but current design is acceptable for MVP scope. Mark as intentional in Phase 73.

---

## 3. Filtering & Search (Table-Level)

### Finding 1: DecisionsTableClient lacks status and owner filters

**Current state:**
- Actions: q (text search), status, owner, from, to (date range)
- Risks: status, severity, owner, from, to
- Milestones: status, owner, from, to
- Decisions: q (text search), from, to — **NO status or owner filters**

**Classification:** **PATTERN INCONSISTENCY**

**Schema check:** `key_decisions` table (db/schema.ts lines 213-228) has NO `status` column and NO `owner` column — only `decision`, `context`, `date`, `source`, `created_at`. Filtering by status/owner is impossible — the fields do not exist.

**Recommendation:** **Intentional exclusion due to schema.** Decisions lack status and owner fields by design — they are append-only records of key operational choices, not work items. If decisions need ownership tracking (e.g., who made the decision, who is accountable), add an `owner` column to the schema in Phase 73 and add the owner filter. Otherwise, document this as intentional — decisions are not work items.

---

### Finding 2: DecisionsTableClient text search scope

**Current state:**
- Decisions filter: searches `decision` and `context` fields (lines 38-44)
- Actions filter: searches `description` only (lines 58-61)
- Risks: no text search at all (only status/severity/owner/date filters)
- Milestones: no text search at all (only status/owner/date filters)

**Classification:** **PATTERN INCONSISTENCY**

**Analysis:** Text search is inconsistent. Decisions have it, Actions have it, Risks/Milestones lack it entirely despite having rich text fields (description, mitigation, notes).

**Recommendation:** **Add text search to Risks and Milestones using ActionsTableClient pattern.** Search on `description` for Risks, `name` and `notes` for Milestones. Unify the filter bar UI across all four tables. Phase 73 should standardize text search as a mandatory filter for all entity tables.

---

### Finding 3: WorkstreamTableClient has no filters at all

**Current state:**
- Actions, Risks, Milestones, Decisions: all have at least date range filters
- Workstreams: NO filter bar — raw table rendering only

**Classification:** **PATTERN INCONSISTENCY**

**Why missing?** Workstreams table is sparse (name, track, lead, state, last_updated, percent_complete). There are no status values to filter by. The table is likely always short (< 10 rows per project).

**Recommendation:** **Add minimal filters if workstream count grows.** If workstreams remain < 10 rows per project, filters are overkill. If workstream tables exceed 20 rows, add: track filter (dropdown), lead filter (dropdown), and progress range filter (e.g., "show only <50% complete"). For now, mark as intentional exclusion — low row count makes filters unnecessary. Revisit in Phase 73 if user feedback requests it.

---

## 4. Edit Flows (Modal vs Inline)

### Finding 1: Actions table has dual-mode editing

**Current state:**
- Actions: clicking description opens `ActionEditModal` (full-field editing), AND inline editing for owner (OwnerCell), due (DatePickerCell), status (InlineSelectCell) in table rows
- Risks: clicking mitigation opens `RiskEditModal`, AND inline editing for severity (InlineSelectCell), owner (OwnerCell), status (InlineSelectCell)
- Milestones: clicking notes opens `MilestoneEditModal`, AND inline editing for status (InlineSelectCell), date (DatePickerCell), owner (OwnerCell)

**Classification:** **PATTERN INCONSISTENCY** (intentional — dual-mode is correct)

**Analysis:** All three tables (Actions, Risks, Milestones) provide BOTH modal editing (for multi-field edits) AND inline cell editing (for quick single-field updates). This is intentional — not a bug. The pattern is:
- Click the primary text column (description, mitigation, notes) → opens modal for full edit
- Click inline-editable cells (owner, status, date) → edit in place without modal

**Recommendation:** **Confirm as intentional dual-mode pattern and standardize.** This is the CORRECT UX — users can quick-edit common fields inline or open a modal for full context. Document this as the canonical pattern in Phase 73. Ensure Decisions follows this pattern (see Finding 2).

---

### Finding 2: DecisionsTableClient has no edit modal at all

**Current state:**
- Actions: ActionEditModal ✅
- Risks: RiskEditModal ✅
- Milestones: MilestoneEditModal ✅
- Decisions: **NO DecisionEditModal** — no way to edit decision text or context after creation

**Classification:** **PATTERN INCONSISTENCY** (missing feature)

**Why missing?** `key_decisions` table is append-only by design (enforced via DB triggers per schema.ts line 9 comment). Editing decisions breaks audit trail.

**Recommendation:** **Intentional exclusion — decisions are immutable.** Append-only design is correct for compliance and audit purposes. If editing is needed, implement "add a note" or "supersede with new decision" pattern instead of direct editing. Mark as intentional in Phase 73 — do NOT add DecisionEditModal. If users need to correct typos, add a "supersede decision" feature (new decision with `supersedes_id` foreign key) or a `decision_edits` audit log table.

---

### Finding 3: Inline editing components are used inconsistently

**Current state:**
- Actions: uses OwnerCell, InlineSelectCell (status), DatePickerCell (due)
- Risks: uses OwnerCell, InlineSelectCell (severity + status), NO DatePickerCell (no date field in schema)
- Milestones: uses OwnerCell, InlineSelectCell (status), DatePickerCell (date)
- Decisions: uses NONE — no inline editing at all

**Classification:** **PATTERN INCONSISTENCY** (partial)

**Analysis:**
- Risks correctly omits DatePickerCell (no date field in schema)
- Decisions correctly omits inline editing (append-only design)
- BUT: Risks uses InlineSelectCell for BOTH severity and status — this is correct and flexible

**Recommendation:** **Standardize inline editing based on schema fields.** Every editable field should have inline editing if it's a common update (owner, status, date). Every row should have a click-to-modal trigger for full edits (description, notes, etc.). Phase 73 should audit each table and ensure:
1. All editable fields have inline editing (if frequent updates expected)
2. All rows have a modal trigger for full context editing
3. Append-only tables (Decisions) remain read-only

---

### Finding 4: Teams section InlineEditModal is a separate pattern

**Current state:**
- Main edit modals: ActionEditModal, RiskEditModal, MilestoneEditModal (all use Dialog + form pattern)
- Teams section: `components/teams/InlineEditModal.tsx` — separate modal component for editing Business Outcomes and Focus Areas

**Classification:** **BEHAVIORAL DUPLICATION**

**Analysis:** InlineEditModal in `components/teams/` is a domain-specific modal for editing team-level metadata (business outcomes, focus areas). It does NOT edit entity rows (actions, risks, etc.) — it edits project-level text fields. This is a distinct use case.

**Recommendation:** **Keep as distinct — rename for clarity.** InlineEditModal is not duplicating ActionEditModal — it's editing a different domain (project metadata vs. entity rows). Rename to `TeamMetadataEditModal.tsx` in Phase 73 to clarify its purpose. No unification needed.

---

## 5. Add / Create Modals

### Finding: All Add modals are consistent

**Components audited:**
- AddActionModal.tsx
- AddDecisionModal.tsx
- AddMilestoneModal.tsx
- AddRiskModal.tsx

**Classification:** **NONE — Fully consistent**

**Analysis:**
All four modals follow the same pattern:
1. Dialog component from `@/components/ui/dialog`
2. Form with controlled state (useState for each field)
3. POST to `/api/[entity]` route
4. Error handling with `error` state and toast display
5. Saving state with disabled buttons during submission
6. Reset form fields on success + close modal + router.refresh()

**Field layout:** Each modal has entity-specific fields (e.g., Actions have "due" + "status", Risks have "severity" + "mitigation"), but the structure is identical.

**Recommendation:** **No changes needed.** This is the canonical Add modal pattern. All future Add modals should follow this structure. Document this as the standard in Phase 73.

---

## 6. Empty States

### Finding: WorkstreamTableClient uses inline text instead of EmptyState component

**Current state:**
- Actions, Risks, Milestones, Decisions: all use `<EmptyState>` component with title, description, and action button (lines 163-178 in ActionsTableClient, etc.)
- Workstreams: uses inline `<p className="text-zinc-400 text-sm py-4">{emptyMessage ?? 'No workstreams'}</p>` (line 62 in WorkstreamTableClient.tsx)

**Classification:** **PATTERN INCONSISTENCY**

**Why different?** WorkstreamTableClient is older/simpler — it predates the EmptyState component or was not refactored to use it.

**Recommendation:** **Unify to EmptyState component.** Replace inline text in WorkstreamTableClient with:
```tsx
if (streams.length === 0) {
  return (
    <EmptyState
      title="No workstreams yet"
      description="Workstreams organize delivery tracks. Add the first workstream to get started."
      action={{
        label: 'Add Workstream',
        onClick: () => { /* TODO: wire to AddWorkstreamModal */ }
      }}
    />
  )
}
```

Phase 73 should refactor WorkstreamTableClient to use EmptyState for consistency. Note: AddWorkstreamModal does not exist yet — this will create a CTA placeholder (action.onClick is currently `() => {}` per tech debt notes).

---

### Finding: Filter-zero-results state is inconsistent

**Current state:**
- Actions: shows "No actions found." in TableCell (line 305-307)
- Risks: shows "No risks found." in TableCell (line 318-322)
- Milestones: shows "No milestones found." in TableCell (line 314-318)
- Decisions: shows "No decisions match your filters." as inline `<p>` outside table (line 133)

**Classification:** **PATTERN INCONSISTENCY**

**Analysis:** Four different ways to show "no results after filtering":
1. Actions/Risks/Milestones: single-row TableCell with colspan + centered text
2. Decisions: inline paragraph outside the table structure

The in-table message (TableCell with colspan) is more visually consistent — user sees the table headers and one row saying "no results."

**Recommendation:** **Standardize on in-table empty row.** All tables should show filter-zero-results as a single TableRow with `colSpan={columnCount}` and centered text. Update DecisionsTableClient to wrap the "No decisions match your filters" message in a `<TableRow><TableCell colSpan={N}>...</TableCell></TableRow>` structure. Phase 73 should unify this pattern.

---

## 7. Status Enum Handling

### Finding 1: Actions has DB enum, Risks and Milestones do not

**Current state:**
- Actions: `actionStatusEnum` pgEnum in db/schema.ts (lines 37-42) — enforced at DB level
- Risks: `RISK_STATUS_OPTIONS` component constant (RisksTableClient.tsx lines 22-27) — NO pgEnum in schema
- Milestones: `MILESTONE_STATUS_OPTIONS` component constant (MilestonesTableClient.tsx lines 24-29) — NO pgEnum in schema

**Schema verification:**
- `actions.status` (line 159): type is `actionStatusEnum('status')` — DB-enforced enum ✅
- `risks.status` (line 182): type is `text('status')` — NO enum, plain text ❌
- `milestones.status` (line 200): type is `text('status')` — NO enum, plain text ❌

**Classification:** **DATA INTEGRITY RISK** (not just inconsistency)

**Why different?** Actions table was migrated to use DB enums early (likely v1.0 or v2.0). Risks and Milestones were never migrated — status values are component-level constants only. The DB accepts ANY string value in the status column.

**Risk:** Invalid status values can reach the database if:
1. API route handlers bypass component validation
2. Direct DB inserts (e.g., from ingestion pipelines or admin scripts) use wrong values
3. Legacy data migration imports old/invalid status strings

**Recommendation:** **Create DB enums for Risks and Milestones in Phase 73.** Add pgEnum definitions:
```ts
export const riskStatusEnum = pgEnum('risk_status', ['open', 'mitigated', 'resolved', 'accepted']);
export const milestoneStatusEnum = pgEnum('milestone_status', ['not_started', 'in_progress', 'completed', 'blocked']);
```

Then migrate `risks.status` and `milestones.status` columns from `text('status')` to `riskStatusEnum('status')` and `milestoneStatusEnum('status')`. Run a data migration to normalize existing values before applying the constraint.

---

### Finding 2: Severity enum exists but is used inconsistently

**Current state:**
- DB schema: `severityEnum` pgEnum defined (lines 44-49) with values: 'low', 'medium', 'high', 'critical'
- Risks schema (line 179): `severity: severityEnum('severity')` — DB-enforced enum ✅
- Component: `SEVERITY_OPTIONS` constant in RisksTableClient (lines 29-34) duplicates the DB enum values

**Classification:** **BEHAVIORAL DUPLICATION** (component constant duplicates DB enum)

**Why duplicated?** Component needs labels for dropdowns ("Low", "Medium", "High", "Critical") but DB enum only stores values ('low', 'medium', 'high', 'critical'). The duplication is intentional — DB enum enforces storage, component constant provides UI labels.

**Risk:** If DB enum values change (e.g., rename 'medium' to 'moderate'), component constant must also change. No single source of truth.

**Recommendation:** **Keep duplication but add runtime validation.** The duplication is acceptable (DB enforces storage, component provides UI labels), but add a type guard or startup check to ensure `SEVERITY_OPTIONS` values match the DB enum. In Phase 73, add a test:
```ts
// In tests or app startup
const dbSeverityValues = ['low', 'medium', 'high', 'critical']; // from schema
const componentSeverityValues = SEVERITY_OPTIONS.map(o => o.value);
assert(componentSeverityValues.every(v => dbSeverityValues.includes(v)));
```

Alternatively, generate `SEVERITY_OPTIONS` from the DB enum at build time (Drizzle introspection), but this is complex. For now, keep the duplication and document the dependency.

---

## 8. API Route Patterns (Infrastructure)

### Finding: All entity routes use requireSession() consistently

**Scope audited:** Actions, Decisions, Risks, Milestones, Workstreams, Stakeholders API routes

**Classification:** **NONE — Fully consistent**

**Current state:**
- All entity POST/PATCH/DELETE routes call `requireSession()` at the top of the handler
- All routes return 401 if session is missing
- Project-scoped routes (actions, risks, milestones, decisions) also verify project ownership via `getWorkspaceData()` or direct project_id FK constraint

**Recommendation:** **No changes needed.** This is the correct auth pattern (CVE-2025-29927 defense-in-depth per STATE.md line 69). Document this as the standard API route pattern in Phase 73. Future routes must follow this pattern: `requireSession()` first, then `requireProjectRole()` for project-scoped resources.

---

## Findings Summary

### Count by Type
- **Behavioral Duplication:** 2 findings (Search naming, Severity enum duplication)
- **Pattern Inconsistency:** 11 findings (Bulk actions, Filters, Edit flows, Empty states, Filter-zero-results display)
- **Data Integrity Risk:** 2 findings (Missing DB enums for Risks/Milestones status)

### Count by Severity
- **High (Data Integrity or User Capability):** 2 findings
  - Missing DB enums for Risks and Milestones status (data integrity risk)
  - Decisions lacks edit flow (intentional — append-only design, not a bug)
- **Medium (UX Inconsistency):** 8 findings
  - Bulk actions missing from Decisions/Workstreams
  - Text search missing from Risks/Milestones
  - Empty state pattern divergence (Workstreams inline text)
  - Filter-zero-results display inconsistency
  - Search component naming confusion
- **Low (Code Cleanliness):** 3 findings
  - Severity enum duplication (component + DB)
  - Teams InlineEditModal naming
  - Add modals fully consistent (no finding)

### Overall Assessment

The codebase is **moderately consistent** with clear patterns in place (Add modals, API auth, dual-mode editing), but has **8 medium-severity UX inconsistencies** and **2 high-severity data integrity gaps**.

**Highest-priority areas for Phase 73:**
1. **Add DB enums for Risks and Milestones status** (data integrity) — migrate `text('status')` to pgEnum with data normalization
2. **Standardize text search across all tables** — add to Risks and Milestones
3. **Unify empty state pattern** — WorkstreamTableClient should use EmptyState component
4. **Document intentional design differences** — Decisions append-only, Workstreams progress-slider UX, SearchBar vs GlobalSearchBar scopes

Phase 73 should prioritize (1) and (2) as blocking work, then address (3) and (4) as polish. Remaining findings are documentation tasks ("confirm as intentional") rather than code changes.
