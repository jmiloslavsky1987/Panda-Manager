---
phase: 87-incident-prevention-track-support
plan: 03
subsystem: project-seeding

tags: [seed-project, team-onboarding, drizzle, active-tracks, incident-prevention, tdd]

# Dependency graph
requires:
  - phase: 87-incident-prevention-track-support (Plan 01)
    provides: active_tracks JSONB key + widened TypeScript type — required to type-narrow project.active_tracks safely in seed-project.ts
  - phase: 87-incident-prevention-track-support (Plan 00)
    provides: IP-10 + IP-11 Wave 0 RED tests in tests/ui/seed-project.test.ts (mock-introspection pattern for Team Gamma payload)
provides:
  - lib/seed-project.ts now reads project.active_tracks and inserts each team placeholder conditionally (0/1/2/3 teams)
  - Team Gamma / track='Incident Prevention' template row inserted whenever active_tracks.incident_prevention === true
  - All three team inserts (Alpha/ADR, Beta/Biggy, Gamma/IP) are now conditional — no more unconditional ADR+Biggy seed
affects:
  - 87-04 (project-create wizard / POST route) — relies on this behavior when seeded:false projects opt into a track subset
  - 87-05 (Settings PATCH retroactive seeding) — separate code path; seedIncidentPreventionForProject helper handles false→true toggle for already-seeded projects (this plan stays scoped to seeded:false only)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Filter-Boolean conditional row build: `[cond1 && row1, cond2 && row2, ...].filter(Boolean) as InferInsert[]` — clean alternative to push() loops; preserves Drizzle types via post-filter cast"
    - "Guard `if (rows.length > 0) db.insert().values(rows)` — Drizzle's .values() rejects empty arrays; required when row count is dynamic"
    - "Track-conditional template seeding driven by project.active_tracks at seed time (Phase 87 pattern) — generalizable to any future per-track placeholder seeding"

key-files:
  created: []
  modified:
    - "lib/seed-project.ts (lines 10–16 and 95–112 — 19 insertions, 6 deletions; net ~13 LOC added)"

key-decisions:
  - "Read project.active_tracks via the existing findFirst — added `active_tracks: true` to the columns selector (was only `seeded: true`). Single query, no extra DB round trip."
  - "Default fallback is `{ adr: false, biggy: false, incident_prevention: false }` — matches Plan 01's new schema default. Any project row with NULL active_tracks (shouldn't exist post-migration but defensive) seeds zero teams, which is observable rather than silently inserting a default 2-team set."
  - "filter(Boolean) + `as typeof teamOnboardingStatus.$inferInsert[]` cast — TypeScript cannot narrow `(false | InferInsert)[]` to `InferInsert[]` via filter() without the explicit cast. Pattern matches the one shown in RESEARCH.md's code example block."
  - "Did NOT extract a `seedTeamPlaceholders(projectId, tracks, tx)` helper — keeps Plan 03 scope minimal (~10 LOC change as plan specified). The retroactive seeding path (Plan 05) will own its own helper at that time."
  - "Did NOT touch the existing test fixtures in `tests/ui/seed-project.test.ts` — the 5 pre-existing tests use `mockFindFirst.mockResolvedValue({ seeded: false })` with no active_tracks key; the falsy-default fallback now means those tests see all-false tracks → zero team inserts, which the existing assertions don't check (they only assert `mockInsert.mock.calls.length > 1`, satisfied by actions/risks/milestones/etc.)"

patterns-established:
  - "Pattern: track-conditional template row build via `[cond && row, ...].filter(Boolean)` — adopt for any future seed-project additions that need to gate inserts on active_tracks"
  - "Pattern: extend findFirst columns selector additively when a downstream change needs more project fields — avoids a second DB query"

requirements-completed: [IP-10, IP-11]

# Metrics
duration: ~6min
completed: 2026-05-20
---

# Phase 87 Plan 03: seed-project.ts Track-Conditional Team Seeding Summary

**`lib/seed-project.ts` now reads `project.active_tracks` and inserts each team placeholder row (Alpha/ADR, Beta/Biggy, Gamma/Incident Prevention) only when the corresponding track is true. Zero-track-active projects now seed zero team rows instead of a hardcoded 2-row Alpha+Beta insert.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-20T02:21Z
- **Completed:** 2026-05-20T02:27Z
- **Tasks:** 1/1 complete
- **Files modified:** 1 (`lib/seed-project.ts`)
- **Commits:** 1 task commit (`aa487f53`) + 1 metadata commit (planning side)

## Accomplishments

