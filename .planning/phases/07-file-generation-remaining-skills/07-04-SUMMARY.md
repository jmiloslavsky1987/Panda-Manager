---
phase: 07-file-generation-remaining-skills
plan: 04
subsystem: worker
tags: [file-gen, skill-run, bullmq, integration, tdd]
dependency_graph:
  requires: [07-02, 07-03]
  provides: [file-skill-integration]
  affects: [outputs-library, skill-run-worker]
tech_stack:
  added: [docx@9.6.1]
  patterns: [FILE_SKILLS-set, post-orchestrator-file-generation, graceful-fallback]
key_files:
  created: []
  modified:
    - bigpanda-app/worker/jobs/skill-run.ts
    - bigpanda-app/worker/jobs/__tests__/skill-run-file.test.ts
    - bigpanda-app/package.json
decisions:
  - FILE_SKILLS exported from skill-run.ts for testability without leaking into app layer
  - generateFile() called after orchestrator.run() completes — pure Claude streaming layer stays clean
  - Generation errors caught and logged; output row still inserted with raw content (graceful degradation)
  - getProjectById() throws on not-found; wrapped in null-check for safety
metrics:
  duration: 3min
  completed_date: "2026-03-24"
---

# Phase 7 Plan 4: File Generation Integration into skill-run.ts Summary

Wire the FileGenerationService into the skill-run BullMQ job handler so that on-demand runs of elt-external-status, elt-internal-status, team-engagement-map, and workflow-diagram produce a file on disk and register filepath/filename in the outputs row.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Install docx package | dec1e04 | bigpanda-app/package.json |
| 2 | Extend skill-run.ts with FILE_SKILLS + generateFile() | 345a9ec | skill-run.ts, skill-run-file.test.ts |

## What Was Built

- **FILE_SKILLS Set:** Exported constant containing the 4 file-producing skill names. Checked post-orchestrator to gate `generateFile()` call.
- **File generation integration:** After `orchestrator.run()` completes and the run row is fetched, `getProjectById()` is called to get project context, then `generateFile({ skillName, outputText, project })` produces the PPTX or HTML file on disk.
- **Graceful fallback:** If `generateFile()` throws (e.g. malformed JSON from Claude, disk write error), the error is logged and the outputs row is still inserted with raw content — the job does not fail.
- **filepath/filename on outputs row:** Non-null values set when file generation succeeds; both remain null for non-file skills (backwards compatible).
- **docx package:** Installed at `docx@9.6.1` — required by `lib/file-gen/pptx.ts` module chain.

## Decisions Made

- `FILE_SKILLS` exported for testability — vitest mocks all dependencies (db, orchestrator, file-gen, queries) and verifies the Set membership and call chain without touching disk or DB.
- `generateFile()` placed in the `skill-run.ts` generic handler only — per-skill scheduled handlers have their own output paths.
- SkillOrchestrator remains a pure Claude streaming layer — file generation is entirely post-orchestrator.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `bigpanda-app/worker/jobs/skill-run.ts` exists and exports `FILE_SKILLS`
- [x] `bigpanda-app/worker/jobs/__tests__/skill-run-file.test.ts` passes 2/2 tests GREEN
- [x] `bigpanda-app/package.json` contains `"docx"` dependency
- [x] Commits dec1e04 and 345a9ec exist in git log

## Self-Check: PASSED
