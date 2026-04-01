# Phase 31: BullMQ Document Extraction Migration - Research

**Researched:** 2026-04-01
**Domain:** BullMQ job migration, PostgreSQL staging table, polling UX, Next.js API routes
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Active extraction UX:** IngestionModal stays open, polls job progress at ~2s interval. Modal shows `% complete + current chunk label: "60% — Processing chunk 3 of 5"`. If the user navigates away while modal is open, the modal closes silently — job continues in BullMQ.
- **Progress visibility on return:** When user returns to Context Hub while a job is running, the upload section is replaced by an inline "Extraction in progress" card showing per-file progress rows (one row per file: filename + % complete + current chunk label).
- **No global indicator:** Extraction status is only visible on the Context Hub page.
- **Review handoff:** When all jobs in a batch complete — (1) a toast fires wherever the user is ("Extraction complete — review X items"), (2) Context Hub inline section changes to "Ready for review" card with Review button. Clicking Review reopens IngestionModal at reviewing stage, loaded with all staged items from DB.
- **Staged items do NOT expire:** Persist in DB until reviewed/discarded.
- **Multi-file job structure:** One BullMQ job per file; multiple jobs from one upload session form a logical batch. Review is triggered once when ALL files in the batch are done.
- **Atomicity (EXTR-03):** PostgreSQL staging table for job state (NOT Redis-only). Extracted items staged in DB; workspace tab writes only happen after user approves. Failed job leaves no data in workspace tabs.
- **No job cancellation:** Explicitly out of scope. Restart is the acceptable workaround.
- **Queue name:** `'scheduled-jobs'` (shared queue, existing pattern).
- **New worker job:** `worker/jobs/document-extraction.ts` registered in `JOB_HANDLERS` in `worker/index.ts`.
- **Transport change only:** Extraction logic (chunking, Claude calls, dedup, entity routing, review, approve) is unchanged.

### Claude's Discretion

- Polling interval (suggest 2s while modal open, 5s for background Context Hub check)
- Exact `extraction_jobs` table schema (status, progress_pct, current_chunk, total_chunks, batch_id, staged_items_json)
- Worker heartbeat + stale job detection (suggested: update updated_at every 30s, mark stale after 10 min)
- Job timeout settings (suggested: 2x P95 extraction time, min 20 min)
- Toast component/library choice (use existing app toast pattern if one exists)

### Deferred Ideas (OUT OF SCOPE)

- BullMQ job cancellation
- Staged item expiry/auto-cleanup
- Global extraction indicator on nav
- Scheduled/automatic re-extraction triggers
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXTR-01 | User can navigate away from a document upload without losing the extraction — job runs in background via BullMQ | BullMQ worker process is independent of HTTP connection; DB-backed job state survives browser refresh. Existing `worker/index.ts` + `JOB_HANDLERS` dispatch map supports new `document-extraction` handler. |
| EXTR-02 | User can see extraction progress (% complete, current chunk) while the job is running | `extraction_jobs` table with `progress_pct`, `current_chunk`, `total_chunks` fields polled via `GET /api/ingestion/jobs/[jobId]`. In-worker progress update pattern: update DB row after each chunk. |
| EXTR-03 | A failed or partial extraction does not leave orphaned data in workspace tabs — all changes commit atomically when complete | Staging table pattern: extracted items written to `staged_extraction_items` (or `staged_items_json` JSONB column on `extraction_jobs`); workspace table writes only happen inside `/api/ingestion/approve` after user reviews, using existing approve route logic. |
</phase_requirements>

---

## Summary

Phase 31 migrates document extraction from a synchronous SSE route (`app/api/ingestion/extract/route.ts`) to a BullMQ background job. The extraction logic itself — chunking, Claude API calls, dedup, and entity routing — is completely unchanged and simply moves from the route handler into `worker/jobs/document-extraction.ts`. The transport layer changes: the POST endpoint becomes a thin enqueue handler returning `{ jobIds, batchId }`, and the client replaces SSE streaming with HTTP polling.

The key infrastructure addition is a new `extraction_jobs` PostgreSQL table that stores durable job state (status, progress percentage, current chunk, total chunks, batch ID, and staged items as JSONB). This table is the single source of truth that enables browser-refresh resilience: no matter what the browser does, the worker process and its state survive. The client simply polls the DB-backed status endpoint to reconstruct the current view on any page load.

