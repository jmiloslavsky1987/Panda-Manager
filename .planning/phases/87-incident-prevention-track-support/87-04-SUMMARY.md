---
phase: 87-incident-prevention-track-support
plan: 04
subsystem: api
tags: [next-route, drizzle, wizard, active_tracks, idempotent-seeding, incident-prevention]

# Dependency graph
requires:
  - phase: 87-01
    provides: "active_tracks JSONB widened to {adr, biggy, incident_prevention} + migration 0052 IP arch seed (this plan reads/writes the new key)"
  - phase: 87-02
    provides: "INCIDENT_PREVENTION_ONBOARDING_CONFIG export from lib/onboarding-config.ts (imported by both the helper and the legacy onboarding/seed route)"
provides:
  - "lib/seed-incident-prevention.ts — shared idempotent seeder exporting seedIncidentPreventionForProject(tx, projectId); used by POST /api/projects today and PATCH /api/projects/[id]/settings in Plan 87-05"
  - "POST /api/projects with active_tracks contract — accepts {adr, biggy, incident_prevention}; rejects all-false (400); gates every seeding block (onboarding phases/steps, WBS L1/L2, arch tracks/nodes) on the selected tracks"
  - "Legacy POST /api/projects/[projectId]/onboarding/seed extended to include Incident Prevention as a third track (idempotent, no active_tracks gate per RESEARCH.md note)"
  - "components/wizard/BasicInfoStep.tsx track-selection block — three checkboxes (ADR / Biggy / Incident Prevention), all default OFF, Submit disabled until ≥1 checked"
affects: [87-05, 87-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared idempotent seeder helper extracted before second consumer exists (DRY for Plan 87-05 retroactive seeding)"
    - "Idempotency choice per table: onConflictDoNothing when a unique index covers the natural key tuple (arch_nodes has arch_nodes_project_track_name_idx); select-then-insert when no unique index exists (onboarding_phases, onboarding_steps, wbs_items, team_onboarding_status, arch_tracks)"
    - "active_tracks gating pattern — every track-specific insert wrapped in `if (tracks[trackKey])` block within the existing db.transaction; teamEngagementSections + project_members + scheduled jobs stay unconditional (project-wide foundations)"
    - "Backward-compatible body schema — missing active_tracks falls back to {adr:true, biggy:true, incident_prevention:false} to preserve pre-Phase-87 callers"

key-files:
  created:
    - lib/seed-incident-prevention.ts
  modified:
    - app/api/projects/route.ts
    - app/api/projects/[projectId]/onboarding/seed/route.ts
    - components/wizard/BasicInfoStep.tsx

key-decisions:
  - "BasicInfoStep.tsx is the canonical new-project form (resolves the RESEARCH.md Wizard Architecture open question — the test scaffold listed three candidates, only BasicInfoStep is the actual POSTer)"
  - "arch_nodes use onConflictDoNothing-then-fetch-id pattern instead of select-then-insert because the schema HAS a unique index on (project_id, track_id, name); other tables (onboarding_*, wbs_items, team_onboarding_status, arch_tracks) use select-then-insert because they lack a unique index"
  - "AI Assistant Track arch seed gated on tracks.biggy (NOT incident_prevention) — per Phase 83 the AI Assistant Track is Biggy's arch surface; renaming would be a behavior change out of Plan 04 scope"
  - "Legacy onboarding/seed POST route does NOT gate on active_tracks — it's a manual re-seed admin tool, idempotent by onConflictDoNothing; this matches the RESEARCH.md note explicitly"

patterns-established:
  - "Track-conditional seeding pattern: `if (tracks[trackKey]) { ... }` around every block of inserts that produces track-specific rows. Use everywhere active_tracks is consulted at write time."
  - "Helper-then-route extraction: extract the shared seeder before the second consumer exists when the second consumer is the next plan (write once, use twice)."
  - "Wizard checkbox group with disable-when-none validation: native input[type=checkbox] inside a fieldset, with submit `disabled={loading || !atLeastOneTrack}` and a defense-in-depth runtime guard inside handleSubmit."

requirements-completed: [IP-06, IP-07]

# Metrics
duration: 6min
completed: 2026-05-20
---

# Phase 87 Plan 04: Project-Create Track Selection Summary

**POST /api/projects accepts active_tracks, gates ADR/Biggy/IP seeding per track; new shared `seedIncidentPreventionForProject` helper for both POST + Plan 05 PATCH; BasicInfoStep wizard adds three track checkboxes with ≥1 validation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-20T02:26:37Z
- **Completed:** 2026-05-20T02:32:55Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 edited)