- Made all three team placeholder inserts conditional on `active_tracks[trackKey] === true` — wizard-driven track selection (Plan 87-04) now flows through to a precisely matched team-row set at creation time.
- Added `Team Gamma` / `track='Incident Prevention'` placeholder row, conditional on `active_tracks.incident_prevention`.
- `IP-10` (Gamma row inserted when incident_prevention is true) and `IP-11` (no Gamma row when incident_prevention is false) flipped from RED → GREEN. All 7 tests in `tests/ui/seed-project.test.ts` now pass.
- Type-safe — `npx tsc --noEmit` clean for `lib/seed-project.ts` (no new errors introduced).

## Task Commits

1. **Task 1: Convert teamOnboardingStatus insert to track-conditional** — `aa487f53` (feat) — pushed to `origin/main`

## Code Block: Before / After

**Before** (`lib/seed-project.ts` lines 95–99, unconditional 2-team insert):

```typescript
// --- teams tab — insert placeholder teamOnboardingStatus rows (one per track) ---
await db.insert(teamOnboardingStatus).values([
  { project_id: projectId, team_name: 'Team Alpha', track: 'ADR',   source: 'template' },
  { project_id: projectId, team_name: 'Team Beta',  track: 'Biggy', source: 'template' },
])
```

**After** (lines 95–112, track-conditional 0/1/2/3-team insert):

```typescript
// --- teams tab — insert placeholder teamOnboardingStatus rows (one per ACTIVE track) ---
// Phase 87: All three placeholder team inserts (Alpha/ADR, Beta/Biggy, Gamma/Incident Prevention)
// are now conditional on active_tracks[trackKey] === true. Honors the wizard-driven track-selection
// rule (Plan 87-04) that a project may have only 1-3 tracks active at creation time. The seeded:false
// gate above keeps this fully scoped to initial creation — Plan 87-05 owns retroactive seeding
// for false→true Settings toggles via the dedicated seedIncidentPreventionForProject helper.
const tracks = (project.active_tracks as { adr: boolean; biggy: boolean; incident_prevention: boolean } | null)
  ?? { adr: false, biggy: false, incident_prevention: false }

const teamRows = [
  tracks.adr                 && { project_id: projectId, team_name: 'Team Alpha', track: 'ADR',                  source: 'template' as const },
  tracks.biggy               && { project_id: projectId, team_name: 'Team Beta',  track: 'Biggy',                source: 'template' as const },
  tracks.incident_prevention && { project_id: projectId, team_name: 'Team Gamma', track: 'Incident Prevention', source: 'template' as const },
].filter(Boolean) as typeof teamOnboardingStatus.$inferInsert[]

if (teamRows.length > 0) {
  await db.insert(teamOnboardingStatus).values(teamRows)
}
```

**Required `findFirst` selector widening** (line 14):

```typescript
// Before
columns: { seeded: true },
// After
columns: { seeded: true, active_tracks: true },
```

## Confirmation: All Three Inserts Are Conditional

| Team       | Track                 | Previous behavior              | New behavior                                                 |
| ---------- | --------------------- | ------------------------------ | ------------------------------------------------------------ |
| Team Alpha | ADR                   | Always inserted (hardcoded)    | Conditional on `active_tracks.adr === true`                  |
| Team Beta  | Biggy                 | Always inserted (hardcoded)    | Conditional on `active_tracks.biggy === true`                |
| Team Gamma | Incident Prevention   | Did not exist                  | Conditional on `active_tracks.incident_prevention === true`  |

All three rows are gated symmetrically. Plan 03 reaches the "all three conditional" goal from CONTEXT.md without introducing new helpers.

## Test Fixture Update Audit

**None required.** Despite the plan's note ("If existing test cases relied on the default `{adr:true, biggy:true}` shape ..."), the existing 5 tests in `tests/ui/seed-project.test.ts` mock `findFirst` to return `{ seeded: false }` only — they never set `active_tracks`. With the new code:

- `project.active_tracks` is `undefined`
- The `?? { adr: false, biggy: false, incident_prevention: false }` fallback applies
- `teamRows.length === 0` → `db.insert(teamOnboardingStatus)` is never called

The existing 5 tests only assert `mockInsert.mock.calls.length > 1` (satisfied by actions/risks/milestones/decisions/history/stakeholders/businessOutcomes inserts) and `mockInsert.mock.results[0].value.values).toBeDefined()` (still true — the first insert is `actions`, not teams). So zero team inserts is invisible to them and they all still pass. Confirmed by running the full file: **7/7 GREEN.**

The two new tests (IP-10 and IP-11) explicitly mock `active_tracks` with the relevant shape:

- IP-10: `active_tracks: { adr: false, biggy: false, incident_prevention: true }` → expects 1 row (Gamma)
- IP-11: `active_tracks: { adr: true, biggy: true, incident_prevention: false }` → expects 0 Gamma rows (Alpha + Beta only)

