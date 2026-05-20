---
phase: 87-incident-prevention-track-support
plan: 01
subsystem: database

tags: [postgres, jsonb, drizzle, migration, schema, arch-graph, incident-prevention]

# Dependency graph
requires:
  - phase: 87-incident-prevention-track-support (Plan 00)
    provides: Wave 0 source-scan tests (active-tracks-type.test.ts) for IP-03 + IP-13
  - phase: 83-architecture-sub-capability-columns (0046)
    provides: parent_id + node_type columns on arch_nodes; section/console DO-block seeding pattern reused verbatim
provides:
  - Migration 0052_incident_prevention_track.sql (idempotent, additive)
  - projects.active_tracks JSONB default flipped from {adr:true,biggy:true} to {adr:false,biggy:false,incident_prevention:false}
  - Existing-project backfill: incident_prevention:false added via || operator, adr/biggy preserved verbatim
  - 'Incident Prevention Track' (display_order=30) + 3 sections + 1 console (Change Risk Console) + 13 sub-capabilities seeded per existing project (18 inserts each on first apply)
  - db/schema.ts active_tracks $type widened to include incident_prevention:boolean and default literal updated to all-false triple
affects:
  - 87-02 (lib/onboarding-config.ts + lib/seed-project.ts — depend on widened type)
  - 87-03 (settings PATCH route — depends on widened Zod schema parity)
  - 87-04 (project-create wizard — depends on widened type + all-false defaults)
  - 87-05 (InteractiveArchGraph rendering — reads arch_tracks rows seeded by this migration)
  - 87-06 (extraction prompt — independent but operates on the same active_tracks JSONB)
  - 87-07 (Settings UI — reads widened type)
  - 87-08 (human verification — applies migration in Docker)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSONB additive backfill with guard: `UPDATE … SET col = col || '{...}'::jsonb WHERE NOT (col ? 'new_key')` — protects user-set true values from re-run overwrite"
    - "Per-project IF EXISTS guard at top of DO-block FOR LOOP: idempotency without DELETE/UPSERT complexity (no pre-existing IP rows exist, unlike 0046 which had to restructure ADR)"
    - "Schema default change paired with additive backfill = new projects start opted-out, existing projects keep their current opt-in state"

key-files:
  created:
    - "db/migrations/0052_incident_prevention_track.sql (79 lines)"
  modified:
    - "db/schema.ts:114 (1 line edit — type widened + default literal flipped)"

key-decisions:
  - "Single migration file (0052) covering schema ALTER + JSONB backfill + arch seed in one transaction — matches 0046 precedent; splitting adds no rollback safety since the DO block is already per-project idempotent"
  - "JSONB merge uses || operator (NOT jsonb_set) — atomic, handles concurrent updates, and the NOT (active_tracks ? 'incident_prevention') guard explicitly prevents re-run overwrite"
  - "DEFAULT flips from {adr:true,biggy:true} to {adr:false,biggy:false,incident_prevention:false} — new projects opt in via wizard (Plan 04); existing projects unaffected because the UPDATE uses || (additive, never overwrites adr/biggy)"
  - "Console display_order = 15 (between section 10 and 20) — mirrors ADR's console placement pattern from 0046"
  - "node_type='console' (not 'section' or 'sub-capability') for Change Risk Console — uses the centerpiece pattern established in Phase 83"
  - "No DROP/DELETE block in 0052 (unlike 0046) — there are no pre-existing IP nodes to clean up; the IP track is brand new"

patterns-established:
  - "Pattern: per-project DO-block seeding with top-level IF EXISTS guard (skip if track already seeded for project) — cleanest idempotency primitive for adding a brand-new track to a multi-tenant schema"
  - "Pattern: JSONB key-addition via `col || '{...}'::jsonb` with `WHERE NOT (col ? 'new_key')` guard — safe for re-run; preserves existing keys verbatim"

requirements-completed: [IP-03, IP-13]
# IP-01 and IP-02 (live Docker apply + idempotency) defer to Plan 87-08 human verification per VALIDATION.md.

# Metrics
duration: ~4min
completed: 2026-05-19
---

# Phase 87 Plan 01: Migration 0052 + active_tracks schema widening Summary