## Accomplishments

- New shared idempotent helper `lib/seed-incident-prevention.ts` (305 LOC) covering arch track + 3 sections + Change Risk Console + 13 sub-cap nodes + 10 WBS L1 + 33 WBS L2 + 4 onboarding phases + 13 onboarding steps + Team Gamma row. Re-callable safely from Plan 87-05's settings PATCH retroactive-seed path.
- POST /api/projects refactored from "unconditional ADR+Biggy seed" to "active_tracks-gated seed with explicit IP support". Body schema widened (with legacy fallback); 400 when all tracks false; project row now persists the wizard's track selection.
- BasicInfoStep.tsx wizard form renders three checkbox controls in order ADR → Biggy → Incident Prevention, all default OFF, with Submit disabled until ≥1 is checked. POST body includes `active_tracks: {adr, biggy, incident_prevention}`.
- Legacy `POST /api/projects/[projectId]/onboarding/seed` route now also seeds Incident Prevention phases + steps (third `seedTrack(...)` call); response shape gained `incident_prevention` key alongside `adr`/`biggy`.
- IP-04, IP-05, IP-06, IP-07 GREEN (20/20 tests across tests/api/projects.test.ts + tests/ui/onboarding-config.test.ts). IP-09 GREEN (helper file passes idempotency-guard contract).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lib/seed-incident-prevention.ts shared idempotent helper** — `4d69d093` (feat)
2. **Task 2: Wire POST /api/projects + onboarding/seed route + BasicInfoStep UI** — `29e4e6b8` (feat)

## Files Created/Modified

- `lib/seed-incident-prevention.ts` (CREATED, 305 LOC) — Exports `seedIncidentPreventionForProject(tx, projectId)`. Idempotent across all 8 inserted entity classes. Imports `INCIDENT_PREVENTION_ONBOARDING_CONFIG` from Plan 87-02.
- `app/api/projects/route.ts` (MODIFIED, +148 / −96) — Body schema accepts active_tracks; 400 on all-false; project row persists active_tracks; ADR + Biggy + IP seeding now gated on tracks[trackKey]; IP helper called inside the existing db.transaction.
- `app/api/projects/[projectId]/onboarding/seed/route.ts` (MODIFIED, +6 / −1) — Imports INCIDENT_PREVENTION_ONBOARDING_CONFIG; third seedTrack(...) call for 'Incident Prevention' track; response shape gains incident_prevention key.
- `components/wizard/BasicInfoStep.tsx` (MODIFIED, +73 / −5) — Three checkbox state vars (adrChecked / biggyChecked / ipChecked, all default false); fieldset render block with ≥1 validation message; Submit disabled when !atLeastOneTrack; POST body includes active_tracks payload.

## Sample POST body (new active_tracks contract)

```json
{
  "name": "ACME Q3 Implementation",
  "customer": "ACME Corp",
  "status": "draft",
  "start_date": "2026-06-01",
  "end_date": "2026-12-31",
  "description": "Change-risk prediction rollout with ADR co-purchase",
  "active_tracks": {
    "adr": true,
    "biggy": false,
    "incident_prevention": true
  }
}
```

A request with `{ "adr": false, "biggy": false, "incident_prevention": false }` returns HTTP 400 with `{"error":"At least one track (adr, biggy, or incident_prevention) must be selected"}`.

## Track-gate audit — which inserts moved inside which conditional