The review flow is unchanged downstream: once items are staged in DB, the existing `IngestionModal` reviewing stage and `/api/ingestion/approve` route handle them identically to how they handled the SSE-delivered items before.

**Primary recommendation:** Follow the `skill-run` job pattern exactly (DB row first, then enqueue, poll via GET endpoint). Add `extraction_jobs` table for durable state. Stage extracted items in that table's JSONB column or a sibling staging table, then pass them into the existing approve flow unchanged.

---

## Standard Stack

### Core (already installed, no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bullmq | ^5.71.0 | Background job queue | Already used for all async jobs; existing worker process |
| ioredis | ^5.10.1 | Redis connection | BullMQ dependency; `as any` cast required (TS2322 type conflict, Phase 24 decision) |
| drizzle-orm | (project version) | ORM for DB writes | All DB access uses Drizzle; `extraction_jobs` table in schema.ts |
| sonner | ^2.0.7 | Toast notifications | Already installed and `<Toaster>` mounted in `app/layout.tsx` |
| @anthropic-ai/sdk | (project version) | Claude API calls in worker | Already used in extract route; move import to worker job |
| jsonrepair | (project version) | Claude JSON output repair | Already used in extract route; move import to worker job |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | (project version) | Request validation | New enqueue endpoint body validation |
| crypto (node built-in) | — | UUID generation for batchId | `randomUUID()` used by skill-run enqueue pattern |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB column for staged items | Separate `staged_extraction_items` table | Separate table adds join complexity; JSONB column on `extraction_jobs` is simpler since items are always read/written as a batch and never queried individually |
| Polling | WebSocket / SSE | SSE is the problem being solved (dies on browser refresh); WebSockets require additional infra |

**No new packages required.** All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
bigpanda-app/
├── worker/
│   └── jobs/
│       └── document-extraction.ts   # NEW — extraction job handler
├── app/
│   └── api/
│       └── ingestion/
│           ├── extract/
│           │   └── route.ts          # REPLACE — thin enqueue endpoint
│           └── jobs/
│               └── [jobId]/
│                   └── route.ts      # NEW — polling status endpoint
│       └── projects/
│           └── [projectId]/
│               └── extraction-status/
│                   └── route.ts      # NEW — Context Hub on-mount check
├── db/
│   ├── schema.ts                     # ADD extraction_jobs table + enum
│   └── migrations/
│       └── 0024_extraction_jobs.sql  # NEW — migration file
└── components/
    ├── IngestionModal.tsx             # MODIFY — SSE → polling in extracting stage
    └── ContextTab.tsx                 # MODIFY — add inline progress + review card
```

### Pattern 1: Job Enqueue (existing pattern — follow exactly)

**What:** Create DB row with status='pending', enqueue BullMQ job, return `{ jobId }`.
**When to use:** All async operations that must survive browser refresh.

```typescript
// Source: bigpanda-app/app/api/skills/[skillName]/run/route.ts (proven pattern)
// 1. Create DB row first (client has a jobId to poll immediately)
const [row] = await db.insert(extractionJobs).values({
  artifact_id: artifactId,
  project_id: projectId,
  batch_id: batchId,
  status: 'pending',
  progress_pct: 0,
  current_chunk: 0,
  total_chunks: 0,
  staged_items_json: null,
}).returning({ id: extractionJobs.id });

// 2. Enqueue
const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any });
await queue.add('document-extraction', { jobId: row.id, artifactId, projectId, batchId }, { jobId: `extraction-${row.id}` });
await queue.close();

