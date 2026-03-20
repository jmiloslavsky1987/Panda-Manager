# Phase 4: Job Infrastructure - Research

**Researched:** 2026-03-20
**Domain:** BullMQ v5, Redis connection management, pg_advisory_lock, Next.js App Router settings page, worker process lifecycle
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Worker Process Management**
- Method: `concurrently` — `npm run dev` starts both Next.js and the BullMQ worker in one terminal command
- Worker lives at `bigpanda-app/worker/index.ts`, launched via a separate script entry in package.json
- Worker script: `npm run worker` (tsx worker/index.ts)
- Dev script: `concurrently "next dev" "npm run worker"`
- Restarting Next.js must NOT kill the worker (separate process via concurrently)

**Redis Connection**
- Read from `REDIS_URL` environment variable in `.env.local`
- Default fallback: `redis://localhost:6379` if `REDIS_URL` is unset
- Single Redis connection factory shared across worker and any BullMQ queue clients

**Advisory Locking (Overlap Prevention)**
- Use PostgreSQL `pg_advisory_lock` — zero extra dependencies, uses existing DB connection
- Each scheduled job has a unique integer lock ID (derived from a hash or hardcoded constant)
- Before executing, worker calls `SELECT pg_try_advisory_lock($id)` — returns true/false
- If false: log "skipped: advisory lock held" and mark job as skipped, do NOT run
- Lock is released with `pg_advisory_unlock($id)` after job completion (or on error)

**Job Status UI**
- Lives at `/settings` route — new page accessible from sidebar
- Settings page has tabs; the first/default tab is Jobs
- Jobs tab shows a table with columns: Job Name | Schedule | Last Run | Last Status | Next Run | Actions
- "Actions" column has a Trigger Now button that manually enqueues a test job run
- Status values: pending / running / completed / failed / skipped
- Data comes from `job_runs` DB table (persisted job history)

**Schedule Configurability**
- All 6 job cron schedules are stored in the existing `settings` table (key-value pairs)
- UI: each job row has an editable cron field (or human-readable time picker)
- Saving a schedule: PATCH `/api/settings` → worker polls settings every 60s and re-registers changed schedules
- No code deploy or server restart needed to change schedule

**The 6 Scheduled Jobs (Phase 4 registers no-op stubs; Phase 5 wires real execution)**
1. `action-sync` — Sync actions from YAML to DB
2. `health-refresh` — Recompute project health scores
3. `weekly-briefing` — Generate weekly customer briefings
4. `context-updater` — Sweep inbound communications for context updates
5. `gantt-snapshot` — Snapshot current plan state
6. `risk-monitor` — Check for newly elevated risks

**Database Table: job_runs**
Required columns: id, job_name, status (pending/running/completed/failed/skipped), started_at, completed_at, error_message, triggered_by (scheduled | manual)

### Claude's Discretion

- BullMQ v5+ (latest stable) — check `npm view bullmq version` before coding
- `concurrently` package: `concurrently "npm run next-dev" "npm run worker"` in package.json
- Advisory lock IDs: define as constants in `worker/lock-ids.ts` (e.g., ACTION_SYNC = 1001, HEALTH_REFRESH = 1002, etc.)
- Worker should NOT crash on individual job failure — catch errors per-job, log, mark failed
- Settings page sidebar link: label "Settings", icon gear, below existing project links

### Deferred Ideas (OUT OF SCOPE)