| Insert block                                        | Conditional                          |
| --------------------------------------------------- | ------------------------------------ |
| onboardingPhases (ADR — 6 rows)                     | `if (tracks.adr)`                    |
| onboardingPhases (Biggy — 6 rows)                   | `if (tracks.biggy)`                  |
| onboardingSteps (ADR — seedSteps call)              | `if (tracks.adr)`                    |
| onboardingSteps (Biggy — seedSteps call)            | `if (tracks.biggy)`                  |
| wbsItems (ADR L1 — 10 rows) + (ADR L2 — 25 rows)    | `if (tracks.adr)`                    |
| wbsItems (Biggy L1 — 5 rows) + (Biggy L2 — 9 rows)  | `if (tracks.biggy)`                  |
| archTracks + archNodes (ADR — 1 track, 16 nodes)    | `if (tracks.adr)`                    |
| archTracks + archNodes (AI Assistant — 1+5)         | `if (tracks.biggy)`                  |
| seedIncidentPreventionForProject(tx, id) full surf. | `if (tracks.incident_prevention)`    |
| teamEngagementSections (5 rows)                     | unconditional (project-wide)         |
| projectMembers (creator as admin)                   | unconditional (project-wide)         |
| scheduled_jobs weekly-focus (post-transaction)      | unconditional (project-wide)         |

## Idempotency guard audit (Task 1)

| Table                  | Guard strategy                                            | Why                                                                  |
| ---------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| arch_tracks            | select-then-insert on (project_id, name)                  | No unique idx covers this tuple                                       |
| arch_nodes             | onConflictDoNothing then fetch existing id                | uniqueIndex arch_nodes_project_track_name_idx covers (project_id, track_id, name) |
| wbs_items              | select-then-insert on (project_id, track, parent_id, name)| No unique idx                                                         |
| onboarding_phases      | select-then-insert on (project_id, track, name)           | No unique idx                                                         |
| onboarding_steps       | select-then-insert on (phase_id, name)                    | No unique idx                                                         |
| team_onboarding_status | select-then-insert on (project_id, team_name, track)      | No unique idx                                                         |

Re-calling the helper for the same project produces zero new rows across all 8 entity classes.

## Decisions Made