// 3. Return jobId
return NextResponse.json({ jobId: row.id, batchId });
```

### Pattern 2: Worker Job Handler (existing pattern — follow exactly)

**What:** Update DB row status → do work → update to completed; try/catch → failed + re-throw.
**When to use:** All BullMQ job handlers.

```typescript
// Source: bigpanda-app/worker/jobs/skill-run.ts (proven pattern)
export default async function documentExtractionJob(job: Job): Promise<{ status: string }> {
  const { jobId, artifactId, projectId, batchId } = job.data;

  // 1. Mark running
  await db.update(extractionJobs)
    .set({ status: 'running', updated_at: new Date() })
    .where(eq(extractionJobs.id, jobId));

  try {
    // 2. Do work (extraction logic moved from route.ts)
    // -- update progress_pct + current_chunk after each Claude call
    for (let i = 0; i < chunks.length; i++) {
      await db.update(extractionJobs).set({
        progress_pct: Math.round(((i + 1) / chunks.length) * 100),
        current_chunk: i + 1,
        total_chunks: chunks.length,
        updated_at: new Date(),
      }).where(eq(extractionJobs.id, jobId));
      // ... Claude call ...
    }

    // 3. Stage items in DB (NOT writing to workspace tables yet)
    await db.update(extractionJobs).set({
      status: 'completed',
      staged_items_json: JSON.stringify(newItems),
      progress_pct: 100,
      updated_at: new Date(),
    }).where(eq(extractionJobs.id, jobId));

    return { status: 'completed' };
  } catch (err) {
    // 4. Mark failed — no workspace tab writes occurred
    await db.update(extractionJobs)
      .set({ status: 'failed', error_message: String(err), updated_at: new Date() })
      .where(eq(extractionJobs.id, jobId));
    throw err; // re-throw so BullMQ marks job failed in Redis
  }
}
```

### Pattern 3: Polling Endpoint (existing pattern)

**What:** `GET /api/ingestion/jobs/[jobId]` returns DB row directly.
**When to use:** Client polls until status is terminal ('completed' | 'failed').

```typescript
// Source: bigpanda-app/app/api/skills/runs/[runId]/route.ts (proven pattern)
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { jobId } = await params;
  const [row] = await db.select().from(extractionJobs)
    .where(eq(extractionJobs.id, Number(jobId)));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    status: row.status,
    progress_pct: row.progress_pct,
    current_chunk: row.current_chunk,
    total_chunks: row.total_chunks,
    error_message: row.error_message,
  });
}
```

### Pattern 4: Client Polling Loop (replaces SSE EventSource)

**What:** Replace the `ReadableStream` pump in `IngestionModal.tsx` with `setInterval` polling.
**When to use:** Extracting stage of IngestionModal, and ContextTab background check.

```typescript
// Source: pattern from IngestionModal.tsx extractFile() — replace SSE section
// In IngestionModal.tsx extracting stage:
const pollInterval = setInterval(async () => {
  const res = await fetch(`/api/ingestion/jobs/${jobId}`);
  const data = await res.json();

  setExtractionMessage(
    data.total_chunks > 0
      ? `${data.progress_pct}% — Processing chunk ${data.current_chunk} of ${data.total_chunks}`
      : 'Extracting...'
  );

  if (data.status === 'completed') {
    clearInterval(pollInterval);
    // fetch staged items from the job row, load into reviewItems, advance to reviewing stage
  } else if (data.status === 'failed') {
    clearInterval(pollInterval);
    setError(data.error_message ?? 'Extraction failed');
  }
}, 2000); // 2s while modal open

// Cleanup on unmount
return () => clearInterval(pollInterval);
```

### Pattern 5: Batch Completion Check + Toast

**What:** ContextTab polls all active batch jobs, fires toast when last job in batch completes.
**When to use:** Background check when user has navigated away.

```typescript
// Source: sonner already in layout.tsx at bottom-right; import { toast } from 'sonner'
// In ContextTab or a custom hook:
import { toast } from 'sonner';

