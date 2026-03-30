# Phase 24: Scheduler Enhanced - Research

**Researched:** 2026-03-30
**Domain:** Scheduler UI, BullMQ job management, Next.js API routes, multi-step wizard pattern
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Scheduler page layout**
- Table rows: columns are Name, Skill, Schedule, Next Run, Last Outcome (✓/✗), Enabled toggle, Trigger button
- Flat list — enabled jobs first, disabled jobs below; no filter UI
- Standalone `/scheduler` page with its own sidebar link (alongside Dashboard, Knowledge Base, Settings)
- "+ Create Job" button in the page header top-right
- Clicking a row expands it inline — shows [Edit] [Disable/Enable] [Delete] controls + run history log (last 10 entries, scrollable)

**Create Job wizard**
- Full-screen Dialog modal — reuses the ProjectWizard / IngestionModal pattern (stepper header)
- 3 steps: Step 1: Skill → Step 2: Schedule → Step 3: Params
  - Step 1: Grid of 12 skill cards (3×4 layout), click to select; then job name + scope (global / per-project)
  - Step 2: Frequency picker (once / daily / weekly with day picker / bi-weekly / monthly with day-of-month / custom cron), time (hour + minute), timezone (default: browser timezone)
  - Step 3: Skill-specific params — skipped automatically if the selected skill has no configurable parameters
- Edit existing job: same wizard reopens pre-filled (no inline editing — consistent create/edit UX)

**Skill-specific parameters (Step 3)**
- Hardcoded typed form fields per skill — not a JSON editor, not dynamic schema generation
- If a job is scoped to a customer/project that no longer exists: job fails with a clear error message in run history ("Project Kaiser not found"); config is preserved so it can be re-pointed

**Run history**
- Last 10 runs stored in `run_history_json` (JSONB array, field already exists from Phase 17)
- Each entry: timestamp, outcome (success/failure/partial), duration, artifact link
- Artifact link → navigates to `/outputs` page filtered by run ID/timestamp
- Shown inline in the expanded job row with scroll

**Failure notifications**
- Uses the existing in-app notification system (`NotificationBadge.tsx` already in codebase)
- Failed run writes a notification entry; badge appears on the Scheduler sidebar link
- Clicking the notification navigates to the affected job's expanded row

### Claude's Discretion
- Exact column widths and table styling
- Enabled toggle design (switch vs checkbox)
- Whether "Trigger" button shows a loading spinner or a brief toast on manual fire
- Error state for run history entries (how error message text is displayed/truncated)
- Cron expression validator UX for custom cron input

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHED-01 | User can create a new scheduled job via a "Create Job" wizard from the Scheduler page | Wizard pattern from `ProjectWizard.tsx` / Dialog pattern; new `POST /api/jobs` route needed |
| SCHED-02 | Supported frequencies: once, daily, weekly, bi-weekly, monthly, custom cron | Cron expression mapping table below; BullMQ `upsertJobScheduler` handles patterns |
| SCHED-03 | Each job has configurable run time (hour + minute) with timezone support | DB `timezone` column already exists; browser `Intl.DateTimeFormat().resolvedOptions().timeZone` for default |
| SCHED-04 | Each job supports skill-specific configuration parameters | `skill_params_json` JSONB column already in schema; hardcoded form fields per skill |
| SCHED-05 | Jobs can be enabled/disabled without deleting; disabled jobs retain config and history | `enabled` boolean already in `scheduled_jobs`; `PATCH /api/jobs/[id]` sets `enabled` flag |
| SCHED-06 | Any job can be manually triggered on demand | `POST /api/jobs/trigger` already exists; needs to accept job DB id + skill_params |
| SCHED-07 | Scheduler UI shows Last Run timestamp, Last Run Outcome, Next Run time | `last_run_at`, `last_run_outcome`, next run derivable from cron + BullMQ scheduler state |
| SCHED-08 | Failed job runs generate an in-app notification | Worker `failed` event listener writes to `app_notifications`; type `scheduler_failure` |
| SCHED-09 | Each job maintains a run history log: time, outcome, duration, artifact links | `run_history_json` JSONB array; worker appends entry on each completion/failure |
| SCHED-10 | Scheduler page accessible from main sidebar navigation | Add link to `Sidebar.tsx` |
| SCHED-11 | Create Job wizard guides through skill selection, scope, frequency, time, skill params | 3-step wizard; Step 3 auto-skipped if no skill params |
| SCHED-12 | All 12 skills are schedulable: Morning Briefing, Customer Project Tracker, Weekly Customer Status, ELT External, ELT Internal, Biggy Weekly Briefing, Context Updater, Meeting Summary, Workflow Diagram, Team Engagement Map, Discovery Scan, Timesheet Reminder | Skill picker grid in Step 1; worker handler dispatch map must include all 12 |
</phase_requirements>

