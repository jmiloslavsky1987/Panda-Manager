# Phase 35: Overview Tab — Weekly Focus & Integration Tracker - Research

**Researched:** 2026-04-03
**Domain:** Next.js 16 / React / BullMQ / Redis / Drizzle ORM / Anthropic SDK
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Integration Tracker — workstream assignment**
- Add `track` column (TEXT, nullable: 'ADR' | 'Biggy') to the `integrations` table via a new migration
- Consistent with the pattern from Phase 33 (onboarding_phases and onboarding_steps both have track)
- Existing integrations with track=null appear in an **Unassigned** section on the Overview tracker until a user assigns them
- No backfill heuristic — user assigns explicitly via the Integrations tab

**Integration Tracker — type field**
- Add `integration_type` column (TEXT, nullable) to `integrations` table in the same migration
- Valid types are track-dependent:
  - **ADR:** Inbound | Outbound | Enrichment
  - **Biggy:** Real-time | Context | Knowledge | UDC
- On the Integrations tab add/edit form: selecting a track **filters the type dropdown** to only show valid types for that track — prevents mis-categorization

**Integration Tracker — Overview section layout**
- Split into three sections: **ADR**, **Biggy**, **Unassigned** (Unassigned only shown if any exist)
- Each section groups integrations by their `integration_type`, then lists integrations within each type group
- Inline editing preserved: pipeline bar (status cycle) + notes textarea remain in the Overview view — same interaction model as today, reorganized into the new sections

**Weekly Focus — progress bar**
- The circular `ProgressRing` shows **overall onboarding completion** — average of ADR + Biggy step completion %
- Reuses the same `overview-metrics` API endpoint already returning per-track step counts from Phase 34
- `ProgressRing` component already exists in `OverviewMetrics.tsx` — reuse directly

**Weekly Focus — AI generation**
- **Scope (per-project):** Each active project gets its own 3–5 priority bullets, generated independently
- **Data sent to Claude (full delivery snapshot):**
  - Blocked onboarding steps (ADR + Biggy)
  - Open high/critical risks
  - Integrations not yet validated or production
  - Actions overdue or due within the current week
  - Next upcoming milestone and its ETA
- **Cadence:** BullMQ scheduled job runs every Monday 6am, loops over all active projects
- **Storage:** Redis key `weekly_focus:{projectId}` with 7-day TTL — fast reads, auto-evicts, no DB migration needed
- **Rendering:** React Suspense boundary — AI content does NOT block page render; fetched from a `/api/projects/[projectId]/weekly-focus` polling endpoint

**Weekly Focus — empty state**
- When cache is empty (new project or TTL expired): show placeholder message + **"Generate Now" button** that triggers the job on demand for that project
- On-demand trigger calls the same job logic as the scheduled run, just for a single project

### Claude's Discretion
- Exact Redis key structure (e.g., whether to namespace by week number alongside projectId)
- Bullet formatting (plain strings vs structured JSON with priority metadata)
- Whether to use the existing `weekly-briefing.ts` stub job or create a new `weekly-focus.ts` job
- Visual layout of the Weekly Focus section (card, banner, or inline block)
- How the type group headers render within each ADR/Biggy section (collapsible or always expanded)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WKFO-01 | Overview tab displays a weekly focus summary showing the top 3–5 priorities for the current week, auto-refreshed on a weekly cadence | BullMQ scheduler pattern established (weekly-briefing.ts stub), Anthropic SDK direct call pattern from document-extraction.ts, Redis ioredis client available in worker |
| WKFO-02 | Circular progress bar is retained in the weekly focus section, tied to meaningful progress data (not removed Completeness metric) | ProgressRing component exists in OverviewMetrics.tsx:26, overview-metrics endpoint returns stepCounts per track, overall pct derivable client-side |
| OINT-01 | Integration tracker is split into ADR and Biggy sections, with each section's integrations categorized by type (ADR: Inbound, Outbound, Enrichment; Biggy: Real-time, Context/Knowledge/UDC) | integrations table is at db/schema.ts:426 — needs track + integration_type columns via migration 0027; OnboardingDashboard.tsx:643–743 is the section to replace; integrations PATCH route needs updating |
</phase_requirements>

---

## Summary

