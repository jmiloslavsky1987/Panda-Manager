# Project Research Summary

**Project:** BigPanda AI Project Management App (Full Rewrite)
**Domain:** AI-native PS Delivery Management — single power user, n customer accounts, heavy AI output generation
**Researched:** 2026-03-18
**Confidence:** MEDIUM (stack HIGH where grounded in working codebase; architecture/pitfalls HIGH for established patterns; MCP specifics LOW)

## Executive Summary

This is a full rewrite of a working 8-phase local web app — switching from Google Drive + React/Express/Vite to PostgreSQL + Next.js 14 App Router, while keeping the existing AI skill ecosystem intact. The recommended approach is a unified Next.js 14 monorepo with Drizzle ORM for type-safe DB access, BullMQ + Redis for scheduled background jobs, and the Anthropic SDK's native tool-use API for MCP integrations. The existing working codebase provides HIGH-confidence ground-truth versions for most key libraries (React 19, Tailwind 4, @anthropic-ai/sdk 0.78.0, pptxgenjs 4, Zod 4, TanStack Query 5, CodeMirror 6) — these are proven, running versions, not estimates.

The AI-native differentiator depends critically on a SkillOrchestrator that reads SKILL.md files from disk at runtime (not bundled), assembles DB-derived context, and invokes Claude with token-budget guards. This orchestrator must be cleanly separated from Route Handlers so the same code path runs for both manual (SSE-streamed) and scheduled (BullMQ worker) invocations. Getting this separation wrong in Phase 5 taints the entire scheduled job infrastructure. The YAML context doc export must also carry forward the exact js-yaml settings from the prior build to preserve Cowork skill compatibility — this is a non-negotiable constraint.

The primary risks are: (1) Next.js serverless architecture killing cron jobs if not isolated in a dedicated worker process, (2) PostgreSQL connection pool exhaustion during concurrent scheduled job bursts, (3) Claude context window blowout on Customer Project Tracker batch runs across 10+ accounts, and (4) MCP client process stability (LOW confidence on current SDK state). The first three have well-documented mitigations. MCP needs a research spike before Phase 6.

---

## Key Findings

### Recommended Stack

The stack is anchored by the existing working codebase. Ground-truth versions from running package.json files give HIGH confidence on all carry-forward libraries. New additions (Drizzle ORM, BullMQ, docx, ExcelJS, @slack/web-api) need `npm view <pkg> version` verification before pinning.

**Core technologies:**
- **Next.js 14 (App Router):** Unified frontend + API — replaces the Vite/Express split; server components, API routes, and streaming RSC in one repo
- **React 19.2.0:** Confirmed working in existing client; do not downgrade to 18
- **Tailwind CSS 4.2.1:** Confirmed in existing client; V4 uses CSS `@theme` directives — NO `tailwind.config.js`; `@tailwindcss/vite` plugin only
- **TypeScript 5.x:** Standard for Next.js App Router; use strict mode throughout
- **PostgreSQL 16.x + Drizzle ORM:** Primary data store; Drizzle preferred over Prisma (no binary engine, native Edge Runtime compat, plain TypeScript schema)
- **`postgres` (porsager) driver:** Cleaner connection lifecycle than `pg`; avoids pool config footguns
- **@anthropic-ai/sdk 0.78.0:** Confirmed running version — NOT ^0.20.0 (stale); streaming and tool-use API surface changed substantially from 0.20.x
- **BullMQ + Redis:** Job queue for 6 scheduled skills; provides retry, persistence, job history — node-cron is unacceptable (no retry, no persistence, silent failure)
- **pptxgenjs 4.0.1:** Confirmed v4 in existing build; requires `export const runtime = 'nodejs'` — cannot run in Edge Runtime
- **Zod 4.3.6:** Confirmed v4; breaking changes from v3 (`z.record()`, `z.string().min(1)` replacing `.nonempty()`)
- **TanStack Query 5.90.21:** Confirmed in existing client; `QueryClientProvider` must be in a client component
- **CodeMirror 6:** Confirmed in existing client; use for YAML editor — do not switch to Monaco
- **js-yaml 4.1.1:** Confirmed; must use `{ sortKeys: false, lineWidth: -1, schema: yaml.JSON_SCHEMA }` — non-negotiable for Cowork compatibility
- **googleapis 171.4.0:** Confirmed working for Drive + Gmail; CJS import works in Next.js via standard `import { google } from 'googleapis'`
- **docx 8.x + ExcelJS 4.x:** New additions for .docx/.xlsx generation; versions need `npm view` before pinning
- **SSE via Next.js `ReadableStream`:** No library needed for real-time skill output streaming; WebSockets are incompatible with App Router serverless architecture

