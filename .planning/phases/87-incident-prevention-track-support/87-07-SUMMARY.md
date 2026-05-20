---
phase: 87-incident-prevention-track-support
plan: 07
subsystem: ui
tags: [react, nextjs, dashboard, onboarding, incident-prevention, recharts, tailwind]

requires:
  - phase: 87-01
    provides: "active_tracks JSONB widened to {adr, biggy, incident_prevention} + 'Incident Prevention' arch_track + Change Risk Console seeded per project"
  - phase: 87-02
    provides: "INCIDENT_PREVENTION_ONBOARDING_CONFIG (4 phases / 13 steps) exported from lib/onboarding-config.ts"

provides:
  - "OnboardingDashboard third column (Incident Prevention) gated on active_tracks.incident_prevention"
  - "GET /api/projects/[projectId]/onboarding now returns {adr, biggy, incident_prevention}"
  - "GET /api/projects/[projectId] now returns active_tracks (so client components can conditionally render IP UI)"
  - "WorkspaceKpiStrip aggregate KPI totals include IP track step/integration/team counts"
  - "OverviewMetrics 'Onboarding Progress' card adds a third violet IP ring (data-testid='ip-ring')"
  - "HealthDashboard adds a third IP health badge (data-testid='ip-health-badge') alongside ADR and Biggy"
  - "Stable ADR → Biggy → Incident Prevention render order across all four dashboard surfaces"

affects: [87-08, 87-05, settings-form]

tech-stack:
  added: []
  patterns:
    - "Client-island parallel-fetch of /api/projects/[projectId] for active_tracks → unlocks conditional rendering in client components that previously took only projectId"
    - "Conditional grid widening: tailwind `${ipActive ? 'md:grid-cols-3' : 'md:grid-cols-2'}` for column-count-driven layouts"
    - "Static-config-derived parallel state: STATIC_IP_TRACKS = INCIDENT_PREVENTION_ONBOARDING_CONFIG.filter(p => p.display_order < 6).map(p => ({name, display_order})) — mirrors STATIC_ADR_TRACKS/STATIC_BIGGY_TRACKS readonly tuples"
    - "Sum-by-track natural zero-fill: when IP is not active for a project, /api/projects/[projectId]/overview-metrics returns no IP rows, so trackSum('incident prevention') naturally returns 0/0 with no special-casing required"

key-files:
  created: []
  modified:
    - "/Users/jmiloslavsky/Documents/Panda-Manager/components/OnboardingDashboard.tsx — parallel ipPhases/rawIpPhases/ipGoLivePhase state, STATIC_IP_TRACKS, IP step/integration/team aggregate counts, IP column in phases grid, IP track section in Integration Tracker, IP ring in sticky header, all gated on active_tracks.incident_prevention"
    - "/Users/jmiloslavsky/Documents/Panda-Manager/app/api/projects/[projectId]/onboarding/route.ts — GET returns incident_prevention key alongside adr and biggy"
    - "/Users/jmiloslavsky/Documents/Panda-Manager/app/api/projects/[projectId]/route.ts — GET select() now includes projects.active_tracks (additive)"
    - "/Users/jmiloslavsky/Documents/Panda-Manager/components/WorkspaceKpiStrip.tsx — ipSteps/ipInteg/ipTeams via sumTrack('incident prevention'); aggregate total/complete include IP"
    - "/Users/jmiloslavsky/Documents/Panda-Manager/components/OverviewMetrics.tsx — activeTracks state + parallel fetch; ipStepCounts/ipIntegCounts/ipTeamCounts; conditional IP ring in Onboarding Progress card"
    - "/Users/jmiloslavsky/Documents/Panda-Manager/components/HealthDashboard.tsx — computeTrackHealth signature widened to 'ADR' | 'Biggy' | 'Incident Prevention'; ipHealth computed; conditional ip-health-badge"