Phase 35 has two independent feature tracks that share one DB migration. The Integration Tracker redesign is a pure refactoring exercise: add two columns to the `integrations` table, update the PATCH route to accept the new fields, add a track+type assignment UI on the integrations edit surface, and restructure the `OnboardingDashboard.tsx` flat grid (lines 643–743) into grouped ADR/Biggy/Unassigned sections. No new external libraries are needed.

The Weekly Focus feature introduces the first per-project Redis caching pattern in this codebase. The ioredis client is already available (used by BullMQ everywhere) but has never been used directly for application-level key/value storage. The `weekly-briefing.ts` stub job is the natural extension point — it already has the advisory lock + jobRuns pattern wired. The AI generation call follows the `document-extraction.ts` pattern: `new Anthropic({ apiKey })` + `client.messages.create()` (non-streaming is sufficient for a short bullet list). Results stored in Redis with `setex` (7-day TTL). The new `/api/projects/[projectId]/weekly-focus` GET endpoint reads the Redis key and returns 200+data or 204 (no content yet).

The scheduler registration question is resolved by the DB-driven `scheduledJobs` table: a seed row for `weekly-focus` with cron `0 6 * * 1` (Monday 6am) is inserted as part of the migration or a separate seed step. The worker's `registerDbSchedulers()` will pick it up within 60 seconds.

**Primary recommendation:** Extend `weekly-briefing.ts` into `weekly-focus.ts` (rename + implement), add it to the JOB_HANDLERS map in `worker/index.ts`, write the Redis cache read/write directly using `createRedisConnection()`, and insert a `scheduled_jobs` row. For integrations, one migration, one schema update, and a component refactor.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ioredis | already installed | Direct Redis key/value (setex/get) for weekly_focus cache | Already in package.json as BullMQ peer dep; same client used by worker |
| @anthropic-ai/sdk | already installed | Direct Claude API call for bullet generation in worker | Already used in document-extraction.ts with `claude-sonnet-4-6` model |
| drizzle-orm | already installed | DB queries for snapshot data (blocked steps, risks, actions, milestones, integrations) | Project ORM; all query patterns established |
| zod | already installed | Validation of PATCH body for new track + integration_type fields | Already used in integrations/[integId]/route.ts patchSchema |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bullmq Queue | already installed | On-demand trigger: enqueue `weekly-focus` job for a single project from API | Same pattern as `/api/jobs/trigger/route.ts` + `/api/ingestion/extract/route.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct `@anthropic-ai/sdk` call | `SkillOrchestrator` + skill file | SkillOrchestrator adds MCP overhead; for a structured prompt returning 3–5 bullets, a direct call is simpler and faster |
| Redis `setex` | DB column on `projects` table | Redis approach has zero-migration cost and auto-evicts; DB would require another migration and manual TTL logic |
| Extending `weekly-briefing.ts` | New `weekly-focus.ts` file | New file is cleaner separation and avoids confusion with the existing stub; adds one entry to JOB_HANDLERS |

**Installation:** No new packages required — all needed libraries already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

New/modified files for Phase 35:

```
bigpanda-app/
├── db/
│   ├── migrations/0027_integrations_track_type.sql   # NEW: ADD COLUMN track, integration_type
│   └── schema.ts                                     # ADD: track + integration_type to integrations table
├── worker/
│   ├── jobs/weekly-focus.ts                          # NEW: advisory lock + Redis write + Claude call
│   ├── index.ts                                      # ADD: import + register 'weekly-focus' handler
│   └── lock-ids.ts                                   # ADD: WEEKLY_FOCUS: 1008
├── app/
│   └── api/projects/[projectId]/
│       ├── weekly-focus/route.ts                     # NEW: GET (Redis read) + POST (trigger job)
│       └── integrations/
│           ├── route.ts                              # EXTEND: POST with track + integration_type
│           └── [integId]/route.ts                   # EXTEND: PATCH to accept track + integration_type
└── components/
    ├── WeeklyFocus.tsx                               # NEW: self-fetching client component
    └── OnboardingDashboard.tsx                       # MODIFY: replace flat integration grid with grouped layout
