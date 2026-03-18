# Technology Stack

**Project:** BigPanda AI Project Management App (Full Rewrite)
**Researched:** 2026-03-18
**Research Mode:** Ecosystem — Stack Dimension
**Knowledge Basis:** Existing working codebase (`server/package.json`, `client/package.json`) + training data through Aug 2025

> IMPORTANT VERIFICATION NOTE: External web/npm lookups were blocked by project settings.
> All versions marked HIGH confidence are directly read from the WORKING codebase's installed
> package.json files — these are the proven, running versions, not estimates.
> Versions marked MEDIUM confidence apply to new libraries not yet installed (PostgreSQL layer,
> BullMQ, MCP, docx, xlsx) — verify with `npm view <pkg> version` before pinning.

---

## Context: What Changed from the Previous Build

The existing codebase (React/Vite/Express/Google Drive, 8 phases complete) used versions that
were accurate as of early 2026. The rewrite switches:

- **From** Google Drive as data store  **→ To** PostgreSQL as the source of truth
- **From** React/Vite SPA + Express API **→ To** Next.js 14+ (App Router) unified
- **From** Drive-sync YAML files **→ To** DB with YAML export for Cowork compatibility
- **Adds** Background job scheduling, MCP tool calling, full-text search, real-time UI

The existing `server/` and `client/` package.json files contain the ground-truth versions for
all shared libraries. Those versions are used directly below.

---

## Recommended Stack

### Core Frontend

| Technology | Proven Version | Purpose | Why |
|------------|---------------|---------|-----|
| Next.js | ^14.x (App Router) | Frontend framework + API routes | Decided. App Router co-locates server components, API routes, and streaming RSC in one repo. Eliminates the Vite proxy/Express split of the previous build. |
| React | ^19.2.0 | UI framework | CONFIRMED working in existing codebase. React 19 is the current stable and the default scaffold. Not 18. |
| Tailwind CSS | ^4.2.1 | Utility CSS | CONFIRMED working. V4 uses `@tailwindcss/vite` plugin (no separate PostCSS config). The old tailwind.config.js approach is replaced by CSS `@theme` directives. |
| TypeScript | ^5.x | Type safety | Standard for Next.js projects. App Router and server components are typed by default. Use strict mode. |

**Confidence:** HIGH (React 19, Tailwind 4 — directly from working codebase).

**Tailwind v4 gotcha (HIGH confidence — proven in existing build):**
V4 does NOT use `tailwind.config.js` by default. Configuration moves to CSS:
```css
/* app/globals.css */
@import "tailwindcss";
@theme {
  --color-brand: #FF6B35;
}
```
The `@tailwindcss/vite` plugin handles everything. No PostCSS config needed. Running
`npx tailwindcss init` generates a v3-style config that is WRONG for v4.

---

### Core Backend

| Technology | Proven/Recommended Version | Purpose | Why |
|------------|---------------------------|---------|-----|
| Next.js API Routes | (same as frontend) | REST API + background triggers | App Router `route.ts` files replace the Express layer. No separate server process needed for API. |
| Node.js | ^22.x LTS | Runtime | Next.js 14 requires Node 18.17+. Use 22.x (enters LTS Oct 2025) for all new work. |
| Express | ^5.2.1 (existing) | NOT recommended for new build | Express 5 is confirmed working in the existing server. For the Next.js rewrite, API routes replace Express. If a standalone worker process is needed for BullMQ, use Express 5. |

**Confidence:** HIGH.

**Architecture decision — Express vs Next.js API Routes:**
Keep BullMQ workers in a separate `worker/` process (Express 5 or standalone Node script)
because Next.js serverless functions do not support long-running processes. Everything else
(CRUD, AI invocation) goes in Next.js API routes.

---

### Database Layer

| Technology | Recommended Version | Purpose | Why |
|------------|--------------------|---------|----|
| PostgreSQL | ^16.x | Primary data store | Decided. Full-text search (`tsvector`/`tsquery`) is built-in and eliminates the need for a separate search index for a single-user local app. JSONB columns handle semi-structured skill outputs. |
| Drizzle ORM | ^0.30.x | Type-safe DB access | Preferred over Prisma for Next.js App Router. Drizzle schema is plain TypeScript, runs in Edge Runtime, and generates SQL that is readable. Prisma generates an opaque query engine binary that complicates local dev on macOS ARM. |
| drizzle-kit | ^0.20.x | DB migrations | Drizzle's migration CLI. Generates SQL migration files you can inspect and run. |
| postgres (npm) | ^3.4.x | pg driver | The `postgres` package (by porsager) is the recommended driver for Drizzle + PostgreSQL. Faster than `pg`, supports tagged template literals, and avoids the `pg` pool configuration footguns. |