---

## Summary

Phase 24 is primarily a UI + API layer built on top of a fully operational backend. The `scheduled_jobs` table (extended in Phase 17) has all required columns: `skill_params_json`, `timezone`, `last_run_outcome` (enum: success/failure/partial), `run_history_json`, `enabled`, `cron_expression`, `name`, `skill_name`. The BullMQ worker already executes jobs, and a manual trigger endpoint exists at `POST /api/jobs/trigger`. Phase 24 delivers the missing pieces: CRUD API routes for `scheduled_jobs`, the `/scheduler` page UI, the Create/Edit Job wizard, run history display, worker completion hooks that write to `run_history_json`, and failure notifications via the existing `app_notifications` table.

The wizard follows the exact same pattern as `ProjectWizard.tsx` — a full-screen Radix `Dialog` with a numbered stepper header. Step 3 is conditionally skipped, which requires a simple "has params?" check per skill. The 12 skill names must be mapped to their human-readable labels and worker job names. Six of the 12 skills are already registered in the worker dispatch map; the rest are either registered with hardcoded schedulers (customer-project-tracker, discovery-scan) or have worker handlers that need registration under new BullMQ scheduler IDs to become DB-driven.

The largest architectural decision is how DB-stored jobs co-exist with the current hardcoded `registerAllSchedulers()` approach. Phase 24 must introduce a DB-driven scheduler registration path so that user-created jobs are registered in BullMQ when the worker starts and when jobs are created/edited/deleted via the API. The cleanest approach: on worker startup and every 60s poll, read ALL enabled jobs from `scheduled_jobs` DB, calling `upsertJobScheduler` for each — completely replacing the static `JOB_SCHEDULE_MAP`. The existing static map entries get DB rows created at migration time.

**Primary recommendation:** Build `GET/POST /api/jobs`, `PATCH/DELETE /api/jobs/[id]`, a DB-driven `registerAllSchedulers` that reads from `scheduled_jobs`, worker completion hooks for run history + notifications, the `/scheduler` page with inline-expand table, and the 3-step wizard modal.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| BullMQ | ^5.71.0 | Job queue, schedulers, worker | Already in project; `upsertJobScheduler` handles cron |
| Drizzle ORM | ^0.45.1 | DB queries for `scheduled_jobs`, `app_notifications` | Already in project |
| Next.js App Router | 16.2.0 | API routes + RSC page | Already in project |
| Radix UI Dialog | ^1.1.15 | Full-screen wizard modal | Already in project (`components/ui/dialog.tsx`) |
| Zod | ^4.3.6 | API route input validation | Already in project |
| Lucide React | ^0.577.0 | Icons for skill cards, status indicators | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | ^2.0.7 | Toast on manual trigger success/failure | Already in project |
| Native `Intl.DateTimeFormat` | browser built-in | Capture browser timezone for default | No install needed |
| `Intl.supportedValuesOf('timeZone')` | browser built-in | Timezone picker list | No install needed |

### Cron frequency → BullMQ pattern mapping
| UI Selection | Cron Pattern | Notes |
|---|---|------|
| Once | `null` / one-shot `delay` | Use BullMQ `queue.add` with no repeat; OR set `enabled=false` after first run |
| Daily | `0 HH MM * * *` (hour/min from form) | `{ pattern: '0 MM HH * * *' }` |
| Weekly + day | `0 MM HH * * DOW` | DOW = 0 (Sun) through 6 (Sat) |
| Bi-weekly | `0 MM HH * * DOW/2` | Not standard cron; use BullMQ `every: 14*24*60*60*1000` ms with `startDate` |
| Monthly + day | `0 MM HH DOM * *` | Day of month 1–28 (avoid 29–31) |
| Custom cron | user input | Validate client-side, pass through to BullMQ |