```

The Overview page (`app/customer/[id]/overview/page.tsx`) adds `<WeeklyFocus projectId={projectId} />` before or after the existing components.

Note: There is no dedicated Integrations tab page at `app/customer/[id]/integrations/page.tsx`. Integration CRUD currently lives in `OnboardingDashboard.tsx` inline. The "Integrations tab" referred to in the context means exposing track + integration_type fields on the integration add/edit surface within `OnboardingDashboard.tsx` (or a modal). Verify if a separate integrations modal exists before planning.

### Pattern 1: Weekly Focus Job — Advisory Lock + Redis Write

**What:** BullMQ job handler that acquires a pg advisory lock, iterates active projects, queries delivery snapshot, calls Claude, writes to Redis with 7-day TTL.
**When to use:** Any per-project AI generation that should be cached and scheduled.

```typescript
// Source: worker/jobs/weekly-briefing.ts (existing stub) + document-extraction.ts (Claude call)
import type { Job } from 'bullmq';
import { sql, eq, and, inArray } from 'drizzle-orm';
import { Redis } from 'ioredis';
import Anthropic from '@anthropic-ai/sdk';
import db from '../../db';
import { jobRuns, onboardingSteps, risks, actions, milestones, integrations } from '../../db/schema';
import { LOCK_IDS } from '../lock-ids';
import { getActiveProjects } from '../../lib/queries';
import { createRedisConnection } from '../connection';

export default async function weeklyFocusJob(job: Job): Promise<{ status: string }> {
  // 1. Advisory lock — prevents duplicate runs
  const [row] = await db.execute(
    sql`SELECT pg_try_advisory_xact_lock(${LOCK_IDS.WEEKLY_FOCUS}) AS acquired`
  );
  const acquired = (row as Record<string, unknown>).acquired === true;
  if (!acquired) {
    await db.insert(jobRuns).values({ job_name: 'weekly-focus', status: 'skipped',
      triggered_by: job.data?.triggeredBy ?? 'scheduled', completed_at: new Date() });
    return { status: 'skipped' };
  }

  // 2. Record job start
  const [runRecord] = await db.insert(jobRuns).values({
    job_name: 'weekly-focus', status: 'running',
    triggered_by: job.data?.triggeredBy ?? 'scheduled',
  }).returning({ id: jobRuns.id });

  try {
    const redis = createRedisConnection();
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // 3. Resolve project scope (on-demand: single project; scheduled: all active)
    const projectId = job.data?.projectId as number | undefined;
    const projects = projectId ? [{ id: projectId }] : await getActiveProjects();

    for (const project of projects) {
      // 4. Query delivery snapshot (blocked steps, open risks, unvalidated integrations, overdue actions, next milestone)
      const snapshot = await buildDeliverySnapshot(project.id);

      // 5. Call Claude — non-streaming (short output)
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: buildWeeklyFocusPrompt(snapshot) }],
      });

      const bullets = parseWeeklyFocusBullets(message.content);

      // 6. Cache in Redis with 7-day TTL
      const TTL_7_DAYS = 7 * 24 * 60 * 60;
      await redis.setex(`weekly_focus:${project.id}`, TTL_7_DAYS, JSON.stringify(bullets));
    }

    await redis.quit();
    await db.update(jobRuns).set({ status: 'completed', completed_at: new Date() })
      .where(sql`id = ${runRecord.id}`);
    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(jobRuns).set({ status: 'failed', completed_at: new Date(), error_message: message })
      .where(sql`id = ${runRecord.id}`);
    throw err;
  }
}
```

### Pattern 2: Weekly Focus API Route — Redis Read + On-Demand Trigger

**What:** GET reads Redis key; POST triggers on-demand job for one project.
**When to use:** Any cached-AI-content endpoint pattern.

```typescript
// Source: app/api/projects/[projectId]/weekly-focus/route.ts (NEW)
import { NextRequest, NextResponse } from 'next/server'
import { Queue } from 'bullmq'
import { requireSession } from '@/lib/auth-server'
import { createApiRedisConnection, createRedisConnection } from '@/worker/connection'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse
  const { projectId } = await params
  const redis = createApiRedisConnection()
  await redis.connect()  // lazyConnect: true — must connect manually
  const raw = await redis.get(`weekly_focus:${projectId}`)
  await redis.quit()
  if (!raw) return NextResponse.json({ bullets: null }, { status: 200 })
  return NextResponse.json({ bullets: JSON.parse(raw) })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse
  const { projectId } = await params
  const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any })
  await queue.add('weekly-focus', { triggeredBy: 'manual', projectId: parseInt(projectId, 10) },
    { removeOnComplete: 10, removeOnFail: 5 })
  await queue.close()
  return NextResponse.json({ queued: true })
}
```

### Pattern 3: Integration Tracker — Grouped Layout

**What:** Replace the flat `integrations.map()` grid with grouped sections by track and integration_type.
**When to use:** Any split-by-workstream rendering.

```typescript
// Source: OnboardingDashboard.tsx — replace lines 643–743
// Group integrations by track, then by integration_type within each track