**Critical version verification required before Phase 1:**
```bash
npm view drizzle-orm version
npm view postgres version
npm view drizzle-kit version
npm view bullmq version
npm view ioredis version
npm view docx version
npm view exceljs version
npm view @slack/web-api version
```

See `.planning/research/STACK.md` for complete version table, conflict matrix, and installation commands.

---

### Expected Features

The feature set is defined by the PROJECT.md specification (domain-authoritative). External web research was unavailable; feature categorizations are validated against known PS delivery tooling patterns (Gainsight, Vitally, Linear AI).

**Must have (table stakes) — missing = product fails:**
- Project health at a glance (auto-derived RAG from overdue actions + stalled milestones + unresolved high risks — never manual)
- Per-project action tracker with inline editing + PA3_Action_Tracker.xlsx sync (contractual Cowork handshake)
- Risk register with append-only mitigation log
- Milestone tracker with completion history
- Engagement history and key decisions (both append-only — contractual audit trail)
- Stakeholder roster (BigPanda vs customer contacts)
- Full-text search across all records spanning all projects
- Output Library (indexed by account + skill type + date)
- Settings (API keys, paths, schedule times — self-configurable without code changes)
- Multi-account architecture (n projects with add/close/archive lifecycle)

**Should have (AI-native differentiators) — what makes this valuable over a generic PM tool:**
- Scheduled background intelligence: 6 cron jobs (Morning Briefing 8am, Health Check 8am, Slack/Gmail sweep 9am, Tracker Monday 7am, Weekly Status Thursday 4pm, Biggy Briefing Friday 9am)
- Skill Launcher with 15 pre-built AI skills (SKILL.md read from disk at runtime, never bundled)
- Tone separation: customer-facing vs internal outputs are enforced at skill level — never mix
- Drafts Inbox: review queue for all outbound AI content before any send
- Auto health scoring (data-derived, not manual — with manual override requiring justification)
- Context Updater: 14-step structured update from meeting notes → DB → context doc (atomic)
- Cross-project risk heat map (probability x impact, all accounts)
- Cross-account watch list (escalated items needing daily attention)
- Customer Project Tracker (Gmail/Slack/Gong sweep → DB update)
- Knowledge Base (cross-project lessons learned, searchable after archive)
- Source tracing on all records (required for Cowork skill confidence framing)
- YAML ↔ DB round-trip (DB → YAML for Cowork compatibility, exact js-yaml settings required)
- Team Engagement Map, Onboarding velocity view, AI-assisted plan generation

**Defer to later milestones (not v1):**
- Knowledge Base (build after data accumulates — milestone 2)
- AI-assisted plan generation (highest complexity, lowest urgency — milestone 3)
- Gantt timeline view (read-only is fine for v1; drag-and-drop is scope theater)
- Onboarding velocity / stall detection (valuable but secondary to core data surfaces)

**Anti-features (deliberately not building):**
- Customer-facing portal, multi-user collaboration, JWT/SSO auth, in-app email/Slack send, QBR generator, real-time collaborative editing, native mobile app, versioned document diffing

See `.planning/research/FEATURES.md` for full feature dependency graph and MVP prioritization order.

---

### Architecture Approach

The architecture is a single-schema multi-tenant Next.js 14 App Router application with a strictly separated service layer. PostgreSQL is the single source of truth. BullMQ workers run as a separate persistent Node.js process alongside the Next.js server — this separation is mandatory, not optional. The SkillOrchestrator is the most critical component: it must be callable from both Route Handlers (manual SSE invocations) and BullMQ workers (scheduled runs) — if skill logic leaks into Route Handlers, the scheduled job path breaks.

**Major components:**
1. **RSC Pages** — Server-side render of data-heavy read views (dashboard, workspace tabs); zero client JS for initial paint
2. **Route Handlers (`/app/api/`)** — HTTP boundary only; input validation, dispatch to service layer; never contain business logic
3. **DataService** — All DB access via Drizzle; enforces append-only rules, ID generation, source tracing; only component that touches PostgreSQL
4. **SkillOrchestrator** — Loads SKILL.md from disk at invocation time, assembles DB context, invokes Anthropic SDK, streams result, persists draft; callable from both Route Handlers and workers
5. **MCPClientPool** — Shared MCP client instance initialized at server startup; manages Slack/Gmail/Glean/Drive tool sessions; one pool, not one client per request
6. **JobService** — Enqueues BullMQ jobs; exposes job status; manages cron schedule registration; does not contain skill logic
7. **BullMQ Workers** — Separate Node.js process; calls SkillOrchestrator for scheduled runs; writes results to DB via DataService
8. **FileGenerationService** — Produces .docx/.pptx/.xlsx/.html; registers artifact in DB outputs table; isolated to Node.js runtime routes