**Note on "once":** BullMQ's `upsertJobScheduler` is for repeating jobs. A "once" job should be added via `queue.add(name, data, { delay: msUntilRunTime })` and immediately disabled in DB (or a `run_once` flag). Simplest approach: after the one-shot fires, the worker completion hook sets `enabled=false`.

**Note on "bi-weekly":** Standard cron cannot express "every 2 weeks" relative to a start date. BullMQ supports `{ every: ms, startDate }` in the scheduler options. Use `every: 14 * 24 * 60 * 60 * 1000` with `startDate` aligned to the first intended run.

### No new packages required
All functionality is achievable with existing dependencies. Do NOT add `cronstrue`, `cron-parser`, or `date-fns-tz`.

---

## Architecture Patterns

### Recommended Project Structure
```
bigpanda-app/
├── app/
│   ├── scheduler/
│   │   └── page.tsx               # RSC page, fetches jobs server-side
│   └── api/
│       └── jobs/
│           ├── route.ts           # GET (list all), POST (create)
│           ├── [id]/
│           │   └── route.ts       # PATCH (update/enable/disable), DELETE
│           └── trigger/
│               └── route.ts      # Already exists — may need extension for skill_params
├── components/
│   ├── SchedulerJobTable.tsx      # Client component — table with inline expand
│   ├── SchedulerJobRow.tsx        # Individual row + expanded panel
│   ├── CreateJobWizard.tsx        # Full-screen Dialog, 3-step wizard
│   └── wizard/
│       ├── JobSkillStep.tsx       # Step 1: skill picker grid + scope
│       ├── JobScheduleStep.tsx    # Step 2: frequency + time + timezone
│       └── JobParamsStep.tsx      # Step 3: skill-specific params (conditional)
├── lib/
│   └── scheduler-notifications.ts # insertSchedulerFailureNotification()
└── worker/
    ├── scheduler.ts               # registerAllSchedulers: now reads from DB
    └── index.ts                   # Add completed/failed hooks for run_history
```

### Pattern 1: DB-driven scheduler registration
**What:** Replace static `JOB_SCHEDULE_MAP` with a DB query that reads all enabled `scheduled_jobs` rows and calls `upsertJobScheduler` for each.
**When to use:** Every worker startup and every 60s poll (same cadence as current settings poll).
**Example:**
```typescript
// worker/scheduler.ts — new DB-driven approach
import db from '../db'
import { scheduledJobs } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function registerAllSchedulers(): Promise<void> {
  // Remove phantom legacy IDs (keep existing cleanup calls)
  await jobQueue.removeJobScheduler('action-sync')
  await jobQueue.removeJobScheduler('weekly-briefing')

  const jobs = await db.select().from(scheduledJobs).where(eq(scheduledJobs.enabled, true))

  for (const job of jobs) {
    await jobQueue.upsertJobScheduler(
      `db-job-${job.id}`,              // stable scheduler ID — use DB id prefix
      { pattern: job.cron_expression },
      {
        name: job.skill_name,          // worker dispatches by skill_name
        data: { triggeredBy: 'scheduled', jobId: job.id, params: job.skill_params_json },
        opts: { removeOnComplete: 100, removeOnFail: 50 },
      }
    )
  }
}
```
**Key insight:** The scheduler ID (`db-job-${job.id}`) must be stable — it's how BullMQ deduplicates. Using DB `id` is safe because it never changes.

