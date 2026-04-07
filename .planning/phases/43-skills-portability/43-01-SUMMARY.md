---
phase: 43-skills-portability
plan: 01
subsystem: skills-infrastructure
tags: [skill-orchestrator, settings, runtime-config, portability]

# Dependency graph
requires:
  - phase: 05
    provides: "Worker jobs architecture with __dirname-relative fallback"
  - phase: 21
    provides: "Settings service with skill_path configuration"
provides:
  - "Portable skill path resolution via lib/skill-path.ts helper"
  - "Runtime settings-backed path resolution in all worker jobs and API routes"
  - "No hardcoded __dirname or process.cwd() references for skills directory"
affects: [deployment, docker, production-builds, skill-development]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared lib/skill-path.ts helper importable by both app/ (Next.js) and worker/ (BullMQ)"
    - "Per-request settings.skill_path resolution (not module-level constants)"
    - "API routes use @/lib/settings (server-only), worker jobs use lib/settings-core"

key-files:
  created:
    - bigpanda-app/lib/skill-path.ts
    - bigpanda-app/worker/jobs/__tests__/skill-path-migration.test.ts
  modified:
    - bigpanda-app/worker/jobs/skill-run.ts
    - bigpanda-app/worker/jobs/meeting-summary.ts
    - bigpanda-app/worker/jobs/handoff-doc-generator.ts
    - bigpanda-app/worker/jobs/customer-project-tracker.ts
    - bigpanda-app/app/api/projects/[projectId]/sprint-summary/route.ts
    - bigpanda-app/app/api/projects/[projectId]/generate-plan/route.ts
    - bigpanda-app/app/api/skills/[skillName]/run/route.ts
    - bigpanda-app/lib/skill-orchestrator.ts

key-decisions:
  - "resolveSkillsDir() extracted to lib/ (not worker/) for shared access from both Next.js and BullMQ contexts"
  - "skill-run.ts re-exports resolveSkillsDir for backward compatibility"
  - "customer-project-tracker resolves settings once before loop (not per-iteration) for efficiency"

patterns-established:
  - "Pattern 1: Inline per-request path resolution — const settings = await readSettings(); const SKILLS_DIR = resolveSkillsDir(settings.skill_path ?? '');"
  - "Pattern 2: TDD migration testing — mock settings-core, verify jobs call readSettings() not __dirname"
  - "Pattern 3: API routes use @/lib/settings (with server-only guard), worker jobs use ../../lib/settings-core (no guard)"

requirements-completed: [SKILL-01]

# Metrics
duration: 5min 42sec
completed: 2026-04-07
---

# Phase 43 Plan 01: Skills Portability Summary

**Portable skill path resolution with runtime settings-backed directory lookup eliminates hardcoded __dirname and process.cwd() paths**

## Performance

- **Duration:** 5 min 42 sec
- **Started:** 2026-04-07T23:19:04Z
- **Completed:** 2026-04-07T23:24:46Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Extracted resolveSkillsDir helper to shared lib/skill-path.ts (importable by both app/ and worker/)
- Migrated 3 worker jobs (meeting-summary, handoff-doc-generator, customer-project-tracker) to runtime settings resolution
- Migrated 3 API routes (sprint-summary, generate-plan, skills/[skillName]/run) to inline per-request resolution
- Eliminated all module-level SKILLS_DIR constants and __dirname-based skill paths
- Full TDD workflow: tests RED → GREEN with 6 migration tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract resolveSkillsDir to lib/skill-path.ts and write migration tests** - `eba8188` (test)
2. **Task 2: Migrate 3 worker jobs from __dirname to resolveSkillsDir** - `987a3ff` (feat)
3. **Task 3: Migrate API routes to inline settings-backed path resolution** - `74346e5` (feat)

_Note: Task 1 followed TDD RED phase — tests created and confirmed failing before implementation_

## Files Created/Modified

**Created:**
- `bigpanda-app/lib/skill-path.ts` - Shared resolveSkillsDir helper with 3-rule path resolution (absolute/relative/fallback)
- `bigpanda-app/worker/jobs/__tests__/skill-path-migration.test.ts` - Migration tests confirming all jobs use readSettings() + resolveSkillsDir