**Key patterns:**
- `export const runtime = 'nodejs'` on every Route Handler that touches skills, jobs, file generation, or SKILL.md reads — Edge Runtime is incompatible with all of these
- Singleton DB connection pool with `global.__pgPool` to survive hot reload
- `import 'server-only'` at the top of every file with DB queries or API keys — build-time guard against client bundle leakage
- SSE via Next.js `ReadableStream` for manual skill invocations; 3-second polling for job status
- PostgreSQL FTS (`tsvector`/`tsquery` with GIN index) for cross-project search — no separate search engine needed

**Build order is strictly sequential for Phases 1-5:** Schema → App Shell → Write Surface → Job Infrastructure → Skill Engine. Phase 6 (MCP) and Phase 7 (file generation) can overlap after Phase 5 is stable.

See `.planning/research/ARCHITECTURE.md` for full component boundary table, data flow diagrams, and anti-pattern list.

---

### Critical Pitfalls

**Top pitfalls ordered by blast radius:**

1. **Cron jobs in Next.js Route Handlers** — Jobs silently stop running in any multi-process or serverless context; scheduler log appears on every HTTP request if misplaced. Prevention: dedicated worker process (`worker/index.ts`) launched alongside Next.js; BullMQ RepeatableJob, never `node-cron` inside API routes.

2. **PostgreSQL connection pool exhaustion** — `new Pool()` at module scope creates a new pool on every Route Handler cold start; exhausts `max_connections` during concurrent scheduled job bursts. Prevention: singleton pool pattern (`global.__pgPool`); set `max: 10`; PgBouncer in transaction mode if needed.

3. **Claude context window blowout** — Customer Project Tracker sweeping 30 days of Gmail + Slack + Gong for 10+ accounts can hit 80k-120k tokens per account; $50-200+ API bill from a single Monday batch. Prevention: `buildSkillContext()` utility that queries only skill-declared DB rows (not full project dump); token budget guard wrapping every API call; sequential (not parallel) batch execution.

4. **Missing `project_id` filter causing cross-account data contamination** — Silent bug that gets worse as account count grows. Prevention: PostgreSQL Row Level Security on every project-scoped table; `ProjectRepository` class that always injects `project_id`; two-project seed in all integration tests.

5. **SkillOrchestrator not separated from Route Handlers** — If skill logic is embedded in Route Handlers, BullMQ workers cannot call it, creating duplicate code paths that drift. Prevention: enforce the boundary before writing any skill logic in Phase 5; Route Handler calls `SkillOrchestrator.run()`; Worker calls `SkillOrchestrator.run()`.

6. **YAML export round-trip drift** — Wrong js-yaml settings break Cowork skill compatibility silently. Prevention: carry forward `{ sortKeys: false, lineWidth: -1, schema: yaml.JSON_SCHEMA }` exactly; add round-trip test before any YAML export ships.

7. **Append-only tables broken by accidental UPDATE** — Application-layer conventions drift. Prevention: `BEFORE UPDATE OR DELETE` trigger on `engagement_history` and `key_decisions` at migration time; no `PATCH` Route Handler for these tables.

8. **SSE disconnect → duplicate skill run → double API cost** — User navigates away mid-stream; on reconnect triggers a new run. Prevention: write to `outputs` table during stream (not after); idempotency key on skill runs; poll job status on reconnect.

9. **Prompt injection via DB content in skill prompts** — User-supplied meeting notes or swept Slack messages can override skill behavior; Context Updater writes to DB. Prevention: `<user_content>` delimiters in every prompt; schema-validated output before any DB write; diff review in Drafts Inbox.

10. **MCP auth token leakage** — OAuth tokens embedded in stored skill outputs or logs. Prevention: tokens never passed to Claude; sanitize outputs before DB write; `server-only` import guard on all credential-handling modules.

See `.planning/research/PITFALLS.md` for full pitfall list with detection and phase-specific warning table.

---

## Implications for Roadmap