- Actual skill payloads / real job execution (Phase 5)
- Email/Slack notifications on job failure (post-Phase 5)
- Bull Board or external queue monitoring UI (not needed — custom Jobs tab is sufficient)
- Job retry policies beyond basic BullMQ defaults (Phase 5 or later)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHED-01 | BullMQ worker process as dedicated process alongside Next.js; persists across restarts; no duplicate firing | BullMQ `Worker` class as separate `tsx` process via `concurrently`; `upsertJobScheduler` prevents duplicates on restart |
| SCHED-02 | Daily 8am: Morning Briefing background job — result stored in DB | `upsertJobScheduler` with cron pattern `'0 8 * * *'`; worker writes job_runs row |
| SCHED-03 | Daily 8am: Cross-account health check — flag status changes, overdue actions | `upsertJobScheduler` with cron pattern `'0 8 * * *'`; separate queue or job name distinguishes from SCHED-02 |
| SCHED-04 | Daily 9am: Overnight Slack + Gmail sweep for customer messages | `upsertJobScheduler` with cron pattern `'0 9 * * *'` |
| SCHED-05 | Monday 7am: Full Customer Project Tracker run for all active accounts | `upsertJobScheduler` with cron pattern `'0 7 * * 1'` |
| SCHED-06 | Thursday 4pm: Weekly Status Draft generation | `upsertJobScheduler` with cron pattern `'0 16 * * 4'` |
| SCHED-07 | Friday 9am: Biggy Weekly Briefing generation | `upsertJobScheduler` with cron pattern `'0 9 * * 5'` |
| SCHED-08 | All schedule times configurable via Settings; jobs have queryable status visible in UI | Settings polling loop in worker re-calls `upsertJobScheduler`; `/settings` page reads `job_runs` table via API |
</phase_requirements>

---

## Summary

Phase 4 establishes the job execution infrastructure: a persistent BullMQ v5 worker process runs alongside Next.js via `concurrently`, all 6 scheduled jobs are registered using the `upsertJobScheduler` API (the current v5 approach, replacing the deprecated repeatable jobs API), and job status is written to a new `job_runs` table queryable from a `/settings` page.

The critical version facts: BullMQ is currently at **v5.71.0** (confirmed via `npm view bullmq version`). `QueueScheduler` was removed in BullMQ 2.0 — do not use it. The repeatable jobs API (`queue.add` with `repeat:` options) was deprecated in v5.16.0 in favor of `queue.upsertJobScheduler`. The current production API is `upsertJobScheduler` with a stable string scheduler ID, which is idempotent on worker restart. `concurrently` is at **v9.2.1**.

The advisory locking pattern using `pg_try_advisory_lock` with postgres.js is well-established but requires a dedicated connection (not pool) for session-level locks — or transaction-level lock functions (`pg_try_advisory_xact_lock`) which auto-release when the query transaction ends. The transaction-level variant is safer in a connection-pool context (which the project uses).

**Primary recommendation:** Use `upsertJobScheduler` with stable scheduler IDs for all 6 jobs; use `pg_try_advisory_xact_lock` (transaction-scoped) rather than session-level advisory locks to avoid pool contamination; run the worker via `tsx watch worker/index.ts` in dev for hot reload.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bullmq | 5.71.0 (latest) | Job queue + worker process + scheduler | Industry standard for Node.js job queues; Redis-backed; TypeScript-first |
| ioredis | 5.10.1 (already in npm) | Redis client for BullMQ | BullMQ's required Redis client; already available via transitive deps |
| concurrently | 9.2.1 | Run Next.js + worker simultaneously | Cross-platform process runner; better than `&` for dev |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | ^4.21.0 (already installed) | Run TypeScript worker directly | Already in devDependencies; `tsx worker/index.ts` works without compile step |
| drizzle-orm | ^0.45.1 (already installed) | Write job_runs rows from worker | Reuse project's existing DB layer in worker process |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bullmq | node-cron | node-cron is in-process only; no Redis persistence, no multi-instance safety |
| bullmq | pg-boss | pg-boss uses Postgres not Redis; adds no value given Redis is already required |
| ioredis directly | node-redis | BullMQ requires ioredis specifically; node-redis is incompatible |

**Installation:**
```bash
cd bigpanda-app && npm install bullmq ioredis
cd /path/to/project && npm install --save-dev concurrently
```

Note: `ioredis` may already be present as a transitive dependency; check `bigpanda-app/node_modules/.package-lock.json` — if not, explicit install is required. `concurrently` goes in project root `devDependencies` (not inside bigpanda-app/) since it wraps both processes.