// When all jobs in batch are status='completed':
toast.success(`Extraction complete — review ${totalItems} items`, {
  action: { label: 'Review', onClick: () => openIngestionModalAtReview() },
});
```

### Pattern 6: Redis Connection (critical)

**What:** Worker uses `createRedisConnection()` (maxRetriesPerRequest: null). API routes use `createApiRedisConnection()`.
**When to use:** Always. Never share connections between Worker and Queue.

```typescript
// Source: bigpanda-app/worker/connection.ts
// Worker: createRedisConnection() — maxRetriesPerRequest: null is REQUIRED
// API routes: createApiRedisConnection() — fail fast, lazyConnect
// BullMQ ioredis TS conflict: cast as any (Phase 24 decision, permanent)
const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any });
```

### Pattern 7: Atomicity — Staging Table Protects Workspace

**What:** Extracted items live in `staged_items_json` on `extraction_jobs` row until user approves. Workspace table writes happen exclusively in `/api/ingestion/approve/route.ts`.
**Why safe:** If extraction fails, only the `extraction_jobs` row is modified (status='failed'). No writes to `actions`, `risks`, etc. occur. This is the same guarantee the existing approve route already provides — we just delay getting to that route until background job completes.

### Pattern 8: Migration File Convention

**What:** Sequential SQL files in `bigpanda-app/db/migrations/`. Next number is `0024`.
**Convention observed:** Idempotent `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN null; END $$;` for enum creation. `CREATE TABLE IF NOT EXISTS`. RLS enabled on project-scoped tables. Index on `project_id`.

### Anti-Patterns to Avoid

- **SSE for long-running ops:** The problem being fixed. SSE dies when browser navigates away or refreshes. Never use SSE for operations > 30s.
- **Staging in Redis only:** Redis state is volatile. If worker restarts mid-job, Redis job state is lost. PostgreSQL is the durable store; Redis is only the job queue transport.
- **Sharing Redis connections between Queue and Worker:** BullMQ Worker requires `maxRetriesPerRequest: null`; Queue clients must NOT use this setting. Each caller gets its own connection instance.
- **Writing workspace tables inside the worker:** Worker stages items only. Workspace writes belong in the approve flow triggered by the user.
- **Not cleaning up `setInterval` on unmount:** Always clear polling interval in component cleanup / `useEffect` return.
- **Polling from multiple concurrent timers:** Guard polling with a ref or state flag to prevent duplicate polls if component re-renders.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job queue with retry/failure tracking | Custom DB polling + cron retry | BullMQ | BullMQ handles retry backoff, dead-letter, concurrency, job locking — all edge cases taken care of |
| Toast notifications | Custom toast component | `sonner` — already installed, `<Toaster>` already in layout | Already integrated; `toast.success()` is one line |
| Progress tracking schema | Custom ad-hoc Redis keys | `extraction_jobs` PostgreSQL table | DB is durable; Redis keys vanish on restart |
| JSON repair for Claude output | Custom regex stripping | `jsonrepair` — already used in extract route | Handles malformed JSON, truncated arrays, trailing commas |
| Worker/Queue Redis connection management | Custom connection pooling | `worker/connection.ts` factory functions | Already handles the `maxRetriesPerRequest: null` critical requirement |

**Key insight:** The entire job infrastructure already exists. This phase wires a new handler into an established system. The only genuinely new code is the `extraction_jobs` table, the job handler, and the UI polling loop.

---

## Common Pitfalls

### Pitfall 1: Worker Concurrency = 1

**What goes wrong:** With `concurrency: 1` in `worker/index.ts`, only one job runs at a time across the entire worker process. A multi-file batch where the user uploads 5 files will process them sequentially, not in parallel.
**Why it happens:** The worker was designed for singleton scheduled jobs, not user-triggered parallel jobs.
**How to avoid:** For Phase 31, sequential per-file is acceptable behavior (one file at a time, each with its own progress row). Document this in the batch model: batch items are processed one at a time, in order. Do NOT increase concurrency — this was a deliberate single-process design decision.
**Warning signs:** If testing shows all 5 files completing simultaneously, concurrency has been accidentally increased.

### Pitfall 2: Queue.close() Must Be Called After Enqueue

**What goes wrong:** API route creates a `new Queue(...)` per request. If `queue.close()` is not called, the Redis connection leaks and the route stays open.
**Why it happens:** BullMQ Queue holds an ioredis connection open.
**How to avoid:** Always call `await queue.close()` immediately after `await queue.add(...)`. Pattern shown in `app/api/skills/[skillName]/run/route.ts`.
**Warning signs:** Route handler hanging after returning response; Redis connection count growing over time.

### Pitfall 3: Worker Does Not Import from lib/ (server-only marker)

**What goes wrong:** `lib/settings.ts` has a `server-only` import that causes the worker process to crash.
**Why it happens:** Next.js `server-only` guard is a compile-time safety marker; it throws at runtime outside Next.js context.
**How to avoid:** Use `lib/settings-core.ts` (no server-only marker) for any settings reads inside worker jobs. The pattern is established in `worker/jobs/skill-run.ts`: `import { readSettings } from '../../lib/settings-core'`.
**Warning signs:** Worker process exits with "This module cannot be imported from a Client Component" or similar error.

### Pitfall 4: Multi-File Batch — Toast Fires Once, Not Per File

**What goes wrong:** Toast fires every time any job in the batch completes, producing N toasts for N files.
**Why it happens:** Simple "job completed" check without batch awareness.
**How to avoid:** The `GET /api/projects/[projectId]/extraction-status` endpoint must check whether ALL jobs in a batch are in terminal state before returning `batch_complete: true`. Toast fires only when that endpoint reports `batch_complete: true` for the first time.
**Warning signs:** User sees 3 toasts for a 3-file upload.

### Pitfall 5: `export const dynamic = 'force-dynamic'` Required on All New Routes

**What goes wrong:** Next.js statically caches GET routes at build time. Polling endpoints return stale cached data.
**Why it happens:** Next.js App Router default behavior is aggressive static caching.
**How to avoid:** Every new route handler must include `export const dynamic = 'force-dynamic'` at the module level. This is a mandatory project-wide convention (confirmed in all existing polling/status routes).
**Warning signs:** Polling always returns the same result regardless of job state changes.

### Pitfall 6: Stale Job Detection Required

**What goes wrong:** A job that was in `status='running'` when the worker process crashed stays `running` forever. UI shows infinite progress spinner.
**Why it happens:** Worker crash doesn't clean up DB rows.
**How to avoid:** Worker job handler updates `updated_at` every 30s via heartbeat (can be done after each Claude chunk call). A lightweight check in `GET /api/ingestion/jobs/[jobId]` or a cron-style check in the worker marks as `failed` any job with `status='running'` AND `updated_at < now() - 10 minutes`.
**Warning signs:** Polling endpoint returns `status: 'running'` indefinitely after worker restart.

### Pitfall 7: IngestionModal SSE Cleanup vs Polling Cleanup

**What goes wrong:** Old SSE code uses `reader.read()` in a while loop — cleanup requires `reader.cancel()`. Polling uses `setInterval` — cleanup requires `clearInterval`. Mixing these causes memory leaks.
**Why it happens:** The entire SSE section in `extractFile()` is being replaced, not amended.
**How to avoid:** Remove the entire `ReadableStream` pump block and replace it with a `setInterval` + `clearInterval` in a `useEffect`. Use a ref to store the interval ID for cleanup.

---

## Code Examples

### extraction_jobs Table Schema (recommended)

```typescript
// Add to bigpanda-app/db/schema.ts