### Pattern 2: Worker completion hooks for run_history
**What:** The BullMQ worker `completed` and `failed` event handlers append to `run_history_json` in the `scheduled_jobs` row and write a failure notification.
**When to use:** After every job execution.
**Example:**
```typescript
// worker/index.ts additions
import db from '../db'
import { scheduledJobs, appNotifications } from '../db/schema'
import { eq, sql } from 'drizzle-orm'

worker.on('completed', async (job, result) => {
  const jobId = job.data?.jobId   // DB row id injected in scheduler data
  if (!jobId) return
  const entry = {
    timestamp: new Date().toISOString(),
    outcome: 'success' as const,
    duration_ms: Date.now() - (job.processedOn ?? Date.now()),
    artifact_link: result?.outputPath ?? null,
  }
  await db.update(scheduledJobs)
    .set({
      last_run_at: new Date(),
      last_run_outcome: 'success',
      run_history_json: sql`(
        SELECT jsonb_agg(entry) FROM (
          SELECT * FROM jsonb_array_elements(run_history_json)
          UNION ALL SELECT ${JSON.stringify(entry)}::jsonb
          LIMIT 10
        ) t(entry)
      )`,
    })
    .where(eq(scheduledJobs.id, jobId))
})

worker.on('failed', async (job, err) => {
  const jobId = job?.data?.jobId
  if (!jobId) return
  const entry = {
    timestamp: new Date().toISOString(),
    outcome: 'failure' as const,
    duration_ms: Date.now() - (job?.processedOn ?? Date.now()),
    error: err.message,
  }
  await db.update(scheduledJobs)
    .set({
      last_run_at: new Date(),
      last_run_outcome: 'failure',
      run_history_json: sql`(/* same JSONB append as above */)`,
    })
    .where(eq(scheduledJobs.id, jobId))

  // Write failure notification
  await db.insert(appNotifications).values({
    user_id: 'default',
    type: 'scheduler_failure',
    title: `Job failed: ${job?.name ?? 'unknown'}`,
    body: err.message.slice(0, 500),
    data: { job_id: jobId },
  })
})
```

**IMPORTANT — JSONB append pattern:** PostgreSQL JSONB arrays cannot be appended with a simple Drizzle `.set()`. The `sql` template approach above is the correct pattern. Alternatively, read the row, push to JS array (capped at 10), then write back. The JS-side approach is simpler and avoids complex SQL:
```typescript
const row = await db.select({ history: scheduledJobs.run_history_json })
  .from(scheduledJobs).where(eq(scheduledJobs.id, jobId)).then(r => r[0])
const history = Array.isArray(row?.history) ? row.history : []
const updated = [...history, newEntry].slice(-10)
await db.update(scheduledJobs).set({ run_history_json: updated }).where(eq(scheduledJobs.id, jobId))
```
**Recommendation:** Use the JS-side approach — simpler, more readable, avoids raw SQL in worker.

### Pattern 3: Create/Edit Job wizard — step skip
**What:** When the selected skill has no configurable params, skip Step 3.
**When to use:** Always evaluate on "Next" from Step 2.
**Example:**
```typescript
// components/CreateJobWizard.tsx
const SKILLS_WITH_PARAMS = new Set([
  'customer-project-tracker',
  'discovery-scan',
  'weekly-customer-status',
  'elt-external',
  'elt-internal',
  'biggy-weekly-briefing',
  'context-updater',
  'workflow-diagram',
  'team-engagement-map',
  // morning-briefing, meeting-summary, timesheet-reminder → NO params (skip Step 3)
])

function getNextStep(currentStep: JobWizardStep, selectedSkill: string): JobWizardStep {
  if (currentStep === 'schedule') {
    return SKILLS_WITH_PARAMS.has(selectedSkill) ? 'params' : null  // null = submit
  }
  // ...
}
```

### Pattern 4: Notify on scheduler failure — notification type
**What:** New notification type `scheduler_failure` added to `app_notifications`. The Scheduler sidebar link shows a badge count of unread `scheduler_failure` notifications.
**When to use:** Worker `failed` event handler.

The `type` column in `app_notifications` is `text` — no enum constraint — so `scheduler_failure` works without a migration.

The Sidebar.tsx is an RSC (async component); to show the badge count it needs a DB call. Follow the same pattern as the Dashboard's `NotificationBadge` usage: fetch unread scheduler notification count in the scheduler page's RSC, or pass it from layout.

### Pattern 5: Sidebar modification (RSC)
**What:** Add Scheduler link with optional badge to `Sidebar.tsx`.
**Key constraint:** `Sidebar.tsx` is an async RSC. The badge count must be fetched server-side in the same component. Add a DB query for `count of unread scheduler_failure notifications`.

```typescript
// Sidebar.tsx addition — fetch unread scheduler failure count
import { Calendar } from 'lucide-react'
import db from '../db'
import { appNotifications } from '../db/schema'
import { eq, and, count } from 'drizzle-orm'

// Inside Sidebar():
const [{ value: schedulerBadge }] = await db
  .select({ value: count() })
  .from(appNotifications)
  .where(and(
    eq(appNotifications.user_id, 'default'),
    eq(appNotifications.type, 'scheduler_failure'),
    eq(appNotifications.read, false)
  ))
```

