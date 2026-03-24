---
phase: 06-mcp-integrations
plan: "06"
subsystem: worker
tags: [skill, mcp, bullmq, scheduler, customer-project-tracker]
dependency_graph:
  requires: [06-05, 06-03]
  provides: [SKILL-10 job handler, customer-project-tracker SKILL.md, scheduler registration]
  affects: [worker/index.ts, worker/scheduler.ts, SkillsTabClient]
tech_stack:
  added: []
  patterns: [MCPClientPool.getServersForSkill, SkillOrchestrator.run with mcpServers, morning-briefing handler pattern]
key_files:
  created:
    - bigpanda-app/skills/customer-project-tracker.md
    - bigpanda-app/worker/jobs/customer-project-tracker.ts
  modified:
    - bigpanda-app/worker/index.ts
    - bigpanda-app/worker/scheduler.ts
    - bigpanda-app/components/SkillsTabClient.tsx
decisions:
  - "Fixed cron schedule (0 9 * * *) outside JOB_SCHEDULE_MAP — AppSettings.schedule has no key for this skill"
  - "actions table uses 'due' column not 'due_date' — adapted from plan spec to match actual schema"
  - "Added data-testid='skill-card' to all skill cards in SkillsTabClient — required for E2E test criterion"
metrics:
  duration: "~2 minutes"
  completed: "2026-03-24"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 3
---

# Phase 06 Plan 06: Customer Project Tracker — SKILL-10 Summary

**One-liner:** SKILL-10 wired end-to-end: SKILL.md system prompt + BullMQ job handler using MCPClientPool + dispatch map + daily 9am cron registration.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create customer-project-tracker.md SKILL.md | 2774d74 |
| 2 | Job handler + worker/index.ts + scheduler.ts registration | 623ad04 |

## What Was Built

**SKILL.md (`bigpanda-app/skills/customer-project-tracker.md`):**
- System prompt instructing Claude to use Glean and Slack MCP tools to sweep 7 days of activity
- Structured report format: Summary, New Actions Found, Updated Statuses, Key Signals
- JSON fence output spec for automated action extraction (`actions[]` array with description, owner, due_date, priority, source)
- Graceful fallback: if no MCP tools available, produces report from project context only

**Job handler (`bigpanda-app/worker/jobs/customer-project-tracker.ts`):**
- Follows `morning-briefing.ts` pattern exactly
- Calls `MCPClientPool.getInstance().getServersForSkill('customer-project-tracker')` at runtime
- Passes `mcpServers` to `orchestrator.run()` — empty array triggers non-MCP path gracefully
- Post-run: parses JSON fence from `full_output`, upserts found actions to `actions` table
- Error handling: per-project try/catch, continues to next project on failure
- Inserts into `outputs` table for Output Library

**Worker registration (`bigpanda-app/worker/index.ts`):**
- Imported `customerProjectTrackerJob` and added `'customer-project-tracker': customerProjectTrackerJob` to `JOB_HANDLERS` dispatch map

**Scheduler (`bigpanda-app/worker/scheduler.ts`):**
- Fixed cron `0 9 * * *` registered via `jobQueue.upsertJobScheduler()` after the settings-driven loop
- Uses same idempotent `upsertJobScheduler` pattern — safe to call on every restart

**UI fix (`bigpanda-app/components/SkillsTabClient.tsx`):**
- Added `data-testid="skill-card"` to all skill card divs — `customer-project-tracker` was already in `ALL_SKILLS` catalog

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing test attribute] Added data-testid="skill-card" to skill cards**
- **Found during:** Task 2 verification
- **Issue:** Success criteria required `data-testid="skill-card"` for E2E tests but the div only had `data-skill`
- **Fix:** Added `data-testid="skill-card"` alongside existing `data-skill` attribute on each card div
- **Files modified:** bigpanda-app/components/SkillsTabClient.tsx
- **Commit:** 623ad04

**2. [Rule 1 - Schema mismatch] Used 'due' column instead of 'due_date'**
- **Found during:** Task 2 implementation
- **Issue:** Plan spec referenced `due_date` field in `actions` insert, but actual schema column is `due`
- **Fix:** Used `due: action.due_date ?? null` to map from SKILL.md JSON output to correct column name
- **Files modified:** bigpanda-app/worker/jobs/customer-project-tracker.ts
- **Commit:** 623ad04

**3. [Rule 1 - Schema mismatch] Omitted 'priority' from actions insert**
- **Found during:** Task 2 implementation
- **Issue:** Plan spec included `priority` in the `actions` insert but the schema has no `priority` column
- **Fix:** Removed `priority` from insert; it remains in the SKILL.md JSON spec as useful metadata for future use
- **Files modified:** bigpanda-app/worker/jobs/customer-project-tracker.ts
- **Commit:** 623ad04

## TypeScript Status

No errors in new/modified files. Pre-existing `ioredis` version conflict errors in `app/api/jobs/trigger/route.ts` and `app/api/skills/[skillName]/run/route.ts` are out of scope (present before this plan).

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| skills/customer-project-tracker.md exists | FOUND |
| worker/jobs/customer-project-tracker.ts exists | FOUND |
| Commit 2774d74 exists | FOUND |
| Commit 623ad04 exists | FOUND |
| dispatch map entry 'customer-project-tracker' | FOUND |
| scheduler cron registration | FOUND |
| data-testid="skill-card" in SkillsTabClient | FOUND |