Based on the combined research, the architecture's component dependency graph and the FEATURES.md priority order converge on the same 8-phase structure suggested in ARCHITECTURE.md. The ordering is driven by hard dependencies: everything is blocked on the schema; skills are blocked on job infrastructure; MCP is blocked on skills.

### Phase 1: Data Foundation
**Rationale:** Every feature in FEATURES.md is blocked on PostgreSQL schema + migrations. Connection pooling, RLS policies, append-only triggers, and YAML export utilities must be built here — retrofitting them later is significantly more expensive.
**Delivers:** PostgreSQL schema with all domain tables (actions, risks, milestones, history, decisions, stakeholders, artifacts, outputs, job_runs, drafts); DataService with full CRUD; YAML import script (existing context docs → DB); YAML export with correct js-yaml settings; health score computation logic; singleton connection pool; RLS policies; append-only triggers.
**Addresses:** Multi-account architecture, action tracker, risk register, milestone tracker, engagement history, key decisions, stakeholder roster, YAML round-trip.
**Avoids:** Pitfalls 2 (connection pool), 4 (missing project_id filter), 6 (YAML drift), 7 (append-only violation). These cannot be retroactively fixed without schema rewrites.
**Research flag:** Standard patterns — skip research phase. PostgreSQL multi-tenant schema, Drizzle ORM migration workflow, and js-yaml configuration are well-documented.

### Phase 2: Next.js App Shell + Read Surface
**Rationale:** With data in the DB, the app shell and read-only views can be built without mutation logic. SSR via React Server Components gives fast initial paint. Dashboard health cards and workspace tabs are the daily driver — establishing them early validates the data model.
**Delivers:** Next.js project scaffold; `server-only` import guards; Route Handlers for read endpoints; RSC Dashboard with auto-derived RAG health cards; RSC workspace tabs (actions, risks, milestones, history, decisions, stakeholders); TanStack Query setup with `QueryClientProvider` in client component.
**Uses:** Next.js 14 App Router, React 19, Tailwind 4 (CSS `@theme` directives), TanStack Query 5.
**Avoids:** Pitfall 15 (server component credential leakage); Pitfall 13 (stale health scores during batch — add `last_updated` timestamps now).
**Research flag:** Skip research phase. Next.js App Router RSC + Tailwind 4 + TanStack Query 5 setup is well-documented and proven in existing client.

### Phase 3: Write Surface + Action Tracker
**Rationale:** Read-only views prove the data model; write surface proves data integrity. Inline editing, optimistic UI, and the PA3_Action_Tracker.xlsx dual-write are the contractual deliverables that validate the DB is correct.
**Delivers:** Mutation Route Handlers for all domain entities; optimistic UI patterns in client components; inline editing in workspace tabs; PA3_Action_Tracker.xlsx dual-write with round-trip test.
**Avoids:** Pitfall 5 (data isolation — verify `project_id` filter on every mutation); PA3 row format must be validated against exact column headers before phase closes.
**Research flag:** Skip research phase. Optimistic UI with TanStack Query and ExcelJS xlsx generation are well-documented patterns.

### Phase 4: Job Infrastructure
**Rationale:** Skills (Phase 5) depend on BullMQ for async execution. The job infrastructure must exist and be verified stable before any skill logic is written — including the worker process lifecycle, job status table, and advisory locking pattern.
**Delivers:** Redis setup (local via Homebrew); BullMQ worker process (`worker/index.ts`); `JobService` (enqueue, status); job status Route Handler + polling UI component; `scheduled_jobs` table with advisory lock pattern; cron schedule registration for all 6 scheduled jobs (initially no-op handlers).
**Avoids:** Pitfall 1 (cron jobs in Next.js — worker process is the solution); Pitfall 6 (job overlap — advisory locks established here, not retrofitted).
**Research flag:** Needs research spike on BullMQ v5 RepeatableJob cron syntax before implementation — major version may have changed the repeat job API.

### Phase 5: Skill Engine
**Rationale:** The AI-native value proposition lives here. `SkillOrchestrator` is the most critical component boundary — it must be callable identically from Route Handlers and workers before any skill is wired. Token budget guard and context chunking must be built before first skill runs.
**Delivers:** `SkillOrchestrator` with `run(skillId, projectId)` method; `buildSkillContext()` utility with token budget guard; SKILL.md startup validation + pre-run file guard; Anthropic SDK streaming integration; SSE Route Handler (`export const runtime = 'nodejs'`); streaming UI panel (Skill Launcher); Drafts Inbox; `outputs` table status model with idempotency key; initial 4 skills wired: Weekly Customer Status, Context Updater, Morning Briefing, Customer Project Tracker (without MCP).
**Avoids:** Pitfall 3 (context window blowout — token budget guard is Phase 5 prerequisite); Pitfall 8 (SSE disconnect — DB write during stream); Pitfall 9 (prompt injection — content delimiters on all prompts); Pitfall 10 (missing SKILL.md → startup validation).
**Research flag:** Needs research phase. Anthropic SDK 0.78.x streaming with tool_use multi-turn requires API verification. Verify `buildSkillContext()` context assembly pattern against current SDK docs.

