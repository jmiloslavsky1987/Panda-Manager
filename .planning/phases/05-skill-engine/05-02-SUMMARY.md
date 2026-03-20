---
phase: 05-skill-engine
plan: 02
subsystem: ai, worker, database
tags: [anthropic-sdk, bullmq, skill-orchestrator, token-budget, streaming, drizzle]

# Dependency graph
requires:
  - phase: 05-skill-engine
    plan: 01
    provides: "@anthropic-ai/sdk, skillRuns/skillRunChunks schema, SKILL.md stubs"

provides:
  - "SkillOrchestrator class — pure service, no HTTP/BullMQ imports, token budget guard, SKILL.md hot-reload"
  - "buildSkillContext — assembles all workspace data into Claude userMessage string"
  - "BullMQ skill-run job handler — follows health-refresh pattern"
  - "worker/index.ts dispatch map updated with skill-run entry"
  - "SKILL_RUN lock ID 1007 added to lock-ids.ts"

affects:
  - 05-03-skill-api (SSE route wires SkillOrchestrator directly)
  - 05-04-skill-ui (UI triggers skill-run jobs via queue)
  - all downstream plans that invoke skills

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SkillOrchestrator pattern: pure service class, new per-process singleton, zero HTTP/BullMQ imports"
    - "Token budget guard: countTokens({model, system, messages}) before every Claude stream call"
    - "SKILL.md hot-reload: readFile at invocation time — never module-level cached"
    - "SKILL_NOT_FOUND error format: Error('SKILL_NOT_FOUND:{skillName}') on ENOENT"
    - "Chunk batching: flush every 10 text deltas + final flush after stream.finalMessage()"
    - "__DONE__ sentinel inserted as final chunk row so SSE endpoint can detect completion"
    - "__dirname-anchored SKILLS_DIR in worker context: path.join(__dirname, '../../skills')"

key-files:
  created:
    - bigpanda-app/lib/skill-context.ts
    - bigpanda-app/lib/skill-orchestrator.ts
    - bigpanda-app/worker/jobs/skill-run.ts
  modified:
    - bigpanda-app/worker/lock-ids.ts
    - bigpanda-app/worker/index.ts

key-decisions:
  - "SkillOrchestrator uses process.cwd()/skills as default skillsDir; worker overrides with __dirname-anchored path to ensure correct resolution regardless of npm run invocation directory"
  - "Chunk batching at 10 deltas balances write latency vs. DB connection overhead; avoids out-of-order seq numbers from concurrent inserts"
  - "full_output reconstructed from chunks (not stream.accumulated) — avoids SDK version incompatibility risk"
  - "withTruncatedHistory() rebuilds message from raw historyEntries slice — clean implementation without string manipulation"

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 5 Plan 02: Skill Orchestrator + BullMQ Handler Summary

**SkillOrchestrator class (pure service) + skill-context assembler + BullMQ skill-run handler wired into dispatch map — core engine for all 5 skills with 80k token budget guard and SKILL.md hot-reload**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-20T18:49:42Z
- **Completed:** 2026-03-20T18:52:01Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Created `lib/skill-context.ts`: `buildSkillContext()` loads project + workspace data via existing queries, serializes all sections (workstreams, open actions, open risks, milestones, stakeholders, engagement history, key decisions, user-provided input) into a markdown userMessage string; `withTruncatedHistory(keepLast)` rebuilds with fewer history entries for token budget trimming
- Created `lib/skill-orchestrator.ts`: `SkillOrchestrator` class with `run()` method — loads SKILL.md at invocation time (hot-reload, never cached), calls `countTokens` for 80k budget guard with automatic truncation, streams Claude output to `skill_run_chunks` table in batches of 10, writes `__DONE__` sentinel, reconstructs `full_output` from DB chunks
- Created `worker/jobs/skill-run.ts`: BullMQ handler following `health-refresh.ts` pattern exactly — updates `skill_runs.status` to running/completed/failed, uses `__dirname`-anchored SKILLS_DIR for reliable file resolution in worker context
- Updated `worker/lock-ids.ts` with `SKILL_RUN: 1007` and `worker/index.ts` dispatch map with `'skill-run': skillRun` entry

## Task Commits

Each task was committed atomically:

1. **Task 1: skill-context.ts — DB context assembler for Claude** - `4defef9` (feat)
2. **Task 2: SkillOrchestrator + BullMQ skill-run handler + dispatch map update** - `291d152` (feat)

## Files Created/Modified

- `bigpanda-app/lib/skill-context.ts` — buildSkillContext() assembles all workspace sections into markdown userMessage; withTruncatedHistory() returns SkillContext with fewer history entries
- `bigpanda-app/lib/skill-orchestrator.ts` — SkillOrchestrator class: SKILL.md hot-reload, countTokens budget guard, Claude streaming, chunk batching, __DONE__ sentinel
- `bigpanda-app/worker/jobs/skill-run.ts` — BullMQ handler: updates skill_runs status lifecycle, delegates to SkillOrchestrator
- `bigpanda-app/worker/lock-ids.ts` — SKILL_RUN: 1007 added
- `bigpanda-app/worker/index.ts` — skill-run import + dispatch map entry

## Decisions Made

- SkillOrchestrator uses `process.cwd()/skills` as default skillsDir; worker overrides with `path.join(__dirname, '../../skills')` to ensure correct SKILL.md resolution regardless of npm run invocation directory
- Chunk batching at 10 deltas balances write latency vs DB connection overhead; avoids concurrent-insert sequence number races
- `full_output` is reconstructed from skill_run_chunks rows (not stream.accumulated) — avoids SDK version incompatibility risk where `.accumulated` may not exist
- `withTruncatedHistory()` rebuilds the full sections array from raw `historyEntries` source data — clean approach that avoids brittle string matching

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Self-Check

### Files exist
- `bigpanda-app/lib/skill-context.ts`: FOUND
- `bigpanda-app/lib/skill-orchestrator.ts`: FOUND
- `bigpanda-app/worker/jobs/skill-run.ts`: FOUND
- `bigpanda-app/worker/lock-ids.ts`: modified FOUND
- `bigpanda-app/worker/index.ts`: modified FOUND

### Commits exist
- `4defef9`: Task 1 — skill-context.ts
- `291d152`: Task 2 — orchestrator + handler + dispatch map

### TypeScript
- Pre-existing error count: 37 lines
- Post-plan error count: 37 lines (no increase)
- Skill files: 0 new errors

## Self-Check: PASSED
