---
phase: 07-file-generation-remaining-skills
plan: 05
subsystem: ui, api
tags: [nextjs, react, vitest, anthropic, skill-orchestrator, radix-ui, shadcn]

requires:
  - phase: 07-04
    provides: FILE_SKILLS wiring, SkillOrchestrator post-generation hook

provides:
  - POST /api/projects/[id]/generate-plan route calling SkillOrchestrator with ai-plan-generator skill
  - AiPlanPanel client component with Generate plan / Commit selected / Discard flow
  - Plan board page integration: AiPlanPanel rendered above PhaseBoard
  - bigpanda-app/skills/ai-plan-generator.md system prompt
  - Checkbox shadcn/ui component (@radix-ui/react-checkbox)

affects:
  - plan-board
  - skills-tab
  - task-management

tech-stack:
  added: ["@radix-ui/react-checkbox ^1.3.3"]
  patterns:
    - "TDD with vitest for Next.js Route Handlers using class mocks for SkillOrchestrator"
    - "Proposed-then-commit pattern: Claude returns JSON tasks, user reviews and selects, commit writes to DB"
    - "Inline skill system prompt (ai-plan-generator.md) for plan-tab-specific AI feature"

key-files:
  created:
    - bigpanda-app/app/api/projects/[id]/generate-plan/route.ts
    - bigpanda-app/components/AiPlanPanel.tsx
    - bigpanda-app/components/ui/checkbox.tsx
    - bigpanda-app/skills/ai-plan-generator.md
  modified:
    - bigpanda-app/app/customer/[id]/plan/board/page.tsx
    - bigpanda-app/app/api/__tests__/ai-plan.test.ts
    - bigpanda-app/vitest.config.ts

key-decisions:
  - "SkillOrchestrator mock uses real ES class syntax (not vi.fn().mockImplementation) — arrow function factories are not constructors"
  - "vitest.config.ts @/ alias added (resolve.alias) — required for route handler tests importing @/db and @/lib/"
  - "@radix-ui/react-checkbox installed and checkbox.tsx component created — shadcn Checkbox not present in codebase"
  - "Proposed tasks NOT written to tasks table by generate-plan route — only skill_runs row created; tasks written only on explicit Commit click"

patterns-established:
  - "Pattern: vitest class mock pattern — use ES class syntax in vi.mock factory for modules instantiated with new"
  - "Pattern: Route handler test isolation — mock @/db as object with vi.fn() methods, mock orchestrator as class"

requirements-completed: [PLAN-12]

duration: 5min
completed: 2026-03-24
---

# Phase 07 Plan 05: AI Plan Generator Summary

**AI-assisted plan generation: Claude proposes tasks via inline panel on Plan board, user selects/deselects and commits to DB or discards — no premature writes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-24T20:27:47Z
- **Completed:** 2026-03-24T20:32:44Z
- **Tasks:** 2/2
- **Files modified:** 7

## Accomplishments

- POST /api/projects/[id]/generate-plan route: creates skill_run row, calls SkillOrchestrator with ai-plan-generator skill, parses JSON output, returns proposed tasks without writing to tasks table
- AiPlanPanel client component: "Generate plan" button triggers Claude call, renders proposed tasks as checkklist (all pre-checked), "Commit selected" POSTs each approved task to /api/tasks, "Discard" clears with no DB write
- 2 vitest tests GREEN: 200 response with tasks array, and confirmed tasks table not written during generation
- TDD RED commit followed by GREEN implementation commit

## Task Commits

1. **TDD RED: test stubs** - `aec9cd1` (test)
2. **Task 1: generate-plan route + SKILL.md** - `0271627` (feat)
3. **Task 2: AiPlanPanel + board integration** - `3beb8a5` (feat)

## Files Created/Modified

- `bigpanda-app/app/api/projects/[id]/generate-plan/route.ts` - POST endpoint calling SkillOrchestrator, returns proposed tasks
- `bigpanda-app/skills/ai-plan-generator.md` - System prompt for plan generation skill
- `bigpanda-app/components/AiPlanPanel.tsx` - Client component with generate/commit/discard flow
- `bigpanda-app/components/ui/checkbox.tsx` - New shadcn Checkbox component
- `bigpanda-app/app/customer/[id]/plan/board/page.tsx` - Added AiPlanPanel above PhaseBoard
- `bigpanda-app/app/api/__tests__/ai-plan.test.ts` - 2 vitest tests (GREEN)
- `bigpanda-app/vitest.config.ts` - Added @/ path alias for test resolution

## Decisions Made

- `SkillOrchestrator` mock uses real ES class syntax (not `vi.fn().mockImplementation(() => {...})`) because arrow-function factories are not constructors — `new` would throw "is not a constructor"
- `vitest.config.ts` needed `resolve.alias` for `@/` to enable route handler imports in test context — pre-existing config was missing this
- `@radix-ui/react-checkbox` installed and `checkbox.tsx` created as shadcn-style component — required by AiPlanPanel but missing from codebase

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @/ path alias to vitest.config.ts**
- **Found during:** Task 1 (TDD GREEN — running tests)
- **Issue:** vitest.config.ts had no resolve.alias, so `@/db`, `@/lib/skill-orchestrator`, `@/db/schema` imports in the route handler failed with ERR_MODULE_NOT_FOUND
- **Fix:** Added `resolve: { alias: { '@': path.resolve(__dirname, '.') } }` to vitest.config.ts
- **Files modified:** bigpanda-app/vitest.config.ts
- **Verification:** Tests resolved imports and ran GREEN
- **Committed in:** 0271627 (Task 1 feat commit)

**2. [Rule 3 - Blocking] Installed @radix-ui/react-checkbox and created checkbox.tsx**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** AiPlanPanel imports `@/components/ui/checkbox` but checkbox.tsx did not exist in the codebase; @radix-ui/react-checkbox not installed
- **Fix:** `npm install --no-package-lock @radix-ui/react-checkbox`; created shadcn-style checkbox.tsx component
- **Files modified:** bigpanda-app/components/ui/checkbox.tsx, bigpanda-app/package.json
- **Verification:** `npx tsc --noEmit` shows no errors for AiPlanPanel or checkbox
- **Committed in:** 3beb8a5 (Task 2 feat commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes required for tests to pass and TypeScript to compile. No scope creep.

## Issues Encountered

- vitest class mock pattern: `vi.fn().mockImplementation(() => ({ run: ... }))` cannot be used with `new` keyword — must use `class MockClass { method() {} }` syntax in vi.mock factory

## Next Phase Readiness

- PLAN-12 fully implemented: Generate plan button on Plan tab board calls Claude, shows proposed tasks, commits on demand
- Plan 07-06 (sprint-summary) can proceed independently
- ai-plan-generator.md skill prompt can be refined without code changes

---
*Phase: 07-file-generation-remaining-skills*
*Completed: 2026-03-24*
