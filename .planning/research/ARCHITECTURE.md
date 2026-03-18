# Architecture Patterns

**Project:** BigPanda AI Project Management App (Next.js 14 + PostgreSQL rewrite)
**Researched:** 2026-03-18
**Confidence:** MEDIUM — training knowledge, no external tool access during session; all claims based on well-established patterns for Next.js 14, BullMQ, Anthropic SDK, and PostgreSQL

---

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (React / Next.js App Router)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Dashboard   │  │  Workspace   │  │  Skill Launcher / Drafts │  │
│  │  (SSR/RSC)   │  │  (RSC+hooks) │  │  (streaming + polling)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
└─────────┼────────────────┼───────────────────────┼─────────────────┘
          │  HTTP / SSE / WS│                       │ SSE stream
┌─────────┼────────────────┼───────────────────────┼─────────────────┐
│  Next.js 14 App Router API Layer (Route Handlers)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  /api/data   │  │ /api/skills  │  │  /api/jobs (status poll) │  │
│  │  (CRUD)      │  │ (invoke,     │  │  /api/stream (SSE)       │  │
│  │              │  │  stream out) │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │                │
│  ┌──────▼─────────────────▼────────────────────────▼─────────────┐ │
│  │                   Service Layer                                │ │
│  │  ┌─────────────┐  ┌────────────────┐  ┌────────────────────┐  │ │
│  │  │ DataService  │  │ SkillOrchestra │  │  JobService         │  │ │
│  │  │ (DB queries) │  │ (context+run)  │  │  (BullMQ enqueue)  │  │ │
│  │  └──────┬──────┘  └───────┬────────┘  └────────┬───────────┘  │ │
│  └─────────┼─────────────────┼─────────────────────┼─────────────┘ │
└────────────┼─────────────────┼─────────────────────┼───────────────┘
             │                 │                      │
  ┌──────────▼──┐   ┌──────────▼────────┐   ┌────────▼───────────────┐
  │ PostgreSQL  │   │  Anthropic SDK    │   │  BullMQ + Redis        │
  │ (via Drizzle│   │  (claude-3-5 API) │   │  (job queue + cron)    │
  │  or Prisma) │   │                  │   │                        │
  └─────────────┘   │  ┌─────────────┐ │   └────────────────────────┘
                    │  │  MCP Client │ │
                    │  │  (Slack,    │ │
                    │  │  Gmail,     │ │
                    │  │  Glean,     │ │
                    │  │  Drive)     │ │
                    │  └─────────────┘ │
                    └──────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **RSC Pages** | Server-side render of data-heavy read views (dashboard, workspace tabs). Zero client JS for initial paint. | DataService (direct DB access in RSC), Job status via client hooks |
| **Client Components** | Interactive state: forms, optimistic updates, streaming output panels, Kanban drag | Route Handlers via fetch/SSE |
| **Route Handlers** (`/app/api/`)  | HTTP boundary. Auth guard, input validation, dispatch to service layer. Never contain business logic. | Service layer only |
| **DataService** | All DB access. Encapsulates Drizzle/Prisma queries. Enforces append-only rules, ID generation, source tracing. | PostgreSQL |
| **SkillOrchestrator** | Loads SKILL.md from disk, assembles context from DB, invokes Anthropic SDK, streams result, persists draft output. | DataService, Anthropic SDK, MCP Client |
| **MCP Client** | Single shared client instance. Manages MCP tool sessions for Slack/Gmail/Glean/Drive. Tool results passed to skill context. | Anthropic SDK (tool_use blocks), external MCP servers |
| **JobService** | Enqueues BullMQ jobs, exposes job status, handles cron schedule registration. Does not contain skill logic. | BullMQ/Redis, SkillOrchestrator (called from workers) |
| **BullMQ Workers** | Separate Node.js worker processes. Call SkillOrchestrator for scheduled runs. Write results to DB. | SkillOrchestrator, DataService, BullMQ/Redis |
| **FileGenerationService** | Produces .docx/.pptx/.xlsx/.html from structured data or AI output. Registers artifact in DB outputs table. | DataService (read context, write output record), local filesystem |
| **PostgreSQL** | Single source of truth. All project data, skill outputs, job status, drafts. | DataService only (no direct external access) |
| **Redis** | BullMQ job queue storage and job status cache. | JobService, BullMQ Workers |

