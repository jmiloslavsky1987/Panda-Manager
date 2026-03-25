---
phase: 07-file-generation-remaining-skills
verified: 2026-03-24T18:30:00Z
status: human_needed
score: 14/14 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 12/14
  gaps_closed:
    - "ai-plan.test.ts import path fixed from [id] to [projectId] — 2/2 tests GREEN"
    - "sprint-summary.test.ts import path fixed from [id] to [projectId] — 3/3 tests GREEN"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Skills tab — 4 new skill cards visible and enabled"
    expected: "ELT External Status, ELT Internal Status, Team Engagement Map, Workflow Diagram cards appear NOT grayed out; Biggy Weekly Briefing absent or grayed out"
    why_human: "SkillsTabClient renders cards with CSS opacity class — visual verification required; 'coming soon' description text is innocuous but worth confirming cards are interactive"
  - test: "Plan tab — Generate plan button and Sprint Summary panel render"
    expected: "AiPlanPanel with 'Generate plan' button visible above Phase Board; SprintSummaryPanel with toggle+refresh visible at top of Plan layout"
    why_human: "Requires running dev server against seeded DB; structural assertions confirmed but live render needs visual check"
  - test: "File generation end-to-end (requires Anthropic API key)"
    expected: "Running ELT External Status produces a .pptx file in workspace dir; 'Open in PowerPoint' button appears on completion page; file opens without corruption"
    why_human: "Requires live Anthropic API call — cannot verify programmatically"
  - test: "Sprint summary persistence"
    expected: "Clicking Refresh generates text; page reload retains text without re-generating"
    why_human: "Requires live Anthropic API call and database state verification"
---

# Phase 7: File Generation + Remaining Skills Verification Report

**Phase Goal:** FileGenerationService produces Office-compatible .pptx and self-contained .html files, and 4 new AI skills (ELT External/Internal Status, Team Engagement Map, Workflow Diagram) plus AI-assisted plan generation and sprint summary are wired and functional.
**Verified:** 2026-03-24T18:30:00Z
**Status:** human_needed — all automated checks pass; 4 items require live app/API verification
**Re-verification:** Yes — after gap closure (import path fixes confirmed GREEN)

---

## Re-Verification Summary

| Gap | Previous Status | Current Status | Evidence |
|-----|----------------|----------------|----------|
| ai-plan.test.ts import path | FAILED (ERR_MODULE_NOT_FOUND) | CLOSED | Line 28 now imports `../projects/[projectId]/generate-plan/route`; 2/2 tests GREEN |
| sprint-summary.test.ts import path | FAILED (ERR_MODULE_NOT_FOUND) | CLOSED | Line 28 now imports `../projects/[projectId]/sprint-summary/route`; 3/3 tests GREEN |