key-decisions:
  - "Parallel-fetch active_tracks in client components rather than thread the prop down from server-component parent — keeps OverviewMetrics/HealthDashboard self-contained, no upstream signature changes"
  - "Reused existing onboarding 'seed' POST contract by adding `seeded.incident_prevention` consumption; deferred legacy seed-route extension to Plan 87-04 (which explicitly owns it)"
  - "Negative placeholder phase IDs offset by -100 for IP tracks (e.g., -101, -103, -105) to prevent collision with ADR (-1, -3, -5) and Biggy (-11, -13, -15) placeholder IDs when the DB has no rows yet"
  - "Integration <select> 'Incident Prevention' option only rendered when `ipActive` — prevents misassignment of integrations to a disabled track from the per-card track dropdown"
  - "Integration label for IP track set to 'Change Risk Data Sources' (vs ADR's 'Integrations' and Biggy's 'IT Knowledge Graph') to match the IP product's data-source category"
  - "Added IP_TYPES = ['ITSM', 'Data Source', 'Write-Back'] for the per-integration type dropdown when track === 'Incident Prevention' — mirrors ADR_TYPES/BIGGY_TYPES grouping"

patterns-established:
  - "Three-track-aware union types: every '|'-union of 'ADR' | 'Biggy' is extended to 'ADR' | 'Biggy' | 'Incident Prevention' uniformly across Integration interface, render fn signatures, addingTeam/newTeamName keyed maps, saveIntegTrack signature, addTeam signature"
  - "Mutation handlers fan out to all three track-keyed state arrays: every setBiggyPhases(prev => ...) gets a matching setIpPhases(prev => ...) immediately below it, and same for Go-Live phases"
  - "Conditional render gate: client components read activeTracks?.incident_prevention === true as the SINGLE gate for all IP UI — missing key/null/false all hide IP cleanly (forward-compatible with Plan 87-01's `{adr:false, biggy:false, incident_prevention:false}` default)"

requirements-completed: [IP-16]

duration: 10min
completed: 2026-05-20
---

# Phase 87 Plan 07: Incident Prevention Dashboard Surfaces Summary

**Third-column Incident Prevention track wired into OnboardingDashboard, WorkspaceKpiStrip, OverviewMetrics, and HealthDashboard with stable ADR → Biggy → Incident Prevention render order and `active_tracks.incident_prevention` as the universal gate.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-20T02:26:57Z
- **Completed:** 2026-05-20T02:36:55Z
- **Tasks:** 2 (both `type="auto"`, both fully green on grep + TS verification)
- **Files modified:** 6 (4 dashboard components + 2 API routes)

## Accomplishments

- OnboardingDashboard 1314 → 1392 LOC: parallel `ipPhases` state + 4 setIpPhases mutation insertions (matching the 4 pre-existing setBiggyPhases callsites exactly), 2 setIpGoLivePhase insertions (matching the 2 setBiggyGoLivePhase callsites), IP integrations/teams filters, IP aggregate counts, IP ring in sticky header, IP column in phases grid, IP track section in Integration Tracker
- API contract widened: `GET /api/projects/[projectId]/onboarding` now returns `{adr, biggy, incident_prevention}`; `GET /api/projects/[projectId]` now includes `active_tracks` in the select() so client components can read it for conditional render
- WorkspaceKpiStrip: aggregate 'Progress' KPI includes IP step/integration/team contributions via `sumTrack('incident prevention')` (case-insensitive); naturally zero-fills when IP is not active
- OverviewMetrics: third violet IP ring in the Onboarding Progress card, gated on parallel-fetched `activeTracks.incident_prevention`
- HealthDashboard: third IP badge gated on `activeTracks.incident_prevention`; `computeTrackHealth` signature widened to accept `'Incident Prevention'`
- All 6 modified files pass `npx tsc --noEmit` with zero new errors

## Task Commits

Each task was committed atomically:

1. **Task 1: OnboardingDashboard + onboarding GET route — full third-column surgery** — `6e248713` (feat)
2. **Task 2: WorkspaceKpiStrip + OverviewMetrics + HealthDashboard — add IP track** — `d5731a63` (feat)