### Phase 6: MCP Integrations
**Rationale:** Customer Project Tracker is the highest-value scheduled job but depends on Slack/Gmail/Gong sweeps via MCP. MCP is isolated to Phase 6 because the client pool pattern has LOW confidence — it needs a research spike before implementation.
**Delivers:** `MCPClientPool` (shared, initialized once at server startup); MCP connections for Slack, Gmail, Glean, Drive; tool-use flow in SkillOrchestrator; Customer Project Tracker skill fully wired with MCP; auth token sanitization before DB write.
**Avoids:** Pitfall 4 (MCPClientPool shared — not one client per request); Pitfall 9 (MCP auth token leakage).
**Research flag:** REQUIRES research phase. MCP SDK was actively evolving at training cutoff (August 2025). Verify `@modelcontextprotocol/sdk` current API, stdio vs HTTP transport preference, and connection lifecycle management in 2026 before writing any Phase 6 code.

### Phase 7: File Generation
**Rationale:** Can overlap with Phase 6. pptxgenjs, docx, and ExcelJS generators are isolated to `FileGenerationService` — no dependency on MCP. ELT decks and meeting summaries complete the skill portfolio.
**Delivers:** `FileGenerationService` with per-type generators (.docx, .pptx, .xlsx, .html); Output Library UI (indexed by account + skill type + date); archive-on-replace pattern; remaining 11 skills wired (ELT External/Internal Status, Team Engagement Map, Workflow Diagram, Handoff Doc Generator, Meeting Summary, Biggy Weekly Briefing, Onboarding Assessment, AI-Assist Plan, Knowledge Capture).
**Avoids:** Pitfall 8 (file corruption — test every template in Microsoft Office before wiring into skill launcher; use `export const runtime = 'nodejs'` on all file generation routes).
**Research flag:** Needs a validation spike: generate test PPTX and DOCX, open in Microsoft Office (not LibreOffice), verify no corruption. This is a known failure mode — do it before writing generation logic, not after.

### Phase 8: Cross-Project Features + Polish
**Rationale:** Cross-project views (risk heat map, watch list, full-text search) require all project data to be populated. Knowledge Base benefits from accumulated patterns. These features have no hard Phase 7 predecessors but need substantial data to be useful.
**Delivers:** PostgreSQL FTS across all tables (GIN index); cross-project risk heat map; cross-account watch list; Knowledge Base (searchable, linkable to risks/decisions); Dashboard cross-account panels; Drafts Inbox send/discard flow; settings validation for SKILL.md paths; onboarding velocity / stall detection.
**Research flag:** Skip research phase. PostgreSQL FTS and cross-project query patterns are well-documented. UI polish is standard React work.

---

### Phase Ordering Rationale

- **Data-first (Phase 1):** RLS policies, connection pooling, append-only triggers, and YAML export are dramatically harder to retrofit than to build first. Every other phase touches the DB.
- **Read before write (Phase 2 before 3):** Read surface validates the data model before mutations can corrupt it. Optimistic UI bugs are harder to diagnose without a known-good read baseline.
- **Infrastructure before skills (Phase 4 before 5):** SkillOrchestrator being callable from workers is the single most critical architectural boundary. It cannot be established after skill logic is written.
- **Skills before MCP (Phase 5 before 6):** Skills without MCP (DB-only context) are fully functional for most use cases. MCP adds the Slack/Gmail sweep dimension. Isolating MCP to Phase 6 reduces Phase 5 scope and lets the LOW-confidence MCP patterns be researched before use.
- **File generation can overlap (Phase 7 with Phase 6):** FileGenerationService has no MCP dependency. ELT deck generation can proceed in parallel with MCP integration work.
- **Cross-project last (Phase 8):** These features compound value from accumulated data. Full-text search with empty tables is not useful.

---

### Research Flags

