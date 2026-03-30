---
phase: 24-scheduler-enhanced
plan: "04"
subsystem: scheduler-ui
tags: [wizard, dialog, scheduler, react, components]
dependency_graph:
  requires: [24-02, 24-03]
  provides: [CreateJobWizard, JobSkillStep, JobScheduleStep, JobParamsStep]
  affects: [SchedulerJobTable, SchedulerJobRow, scheduler-skills]
tech_stack:
  added: []
  patterns: [radix-dialog, multi-step-wizard, optimistic-ui, conditional-step]
key_files:
  created:
    - bigpanda-app/components/CreateJobWizard.tsx
    - bigpanda-app/components/wizard/JobSkillStep.tsx
    - bigpanda-app/components/wizard/JobScheduleStep.tsx
    - bigpanda-app/components/wizard/JobParamsStep.tsx
  modified:
    - bigpanda-app/lib/scheduler-skills.ts
    - bigpanda-app/components/SchedulerJobTable.tsx
    - bigpanda-app/components/SchedulerJobRow.tsx
decisions:
  - "timesheet-reminder hasParams set to false and removed from SKILLS_WITH_PARAMS — plan 02 had it there but Step 3 config is not needed"
  - "onEdit prop added to SchedulerJobRow (optional) — backward-compatible; enables Edit button without breaking existing callers"
  - "Intl.supportedValuesOf typed via cast rather than @ts-expect-error — TS version supports it natively"
metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_created: 4
  files_modified: 3
  completed_date: "2026-03-30"
---

# Phase 24 Plan 04: Create Job Wizard Summary

**One-liner:** 3-step full-screen wizard (Radix Dialog) with 12-skill card grid, schedule picker, and skill-specific params — wired into Scheduler table for create and edit flows.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Update scheduler-skills.ts + create step components | cbe69f4 | scheduler-skills.ts, JobSkillStep.tsx, JobScheduleStep.tsx, JobParamsStep.tsx |
| 2 | CreateJobWizard + wire into SchedulerJobTable | b2906b3 | CreateJobWizard.tsx, SchedulerJobTable.tsx, SchedulerJobRow.tsx |

## What Was Built

**scheduler-skills.ts:**
- Removed `timesheet-reminder` from `SKILLS_WITH_PARAMS` — final value: `['discovery-scan', 'customer-project-tracker', 'weekly-customer-status', 'context-updater']`
- Set `timesheet-reminder.hasParams = false` in `SKILL_LIST`

**JobSkillStep.tsx:** 3-column CSS grid of 12 skill cards from `SKILL_LIST`. Selected card gets `ring-2 ring-blue-500`. Below grid: job name input + scope select (Global / Per-Project).

**JobScheduleStep.tsx:** Frequency `<select>` (once/daily/weekly/biweekly/monthly/custom). Conditional fields: day-of-week picker for weekly/biweekly, day-of-month 1–28 for monthly, custom cron text input. Hour (0–23) + minute (0/15/30/45) dropdowns. Timezone searchable select defaulting to browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.

**JobParamsStep.tsx:** Skill-specific forms:
- `customer-project-tracker`: multi-select projects + "Run for all customers" checkbox
- `weekly-customer-status` / `context-updater`: single project select
- `discovery-scan`: project select + Slack channels comma-separated input
- Unknown skills: "No additional configuration required."

**CreateJobWizard.tsx:** Full-screen Radix `<Dialog>` (`max-w-4xl h-[90vh]`). Stepper header follows `ProjectWizard.tsx` pattern — numbered circles, connectors, Check icon for completed steps. Step 3 label grayed out when skill has no params. Footer: Back / Cancel / Next (or Submit on last step). Submit calls `POST /api/jobs` (create) or `PATCH /api/jobs/[id]` (edit). `onJobCreated` fires on success; `toast.error` on failure without closing dialog. Fetches `/api/projects` on mount for JobParamsStep project list.

**SchedulerJobTable.tsx:** Added `wizardOpen`, `editJob` state. `+ Create Job` button opens wizard with `editJob=undefined`. `onEdit` callback passed to `SchedulerJobRow`. `onJobCreated` prepends new or updates existing job in state. Renders `<CreateJobWizard>`.

**SchedulerJobRow.tsx:** Added optional `onEdit?: (job: ScheduledJob) => void` prop. Edit button now active when prop is provided (was a disabled stub).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @ts-expect-error unused directive in JobScheduleStep**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `@ts-expect-error` for `Intl.supportedValuesOf` caused TS2578 — the TS version in the project already supports it
- **Fix:** Replaced with `(Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf('timeZone')` cast
- **Files modified:** bigpanda-app/components/wizard/JobScheduleStep.tsx
- **Commit:** b2906b3

**2. [Rule 2 - Missing functionality] timesheet-reminder hasParams not updated in SKILL_LIST**
- **Found during:** Task 1
- **Issue:** Plan specified removing from `SKILLS_WITH_PARAMS` but `hasParams: true` remained in `SKILL_LIST` — would mismatch
- **Fix:** Set `hasParams: false` in the SKILL_LIST entry for timesheet-reminder
- **Files modified:** bigpanda-app/lib/scheduler-skills.ts
- **Commit:** cbe69f4

## Test Results

- `tests/scheduler/ — 48/48 tests GREEN` (8 test files, includes jobs-crud, wizard-step, skill-list, frequency-to-cron, trigger, run-history, notifications, sidebar)
- No TypeScript errors in any wizard or scheduler component files

## Self-Check: PASSED

Files verified present:
- bigpanda-app/components/CreateJobWizard.tsx — FOUND
- bigpanda-app/components/wizard/JobSkillStep.tsx — FOUND
- bigpanda-app/components/wizard/JobScheduleStep.tsx — FOUND
- bigpanda-app/components/wizard/JobParamsStep.tsx — FOUND

Commits verified:
- cbe69f4 — FOUND
- b2906b3 — FOUND