const adrIntegrations = integrations.filter(i => i.track === 'ADR')
const biggyIntegrations = integrations.filter(i => i.track === 'Biggy')
const unassignedIntegrations = integrations.filter(i => !i.track)

const ADR_TYPES = ['Inbound', 'Outbound', 'Enrichment'] as const
const BIGGY_TYPES = ['Real-time', 'Context', 'Knowledge', 'UDC'] as const

function renderTrackSection(label: string, trackIntegrations: Integration[], types: readonly string[]) {
  const byType = types.map(type => ({
    type,
    items: trackIntegrations.filter(i => i.integration_type === type)
  })).filter(group => group.items.length > 0)
  const typeless = trackIntegrations.filter(i => !i.integration_type)

  return (
    <div>
      <h3>{label}</h3>
      {byType.map(group => (
        <div key={group.type}>
          <h4>{group.type}</h4>
          {group.items.map(integ => renderIntegCard(integ))}
        </div>
      ))}
      {typeless.map(integ => renderIntegCard(integ))}
    </div>
  )
}
```

### Pattern 4: DB Migration — Integrations Track + Type

**What:** Plain SQL migration (matching project convention of manual .sql files).
**When to use:** All schema changes in this project.

```sql
-- db/migrations/0027_integrations_track_type.sql
ALTER TABLE integrations ADD COLUMN track TEXT;
ALTER TABLE integrations ADD COLUMN integration_type TEXT;

CREATE INDEX idx_integrations_track ON integrations(project_id, track);
```

### Anti-Patterns to Avoid

- **Sharing the Worker Redis connection in an API route:** Worker connection uses `maxRetriesPerRequest: null` — this will block API routes. Always use `createApiRedisConnection()` in API routes.
- **Using `@/worker/connection` alias in worker jobs:** The worker is plain Node.js (tsx), not Next.js. Worker files use relative imports (`../../lib/...`) not `@/` alias.
- **Calling `getActiveProjects()` without DB context in a job:** `getActiveProjects()` uses no RLS — safe to call from the worker without `SET LOCAL app.current_project_id`. Confirm this before each call.
- **Keeping the old flat integration grid alongside the new grouped layout:** The CONTEXT explicitly says to replace it entirely, not add alongside.
- **Using SkillOrchestrator for weekly focus:** The orchestrator is for MCP-backed skills. Weekly focus is a simple direct Claude call — no MCP needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redis TTL caching | Custom expiry tracking in DB | `ioredis.setex(key, ttl_seconds, value)` | Built-in TTL, auto-evicts, zero DB cost |
| Advisory lock for job dedup | Manual DB flag + cleanup | `pg_try_advisory_xact_lock(LOCK_IDS.X)` | Transaction-scoped, auto-releases, already established in 6 jobs |
| On-demand job trigger | Direct function call in API route | BullMQ `queue.add()` + close | Consistent queueing, respects concurrency: 1, doesn't block API thread |
| Job registration (Monday 6am) | Hardcoded in `registerAllSchedulers()` | Insert row in `scheduled_jobs` table with `cron_expression: '0 6 * * 1'` | DB-driven scheduler picks it up within 60s, manageable via Scheduler UI |

**Key insight:** The Redis caching pattern (`setex`/`get`) is new in this codebase for application data, but `ioredis` is already a direct dependency (not just a BullMQ peer). The connection utilities in `worker/connection.ts` are the correct abstraction to use.

---

## Common Pitfalls

### Pitfall 1: lazyConnect on the API Redis connection

**What goes wrong:** `createApiRedisConnection()` uses `lazyConnect: true` — calling `redis.get()` without first calling `redis.connect()` will throw or hang.
**Why it happens:** The API connection is lazy to avoid Redis unavailability blocking API startup.
**How to avoid:** In API routes using `createApiRedisConnection()`: call `await redis.connect()` before any commands, then `await redis.quit()` after. Wrap in try/finally.
**Warning signs:** `Error: Stream isn't writeable` or timeout on first Redis command.

