# Phase 33: Overview Tab Schema Migration + Workstream Structure - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a `track` column ('ADR' | 'Biggy') to `onboarding_phases`, auto-seed both tracks on project creation, and restructure the Overview tab to render ADR and Biggy as two separate side-by-side sections. Remove the Project Completeness indicator. Creating/editing phases and steps is handled by the existing Onboarding tab — this phase only changes the schema and the Overview tab's presentation.

</domain>

<decisions>
## Implementation Decisions

### Schema migration
- Add `track text` column to `onboarding_phases` table (values: 'ADR' | 'Biggy')
- No backfill needed — existing dev data will be wiped before go-live; migration adds the column only
- Migration file continues the existing sequence: `0026_onboarding_track.sql`

### Standard phase model — auto-seeding
- Both tracks are seeded automatically when a new project is created
- Seeding happens inside the project creation API (POST /api/projects), atomic with project creation
- Seeded phases (ADR track, display_order 1–5):
  1. Discovery & Kickoff
  2. Integrations
  3. Platform Configuration
  4. Teams
  5. UAT
- Seeded phases (Biggy track, display_order 1–5):
  1. Discovery & Kickoff
  2. IT Knowledge Graph
  3. Platform Configuration
  4. Teams
  5. Validation
- Steps are NOT auto-seeded — added manually via the Onboarding tab

### API response shape
- Onboarding API (`GET /api/projects/[projectId]/onboarding`) returns grouped response: `{ adr: PhaseWithSteps[], biggy: PhaseWithSteps[] }`
- Server does the grouping by `track` column — no client-side filtering needed
- Each `PhaseWithSteps` entry includes the `track` field

### Overview tab — dual-track UI
- Two side-by-side columns: ADR (left) | Biggy (right)
- Header changes: two progress rings (one per track) replace the single combined ring
- Each column renders its phases as collapsible cards with `X/Y steps` count
- When a track has phases but no steps yet: show the phase containers with `0/0 steps` (structure visible, ready for input)
- Single global filter bar at top — status filter + search applies to both columns simultaneously

### Project Completeness removal (WORK-02)
- Remove the completeness score bar (lines ~95–107 of overview/page.tsx)
- Remove the below-60% warning banner (lines ~109–130)
- Remove all completeness-related imports and server-side fetch logic from overview/page.tsx

### Claude's Discretion
- Column layout breakpoint (suggest: side-by-side on md+, stacked on mobile)
- Color/accent used to visually distinguish ADR vs Biggy columns (e.g., subtle left-border color or section header badge)
- Progress ring color per track (or keep both green — consistent with existing ring)
- How collapse state is tracked when two tracks are rendered (suggest: keep collapsed state keyed by phase.id as today)

</decisions>

<specifics>
## Specific Ideas

- No specific UI references given — open to standard approaches consistent with the rest of the dashboard
- User confirmed existing dev data will be wiped before go-live, so migration simplicity is preferred over data preservation

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProgressRing` component (OnboardingDashboard.tsx:117) — reuse directly, render one per track
- `StepOwnerField` component (OnboardingDashboard.tsx:153) — unchanged, reused in both columns
- `STEP_STATUS_COLORS`, `STEP_STATUS_CYCLE` constants — unchanged
- Phase card + step row rendering (lines 429–548) — extract into a shared `TrackSection` sub-component, render twice

### Established Patterns
- Migration files live in `db/migrations/00XX_name.sql` — next is `0026_`
- Drizzle schema in `db/schema.ts` — add `track: text('track')` to `onboardingPhases` table definition
- Project creation API: `app/api/projects/route.ts` — seeding logic added here after INSERT
- API routes use `db.transaction` for atomicity — seed phases inside same transaction as project creation

### Integration Points
- `OnboardingDashboard` props: currently `{ projectId: number }` — no prop changes needed; internal state change only
- `GET /api/projects/[projectId]/onboarding` — response shape changes from `{ phases }` to `{ adr, biggy }`; OnboardingDashboard state updated accordingly
- `overview/page.tsx` — remove completeness imports (`computeCompletenessScore`, `getBannerData`, `TableCounts`) and all tables used only for completeness scoring

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 33-overview-tab-schema-migration-workstream-structure*
*Context gathered: 2026-04-02*
