---
phase: 05-skill-engine
plan: "05"
subsystem: worker
tags: [skill-handlers, bullmq, orchestrator, queries]
dependency_graph:
  requires: [05-02, 05-03, 05-04]
  provides: [skill-handler-weekly-customer-status, skill-handler-meeting-summary, skill-handler-morning-briefing, skill-handler-context-updater, skill-handler-handoff-doc-generator, getSkillRuns, getLatestMorningBriefing]
  affects: [worker-dispatch-map, dashboard-briefing-panel, skills-tab-recent-runs, drafts-inbox]
tech_stack:
  added: []
  patterns: [SkillOrchestrator-delegation, scheduled-vs-on-demand-handler-split, advisory-lock-on-scheduled-jobs]
key_files:
  created:
    - bigpanda-app/worker/jobs/weekly-customer-status.ts
    - bigpanda-app/worker/jobs/meeting-summary.ts
    - bigpanda-app/worker/jobs/morning-briefing.ts
    - bigpanda-app/worker/jobs/handoff-doc-generator.ts
  modified:
    - bigpanda-app/lib/queries.ts
    - bigpanda-app/worker/index.ts
    - bigpanda-app/worker/jobs/context-updater.ts
    - bigpanda-app/app/customer/[id]/skills/page.tsx
decisions:
  - "Scheduled handlers (weekly-customer-status, morning-briefing, context-updater) create their own skill_runs row; on-demand handlers (meeting-summary, handoff-doc-generator) receive runId from skill-run.ts via job.data"
  - "Weekly Customer Status inserts into drafts table with draft_type='email' after orchestrator completion"
  - "morning-briefing and context-updater use getActiveProjects() to fan out across all active projects"
  - "skills/page.tsx updated to use getSkillRuns() from queries.ts for consistency"
metrics:
  duration: 2min
  completed_date: "2026-03-20"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 8
---

# Phase 5 Plan 05: Skill Handler Wiring Summary

5 skill BullMQ handlers fully wired to SkillOrchestrator with output/draft registration, plus getSkillRuns and getLatestMorningBriefing queries added.

## Objective

Wire all 5 skill handlers (Weekly Customer Status, Meeting Summary, Morning Briefing, Context Updater, Handoff Doc Generator) to the SkillOrchestrator, register completed outputs in the outputs table, wire Weekly Customer Status to write email drafts, and add getSkillRuns + getLatestMorningBriefing query functions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add queries + wire 5 skill handlers + update dispatch map | 91dfb6d | 8 files |

## What Was Built

**New query functions in `queries.ts`:**
- `getSkillRuns(projectId, limit?)` — fetches recent skill_runs rows ordered by created_at DESC, used by Skills tab Recent Runs section
- `getLatestMorningBriefing()` — fetches most recent completed morning-briefing run, used by Dashboard Briefing panel

**Skill handlers (all call `orchestrator.run()` with correct skillName):**

1. `weekly-customer-status.ts` — Scheduled handler; creates skill_runs row, calls SkillOrchestrator, inserts into outputs table, then inserts email draft into drafts table (draft_type='email', status='pending')
2. `meeting-summary.ts` — On-demand handler; receives runId from skill-run.ts via job.data, calls SkillOrchestrator, inserts into outputs table
3. `morning-briefing.ts` — Scheduled handler; fans out across all active projects (or single projectId from job.data), calls SkillOrchestrator, inserts into outputs table
4. `context-updater.ts` — Scheduled handler (upgraded from stub); retains advisory lock pattern, fans out across active projects, calls SkillOrchestrator, inserts into outputs table
5. `handoff-doc-generator.ts` — On-demand handler; same pattern as meeting-summary, calls SkillOrchestrator, inserts into outputs table

**Worker dispatch map (`worker/index.ts`) additions:**
- `'weekly-customer-status'` → weeklyCustomerStatus
- `'meeting-summary'` → meetingSummary
- `'handoff-doc-generator'` → handoffDocGenerator

(context-updater and weekly-briefing were already present from Phase 4 — no changes to those entries)

## Decisions Made

1. Scheduled handlers (weekly-customer-status, morning-briefing, context-updater) create their own skill_runs row; on-demand handlers (meeting-summary, handoff-doc-generator) receive runId from skill-run.ts via job.data — clean separation of concerns
2. Weekly Customer Status inserts into drafts table with draft_type='email' after orchestrator completion, enabling Drafts Inbox review flow
3. morning-briefing and context-updater use `getActiveProjects()` to fan out across all active projects; individual project can be targeted via job.data.projectId
4. skills/page.tsx refactored to use `getSkillRuns()` from queries.ts for consistency (was using inline db query)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `getSkillRuns` and `getLatestMorningBriefing` exported from queries.ts: PASS
- `weekly-customer-status`, `meeting-summary`, `handoff-doc-generator` in worker dispatch map: PASS
- `SkillOrchestrator` imported and used in weekly-customer-status.ts: PASS
- `drafts` table insert present in weekly-customer-status.ts: PASS
- TypeScript: zero new errors introduced (pre-existing Redis type + settings errors unchanged)

## Self-Check: PASSED

Files exist:
- bigpanda-app/worker/jobs/weekly-customer-status.ts: FOUND
- bigpanda-app/worker/jobs/meeting-summary.ts: FOUND
- bigpanda-app/worker/jobs/morning-briefing.ts: FOUND
- bigpanda-app/worker/jobs/handoff-doc-generator.ts: FOUND
- bigpanda-app/worker/jobs/context-updater.ts: FOUND (modified)
- bigpanda-app/lib/queries.ts: FOUND (modified)

Commit exists: 91dfb6d FOUND