Both fixes verified by running `npx vitest run` against each file directly — no regressions in passing tests.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | FileGenerationService (pptx.ts, html.ts, index.ts) exists and routes by skillName | VERIFIED | `bigpanda-app/lib/file-gen/` has types.ts, pptx.ts, html.ts, index.ts; `generateFile()` exported; 6 vitest tests GREEN |
| 2 | generatePptx() writes a real .pptx file to disk | VERIFIED | pptx-generator.test.ts SKILL-05, SKILL-06 pass; uses pptxgenjs `writeFile()` |
| 3 | generateHtml() writes a self-contained .html file to disk | VERIFIED | html-generator.test.ts SKILL-07, SKILL-08 pass; uses `writeFileSync` |
| 4 | stripFences() strips Claude markdown fences before JSON.parse | VERIFIED | pptx-generator.test.ts test 3 passes; handles `` ```json\n...\n``` `` and `` ```\n...\n``` `` |
| 5 | skill-run.ts invokes generateFile() for FILE_SKILLS after orchestrator completes | VERIFIED | `FILE_SKILLS` set exported; `generateFile` imported from `../../lib/file-gen`; skill-run-file.test.ts 2 tests GREEN |
| 6 | 4 SKILL.md files exist with JSON output contracts matching types.ts | VERIFIED | elt-external-status.md, elt-internal-status.md, team-engagement-map.md, workflow-diagram.md all contain "Return a JSON object"; schema matches EltSlideJson / HtmlSkillJson |
| 7 | All 4 new skills enabled in WIRED_SKILLS; biggy-weekly-briefing absent | VERIFIED | WIRED_SKILLS includes all 4; comment explicitly blocks biggy-weekly-briefing |
| 8 | Skill run page shows "Open in app" button when file output exists | VERIFIED | `open-in-app-btn` data-testid present; `outputFilepath && outputId` guard; calls `/api/outputs/{id}/open` |
| 9 | AiPlanPanel renders on plan board page with all required testids | VERIFIED | data-testid ai-plan-panel, generate-plan-btn, commit-tasks-btn, discard-tasks-btn present; board/page.tsx imports and renders AiPlanPanel |
| 10 | generate-plan route exists; proposed tasks NOT written to DB by route | VERIFIED | Route at `[projectId]/generate-plan/route.ts`; returns `{ tasks }` without inserting to tasks table |
| 11 | Unit tests for PLAN-12 API (ai-plan.test.ts) pass GREEN | VERIFIED | 2/2 tests pass; import path fixed from `[id]` to `[projectId]`; params use `{ projectId }` |
| 12 | Unit tests for PLAN-13 API (sprint-summary.test.ts) pass GREEN | VERIFIED | 3/3 tests pass; import path fixed from `[id]` to `[projectId]`; params use `{ projectId }` |
| 13 | SprintSummaryPanel rendered in plan layout with GET-on-mount and Refresh | VERIFIED | Panel has all 3 testids; layout.tsx imports and renders between PlanTabs and children; GET fetch on mount; POST fetch on Refresh |
| 14 | DB migration 0007 adds sprint_summary columns; schema updated | VERIFIED | 0007_sprint_summary.sql exists with `ADD COLUMN IF NOT EXISTS sprint_summary TEXT` and `sprint_summary_at TIMESTAMPTZ`; schema.ts projects table has both columns |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bigpanda-app/lib/file-gen/types.ts` | EltSlideJson, HtmlSkillJson, FileGenParams, FileGenResult interfaces | VERIFIED | All 4 interfaces exported |
| `bigpanda-app/lib/file-gen/pptx.ts` | pptxgenjs-based .pptx writer + stripFences | VERIFIED | `generatePptx()` and `stripFences()` exported |
| `bigpanda-app/lib/file-gen/html.ts` | Plain string .html file writer | VERIFIED | `generateHtml()` with recursive mkdirSync |
| `bigpanda-app/lib/file-gen/index.ts` | generateFile() public API routing to pptx or html | VERIFIED | SKILL_EXT map routes to correct writer |
| `bigpanda-app/lib/file-gen/__tests__/pptx-generator.test.ts` | vitest tests for PPTX generation | VERIFIED | 3 tests, all GREEN |
| `bigpanda-app/lib/file-gen/__tests__/html-generator.test.ts` | vitest tests for HTML generation | VERIFIED | 3 tests, all GREEN |
| `bigpanda-app/worker/jobs/__tests__/skill-run-file.test.ts` | vitest tests for FILE_SKILLS wiring | VERIFIED | 2 tests, all GREEN |
| `bigpanda-app/worker/jobs/skill-run.ts` | FILE_SKILLS check + generateFile() call | VERIFIED | FILE_SKILLS exported; generateFile() called post-orchestrator |
| `bigpanda-app/skills/elt-external-status.md` | JSON output contract, EltSlideJson schema | VERIFIED | Contains "Return a JSON object" with slides/heading/bullets |
| `bigpanda-app/skills/elt-internal-status.md` | JSON output contract, EltSlideJson schema | VERIFIED | Contains "Return a JSON object" |
| `bigpanda-app/skills/team-engagement-map.md` | JSON output contract, HtmlSkillJson schema | VERIFIED | Contains "Return a JSON object" |
| `bigpanda-app/skills/workflow-diagram.md` | JSON output contract, HtmlSkillJson schema | VERIFIED | Contains "Return a JSON object" |
| `bigpanda-app/skills/ai-plan-generator.md` | Inline prompt for PLAN-12 skill | VERIFIED | File exists in skills/ directory |
| `bigpanda-app/skills/sprint-summary-generator.md` | System prompt for PLAN-13 skill | VERIFIED | File exists in skills/ directory |
| `bigpanda-app/components/SkillsTabClient.tsx` | WIRED_SKILLS includes 4 new skills | VERIFIED | All 4 added; biggy-weekly-briefing absent from set |
| `bigpanda-app/app/customer/[id]/skills/[runId]/page.tsx` | "Open in app" button on completion | VERIFIED | open-in-app-btn testid; outputFilepath/outputId state |
| `bigpanda-app/components/AiPlanPanel.tsx` | Proposed tasks panel with commit/discard | VERIFIED | All 4 testids; calls /api/projects/{id}/generate-plan and /api/tasks |
| `bigpanda-app/app/api/projects/[projectId]/generate-plan/route.ts` | POST endpoint; tasks not auto-committed | VERIFIED | Exists; returns { tasks }; no tasks table insert |
| `bigpanda-app/app/customer/[id]/plan/board/page.tsx` | AiPlanPanel rendered above PhaseBoard | VERIFIED | Imports and renders AiPlanPanel |
| `bigpanda-app/components/SprintSummaryPanel.tsx` | Collapsible panel; GET on mount; POST on Refresh | VERIFIED | All 3 testids; fetch patterns confirmed |
| `bigpanda-app/app/api/projects/[projectId]/sprint-summary/route.ts` | GET + POST routes; no outputs table insert | VERIFIED | Both handlers; no outputs insert in POST path |
| `bigpanda-app/app/customer/[id]/plan/layout.tsx` | SprintSummaryPanel rendered in plan layout | VERIFIED | Imports and renders SprintSummaryPanel between PlanTabs and children |
| `bigpanda-app/db/migrations/0007_sprint_summary.sql` | ALTER TABLE adds sprint_summary columns | VERIFIED | Correct SQL; IF NOT EXISTS guard |
| `bigpanda-app/app/api/__tests__/ai-plan.test.ts` | PLAN-12 unit tests — 2 tests GREEN | VERIFIED | Import path corrected to `[projectId]`; params use `{ projectId }`; 2/2 tests GREEN |
| `bigpanda-app/app/api/__tests__/sprint-summary.test.ts` | PLAN-13 unit tests — 3 tests GREEN | VERIFIED | Import path corrected to `[projectId]`; params use `{ projectId }`; 3/3 tests GREEN |
| `tests/e2e/phase7.spec.ts` | 6 active E2E tests | VERIFIED | 6 real-assertion tests present; no stub markers; gotoFirstProject helper implemented |
| `bigpanda-app/package.json` | docx, pptxgenjs, vitest installed | VERIFIED | docx@^9.6.1, pptxgenjs@^4.0.1, vitest@^4.1.1 all present |
| `bigpanda-app/db/schema.ts` | sprint_summary + sprint_summary_at on projects | VERIFIED | Lines 68-69 confirmed |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lib/file-gen/index.ts` | `worker/jobs/skill-run.ts` | `import { generateFile }` | WIRED | skill-run.ts line 15: `import { generateFile } from '../../lib/file-gen'` |
| `skill-run.ts` | `db.outputs` | `filepath, filename` in insert | WIRED | FILE_SKILLS branch sets filepath/filename; outputs insert includes both fields |
| `SkillsTabClient.tsx` | `skills/elt-external-status.md` | `WIRED_SKILLS.has('elt-external-status')` | WIRED | WIRED_SKILLS includes all 4 new skills; card wiring confirmed |
| `AiPlanPanel.tsx` | `[projectId]/generate-plan/route.ts` | POST `/api/projects/{projectId}/generate-plan` | WIRED | Fetch call matches the actual route path |
| `AiPlanPanel.tsx` | `app/api/tasks/route.ts` | POST `/api/tasks` per committed task | WIRED | `fetch('/api/tasks', { method: 'POST', ... })` |
| `SprintSummaryPanel.tsx` | `[projectId]/sprint-summary/route.ts` | GET on mount + POST on Refresh | WIRED | GET fetch in useEffect; POST fetch in handleRefresh |
| `sprint-summary/route.ts` | `db.schema projects table` | `UPDATE projects SET sprint_summary` | WIRED | Route calls `db.update(projects).set({ sprint_summary, sprint_summary_at })` |
| `ai-plan.test.ts` | `[projectId]/generate-plan/route.ts` | import from `../projects/[projectId]/...` | WIRED | Segment fixed; module resolves correctly; 2/2 tests GREEN |
| `sprint-summary.test.ts` | `[projectId]/sprint-summary/route.ts` | import from `../projects/[projectId]/...` | WIRED | Segment fixed; module resolves correctly; 3/3 tests GREEN |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SKILL-05 | 07-01, 07-02, 07-03, 07-04, 07-07 | ELT External Status — 5-slide .pptx | SATISFIED | pptx.ts generates .pptx; elt-external-status.md with correct JSON schema; in WIRED_SKILLS; FILE_SKILLS wired |
| SKILL-06 | 07-01, 07-02, 07-03, 07-04, 07-07 | ELT Internal Status — internal .pptx | SATISFIED | Same file-gen path; elt-internal-status.md present; in WIRED_SKILLS and FILE_SKILLS |
| SKILL-07 | 07-01, 07-02, 07-03, 07-04, 07-07 | Team Engagement Map — self-contained HTML | SATISFIED | html.ts generates HTML; team-engagement-map.md present; in WIRED_SKILLS and FILE_SKILLS |
| SKILL-08 | 07-01, 07-02, 07-03, 07-04, 07-07 | Workflow Diagram — before/after HTML | SATISFIED | workflow-diagram.md present; in WIRED_SKILLS and FILE_SKILLS; html.ts handles both HTML skills |
| PLAN-12 | 07-01, 07-05, 07-07 | AI-assisted plan generation | SATISFIED | Route + component + wiring all correct; ai-plan.test.ts 2/2 tests GREEN (import path fixed) |
| PLAN-13 | 07-01, 07-06, 07-07 | Weekly sprint summary | SATISFIED | DB migration + schema + route + component + layout all correct; sprint-summary.test.ts 3/3 tests GREEN (import path fixed) |
| SKILL-09 | None (explicitly deferred) | Biggy Weekly Briefing | DEFERRED — NOT IN SCOPE | 07-CONTEXT.md documents SKILL-09 removed from Phase 7; biggy-weekly-briefing intentionally absent from WIRED_SKILLS; REQUIREMENTS.md should be updated to reflect deferral to Phase 8 |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bigpanda-app/components/SkillsTabClient.tsx` | 33-36 | Skill card descriptions contain "coming soon" text for all 4 new enabled skills | Info | Cards are functionally enabled (in WIRED_SKILLS); description text is cosmetic-only and does not block functionality |

No blocker anti-patterns remain. Both previously-blocker import path issues are resolved.

---

### Human Verification Required

#### 1. Skill Cards — Visual Enabled State

**Test:** Start dev server (`cd bigpanda-app && npm run dev`). Navigate to any customer Skills tab.
**Expected:** ELT External Status, ELT Internal Status, Team Engagement Map, Workflow Diagram cards are visible and NOT grayed out. Biggy Weekly Briefing absent or grayed out.
**Why human:** CSS opacity class determines visual state; WIRED_SKILLS logic confirmed programmatically but render fidelity needs visual check.

#### 2. AiPlanPanel + SprintSummaryPanel Render

**Test:** Navigate to any customer Plan tab (board sub-page).
**Expected:** "Generate plan" button visible above Phase Board. Sprint Summary panel visible at page top with Refresh button.
**Why human:** Server-side rendering, hydration, and layout boundary interactions require live app verification.

#### 3. File Generation End-to-End (API key required)

**Test:** Trigger ELT External Status from Skills tab; wait for completion.
**Expected:** "Open in PowerPoint" button appears; clicking it opens a .pptx file without a corruption dialog; file exists at `~/Documents/BigPanda Projects/{customer}/`.
**Why human:** Requires live Anthropic API call, real Claude JSON output, pptxgenjs binary write, and OS `open` command — cannot be mocked in static verification.

#### 4. Sprint Summary Persistence

**Test:** Click Refresh on Sprint Summary panel; wait; reload page.
**Expected:** Summary text persists across reload (GET on mount returns stored text; no re-generation on reload).
**Why human:** Requires live API call and database state persistence verification.

---

### Gaps Summary

No automated gaps remain. Both previously-identified blockers are resolved:

- `ai-plan.test.ts` line 28 now correctly imports from `../projects/[projectId]/generate-plan/route`; the `params` argument passes `{ projectId }` throughout; 2/2 tests GREEN confirmed by `npx vitest run`.
- `sprint-summary.test.ts` line 28 now correctly imports from `../projects/[projectId]/sprint-summary/route`; the `params` argument passes `{ projectId }` throughout; 3/3 tests GREEN confirmed by `npx vitest run`.

All 7 requirements (SKILL-05 through SKILL-08, PLAN-12, PLAN-13, and deferred SKILL-09) are at their correct status. Phase 7 is fully automated-verified and ready for final human sign-off on the 4 live-app items above.

---

_Initial Verified: 2026-03-24T18:12:30Z_
_Re-verified: 2026-03-24T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