**Confidence:** MEDIUM (Drizzle/postgres version numbers — need `npm view` before pinning; architecture rationale is HIGH).

**Drizzle ORM over Prisma — rationale:**

| Criterion | Drizzle | Prisma |
|-----------|---------|--------|
| Schema definition | TypeScript file, no DSL | Prisma schema DSL (separate language) |
| Next.js App Router compat | Native (no binary dependency) | Requires workarounds for Edge Runtime |
| Generated queries | Inspectable SQL | Opaque query engine |
| Migration workflow | SQL files (drizzle-kit generate + push) | Prisma migrate (heavier tooling) |
| macOS ARM | Works out of box | Binary engine download sometimes fails |
| Bundle size | Small | Large (binary engine) |

**Full-text search strategy (PostgreSQL built-in):**
```sql
-- Add tsvector column to searchable tables
ALTER TABLE actions ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(description, '') || ' ' || coalesce(notes, ''))
  ) STORED;

CREATE INDEX actions_search_idx ON actions USING gin(search_vector);

-- Query
SELECT * FROM actions
WHERE search_vector @@ plainto_tsquery('english', $1)
ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC;
```
This covers the full-text search requirement across actions, risks, decisions, and history
without adding Elasticsearch or MeiliSearch to the stack.

---

### Anthropic SDK (AI Invocation)

| Technology | Proven Version | Purpose | Why |
|------------|---------------|---------|-----|
| @anthropic-ai/sdk | ^0.78.0 | Claude API client | CONFIRMED — this is the version running in production in the existing build. NOT ^0.20.0 (stale), NOT ^0.30.x (stale estimate). 0.78.0 is the ground-truth current version. |

**Confidence:** HIGH (directly from running server/package.json).

**SDK version delta warning:** The brief originally specified `^0.20.0`. The existing build
already upgraded to `^0.78.0`. The API surface has changed substantially — streaming pattern,
tool use API (now `tools` array with `tool_choice`), and the `beta` header for extended thinking.
Do not copy code examples written for 0.20.x.

**Streaming for long-running skills (HIGH confidence — proven pattern):**
```typescript
// app/api/skills/[skill]/route.ts
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  const { customerId, skillName } = await request.json();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const messageStream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        messages: [{ role: 'user', content: buildPrompt(customerId, skillName) }],
      });

      for await (const chunk of messageStream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk.delta.text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

**MCP tool calling pattern:**
The Anthropic SDK 0.78.x supports tool use natively. MCP (Model Context Protocol) tool calls
map to the SDK's `tools` array. Each Slack/Gmail/Glean/Drive integration is a tool definition:
```typescript
const tools: Anthropic.Tool[] = [
  {
    name: 'search_slack',
    description: 'Search Slack messages for a customer channel',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_name: { type: 'string' },
        days_back: { type: 'number' },
      },
      required: ['customer_name'],
    },
  },
  // ... gmail_search, glean_search, drive_read
];

// Tool execution loop
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  tools,
  messages,
});