## Files Created/Modified

- `components/OnboardingDashboard.tsx` — Third column (Incident Prevention) wired in with full parity to ADR/Biggy: import for `INCIDENT_PREVENTION_ONBOARDING_CONFIG`, IP state (`ipPhases`, `rawIpPhases`, `ipGoLivePhase`), widened `addingTeam`/`newTeamName` to three-key maps, IP filter derivations (`ipIntegrations`, `ipTeams`), IP aggregate counts (`ipStepsTotal`/`ipIntegTotal`/`ipTeamsTotal`/`ipTotal`/`ipComplete`/`ipPct`), `ipActive` boolean derived from `projectSummary?.active_tracks?.incident_prevention`. Mutation handlers: 4 `setIpPhases(prev => ...)` insertions match 4 pre-existing `setBiggyPhases` callsites (cycleStepStatus + updateStepOwner + submitNote + go-live path); 2 `setIpGoLivePhase` insertions match 2 pre-existing `setBiggyGoLivePhase` callsites. Render: phases grid switches to `md:grid-cols-3` when `ipActive`; new `<section data-testid="incident-prevention-track">` with violet left border; integration tracker section also widens to 3 cols + IP track section; sticky header gains 3rd ProgressRing.
- `app/api/projects/[projectId]/onboarding/route.ts` — Added `incident_prevention` filter on `phasesWithSteps` and included in returned JSON. Before: `{ adr, biggy }`. After: `{ adr, biggy, incident_prevention }`.
- `app/api/projects/[projectId]/route.ts` — Added `active_tracks: projects.active_tracks` to the GET select() to surface the new schema field to clients.
- `components/WorkspaceKpiStrip.tsx` — Added `ipSteps`/`ipInteg`/`ipTeams` via `sumTrack('incident prevention')`; extended `total`/`complete` reducers to include IP contributions.
- `components/OverviewMetrics.tsx` — New `activeTracks` state + `fetchActiveTracks()` parallel call to `/api/projects/[projectId]`; computed `ipStepCounts`/`ipIntegCounts`/`ipTeamCounts`/`ipCompletion`/`ipActive`; third ring (data-testid="ip-ring") with violet label in Onboarding Progress card, gated on `ipActive`.
- `components/HealthDashboard.tsx` — `computeTrackHealth` signature widened to accept `'Incident Prevention'`; new `activeTracks` state + `fetchActiveTracks()`; computed `ipHealth`/`ipActive`; third badge (data-testid="ip-health-badge") gated on `ipActive`.

## Render Conditional Pattern (exact JSX)

The universal IP gate across all four components is:

```tsx
{ipActive && (<JSX>)}
// where:
const ipActive = projectSummary?.active_tracks?.incident_prevention === true
// (or activeTracks?.incident_prevention === true in OverviewMetrics/HealthDashboard,
// which read it from their own client-side fetch of /api/projects/[projectId])
```

Grid-class conditional (OnboardingDashboard phases grid + Integration Tracker grid):

