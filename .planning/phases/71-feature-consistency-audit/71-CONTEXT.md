# Phase 71: Feature Consistency Audit - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce a written audit report that catalogs every duplicate feature implementation and inconsistent UX pattern in the codebase. Each finding gets a recommended resolution. No code changes in this phase — the deliverable is the report. Phase 73 (Feature Unification) acts on it.

</domain>

<decisions>
## Implementation Decisions

### Audit scope
- Full open-ended sweep of the entire codebase — no predefined checklist that could miss categories
- Prioritize areas known to have parallel implementations: table components (Actions, Risks, Milestones, Decisions, Workstream), search (two components exist: SearchBar.tsx + GlobalSearchBar.tsx), Add* modals, empty states, edit flows (inline vs modal), bulk action patterns
- Also cover: filter state management patterns, date picker usage, owner/stakeholder autocomplete, status enum handling, API route patterns

### Classification / finding taxonomy
- Two-tier classification per finding:
  - **Behavioral duplication** — two features do the same thing but are implemented separately (e.g., two search components, add-modal patterns diverging)
  - **Pattern inconsistency** — same feature category behaves differently across equivalent areas (e.g., Decisions table lacks bulk actions that Actions/Risks/Milestones have)
- Recommendation type for each finding: "Unify to A" / "Unify to B" / "Create new canonical" — Claude picks one with rationale (not just flags the problem)

### Recommendation depth
- Concrete and prescriptive — same standard as Phase 70: Claude picks a recommendation, doesn't hedge
- Every finding has: description of inconsistency, affected files/components, recommended resolution with brief rationale
- Tone: direct and actionable ("Decisions table is missing bulk actions that Actions/Risks/Milestones have — add them using ActionsTableClient pattern" not "may potentially need alignment")

### Report structure
- Group by **feature type** (not by workspace area) — shows problem clusters and makes Phase 73 planning by feature cohesive
- Suggested feature groups: Search & Filtering, Bulk Actions, Edit Flows (inline vs modal), Empty States, Add/Create Modals, Status & Enum Handling, API Patterns
- Each group lists all findings, affected components, and the single recommended resolution

### Audit completeness
- "Everything is consistent" is a valid outcome for any feature group — report should confirm correctness where it exists
- Phase 71 is diagnostic: the user's goal is visibility before Phase 73 work begins
- No borderline-hedging: if Claude is uncertain whether something is intentionally different or an inconsistency, state that clearly and give a directional recommendation

### Claude's Discretion
- Exact section headers and report formatting (Markdown, human-readable)
- Whether to include a summary table at the top
- How deeply to describe each finding (component name + one line is sufficient for minor inconsistencies)
- Whether to group infrastructure-level inconsistencies (API route patterns) separately from UI-level ones

</decisions>

<specifics>
## Specific Ideas

- From Phase 70 pattern: make the duplication/inconsistency distinction **visible at a glance** — not buried in prose
- DecisionsTableClient.tsx observed to lack `selectedIds` / bulk actions that Actions, Risks, and Milestones tables have — this is a known concrete example for the audit to pick up
- Two search implementations confirmed: `SearchBar.tsx` (global app bar) and `GlobalSearchBar.tsx` (workspace header) — the audit should clarify if these are intentionally distinct or a duplication to collapse

</specifics>

<code_context>
## Existing Code Insights

### Known potential duplications (from scout)
- `SearchBar.tsx` vs `GlobalSearchBar.tsx` — two search components, unclear if intentionally distinct
- `AddActionModal.tsx`, `AddDecisionModal.tsx`, `AddMilestoneModal.tsx`, `AddRiskModal.tsx` — multiple add modals; may have diverged in pattern
- `EmptyState.tsx` component exists but some pages use inline empty state patterns

### Table components for consistency sweep
- `ActionsTableClient.tsx` — has selectedIds (bulk), filter, search
- `RisksTableClient.tsx` — has selectedIds (bulk), filter, search
- `MilestonesTableClient.tsx` — has selectedIds (bulk), filter, search
- `DecisionsTableClient.tsx` — no selectedIds (no bulk actions observed)
- `WorkstreamTableClient.tsx` — unknown; needs audit

### Route tree
- Workspace runs on `/customer/[id]/` — this is the active route tree
- API handlers at `app/api/projects/[projectId]/` — separate namespace, no duplication concern expected here

### Integration Points
- Report is consumed by the user (not by code) — written to a file in the phase directory
- Phase 73 (RFCTR-04) will act on every finding in the report

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 71-feature-consistency-audit*
*Context gathered: 2026-04-19*