### Anti-Patterns to Avoid
- **Inline editing in the table row:** User decision is explicit — always reopen the wizard for edits. Don't add inline form fields.
- **Filter UI on the scheduler page:** Explicitly out of scope; flat list only.
- **Registering BullMQ schedulers from the API route:** Only the worker process should call `upsertJobScheduler`. The API route saves to DB; the worker picks up changes on its 60s poll.
- **Adding new npm packages:** All required functionality exists in current dependencies.
- **Using `json_query` or complex SQL JSONB append:** JS-side append is cleaner and consistent with existing codebase style.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom timer/interval system | BullMQ `upsertJobScheduler` | Already in project, handles deduplication, persistence in Redis |
| Notification delivery | Custom WebSocket push | DB-backed `app_notifications` + RSC fetch on render | Existing pattern; single-user app doesn't need real-time push |
| Job history storage | Separate `job_runs` table | `run_history_json` JSONB array (already in schema) | DB row already has the column; no migration needed |
| Cron validation | Custom regex | BullMQ will throw on invalid pattern — catch and surface to UI | Keep validation simple |
| Timezone handling | Custom offset calculations | Browser `Intl.DateTimeFormat().resolvedOptions().timeZone` + store as IANA string | Correct, no library needed |

---

## Common Pitfalls

### Pitfall 1: BullMQ scheduler ID collision between DB-driven and legacy static jobs
**What goes wrong:** If `registerAllSchedulers()` migrates to DB-driven but doesn't insert DB rows for legacy jobs (morning-briefing, health-refresh, etc.), those jobs stop running.
**Why it happens:** The new code only processes DB rows; legacy static entries in `JOB_SCHEDULE_MAP` are orphaned.
**How to avoid:** Create a seed/migration that inserts `scheduled_jobs` rows for all currently-hardcoded jobs before switching `registerAllSchedulers()` to DB-driven mode. The migration must run as part of Wave 0.
**Warning signs:** Jobs that were running stop appearing in `queue.getRepeatableJobs()`.

### Pitfall 2: Worker dispatch by `job.name` vs `skill_name`
**What goes wrong:** The BullMQ worker dispatches via `JOB_HANDLERS[job.name]`. The new DB-driven scheduler sets `name: job.skill_name` in the BullMQ job. If `skill_name` values don't match keys in `JOB_HANDLERS`, jobs run but hit the "no handler" branch silently.
**Why it happens:** The 12 schedulable skills include some with no current handler (ELT External, ELT Internal, Biggy Weekly Briefing, Workflow Diagram, Team Engagement Map). New handlers may need to be added or existing skill-run handler used.
**How to avoid:** Define canonical `skill_name` values that match `JOB_HANDLERS` keys, OR route through the existing `skill-run` handler for skills that already work via the skill engine.
**Warning signs:** Worker logs `[worker] no handler for job: biggy-weekly-briefing`.

### Pitfall 3: `run_history_json` append race condition
**What goes wrong:** Two jobs complete simultaneously (unlikely but possible with concurrency:1, but still) and both read the same `run_history_json` value, each appending their entry, each writing back — one overwrites the other.
**Why it happens:** Read-modify-write without optimistic locking.
**How to avoid:** Worker concurrency is set to 1 (one job at a time), so this is not a real risk. Document the dependency on `concurrency: 1` — don't increase it without adding proper atomic append.
**Warning signs:** Run history entries disappear.

### Pitfall 4: "Once" frequency implementation
**What goes wrong:** BullMQ `upsertJobScheduler` is designed for repeating jobs. Passing a one-time cron that only fires once (e.g., `0 9 30 3 *` for March 30) technically works but leaves a scheduler entry in Redis indefinitely.
**Why it happens:** One-shot jobs are a conceptual mismatch with repeating schedulers.
**How to avoid:** For "once" frequency: use `queue.add(name, data, { delay: msUntilRun })` instead of `upsertJobScheduler`. In the `completed` handler for once-type jobs, set `enabled=false` in DB. Store a `frequency_type` field in `skill_params_json` to distinguish once vs recurring so the worker hook knows to disable.
**Warning signs:** "Once" jobs keep running on subsequent identical cron matches.