```tsx
className={`... grid grid-cols-1 gap-6 ${ipActive ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}
```

Missing key / null `active_tracks` / `incident_prevention: false` all evaluate to `false` — forward-compatible with Plan 87-01's `{adr:false, biggy:false, incident_prevention:false}` default for new projects.

## setBiggyPhases / setIpPhases Parity

| Mutation                | setBiggyPhases callsites (before) | setIpPhases insertions (after) |
| ----------------------- | --------------------------------- | ------------------------------ |
| `cycleStepStatus`       | 1                                 | 1                              |
| `updateStepOwner`       | 1                                 | 1                              |
| `submitNote`            | 1                                 | 1                              |
| **Total setBiggyPhases**| **4** (`grep -c "setBiggyPhases(" → 4`) | **4** (`grep -c "setIpPhases(" → 4`) |
| `setBiggyGoLivePhase`   | 2                                 | 2 (`setIpGoLivePhase`)         |

(One of the 4 setBiggyPhases callsites is the initial state setter inside the useEffect; same for setIpPhases. Three are in mutation handlers.)

## API Route Shape Change Confirmation

**Before (Plan 87-06 and earlier):**
```json
{ "adr": [...PhaseWithSteps[]], "biggy": [...PhaseWithSteps[]] }
```

**After (Plan 87-07):**
```json
{ "adr": [...PhaseWithSteps[]], "biggy": [...PhaseWithSteps[]], "incident_prevention": [...PhaseWithSteps[]] }
```

Additive change: existing 2-track consumers continue working (TypeScript widening rule). The `incident_prevention` array is naturally empty for projects without IP phases seeded (Plans 87-01 seeds IP arch entities but does NOT seed onboarding phases — that's Plan 87-04's responsibility for new projects + Plan 87-05's for retro-active flips).

## Per-Component Change Log (Task 2)

| Component                  | Vars added                                                                                          | Conditional render gate                       | Color accent |
| -------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------ |
| `WorkspaceKpiStrip.tsx`    | `ipSteps`, `ipInteg`, `ipTeams` (via `sumTrack`)                                                    | Always summed (zero-fill when no IP data)     | n/a (aggregate only) |
| `OverviewMetrics.tsx`      | `activeTracks` state, `ipStepCounts`, `ipIntegCounts`, `ipTeamCounts`, `ipCompletion`, `ipActive`   | `ipActive` (parallel fetch from /api/projects)| violet (text-violet-600 on label) |
| `HealthDashboard.tsx`      | `activeTracks` state, `ipHealth`, `ipActive`                                                        | `ipActive` (parallel fetch from /api/projects)| inherits ragConfig green/yellow/red |

## Decisions Made

- Parallel `/api/projects/[projectId]` fetch in OverviewMetrics + HealthDashboard rather than passing `activeTracks` as a new prop — these components are already client islands with internal fetches, this is the cleanest extension and doesn't touch the parent server component (`app/customer/[id]/overview/page.tsx`).
- Negative placeholder IDs for IP phases offset by `-100` (so `-101`, `-103`, `-105`) — prevents collision with the ADR (`-1`, `-3`, `-5`) and Biggy (`-11`, `-13`, `-15`) placeholder IDs used when DB has no rows.
- `'Change Risk Data Sources'` label chosen for the IP integrations live-card (vs ADR's `'Integrations'` and Biggy's `'IT Knowledge Graph'`) to match the IP product domain.
- `IP_TYPES = ['ITSM', 'Data Source', 'Write-Back']` for the integration-type dropdown when track === 'Incident Prevention' — minimal canonical set; can be extended in future plans.
- `WorkspaceKpiStrip` deliberately does NOT condition IP totals on `active_tracks` — when no IP metric rows exist in the response, the `sumTrack` reducer returns 0/0 naturally. Saves a fetch and matches the "zero-fill" simplification the plan permits.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] API contract widening required to surface `active_tracks` to client components**
- **Found during:** Task 1 (rendering IP column gated on `active_tracks?.incident_prevention`)
- **Issue:** `OnboardingDashboard`, `OverviewMetrics`, and `HealthDashboard` receive only `projectId`, not the project object. The existing `GET /api/projects/[projectId]` SELECT did not include `active_tracks`. Without it, no client surface could read `active_tracks` to gate IP rendering — the plan's conditional rendering rule (`project.active_tracks?.incident_prevention`) was unreachable.
- **Fix:** Extended `app/api/projects/[projectId]/route.ts` GET select() to include `active_tracks: projects.active_tracks` (additive; existing consumers unaffected). Also extended the `ProjectSummary` interface in OnboardingDashboard to include `active_tracks?: {adr; biggy; incident_prevention} | null`. OverviewMetrics + HealthDashboard added parallel `fetchActiveTracks()` calls reading from the same endpoint.
- **Files modified:** `app/api/projects/[projectId]/route.ts`, `components/OnboardingDashboard.tsx`, `components/OverviewMetrics.tsx`, `components/HealthDashboard.tsx`
- **Verification:** `npx tsc --noEmit` clean on all four files; all four greps in Task 1/2 `<verify>` blocks pass.
- **Committed in:** `6e248713` (Task 1) for the API route + OnboardingDashboard, `d5731a63` (Task 2) for OverviewMetrics + HealthDashboard.

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking; API contract widening to surface `active_tracks` to client surfaces).
**Impact on plan:** Necessary for the plan's stated `<interfaces>` conditional rendering rule to work end-to-end. No scope creep — the change is minimal (one new column in one SELECT statement plus one fetch in two components) and purely additive.

## Issues Encountered

**Pre-existing TypeScript error in `app/api/projects/[projectId]/settings/route.ts:39` surfaced during full-repo `tsc --noEmit`:**

```
Argument of type '{ ... active_tracks?: { adr: boolean; biggy: boolean; } ... }' is not assignable to ...
  Property 'incident_prevention' is missing in type '{ adr: boolean; biggy: boolean; }'
  but required in type '{ adr: boolean; biggy: boolean; incident_prevention: boolean; }'.