---

## Data Flow

### 1. Manual Skill Invocation (user clicks "Run Tracker")

```
User click
  → POST /api/skills/invoke { skillId, projectId }
    → SkillOrchestrator.run(skillId, projectId)
      → DataService.assembleContext(projectId)   // pulls all relevant tables
      → fs.readFile(SKILL_PATH/skillId.SKILL.md) // read prompt from disk
      → MCP.gatherToolInputs()                    // Slack/Gmail sweep if skill requires
      → anthropic.messages.stream({ system: skill_prompt, messages: [context] })
        → yields text chunks via SSE to browser
      → on complete: DataService.saveDraft(output)
        → outputs table row (type=draft, status=pending_review)
  → Browser renders streaming output in Skill Launcher panel
  → "Review & Send" button appears when stream ends
```

### 2. Scheduled Job (daily 8am Morning Briefing)

```
BullMQ cron trigger (8:00 America/New_York)
  → Worker picks up job
    → SkillOrchestrator.run('morning-briefing', ALL_ACTIVE_PROJECTS)
      → Same flow as manual but no SSE — result written directly to DB
      → DataService.saveDraft(output, { source: 'scheduled', jobId })
  → Dashboard health check on next page load: reads latest morning_briefing row
  → In-app notification badge incremented via DB flag
```

### 3. Cross-Project Health Scoring (auto-derived)

```
DB trigger OR application-level after-write hook:
  → On any action/risk/milestone write:
    → DataService.computeProjectHealth(projectId)
      → Query: overdue actions, open high-risks, stalled milestones
      → Write: projects.rag_status, projects.health_score, projects.health_computed_at
  → Dashboard RSC reads health score directly from DB (no AI call needed)
```

### 4. File Generation Pipeline

```
Skill output (structured JSON/markdown) OR user-triggered export
  → FileGenerationService.generate({ type, projectId, skillOutput })
    → For .docx: officegen or docx library → Buffer
    → For .pptx: pptxgenjs (CJS) → Buffer
    → For .xlsx: exceljs → Buffer
    → For .html: template string or handlebars → string
  → Write file to outputs directory (filesystem, configurable path)
  → DataService.registerOutput({ projectId, type, filename, path, skillId, generatedAt })
  → Response: { fileUrl: '/api/outputs/[id]', outputId }
  → Browser: direct download link or inline HTML render
```

### 5. MCP Tool Calling (during skill run)

```
SkillOrchestrator assembles initial messages
  → anthropic.messages.stream with tools array (MCP tool definitions)
  → On tool_use block in stream:
    → Pause stream processing
    → MCP Client dispatches tool call to correct MCP server
      → slack.search_messages({ query, ... })
      → gmail.list_threads({ ... })
      → drive.get_file({ fileId })
    → Collect tool_results
    → Continue stream with tool_results appended to messages
  → Multi-turn until no more tool_use blocks
```

---

## Architectural Decisions

### Q1: Claude AI Skill Invocation Layer

**Pattern: SkillOrchestrator with per-skill SKILL.md dispatch, not per-skill agents**

Do not create separate agent classes per skill (15 skills = 15 files, drift risk). Instead:

- One `SkillOrchestrator` class with a `run(skillId, projectId, options)` method.
- SKILL.md loaded from disk at invocation time via `fs.readFile` — never bundled or cached in memory long-term. This preserves Cowork compatibility.
- `assembleContext()` is the critical per-skill variation point. Each skill declares what context it needs (actions, risks, milestones, stakeholders, history, etc.) via a skill-config map (not embedded in SKILL.md). Context is fetched from DB, serialized to the same YAML-like format that Cowork skills expect.
- Structured output: use `tool_use` with a `write_output` tool definition for skills that must produce structured JSON (Context Updater, Tracker). Plain streaming for document-generation skills (Status Email, Meeting Summary). Never use JSON mode for long documents — streaming is faster and handles token limits better.
- Source tracing constraint: inject `source_trace` instructions into every system prompt to ensure AI output attributions are DB-derived.