Both pass on the new code.

## Retroactive Seeding: Deliberately Out of Scope

This plan does **NOT** address the false→true Settings toggle path. That code path:

- Runs after `seeded:true` is already set on the project row
- `seedProjectFromRegistry` short-circuits on the `if (!project || project.seeded) return` line and never reaches the team-insert block
- Therefore changes to the team-insert block here have **zero effect** on existing projects whose users later toggle `incident_prevention: false → true` in Settings

The retroactive case is owned by Plan 87-05, which introduces a dedicated `seedIncidentPreventionForProject(tx, projectId)` helper called inline from the Settings PATCH handler with idempotent `WHERE NOT EXISTS` guards on every insert. Keeping the two paths separate keeps each idempotency model focused:

- **Plan 03 (`seedProjectFromRegistry`)**: gated by `projects.seeded === false` flag — coarse but correct for initial creation
- **Plan 05 (`seedIncidentPreventionForProject`)**: gated by `WHERE NOT EXISTS` per insert — fine-grained, supports retroactive enablement

## Verification

| Check | Result |
|-------|--------|
| `grep -q 'Team Gamma' lib/seed-project.ts` | FOUND |
| `grep -q 'tracks.incident_prevention' lib/seed-project.ts` | FOUND |
| `grep -q 'tracks.adr.*Team Alpha' lib/seed-project.ts` | FOUND |
| `npx vitest run tests/ui/seed-project.test.ts` | 7/7 GREEN |
| `npx tsc --noEmit 2>&1 \| grep 'seed-project'` | empty (no new errors) |
| Plan automated verification command | All conditions satisfied |

## Decisions Made

- **Read active_tracks via the existing findFirst** — added `active_tracks: true` to the columns selector. One query, no extra round trip.
- **Default fallback to all-false** — matches Plan 01's new schema default. A NULL `active_tracks` (defensively handled) seeds zero teams rather than a hardcoded 2-row set. Observable correctness > silent legacy behavior.
- **filter-Boolean array pattern** — clean dynamic row build with a single TypeScript cast at the boundary; matches the RESEARCH.md template byte-for-byte.
- **No helper extraction** — kept Plan 03 to its specified ~10 LOC delta. Retroactive-seeding helper is Plan 05's scope.
- **No test fixture updates** — pre-existing tests don't assert team-row presence, so they continue to pass without any mock changes.

## Deviations from Plan

None — plan executed exactly as written. The "test fixture update (if any)" item resolved to "none required" after auditing the existing assertions; documented above.

## Issues Encountered

- **Pre-existing modified file in working tree:** none in this session (clean `git status` after Plan 02 commit `51a73da3`).
- **TypeScript errors outside seed-project.ts:** the project has known pre-existing peer-dep type noise in `node_modules/drizzle-orm` (gel-core, mysql-core, neon-http) unrelated to this plan; `grep 'seed-project'` correctly filtered to confirm zero seed-project.ts errors.

## Next Phase Readiness

**Plan 87-04 (project-create wizard + POST route)** unblocked:
- Can now POST a project with any `active_tracks` shape and the team placeholder rows will match the selection exactly.
- The ≥1-track wizard guard is the only thing preventing zero-team projects from being created via the wizard — the team-insert code itself now safely handles the zero-team case via `if (teamRows.length > 0)`.

**Plan 87-05 (Settings PATCH retroactive seeding)** unblocked:
- Its dedicated `seedIncidentPreventionForProject` helper has clean separation of concerns — `seedProjectFromRegistry` is fully owned by initial creation only.

## Self-Check

Verifying claims before state updates:

- `lib/seed-project.ts:14` — FOUND `columns: { seeded: true, active_tracks: true }`
- `lib/seed-project.ts:95–112` — FOUND track-conditional `teamRows` build + `if (teamRows.length > 0)` guard
- `lib/seed-project.ts` contains 'Team Gamma' — FOUND
- `lib/seed-project.ts` contains 'tracks.incident_prevention' — FOUND
- `lib/seed-project.ts` contains 'tracks.adr' and 'Team Alpha' on same line — FOUND
- Commit `aa487f53` — FOUND in `git log` (pushed: `51a73da3..aa487f53  main -> main`)
- `tests/ui/seed-project.test.ts` — 7/7 GREEN
- `npx tsc --noEmit | grep 'seed-project'` — empty
- Plan automated `<verify>` command — all conditions satisfied

## Self-Check: PASSED

---
*Phase: 87-incident-prevention-track-support*
*Plan: 03*
*Completed: 2026-05-20*