```

This is **not a regression from Plan 87-07** — Plan 87-01 widened the `projects.active_tracks` schema column, but the Zod schema in `settings/route.ts` still validates only `{adr, biggy}`. Plan 87-05 explicitly owns this fix (its truth list includes "PATCH /api/projects/[projectId]/settings accepts incident_prevention: boolean in active_tracks Zod schema"). Plan 87-07 does NOT touch `settings/route.ts` (not in `files_modified`). Logged to `.planning/phases/87-incident-prevention-track-support/deferred-items.md`. Will resolve when Plan 87-05 ships.

**Pre-existing RED tests in `tests/sync/active-blockers.test.tsx` (4 failures) and `tests/overview/metrics-health.test.ts` (2 failures):**

These tests assert features not yet built ("HealthDashboard currently shows a count, not a task list", `computeOverallHealth` with `adrCompletion` arg that the function doesn't accept). They are gitignored on-disk RED stubs (per [79-00] decision). Verified pre-existing by inspecting test source — explicit "This will FAIL because [feature] doesn't exist yet" comments. Not regressions from Plan 87-07. Out of scope.

## Visual Verification

**Acknowledged: visual verification deferred to Plan 87-08** (the dedicated human-verify checkpoint for IP-16 and the full Phase 87 surface review). Plan 87-07 verification is grep-based + TypeScript build only, per the plan's `<behavior>` clause ("No dedicated automated test for OnboardingDashboard layout — IP-16 is the human-verify checkpoint in Plan 08. Automated verification here is TypeScript build + grep that key patterns are present.").

Regression-test sweep across affected test files passed: 14/14 in `tests/overview/track-separation.test.tsx + integration-tracker.test.ts + timeline-replacement.test.ts` (all OnboardingDashboard-touching). No new failures from Plan 87-07 commits.

## Next Phase Readiness

- Plan 87-08 (human-verify checkpoint) can now exercise the full three-track UX: project with `active_tracks.incident_prevention=true` should render 3 columns in OnboardingDashboard, 3 rings in OverviewMetrics, 3 badges in HealthDashboard, and IP step/integration/team counts contributing to the WorkspaceKpiStrip Progress KPI.
- Plan 87-05 still needs to fix `app/api/projects/[projectId]/settings/route.ts` Zod schema (separate scope, owned by 87-05).
- Combined Phase 87 automated test status: IP-03, IP-04, IP-05, IP-10, IP-11, IP-12, IP-13, IP-14 GREEN. IP-06/07/08/09 RED pending Plan 87-04/87-05. IP-16 deferred to Plan 87-08 human verify.

---
*Phase: 87-incident-prevention-track-support*
*Completed: 2026-05-20*

## Self-Check: PASSED

All claimed files exist on disk; both task commits (`6e248713`, `d5731a63`) found in `git log --all`; SUMMARY.md persisted.