export const extractionJobStatusEnum = pgEnum('extraction_job_status', [
  'pending', 'running', 'completed', 'failed',
]);

export const extractionJobs = pgTable('extraction_jobs', {
  id: serial('id').primaryKey(),
  artifact_id: integer('artifact_id').notNull().references(() => artifacts.id),
  project_id: integer('project_id').notNull().references(() => projects.id),
  batch_id: text('batch_id').notNull(),          // UUID — groups files from one upload session
  status: extractionJobStatusEnum('status').default('pending').notNull(),
  progress_pct: integer('progress_pct').default(0).notNull(),
  current_chunk: integer('current_chunk').default(0).notNull(),
  total_chunks: integer('total_chunks').default(0).notNull(),
  staged_items_json: jsonb('staged_items_json'),  // ExtractionItem[] — null until completed
  filtered_count: integer('filtered_count').default(0).notNull(), // dedup count
  error_message: text('error_message'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type ExtractionJob = typeof extractionJobs.$inferSelect;
```

### Migration File (0024_extraction_jobs.sql)

```sql
-- Phase 31: extraction_jobs table for BullMQ document extraction migration
-- Apply: psql $DATABASE_URL -f bigpanda-app/db/migrations/0024_extraction_jobs.sql

DO $$ BEGIN
  CREATE TYPE extraction_job_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS extraction_jobs (
  id               SERIAL PRIMARY KEY,
  artifact_id      INTEGER NOT NULL REFERENCES artifacts(id),
  project_id       INTEGER NOT NULL REFERENCES projects(id),
  batch_id         TEXT NOT NULL,
  status           extraction_job_status NOT NULL DEFAULT 'pending',
  progress_pct     INTEGER NOT NULL DEFAULT 0,
  current_chunk    INTEGER NOT NULL DEFAULT 0,
  total_chunks     INTEGER NOT NULL DEFAULT 0,
  staged_items_json JSONB,
  filtered_count   INTEGER NOT NULL DEFAULT 0,
  error_message    TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_jobs_project_id ON extraction_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_batch_id ON extraction_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON extraction_jobs(status);
```

Note: `extraction_jobs` is NOT RLS-protected. It is an internal job table, not a user-data table. Worker writes to it directly without setting `app.current_project_id`. This matches the existing `skill_runs`, `job_runs`, and `scheduled_jobs` tables which also have no RLS.

### Enqueue Route (POST /api/ingestion/extract)

```typescript
// Source: pattern from app/api/skills/[skillName]/run/route.ts
// Replace entire 575-line SSE route with this:
import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { createApiRedisConnection } from '@/worker/connection';
import db from '@/db';
import { extractionJobs } from '@/db/schema';
import { requireSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  artifactIds: z.array(z.number().int().positive()),
  projectId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const body = Schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { artifactIds, projectId } = body.data;
  const batchId = randomUUID();
  const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any });

  const jobIds: number[] = [];
  for (const artifactId of artifactIds) {
    const [row] = await db.insert(extractionJobs).values({
      artifact_id: artifactId,
      project_id: projectId,
      batch_id: batchId,
      status: 'pending',
    }).returning({ id: extractionJobs.id });

    await queue.add('document-extraction',
      { jobId: row.id, artifactId, projectId, batchId },
      { jobId: `extraction-${row.id}` }
    );
    jobIds.push(row.id);
  }

  await queue.close();
  return NextResponse.json({ jobIds, batchId });
}
```

### Extraction Status Route (GET /api/projects/[projectId]/extraction-status)

```typescript
// Source: pattern from app/api/skills/runs/[runId]/route.ts
// Returns active/pending-review jobs for a project — used by ContextTab on mount
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId } = await params;
  const jobs = await db.select().from(extractionJobs)
    .where(
      and(
        eq(extractionJobs.project_id, Number(projectId)),
        notInArray(extractionJobs.status, ['failed']),
        // Exclude fully-reviewed jobs by checking staged_items_json presence
        // OR use a separate reviewed_at timestamp column
      )
    ).orderBy(extractionJobs.created_at);

  // Compute batch-level summary
  const batches = groupBy(jobs, j => j.batch_id);
  return NextResponse.json({ jobs, batches });
}
```

### Worker Registration (add to worker/index.ts)

```typescript
// Add import at top of worker/index.ts:
import documentExtraction from './jobs/document-extraction';

