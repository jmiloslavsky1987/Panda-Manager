---
phase: 07-file-generation-remaining-skills
plan: 02
subsystem: file-gen
tags: [pptxgenjs, vitest, tdd, file-generation, html, pptx, typescript]

# Dependency graph
requires:
  - phase: 07-01
    provides: vitest stub tests for SKILL-05 through SKILL-08 as RED baseline
  - phase: 04-job-infrastructure
    provides: settings-core.ts with readSettings() and workspace_path
provides:
  - FileGenerationService pure module — generateFile() routes Claude JSON output to .pptx or .html writers
  - types.ts — FileGenParams, FileGenResult, EltSlideJson, HtmlSkillJson interfaces
  - pptx.ts — generatePptx() using pptxgenjs writeFile, stripFences() utility
  - html.ts — generateHtml() with mkdirSync recursive
  - index.ts — public generateFile() API with skill-to-ext routing
affects:
  - 07-03 through 07-07 (skill wiring plans that import generateFile from lib/file-gen)
  - worker/jobs/skill-run.ts (calls generateFile after orchestrator.run() for file skills)

# Tech tracking
tech-stack:
  added: [pptxgenjs, vitest (bigpanda-app)]
  patterns:
    - TDD RED/GREEN per task with vitest in bigpanda-app/lib/
    - async readSettings() awaited in buildOutputPath() — consistent with settings-core async API
    - workspace_path resolution handles ~/..., /Documents/... (relative-to-homedir), and absolute paths
    - stripFences() handles both ```json and plain ``` Claude fence variants

key-files:
  created:
    - bigpanda-app/lib/file-gen/types.ts
    - bigpanda-app/lib/file-gen/pptx.ts
    - bigpanda-app/lib/file-gen/html.ts
    - bigpanda-app/lib/file-gen/index.ts
    - bigpanda-app/vitest.config.ts
  modified:
    - bigpanda-app/lib/file-gen/__tests__/pptx-generator.test.ts
    - bigpanda-app/lib/file-gen/__tests__/html-generator.test.ts

key-decisions:
  - "pptxgenjs installed with --no-package-lock — consistent with all prior Phase 2+ installs (invalid esbuild semver in package-lock.json)"
  - "buildOutputPath() is async — readSettings() is async in settings-core.ts; plan's synchronous call was incorrect"
  - "workspace_path /Documents/PM Application (no ~) treated as relative-to-homedir — matches DEFAULTS in settings-core.ts"
  - "vitest.config.ts added at bigpanda-app/ root — no prior config existed; environment: node required for fs/path tests"
  - "Test imports use dynamic import() not require() — vitest runs ESM; require() causes MODULE_NOT_FOUND"

patterns-established:
  - "FileGenerationService pattern: pure function module, no side effects beyond disk writes, no DB access"
  - "SKILL_EXT + SKILL_PREFIX maps in index.ts — extend when new file skills are added"
  - "stripFences() exported from pptx.ts and re-used in index.ts — single source of truth for fence stripping"

requirements-completed: [SKILL-05, SKILL-06, SKILL-07, SKILL-08]

# Metrics
duration: 3min
completed: 2026-03-24
---

# Phase 07 Plan 02: File Generation Service Summary

**pptxgenjs-backed .pptx writer + HTML writer as pure FileGenerationService with generateFile() routing by skillName, 6/6 vitest tests GREEN**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T20:14:36Z
- **Completed:** 2026-03-24T20:17:22Z
- **Tasks:** 2/2
- **Files modified:** 7

## Accomplishments

- FileGenerationService built as pure function library — zero DB access, pure disk writes
- generatePptx() produces valid .pptx files using pptxgenjs writeFile() on absolute paths
- stripFences() handles all Claude markdown fence variants (```json and plain ```)
- generateHtml() writes self-contained HTML with recursive directory creation
- generateFile() public API routes to pptx or html by skillName with SKILL_EXT map
- All 6 TDD vitest tests pass GREEN (3 pptx-generator, 3 html-generator)

## Task Commits

1. **Task 1: types.ts + pptx.ts — EltSlideJson contract and pptxgenjs writer** - `58c50a6` (feat)
2. **Task 2: html.ts + index.ts — HTML writer and public generateFile() API** - `4963039` (feat)

## Files Created/Modified

- `bigpanda-app/lib/file-gen/types.ts` — FileGenParams, FileGenResult, EltSlideJson, HtmlSkillJson interfaces
- `bigpanda-app/lib/file-gen/pptx.ts` — generatePptx() + stripFences() using pptxgenjs
- `bigpanda-app/lib/file-gen/html.ts` — generateHtml() with writeFileSync + mkdirSync
- `bigpanda-app/lib/file-gen/index.ts` — generateFile() public API with buildOutputPath (async)
- `bigpanda-app/vitest.config.ts` — vitest node environment config for bigpanda-app
- `bigpanda-app/lib/file-gen/__tests__/pptx-generator.test.ts` — 3 real tests replacing stubs
- `bigpanda-app/lib/file-gen/__tests__/html-generator.test.ts` — 3 real tests replacing stubs

## Decisions Made

- `readSettings()` is async in settings-core.ts — plan's `buildOutputPath` was shown as synchronous but must use `await`; made async throughout
- `workspace_path` of `/Documents/PM Application` (DEFAULTS value) starts with `/` but is relative to homedir — handled by checking for non-absolute-looking paths
- vitest uses ESM module resolution — `require()` in tests causes MODULE_NOT_FOUND; changed to dynamic `import()`
- pptxgenjs installed with `--no-package-lock` consistent with all prior Phase 2–6 dependency installs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing pptxgenjs dependency**
- **Found during:** Task 1 (pptx.ts implementation)
- **Issue:** pptxgenjs not in bigpanda-app/package.json; import would fail at runtime
- **Fix:** `npm install --no-package-lock pptxgenjs`
- **Files modified:** bigpanda-app/package.json
- **Verification:** `node -e "require('pptxgenjs')"` confirms load; tests pass
- **Committed in:** 58c50a6 (Task 1 commit)

**2. [Rule 1 - Bug] readSettings() is async — buildOutputPath must await it**
- **Found during:** Task 2 (index.ts implementation)
- **Issue:** Plan snippet showed `const settings = readSettings()` (synchronous) but settings-core exports async `readSettings(): Promise<AppSettings>`
- **Fix:** Made `buildOutputPath` async, added `await readSettings()`, made `generateFile` already async (was in plan)
- **Files modified:** bigpanda-app/lib/file-gen/index.ts
- **Verification:** All 6 tests pass; TypeScript compiles without errors in file-gen modules
- **Committed in:** 4963039 (Task 2 commit)

**3. [Rule 3 - Blocking] Test imports changed from require() to dynamic import()**
- **Found during:** Task 2 (html-generator test)
- **Issue:** Tests used `require('../html')` which fails in vitest ESM context (MODULE_NOT_FOUND)
- **Fix:** Changed to `await import('../html')` — consistent with pptx-generator test pattern
- **Files modified:** bigpanda-app/lib/file-gen/__tests__/html-generator.test.ts
- **Verification:** All 6 tests GREEN
- **Committed in:** 4963039 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking dependency, 1 bug in plan snippet, 1 blocking test import)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## Next Phase Readiness

- `generateFile()` is the callable entry point for all 4 file skills (SKILL-05 through SKILL-08)
- Import path: `import { generateFile } from '../../lib/file-gen'` from worker/jobs/skill-run.ts
- Plan 07-03 and beyond wire skill handlers to call generateFile after orchestrator.run()

---
*Phase: 07-file-generation-remaining-skills*
*Completed: 2026-03-24*