### Pitfall 5: Sidebar badge requiring an extra DB round-trip
**What goes wrong:** `Sidebar.tsx` is rendered on every page. Adding a DB call for notification count adds latency to every page load.
**Why it happens:** Streaming RSC renders don't batch these queries automatically.
**How to avoid:** The count query is a single indexed `COUNT(*)` — it's fast. Accept the tradeoff for now (single-user, local app). If needed, wrap the sidebar badge in a separate `<Suspense>` boundary with a fallback of no badge.

### Pitfall 6: Trigger button uses job DB id, not job name
**What goes wrong:** Existing `POST /api/jobs/trigger` takes `{ jobName }` as a string matching the BullMQ job name. DB-created jobs have IDs, not hardcoded names.
**Why it happens:** The trigger endpoint was built for the static job model.
**How to avoid:** Extend the trigger endpoint to accept `{ jobId: number }` — look up the DB row, get `skill_name` and `skill_params_json`, then enqueue. Or accept both `jobName` (legacy) and `jobId` (new). **Do not break the existing interface** for current callers.

---

## Code Examples

### GET /api/jobs — list all jobs
```typescript
// bigpanda-app/app/api/jobs/route.ts
import { NextResponse } from 'next/server'
import db from '@/db'
import { scheduledJobs } from '@/db/schema'
import { desc } from 'drizzle-orm'

export async function GET(): Promise<NextResponse> {
  const jobs = await db.select().from(scheduledJobs).orderBy(desc(scheduledJobs.enabled), scheduledJobs.name)
  return NextResponse.json({ jobs })
}
```

### POST /api/jobs — create job
```typescript
// bigpanda-app/app/api/jobs/route.ts
import { z } from 'zod'

const CreateJobSchema = z.object({
  name: z.string().min(1).max(100),
  skill_name: z.string().min(1),
  cron_expression: z.string().min(1),
  timezone: z.string().optional(),
  skill_params_json: z.record(z.unknown()).optional().default({}),
  enabled: z.boolean().optional().default(true),
})

export async function POST(req: Request): Promise<NextResponse> {
  const body = CreateJobSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.message }, { status: 400 })

  const [job] = await db.insert(scheduledJobs).values({
    ...body.data,
    skill_params_json: body.data.skill_params_json ?? {},
    run_history_json: [],
  }).returning()

  // Worker picks up new job on next 60s poll — no direct BullMQ call from API
  return NextResponse.json({ job }, { status: 201 })
}
```

### PATCH /api/jobs/[id] — update or toggle
```typescript
// bigpanda-app/app/api/jobs/[id]/route.ts
const PatchJobSchema = z.object({
  enabled: z.boolean().optional(),
  cron_expression: z.string().optional(),
  timezone: z.string().optional(),
  skill_params_json: z.record(z.unknown()).optional(),
  name: z.string().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const id = parseInt(params.id)
  const body = PatchJobSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: body.error.message }, { status: 400 })

  const [updated] = await db.update(scheduledJobs)
    .set({ ...body.data, updated_at: new Date() })
    .where(eq(scheduledJobs.id, id))
    .returning()

  return NextResponse.json({ job: updated })
}
```

### Timezone default — browser-side
```typescript
// In CreateJobWizard Step 2 initial state
const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
// → 'America/New_York', 'Europe/London', etc.
```

