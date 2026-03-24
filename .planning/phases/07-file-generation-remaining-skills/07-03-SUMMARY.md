---
phase: 07-file-generation-remaining-skills
plan: 03
subsystem: ui
tags: [skills, claude, pptx, html, file-generation]

# Dependency graph
requires:
  - phase: 07-02
    provides: FileGenerationService with EltSlideJson and HtmlSkillJson TypeScript interfaces
provides:
  - 4 SKILL.md system prompt files with JSON output contracts for elt-external-status, elt-internal-status, team-engagement-map, workflow-diagram
  - WIRED_SKILLS updated to enable all 4 new skills in Skills tab UI
  - "Open in app" button on skill run completion page for file-producing skills
affects: [07-04, 07-05, 07-06, 07-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SKILL.md prompt files end with strict JSON-only instruction matching TypeScript interface exactly
    - fetchOutputRow() queries /api/outputs?projectId=&skillType= after run completes to surface file artifact
    - getAppLabel() maps skill name to human-readable app type (PowerPoint/Browser/Finder)

key-files:
  created:
    - bigpanda-app/skills/elt-external-status.md
    - bigpanda-app/skills/elt-internal-status.md
    - bigpanda-app/skills/team-engagement-map.md
    - bigpanda-app/skills/workflow-diagram.md
  modified:
    - bigpanda-app/components/SkillsTabClient.tsx
    - bigpanda-app/app/customer/[id]/skills/[runId]/page.tsx

key-decisions:
  - "customer-project-tracker added to WIRED_SKILLS (it was missing from the set despite being in ALL_SKILLS — plan target state includes it)"
  - "fetchOutputRow fetches most recent output by project_id + skill_name — acceptable for Phase 7 since only one active run per skill"
  - "biggy-weekly-briefing intentionally excluded from WIRED_SKILLS per locked decision; comment added to set for clarity"

patterns-established:
  - "SKILL.md contract pattern: ELT skills return EltSlideJson (title/customer/period/slides[]), HTML skills return HtmlSkillJson (title/html)"
  - "Run page Open in app button: visible only when status=done AND outputFilepath is truthy AND outputId is set"

requirements-completed: [SKILL-05, SKILL-06, SKILL-07, SKILL-08]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 07 Plan 03: SKILL.md Files + Skills UI Wiring Summary

**4 SKILL.md system prompts with typed JSON output contracts authored, 4 skills enabled in WIRED_SKILLS, and "Open in app" button added to skill run completion page**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T20:19:20Z
- **Completed:** 2026-03-24T20:27:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Authored elt-external-status.md (confidence-framed 5-slide external ELT deck, EltSlideJson contract)
- Authored elt-internal-status.md (direct internal ELT deck with RAG, EltSlideJson contract)
- Authored team-engagement-map.md (self-contained HTML team map, HtmlSkillJson contract)
- Authored workflow-diagram.md (before/after workflow viz with tab switching, HtmlSkillJson contract)
- Added 4 new skills to WIRED_SKILLS; biggy-weekly-briefing remains grayed out per locked decision
- Skill run page now queries outputs API after completion and renders "Open in app" button when filepath is set

## Task Commits

Each task was committed atomically:

1. **Task 1: Author 4 SKILL.md files with JSON output contracts** - `4f36594` (feat)
2. **Task 2: Enable 4 skills in WIRED_SKILLS + add Open in app button** - `8cb72cc` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `bigpanda-app/skills/elt-external-status.md` - System prompt for external ELT slide deck; returns EltSlideJson
- `bigpanda-app/skills/elt-internal-status.md` - System prompt for internal ELT status deck; returns EltSlideJson
- `bigpanda-app/skills/team-engagement-map.md` - System prompt for HTML team engagement map; returns HtmlSkillJson
- `bigpanda-app/skills/workflow-diagram.md` - System prompt for HTML before/after workflow diagram; returns HtmlSkillJson
- `bigpanda-app/components/SkillsTabClient.tsx` - WIRED_SKILLS extended with 4 new skills; customer-project-tracker also added (was missing)
- `bigpanda-app/app/customer/[id]/skills/[runId]/page.tsx` - fetchOutputRow() + getAppLabel() added; Open in app button rendered on completion

## Decisions Made
- `customer-project-tracker` was in ALL_SKILLS but missing from WIRED_SKILLS — added it alongside the 4 new skills to match the plan's target state
- `fetchOutputRow()` queries `/api/outputs?projectId=&skillType=` (most-recent by skill name) — no idempotency_key filter needed since only one active run per skill in Phase 7
- Pre-existing TS errors (ioredis/bullmq version mismatch in jobs and skills run routes) are out of scope — no new errors introduced in modified files

## Deviations from Plan

None — plan executed exactly as written. The `customer-project-tracker` inclusion in WIRED_SKILLS was an observation that it was already missing (it was in the plan's target WIRED_SKILLS set), not a deviation.

## Issues Encountered
- Pre-existing TypeScript errors in `app/api/jobs/trigger/route.ts` and `app/api/skills/[skillName]/run/route.ts` (ioredis version mismatch with bullmq's bundled ioredis). These are out-of-scope pre-existing issues — zero new TS errors introduced in files modified by this plan.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- All 4 SKILL.md files are on disk in `bigpanda-app/skills/` — SkillOrchestrator reads them at runtime via `__dirname`-anchored path
- FileGenerationService (07-02) can now be invoked by wiring these 4 skills to skill handlers in the next plan
- "Open in app" button infrastructure is complete — skill handlers must write the `filepath` column to the outputs table on completion for the button to appear

---
*Phase: 07-file-generation-remaining-skills*
*Completed: 2026-03-24*
