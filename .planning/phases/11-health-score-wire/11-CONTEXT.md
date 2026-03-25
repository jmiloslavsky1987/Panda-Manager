# Phase 11: Health Score Wire - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire `workstreams.percent_complete` into `computeHealth()` so the Dashboard health card RAG badge reflects task completion progress. Closing the PLAN-09 gap confirmed in Phase 3 VERIFICATION.md: the final link (workstream percent_complete → health score) is present as a stub but untested and the signal is not surfaced in HealthCard.

This phase is narrowly scoped: make the stall signal work end-to-end + expose it in HealthCard. No new UI views, no new DB tables.

</domain>

<decisions>
## Implementation Decisions

### HealthCard display
- **Show stalledWorkstreams count** as a third metric below the RAG badge — matching the existing `overdueActions` + `highRisks` pattern
- Label: `N stalled workstream(s)` (parallel to "2 overdue actions" / "1 high risk")
- Highlight: orange text when `stalledWorkstreams > 0`, matching the highlight styling used for `overdueActions` and `highRisks`
- `computeHealth()` must return `stalledWorkstreams` so `HealthCard` can display it; `ProjectWithHealth` type needs updating

### Untracked workstreams (NULL percent_complete)
- Workstreams with `percent_complete IS NULL` (no tasks assigned) are **excluded** — not stalled, just unplanned
- Only workstreams that have been assigned tasks (`percent_complete IS NOT NULL`) contribute a stall signal
- A workstream at 100% is neutral — no positive bonus to the score (keeps scoring simple)

### Stall threshold
- Keep current stub threshold: `percent_complete < 30%` counts as stalled
- The success criterion requires 0% to trigger — this is satisfied by `< 30`

### Signal weight
- Multiple stalled workstreams still contribute at most 1 point to the health score (current cap preserved)
- Rationale: prevents a project with many workstreams from jumping straight to red on workstream signal alone

### Claude's Discretion
- Exact test structure and fixture approach for the new E2E test
- Whether to also call `updateWorkstreamProgress()` on task DELETE (if not already done)
- Import/type adjustments in `ProjectWithHealth` to include `stalledWorkstreams`

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeHealth()` in `lib/queries.ts`: stub already reads `percent_complete < 30`, computes `workstreamSignal` — Phase 11 makes it return `stalledWorkstreams` and wires the count to HealthCard
- `HealthCard.tsx`: existing count display pattern with conditional orange highlight — extend with `stalledWorkstreams` prop
- `updateWorkstreamProgress()` in `lib/queries.ts`: already called from task PATCH route — rollup is functional
- `ProjectWithHealth` type: needs `stalledWorkstreams: number` added

### Established Patterns
- Health score is computed synchronously on-demand (not cached) — no background job needed for this phase
- HealthCard uses `project.overdueActions` and `project.highRisks` from the `ProjectWithHealth` type — same approach for `stalledWorkstreams`
- Tests live in `bigpanda-app/app/api/__tests__/` for API routes, `bigpanda-app/e2e/` for E2E

### Integration Points
- `computeHealth()` return type — add `stalledWorkstreams: number` to the return object and propagate through `getProjectsWithHealth()` and `getProjectWithHealth()`
- `HealthCard.tsx` — consume the new `stalledWorkstreams` field from `ProjectWithHealth`
- Phase 3 roadmap plan entry: `11-01-PLAN.md — Wave 1: Wire workstreams.percent_complete into computeHealth() + update health card test`

</code_context>

<specifics>
## Specific Ideas

No specific UI references beyond matching existing HealthCard metric style.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-health-score-wire*
*Context gathered: 2026-03-25*
