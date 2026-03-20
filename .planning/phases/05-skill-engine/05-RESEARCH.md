# Phase 5: Skill Engine — Research

**Researched:** 2026-03-20
**Domain:** Anthropic SDK streaming, SSE in Next.js App Router, BullMQ chunk persistence, SkillOrchestrator architecture
**Confidence:** HIGH (SDK verified from installed 0.78.0 package; SSE patterns from official Next.js and Anthropic docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Skill Launcher Location & Layout**
- 11th tab in the workspace tab bar, labeled "Skills"
- Simple list: skill name + one-line description + "Run" button per row
- Show all 15 skills in the list; gray out unimplemented ones (Phase 5 wires exactly 5: Weekly Customer Status, Meeting Summary, Morning Briefing, Context Updater, Handoff Doc Generator)
- Advanced option at the bottom: "Run custom skill" — allows ad-hoc invocation of any SKILL.md file by path, for power-user experimentation outside the curated list
- Grayed skills display a "Coming in a future update" tooltip on hover — no click

**Skills Tab — Recent Runs Section**
- Below the skill list, a "Recent Runs" section shows the last 5–10 runs for the current workspace
- Each entry: skill name, timestamp, status badge (running / completed / failed), link to full run page
- Clicking a run entry navigates to `/customer/[id]/skills/[run-id]`

**Streaming Output Display**
- Full-page skill run view at `/customer/[id]/skills/[run-id]`
- Output streams via SSE — text appears in real-time as Claude generates
- If user navigates away mid-stream: run continues in BullMQ background; SSE connection closes gracefully
- Returning to the run URL fetches completed output from DB — no duplicate run triggered
- Completion state: full output text + "Open File" button if a file was generated (shells `open filepath`) + inline HTML render for HTML outputs inside a sandboxed `<iframe>`
- Every completed run is automatically registered in the Output Library

**Drafts Inbox UX (DASH-09)**
- Lives on the Dashboard as a dedicated section — not a modal, not a separate page
- DB-only storage: all AI-generated drafts land in DB and surface here; zero external action happens before user review
- Per-draft actions (inline, no modal required): Copy to clipboard, Create Gmail Draft, Send to Slack, Dismiss
- Inline text editor: user can edit draft content before copying/sending — a lightweight textarea that expands on click
- Dismissed drafts are soft-deleted (hidden from inbox, retained in DB for Output Library)
- If Drafts Inbox is empty: single line "No pending drafts" — no elaborate empty state

**Output Library**
- Top-level sidebar link — first-class page at `/outputs`, same nav level as Dashboard and Settings
- Filterable by: account (project), skill type, date range
- HTML outputs render inline inside a sandboxed `<iframe>` — same page, no new tab
- .docx / .pptx outputs: "Open" button that calls `GET /api/outputs/[id]/open` which shells `open filepath` server-side (macOS system app opens the file)
- Archived outputs (soft-deleted or superseded) visible under an "Archived" filter toggle
- Output Library is populated automatically by every completed skill run — no manual step

**SKILL.md Source & Hot-Reload**
- SKILL.md files live in `bigpanda-app/skills/` — app-local directory, version-controlled
- Read from disk at invocation time (not cached in memory between runs)
- Missing SKILL.md → skill disabled in UI with human-readable error badge: "SKILL.md not found"
- Changing a SKILL.md file takes effect on the next skill run — no server restart needed

**Token Budget Guard**
- Runs before every Claude API call
- Logs estimated input token count to console (and optionally to `job_runs` metadata column)
- Truncates context if over budget threshold (configurable in Settings, default TBD by researcher)
- Truncation strategy: drop oldest history entries first, preserve system prompt + current task

**SSE Streaming Architecture**
- Route Handler at `POST /api/skills/[skillName]/run` — kicks off BullMQ job, returns `{ runId }`
- SSE endpoint at `GET /api/skills/runs/[runId]/stream` — streams chunks written by worker to DB
- Worker writes output chunks to a `skill_run_chunks` table (or similar) as it receives them from Anthropic stream
- Client subscribes to SSE, reads chunks, appends to display buffer
- When run completes, SSE endpoint sends a `done` event and closes

### Claude's Discretion
- Exact DB schema for skill run chunks (column names, indexing)
- Token budget threshold default value
- Exact shadcn/ui components used for the streaming output display area
- Loading skeleton design for the Skills tab and Output Library
- Error recovery behavior when a skill run fails mid-stream

### Deferred Ideas (OUT OF SCOPE)
- Custom SKILL.md editor in-app (Phase 7+)
- Skill run scheduling from Skills tab UI (Phase 6+)
- Multi-turn skill conversations (out of scope for Phase 5 SSE unidirectional model)
- Slack/Gmail live send from Drafts Inbox — Phase 5 creates the UI buttons but they are stubs until Phase 6 MCP wiring
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKILL-01 | SkillOrchestrator service cleanly separated from HTTP Route Handlers — same code path for manual (SSE) and BullMQ-worker (scheduled) invocations | SkillOrchestrator design pattern + BullMQ dispatch map extension |
| SKILL-02 | Token budget guard in context assembly — estimates token count before Claude call, truncates or summarizes low-priority context if over budget | `client.messages.countTokens()` API confirmed in SDK 0.78.0; returns `{ input_tokens: number }` |
| SKILL-03 | Weekly Customer Status skill — select account → generate customer-facing email from DB context; copy or save; optionally creates Gmail draft | SkillOrchestrator + SKILL.md pattern; Drafts Inbox gates email output |
| SKILL-04 | Meeting Summary skill — paste notes/transcript + select account → generate .docx + optional .mermaid diagram; registers entry in engagement history | SkillOrchestrator output pattern; .docx via existing docx library or simple text file |
| SKILL-11 | Morning Briefing — fetch today's calendar via Glean (stub in Phase 5), synthesize context, store result in DB, display in Dashboard Briefing panel | Wires BullMQ morning-briefing job handler to real SkillOrchestrator execution |
| SKILL-12 | Context Updater — paste notes/transcript + select account → apply 14 update steps → write to DB → export context doc to file | SkillOrchestrator + existing lib/yaml-export.ts integration |
| SKILL-13 | Handoff Doc Generator — select account → generate structured handoff doc covering open actions, risks, key decisions, key contacts, workstream status | SkillOrchestrator + buildSkillContext() DB query aggregation |
| SKILL-14 | SKILL.md files read from disk at runtime; prompts never modified or simplified in code | `fs.readFile()` at invocation time; `bigpanda-app/skills/` directory |
| DASH-09 | Drafts Inbox — unified queue of AI-generated drafts pending review before send | New `drafts` table; Dashboard page section; inline editor pattern |
| OUT-01 | All generated files registered in outputs table with account, skill/type, filename, filepath, created_at | Existing `outputs` table already in schema with idempotency_key |
| OUT-02 | Output Library view filterable by account, skill type, and date range | New `/outputs` page + filter UI |
| OUT-03 | HTML outputs render inline; .docx and .pptx open via system default app | iframe sandbox for HTML; `child_process.exec('open filepath')` via API route |
| OUT-04 | Regenerate action re-runs the generating skill with same or updated context; old file archived, new one registered | outputs table `status` enum already has 'running'/'complete'/'failed'; add archived handling |
</phase_requirements>

---

## Summary

Phase 5 is the most technically intricate phase in this project. It introduces three deeply interdependent systems that must work in concert: the SkillOrchestrator (a service layer that cleanly abstracts Claude invocations from both HTTP Route Handlers and BullMQ workers), an SSE streaming pipeline (where a worker writes chunks to PostgreSQL and a separate SSE endpoint polls and re-streams them to the browser), and the Drafts Inbox + Output Library UI surfaces that gate and organize all AI-generated content.

The Anthropic SDK 0.78.0 is already installed in `server/node_modules/` but not yet in `bigpanda-app/`. It must be added to `bigpanda-app/package.json` so the worker and SkillOrchestrator can import it. The SDK provides `client.messages.stream()` for real-time streaming with `.on('text', cb)` event emitters, and `client.messages.countTokens()` for pre-flight token budget enforcement — both confirmed via official docs and the installed package. The SSE endpoint in Next.js App Router requires a specific `ReadableStream` pattern where the async work fires inside `start()` without awaiting, returning the `Response` immediately to avoid buffering.

**Primary recommendation:** Build SkillOrchestrator as a pure TypeScript class in `bigpanda-app/lib/skill-orchestrator.ts` that takes a skill name, project ID, and run ID — it handles SKILL.md loading, context assembly, token budgeting, Claude streaming, and DB chunk writing. Both the API trigger route and the BullMQ worker call the same orchestrator. The SSE endpoint polls `skill_run_chunks` for new rows and streams them with a 500ms interval, closing on the `done` sentinel.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.78.0 (already in server/) | Claude API streaming + token counting | Official SDK; confirmed installed |
| `bullmq` | ^5.71.0 (already installed) | Job dispatch from trigger route + worker | Phase 4 pattern; reuse existing queue |
| `drizzle-orm` | ^0.45.1 (already installed) | New `skill_runs` and `skill_run_chunks` tables | Established ORM pattern |
| `fs/promises` (Node built-in) | Node 18+ | Read SKILL.md files from disk at invocation time | No extra package needed |
| `EventSource` (browser native) | Web standard | Client-side SSE subscription | No library needed for SSE client |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `shadcn/ui Badge` | already installed | Status badges (running/completed/failed) in Recent Runs | Use existing installed component |
| `shadcn/ui Textarea` | already installed | Inline draft editor in Drafts Inbox | Expand-on-click pattern |
| `child_process` (Node built-in) | Node 18+ | `exec('open filepath')` for system-app file open | Used only in the `/api/outputs/[id]/open` route |
| `TanStack Query v5` | already installed | Polling `useQuery` with `refetchInterval` for run status; Output Library filtering | Established pattern throughout app |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Polling `skill_run_chunks` in SSE endpoint | PostgreSQL `LISTEN/NOTIFY` | LISTEN/NOTIFY is more efficient but adds connection complexity; polling at 500ms is simpler and sufficient for this use case |
| `EventSource` (browser native) | `fetch` + ReadableStream reader | Both work; `EventSource` auto-reconnects but requires GET semantics; fetch reader is more flexible for POST-initiated streams. Use EventSource for the GET SSE stream endpoint |
| Writing full output to `outputs.content` | Separate `skill_run_chunks` table | chunks table enables mid-stream reconnect; required by architecture decision |

**Installation — add to bigpanda-app:**
```bash
cd bigpanda-app && npm install @anthropic-ai/sdk
```

---

## Architecture Patterns

### Recommended Project Structure (new files for Phase 5)

```
bigpanda-app/
├── skills/                           # SKILL.md files — read at invocation time
│   ├── weekly-customer-status.md
│   ├── meeting-summary.md
│   ├── morning-briefing.md
│   ├── context-updater.md
│   └── handoff-doc-generator.md
├── lib/
│   └── skill-orchestrator.ts         # Core service — no HTTP awareness
├── worker/
│   └── jobs/
│       └── skill-run.ts              # BullMQ handler → calls SkillOrchestrator
├── app/
│   ├── api/
│   │   ├── skills/
│   │   │   └── [skillName]/
│   │   │       └── run/
│   │   │           └── route.ts      # POST → enqueue BullMQ job, return { runId }
│   │   └── skills/
│   │       └── runs/
│   │           └── [runId]/
│   │               └── stream/
│   │                   └── route.ts  # GET → SSE stream from skill_run_chunks
│   ├── customer/
│   │   └── [id]/
│   │       └── skills/
│   │           ├── page.tsx          # Skills tab (list + Recent Runs)
│   │           └── [runId]/
│   │               └── page.tsx      # Run detail page (streaming output)
│   └── outputs/
│       └── page.tsx                  # Output Library
├── db/
│   └── schema.ts                     # Add: skill_runs, skill_run_chunks, drafts tables
```

### Pattern 1: SkillOrchestrator — Clean Separation

**What:** A pure service class with no HTTP or BullMQ knowledge. Called identically from the Route Handler (for immediate SSE feedback) and from the BullMQ worker (for scheduled/background execution).

**When to use:** Any time a skill runs.

```typescript
// Source: architecture decision from CONTEXT.md + established BullMQ pattern from Phase 4
// bigpanda-app/lib/skill-orchestrator.ts

import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { db } from '../db';
import { skillRuns, skillRunChunks } from '../db/schema';
import { buildSkillContext } from './skill-context';

const TOKEN_BUDGET = 80_000; // ~100k context window with headroom

export class SkillOrchestrator {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async run(params: {
    skillName: string;
    projectId: number;
    runId: number;
    input?: Record<string, string>; // e.g. { transcript: '...' }
  }): Promise<void> {
    // 1. Load SKILL.md from disk (hot-reload: no caching)
    const skillPath = `${process.cwd()}/skills/${params.skillName}.md`;
    const systemPrompt = await readFile(skillPath, 'utf-8');

    // 2. Assemble context from DB
    const context = await buildSkillContext(params.projectId, params.skillName);

    // 3. Token budget guard (SKILL-02)
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: context.userMessage }
    ];
    const tokenCount = await this.client.messages.countTokens({
      model: 'claude-sonnet-4-6',
      system: systemPrompt,
      messages,
    });
    console.log(`[skill-orchestrator] ${params.skillName} input_tokens: ${tokenCount.input_tokens}`);

    if (tokenCount.input_tokens > TOKEN_BUDGET) {
      // Truncate: drop oldest engagement history entries, re-assemble
      const truncated = context.withTruncatedHistory();
      messages[0] = { role: 'user', content: truncated.userMessage };
    }

    // 4. Stream from Claude, write chunks to DB
    const stream = this.client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: systemPrompt,
      messages,
    });

    let seqNum = 0;
    stream.on('text', async (text) => {
      await db.insert(skillRunChunks).values({
        run_id: params.runId,
        seq: seqNum++,
        chunk: text,
      });
    });

    await stream.finalMessage();

    // 5. Write done sentinel so SSE endpoint knows to close
    await db.insert(skillRunChunks).values({
      run_id: params.runId,
      seq: seqNum,
      chunk: '__DONE__',
    });
  }
}
```

### Pattern 2: SSE Endpoint — Non-Blocking ReadableStream

**What:** GET route handler that polls `skill_run_chunks` and streams chunks to browser via SSE. Returns `Response` immediately; polling fires in background inside `start()`.

**Critical pitfall to avoid:** Do NOT `await` the polling loop before returning `Response`. Next.js App Router buffers the entire response if you await inside the route handler body. Fire-and-forget inside `start()`.

```typescript
// Source: Next.js App Router SSE pattern — verified from official docs + community
// bigpanda-app/app/api/skills/runs/[runId]/stream/route.ts

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { runId: string } }
) {
  const runId = parseInt(params.runId);
  const encoder = new TextEncoder();
  let lastSeq = -1;

  const stream = new ReadableStream({
    start(controller) {
      // Fire async polling without awaiting — Response returns immediately
      (async () => {
        try {
          while (true) {
            const chunks = await db
              .select()
              .from(skillRunChunks)
              .where(
                and(
                  eq(skillRunChunks.run_id, runId),
                  gt(skillRunChunks.seq, lastSeq)
                )
              )
              .orderBy(asc(skillRunChunks.seq));

            for (const chunk of chunks) {
              lastSeq = chunk.seq;
              if (chunk.chunk === '__DONE__') {
                controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
                controller.close();
                return;
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunk.chunk })}\n\n`)
              );
            }

            await new Promise((r) => setTimeout(r, 500)); // 500ms poll interval
          }
        } catch (err) {
          controller.error(err);
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // prevent NGINX buffering
    },
  });
}
```

### Pattern 3: Client-Side EventSource Subscription

**What:** Browser subscribes to SSE stream, appends text deltas to display buffer. On mount, checks if run is already complete (fetches from DB) — no duplicate run triggered.

```typescript
// Source: Web standard EventSource API + EventSource spec
// bigpanda-app/app/customer/[id]/skills/[runId]/page.tsx (client component)