**Modified (Worker Jobs):**
- `bigpanda-app/worker/jobs/skill-run.ts` - Re-exports resolveSkillsDir from lib/skill-path (backward compat)
- `bigpanda-app/worker/jobs/meeting-summary.ts` - Inline settings resolution, removed module-level SKILLS_DIR
- `bigpanda-app/worker/jobs/handoff-doc-generator.ts` - Inline settings resolution, removed module-level SKILLS_DIR
- `bigpanda-app/worker/jobs/customer-project-tracker.ts` - Resolves settings once before loop, removed module-level SKILLS_DIR

**Modified (API Routes):**
- `bigpanda-app/app/api/projects/[projectId]/sprint-summary/route.ts` - Per-request settings resolution using @/lib/settings
- `bigpanda-app/app/api/projects/[projectId]/generate-plan/route.ts` - Per-request settings resolution using @/lib/settings
- `bigpanda-app/app/api/skills/[skillName]/run/route.ts` - Preflight SKILL.md check uses resolveSkillsDir

**Modified (Orchestrator):**
- `bigpanda-app/lib/skill-orchestrator.ts` - Added comment on fallback line (Phase 43 migration note)

## Decisions Made

1. **lib/ location for resolveSkillsDir** - Placed in lib/skill-path.ts (not worker/) so both Next.js API routes and BullMQ worker jobs can import it. The lib/ directory is accessible from both contexts.

2. **Re-export pattern in skill-run.ts** - Maintained backward compatibility by re-exporting resolveSkillsDir from lib/skill-path in skill-run.ts. Existing test files importing from skill-run continue to work.

3. **Efficiency optimization in customer-project-tracker** - Resolved settings once before the project loop (not per-iteration). The skill_path value won't change mid-execution, so reading it once is correct and more efficient.

4. **API routes use @/lib/settings, worker jobs use lib/settings-core** - API routes in app/ directory use the server-only wrapped settings module. Worker jobs use settings-core directly (no server-only marker needed in Node.js context).

## Deviations from Plan

**1. [Rule 3 - Blocking] Fixed skill-run.ts missing import**
- **Found during:** Task 3 (running full test suite)
- **Issue:** skill-run.ts re-exported resolveSkillsDir but didn't import it for use within the file itself, causing ReferenceError in tests
- **Fix:** Added `import { resolveSkillsDir } from '../../lib/skill-path';` before the re-export line
- **Files modified:** bigpanda-app/worker/jobs/skill-run.ts
- **Verification:** Full test suite passed (576/586 tests, 10 pre-existing failures unrelated)
- **Committed in:** 74346e5 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (blocking issue)
**Impact on plan:** Essential fix for correctness. No scope creep.

## Issues Encountered

None - TDD approach caught the import issue immediately during test execution.

## User Setup Required

None - no external service configuration required. Existing settings.json skill_path configuration continues to work unchanged.

## Verification

All verification checks from plan passed:

1. **No __dirname skill paths:** `grep -r "path.join(__dirname.*skills" worker/jobs/` → 0 results ✓
2. **No module-level SKILLS_DIR constants:** `grep -r "const SKILLS_DIR = path.join" .` → 0 results in source files (only inline variables) ✓
3. **All files import from lib/skill-path:** 7 files confirmed importing resolveSkillsDir ✓
4. **Migration tests GREEN:** npx vitest run skill-path-migration.test.ts → 6/6 passing ✓
5. **Existing tests still pass:** npx vitest run tests/skill-run-settings.test.ts → 2/2 passing ✓
6. **Full test suite:** 576/586 tests passing (10 pre-existing failures in unrelated tests, noted in STATE.md)

## Next Phase Readiness

- Skills infrastructure now portable across deployment environments (local, Docker, cloud)
- No hardcoded paths blocking production builds or container deployments
- Ready for Phase 44: Navigation & Parity (requires stable skills execution foundation)
- SKILL-01 requirement satisfied: skill runner resolves SKILL.md paths dynamically at runtime

## Self-Check: PASSED

**Created files verified:**
- ✓ bigpanda-app/lib/skill-path.ts
- ✓ bigpanda-app/worker/jobs/__tests__/skill-path-migration.test.ts

**Commits verified:**
- ✓ eba8188 (Task 1)
- ✓ 987a3ff (Task 2)
- ✓ 74346e5 (Task 3)

All claims in this SUMMARY validated against filesystem and git history.

---
*Phase: 43-skills-portability*
*Completed: 2026-04-07*
