# Phase 34: Overview Tab — Metrics & Health Dashboard - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Add three new read-only sections to the Overview tab: a visual Milestone Timeline (near top), a Metrics section (onboarding progress, risk distribution, hours spent), and a Health Dashboard (overall health indicator, per-track RAG, active blockers). All data computed from live database — no manual entry. Recharts is the charting library. Editing milestones, risks, integrations, or steps remains in their respective tabs.

</domain>

<decisions>
## Implementation Decisions

### Milestone Timeline
- Positioned at the **top of the Overview tab**, above onboarding tracks, metrics, and health sections
- The existing custom dot-on-spine horizontal scroller is **replaced** with a Recharts-based visual timeline component
- Must meet TMLN-01: visual timeline (not a text list), positioned near top

### Metrics — which metrics to show
- **Onboarding progress per track**: Two `ProgressRing` components (one for ADR, one for Biggy) showing % of steps complete
- **Risk distribution by severity**: Recharts `PieChart` (donut) showing counts of critical / high / medium / low risks
- **Hours spent on project**: Stat card showing total hours + Recharts `BarChart` of hours per week (last 8 weeks)
- The existing analytics API (`GET /api/projects/[projectId]/analytics`) already returns weekly hours data — reuse it

### Metrics — visualization pattern
- Stat cards + one chart per metric (not charts-only, not numbers-only)
- `ProgressRing` component already exists in `OnboardingDashboard.tsx` — reuse directly

### Health Dashboard — active blockers
- Counts **onboarding steps with status='blocked'** across both ADR and Biggy tracks
- Does NOT include blocked integrations, blocked actions, or critical risks (those have their own indicators)

### Health Dashboard — per-workstream health
- Two RAG badges: one for ADR, one for Biggy
- Badge color computed from the track's blocked step ratio (Claude's discretion on threshold)
- Reuse existing badge + color patterns (`bg-green-100 text-green-800`, etc.)

### Health Dashboard — overall health formula
- Rule-based, evaluated in order:
  1. Any **critical risk open** → **red** (trumps all other signals)
  2. Any **high risk open** OR **onboarding completion < 50%** (either track) → **yellow**
  3. Otherwise → **green**
- Four signals inform the calculation: onboarding step completion rate, open critical/high risks, integration validation rate, milestone on-track rate
- The rule-based priority above is the final arbiter; the four signals feed the yellow condition (can be extended later)

### Data fetching architecture
- New dedicated endpoint: `GET /api/projects/[projectId]/overview-metrics`
- Returns all aggregated data in one call: onboarding step counts per track, risk counts by severity, hours (via analytics), integration status counts, milestone on-track status
- New sub-components imported into the overview page:
  - `OverviewMetrics` — renders metrics section
  - `HealthDashboard` — renders health section
  - `MilestoneTimeline` — renders Recharts timeline (replaces inline section in OnboardingDashboard)
- `OnboardingDashboard.tsx` is NOT further expanded; new sections live in separate component files

### Recharts installation
- Recharts is **not currently installed** — must be added (`npm install recharts`)
- Required for: milestone timeline, risk donut, hours bar chart

### Claude's Discretion
- Recharts chart color palette and styling details
- Exact timeline X-axis layout and milestone label truncation
- Per-track health badge threshold (e.g., >20% blocked steps = yellow, any blocked + critical = red)
- Layout of the Metrics section (grid, flex, or responsive card row)
- How the four health signals contribute to the yellow floor (beyond the explicit rules above)

</decisions>

<specifics>
## Specific Ideas

- Milestone timeline replaces the existing inline section in `OnboardingDashboard.tsx` (lines ~795–858) — do not keep both
- `ProgressRing` is already used for per-track progress in Phase 33's dual-track header — reuse directly
- The analytics API already computes weekly hours rollup — no new DB query needed for that metric
- Health formula is rule-based (explicit priority), not a scoring system — easier to reason about and explain to users

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProgressRing` (OnboardingDashboard.tsx) — reuse for ADR and Biggy onboarding completion rings
- `HealthCard.tsx` — cross-project RAG badge pattern; reuse badge color constants for per-track health
- `STEP_STATUS_COLORS`, `RISK_SEVERITY_COLORS` constants in OnboardingDashboard.tsx — reuse for chart color mapping
- `GET /api/projects/[projectId]/analytics` — already returns weekly hours rollup; consume from `overview-metrics` or call alongside it

### Established Patterns
- API routes use `requireSession()` for auth guard
- Drizzle ORM with `db.select()` / aggregation queries
- Recharts not installed — needs `npm install recharts`
- Component files in `components/` root, page files in `app/customer/[id]/overview/page.tsx`
- Badge colors: `bg-green-100 text-green-800`, `bg-yellow-100 text-yellow-800`, `bg-red-100 text-red-800`

### Integration Points
- `app/customer/[id]/overview/page.tsx` — currently only renders `<OnboardingDashboard projectId={projectId} />`. Phase 34 adds `<MilestoneTimeline>`, `<OverviewMetrics>`, `<HealthDashboard>` here (or composes them inside OnboardingDashboard as separate imports)
- `OnboardingDashboard.tsx` lines ~795–858 (milestone timeline section) — remove inline section, replace with `<MilestoneTimeline>` component
- `db/schema.ts` tables in scope: `onboardingPhases`, `onboardingSteps`, `risks`, `milestones`, `integrations`, `timeEntries`

</code_context>

<deferred>
## Deferred Ideas

- Task completion % and action velocity metrics — useful but not selected for this phase; candidates for Phase 35 or a future metrics phase
- Editable health thresholds per project — own phase
- Trend indicators (↑↓) on health signals — could be added in Phase 35

</deferred>

---

*Phase: 34-overview-tab-metrics-health-dashboard*
*Context gathered: 2026-04-02*