**Requires research phase before implementation:**
- **Phase 4:** BullMQ v5 RepeatableJob cron syntax — major version API may have changed
- **Phase 5:** Anthropic SDK 0.78.x streaming + tool_use multi-turn pattern — verify current API surface; `buildSkillContext()` token estimation approach
- **Phase 6:** MCP SDK current API, connection lifecycle, stdio vs HTTP transport — LOW confidence, actively evolving ecosystem
- **Phase 7:** pptxgenjs v4 + docx v8 Microsoft Office compatibility — validation spike before generation logic is written

**Standard patterns (skip research phase):**
- **Phase 1:** PostgreSQL schema design, Drizzle migration workflow, js-yaml configuration — well-documented; existing app provides proven patterns
- **Phase 2:** Next.js App Router RSC, Tailwind 4, TanStack Query 5 — existing client codebase is ground truth
- **Phase 3:** Optimistic UI with TanStack Query, ExcelJS xlsx writes — established patterns
- **Phase 8:** PostgreSQL FTS, cross-project queries, React UI polish — standard

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (carry-forward libraries) | HIGH | Read directly from working server/package.json and client/package.json — proven running versions |
| Stack (new libraries: Drizzle, BullMQ, docx, ExcelJS) | MEDIUM | Architecture rationale is HIGH; version numbers need `npm view` before pinning |
| Features | HIGH | Grounded in PROJECT.md specification (domain-authoritative, written by the PS delivery manager); external PS tool research MEDIUM but used only for validation |
| Architecture | HIGH for core patterns; LOW for MCP | Next.js App Router, PostgreSQL multi-tenant, BullMQ worker separation are well-established; MCP client pool pattern was evolving at training cutoff |
| Pitfalls | HIGH | All critical pitfalls are well-documented across multiple authoritative sources; MCP-specific pitfalls are MEDIUM |

**Overall confidence:** MEDIUM-HIGH. The foundation (schema, app shell, write surface, job infrastructure) can be built with HIGH confidence. Skill engine needs API verification (Phase 5). MCP integration is the highest-uncertainty area and needs a dedicated research spike (Phase 6).

### Gaps to Address

- **MCP SDK current state (Phase 6 blocker):** As of training cutoff (August 2025), `@modelcontextprotocol/sdk` was actively evolving. Verify current connection management API, stdio vs HTTP transport preference, and whether the client pool pattern from ARCHITECTURE.md Q3 is still the recommended approach. Run this research before Phase 6 planning.
- **BullMQ v5 RepeatableJob API (Phase 4):** Major version — verify `repeat: { cron: '0 8 * * *', tz: 'America/New_York' }` syntax is still correct in v5 before implementing scheduled jobs.
- **pptxgenjs v4 + docx v8 Microsoft Office compatibility (Phase 7):** Generate test files early in Phase 7 and open in actual Microsoft Office. Known failure mode — do not defer this validation.
- **Cowork skill context format (Phase 5):** SKILL.md files are read from disk and expect a specific YAML-like context format. Before wiring any skill, verify the `assembleContext()` output format matches what the existing Cowork skills expect — diff against the YAML files the previous app generated.
- **Action ID gap behavior for Cowork (Phase 1):** PostgreSQL sequences create gaps on rollback. Confirm whether Cowork skills that read context docs tolerate ID gaps (A-001, A-002, A-004) or require sequential renumbering on export.

---

## Sources

### Primary (HIGH confidence)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/package.json` — proven server dependency versions (running code)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/client/package.json` — proven client dependency versions (running code)
- `.planning/PROJECT.md` — requirements specification (domain-authoritative)
- Next.js 14 App Router official documentation — RSC, Route Handlers, `runtime = 'nodejs'`, `server-only` package
- PostgreSQL documentation — RLS, FTS (`tsvector`/`tsquery`), advisory locks, connection limits

### Secondary (MEDIUM confidence)
- Training knowledge through August 2025 — BullMQ v5, Drizzle ORM, pptxgenjs v4, docx v8, ExcelJS v4
- `.planning-archive-20260318/research/STACK.md` — previous research cycle (carry-forward context)
- Anthropic SDK streaming and tool-use patterns — well-established but SDK version-sensitive
- PS delivery tooling landscape (Gainsight, Vitally, Linear, Notion AI) — used for feature categorization validation only

### Tertiary (LOW confidence)
- MCP SDK client pool patterns — `@modelcontextprotocol/sdk` was actively evolving at training cutoff; verify before Phase 6

---

*Research completed: 2026-03-18*
*Ready for roadmap: yes*
