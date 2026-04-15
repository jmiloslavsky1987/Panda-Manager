# Phase 65: Project-Scoped Scheduling - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Split the global Scheduler into non-project-specific (global) and project-scoped views. Add `project_id` to `scheduled_jobs` to distinguish between job types. Surface per-project scheduling inside each project's Skills tab. Fix job list state persistence. Show run history for manually triggered jobs. Remove the nav badge from the Scheduler sidebar link.

Out of scope: new skill types, changes to how skills run or stream output, changes to the global scheduler's wizard or CRUD logic beyond filtering.

</domain>

<decisions>
## Implementation Decisions

### Project scheduler placement
- The per-project scheduler lives **inside the Skills tab**, as a new section below the existing skills catalog
- It should look and function like the global `/scheduler` page: same job table layout, same create/edit wizard, same run/delete controls
- The section is project-scoped — it only shows jobs where `scheduled_jobs.project_id = current project`
- The global `/scheduler` page shows only jobs with `project_id IS NULL` (non-project-specific)

### Skills available for project-scoped jobs
- **All skills in the catalog** are available for project-scoped scheduling (not filtered by `schedulable: true` front-matter flag)
- Rationale: user wants full flexibility at the project level; the `schedulable` flag was designed for the global scheduler's whitelist

### Auto-injection of projectId
- When creating or running a project-scoped job, `projectId` is **automatically injected** into `skill_params_json`
- The BullMQ job data carries `projectId` so the skill worker knows which project to operate on
- Pattern: matches how `weekly-focus` job handles projectId today (flows through BullMQ job data)

### State persistence (SCHED-03)
- Jobs always re-fetch from DB on page load (fresh server data, no stale state)
- UI state (expanded rows, filters, sort) is preserved via **URL params** — consistent with the client-side filter pattern used across the app
- Navigating away and returning restores the URL params and therefore the UI state

### Run history display (SCHED-04)
- Each job row is **expandable** — clicking it reveals the last N runs (5–10)
- Each run entry shows: timestamp, triggered-by (manual/scheduled), outcome badge (success/fail/timeout)
- Powered by the existing `run_history_json` JSONB column on `scheduled_jobs` — no new DB table needed

### Global scheduler restriction (SCHED-01)
- `scheduled_jobs` table gets a new nullable `project_id` column (FK to `projects`)
- Global `/scheduler` filters to `project_id IS NULL`
- Project Skills tab filters to `project_id = [current projectId]`

### Nav badge removal (SCHED-05)
- Remove `<NotificationBadge count={schedulerFailureCount} />` from `Sidebar.tsx` Scheduler link
- The `appNotifications` table and scheduler failure logging can remain (used elsewhere); just the badge display is removed

### Claude's Discretion
- Exact DB migration strategy for adding `project_id` column (nullable, no backfill needed — existing jobs become global jobs with `project_id = NULL`)
- Whether the project Skills tab scheduler section uses a shared component with the global scheduler page or duplicates the UI
- Exact number of run history entries shown in the expanded row (5 or 10)
- Visual treatment of the scheduler section within the Skills tab (divider, heading, collapsed by default or expanded)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/SchedulerJobTable.tsx` + `components/SchedulerJobRow.tsx` — Full scheduler table UI with expand/collapse, optimistic updates, edit/delete. Can be reused or adapted for the project-scoped section inside Skills tab
- `components/CreateJobWizard.tsx` — Job creation/edit wizard. Already handles skill selection, frequency, cron. Needs `projectId` prop to set `project_id` on creation
- `app/api/jobs/route.ts` (GET + POST) — Global jobs CRUD. GET currently returns all jobs; needs `?projectId=` query param support to filter by project. POST needs to accept optional `project_id`
- `app/api/jobs/[id]/route.ts` (PATCH + DELETE) — Already uses `requireSession()` + global admin check; project-scoped variants need `requireProjectRole()` instead
- `components/Sidebar.tsx` — Scheduler nav link with `NotificationBadge` — remove the badge component
- `run_history_json` JSONB column on `scheduled_jobs` — already populated by worker; powers expandable run history UI

### Established Patterns
- `requireProjectRole()` (Phase 58) — per-project RBAC guard; wraps project-scoped job API routes
- Client-side filtering via URL params — Server Component passes full data; client island reads URL params for filter state
- BullMQ job data carries `projectId` for project-scoped operations (see `weekly-focus` pattern in `app/api/projects/[projectId]/weekly-focus/route.ts`)
- `requireSession()` + `resolveRole()` guards global admin actions (global scheduler stays admin-only)

### Integration Points
- `db/schema.ts` → `scheduledJobs` table: Add `project_id: integer('project_id').references(() => projects.id)` (nullable)
- `app/api/jobs/route.ts` (GET): Add optional `projectId` query param — filter `project_id = projectId` or `project_id IS NULL` (global)
- `app/api/jobs/route.ts` (POST): Accept optional `project_id` in `CreateJobSchema`; auto-populate from context in project route
- New project-scoped jobs API: `app/api/projects/[projectId]/jobs/route.ts` — thin wrapper over jobs table, scoped to project, guarded by `requireProjectRole()`
- `app/customer/[id]/skills/page.tsx` (Server Component): Fetch project-scoped jobs server-side, pass as `initialJobs` to Skills tab client
- `components/SkillsTabClient.tsx`: Render scheduler section below skills catalog using `SchedulerJobTable` or a variant

</code_context>

<specifics>
## Specific Ideas

- The project scheduler section in the Skills tab should feel like the same tool as the global `/scheduler` — same visual pattern, same wizard, same job rows — just filtered to the current project
- Auto-inject of `projectId` into `skill_params_json` mirrors how `weekly-focus` handles it today — that's the reference implementation

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 65-project-scoped-scheduling*
*Context gathered: 2026-04-15*
