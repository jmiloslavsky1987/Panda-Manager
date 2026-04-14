# Phase 60: Health Dashboard Redesign - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign the per-project Health Dashboard section in the Overview tab to deliver an executive-quality (ELT/Director audience) health summary driven by all available system data — no manual input. Scope is the per-project Overview tab only. Portfolio dashboard is not in scope.

</domain>

<decisions>
## Implementation Decisions

### Audience and tone
- Target audience: ELT and Director level — the health section should communicate a verdict, not a data dump
- Design principle: Maximum information in minimum screen space; no scrolling required to see the verdict

### Placement in Overview tab
- Move the health section to the **top of the Overview tab**, above WeeklyFocus and OnboardingDashboard
- Overview page render order: `<HealthDashboard>` → `<WeeklyFocus>` → `<OnboardingDashboard>` → `<OverviewMetrics>`

### Layout: big verdict first
- Large, prominent RAG status badge at the top — the first thing an executive sees
- Badge label includes the primary trigger inline: **"At Risk — 2 overdue milestones"** (not just "At Risk")
- Below the badge: small inline reason chips showing non-zero signals (e.g., `2 overdue milestones  •  1 critical risk`)
- Each reason chip is a **navigable link** to the relevant tab:
  - "N overdue milestones" → Milestones tab
  - "N critical/high risks" → Risks tab
  - "N blocked onboarding steps (ADR)" → Onboarding/Overview tab
- Zero-signal state (green): shows "No issues detected" with no chips
- ADR/Biggy per-track health badges displayed below the overall verdict and chips

### Overall health formula (rule-based, evaluated in priority order)
1. Any **critical risk open** → **red** (trumps all other signals)
2. Any **high risk open** OR any **overdue milestone** (past target date, not completed) → **yellow**
3. Otherwise → **green**

- "Overdue milestone" = milestone with a parseable ISO date in the `date` field that is before today AND `status != 'completed'`
- No manual flagging required — fully derived from existing data
- Formula replaces the current onboarding-step-completion-based overall health formula

### Per-track health (ADR / Biggy)
- ADR and Biggy per-track health badges are **retained** — derived from onboarding step completion % per track (same formula as Phase 34)
- Rationale: milestones and risks have no `track` field; onboarding steps are the best track-specific signal available without a schema migration
- Track badge formula (unchanged from Phase 34): blocked step ratio ≥ 50% or any critical risk → red; any blocked step → yellow; otherwise → green

### Data fetching
- Reuse the existing `/api/projects/[projectId]/overview-metrics` endpoint — it already returns `riskCounts`, `milestoneOnTrack`, and `stepCounts`
- Add `overdueMilestones` count to the endpoint response (milestones where date < today and status != 'completed', filtering only ISO-formatted dates)
- Continue listening for `metrics:invalidate` CustomEvent for auto-refresh

### Claude's Discretion
- Visual weight and sizing of the large RAG badge (font size, padding, icon)
- Whether to use a colored background strip/banner vs a large badge pill
- Exact chip styling (pills, borders, hover states)
- How to handle milestones with non-ISO dates ('TBD', 'Q3 2026') — exclude from overdue count
- Loading skeleton design for the enlarged health section

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ragConfig` in `HealthDashboard.tsx`: RAG label/className constants (`bg-green-100 text-green-800`, etc.) — reuse directly
- `computeTrackHealth()` in `HealthDashboard.tsx`: Per-track formula from onboarding steps — keep as-is
- `GET /api/projects/[projectId]/overview-metrics`: Already returns `riskCounts`, `stepCounts`, `milestoneOnTrack` — extend with `overdueMilestones` count, no full rewrite needed
- `metrics:invalidate` CustomEvent pattern: already wired in `HealthDashboard.tsx` — retain

### Established Patterns
- Client component using `useEffect` + `fetch` for data fetching (same as existing HealthDashboard)
- Badge colors: `bg-green-100 text-green-800 border-green-200` pattern
- `requireProjectRole(id, 'user')` for API auth guard
- `Link` from next/link for chip navigation

### Integration Points
- `app/customer/[id]/overview/page.tsx`: Reorder component imports — `<HealthDashboard>` moves to first position
- `app/api/projects/[projectId]/overview-metrics/route.ts`: Add `overdueMilestones` field to transaction query and response shape
- `components/HealthDashboard.tsx`: Replace current layout (overall badge + track badges + blocked-task list) with new layout (large verdict + reason chips + track badges)
- `db/schema.ts` → `milestones.date`: TEXT field — use same ISO date regex pattern from `computeHealth()` in `lib/queries.ts` to filter parseable dates only

</code_context>

<specifics>
## Specific Ideas

- The "big verdict first" pattern targets the same audience as the Portfolio dashboard health chips (Phase 49) — make them visually consistent so an exec moving between portfolio and project views sees the same language and colors
- The primary trigger in the badge label ("At Risk — 2 overdue milestones") should name the **highest severity active signal** — critical risk trumps milestone slip in the label as well
- Chips should only render for non-zero counts — a fully healthy project shows nothing below the green badge except "No issues detected"

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 60-health-dashboard-redesign*
*Context gathered: 2026-04-14*