- **BasicInfoStep.tsx is the wizard form** (not NewProjectModal which doesn't exist; not NewProjectButton which only opens the ProjectWizard). Located by reading the IP-07 test scaffold's candidate list and confirming via direct file inspection — BasicInfoStep contains the actual `fetch('/api/projects', { method: 'POST' })` call. RESEARCH.md's "Project-Create Wizard Architecture" open question is resolved.
- **AI Assistant Track gated on `tracks.biggy`, not on `tracks.incident_prevention`** — per Phase 83, the AI Assistant Track IS Biggy's arch surface (the "Biggy" product is the AI persona, the "AI Assistant" is the arch-diagram name). Renaming this in Plan 04 would be a UX migration out of scope.
- **Legacy onboarding/seed route does NOT gate on active_tracks** — it's an admin re-seed tool, idempotent via onConflictDoNothing; gating would silently break legacy re-seed flows that don't pass active_tracks. The route now seeds all three tracks unconditionally; render-layer filters in OnboardingDashboard handle visibility.
- **Backward-compatible POST body** — when active_tracks is missing entirely, default to `{adr:true, biggy:true, incident_prevention:false}` to preserve the pre-Phase-87 behavior. The new wizard always passes active_tracks explicitly. Tests in other phases that call POST /api/projects without active_tracks continue to work.

## TypeScript breakages encountered

None. Plan 87-01 widened the `db/schema.ts:114` `active_tracks` type to `{ adr: boolean; biggy: boolean; incident_prevention: boolean }` with a matching default. The POST handler in this plan passes a `tracks: ActiveTracks` value with the same shape — no inference or assignment friction. `npx tsc --noEmit -p tsconfig.json` is clean across all four touched files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Defense-in-depth submit guard inside handleSubmit**
- **Found during:** Task 2 (BasicInfoStep wiring)
- **Issue:** The plan specified `disabled={!atLeastOneTrack}` on the button, but a malicious or buggy caller could still trigger handleSubmit (button.click() via JS, form submission via Enter on a focused checkbox even when button is disabled in some browsers). Without a runtime guard inside handleSubmit, a stale state could submit an all-false POST that gets rejected with 400 and a confusing UX.
- **Fix:** Added `if (!atLeastOneTrack) { setError('Select at least one track before continuing.'); return; }` immediately after field validation in handleSubmit. The 400 server response is now the third layer of defense, not the first.
- **Files modified:** components/wizard/BasicInfoStep.tsx
- **Verification:** IP-07 regex still GREEN (the regex matches `disabled=` on the Submit attribute); manual reasoning confirms no false-submit path.
- **Committed in:** 29e4e6b8 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Response shape extension on onboarding/seed**
- **Found during:** Task 2 (Step B)
- **Issue:** The legacy onboarding/seed route returns `{ adr, biggy }`. Adding a third `seedTrack(...)` call without updating the response shape would silently leak the seeded IP rows from the API surface — the UI's OnboardingDashboard would see the new phases on the next page refresh but not from this route's response.
- **Fix:** Added `incident_prevention: phasesWithSteps.filter(p => p.track === 'Incident Prevention')` to the grouped response.
- **Files modified:** app/api/projects/[projectId]/onboarding/seed/route.ts
- **Verification:** Manual JSON shape inspection; no callers exist yet that consume the new field (admin UI hasn't been wired in Plan 04 — Plan 08 will smoke-test the full route via browser).
- **Committed in:** 29e4e6b8 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 2 — Missing Critical)
**Impact on plan:** Both auto-fixes prevent silent UX/API gaps. No scope creep; both touch only files already in this plan's `files_modified` set.

## Issues Encountered

- **Parallel-agent file collisions during commit:** While my Plan 04 work was in progress, parallel agents were running Plans 03, 06, 07 concurrently. The working tree showed uncommitted changes from `lib/seed-project.ts` (Plan 03), `app/api/projects/[projectId]/onboarding/route.ts` (Plan 06), `app/api/projects/[projectId]/route.ts` (Plan 06), `components/OnboardingDashboard.tsx` (Plan 06), `components/arch/InteractiveArchGraph.tsx` (Plan 06). Resolved by staging only my own files explicitly (`git add lib/seed-incident-prevention.ts` then `git add` of the three Plan 04 files) — never used `git add .` or `git add -A`. Both Plan 04 commits (4d69d093, 29e4e6b8) contain only Plan 04's intended diffs.

## User Setup Required

None - no external service configuration required. The new active_tracks contract is fully self-contained; existing projects retain their active_tracks values verbatim (Plan 87-01's additive JSONB backfill).

## Next Phase Readiness

- **Plan 87-05** can now import `seedIncidentPreventionForProject` from `@/lib/seed-incident-prevention` and call it inside its settings PATCH transaction when `tracks.incident_prevention` flips false → true. The helper is fully idempotent — Plan 05 only needs to wire the diff-detection and call site.
- **Plan 87-08** browser smoke test should cover: (1) wizard renders three checkboxes; (2) Submit disabled when all three off; (3) selecting only Incident Prevention creates a project with ONLY the IP arch/WBS/onboarding rows (no ADR/Biggy noise); (4) selecting all three creates the full union.
- **No blockers.** IP-08 in tests/api/project-settings.test.ts remains RED — that's Plan 05's contract, not a regression.

## Self-Check

- **lib/seed-incident-prevention.ts** — FOUND (305 LOC)
- **app/api/projects/route.ts** — FOUND (378 LOC, modified)
- **app/api/projects/[projectId]/onboarding/seed/route.ts** — FOUND (140 LOC, modified)
- **components/wizard/BasicInfoStep.tsx** — FOUND (293 LOC, modified)
- **Commit 4d69d093** — FOUND (Task 1)
- **Commit 29e4e6b8** — FOUND (Task 2)
- **IP-04 + IP-05 + IP-06 + IP-07** — GREEN (20/20)
- **IP-09 (helper idempotency contract)** — GREEN
- **TypeScript clean** — `npx tsc --noEmit -p tsconfig.json` produces zero errors in the four touched files

## Self-Check: PASSED

---
*Phase: 87-incident-prevention-track-support*
*Completed: 2026-05-20*