**Confidence: MEDIUM** — Pattern derived from Anthropic SDK streaming docs and established tool-use patterns. Verify `@anthropic-ai/sdk` version before Phase 5 (existing memory note confirmed).

### Q2: Background Job Scheduling

**Use BullMQ + Redis, not node-cron**

Rationale:
- node-cron runs in the Next.js server process. Next.js App Router can terminate and restart worker threads during deploys or hot reload, losing in-flight jobs. Critically, in production with multiple instances, cron jobs would fire on every instance simultaneously.
- BullMQ with Redis provides: job deduplication, retry-on-failure, job status persistence (queryable from UI), graceful shutdown, and cron schedule management via `RepeatableJob`.
- Workers run as separate Node.js processes (`/workers/index.ts`) started alongside the Next.js server.

**Job status surfacing:** Each job writes a `job_runs` table row (jobId, skillId, projectId, status: queued|running|complete|failed, startedAt, completedAt, outputId). Route Handler `GET /api/jobs/[jobId]` polls this table. UI uses 3-second interval polling (not WebSocket) for job status — adequate for 10-30s jobs, simpler infrastructure.

**Confidence: MEDIUM** — BullMQ is the established standard for Node.js job queues. Redis dependency is the only added infrastructure cost. For a local single-user app, `ioredis` connecting to a local Redis instance (or `redis` Docker container) is sufficient. Verify BullMQ v5 API (major version may have changed repeat job syntax).

### Q3: MCP Tool Calling from Next.js Backend

**Pattern: Shared MCP client pool initialized at server startup**

- The Anthropic SDK's tool-use API is the integration point: define MCP tools as tool definitions in the `tools` array of the messages request. The SDK handles multi-turn automatically if you use `stream` with tool handling.
- MCP servers (Slack, Gmail, Glean, Drive) run as separate processes communicating over stdio or HTTP. Use `@modelcontextprotocol/sdk` to connect.
- Create one `MCPClientPool` module initialized at app startup (`/lib/mcp/pool.ts`). Exposes `callTool(server, toolName, params)`.
- Skills that require MCP declare their tool dependencies in the skill-config map. SkillOrchestrator passes only the relevant tool definitions to Anthropic — do not pass all 40+ tools on every call.
- Tool results must be stored in the job_runs record for auditability and replay.

**Critical integration point:** MCP server process lifecycle management is non-trivial. The MCP server processes must be started before worker jobs attempt tool calls. Add health checks with automatic restart on failure. This is a known source of flakiness in early MCP integrations.

**Confidence: LOW for MCP specifics** — MCP protocol specification and client SDK were evolving rapidly as of training cutoff (August 2025). Verify `@modelcontextprotocol/sdk` current API, connection management, and whether stdio vs HTTP transport is preferred for local servers in 2026.

### Q4: Long-Running AI Skills (10-30s) — Streaming vs Polling vs WebSockets

**Decision: Server-Sent Events (SSE) for manual invocations; polling for scheduled jobs**

- **SSE via Next.js Route Handler** for user-triggered skill runs. Route Handler returns a `ReadableStream` with `Content-Type: text/event-stream`. Anthropic SDK's `.stream()` method yields text delta events that pipe directly. Browser uses `EventSource` or `fetch` with `ReadableStream`. This is the correct pattern for Next.js App Router.
- **Do not use WebSockets** for skill streaming. WebSocket infrastructure (socket.io or ws) adds complexity and a server upgrade step. SSE is request/response, works through proxies, and is sufficient for unidirectional streaming.
- **Polling for scheduled jobs.** Once a user triggers a manual run that queues a BullMQ job (vs. inline invocation), or for dashboard checking on overnight job results, 3-second polling against `GET /api/jobs/[jobId]` is the right model. Simpler than maintaining open connections.
- **Streaming timeout handling:** Next.js App Router route handlers have a default 30-second edge function timeout. For local/self-hosted deployment, this is not a constraint (no edge runtime). Use Node.js runtime for all skill route handlers: `export const runtime = 'nodejs'`.