---

## Architecture Patterns

### Recommended Project Structure
```
bigpanda-app/
├── worker/
│   ├── index.ts          # Worker entry point — registers all schedulers, starts Worker
│   ├── connection.ts     # Redis connection factory (shared IORedis instance)
│   ├── lock-ids.ts       # Advisory lock ID constants (ACTION_SYNC = 1001, etc.)
│   ├── scheduler.ts      # upsertJobScheduler calls for all 6 jobs
│   └── jobs/
│       ├── action-sync.ts       # No-op stub handler
│       ├── health-refresh.ts    # No-op stub handler
│       ├── weekly-briefing.ts   # No-op stub handler
│       ├── context-updater.ts   # No-op stub handler
│       ├── gantt-snapshot.ts    # No-op stub handler
│       └── risk-monitor.ts      # No-op stub handler
├── app/
│   ├── settings/
│   │   ├── page.tsx      # /settings — default tab = Jobs
│   │   └── layout.tsx    # Optional: settings-scoped layout (if adding more tabs later)
│   └── api/
│       ├── job-runs/
│       │   └── route.ts  # GET /api/job-runs — list recent runs for Jobs tab
│       └── jobs/
│           └── trigger/
│               └── route.ts  # POST /api/jobs/trigger — manual enqueue
├── db/
│   ├── schema.ts         # Add jobRuns table definition
│   └── migrations/
│       └── 0003_add_job_runs.sql  # New migration
```

### Pattern 1: Redis Connection Factory

BullMQ workers require `maxRetriesPerRequest: null` on the IORedis connection or BullMQ throws an exception. Use a factory function that reads `REDIS_URL` from env with a localhost fallback:

```typescript
// worker/connection.ts
// Source: https://docs.bullmq.io/guide/connections
import { Redis } from 'ioredis';

export function createRedisConnection(): Redis {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new Redis(url, {
    maxRetriesPerRequest: null,   // REQUIRED for BullMQ workers
    enableReadyCheck: false,
  });
}

// Create ONE shared connection for the worker process
export const redisConnection = createRedisConnection();
```

**Critical:** `maxRetriesPerRequest: null` is mandatory for the connection passed to `Worker`. The `Queue` class is more lenient, but it is safest to apply this setting to all connections.

### Pattern 2: upsertJobScheduler (Current v5 API)

The `upsertJobScheduler` method is idempotent — calling it multiple times with the same scheduler ID updates the existing scheduler without creating duplicates. This replaces the deprecated `queue.add({ repeat: ... })` pattern.

```typescript
// worker/scheduler.ts
// Source: https://docs.bullmq.io/guide/job-schedulers
import { Queue } from 'bullmq';
import { redisConnection } from './connection';
import { AppSettings } from '../lib/settings';

export const jobQueue = new Queue('scheduled-jobs', { connection: redisConnection });

export async function registerAllSchedulers(settings: AppSettings): Promise<void> {
  const cronMap: Record<string, string> = {
    'action-sync':       settings.schedule.morning_briefing,  // reuse or add dedicated key
    'health-refresh':    settings.schedule.health_check,
    'weekly-briefing':   settings.schedule.weekly_status,
    'context-updater':   settings.schedule.slack_sweep,
    'gantt-snapshot':    settings.schedule.tracker_weekly,
    'risk-monitor':      settings.schedule.biggy_briefing,
  };

  for (const [jobName, cronPattern] of Object.entries(cronMap)) {
    await jobQueue.upsertJobScheduler(
      jobName,                    // stable scheduler ID — prevents duplicates on restart
      { pattern: cronPattern },   // cron expression
      { name: jobName, data: { triggeredBy: 'scheduled' } }
    );
  }
}
```

### Pattern 3: Worker Process Entry Point

