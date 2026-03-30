# Phase 24: Scheduler Enhanced - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

The Scheduler page becomes a first-class, standalone UI. Users can create, configure, enable/disable, and manually trigger any of the 12 skills as scheduled jobs. Run history and failure notifications are built in. This phase promotes what was a basic Settings tab into a proper self-service page with its own sidebar link and Create Job wizard.

</domain>

<decisions>
## Implementation Decisions

### Scheduler page layout
- Table rows: columns are Name, Skill, Schedule, Next Run, Last Outcome (✓/✗), Enabled toggle, Trigger button
- Flat list — enabled jobs first, disabled jobs below; no filter UI
- Standalone `/scheduler` page with its own sidebar link (alongside Dashboard, Knowledge Base, Settings)
- "+ Create Job" button in the page header top-right
- Clicking a row expands it inline — shows [Edit] [Disable/Enable] [Delete] controls + run history log (last 10 entries, scrollable)

### Create Job wizard
- Full-screen Dialog modal — reuses the ProjectWizard / IngestionModal pattern (stepper header)
- 3 steps: **Step 1: Skill → Step 2: Schedule → Step 3: Params**
  - Step 1: Grid of 12 skill cards (3×4 layout), click to select; then job name + scope (global / per-project)
  - Step 2: Frequency picker (once / daily / weekly with day picker / bi-weekly / monthly with day-of-month / custom cron), time (hour + minute), timezone (default: browser timezone)
  - Step 3: Skill-specific params — **skipped automatically** if the selected skill has no configurable parameters
- Edit existing job: same wizard reopens pre-filled (no inline editing — consistent create/edit UX)

### Skill-specific parameters (Step 3)
- Hardcoded typed form fields per skill — not a JSON editor, not dynamic schema generation
- Planner defines field specs per skill during planning; examples:
  - Customer Project Tracker: customer dropdown + "run for all customers" checkbox
  - Discovery Scan: project picker + optional Slack channels text input
  - Morning Briefing, Meeting Summary: no params → Step 3 skipped
- If a job is scoped to a customer/project that no longer exists: job fails with a clear error message in run history ("Project Kaiser not found"); config is preserved so it can be re-pointed

### Run history
- Last 10 runs stored in `run_history_json` (JSONB array, field already exists from Phase 17)
- Each entry: timestamp, outcome (success/failure/partial), duration, artifact link
- Artifact link → navigates to `/outputs` page filtered by run ID/timestamp (consistent with existing outputs pattern)
- Shown inline in the expanded job row with scroll

### Failure notifications
- Uses the existing in-app notification system (`NotificationBadge.tsx` already in codebase)
- Failed run writes a notification entry; badge appears on the Scheduler sidebar link
- Clicking the notification navigates to the affected job's expanded row

### Claude's Discretion
- Exact column widths and table styling
- Enabled toggle design (switch vs checkbox)
- Whether "Trigger" button shows a loading spinner or a brief toast on manual fire
- Error state for run history entries (how error message text is displayed/truncated)
- Cron expression validator UX for custom cron input

</decisions>

<specifics>
## Specific Ideas

- The skill picker grid should feel like a selection UI — highlighted card border on hover/select, skill name + one-line description on each card
- The enabled toggle in the table row is the primary way to pause/resume a job without deleting it
- Step 3 auto-skip is important: users creating a Morning Briefing job should get a 2-step wizard, not a 3rd empty step

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bigpanda-app/components/ProjectWizard.tsx` + `bigpanda-app/components/wizard/` (BasicInfoStep, CollateralUploadStep, etc.): Full-screen Dialog + stepper header pattern — Create Job wizard follows this exactly
- `bigpanda-app/components/NotificationBadge.tsx`: Existing in-app notification component — failure notifications write here
- `bigpanda-app/app/api/jobs/trigger/route.ts`: Manual job trigger endpoint (BullMQ queue.add) — already built, used by the Trigger button
- `bigpanda-app/components/IngestionModal.tsx` + `IngestionStepper.tsx`: Multi-step Dialog pattern with stepper — reference for step transitions

### Established Patterns
- **scheduled_jobs schema** (Phase 17): `skill_params_json`, `timezone`, `last_run_outcome` (jobRunOutcomeEnum: success/failure/partial), `run_history_json` — all fields exist; Phase 24 only needs API layer + UI
- **Radix UI**: Tabs, Dialog, and other interactive components throughout — wizard uses Dialog
- **Sidebar navigation**: `bigpanda-app/components/Sidebar.tsx` currently has Dashboard, Knowledge Base, Settings links — add Scheduler link here

### Integration Points
- New `/scheduler` route: `bigpanda-app/app/scheduler/page.tsx`
- New scheduler API routes needed: `GET /api/jobs` (list), `POST /api/jobs` (create), `PATCH /api/jobs/[id]` (update/enable/disable), `DELETE /api/jobs/[id]`
- BullMQ worker already handles job execution; Phase 24 is purely UI + CRUD API on top of existing `scheduled_jobs` table
- Notification integration: failure handler in the BullMQ worker should write to notification store when a job run fails

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-scheduler-enhanced*
*Context gathered: 2026-03-30*