**Confidence: HIGH** — SSE with Next.js App Router is well-documented. The `runtime = 'nodejs'` requirement for long-running routes is critical and a common source of timeout bugs.

### Q5: Database Structure for N-Account Multi-Project with Cross-Project Search

**Pattern: Single-schema multi-tenant with project_id foreign key on every domain table**

```sql
-- Core tenant table
projects (id, customer_name, customer_id_prefix, status: active|closed|archived,
          rag_status, health_score, health_computed_at, go_live_date, ...)

-- Domain tables — all carry project_id
actions      (id, project_id, action_id_text, ...)  -- A-CUST-NNN
risks        (id, project_id, risk_id_text, ...)    -- R-CUST-NNN
milestones   (id, project_id, milestone_id_text, ...)
artifacts    (id, project_id, ...)
history      (id, project_id, ...)   -- append-only
decisions    (id, project_id, ...)   -- append-only
stakeholders (id, project_id, ...)
tasks        (id, project_id, workstream_id, ...)
workstreams  (id, project_id, ...)
outputs      (id, project_id, skill_id, file_type, filename, path, generated_at, ...)
job_runs     (id, project_id, skill_id, status, started_at, completed_at, output_id)
drafts       (id, project_id, skill_id, content, status: pending|sent|archived, ...)
knowledge_base (id, linked_project_ids[], ...)  -- cross-project

-- Full-text search
CREATE INDEX idx_actions_fts ON actions USING GIN(to_tsvector('english', description || ' ' || notes));
CREATE INDEX idx_risks_fts ON risks USING GIN(to_tsvector('english', description || ' ' || mitigation_notes));
-- Repeat for decisions, history, stakeholders, tasks, knowledge_base
```

**Cross-project search:** Use PostgreSQL full-text search (no separate search engine needed for single-user workload). A `search_all` function queries each domain table with `project_id IN (SELECT id FROM projects WHERE status != 'archived' OR include_archived = true)` and UNIONs results. Each result row carries `project_id`, `source_table`, `matched_text`, `created_at`.

**ID conventions:** `action_id_text` stores `A-KAISER-001` (the Cowork-compatible string). Primary key `id` is a serial integer for join efficiency. Never reuse `action_id_text` values — enforce with UNIQUE constraint.

**Append-only enforcement:** `history` and `decisions` tables have no UPDATE-accessible route handler. DataService exposes only `appendHistory()` / `appendDecision()` — no `updateHistory()` exists.

**Confidence: HIGH** — Standard PostgreSQL multi-tenant patterns. FTS approach well-established.

### Q6: File Generation Pipeline (.docx/.pptx/.xlsx/.html)

**Pattern: FileGenerationService with per-type generators, filesystem storage, DB registration**

```
/lib/files/
  generators/
    docx.ts      → uses `docx` library (maintained, ESM-compatible)
    pptx.ts      → uses `pptxgenjs` (CJS — must use require() or createRequire workaround)
    xlsx.ts      → uses `exceljs` (ESM-compatible)
    html.ts      → template literals or Handlebars
  FileGenerationService.ts   → dispatches to generator, writes to filesystem, registers in DB
```

**pptxgenjs CJS constraint:** This is carried over from the prior app (existing memory note confirmed). In a Next.js project, use `createRequire` from `module` to import pptxgenjs in a server-only context, or isolate it in a Route Handler that explicitly sets `runtime = 'nodejs'`. Do not attempt to use it in RSC or edge runtime.

**Output storage:** Write files to a configurable base path (default `~/Documents/BigPanda Projects/outputs/`). Store relative path in DB. Serve via `GET /api/outputs/[id]` which reads the file and streams it with appropriate Content-Disposition.

**Archive-on-replace:** When regenerating an output, the old row gets `status = 'archived'` and `archived_at = now()`. New row created. Query active outputs with `WHERE status = 'active'`.

**Confidence: MEDIUM** — Library choices are based on prior project decisions (docx, pptxgenjs, exceljs). Verify current major versions before Phase implementation.

---

## Component Boundaries (Formal)