```typescript
// worker/index.ts
// Source: https://docs.bullmq.io/guide/workers, https://docs.bullmq.io/guide/workers/graceful-shutdown
import { Worker } from 'bullmq';
import { redisConnection, createRedisConnection } from './connection';
import { registerAllSchedulers } from './scheduler';
import { readSettings } from '../lib/settings';
import db from '../db';

const worker = new Worker('scheduled-jobs', async (job) => {
  // Dispatch to per-job handler
  const handler = await import(`./jobs/${job.name}`);
  await handler.default(job, db);
}, {
  connection: createRedisConnection(), // Worker needs its own connection
  concurrency: 1,
});

worker.on('error', (err) => console.error('[worker] error', err));
// REQUIRED: missing error listener causes worker to stop processing

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`[worker] received ${signal}, shutting down...`);
  await worker.close();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Initial registration + 60s polling for schedule changes
async function start() {
  const settings = await readSettings();
  await registerAllSchedulers(settings);
  setInterval(async () => {
    const fresh = await readSettings();
    await registerAllSchedulers(fresh);
  }, 60_000);
}

start().catch(console.error);
```

### Pattern 4: Advisory Lock with Transaction-Level Functions

Use `pg_try_advisory_xact_lock` (transaction-scoped) instead of session-level `pg_try_advisory_lock`. Transaction-scoped locks auto-release when the enclosing transaction ends, making them safe with connection pools (no risk of lock leaking across pool connections).

```typescript
// In job handler (e.g., worker/jobs/health-refresh.ts)
// Source: https://www.postgresql.org/docs/current/functions-admin.html
import { LOCK_IDS } from '../lock-ids';
import db from '../../db';
import { sql } from 'drizzle-orm';

export default async function healthRefreshJob(job: Job, database: typeof db) {
  // pg_try_advisory_xact_lock: returns bool, auto-releases at transaction end
  const result = await database.execute(
    sql`SELECT pg_try_advisory_xact_lock(${LOCK_IDS.HEALTH_REFRESH})`
  );
  const acquired = result.rows[0]?.pg_try_advisory_xact_lock === true;

  if (!acquired) {
    console.log(`[health-refresh] skipped: advisory lock ${LOCK_IDS.HEALTH_REFRESH} held`);
    // mark job as skipped in job_runs
    return { status: 'skipped' };
  }

  // No-op stub for Phase 4 — Phase 5 wires real execution
  console.log('[health-refresh] executing (stub)');
  return { status: 'completed' };
}
```

```typescript
// worker/lock-ids.ts
export const LOCK_IDS = {
  ACTION_SYNC:      1001,
  HEALTH_REFRESH:   1002,
  WEEKLY_BRIEFING:  1003,
  CONTEXT_UPDATER:  1004,
  GANTT_SNAPSHOT:   1005,
  RISK_MONITOR:     1006,
} as const;
```

### Pattern 5: job_runs Table Write Pattern

Each job handler records its run in the `job_runs` table. The worker writes a row at job start (status: `running`) and updates it at completion or failure.

```typescript
// Drizzle schema addition (db/schema.ts)
export const jobRunStatusEnum = pgEnum('job_run_status', [
  'pending', 'running', 'completed', 'failed', 'skipped'
]);

export const jobRuns = pgTable('job_runs', {
  id: serial('id').primaryKey(),
  job_name: text('job_name').notNull(),
  status: jobRunStatusEnum('status').default('pending').notNull(),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  error_message: text('error_message'),
  triggered_by: text('triggered_by').default('scheduled').notNull(), // 'scheduled' | 'manual'
});
```

### Pattern 6: /settings Route + Jobs Tab

The existing `Sidebar` component is a Server Component (`async function Sidebar()`). It does not use `usePathname`. A Settings link must be added as a static `<Link>` — no client component change needed for the link itself. The active-link highlighting for the existing nav uses a separate `SidebarProjectItem` client component.