'use client';
import { useEffect, useRef, useState } from 'react';

export default function SkillRunPage({ params }: { params: { runId: string } }) {
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<'loading' | 'streaming' | 'done' | 'failed'>('loading');
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Check if run already complete — if so, load from DB (no SSE needed)
    fetch(`/api/skills/runs/${params.runId}`)
      .then(r => r.json())
      .then((run) => {
        if (run.status === 'completed') {
          setOutput(run.full_output);
          setStatus('done');
          return;
        }
        // Still running — subscribe to SSE
        const es = new EventSource(`/api/skills/runs/${params.runId}/stream`);
        esRef.current = es;

        es.onmessage = (e) => {
          const { text } = JSON.parse(e.data);
          setOutput(prev => prev + text);
          setStatus('streaming');
        };

        es.addEventListener('done', () => {
          setStatus('done');
          es.close();
        });

        es.onerror = () => {
          setStatus('failed');
          es.close();
        };
      });

    return () => esRef.current?.close(); // cleanup on unmount (mid-stream nav away)
  }, [params.runId]);

  // ... render output
}
```

### Pattern 4: BullMQ Skill Run Handler

**What:** Follows exact Phase 4 pattern — advisory lock, job_runs INSERT/UPDATE, dispatch to SkillOrchestrator.

```typescript
// bigpanda-app/worker/jobs/skill-run.ts
// Same structure as health-refresh.ts — reuse advisory lock pattern
import type { Job } from 'bullmq';
import { SkillOrchestrator } from '../../lib/skill-orchestrator';
import { db } from '../../db';
import { skillRuns } from '../../db/schema';
import { sql } from 'drizzle-orm';