| Component | Inputs | Outputs | Must NOT |
|-----------|--------|---------|---------|
| RSC Pages | DB data via DataService, job status | Rendered HTML | Call Anthropic SDK directly, import client-only libs |
| Route Handlers | HTTP requests | HTTP responses, SSE streams | Contain business logic, direct DB queries |
| SkillOrchestrator | skillId, projectId, options | Draft output record, streaming chunks | Read from HTTP request, write HTTP response |
| DataService | Query params, mutation payloads | Domain objects, DB records | Know about HTTP, Anthropic, or file system |
| MCP Client Pool | toolName, params | Tool results | Block the calling thread (use async/await throughout) |
| JobService | Job payload, schedule config | jobId, job status | Execute skill logic directly |
| BullMQ Workers | Job payload from Redis | DB writes via DataService | Access HTTP request context |
| FileGenerationService | Structured data, skill output | File buffer, registered output row | Stream over HTTP directly |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Skill Logic in Route Handlers
**What:** Building skill invocation directly inside `/app/api/skills/route.ts`
**Why bad:** Cannot be called from BullMQ workers (no HTTP request context). Duplicate code paths for manual vs scheduled runs. Impossible to test in isolation.
**Instead:** Route Handler calls `SkillOrchestrator.run()`. Worker calls `SkillOrchestrator.run()`. Same code path.

### Anti-Pattern 2: node-cron Inside Next.js Server
**What:** Registering cron jobs in a file that gets imported during app startup
**Why bad:** Fires on every Next.js instance in multi-process scenarios. Lost on server restart. No job history, no retry, no UI visibility.
**Instead:** BullMQ RepeatableJob with Redis persistence.

### Anti-Pattern 3: Streaming AI Output Without Persisting It
**What:** Streaming skill output to browser but not saving intermediate/final result to DB
**Why bad:** User cannot recover output after browser refresh. Scheduled jobs cannot store results.
**Instead:** SkillOrchestrator accumulates full output, writes to `drafts` table on stream completion. Browser has the stream; DB has the record.

### Anti-Pattern 4: One MCP Client Per Request
**What:** Creating a new MCP client connection for every skill invocation
**Why bad:** MCP server process startup cost on every request. Connection thrashing. Race conditions if two skills run simultaneously.
**Instead:** Shared `MCPClientPool` initialized once at server startup, reused across all invocations.

### Anti-Pattern 5: Storing Full SKILL.md Content in DB
**What:** Caching skill prompts in the database or in-memory at startup
**Why bad:** Violates the SKILL.md-on-disk runtime-read constraint. Cowork edits to skill prompts won't take effect. Drift between DB version and filesystem version.
**Instead:** Always `fs.readFile` at invocation time. Acceptable latency for a single-user app.