```tsx
// Addition to bigpanda-app/components/Sidebar.tsx (bottom of nav, below Projects section)
<div className="px-4 mt-4">
  <Link
    href="/settings"
    className="block text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded px-2 py-1.5 text-sm transition-colors flex items-center gap-2"
  >
    <GearIcon className="w-4 h-4" />  {/* lucide-react: Settings icon */}
    Settings
  </Link>
</div>
```

The `/settings` page uses `@radix-ui/react-tabs` (already installed) for the Jobs tab:

```tsx
// bigpanda-app/app/settings/page.tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';
```

### Pattern 7: package.json Scripts Update

```json
{
  "scripts": {
    "dev": "concurrently --names \"NEXT,WORKER\" -c \"blue,green\" \"npm run next-dev\" \"npm run worker\"",
    "next-dev": "next dev",
    "worker": "tsx watch worker/index.ts",
    "build": "next build",
    "start": "next start"
  }
}
```

Note: `concurrently` is installed at the project root (not inside `bigpanda-app/`). The `dev` script in `bigpanda-app/package.json` is updated; `concurrently` added to devDependencies at the project root level or inside `bigpanda-app/` depending on where `npm run dev` is invoked from. Given the playwright config runs `cd bigpanda-app && npm run dev`, `concurrently` should be in `bigpanda-app/devDependencies`.

### Anti-Patterns to Avoid
- **Using `queue.add` with `repeat:` option**: Deprecated since v5.16.0 — use `upsertJobScheduler` instead
- **Using QueueScheduler**: Removed in BullMQ 2.0 — do not add or import
- **Session-level advisory locks in a connection pool**: `pg_advisory_lock` requires the same connection for lock and unlock; use `pg_try_advisory_xact_lock` instead
- **Missing error listener on Worker**: BullMQ stops processing if no error listener is attached
- **Sharing one IORedis connection between Queue and Worker**: Worker needs its own separate connection (BullMQ docs: bclient connections cannot be reused)
- **`immediately: true` with cron pattern**: Known v5 bug — fires the job many times on initial registration; do not use for Phase 4
- **In-process cron via setInterval or node-cron**: Not persistent across restarts; can duplicate on multi-process deploy

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom setInterval scheduler | `upsertJobScheduler` with cron pattern | Redis persistence, survives process restart, deduplication built-in |
| Job queue persistence | In-memory queue with array | BullMQ Queue + Worker | Redis-backed, distributed, retry/backoff, visibility |
| Worker deduplication | Custom mutex file | BullMQ scheduler ID uniqueness | `upsertJobScheduler` ID is the deduplication key — no extras needed |
| Cron expression parsing | Custom cron parser | cron-parser (BullMQ dependency) | Already bundled with BullMQ |
| Job status tracking in Redis | Custom Redis keys | `job_runs` table in PostgreSQL | UI needs SQL queries; Redis job state is transient |

**Key insight:** BullMQ's `upsertJobScheduler` is the entire scheduler registration layer — calling it with the same ID at every worker startup is the intended pattern, not a bug. No additional deduplication logic is needed.

---

## Common Pitfalls

### Pitfall 1: maxRetriesPerRequest not set to null
**What goes wrong:** BullMQ throws `Error: EXECABORT Transaction discarded because of previous errors` or worker silently fails to start
**Why it happens:** Default IORedis setting is incompatible with BullMQ's blocking Redis commands
**How to avoid:** Always set `maxRetriesPerRequest: null` on the IORedis instance passed to Worker
**Warning signs:** Worker starts without error but never processes any jobs

### Pitfall 2: Single Redis connection shared with Worker
**What goes wrong:** Queue operations block worker or vice versa; IORedis subscriber mode conflicts
**Why it happens:** BullMQ internally needs multiple connection types (client, subscriber, bclient)
**How to avoid:** Worker should call `createRedisConnection()` to get its own fresh connection; do not reuse the Queue's connection
**Warning signs:** Intermittent hangs, connection timeouts under load

