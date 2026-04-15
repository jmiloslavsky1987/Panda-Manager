---
phase: 65-project-scoped-scheduling
plan: 02
subsystem: scheduling
tags:
  - project-scoped
  - jobs-api
  - wizard
  - rbac
dependency_graph:
  requires:
    - 65-01
  provides:
    - project-scoped-jobs-route
    - wizard-project-mode
  affects:
    - skills-tab-scheduler
    - project-level-automation
tech_stack:
  added:
    - /api/projects/[projectId]/jobs route with GET + POST
  patterns:
    - requireProjectRole admin guard for project job management
    - auto-injection of projectId into skill_params_json
    - conditional wizard UI (hideScope prop pattern)
key_files:
  created:
    - bigpanda-app/app/api/projects/[projectId]/jobs/route.ts
  modified:
    - bigpanda-app/app/api/jobs/route.ts
    - bigpanda-app/components/CreateJobWizard.tsx
    - bigpanda-app/components/SchedulerJobRow.tsx
    - bigpanda-app/components/wizard/JobSkillStep.tsx
decisions:
  - Exported CreateJobSchema from global jobs route for reuse by project-scoped route
  - Project route forces project_id to route param (security boundary — caller cannot override)
  - Auto-inject projectId into skill_params_json at server side so BullMQ worker has project context
  - hideScope prop pattern for JobSkillStep (cleaner than passing projectId down)
  - Scope defaults to 'per-project' when projectId prop is present
metrics:
  duration_seconds: 216
  task_count: 2
  files_created: 1
  files_modified: 4
  commits: 2
  completed_date: "2026-04-15"
---

# Phase 65 Plan 02: Project-Scoped Jobs API & Wizard Integration Summary

**One-liner:** Project-scoped jobs API route with requireProjectRole admin guard and CreateJobWizard projectId prop support for Skills tab job creation.

## What Was Delivered

1. **Project-scoped jobs API route** (`/api/projects/[projectId]/jobs`)
   - GET handler: returns jobs filtered by `project_id`, guarded by `requireProjectRole(admin)`
   - POST handler: forces `project_id` to route param, auto-injects `projectId` into `skill_params_json`
   - Both endpoints follow Next.js 15 async params pattern
   - Security boundary enforced at route level (admin role required per plan requirement)

2. **CreateJobWizard projectId prop**
   - Optional `projectId?: number` prop added to `CreateJobWizardProps`
   - When `projectId` is set:
     - Scope defaults to `'per-project'`
     - Scope field hidden in Step 1 (via `hideScope` prop on `JobSkillStep`)
     - POST goes to `/api/projects/${projectId}/jobs` instead of `/api/jobs`
   - When `projectId` is absent: wizard behavior identical to before (global mode)

3. **Type updates**
   - Added `project_id?: number | null` to `ScheduledJob` interface (matches DB schema from plan 01)
   - Exported `CreateJobSchema` from global jobs route for reuse

## Tasks Completed

| Task | Commit  | Description                                    |
| ---- | ------- | ---------------------------------------------- |
| 1    | 5de1c81 | Create project-scoped jobs API route           |
| 2    | 47c49da | Update CreateJobWizard with optional projectId |

## Deviations from Plan

None — plan executed exactly as written.

## Technical Notes

**Server-side auto-injection pattern:**
```typescript
// In POST handler:
const paramsJson = { ...(skill_params ?? skill_params_json ?? {}), projectId: numericId };
```
This ensures BullMQ workers receive the project context without requiring client-side knowledge.

**Security enforcement:**
- `project_id` is **always** set to route param `numericId`, regardless of request body
- `requireProjectRole(numericId, 'admin')` blocks non-admin project members
- Global admins (via `resolveRole`) bypass project membership checks (existing RBAC pattern)

**Wizard integration:**
- `hideScope` prop on `JobSkillStep` cleanly encapsulates the conditional UI
- Grid layout adjusts when scope field is hidden (`grid-cols-1` vs `grid-cols-2`)
- Submit URL logic: `projectId ? /api/projects/${projectId}/jobs : /api/jobs`

## Verification

- TypeScript check clean for new and modified files
- Route file exists at expected path: `app/api/projects/[projectId]/jobs/route.ts`
- Pre-existing test file errors unrelated to this plan

## Next Steps

Plan 03 will wire up the project Skills tab to use the new route and wizard mode.

---

**Phase:** 65 of 69 (Project-Scoped Scheduling)
**Milestone:** v7.0 — Governance & Operational Maturity
**Requirement:** SCHED-02
**Completed:** 2026-04-15

## Self-Check: PASSED

All files and commits verified:
- ✓ FOUND: bigpanda-app/app/api/projects/[projectId]/jobs/route.ts
- ✓ FOUND: 5de1c81
- ✓ FOUND: 47c49da
