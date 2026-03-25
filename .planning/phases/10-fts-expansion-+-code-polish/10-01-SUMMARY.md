---
phase: 10-fts-expansion-+-code-polish
plan: "01"
subsystem: database, search, worker, ui
tags: [postgres, tsvector, gin-index, full-text-search, bullmq, settings, react]

# Dependency graph
requires:
  - phase: 08-cross-project-features-+-polish
    provides: FTS infrastructure (tsvector triggers on 8 tables, searchAllRecords 8-arm UNION)
  - phase: 05.1-onboarding-dashboard
    provides: onboarding_steps, onboarding_phases, integrations tables
  - phase: 05.2-time-tracking
    provides: time_entries table
  - phase: 05-skill-engine
    provides: skill-run.ts generic on-demand handler, settings-core.ts skill_path field
provides:
  - Migration 0009 adding FTS (search_vec column + GIN index + trigger + backfill) to 4 Phase 5.1/5.2 tables
  - searchAllRecords() expanded to 12-arm UNION ALL (onboarding_steps, onboarding_phases, integrations, time_entries)
  - skill-run.ts resolves SKILLS_DIR at runtime via readSettings().skill_path with __dirname fallback
  - SkillsTabClient.tsx no longer contains orphaned /skills/custom link
  - Wave 0 RED test stubs for SRCH-01 (E2E x2), INT-UI-01 (E2E x1), SET-02 (vitest x2)
affects: [10-02, search-api, onboarding-search, skill-execution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FTS per-table trigger pattern extended to Phase 5.1/5.2 tables (same as 0008 migration)"
    - "Runtime SKILLS_DIR resolution via readSettings() in skill-run.ts with __dirname fallback"
    - "Wave 0 RED stubs: expect(false, 'stub').toBe(true) first assertion — consistent with all prior phases"

key-files:
  created:
    - bigpanda-app/db/migrations/0009_fts_expansion.sql
    - tests/e2e/phase10.spec.ts
    - bigpanda-app/tests/skill-run-settings.test.ts
  modified:
    - bigpanda-app/lib/queries.ts
    - bigpanda-app/worker/jobs/skill-run.ts
    - bigpanda-app/components/SkillsTabClient.tsx

key-decisions:
  - "[Phase 10] SET-02 skill_path fix intentionally scoped to skill-run.ts (generic on-demand handler) only — scheduled handlers retain __dirname anchor; future phases can extend if needed"
  - "[Phase 10] search_vec excluded from Drizzle schema per Phase 08-02 locked decision — trigger-managed, raw SQL only"

patterns-established:
  - "FTS expansion pattern: ALTER TABLE + GIN index + trigger + backfill per new table (same block structure as 0008)"

requirements-completed: [SRCH-01, SET-02]

# Metrics
duration: 7min
completed: 2026-03-25
---

# Phase 10 Plan 01: FTS Expansion + Code Polish Wave 1 Summary

**PostgreSQL FTS extended to 4 Phase 5.1/5.2 tables via migration 0009, searchAllRecords() expanded to 12 UNION ALL arms, skill-run.ts SKILLS_DIR resolved at runtime from settings.skill_path, and orphaned /skills/custom link removed from SkillsTabClient**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-25T15:34:00Z
- **Completed:** 2026-03-25T15:41:27Z
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments
- Migration 0009 adds search_vec tsvector column, GIN index, trigger, and backfill for onboarding_steps, onboarding_phases, integrations, and time_entries
- searchAllRecords() now covers 12 tables (up from 8) — FTS gaps from Phase 5.1/5.2 tables closed
- skill-run.ts no longer uses hardcoded module-level SKILLS_DIR; resolves from settings.skill_path at invocation time with __dirname fallback
- Orphaned /skills/custom link removed from SkillsTabClient.tsx (INT-UI-01)
- Wave 0 RED test stubs created: 3 E2E (phase10.spec.ts) + 2 vitest (skill-run-settings.test.ts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — Create RED test stubs (E2E + unit)** - `df6a1d8` (test)
2. **Task 2: Migration 0009 + 4 UNION ALL arms in searchAllRecords()** - `91f777d` (feat)
3. **Task 3: SET-02 skill path fix + remove orphaned /skills/custom link** - `b2c8464` (feat)

**Plan metadata:** (final docs commit — see below)

## Files Created/Modified
- `bigpanda-app/db/migrations/0009_fts_expansion.sql` - FTS columns + GIN indexes + triggers + backfill for 4 tables
- `bigpanda-app/lib/queries.ts` - 4 new UNION ALL arms (arms 9-12); updated comment to 12-table coverage
- `bigpanda-app/worker/jobs/skill-run.ts` - Runtime SKILLS_DIR resolution via readSettings(); removed module-level const
- `bigpanda-app/components/SkillsTabClient.tsx` - Removed orphaned /skills/custom link div
- `tests/e2e/phase10.spec.ts` - 3 RED E2E stubs (SRCH-01 x2, INT-UI-01 x1)
- `bigpanda-app/tests/skill-run-settings.test.ts` - 2 RED vitest stubs (SET-02 x2)

## Decisions Made
- SET-02 skill_path fix scoped to skill-run.ts (generic on-demand handler) only — scheduled handlers retain __dirname anchor per research findings; future phases can extend if needed
- search_vec not added to Drizzle schema — locked Phase 08-02 decision maintained (trigger-managed, raw SQL only)
- Fallback in skill-run.ts uses `path.join(__dirname, '../../skills')` — consistent with Phase 05 decision for worker-context SKILL.md resolution

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors (Redis ConnectionOptions type mismatch in 3 route files, missing js-yaml types in yaml-export.ts) unchanged and within acceptable scope per STATE.md note.

## User Setup Required

Migration 0009 ready to apply. Run once PostgreSQL is available:
```bash
cd bigpanda-app && DATABASE_URL=postgresql://localhost:5432/bigpanda_app npx drizzle-kit migrate
```

## Next Phase Readiness
- Migration 0009 ready to apply; all 4 tables will gain FTS support after migration
- Wave 0 RED stubs in place for 10-02 activation
- searchAllRecords() ready to serve 12-table results once migration applied
- No blockers for plan 10-02

---
*Phase: 10-fts-expansion-+-code-polish*
*Completed: 2026-03-25*

## Self-Check: PASSED

- FOUND: tests/e2e/phase10.spec.ts
- FOUND: bigpanda-app/tests/skill-run-settings.test.ts
- FOUND: bigpanda-app/db/migrations/0009_fts_expansion.sql
- FOUND: commit df6a1d8 (test stubs)
- FOUND: commit 91f777d (migration + queries)
- FOUND: commit b2c8464 (skill-path fix + link removal)