### Pitfall 3: Session-level advisory locks leaking in connection pool
**What goes wrong:** Lock appears permanently held after job completes; subsequent job runs always skip
**Why it happens:** `pg_advisory_lock` acquired on connection A, released on connection B (different pool member)
**How to avoid:** Use `pg_try_advisory_xact_lock` — auto-releases at transaction end regardless of which pool connection is used
**Warning signs:** All jobs reporting "skipped: advisory lock held" after first run

### Pitfall 4: Worker imports `server-only` modules
**What goes wrong:** `import 'server-only'` throws at runtime in the worker Node.js process (not Next.js RSC context)
**Why it happens:** `lib/settings.ts` has `import 'server-only'` — this marker is Next.js-only
**How to avoid:** Worker must import settings via a non-server-only path; the existing `lib/settings.ts` at the bigpanda-app root has `import 'server-only'` — the worker should use a version without this import, or bypass it with a direct file read utility
**Warning signs:** `Error: This module cannot be imported from a Client Component module` at worker startup

### Pitfall 5: Settings polling reads stale file cache
**What goes wrong:** Worker does not pick up schedule changes saved via the UI
**Why it happens:** Node.js module cache or settings file read is cached
**How to avoid:** `readSettings()` always reads from disk (`fs.readFile`) — it does not cache. The 60s polling loop calls `readSettings()` fresh each cycle. Confirmed safe by reviewing `lib/settings.ts` implementation
**Warning signs:** Cron schedule in UI doesn't match what worker is actually running

### Pitfall 6: `settings.ts` imports `server-only` — worker cannot import it
**What goes wrong:** Worker process crashes immediately at startup with Next.js server-only boundary error
**Why it happens:** `bigpanda-app/lib/settings.ts` has `import 'server-only'` on line 13
**How to avoid:** Create a worker-safe settings reader at `worker/read-settings.ts` that duplicates just the file-read logic without `server-only`, OR create a shared `lib/settings-shared.ts` without the Next.js marker that both the API route and the worker can import
**Warning signs:** Immediate crash with message referencing `server-only` package

### Pitfall 7: concurrently in wrong package.json
**What goes wrong:** `npm run dev` fails with "concurrently: command not found"
**Why it happens:** `concurrently` installed globally or at project root, but `npm run dev` is run inside `bigpanda-app/`
**How to avoid:** Install `concurrently` in `bigpanda-app/devDependencies` (since playwright.config.ts runs `cd bigpanda-app && npm run dev`)
**Warning signs:** `sh: concurrently: command not found` when running dev

---

## Code Examples

Verified patterns from official sources:

### upsertJobScheduler — Register or Update a Cron Job
```typescript
// Source: https://docs.bullmq.io/guide/job-schedulers
const firstJob = await queue.upsertJobScheduler(
  'health-refresh',                     // stable scheduler ID — idempotent on restart
  { pattern: '0 8 * * *' },             // cron: daily at 8am
  {
    name: 'health-refresh',
    data: { triggeredBy: 'scheduled' },
    opts: { removeOnComplete: 100, removeOnFail: 50 },
  }
);
```

### Worker with Error Handler
```typescript
// Source: https://docs.bullmq.io/guide/workers
// CRITICAL: error listener is mandatory — missing it causes worker to stop processing
const worker = new Worker('scheduled-jobs', processor, { connection });
worker.on('error', (err) => console.error('[worker]', err));
worker.on('completed', (job) => console.log(`[worker] ${job.name} completed`));
worker.on('failed', (job, err) => console.error(`[worker] ${job?.name} failed`, err.message));
```

### Graceful Shutdown
```typescript
// Source: https://docs.bullmq.io/guide/workers/graceful-shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing worker...`);
  await worker.close();   // stops picking up new jobs, waits for active jobs
  process.exit(0);
};
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
```

### IORedis Connection with REDIS_URL
```typescript
// Source: https://docs.bullmq.io/guide/connections
import { Redis } from 'ioredis';