const orchestrator = new SkillOrchestrator();

export default async function skillRunJob(job: Job): Promise<{ status: string }> {
  const { runId, skillName, projectId, input } = job.data as {
    runId: number;
    skillName: string;
    projectId: number;
    input?: Record<string, string>;
  };

  await db.update(skillRuns)
    .set({ status: 'running', started_at: new Date() })
    .where(sql`id = ${runId}`);

  try {
    await orchestrator.run({ skillName, projectId, runId, input });
    await db.update(skillRuns)
      .set({ status: 'completed', completed_at: new Date() })
      .where(sql`id = ${runId}`);
    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(skillRuns)
      .set({ status: 'failed', completed_at: new Date(), error_message: message })
      .where(sql`id = ${runId}`);
    throw err;
  }
}
```

### Pattern 5: SKILL.md Hot-Reload + Missing File Guard

**What:** Read from disk at each invocation using `fs/promises.readFile`. Wrap in try/catch — missing file returns a structured error that the UI renders as a "SKILL.md not found" badge.

```typescript
// In SkillOrchestrator.run() — before any Claude call
try {
  const systemPrompt = await readFile(skillPath, 'utf-8');
  // ... proceed
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    throw new Error(`SKILL_NOT_FOUND:${params.skillName}`);
  }
  throw err;
}
```

The trigger API catches `SKILL_NOT_FOUND:` prefix and returns `{ error: 'SKILL.md not found', skillName }` with status 422 — UI maps this to the disabled badge.

### Anti-Patterns to Avoid

- **Importing `@anthropic-ai/sdk` in Next.js RSC before it's in bigpanda-app/package.json:** The worker and lib/ can import it once installed; RSC pages should call the API route, not Claude directly.
- **Awaiting the polling loop before returning SSE Response:** Causes Next.js to buffer the entire stream. Fire async work inside `start()` without await.
- **Caching SKILL.md in module memory:** Prevents hot-reload. Always `readFile` at invocation time.
- **Sharing a single Anthropic client instance across concurrent BullMQ jobs:** Safe to share (SDK is stateless per-request), but ensure `ANTHROPIC_API_KEY` is in the worker environment.
- **Writing the complete output to `outputs.content` before SSE begins:** The SSE stream must start immediately. Write to `skill_run_chunks` incrementally; only aggregate to `outputs.content` on completion.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-time text streaming from Claude | Custom HTTP chunked transfer | `client.messages.stream()` with `.on('text', cb)` | SDK handles SSE parsing, backpressure, error recovery |
| Token counting before API call | Approximate character-count heuristics | `client.messages.countTokens()` | Free API call; exact billing-equivalent count |
| Client SSE reconnection | Custom retry loop with setTimeout | Native `EventSource` auto-reconnect | Browser handles reconnect with `Last-Event-ID` header automatically |
| SKILL.md discovery/listing | In-memory skill registry | `fs.readdir('bigpanda-app/skills/')` + parse filenames | No registry drift; always reflects disk state |
| Output file opening on macOS | Electron or custom browser protocol | `child_process.exec('open filepath')` in API route | Simplest possible solution for single-user local app |

**Key insight:** The Anthropic SDK's `messages.stream()` handles all the SSE parsing from Anthropic's end. The project's only SSE plumbing is the chunk-persistence polling pattern from BullMQ worker → PostgreSQL → Next.js SSE endpoint → browser.

---

## Common Pitfalls

### Pitfall 1: Next.js App Router SSE Buffering
**What goes wrong:** The SSE route handler `await`s the streaming loop inside the route function body before returning `Response`. Next.js buffers the entire stream and delivers it at once when the loop ends.
**Why it happens:** Next.js App Router Route Handlers behave differently from Node.js `res.write()` streaming; they require the `Response` to be returned before async work completes.
**How to avoid:** Fire async work inside `ReadableStream`'s `start(controller)` callback without `await`. Return `new Response(stream, headers)` immediately.
**Warning signs:** SSE endpoint works but output only appears after run completes, not incrementally.

### Pitfall 2: Anthropic SDK Not in bigpanda-app
**What goes wrong:** Worker and SkillOrchestrator fail to import `@anthropic-ai/sdk` because it's only in `server/node_modules/`, not `bigpanda-app/node_modules/`.
**Why it happens:** Phase 1–4 never needed the SDK in the Next.js app. It's in the legacy Express server only.
**How to avoid:** `cd bigpanda-app && npm install @anthropic-ai/sdk` as the very first task in Phase 5.
**Warning signs:** `Cannot find module '@anthropic-ai/sdk'` in worker process or Next.js build.

### Pitfall 3: SSE Run Deduplication
**What goes wrong:** User navigates away mid-run and returns to the run URL. The page triggers a second skill run.
**Why it happens:** Naive implementation: component `useEffect` calls the trigger API on mount.
**How to avoid:** The run trigger API (`POST /api/skills/[skillName]/run`) creates the `skill_runs` row with a unique `idempotency_key`. The run page on mount calls `GET /api/skills/runs/[runId]` first — if status is not `pending`, it opens the SSE stream or renders completed output. Never re-trigger from the run detail page.
**Warning signs:** Duplicate entries in `skill_runs` table for the same intended run.

### Pitfall 4: Token Budget Guard Missing System Prompt
**What goes wrong:** `countTokens` is called with only the `messages` array but not the `system` prompt. The token count underestimates actual usage, budget guard passes, but actual call exceeds budget.
**Why it happens:** Forgetting that `system` counts toward input tokens.
**How to avoid:** Pass identical `{ model, system, messages }` to both `countTokens()` and `messages.stream()`.
**Warning signs:** Console logs show input_tokens close to budget, but actual calls use significantly more.

### Pitfall 5: BullMQ Worker Doesn't Know About skill-run Handler
**What goes wrong:** `POST /api/skills/[skillName]/run` enqueues to `'skill-jobs'` queue but worker only listens to `'scheduled-jobs'`.
**Why it happens:** Phase 4 worker registered `'scheduled-jobs'`; skill runs need their own queue or the same queue with a new handler.
**How to avoid:** Use the same `'scheduled-jobs'` queue and add `'skill-run'` to the `JOB_HANDLERS` dispatch map. The trigger API calls `queue.add('skill-run', data)`. Worker already listens to this queue.
**Warning signs:** Jobs enqueued but never processed; BullMQ shows jobs in `waiting` state indefinitely.

### Pitfall 6: `maxRetriesPerRequest: null` Missing on IORedis for skill-run Queue
**What goes wrong:** Trigger API creates `Queue('scheduled-jobs', { connection: createApiRedisConnection() })` — but if `createApiRedisConnection()` is called without `maxRetriesPerRequest: 1`, it will hang on Redis unavailability.
**Why it happens:** Phase 4 established the `createApiRedisConnection()` factory with correct settings; new API routes MUST use this factory, not raw `new IORedis()`.
**How to avoid:** Always use `createApiRedisConnection()` (fail-fast) in API routes; `createRedisConnection()` (retry) in the worker.

### Pitfall 7: Missing `force-dynamic` on SSE Endpoint
**What goes wrong:** Next.js caches the SSE route response; all clients get the same cached chunks.
**Why it happens:** App Router routes are statically cached by default.
**How to avoid:** Add `export const dynamic = 'force-dynamic'` to the SSE route file.

---

## Code Examples

Verified patterns from official sources:

### Anthropic SDK — stream with `.on('text')` callback
```typescript
// Source: https://platform.claude.com/docs/en/api/messages-streaming (2026-03-20)
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();