if (response.stop_reason === 'tool_use') {
  for (const block of response.content) {
    if (block.type === 'tool_use') {
      const result = await executeLocalTool(block.name, block.input);
      // append tool_result to messages and continue loop
    }
  }
}
```

---

### Background Job Scheduling

| Technology | Recommended Version | Purpose | Why |
|------------|--------------------|---------|----|
| BullMQ | ^5.x | Job queue + scheduling | Preferred over node-cron for this use case. See decision matrix below. |
| ioredis | ^5.x | Redis client (BullMQ dep) | BullMQ requires Redis. ioredis is the BullMQ-recommended client. |
| Redis | ^7.x (local) | Queue backend | Required by BullMQ. Run locally via Homebrew (`brew install redis`) or Docker. |

**Confidence:** MEDIUM (versions need `npm view` confirmation; architecture rationale is HIGH).

**BullMQ vs node-cron — decision matrix:**

| Criterion | BullMQ | node-cron |
|-----------|--------|-----------|
| Job persistence | YES — jobs survive server restart | NO — lost on restart |
| Job history / logging | YES — completed/failed queue in Redis | NO |
| Retry on failure | YES — configurable backoff | NO |
| Concurrent jobs | YES — worker pools | Single-threaded |
| Real-time job status | YES — events, progress | NO |
| Dependencies | Redis required | None |
| Complexity | Medium (queue + worker process) | Very low |
| Good for 5-7 scheduled jobs | Overkill but correct | Fine |

**Recommendation: BullMQ.** The scheduled jobs (Morning Briefing, Slack sweep, Weekly Status)
call Claude and touch external APIs. They can fail (Claude timeout, Slack rate limit). BullMQ
gives retries, visibility into failures, and the ability to see "last Morning Briefing ran at 8:02am,
completed, 3 AI calls made." node-cron gives you a silent cron that fails invisibly.

**The Redis requirement is the tradeoff.** For a local single-user app on macOS, Redis is
`brew install redis` + `brew services start redis`. Not a burden.

**Worker architecture:**
```
next-app/               ← Next.js (API routes, UI)
worker/
  index.ts              ← BullMQ worker process (separate `npm run worker`)
  jobs/
    morningBriefing.ts
    slackSweep.ts
    weeklyStatus.ts
    healthCheck.ts
  queues.ts             ← queue definitions shared with Next.js
```

Next.js enqueues jobs via `await jobQueue.add(...)`. The worker process pulls and executes.
Both share the same Redis connection.

---

### MCP / External Integrations

| Integration | Approach | SDK/Library | Why |
|-------------|----------|-------------|-----|
| Slack | Direct REST API | `@slack/web-api ^7.x` | MCP Slack server is available but adds an extra process. Direct API call from a BullMQ job is simpler for read-only sweep (search messages, read channels). |
| Gmail | Google APIs | `googleapis ^171.4.0` | Already proven in existing build. `gmail.users.messages.list` with label filters. Same service account pattern as Drive. |
| Google Drive | Google APIs | `googleapis ^171.4.0` | CONFIRMED working in existing build. Context doc export/import uses this. |
| Glean | Glean REST API | Native fetch | Glean has a REST search API. No official Node SDK. Use `fetch` with `Authorization: Bearer` header. |
| MCP protocol | Anthropic SDK tools array | `@anthropic-ai/sdk ^0.78.0` | SDK handles the tool-use protocol natively. No separate MCP server process needed for these integrations — implement tool executors as local async functions. |

**Confidence:** MEDIUM (library versions); HIGH (architecture pattern).

**googleapis version confirmed:** ^171.4.0 — directly from existing server/package.json.

**Why no separate MCP server processes:** The project's integrations are read-only sweeps
(search Slack, search Gmail, read Drive). Running separate MCP server processes for each adds
operational complexity with no benefit for a single-user local app. The Anthropic SDK's `tools`
array IS the MCP protocol — use it directly.

---

### File Generation

| Output | Library | Version | Why |
|--------|---------|---------|-----|
| .pptx | pptxgenjs | ^4.0.1 | CONFIRMED — upgraded to v4 in existing build. V4 has ESM support and improved chart rendering. |
| .docx | docx | ^8.x | The `docx` npm package is the standard for programmatic Word doc generation in Node.js. Pure JS, no binary deps. NOT mammoth (that's for reading). NOT officegen (abandoned 2019). |
| .xlsx | ExcelJS | ^4.x | ExcelJS is the recommended library for writing Excel files with formatting. The action tracker export (PA3_Action_Tracker.xlsx format) requires cell formatting (bold headers, date cells, colored status). SheetJS (xlsx) is an alternative but ExcelJS is more ergonomic for writes. |
| .html | Native template literals | N/A | Team Engagement Map and Workflow Diagram skills output self-contained HTML. Generate via template literal strings in the skill executor — no library needed. |

**Confidence:** HIGH for pptxgenjs (proven); MEDIUM for docx and ExcelJS versions (need npm view).

**pptxgenjs v4 breaking changes from v3 (IMPORTANT):**
The existing archived STACK.md documented pptxgenjs as `^3.12.x`. The existing working build
has `^4.0.1`. V4 is a major version — check the pptxgenjs changelog before assuming v3 code
works in v4. Key changes: ESM-first export, some method signatures updated.

**docx library pattern:**
```typescript
import { Document, Paragraph, TextRun, HeadingLevel } from 'docx';
import { Packer } from 'docx';

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun('Meeting Summary')],
      }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