### Pitfall 2: Worker imports must use relative paths

**What goes wrong:** Using `@/worker/connection` or `@/db` inside `worker/jobs/*.ts` causes tsx to fail or produces runtime import errors.
**Why it happens:** The worker process is plain Node.js/tsx — it does not go through the Next.js bundler and has no `@/` alias resolution.
**How to avoid:** Always use `../../db`, `../../lib/queries`, `../connection` etc. in worker files. Confirmed pattern across all existing job files.
**Warning signs:** `Cannot find module '@/...'` at worker startup.

### Pitfall 3: Advisory lock requires a DB transaction scope

**What goes wrong:** `pg_try_advisory_xact_lock` must be called inside a transaction — outside of one it behaves unexpectedly or throws.
**Why it happens:** The `xact` variant auto-releases at transaction end, which is the desired behavior.
**How to avoid:** The existing pattern in `weekly-briefing.ts` and `health-refresh.ts` calls it via `db.execute()` which internally runs in a transaction. Follow this pattern exactly — do NOT switch to `db.transaction(async tx => tx.execute(...))` unless the full job logic can fit inside a single transaction (it can't here).
**Warning signs:** Lock always returns `acquired: false`.

### Pitfall 4: Integration type validation must be track-aware

**What goes wrong:** Saving an integration with `integration_type: 'Real-time'` and `track: 'ADR'` creates a mis-categorized record that will show in the wrong type group.
**Why it happens:** The DB column is plain TEXT — no DB-level constraint enforces track-type pairing.
**How to avoid:** The PATCH route's Zod schema must validate `integration_type` against the track value. Example: `z.object({ track, integration_type }).refine(...)` or separate conditional validation. The UI dropdown filter is UX-only defense; the API must also validate.
**Warning signs:** Integration cards appear in wrong section on Overview.

### Pitfall 5: Redis connection leak in worker job

**What goes wrong:** Creating `createRedisConnection()` in the job body without calling `redis.quit()` leaks a connection per job run.
**Why it happens:** Each job invocation creates a new connection; unlike BullMQ connections, application Redis connections aren't managed by the worker lifecycle.
**How to avoid:** Always call `await redis.quit()` in a `finally` block after the loop. Or create a module-level singleton connection and reuse it.
**Warning signs:** Redis `INFO clients` shows growing `connected_clients` count over time.

### Pitfall 6: Integration tab UI — "Integrations tab" means OnboardingDashboard

**What goes wrong:** Planning tasks that assume a separate `app/customer/[id]/integrations/page.tsx` exists — it does not.
**Why it happens:** WorkspaceTabs.tsx has no "Integrations" top-level tab. Integration editing is embedded in OnboardingDashboard or does not have a dedicated edit UI yet.
**How to avoid:** The track + integration_type fields must be added to integration add/edit actions within `OnboardingDashboard.tsx` (or any modal it opens). Check for a POST handler on `integrations/route.ts` — it currently only has GET. A POST (create) + UI for add/edit with the new fields must be part of this phase.

---

## Code Examples

Verified patterns from existing codebase:

### Advisory Lock Pattern (worker job)
```typescript
// Source: worker/jobs/weekly-briefing.ts + health-refresh.ts
const [row] = await db.execute(
  sql`SELECT pg_try_advisory_xact_lock(${LOCK_IDS.WEEKLY_FOCUS}) AS acquired`
);
const acquired = (row as Record<string, unknown>).acquired === true;
if (!acquired) {
  await db.insert(jobRuns).values({
    job_name: 'weekly-focus',
    status: 'skipped',
    triggered_by: (job.data?.triggeredBy as string) ?? 'scheduled',
    completed_at: new Date(),
  });
  return { status: 'skipped' };
}
```

### Direct Anthropic SDK Call (non-streaming, worker context)
```typescript
// Source: worker/jobs/document-extraction.ts:369
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
// For non-streaming (short output like bullet list):
const message = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 512,
  messages: [{ role: 'user', content: promptString }],
});
// Extract text:
const text = message.content
  .filter(b => b.type === 'text')
  .map(b => (b as Anthropic.TextBlock).text)
  .join('');
```

### RLS Transaction Pattern (API route)
```typescript
// Source: app/api/projects/[projectId]/overview-metrics/route.ts
const result = await db.transaction(async (tx) => {
  await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
  // ... queries
})
```

### PATCH Route Zod Schema Extension
```typescript
// Source: app/api/projects/[projectId]/integrations/[integId]/route.ts
const patchSchema = z.object({
  status: z.enum(['not-connected', 'configured', 'validated', 'production', 'blocked']).optional(),
  notes: z.string().optional(),
  track: z.enum(['ADR', 'Biggy']).nullable().optional(),
  integration_type: z.string().nullable().optional(),
  // Cross-field validation in refine()
})
```

### requireSession Security Guard
```typescript
// Source: every API route in the codebase
import { requireSession } from '@/lib/auth-server'
export async function GET(req: NextRequest, ...) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse
  // ...
}
```

### BullMQ On-Demand Enqueue (API route)
```typescript
// Source: app/api/jobs/trigger/route.ts + app/api/ingestion/extract/route.ts
import { Queue } from 'bullmq'
import { createApiRedisConnection } from '@/worker/connection'
const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any })
await queue.add('weekly-focus', { triggeredBy: 'manual', projectId: numericId },
  { removeOnComplete: 10, removeOnFail: 5 })
await queue.close()  // REQUIRED: prevents connection leak in API route
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Settings-based cron registration | DB-driven via `scheduled_jobs` table + `registerDbSchedulers()` | Phase 4 (v1.x) | New jobs need a row in `scheduled_jobs`, not code in `registerAllSchedulers()` |
| Flat integration grid in Overview | Grouped by workstream + type | This phase | Old flat grid at lines 643–743 must be fully replaced |
| `weekly-briefing.ts` stub | Real weekly-focus job | This phase | Stub has no-op body; either extend it or create new `weekly-focus.ts` |
| Integrations table has no track/type | track + integration_type columns | This phase (migration 0027) | 0 runtime impact until UI populates fields |

**Deprecated/outdated:**
- `registerAllSchedulers()` in `worker/scheduler.ts`: Only used to remove legacy hardcoded scheduler IDs. New jobs must NOT be added here — they go in `scheduled_jobs` table.
- The `LOCK_IDS` object in `worker/lock-ids.ts` currently tops out at `SKILL_RUN: 1007`. The next available ID is `1008` for `WEEKLY_FOCUS`.

---

## Open Questions

1. **Does an integration add/edit UI exist outside OnboardingDashboard?**
   - What we know: `WorkspaceTabs.tsx` has no "Integrations" tab. `integrations/route.ts` has only GET (no POST for create). There is no `IntegrationEditModal.tsx` for the main integrations table (only `arch/IntegrationEditModal.tsx` for architecture integrations — a different table).
   - What's unclear: How do users currently add new integrations to a project?
   - Recommendation: Planner must verify by reading the full `OnboardingDashboard.tsx` component; the create/add path likely exists as inline form or modal within that component. If not, creating a basic add form for integrations (with track + type dropdowns) is part of this phase's scope.

2. **Should the weekly-focus job reuse `weekly-briefing.ts` or be a new file?**
   - What we know: CONTEXT.md marks this as Claude's Discretion. `weekly-briefing.ts` is a stub with no real logic. `morning-briefing.ts` shows the full per-project loop pattern.
   - What's unclear: Whether `weekly-briefing.ts` is registered in `scheduled_jobs` table with a specific job name that must be preserved.
   - Recommendation: Create a new `weekly-focus.ts` to keep concerns separated and avoid confusion. Add `'weekly-focus'` to JOB_HANDLERS. The `weekly-briefing.ts` stub can remain as-is for now (Phase 36 cleanup territory).

3. **Redis key namespace: week number or not?**
   - What we know: CONTEXT.md says `weekly_focus:{projectId}` with 7-day TTL as the locked decision. Week-number namespacing is marked as Claude's Discretion.
   - Recommendation: Keep it simple — `weekly_focus:{projectId}` with TTL. The TTL naturally handles Monday-over-Monday replacement without needing week-number keying. Week-number would require explicit eviction of old keys and adds complexity.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest@latest via package.json devDependencies) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run tests/overview/` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WKFO-01 | Weekly focus job generates 3–5 bullets and writes to Redis | unit | `npx vitest run tests/overview/weekly-focus.test.ts` | Wave 0 |
| WKFO-01 | GET /api/.../weekly-focus returns bullets from Redis cache | unit | `npx vitest run tests/overview/weekly-focus.test.ts` | Wave 0 |
| WKFO-01 | GET /api/.../weekly-focus returns null bullets when cache empty | unit | `npx vitest run tests/overview/weekly-focus.test.ts` | Wave 0 |
| WKFO-01 | POST /api/.../weekly-focus enqueues job and returns { queued: true } | unit | `npx vitest run tests/overview/weekly-focus.test.ts` | Wave 0 |
| WKFO-02 | WeeklyFocus component renders ProgressRing with overall completion % | unit | `npx vitest run tests/overview/weekly-focus.test.ts` | Wave 0 |
| WKFO-02 | ProgressRing pct is average of ADR + Biggy stepCounts from overview-metrics | unit | `npx vitest run tests/overview/weekly-focus.test.ts` | Wave 0 |
| OINT-01 | integrations with track='ADR' render in ADR section | unit | `npx vitest run tests/overview/integration-tracker.test.ts` | Wave 0 |
| OINT-01 | integrations with track='Biggy' render in Biggy section | unit | `npx vitest run tests/overview/integration-tracker.test.ts` | Wave 0 |
| OINT-01 | integrations with track=null render in Unassigned section | unit | `npx vitest run tests/overview/integration-tracker.test.ts` | Wave 0 |
| OINT-01 | ADR integrations group by type: Inbound / Outbound / Enrichment | unit | `npx vitest run tests/overview/integration-tracker.test.ts` | Wave 0 |
| OINT-01 | Biggy integrations group by type: Real-time / Context / Knowledge / UDC | unit | `npx vitest run tests/overview/integration-tracker.test.ts` | Wave 0 |
| OINT-01 | PATCH /integrations/[id] accepts track + integration_type fields | unit | `npx vitest run tests/overview/integration-tracker.test.ts` | Wave 0 |
| OINT-01 | Integrations edit form filters type dropdown based on selected track | unit | `npx vitest run tests/overview/integration-tracker.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run tests/overview/`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/overview/weekly-focus.test.ts` — covers WKFO-01, WKFO-02
- [ ] `tests/overview/integration-tracker.test.ts` — covers OINT-01
- [ ] Recharts mock already present in vitest.config.ts — no new mocks needed for ProgressRing
- [ ] Redis mock needed: `vi.mock('ioredis', ...)` — pattern from `tests/ingestion/extraction-enqueue.test.ts` which mocks BullMQ Queue/Worker

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `worker/jobs/weekly-briefing.ts`, `health-refresh.ts`, `document-extraction.ts` (job patterns, advisory lock, Anthropic SDK usage)
- Direct codebase inspection — `components/OnboardingDashboard.tsx` lines 643–743 (flat integration grid to be replaced)
- Direct codebase inspection — `worker/connection.ts` (Redis connection factories)
- Direct codebase inspection — `worker/index.ts` + `worker/scheduler.ts` (job registration, DB-driven scheduler)
- Direct codebase inspection — `db/schema.ts` + `db/migrations/0026_onboarding_track.sql` (migration pattern)
- Direct codebase inspection — `app/api/projects/[projectId]/integrations/route.ts` + `[integId]/route.ts` (current integration API surface)
- Direct codebase inspection — `app/customer/[id]/overview/page.tsx` (current Overview page composition)
- Direct codebase inspection — `components/OverviewMetrics.tsx` (ProgressRing definition + overview-metrics API shape)
- Direct codebase inspection — `vitest.config.ts` (test framework + existing mocks)

### Secondary (MEDIUM confidence)
- STATE.md Phase 35 context note: "Prompt engineering research needed during planning (2 hour budget)" — acknowledged but deferred to planning; direct API call is well-established
- REQUIREMENTS.md WKFO-01/WKFO-02/OINT-01 requirement text

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, import patterns verified in codebase
- Architecture: HIGH — all patterns have direct precedents in existing worker jobs and API routes
- Pitfalls: HIGH — identified from actual codebase inspection (lazyConnect flag, relative imports requirement, missing POST on integrations route)
- Validation: HIGH — test framework verified, existing test structure in `tests/overview/` directory present

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable libraries, no fast-moving dependencies)