await client.messages
  .stream({
    messages: [{ role: "user", content: "Hello" }],
    model: "claude-sonnet-4-6",
    max_tokens: 1024
  })
  .on("text", (text) => {
    // text is a string delta (not a full message)
    console.log(text);
  });
```

### Anthropic SDK — countTokens pre-flight check
```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/token-counting (2026-03-20)
const response = await client.messages.countTokens({
  model: "claude-sonnet-4-6",
  system: systemPrompt,
  messages: [{ role: "user", content: userMessage }]
});
// response: { input_tokens: number }
console.log(response.input_tokens); // exact count matching billing

const TOKEN_BUDGET = 80_000;
if (response.input_tokens > TOKEN_BUDGET) {
  // truncate context, then re-count
}
```

### Anthropic SDK — get complete message after streaming
```typescript
// Source: https://platform.claude.com/docs/en/api/messages-streaming (2026-03-20)
const stream = client.messages.stream({
  max_tokens: 8192,
  messages: [{ role: "user", content: userMessage }],
  model: "claude-sonnet-4-6"
});

// Await completion — returns the full assembled Message object
const message = await stream.finalMessage();
const fullText = message.content
  .filter(b => b.type === 'text')
  .map(b => b.text)
  .join('');
```

### Next.js SSE Route — correct non-blocking pattern
```typescript
// Source: Upstash SSE + Next.js App Router pattern (verified 2026-03-20)
export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // CRITICAL: no await here — Response must return immediately
      (async () => {
        // ... async polling work ...
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        controller.close();
      })();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