### Skill card data (Step 1)
```typescript
// 12 schedulable skills with display metadata
export const SCHEDULABLE_SKILLS = [
  { id: 'morning-briefing',        label: 'Morning Briefing',        desc: 'Daily AI briefing for your projects', hasParams: false },
  { id: 'customer-project-tracker',label: 'Customer Project Tracker', desc: 'Track project health per customer',  hasParams: true  },
  { id: 'weekly-customer-status',  label: 'Weekly Customer Status',  desc: 'Generate weekly status updates',     hasParams: true  },
  { id: 'elt-external',            label: 'ELT External',            desc: 'External ELT deck generation',       hasParams: true  },
  { id: 'elt-internal',            label: 'ELT Internal',            desc: 'Internal ELT deck generation',       hasParams: true  },
  { id: 'biggy-weekly-briefing',   label: 'Biggy Weekly Briefing',   desc: 'Weekly Biggy AI insights brief',     hasParams: false },
  { id: 'context-updater',         label: 'Context Updater',         desc: 'Refresh project context from Slack', hasParams: true  },
  { id: 'meeting-summary',         label: 'Meeting Summary',         desc: 'Summarise recent meeting transcripts',hasParams: false },
  { id: 'workflow-diagram',        label: 'Workflow Diagram',        desc: 'Generate architecture diagrams',     hasParams: true  },
  { id: 'team-engagement-map',     label: 'Team Engagement Map',     desc: 'Visualise team engagement status',   hasParams: true  },
  { id: 'discovery-scan',          label: 'Discovery Scan',          desc: 'Scan external sources for updates',  hasParams: true  },
  { id: 'timesheet-reminder',      label: 'Timesheet Reminder',      desc: 'Send timesheet submission reminders',hasParams: false },
] as const

export type SkillId = typeof SCHEDULABLE_SKILLS[number]['id']
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static `JOB_SCHEDULE_MAP` in worker | DB-driven `scheduled_jobs` CRUD | Phase 24 | Jobs created at runtime without restart |
| No run history | `run_history_json` JSONB array | Phase 17 schema, Phase 24 writes | Per-job audit trail |
| Settings-page-only scheduler | Standalone `/scheduler` page with wizard | Phase 24 | Full self-service job management |

**Legacy that remains:**
- `worker/scheduler.ts`: `JOB_SCHEDULE_MAP` and static `upsertJobScheduler` calls — these must be replaced (or wrapped) with DB-driven reads. Do not keep both in parallel or jobs will be double-registered.

---

## Open Questions

1. **ELT External, ELT Internal, Biggy Weekly Briefing, Workflow Diagram, Team Engagement Map — worker handlers**
   - What we know: `JOB_HANDLERS` in `worker/index.ts` includes `handoff-doc-generator`, `weekly-customer-status`, `context-updater`, and `discovery-scan` — but NOT elt-external, elt-internal, biggy-weekly-briefing, workflow-diagram, team-engagement-map by those names.
   - What's unclear: Are these routed through `skill-run` handler? Or do they require new named handlers? The `skill-run.ts` handler may be the generic skill dispatcher.
   - Recommendation: Planner should inspect `worker/jobs/skill-run.ts` to confirm it handles these skills, and if so, define `skill_name` values that route through `skill-run`. If not, Wave 0 creates stub handlers.

2. **"Once" frequency — DB representation of cron_expression**
   - What we know: `cron_expression` column is `text not null` — cannot store `null` for one-shot jobs.
   - What's unclear: How to store "once at specific time" in a cron expression field.
   - Recommendation: For "once" jobs, store the specific-time cron (e.g., `0 30 9 30 3 *`) and a `frequency_type: 'once'` key inside `skill_params_json`. The worker hook reads `frequency_type` and disables the job after first successful run.

3. **Trigger endpoint extension**
   - What we know: Existing `POST /api/jobs/trigger` takes `{ jobName: string }`.
   - What's unclear: Should it be extended to take `{ jobId: number }` or kept separate?
   - Recommendation: Extend to accept either `{ jobName }` (legacy) or `{ jobId }` (new). When `jobId` is provided, look up the row, enqueue `queue.add(row.skill_name, { triggeredBy: 'manual', jobId, params: row.skill_params_json })`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `npx vitest run tests/scheduler-* --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHED-01 | POST /api/jobs creates a DB row | unit | `npx vitest run tests/scheduler/jobs-crud.test.ts -t "POST /api/jobs"` | ❌ Wave 0 |
