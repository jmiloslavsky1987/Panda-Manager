---
phase: 21-teams-tab-+-architecture-tab
plan: "05"
subsystem: ai-skills
tags: [claude, skill-context, skill-orchestrator, team-engagement-map, workflow-diagram, html-export]

# Dependency graph
requires:
  - phase: 21-01
    provides: getTeamsTabData query and TeamsTabData interface
  - phase: 21-02
    provides: getArchTabData query and ArchTabData interface
provides:
  - buildTeamsSkillContext — assembles business outcomes, architecture overview, E2E workflows, focus areas for team-engagement-map
  - buildArchSkillContext — assembles before state, architecture integrations, team onboarding for workflow-diagram
  - Updated team-engagement-map.md skill prompt — 5-section structured HTML with design tokens
  - Updated workflow-diagram.md skill prompt — 2-tab structured HTML with amber divider and Team Onboarding table
  - skill-orchestrator.ts dispatch by skill name to per-skill context builders
affects: [21-06, skill-run tests, TEAMS-10, ARCH-10, ARCH-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-skill context builders: separate files for skills requiring domain-specific DB queries to avoid loading unrelated tables"
    - "Orchestrator dispatch by skill name before shared buildSkillContext call — per-skill builders short-circuit the generic path"
    - "Token truncation guard: per-skill contexts skip withTruncatedHistory (no engagement history to truncate)"

key-files:
  created:
    - bigpanda-app/lib/skill-context-teams.ts
    - bigpanda-app/lib/skill-context-arch.ts
  modified:
    - bigpanda-app/skills/team-engagement-map.md
    - bigpanda-app/skills/workflow-diagram.md
    - bigpanda-app/lib/skill-orchestrator.ts

key-decisions:
  - "Per-skill context builders rather than extending shared buildSkillContext — avoids token cost for unrelated skills loading 6 new tables"
  - "skillSpecificContext dispatched by name in orchestrator; null for all other skills — zero impact on existing skill behavior"
  - "Truncation guard added: per-skill contexts skip withTruncatedHistory since they contain no engagement history section"
  - "team-engagement-map includes architectureIntegrations from TeamsTabData for the Architecture Overview section (section 2 of 5)"

patterns-established:
  - "Pattern: per-skill builders in skill-context-{name}.ts when a skill needs domain-specific DB tables different from the shared workspace"
  - "Pattern: orchestrator dispatch block checks skillName before shared context path, null guard keeps fallthrough clean"

requirements-completed: [TEAMS-10, ARCH-10, ARCH-12]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 21 Plan 05: Skill Context Builders + Prompt Rewrites Summary

**Per-skill context builders (buildTeamsSkillContext, buildArchSkillContext) and rewritten skill system prompts delivering structured HTML exports that mirror the Teams and Architecture tab views using live DB data**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-27T04:40:24Z
- **Completed:** 2026-03-27T04:43:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Rewrote team-engagement-map.md: 5-section HTML export spec with design tokens (ADR #1e40af, Biggy #6d28d9, status pill hex values, inline CSS requirement)
- Rewrote workflow-diagram.md: 2-tab HTML spec with Before BigPanda flow, Current & Future State with ADR/Biggy tracks, amber divider, Team Onboarding table
- Created buildTeamsSkillContext querying business outcomes, architecture integrations (for Architecture Overview), E2E workflows, and focus areas
- Created buildArchSkillContext querying before state, architecture integrations, and team onboarding status
- Updated skill-orchestrator.ts to dispatch to per-skill builders by name; truncation guard skips per-skill contexts; all other skills unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite skill system prompts for team-engagement-map and workflow-diagram** - `26a4974` (feat)
2. **Task 2: Create buildTeamsSkillContext and buildArchSkillContext, wire into orchestrator** - `559bbf3` (feat)

**Plan metadata:** (final docs commit)

## Files Created/Modified
- `bigpanda-app/skills/team-engagement-map.md` - Rewritten system prompt: 5-section structure with design tokens and inline CSS rules
- `bigpanda-app/skills/workflow-diagram.md` - Rewritten system prompt: 2-tab view with amber divider, Team Onboarding table spec
- `bigpanda-app/lib/skill-context-teams.ts` - New: buildTeamsSkillContext assembles Teams tab data into markdown context
- `bigpanda-app/lib/skill-context-arch.ts` - New: buildArchSkillContext assembles Architecture tab data into markdown context
- `bigpanda-app/lib/skill-orchestrator.ts` - Added imports and dispatch block; truncation guard for per-skill contexts

## Decisions Made
- Per-skill context builders rather than extending shared buildSkillContext — the research phase identified that loading 6 new tables for all skills has token/performance cost; per-skill builders only query what their skill needs
- team-engagement-map context includes architectureIntegrations from TeamsTabData because the UI's Architecture Overview section (section 2 of 5) requires it — the TeamsTabData query already fetches it
- Token truncation guard added as a Rule 1 auto-fix: per-skill contexts have no engagement history, so `withTruncatedHistory` would have operated on `context.userMessage` (the generic context) rather than the skill-specific context if not guarded

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Truncation logic guard for per-skill context path**
- **Found during:** Task 2 (skill-orchestrator.ts update)
- **Issue:** After adding `skillSpecificContext`, the existing truncation block `context.withTruncatedHistory(5)` would overwrite `messages[0]` with the generic context even when a skill-specific context was in use — effectively discarding the per-skill context under token pressure
- **Fix:** Wrapped the truncation block in `if (skillSpecificContext === null)` guard so it only applies to the shared buildSkillContext path
- **Files modified:** bigpanda-app/lib/skill-orchestrator.ts
- **Verification:** Code review; tsc --noEmit passes with no errors in skill files
- **Committed in:** 559bbf3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - correctness bug)
**Impact on plan:** Fix essential for correct per-skill context behavior under token budget pressure. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Per-skill context builders are wired and ready; skill runs for team-engagement-map and workflow-diagram will use domain-specific context
- Plan 21-06 can proceed: it depends on these context builders being available
- TypeScript compiles cleanly for all skill-related files

---
*Phase: 21-teams-tab-+-architecture-tab*
*Completed: 2026-03-27*