export function createRedisConnection() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new Redis(url, {
    maxRetriesPerRequest: null,  // required by BullMQ Worker
    enableReadyCheck: false,
  });
}
```

### pg_try_advisory_xact_lock in postgres.js/Drizzle
```typescript
// Source: https://www.postgresql.org/docs/current/functions-admin.html
// Transaction-scoped: auto-releases when transaction ends (safe with connection pools)
import { sql } from 'drizzle-orm';

const [row] = await db.execute(
  sql`SELECT pg_try_advisory_xact_lock(${lockId}) AS acquired`
);
const acquired = row.acquired === true;
if (!acquired) return { status: 'skipped' };
```

### Manual Trigger Endpoint
```typescript
// POST /api/jobs/trigger — adds a one-off job to the queue
import { Queue } from 'bullmq';
import { createRedisConnection } from '../../../worker/connection';

export async function POST(request: Request) {
  const { jobName } = await request.json();
  const queue = new Queue('scheduled-jobs', { connection: createRedisConnection() });
  await queue.add(jobName, { triggeredBy: 'manual' }, { jobId: `manual-${jobName}-${Date.now()}` });
  await queue.close();
  return NextResponse.json({ ok: true });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `QueueScheduler` class required | Not needed at all | BullMQ 2.0 | Remove from any old code/docs found |
| `queue.add('name', data, { repeat: { cron: '...' } })` | `queue.upsertJobScheduler(id, { pattern: '...' }, template)` | BullMQ 5.16.0 | Old API still works but deprecated; new API is idempotent |
| ioredis v4 `createClient` factory pattern | Direct `new Redis(url)` | BullMQ v4+ | Simpler; `createClient` is a Bull (v3) pattern |

**Deprecated/outdated:**
- `QueueScheduler`: Removed in BullMQ 2.0. Do not reference.
- `queue.add` with `repeat:` option: Deprecated in v5.16.0. Use `upsertJobScheduler`.
- `Bull` (not BullMQ): Entirely different older package — do not confuse.

---

## Open Questions

1. **Worker settings import — server-only boundary**
   - What we know: `bigpanda-app/lib/settings.ts` has `import 'server-only'` which crashes in Node.js worker process
   - What's unclear: Whether to create a duplicate settings reader or strip the marker from the existing one
   - Recommendation: Create `bigpanda-app/lib/settings-core.ts` with the pure read/write logic (no `server-only`); have `settings.ts` re-export from it with the marker. Worker imports from `settings-core.ts` directly.

2. **Single Queue vs. multiple queues for 6 jobs**
   - What we know: All 6 jobs are stubs in Phase 4; a single `'scheduled-jobs'` queue handles all via job name dispatch
   - What's unclear: Phase 5 may need separate queues for different concurrency limits
   - Recommendation: Use single queue for Phase 4; Phase 5 can split if needed without breaking the scheduler registration pattern.

3. **tsx watch vs. tsx (no watch) for worker**
   - What we know: `tsx watch` restarts the worker on file changes — good for dev; `tsx` (no watch) is stable for production
   - What's unclear: Whether `tsx watch` + `concurrently` creates any signal handling issues
   - Recommendation: Use `tsx watch worker/index.ts` for `npm run worker` in dev; production would use a compiled build. Low risk for single-user local app.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (E2E) + Node.js built-in test runner (unit) |
| Config file | `playwright.config.ts` (project root) |
| Quick run command | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-01"` |
| Full suite command | `npx playwright test tests/e2e/phase4.spec.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHED-01 | Worker process starts and BullMQ queue is accessible | smoke (E2E) | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-01"` | Wave 0 |
| SCHED-02 | Morning briefing scheduler registered in BullMQ | smoke (E2E) | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-02"` | Wave 0 |
| SCHED-03 | Health check scheduler registered | smoke (E2E) | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-03"` | Wave 0 |
| SCHED-04 | Slack sweep scheduler registered | smoke (E2E) | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-04"` | Wave 0 |
| SCHED-05 | Tracker weekly scheduler registered | smoke (E2E) | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-05"` | Wave 0 |
| SCHED-06 | Weekly status scheduler registered | smoke (E2E) | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-06"` | Wave 0 |
| SCHED-07 | Biggy briefing scheduler registered | smoke (E2E) | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-07"` | Wave 0 |
| SCHED-08 | /settings Jobs tab renders; Trigger Now button enqueues a job; job_runs table updates | E2E (UI) | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-08"` | Wave 0 |

Note: SCHED-01 through SCHED-07 scheduler registration is not directly testable via a browser-based E2E test. The validation strategy is:
- **UI-verifiable**: `/settings` Jobs tab shows all 6 job names with schedule and last-run status (SCHED-08)
- **Trigger-verifiable**: "Trigger Now" button fires a job; `job_runs` table receives a new row visible on page refresh
- **SCHED-01 through SCHED-07**: Verified by human inspection that all 6 schedulers appear in the Jobs tab with correct schedules

### Sampling Rate
- **Per task commit:** `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-08" --headed`
- **Per wave merge:** `npx playwright test tests/e2e/phase4.spec.ts`
- **Phase gate:** Full E2E suite green (phase2 + phase3 + phase4) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/e2e/phase4.spec.ts` — Phase 4 E2E stubs for SCHED-01 through SCHED-08
- [ ] `bigpanda-app/worker/` directory and all stub files
- [ ] `bigpanda-app/db/migrations/0003_add_job_runs.sql` — job_runs table migration

*(Existing test infrastructure: `playwright.config.ts`, `tests/e2e/` directory, and Playwright/Chromium all present from Phase 2)*

---

## Sources

### Primary (HIGH confidence)
- https://docs.bullmq.io/guide/job-schedulers — `upsertJobScheduler` API, cron patterns, update semantics
- https://docs.bullmq.io/guide/workers — Worker constructor, error handler requirement
- https://docs.bullmq.io/guide/workers/graceful-shutdown — `worker.close()` pattern, SIGTERM/SIGINT
- https://docs.bullmq.io/guide/connections — IORedis connection requirements, `maxRetriesPerRequest: null`
- https://www.postgresql.org/docs/current/functions-admin.html — `pg_try_advisory_xact_lock` semantics
- `npm view bullmq version` output: 5.71.0 (verified 2026-03-20)
- `npm view concurrently version` output: 9.2.1 (verified 2026-03-20)

### Secondary (MEDIUM confidence)
- https://docs.bullmq.io/changelog — QueueScheduler removed in v2.0; repeatable API deprecated in v5.16.0
- https://blog.taskforce.sh/bullmq-2-0/ — QueueScheduler removal announcement
- https://www.npmjs.com/package/concurrently — concurrently usage patterns
- Existing `bigpanda-app/lib/settings.ts` — confirmed `server-only` import on line 13 (verified by direct file read)
- Existing `bigpanda-app/db/index.ts` — connection pool pattern with `globalThis` guard (verified by direct file read)

### Tertiary (LOW confidence — needs validation)
- GitHub Issue #2876 (BullMQ v5.21.2, October 2024): duplicate task bug on rapid restart — mitigated by using `upsertJobScheduler` with stable IDs and not using `immediately: true`
- GitHub Issue #2860: `immediately: true` with `pattern` fires multiple times — confirmed recommendation: do not use `immediately` for Phase 4

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — BullMQ version confirmed via `npm view`; ioredis confirmed as BullMQ requirement; concurrently version confirmed
- Architecture: HIGH — patterns verified against official BullMQ docs; postgres.js advisory lock pattern verified against PostgreSQL docs; existing project files read directly
- Pitfalls: HIGH for server-only boundary (verified in source file); HIGH for `maxRetriesPerRequest` (official docs); MEDIUM for advisory lock pool issue (multiple sources agree, official PostgreSQL docs confirm)

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (BullMQ releases rapidly; check version before coding)