| SCHED-02 | frequencyToCron converts UI selections to valid cron strings | unit | `npx vitest run tests/scheduler/frequency-to-cron.test.ts` | ❌ Wave 0 |
| SCHED-03 | Timezone field defaults to browser timezone; stored as IANA string | unit | `npx vitest run tests/scheduler/jobs-crud.test.ts -t "timezone"` | ❌ Wave 0 |
| SCHED-04 | skill_params_json stored and returned with job | unit | `npx vitest run tests/scheduler/jobs-crud.test.ts -t "skill_params"` | ❌ Wave 0 |
| SCHED-05 | PATCH /api/jobs/[id] with enabled=false updates DB, enabled jobs list excludes it | unit | `npx vitest run tests/scheduler/jobs-crud.test.ts -t "enabled"` | ❌ Wave 0 |
| SCHED-06 | POST /api/jobs/trigger with jobId enqueues job | unit | `npx vitest run tests/scheduler/trigger.test.ts` | ❌ Wave 0 |
| SCHED-07 | GET /api/jobs response includes last_run_at, last_run_outcome | unit | `npx vitest run tests/scheduler/jobs-crud.test.ts -t "last_run"` | ❌ Wave 0 |
| SCHED-08 | Worker failed handler inserts app_notification of type scheduler_failure | unit | `npx vitest run tests/scheduler/notifications.test.ts` | ❌ Wave 0 |
| SCHED-09 | appendRunHistory keeps only last 10 entries, adds new entry | unit | `npx vitest run tests/scheduler/run-history.test.ts` | ❌ Wave 0 |
| SCHED-10 | Sidebar.tsx contains /scheduler href | unit | `npx vitest run tests/scheduler/sidebar.test.ts` | ❌ Wave 0 |
| SCHED-11 | getNextWizardStep skips params step for skills with hasParams=false | unit | `npx vitest run tests/scheduler/wizard-step.test.ts` | ❌ Wave 0 |
| SCHED-12 | SCHEDULABLE_SKILLS array contains all 12 skill IDs | unit | `npx vitest run tests/scheduler/skill-list.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/scheduler/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `bigpanda-app/tests/scheduler/jobs-crud.test.ts` — covers SCHED-01, SCHED-03, SCHED-04, SCHED-05, SCHED-07
- [ ] `bigpanda-app/tests/scheduler/frequency-to-cron.test.ts` — covers SCHED-02
- [ ] `bigpanda-app/tests/scheduler/trigger.test.ts` — covers SCHED-06
- [ ] `bigpanda-app/tests/scheduler/notifications.test.ts` — covers SCHED-08
- [ ] `bigpanda-app/tests/scheduler/run-history.test.ts` — covers SCHED-09
- [ ] `bigpanda-app/tests/scheduler/sidebar.test.ts` — covers SCHED-10
- [ ] `bigpanda-app/tests/scheduler/wizard-step.test.ts` — covers SCHED-11
- [ ] `bigpanda-app/tests/scheduler/skill-list.test.ts` — covers SCHED-12

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `bigpanda-app/db/schema.ts` (scheduled_jobs, appNotifications, jobRunOutcomeEnum)
- Codebase direct inspection — `bigpanda-app/worker/scheduler.ts` (BullMQ upsertJobScheduler pattern)
- Codebase direct inspection — `bigpanda-app/worker/index.ts` (JOB_HANDLERS, concurrency:1, event listeners)
- Codebase direct inspection — `bigpanda-app/app/api/jobs/trigger/route.ts` (existing trigger endpoint)
- Codebase direct inspection — `bigpanda-app/components/ProjectWizard.tsx` (wizard pattern, stepper header, Dialog)
- Codebase direct inspection — `bigpanda-app/components/Sidebar.tsx` (RSC, existing nav links)
- Codebase direct inspection — `bigpanda-app/lib/time-tracking-notifications.ts` (appNotifications insert pattern)
- Codebase direct inspection — `bigpanda-app/app/api/notifications/time-tracking/route.ts` (notification fetch/mark-read API pattern)
- Codebase direct inspection — `bigpanda-app/package.json` (all dependencies confirmed)

### Secondary (MEDIUM confidence)
- BullMQ documentation (memory) — `upsertJobScheduler`, `queue.add` with delay, `Worker` event handlers
- MDN (memory) — `Intl.DateTimeFormat().resolvedOptions().timeZone`, `Intl.supportedValuesOf('timeZone')`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json, all DB columns confirmed in schema.ts
- Architecture: HIGH — all patterns derived from existing codebase code inspection
- Pitfalls: HIGH — derived from existing code structure (static JOB_SCHEDULE_MAP migration, dispatch by job.name, trigger endpoint contract)
- Validation: HIGH — vitest confirmed in project, test file locations follow established convention

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable codebase, no fast-moving dependencies)
