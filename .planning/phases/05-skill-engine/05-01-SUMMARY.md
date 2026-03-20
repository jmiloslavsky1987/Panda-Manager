---
phase: 05-skill-engine
plan: 01
subsystem: database, testing, ai
tags: [anthropic-sdk, drizzle, postgresql, playwright, e2e, skill-engine]

# Dependency graph
requires:
  - phase: 04-job-infrastructure
    provides: DB schema patterns (jobRuns table), BullMQ worker infrastructure, E2E stub pattern

provides:
  - "@anthropic-ai/sdk installed in bigpanda-app (importable from worker context)"
  - "DB schema with skillRuns, skillRunChunks, drafts Drizzle table definitions + enums"
  - "Migration SQL 0004 for 3 new skill-engine tables with index on skill_run_chunks"
  - "5 SKILL.md stub prompt files in bigpanda-app/skills/"
  - "13 RED E2E test stubs in tests/e2e/phase5.spec.ts (Wave 0 baseline)"

affects:
  - 05-02-skill-api
  - 05-03-skill-worker
  - 05-04-skill-ui
  - all Phase 5 plans (SDK + schema contracts established here)

# Tech tracking
tech-stack:
  added:
    - "@anthropic-ai/sdk (bigpanda-app)"
  patterns:
    - "Wave 0 RED stub pattern: expect(false, 'stub').toBe(true) as first assertion in every E2E test"
    - "SKILL.md file convention: markdown prompt files in bigpanda-app/skills/ directory"
    - "Drizzle pgEnum + pgTable pattern for skill_run_status and draft_status enums"

key-files:
  created:
    - bigpanda-app/db/migrations/0004_add_skill_engine.sql
    - bigpanda-app/skills/weekly-customer-status.md
    - bigpanda-app/skills/meeting-summary.md
    - bigpanda-app/skills/morning-briefing.md
    - bigpanda-app/skills/context-updater.md
    - bigpanda-app/skills/handoff-doc-generator.md
    - tests/e2e/phase5.spec.ts
  modified:
    - bigpanda-app/db/schema.ts (added Tables 15-17 + 2 enums)
    - bigpanda-app/package.json (@anthropic-ai/sdk added to dependencies)

key-decisions:
  - "npm install --no-package-lock used for @anthropic-ai/sdk — consistent with established pattern from 02-01, 03-02 (invalid esbuild semver in package-lock.json)"
  - "Wave 0 RED stub pattern reused from 02-01, 03-01, 04-01 — expect(false, 'stub').toBe(true) as first assertion keeps stubs visibly RED without server running"
  - "skill_run_chunks uses integer FK run_id (not text) referencing skill_runs.id — enables ON DELETE CASCADE for cleanup"
  - "SKILL.md stubs are real placeholder prompts (not empty files) — downstream plans refine them during skill wiring"

patterns-established:
  - "SKILL.md convention: each skill has a markdown file in bigpanda-app/skills/ containing the system prompt stub"
  - "skill_run_chunks table stores text deltas + __DONE__ sentinel for streaming coordination"
  - "drafts table uses draft_status enum (pending/dismissed/sent) for Drafts Inbox lifecycle"

requirements-completed:
  - SKILL-01
  - SKILL-02
  - SKILL-03
  - SKILL-04
  - SKILL-11
  - SKILL-12
  - SKILL-13
  - SKILL-14
  - DASH-09
  - OUT-01
  - OUT-02
  - OUT-03
  - OUT-04

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 5 Plan 01: Skill Engine Foundation Summary

**@anthropic-ai/sdk installed, DB schema extended with skillRuns/skillRunChunks/drafts tables, migration SQL written, 5 SKILL.md stub prompts scaffolded, and 13 RED E2E stubs (phase5.spec.ts) establishing Wave 0 baseline**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-20T18:44:36Z
- **Completed:** 2026-03-20T18:47:32Z
- **Tasks:** 2/2
- **Files modified:** 9

## Accomplishments

- Installed @anthropic-ai/sdk in bigpanda-app using --no-package-lock pattern (avoids esbuild semver issue); SDK importable from worker context
- Extended db/schema.ts with 3 new Drizzle tables (skillRuns, skillRunChunks, drafts) and 2 enums (skillRunStatusEnum, draftStatusEnum); wrote matching 0004 migration SQL with index on skill_run_chunks(run_id, seq)
- Created bigpanda-app/skills/ directory with 5 real stub prompt SKILL.md files; all 13 Phase 5 E2E stubs fail on RED stub assertion as required

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @anthropic-ai/sdk + extend DB schema + write migration SQL** - `348d9e5` (feat)
2. **Task 2: SKILL.md stubs + E2E test stubs** - `ba3ceee` (feat)

**Plan metadata:** (docs commit — see state update below)

## Files Created/Modified

- `bigpanda-app/package.json` — @anthropic-ai/sdk added to dependencies
- `bigpanda-app/db/schema.ts` — Tables 15-17 appended after jobRuns: skillRuns, skillRunChunks, drafts + 2 enums
- `bigpanda-app/db/migrations/0004_add_skill_engine.sql` — Raw SQL migration for 3 new tables + index on skill_run_chunks
- `bigpanda-app/skills/weekly-customer-status.md` — Stub prompt: weekly customer status email generation
- `bigpanda-app/skills/meeting-summary.md` — Stub prompt: structured meeting summary with action items
- `bigpanda-app/skills/morning-briefing.md` — Stub prompt: daily priorities/overdue/deadlines briefing
- `bigpanda-app/skills/context-updater.md` — Stub prompt: extract YAML updates from meeting notes as JSON
- `bigpanda-app/skills/handoff-doc-generator.md` — Stub prompt: full handoff doc for coverage
- `tests/e2e/phase5.spec.ts` — 13 RED E2E stubs covering SKILL-01 to SKILL-14, DASH-09, OUT-01 to OUT-04

## Decisions Made

- Used `npm install --no-package-lock` for @anthropic-ai/sdk install — consistent with 02-01 and 03-02 patterns; standard npm install fails due to invalid esbuild semver in existing package-lock.json
- skill_run_chunks.run_id is INTEGER FK (not TEXT) referencing skill_runs.id — enables ON DELETE CASCADE cleanup when a skill run is deleted
- SKILL.md files contain real stub prompts (not empty placeholders) — downstream plans in 05-02+ refine them with production prompts during skill wiring

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this plan. Migration 0004 runs after PostgreSQL is available via `cd bigpanda-app && DATABASE_URL=postgresql://localhost:5432/bigpanda_app npx drizzle-kit migrate`.

## Next Phase Readiness

- SDK importable: `node -e "require('@anthropic-ai/sdk')"` returns SDK OK
- Schema contracts established: all Phase 5 plans can reference skillRuns, skillRunChunks, drafts exports
- Wave 0 RED baseline: 13 E2E stubs failing on stub assertion — ready to go GREEN as skills are wired
- SKILL.md stubs ready for prompt refinement in skill wiring plans
- DB migration 0004 ready for PostgreSQL when available

---
*Phase: 05-skill-engine*
*Completed: 2026-03-20*