// Return as API response or write to disk
```

---

### Real-Time UI Updates

| Technology | Recommended Version | Purpose | Why |
|------------|--------------------|---------|----|
| Server-Sent Events (SSE) | Native (Next.js `ReadableStream`) | Push job completion to UI | SSE is built into Next.js App Router via `ReadableStream` responses. No library needed. One-directional (server → client) is sufficient for "job completed" notifications. |
| TanStack Query | ^5.90.21 | Client-side cache + polling fallback | CONFIRMED — already in existing client build. Use `refetchOnWindowFocus` and `staleTime` settings. For job status, poll the `GET /api/jobs/:id/status` endpoint every 3s as fallback when SSE connection drops. |

**Confidence:** HIGH (TanStack Query version confirmed from existing codebase).

**SSE vs WebSockets:**
WebSockets require a persistent server connection, which conflicts with Next.js serverless
architecture. SSE works with standard HTTP and is natively supported. For "job started →
job completed" notifications, SSE is correct.

**SSE pattern in Next.js App Router:**
```typescript
// app/api/jobs/stream/route.ts
export async function GET() {
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      intervalId = setInterval(async () => {
        const pendingJobs = await db.query.jobRuns.findMany({
          where: eq(jobRuns.status, 'completed'),
          orderBy: desc(jobRuns.completedAt),
          limit: 5,
        });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(pendingJobs)}\n\n`));
      }, 3000);
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

---

### Supporting Libraries

| Library | Proven/Recommended Version | Purpose | When to Use |
|---------|---------------------------|---------|-------------|
| zod | ^4.3.6 | Schema validation | CONFIRMED. V4 is a major version bump — API is broadly compatible with v3 but some method names changed (`z.string().parse()` etc. stable). Validate all Claude JSON output, all API inputs. |
| js-yaml | ^4.1.1 | YAML parse/serialize | CONFIRMED. For context doc export (DB → YAML frontmatter Markdown for Cowork skill compatibility). Use `JSON_SCHEMA` to prevent boolean coercion. |
| clsx | ^2.1.1 | Conditional classNames | CONFIRMED. Standard for Tailwind utility class composition. |
| date-fns | ^3.x | Date manipulation | Overdue action calculations, due date formatting. Lighter than dayjs, tree-shakeable. |
| dotenv | ^17.3.1 | Env vars | CONFIRMED. For worker process (`.env` loading in standalone Node scripts). Next.js handles `.env.local` natively. |
| nodemon | ^3.1.14 | Dev auto-restart | CONFIRMED (dev dep). For the BullMQ worker process in dev. |

---

## Stack Conflicts and Gotchas

### Conflict 1: pptxgenjs CJS vs ESM in Next.js

pptxgenjs v4 ships ESM but has CJS interop. Next.js App Router runs in Edge Runtime by default
for some routes. pptxgenjs CANNOT run in Edge Runtime (no Node.js Buffer API).

**Prevention:** Mark any route that generates PPTX as Node.js runtime:
```typescript
// app/api/skills/elt-deck/route.ts
export const runtime = 'nodejs'; // Required for pptxgenjs
```

### Conflict 2: BullMQ Worker vs Next.js Process

BullMQ workers must run as a persistent process — they cannot run inside Next.js API routes
(which are request-scoped). The worker must be a separate `node worker/index.ts` process.
Both processes share Redis for the job queue.

**Prevention:** In `package.json`:
```json
{
  "scripts": {
    "dev": "concurrently \"next dev\" \"tsx watch worker/index.ts\"",
    "worker": "tsx worker/index.ts"
  }
}
```

### Conflict 3: googleapis CJS in ESM Next.js

`googleapis` is CJS. In Next.js (ESM), import via:
```typescript
import { google } from 'googleapis';
```
This works because Next.js handles CJS interop. Do NOT use `require()` inside App Router
server components — it breaks.

### Conflict 4: Drizzle schema vs Prisma if considering a switch

Do not introduce Prisma. The binary query engine (`prisma-client`) downloads a platform-specific
binary at postinstall time. On macOS ARM this sometimes fails in CI or fresh environments.
Drizzle has no binary dependency — schema is pure TypeScript.

### Conflict 5: Zod v4 breaking change

Zod v4 (`^4.3.6` — confirmed in existing build) has some changes from v3:
- `z.record()` now takes two args for key/value types (not one)
- Error message formatting changed
- `z.string().nonempty()` replaced by `z.string().min(1)`
Do not copy v3 Zod patterns verbatim. Check the Zod v4 migration guide.

### Conflict 6: React Router v7 vs Next.js App Router routing

The existing client uses `react-router-dom ^7.13.1`. The Next.js rewrite uses Next.js App Router
for routing — NOT react-router-dom. These are mutually exclusive. Remove react-router-dom
entirely from the Next.js project.

### Conflict 7: Next.js 14 App Router + TanStack Query setup

TanStack Query 5.x requires a `QueryClientProvider` wrapper. In App Router, this must live in
a client component (`'use client'`). The typical pattern:
```typescript
// app/providers.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();
export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Drizzle | Prisma | Binary engine download fails on macOS ARM; Edge Runtime incompatible |
| ORM | Drizzle | TypeORM | Decorator-heavy, worse TypeScript inference than Drizzle |
| Full-text search | PostgreSQL tsvector | Elasticsearch | Massive over-engineering for a local single-user app with 5K-50K records |
| Full-text search | PostgreSQL tsvector | MeiliSearch | Adds another service to run locally; Postgres built-in is sufficient |
| Job queue | BullMQ | node-cron | node-cron has no retry, no persistence, no job history — unacceptable for AI skill jobs |
| Job queue | BullMQ | Agenda | Agenda uses MongoDB; adds a second DB |
| Job queue | BullMQ | pg-boss | pg-boss uses PostgreSQL — eliminates Redis dep, but BullMQ has better observability tooling (BullMQ Board) |
| Real-time | SSE | WebSockets | WebSockets require persistent connection; conflicts with Next.js serverless architecture |
| Real-time | SSE | Pusher/Ably | External service dependency for a local app — unnecessary |
| DOCX | docx (npm) | officegen | Abandoned 2019, security vulnerabilities |
| XLSX | ExcelJS | SheetJS (xlsx) | SheetJS write API is more complex for formatted output; ExcelJS is more ergonomic |
| XLSX | ExcelJS | csv-writer | CSV doesn't preserve formatting required by PA3 tracker format |
| CSS | Tailwind v4 | Tailwind v3 | v4 is already installed and proven in the existing client; upgrading back to v3 would be a downgrade |
| Editor | CodeMirror 6 | Monaco | CodeMirror is lighter, already installed and proven in the existing client build |
| State | TanStack Query | Redux/Zustand | TanStack Query handles server state; local UI state uses React useState — no global state manager needed |
| DB driver | postgres (porsager) | pg (node-postgres) | `pg` has connection pool config footguns; `postgres` (porsager) is simpler and faster |

---

## Installation

```bash
# Create Next.js app
npx create-next-app@latest bigpanda-app --typescript --tailwind --app

# DB layer
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Anthropic + AI
npm install @anthropic-ai/sdk

# Job scheduling
npm install bullmq ioredis

# External integrations
npm install googleapis google-auth-library @slack/web-api

# File generation
npm install pptxgenjs docx exceljs

# Utilities
npm install js-yaml zod clsx date-fns
npm install -D tsx concurrently nodemon @types/js-yaml

# Verify versions before pinning (REQUIRED before first install)
npm view @anthropic-ai/sdk version        # Expect ~0.78.x
npm view bullmq version                   # Expect ~5.x
npm view drizzle-orm version              # Expect ~0.30.x
npm view postgres version                 # Expect ~3.x (porsager driver)
npm view docx version                     # Expect ~8.x
npm view exceljs version                  # Expect ~4.x
npm view @slack/web-api version           # Expect ~7.x
```

---

## Project Structure

```
bigpanda-app/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout with Providers
│   ├── page.tsx                 # Dashboard (/)
│   ├── customers/
│   │   └── [id]/
│   │       ├── page.tsx         # Customer Overview
│   │       ├── actions/page.tsx
│   │       ├── risks/page.tsx
│   │       ├── milestones/page.tsx
│   │       └── ...
│   └── api/
│       ├── customers/route.ts
│       ├── skills/[skill]/route.ts   # export const runtime = 'nodejs'
│       └── jobs/stream/route.ts      # SSE endpoint
│
├── db/
│   ├── schema.ts                # Drizzle schema definitions
│   ├── index.ts                 # DB connection
│   └── migrations/              # drizzle-kit generated SQL
│
├── worker/
│   ├── index.ts                 # BullMQ worker entry point
│   ├── queues.ts                # Queue definitions (shared with app)
│   └── jobs/
│       ├── morningBriefing.ts
│       ├── slackSweep.ts
│       ├── weeklyStatus.ts
│       └── healthCheck.ts
│
├── services/
│   ├── anthropic.ts             # Claude API calls + tool execution
│   ├── drive.ts                 # Google Drive read/write
│   ├── gmail.ts                 # Gmail search
│   ├── slack.ts                 # Slack search
│   ├── yamlExport.ts            # DB → YAML for Cowork compatibility
│   ├── pptxService.ts           # pptxgenjs deck builder
│   ├── docxService.ts           # docx document builder
│   └── xlsxService.ts           # ExcelJS action tracker
│
├── components/                  # React components
├── .env.local                   # ANTHROPIC_API_KEY, DB_URL, SLACK_TOKEN
└── package.json
```

---

## Critical Pre-Start Verification Checklist

```bash
# These versions are CONFIRMED from the existing working build:
# @anthropic-ai/sdk:  ^0.78.0   (NOT ^0.20.0 — the brief is stale)
# googleapis:         ^171.4.0
# pptxgenjs:          ^4.0.1    (NOT ^3.x — v4 is the installed version)
# js-yaml:            ^4.1.1
# zod:                ^4.3.6    (NOT ^3.x — v4 is the installed version)
# express:            ^5.2.1    (for worker process only)
# react:              ^19.2.0   (NOT 18)
# tailwindcss:        ^4.2.1    (v4, uses @tailwindcss/vite, NO tailwind.config.js)
# vite:               ^7.3.1    (NOT 5.x)
# react-router-dom:   ^7.13.1   (existing client only — NOT used in Next.js rewrite)
# TanStack Query:     ^5.90.21
# codemirror:         ^6.0.2 + @codemirror/lang-yaml ^6.1.2

# These need live npm view before pinning:
npm view drizzle-orm version      # New: PostgreSQL ORM
npm view postgres version         # New: PG driver (porsager)
npm view drizzle-kit version      # New: migration CLI
npm view bullmq version           # New: job queue
npm view ioredis version          # New: Redis client for BullMQ
npm view docx version             # New: .docx generation
npm view exceljs version          # New: .xlsx generation
npm view @slack/web-api version   # New: Slack integration
```

---

## Sources

- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/package.json` — proven server dependencies (HIGH confidence — running code)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/client/package.json` — proven client dependencies (HIGH confidence — running code)
- `.planning-archive-20260318/research/STACK.md` — previous research (MEDIUM confidence — training data Aug 2025)
- `.planning/PROJECT.md` — requirements specification
- Training data through August 2025 for new libraries (BullMQ, Drizzle, docx, ExcelJS)

**Confidence Summary:**

| Area | Confidence | Reason |
|------|------------|--------|
| @anthropic-ai/sdk version (0.78.0) | HIGH | Read directly from working server/package.json |
| React 19, Tailwind 4, Vite 7 | HIGH | Read directly from working client/package.json |
| pptxgenjs v4, zod v4, express v5 | HIGH | Read directly from working package.json files |
| googleapis v171, js-yaml v4 | HIGH | Read directly from working server/package.json |
| TanStack Query v5, CodeMirror v6 | HIGH | Read directly from working client/package.json |
| Next.js App Router as architecture | HIGH | Decided in PROJECT.md; standard for 2025/2026 |
| PostgreSQL + Drizzle ORM | MEDIUM | Architecture rationale HIGH; version numbers need npm view |
| BullMQ vs node-cron decision | HIGH | Architectural reasoning; version number MEDIUM |
| docx, ExcelJS versions | MEDIUM | Library choice HIGH; versions need npm view |
| @slack/web-api version | MEDIUM | Library choice HIGH; version needs npm view |
| Tailwind v4 config pattern | HIGH | Proven in existing client build |
| SSE for real-time updates | HIGH | Native Next.js App Router capability |
| Drizzle over Prisma | HIGH | Architectural reasoning backed by known Prisma ARM issues |
