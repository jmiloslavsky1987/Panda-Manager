---
phase: 02-app-shell-read-surface
plan: 01
subsystem: testing
tags: [playwright, e2e, typescript, chromium]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: DB schema, migration scripts, YAML export — phase 2 app reads from this DB

provides:
  - Playwright E2E test spec (tests/e2e/phase2.spec.ts) covering all 14 Phase 2 requirements
  - playwright.config.ts at project root targeting http://localhost:3000
  - RED baseline: 23 named failing tests ready for implementation plans to flip GREEN

affects:
  - 02-02 through 02-07 (each implementation plan uses --grep to target specific tests as verify commands)

# Tech tracking
tech-stack:
  added:
    - "@playwright/test (dev dependency, project root)"
    - "Chromium browser (playwright chromium v1208, cached at ~/.ms-playwright)"
  patterns:
    - "Wave 0 RED baseline — test stubs committed before any implementation begins"
    - "Requirement ID in test name (e.g. DASH-01, WORK-03) — grep-able by requirement"

key-files:
  created:
    - tests/e2e/phase2.spec.ts
    - playwright.config.ts
  modified:
    - package.json (added @playwright/test devDependency)

key-decisions:
  - "npm install --no-package-lock used to work around invalid esbuild semver in existing package-lock.json (known pre-existing issue)"
  - "All 23 stubs use expect(false, 'stub — implement Phase 2').toBe(true) — explicit RED, not skip"
  - "Test names carry requirement IDs (DASH-01 etc.) so npx playwright test --grep can target individual requirements"

patterns-established:
  - "Phase 2 E2E spec pattern: describe blocks per feature area, requirement ID in test name, stub body fails immediately with descriptive message"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-06, DASH-07, DASH-08, WORK-01, WORK-03, WORK-04, WORK-05, WORK-06, WORK-07, WORK-08, WORK-09]

# Metrics
duration: 12min
completed: 2026-03-19
---

# Phase 2 Plan 01: E2E Test Stubs Summary

**Playwright installed and 23 RED test stubs written covering all Phase 2 behaviors — DASH-01/02/03/06/07/08, WORK-01/03-09, Add Notes modal, and no-console-errors suite**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-19T21:30:00Z
- **Completed:** 2026-03-19T21:42:00Z
- **Tasks:** 1/1
- **Files modified:** 3 (tests/e2e/phase2.spec.ts, playwright.config.ts, package.json)

## Accomplishments

- @playwright/test installed as dev dependency at project root
- Chromium browser downloaded and cached (playwright chromium v1208, 162 MB)
- `tests/e2e/phase2.spec.ts` created with 23 named tests across 4 describe blocks
- `playwright.config.ts` created at project root pointing at bigpanda-app dev server
- All 23 tests confirmed RED — Wave 0 baseline established

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Playwright and write E2E test stubs** - `bab805f` (test)

**Plan metadata:** (included in this commit)

## Files Created/Modified

- `tests/e2e/phase2.spec.ts` - 199-line E2E spec with 23 named failing tests covering all Phase 2 requirements
- `playwright.config.ts` - Playwright config at project root, baseURL http://localhost:3000, webServer runs bigpanda-app dev
- `package.json` - Added @playwright/test to devDependencies

## Decisions Made

- Used `npm install --no-package-lock` to work around the pre-existing invalid esbuild semver in `package-lock.json`. This is a known issue documented in STATE.md. The install succeeds and the package is available; the lock file is not regenerated.
- Stubs use `expect(false, 'stub — implement Phase 2').toBe(true)` instead of `test.fixme()` — this keeps tests RED and visible in the test report rather than silently skipped.
- Requirement IDs embedded in test names (e.g. "DASH-01: Today Briefing panel is visible") — subsequent implementation plans can run `npx playwright test --grep "DASH-01"` as their exact verify command.

## Deviations from Plan

**1. [Rule 3 - Blocking] Used --no-package-lock flag for npm install**
- **Found during:** Task 1 (Install Playwright)
- **Issue:** `npm install @playwright/test` failed with "Invalid Version:" — the existing `package-lock.json` at project root has an esbuild entry that triggers a semver parsing crash in npm's arborist deduplication logic. This is a pre-existing issue documented in STATE.md ("npm install fails due to invalid esbuild semver in package-lock.json").
- **Fix:** Used `npm install --save-dev @playwright/test --no-package-lock` — installs the package without touching the lock file. Playwright is available and functional.
- **Files modified:** package.json only (lock file unchanged)
- **Verification:** `npx playwright test` ran successfully; 23 tests executed and failed as expected
- **Committed in:** bab805f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor workaround — no scope change, no functionality impact. Package installed and working correctly.

## Issues Encountered

- npm package-lock.json semver issue — resolved with --no-package-lock workaround (see deviation above)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RED baseline established. All 23 test names are final — implementation plans 02-02 through 02-07 can reference them with `--grep`.
- App server starts automatically via Playwright's `webServer` config when tests run.
- Tests should remain RED until each implementation plan is complete — the wave pattern is working correctly.

---
*Phase: 02-app-shell-read-surface*
*Completed: 2026-03-19*
