# Phase 41: UX Polish & Consistency - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply consistent empty states with actionable CTAs, unified overdue highlighting, and loading skeletons across all tabs. Covers UXPOL-01 (empty states), UXPOL-02 (overdue highlighting), UXPOL-03 (loading skeletons). No new features — polish and consistency pass only.

</domain>

<decisions>
## Implementation Decisions

### Empty states (UXPOL-01)

Tab-specific empty states with actionable CTA buttons — not generic "No data" text. Each entity tab button opens that tab's existing creation dialog/form.

**Tab-by-tab CTAs:**
- **Actions** → "Add Action" button — opens existing add-action dialog
- **Risks** → "Add Risk" button — opens existing add-risk dialog
- **Milestones** → "Add Milestone" button — opens existing add-milestone dialog
- **Decisions** → "Log a Decision" button — opens existing add-decision form
- **Stakeholders** → "Add Stakeholder" button — opens existing add-stakeholder form
- **Teams** → "Add Team Member" button — opens existing add-team-member form
- **Architecture** → "Add Component" button — opens existing creation UI
- **Artifacts** → "Upload a document" button — navigates to the Context Hub tab (artifacts only come from uploads, no direct add form)
- **Engagement History** → description only: "No history yet. Activity will appear here automatically as you work." No CTA — user cannot manually trigger audit entries.

**Out of scope (skip empty states):**
- Plan tab (TaskBoard/PhaseBoard) — new projects are seeded with template phases and tasks; edge case of full deletion not worth handling

### Overdue visual standard (UXPOL-02)

Unified treatment: `border-red-500 bg-red-50` applied to the row/card element for overdue items.

**Current state and what changes:**
- **Tasks (TaskBoard)**: `border-red-500 bg-red-50` already applied (Phase 39, PLAN-01) — no change
- **Actions (ActionsTableClient)**: currently NO overdue treatment — add `border-red-500 bg-red-50` to the row
- **Milestones (MilestonesTableClient)**: currently badge-only ("Overdue" badge) — add `border-red-500 bg-red-50` to the row AND keep the existing badge

**Overdue criteria (consistent with PLAN-01 definition from Phase 39):**
- Actions: `due_date < today AND status != 'closed'` (or whatever non-terminal status is used)
- Milestones: `target_date < today AND status NOT IN ('completed')`
- Tasks: already implemented — no change

### Loading skeletons (UXPOL-03)

Simple `animate-pulse` bars — consistent with existing `OnboardingDashboard.tsx` pattern. Structural/table-shaped skeletons not required.

**Tabs in scope (client-side fetchers that need skeletons):**
- `OverviewMetrics.tsx` — fetches metrics on mount via `fetchMetrics()` in useEffect
- `HealthDashboard.tsx` — fetches on mount, re-fetches on `metrics:invalidate` event
- `SkillsTabClient.tsx` — fetches job list on mount
- `OnboardingDashboard.tsx` — already has `animate-pulse` in several sections; verify coverage is complete

**Not in scope (SSR tabs — no skeleton needed):**
- Actions, Risks, Milestones, Decisions, Stakeholders, Artifacts, History — all Server Components that pass data as props to client islands; no client-side loading phase

### Claude's Discretion
- Exact empty state description text per tab (e.g., "No actions recorded yet." vs "Nothing here yet.")
- Exact overdue row styling (e.g., whether to add a left border accent in addition to `bg-red-50`)
- Exact skeleton bar layout and count per component
- Whether a shared `EmptyState` component is built or inline per-tab (prefer shared if used 5+ times)
- Overdue badge on Milestones — whether to retain alongside row highlight or remove in favour of row highlight alone

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/button.tsx` — use for CTA buttons in empty states; existing Button component with variant support
- `components/ui/badge.tsx` — existing Badge component used for "Overdue" badge in Milestones
- `OnboardingDashboard.tsx` lines 729–884 — `animate-pulse` skeleton pattern to follow for new skeletons (inline `div` with `bg-zinc-100 rounded animate-pulse`)

### Established Patterns
- Overdue row style: `border-red-500 bg-red-50` (established in TaskBoard.tsx:73, Phase 39)
- Overdue calculation: `isOverdueMilestone()` helper already exists in `MilestonesTableClient.tsx` — similar helpers exist or can be extracted for Actions
- Empty state text pattern: `<p className="py-4 text-center text-zinc-400 text-sm">No artifacts yet</p>` (in artifacts/page.tsx) — needs to be elevated to include a CTA button
- `requireSession()` at every route handler — no new routes anticipated

### Integration Points
- `components/ActionsTableClient.tsx` — add overdue row highlighting (className change on row div)
- `components/MilestonesTableClient.tsx` — add `border-red-500 bg-red-50` row styling alongside existing Overdue badge
- `components/OverviewMetrics.tsx` — add `isLoading` state + skeleton fallback in useEffect fetch
- `components/HealthDashboard.tsx` — add `isLoading` state + skeleton fallback
- `components/SkillsTabClient.tsx` — add `isLoading` state + skeleton fallback
- All entity tab pages (actions, risks, milestones, decisions, stakeholders, artifacts, history, teams, architecture) — add empty state check with description + CTA button

</code_context>

<specifics>
## Specific Ideas

- No specific visual references given — standard patterns are fine
- Artifacts empty state: CTA button navigates to the Context Hub tab (not a modal)
- History empty state: description-only ("Activity will appear here automatically") — no button since there's no user-triggered path to create history entries

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 41-ux-polish-consistency*
*Context gathered: 2026-04-06*