// Add to JOB_HANDLERS map:
'document-extraction': documentExtraction,
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SSE for extraction progress | BullMQ + DB polling | Phase 31 | Long-running extraction survives browser navigation |
| Synchronous SSE route (575 lines) | Thin enqueue route + worker job | Phase 31 | Transport separated from logic |
| Progress in SSE event stream | Progress in PostgreSQL row | Phase 31 | Browser-refresh resilient |
| Items delivered in SSE 'complete' event | Items staged in `staged_items_json` JSONB | Phase 31 | Persist until user reviews |

**Deprecated/outdated in this phase:**
- SSE pattern in `app/api/ingestion/extract/route.ts`: entire `ReadableStream` implementation removed
- `EventSource`-style pump loop in `IngestionModal.tsx` `extractFile()`: replaced by `setInterval` polling

---

## Open Questions

1. **artifacts.ingestion_status lifecycle with BullMQ**
   - What we know: Current extract route updates `artifacts.ingestion_status` to `'extracting'` at start, `'preview'` on success, `'failed'` on error.
   - What's unclear: Should the worker job continue updating `artifacts.ingestion_status`, or should `extraction_jobs.status` be the authoritative source?
   - Recommendation: Worker job should still update `artifacts.ingestion_status` to mirror `extraction_jobs.status` for compatibility with the upload history list in ContextTab (which reads from artifacts). Update: `extracting` on start, `preview` on completion (items staged and ready to review), `failed` on failure, `approved` after user approves.

2. **Review reopening — how does IngestionModal load staged items from DB?**
   - What we know: Staged items are in `staged_items_json` on the `extraction_jobs` row. When user clicks Review, IngestionModal needs to open at 'reviewing' stage with pre-loaded `reviewItems`.
   - What's unclear: Does IngestionModal receive items as props (passed from ContextTab via a Review button handler), or does it fetch them itself?
   - Recommendation: ContextTab loads staged items from `extraction-status` endpoint and passes them to IngestionModal as an `initialReviewItems` prop alongside `initialStage='reviewing'`. This keeps the modal dumb and avoids a second API call.