### Anti-Pattern 6: Edge Runtime for Skill Route Handlers
**What:** Deploying skill invocation route handlers to edge runtime (default in some Next.js configs)
**Why bad:** Edge runtime has no `fs` access (can't read SKILL.md), no Redis access, 30s timeout, no Node.js native modules.
**Instead:** `export const runtime = 'nodejs'` in every route handler that touches skills, jobs, or file generation.

---

## Build Order (Component Dependency Graph)

```
Phase 1 — Data Foundation (no UI dependencies)
  PostgreSQL schema + migrations
  DataService (all domain CRUD)
  YAML import script (existing → DB)
  Action Tracker import (XLSX → DB)
  Health score computation logic
    ↓
Phase 2 — Next.js App Shell + Read Surface
  Next.js project scaffold (App Router, Tailwind, auth-optional)
  Route Handlers for read-only data endpoints
  RSC Dashboard (reads from DataService)
  RSC Workspace tabs (actions, risks, milestones, etc.)
  Context doc export (DB → YAML Markdown)
    ↓
Phase 3 — Write Surface + Action Tracker
  Mutation Route Handlers (CRUD for actions, risks, milestones)
  Optimistic UI patterns in Client Components
  Inline editing in Workspace tabs
  PA3_Action_Tracker.xlsx dual-write
    ↓
Phase 4 — Job Infrastructure
  Redis setup
  BullMQ worker process
  JobService
  Job status Route Handler + polling UI component
  Cron schedule registration (6 scheduled jobs)
    ↓
Phase 5 — Skill Engine (depends on Phase 4 for async, Phase 2 for context)
  SkillOrchestrator
  Context assembly per skill
  Anthropic SDK integration + streaming
  SSE Route Handler
  Streaming UI panel (Skill Launcher)
    ↓
Phase 6 — MCP Integrations (depends on Phase 5)
  MCPClientPool
  Slack MCP server connection
  Gmail MCP server connection
  Glean MCP server connection
  Drive MCP server connection
  Tool-use flow in SkillOrchestrator
  Customer Project Tracker skill (primary MCP consumer)
    ↓
Phase 7 — File Generation (can overlap with Phase 5)
  FileGenerationService
  docx, pptx, xlsx, html generators
  Output Library UI
  Artifact registration in DB
    ↓
Phase 8 — Cross-Project Features + Polish
  Full-text search across all tables
  Cross-project Risk Heat Map
  Knowledge Base
  Dashboard cross-account panels
  Drafts Inbox + send/discard flow
```

**Critical path:** Phases 1 → 2 → 3 → 4 → 5 are strictly sequential. Phase 6 (MCP) and Phase 7 (file gen) can overlap after Phase 5 is stable. Phase 8 has no hard predecessors but benefits from all data being populated.

**Biggest blocking risk:** Phase 4 → 5 interface. If SkillOrchestrator is not cleanly separated from Route Handlers in Phase 5, it cannot be called from BullMQ workers. This architectural boundary must be enforced before any skill logic is written.

---

## Critical Integration Points

| Integration | Risk Level | Notes |
|-------------|------------|-------|
| SKILL.md disk read at runtime | MEDIUM | Path must be configurable. Works in local deploy; would break in serverless. Confirm local Node.js deployment only. |
| pptxgenjs CJS in Next.js | HIGH | Requires `createRequire` wrapper or dedicated API route with `runtime = 'nodejs'`. Test in Phase 7 setup before writing generation logic. |
| BullMQ worker process lifecycle | MEDIUM | Workers must start with the app. Use a process manager (pm2) or a startup script. Hot reload must not restart workers. |
| MCP client process stability | HIGH (LOW confidence) | MCP server processes crashing silently is a known pain point. Requires health check loop and automatic restart logic. |
| Anthropic SDK streaming + tool_use | MEDIUM | Multi-turn tool_use with streaming requires careful message array management. Verify SDK version handles this correctly. |
| PA3_Action_Tracker.xlsx dual-write | MEDIUM | Row format is contractual. Test export round-trip before Phase 3 is considered done. |
| PostgreSQL FTS for cross-project search | LOW | Standard feature; no risk. May need query tuning for large history tables. |

---

## Scalability Considerations

This is a single-user local application. Scalability considerations are secondary to correctness.

| Concern | Single-User (current) | Future Team Scale |
|---------|----------------------|-------------------|
| DB connections | Direct pg connection pool, 5 connections sufficient | Add PgBouncer |
| Job concurrency | 1-2 concurrent workers | Increase worker count, add job priority queues |
| File storage | Local filesystem | S3/GCS with signed URLs |
| Search | PostgreSQL FTS | Add pgvector for semantic search, or migrate to dedicated search |
| Auth | None (single-user local) | NextAuth.js with team roles |

---

## Sources

- Anthropic SDK streaming and tool_use patterns: training knowledge (MEDIUM confidence, verify `@anthropic-ai/sdk` current version)
- BullMQ v5 RepeatableJob API: training knowledge (MEDIUM confidence, verify cron syntax in v5)
- Next.js 14 App Router runtime configuration (`export const runtime = 'nodejs'`): training knowledge (HIGH confidence, well-established)
- PostgreSQL full-text search: training knowledge (HIGH confidence, stable feature)
- MCP SDK client pool pattern: training knowledge (LOW confidence, protocol was actively evolving at training cutoff)
- pptxgenjs CJS interop: confirmed by prior project build (existing app memory)
- PA3_Action_Tracker.xlsx row format: confirmed in PROJECT.md
- SKILL.md runtime-read constraint: confirmed in PROJECT.md