---

## DB Schema Additions (Claude's Discretion)

The planner needs these new tables. Recommended schema:

```sql
-- skill_runs: one row per skill invocation
CREATE TABLE skill_runs (
  id          SERIAL PRIMARY KEY,
  run_id      TEXT NOT NULL UNIQUE,          -- UUID, used as idempotency_key
  project_id  INTEGER REFERENCES projects(id),
  skill_name  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending|running|completed|failed
  input       TEXT,                           -- JSON: user-provided inputs (transcript, etc.)
  full_output TEXT,                           -- aggregated on completion
  error_message TEXT,
  started_at  TIMESTAMP,
  completed_at TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- skill_run_chunks: incremental output chunks for SSE reconnect
CREATE TABLE skill_run_chunks (
  id      SERIAL PRIMARY KEY,
  run_id  INTEGER NOT NULL REFERENCES skill_runs(id) ON DELETE CASCADE,
  seq     INTEGER NOT NULL,
  chunk   TEXT NOT NULL,                      -- text delta or '__DONE__' sentinel
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(run_id, seq)
);
CREATE INDEX idx_skill_run_chunks_run_seq ON skill_run_chunks(run_id, seq);

-- drafts: Drafts Inbox — all AI-generated emails/Slack messages
CREATE TABLE drafts (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER REFERENCES projects(id),
  run_id      INTEGER REFERENCES skill_runs(id),
  draft_type  TEXT NOT NULL,                  -- 'email' | 'slack'
  recipient   TEXT,
  subject     TEXT,
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending|dismissed|sent
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Index rationale:** `idx_skill_run_chunks_run_seq` is critical — the SSE polling query hits this index on every 500ms poll with `WHERE run_id = ? AND seq > ?`.

---

## Token Budget Default Value (Claude's Discretion)

**Recommended default: 80,000 input tokens**

Rationale:
- `claude-sonnet-4-6` has a 200k token context window
- A full workspace context (all actions, risks, milestones, history, decisions, stakeholders) for a single project is estimated at 15,000–40,000 tokens
- The SKILL.md system prompt is typically 500–3,000 tokens
- Leaving 120,000 tokens of headroom for the model's internal processing budget
- 80,000 provides a generous ceiling while ensuring no runaway context can consume the full window
- Configurable in Settings via existing `readSettings()`/`writeSettings()` pattern — add `skill_token_budget` key

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `messages.create({ stream: true })` raw iteration | `messages.stream()` helper with `.on('text', cb)` | SDK v0.20 → v0.50+ | Much simpler; handles backpressure, error recovery |
| Approximating tokens with tiktoken | `messages.countTokens()` official API | Announced Nov 2024 | Exact count matching billing; free to call |
| Polling-based SSE with res.write() (Express) | ReadableStream in Next.js App Router Route Handler | Next.js 13+ | Standard Web API; works on Vercel edge if needed |
| Separate SSE queue (Redis pub/sub) | Direct DB polling (PostgreSQL) | Project-specific | Simpler for single-worker single-server; Redis already handles BullMQ |

**Deprecated/outdated:**
- `client.completions.create()`: Use `client.messages.create()` or `client.messages.stream()` — completions API is legacy
- Express `res.write()` for SSE: Not applicable in Next.js App Router; use `ReadableStream` pattern

---

## Open Questions

1. **SKILL.md directory location in production vs. dev**
   - What we know: Decided as `bigpanda-app/skills/` — version-controlled with app
   - What's unclear: `process.cwd()` in Next.js worker context may resolve to `bigpanda-app/` or project root depending on how `npm run worker` is invoked
   - Recommendation: Use `path.join(__dirname, '../../skills/', skillName + '.md')` in the SkillOrchestrator to anchor to the module location, not cwd

2. **`stream.on('text', cb)` async safety**
   - What we know: The SDK's `.on('text', cb)` callback fires synchronously as text arrives; `await` inside the callback is supported but not guaranteed sequential
   - What's unclear: Whether concurrent `db.insert` calls from rapid text chunks can cause out-of-order sequence numbers
   - Recommendation: Accumulate chunks in a local array and flush periodically (every ~10 chunks or 100ms) with a single batch INSERT, or use a seq counter managed outside the callback

3. **Output Library — `outputs` table vs. `skill_runs` table**
   - What we know: Existing `outputs` table has `idempotency_key`, `status`, `content`, `filename`, `filepath` — designed for Phase 5
   - What's unclear: Whether skill_runs and outputs should be the same table or linked
   - Recommendation: Keep them separate. `skill_runs` is the streaming/execution record. `outputs` is the Output Library record registered after completion. One skill run can produce multiple output files.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (@playwright/test — already installed at project root) |
| Config file | `playwright.config.ts` at project root |
| Quick run command | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-01"` |
| Full suite command | `npx playwright test tests/e2e/phase5.spec.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-01 | Skills tab visible in workspace nav; Run button triggers job and returns runId | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-01"` | ❌ Wave 0 |
| SKILL-02 | Token count logged to console before every Claude call | smoke (API route) | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-02"` | ❌ Wave 0 |
| SKILL-03 | Weekly Customer Status skill produces output in run page; Draft appears in Drafts Inbox | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-03"` | ❌ Wave 0 |
| SKILL-04 | Meeting Summary skill run page shows streamed output | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-04"` | ❌ Wave 0 |
| SKILL-11 | Morning Briefing skill produces DB-stored output visible on Dashboard | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-11"` | ❌ Wave 0 |
| SKILL-12 | Context Updater skill run page shows streamed output | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-12"` | ❌ Wave 0 |
| SKILL-13 | Handoff Doc Generator skill run page shows streamed output | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-13"` | ❌ Wave 0 |
| SKILL-14 | Changing SKILL.md on disk takes effect on next run; missing file shows error badge | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-14"` | ❌ Wave 0 |
| DASH-09 | Drafts Inbox section visible on Dashboard; draft appears after skill run | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "DASH-09"` | ❌ Wave 0 |
| OUT-01 | Completed skill run appears in Output Library | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "OUT-01"` | ❌ Wave 0 |
| OUT-02 | Output Library filters by account, skill type, date range | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "OUT-02"` | ❌ Wave 0 |
| OUT-03 | HTML output renders in iframe; .docx shows Open button | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "OUT-03"` | ❌ Wave 0 |
| OUT-04 | Regenerate button creates new output, archives old one | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "OUT-04"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-01"` (stub verification)
- **Per wave merge:** `npx playwright test tests/e2e/phase5.spec.ts`
- **Phase gate:** Full phase5 suite green + human verification of live streaming in browser before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/e2e/phase5.spec.ts` — create with RED stubs for all 13 requirements listed above, using established `expect(false, 'stub').toBe(true)` pattern from phases 2–4
- [ ] `bigpanda-app/skills/` directory — create with 5 SKILL.md stub files (content can be placeholder prompts)
- [ ] `bigpanda-app/package.json` — add `@anthropic-ai/sdk` dependency (first task, blocks all skill execution)
- [ ] DB migration SQL for `skill_runs`, `skill_run_chunks`, `drafts` tables

---

## Sources

### Primary (HIGH confidence)
- Anthropic SDK 0.78.0 — installed at `/Users/jmiloslavsky/Documents/Project Assistant Code/server/node_modules/@anthropic-ai/sdk`; version confirmed via package.json
- https://platform.claude.com/docs/en/api/messages-streaming — full SSE event sequence, TypeScript `messages.stream()` API with `.on('text', cb)` and `.finalMessage()`
- https://platform.claude.com/docs/en/build-with-claude/token-counting — `messages.countTokens()` TypeScript API; response shape `{ input_tokens: number }`; free API; subject to RPM limits
- Phase 4 source code: `bigpanda-app/worker/index.ts`, `worker/jobs/health-refresh.ts`, `app/api/jobs/trigger/route.ts` — BullMQ patterns confirmed from codebase

### Secondary (MEDIUM confidence)
- https://upstash.com/blog/sse-streaming-llm-responses — `ReadableStream` start() non-blocking pattern for SSE in Next.js App Router; verified against Next.js App Router docs
- SSE pattern cross-verified with GitHub Discussion https://github.com/vercel/next.js/discussions/48427 and `force-dynamic` requirement

### Tertiary (LOW confidence)
- BullMQ + SSE + PostgreSQL chunk persistence pattern — WebSearch summary; architectural pattern sound but specific implementation details should be validated against actual BullMQ v5 docs during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SDK version confirmed from installed package; BullMQ/Drizzle from existing codebase
- Architecture: HIGH — SSE pattern verified from official docs; SkillOrchestrator pattern from CONTEXT.md decisions
- Pitfalls: HIGH — Next.js buffering pitfall confirmed in multiple sources; SDK installation gap verified from codebase inspection
- Token budget default: MEDIUM — calculated from model context window specs; exact value is Claude's discretion

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable APIs; Anthropic SDK patch releases may occur but 0.78.x minor API is stable)