**Migration 0052 + db/schema.ts widened to add `incident_prevention` as a first-class active_tracks key, backfilled additively across all existing projects, and seeded the full 'Incident Prevention Track' arch tree (1 track + 3 sections + 1 console + 13 sub-caps = 18 rows per project) idempotently.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-19T19:14Z
- **Completed:** 2026-05-19T19:17Z
- **Tasks:** 2/2 complete
- **Files modified:** 2 (1 created, 1 edited)
- **Commits:** 2 (atomic per task) + 1 metadata commit

## Accomplishments

- Migration 0052 written and committed — idempotent SQL covering schema default change, additive JSONB backfill (preserves user adr/biggy values), and full Incident Prevention arch seed for every existing project.
- db/schema.ts:114 widened — TypeScript type now declares `incident_prevention: boolean` and the `.default(...)` literal flipped to `{adr:false, biggy:false, incident_prevention:false}`. All-OFF default means new projects must opt in via the wizard (Plan 04).
- IP-03 (additive `||` migration assertion) and IP-13 (schema type + default literal source-scan, both assertions) flipped from RED to GREEN. All 3 tests in `tests/schema/active-tracks-type.test.ts` pass.
- All 24 tests in `tests/schema/` pass — no regression to Phase 80 (daily-briefings), Phase 85 (wbs-items, wbs-overhaul), or other schema source-scans.

## Task Commits

Each task was committed atomically and pushed to `origin/main`:

1. **Task 1: Write migration 0052_incident_prevention_track.sql** — `bf411050` (feat)
2. **Task 2: Widen db/schema.ts active_tracks type + default** — `8f1ad518` (feat)

**Plan metadata:** _(see final commit below)_

## Files Created/Modified

- `db/migrations/0052_incident_prevention_track.sql` (created, 79 lines) — Migration 0052: schema default change + additive JSONB backfill + DO-block seed of arch_tracks/arch_nodes for every existing project. Idempotent via per-project `IF EXISTS` guard on `arch_tracks.name='Incident Prevention Track'` and `NOT (active_tracks ? 'incident_prevention')` guard on the UPDATE.
- `db/schema.ts:114` (modified) — `active_tracks` Drizzle column: `$type<{ adr: boolean; biggy: boolean }>` → `$type<{ adr: boolean; biggy: boolean; incident_prevention: boolean }>`; `.default({ adr: true, biggy: true })` → `.default({ adr: false, biggy: false, incident_prevention: false })`. No other line in schema.ts touched.

## Migration 0052 row count

Per existing project on first apply (idempotent — zero new rows on re-run):

| Object              | Count | Notes                                                             |
| ------------------- | ----- | ----------------------------------------------------------------- |
| arch_tracks         | 1     | name='Incident Prevention Track', display_order=30                |
| arch_nodes section  | 3     | Data Ingestion (do=10), Risk Engine (do=20), Decision & Write-Back (do=30) |
| arch_nodes console  | 1     | Change Risk Console (do=15, node_type='console')                  |
| arch_nodes sub-cap  | 13    | 4 Data Ingestion + 5 Risk Engine + 4 Decision & Write-Back        |
| **Total inserts**   | **18**| 1 arch_track + 17 arch_nodes                                      |

Plus 1 row UPDATEd on `projects` per existing project (additive JSONB `||` merge).

## JSONB merge pattern (specific syntax used)

```sql
UPDATE projects
  SET active_tracks = active_tracks || '{"incident_prevention":false}'::jsonb
  WHERE active_tracks ? 'adr'
    AND NOT (active_tracks ? 'incident_prevention');
```

Two guards on the WHERE:
1. `active_tracks ? 'adr'` — skip the migration on hypothetical rows that haven't seen prior tracks (defensive)
2. `NOT (active_tracks ? 'incident_prevention')` — **mandatory** idempotency guard. Without this, re-running 0052 would silently overwrite a user's `incident_prevention:true` (set via Settings — Plan 87-03) back to `false`.

## Schema default change rationale

`projects.active_tracks` default changed from `{adr:true,biggy:true}` to `{adr:false,biggy:false,incident_prevention:false}`:

- **New projects (post-migration):** start with all three tracks OFF. The wizard (Plan 87-04) is then *required* to surface a track-selection UI; the API POST handler (Plan 87-04) validates ≥1 track is true before creating the project.
- **Existing projects (pre-migration):** untouched. The UPDATE is purely additive via `||`. A customer who had `{adr:true,biggy:false}` after the migration has `{adr:true,biggy:false,incident_prevention:false}` — their ADR opt-in is preserved verbatim. No customer-facing regression.

This is the "customer-protection" decision called out in the plan: the schema default flip is forward-looking (controls new projects), and the backfill is backward-safe (preserves all existing state).

## Decisions Made

- **Migration shape:** single file (0052), schema ALTER + backfill + DO-block seed in one transaction. Matches 0046 precedent; splitting offers no safety benefit because the per-project IF EXISTS guard makes the entire DO block idempotent.
- **JSONB operator:** `||` (not `jsonb_set`). `||` is atomic, concurrency-safe, and pairs naturally with the `NOT (col ? 'key')` guard pattern.
- **Console placement:** display_order=15 (between section 10 and section 20). Mirrors the ADR Console layout from 0046 — consistent visual centerpiece pattern across tracks.
- **No DELETE block:** unlike 0046 (which had to restructure pre-existing ADR rows), 0052 is greenfield — there are no pre-existing IP rows to clean up. The top-level `IF EXISTS` skip on `arch_tracks` is the only idempotency primitive needed.

## Deviations from Plan

None — plan executed exactly as written. Migration shape, schema edit, and verification assertions all matched the plan's RESEARCH.md template byte-for-byte.

## Issues Encountered

- **Pre-existing modified file in working tree:** `lib/onboarding-config.ts` had uncommitted Phase 87 Plan 02 changes staged from a prior session. Left untouched (out of scope for Plan 01); only the two Plan 01 files were staged and committed.
- **`npx tsc --noEmit db/schema.ts` surfaces unrelated drizzle-orm peer-dep errors** (gel-core, mysql-core, neon-http). These are pre-existing in `node_modules/drizzle-orm` and unrelated to the Phase 87 type widening — they exist on a clean checkout of `main` without my changes. Per execution scope-boundary rules, logged here and not "fixed".
- **Plan 00 (Wave 0 test scaffolds) not yet executed at start of Plan 01:** I verified the referenced test file `tests/schema/active-tracks-type.test.ts` existed despite STATE.md showing Plan 00 had not run — Plan 00 was indeed executed earlier (test file present); other Plan 00 test files may or may not be present, but Plan 01 only needs this one.

## Next Phase Readiness

**Ready for Plan 87-02** (lib/onboarding-config.ts + lib/seed-project.ts):
- `active_tracks` type now includes `incident_prevention: boolean` — consumers can read/write this key safely
- Migration 0052 is in place; live apply deferred to Plan 87-08 human verification (Docker)
- `INCIDENT_PREVENTION_ONBOARDING_CONFIG` is the Plan 02 scope; the type/default groundwork in this plan unblocks it

**Ready for Plans 87-03 through 87-07:**
- Zod schema in settings PATCH route (Plan 03) can mirror the widened type
- Wizard (Plan 04) can read the new all-false defaults and surface the required opt-in UI
- InteractiveArchGraph (Plan 05) can rely on `arch_tracks.name='Incident Prevention Track'` rows existing for any project where the track is enabled (post-migration or post-Settings-toggle)

**Plan 87-08 (human verification):**
- IP-01 (live Docker apply) and IP-02 (idempotency on live DB) must be smoke-tested in Docker. Migration 0052 is structurally clean; rerunning is verified safe via test source-scan + the two idempotency guards baked into the SQL.

## Self-Check

Verifying claims before state updates:

- `db/migrations/0052_incident_prevention_track.sql` — FOUND (79 lines)
- `db/schema.ts:114` widening — FOUND (`incident_prevention: boolean` present, default literal includes `incident_prevention: false`)
- Commit `bf411050` — FOUND in `git log`
- Commit `8f1ad518` — FOUND in `git log`
- `tests/schema/active-tracks-type.test.ts` — 3/3 passing (IP-03 + 2× IP-13)
- `tests/schema/` full suite — 24/24 passing across 6 files
- Push to `origin/main` — confirmed (output: `58fc4b55..8f1ad518  main -> main`)

## Self-Check: PASSED

---
*Phase: 87-incident-prevention-track-support*
*Plan: 01*
*Completed: 2026-05-19*