3. **Stale job cleanup mechanism**
   - What we know: STATE.md says update `updated_at` every 30s, mark stale after 10 min.
   - What's unclear: Is stale detection in the polling endpoint (inline check) or in a separate cron job?
   - Recommendation: Inline in the polling endpoint — when `GET /api/ingestion/jobs/[jobId]` is called and the row shows `status='running'` with `updated_at < now() - 10min`, return `status: 'failed'` and update the DB row. No cron required; this fires naturally on the next poll.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts present) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `npx vitest run tests/ingestion/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXTR-01 | Worker job handler updates DB status correctly (pending → running → completed) | unit | `npx vitest run tests/ingestion/extraction-job.test.ts` | ❌ Wave 0 |
| EXTR-01 | Enqueue route returns `{ jobIds, batchId }` and creates DB rows | unit | `npx vitest run tests/ingestion/extraction-enqueue.test.ts` | ❌ Wave 0 |
| EXTR-02 | Polling endpoint returns `progress_pct`, `current_chunk`, `total_chunks` from DB | unit | `npx vitest run tests/ingestion/extraction-poll.test.ts` | ❌ Wave 0 |
| EXTR-02 | Progress increases per chunk (0% → 50% → 100% for 2-chunk doc) | unit | `npx vitest run tests/ingestion/extraction-job.test.ts` | ❌ Wave 0 |
| EXTR-03 | Failed job leaves `staged_items_json = null` and `status = 'failed'` | unit | `npx vitest run tests/ingestion/extraction-job.test.ts` | ❌ Wave 0 |
| EXTR-03 | Staged items only committed to workspace tables after approve route call | unit | `npx vitest run tests/ingestion/write.test.ts` | ✅ (existing, verify passes) |
| EXTR-01,02,03 | Batch completion check returns `batch_complete: true` only when all jobs done | unit | `npx vitest run tests/ingestion/extraction-status.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/ingestion/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/ingestion/extraction-job.test.ts` — covers EXTR-01, EXTR-02, EXTR-03 (worker job handler unit tests with mocked DB)
- [ ] `tests/ingestion/extraction-enqueue.test.ts` — covers EXTR-01 (enqueue route unit test with mocked Queue and DB)
- [ ] `tests/ingestion/extraction-poll.test.ts` — covers EXTR-02 (polling endpoint unit test)
- [ ] `tests/ingestion/extraction-status.test.ts` — covers batch completion logic

Test patterns to follow: `tests/ingestion/extractor.test.ts` (vi.mock for Anthropic + DB), `tests/ingestion/write.test.ts` (approve route tests).

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `bigpanda-app/worker/index.ts` — JOB_HANDLERS pattern, concurrency=1, queue name
- Direct code inspection: `bigpanda-app/worker/jobs/skill-run.ts` — canonical job handler pattern
- Direct code inspection: `bigpanda-app/app/api/skills/[skillName]/run/route.ts` — canonical enqueue pattern
- Direct code inspection: `bigpanda-app/worker/connection.ts` — Redis connection factory, `as any` cast requirement
- Direct code inspection: `bigpanda-app/app/api/ingestion/extract/route.ts` — full SSE route to be replaced
- Direct code inspection: `bigpanda-app/components/IngestionModal.tsx` — SSE pump to replace with polling
- Direct code inspection: `bigpanda-app/components/ContextTab.tsx` — where inline progress section is added
- Direct code inspection: `bigpanda-app/db/schema.ts` — existing table patterns, enums, RLS status
- Direct code inspection: `bigpanda-app/db/migrations/0023_team_pathways.sql` — migration format convention
- Direct code inspection: `bigpanda-app/app/layout.tsx` — Toaster already mounted
- Direct code inspection: `bigpanda-app/vitest.config.ts` — test framework config
- STATE.md + CONTEXT.md — architectural decisions locked before this research

### Secondary (MEDIUM confidence)

- BullMQ v5 documentation: `Queue.close()` required after one-off Queue instance in API routes
- BullMQ v5 documentation: Worker concurrency parameter behavior; `maxRetriesPerRequest: null` requirement for Worker connections

### Tertiary (LOW confidence)

- None — all critical claims verified via direct codebase inspection

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified via package.json; versions confirmed
- Architecture: HIGH — all patterns verified by reading the actual source files they are based on
- Pitfalls: HIGH — several pitfalls sourced directly from STATE.md historical decisions (Phase 24 ioredis cast, Phase 19.1 server-only mock, Phase 18 SSE alignment) and from code inspection
- Validation: HIGH — vitest.config.ts confirmed, test directory structure confirmed

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable infrastructure; BullMQ v5 API is stable)
