# Project Research Summary

**Project:** BigPanda Project Assistant App — v4.0 Infrastructure & UX Foundations
**Domain:** Professional Services Project Management & Onboarding Tools
**Researched:** 2026-04-01
**Confidence:** HIGH

## Executive Summary

v4.0 adds critical infrastructure improvements and UX enhancements to the existing BigPanda project management application. The core enhancement is migrating document extraction from fragile Server-Sent Events to robust BullMQ background jobs, enabling browser-refresh resilience for long-running AI extraction tasks (4-6 minutes per large document). Additionally, time tracking moves from per-project tabs to a global cross-project view, and the Overview tab receives major enhancements with Health Dashboard, Metrics visualization, and AI-generated weekly focus summaries.

The recommended approach leverages existing infrastructure wherever possible. No new packages are required for BullMQ job progress tracking — the existing BullMQ 5.71.0 installation fully supports progress updates via built-in APIs. For new visualizations, add only two targeted dependencies: react-chrono for milestone timelines and Recharts for metrics charts. The critical architectural pattern is polling-based progress tracking (not SSE) with PostgreSQL as the source of truth for job state, ensuring users can navigate away and return without losing visibility into long-running operations.

Key risks center on data integrity and migration safety. The primary pitfall is implementing BullMQ extraction without proper state persistence — if job progress is stored only in ephemeral Redis, browser refresh loses all visibility and jobs can fail silently. Prevention requires a PostgreSQL staging table for job state and atomic commit patterns to prevent partial extraction data from polluting workspace tabs on failure. Schema migrations for workstream separation (ADR vs Biggy) must include data backfill scripts, not just DDL changes, to avoid breaking existing projects. Following these patterns from Phase 1 ensures production resilience.

## Key Findings

### Recommended Stack

**Minimal new dependencies.** v4.0 requires only two new packages: react-chrono for timeline visualization and Recharts for metrics charts. The existing stack (Next.js 16.2.0, React 19, PostgreSQL + Drizzle ORM, BullMQ 5.71.0 + Redis, Anthropic SDK, Vercel AI SDK, Radix UI, Tailwind CSS) fully supports all new features.

**Core technologies:**
- **BullMQ 5.71.0** (existing): Background job processing with progress tracking — Worker calls `job.updateProgress(percentage)` and `job.log(message)`, client polls `/api/jobs/[id]/progress` endpoint
- **react-chrono ^3.0.0** (new): Timeline component for visual milestone representation — Declarative React component with vertical/horizontal/alternating modes, TypeScript support, SSR-safe
- **Recharts ^2.15.0** (new): Declarative charting library for React — Composable components (`<BarChart>`, `<LineChart>`), responsive by default, pure SVG, ~60KB bundle

**Critical finding:** Moving from SSE to BullMQ for document extraction requires **zero new packages** — only a pattern change using existing BullMQ infrastructure. The pattern shift is polling (every 1.5-2s) over SSE because BullMQ persists job state in Redis, making it resilient to browser refresh, whereas SSE connections die on navigation.

### Expected Features

**Table stakes (users expect these):**
- **Health Dashboard**: Overall health indicator, risk count by severity, active blocker count, trend indicators
- **Metrics Section**: Onboarding completion %, integration counts by status, phase completion by workstream, time to milestone
- **Weekly Focus Summary**: Top 3-5 priorities auto-generated and refreshed
- **Time Tracking Global View**: Cross-project timesheet with week-based grouping and project attribution on every entry
- **BullMQ Extraction Progress**: Polling endpoint with % complete, completion notification, error handling with retry, cancel job capability

**Differentiators (set product apart):**
- **Health Dashboard**: Phase health by workstream (ADR vs Biggy granularity) — most tools show overall health only
- **Metrics**: Validation progress tracker (emphasizes quality over quantity — "X of Y integrations validated")
- **Weekly Focus**: Auto-refresh on data change with smart ranking algorithm considering severity, milestone proximity, blocker status
- **Time Tracking**: Bulk edit from global view extending existing bulk action infrastructure
- **Integration Tracker**: Split by ADR vs Biggy with category grouping

**Anti-features (explicitly avoid):**
- Real-time collaborative editing (Google Docs style) — overkill for PS delivery tool
- Custom dashboard builder (drag-drop widgets) — premature without user feedback
- Predictive health forecasting ("project will be red in 2 weeks") — insufficient historical data
- Mobile app — web responsive sufficient for PS team
- BullMQ pause/resume — adds state complexity without clear user benefit

### Architecture Approach

v4.0 introduces three major architectural changes cleanly integrated with existing Next.js 16 / PostgreSQL / BullMQ stack: (1) BullMQ extraction job with Redis progress tracking and PostgreSQL state persistence, (2) Time tracking route refactor from `/customer/[id]/time` to `/time-tracking` with query-param filtering, (3) Overview tab overhaul with schema migration to add `track` column for ADR/Biggy separation.

**Major components:**
1. **Document Extraction Job System** — `worker/jobs/document-extraction.ts` job handler, `POST /api/ingestion/extract-job` enqueue endpoint, `GET /api/ingestion/extract-job/[jobId]` polling endpoint, PostgreSQL staging table for atomic commit
2. **Global Time Tracking Route** — `/app/time-tracking/page.tsx` top-level route, `GET /api/time-tracking/entries` with project/week filters, Next.js redirect from old route preserving project context
3. **Overview Tab Components** — `HealthDashboard`, `MetricsSection`, `WeeklyFocusSummary` (cached from BullMQ scheduled job), `MilestoneTimeline`, schema migration adding `track` column to `onboarding_phases` and `onboarding_steps`

**Critical pattern:** Polling-based progress tracking with PostgreSQL as source of truth. Extraction job updates Redis for real-time progress (ephemeral, TTL 1 hour) AND writes to PostgreSQL staging table after each chunk (persistent). Client polls PostgreSQL-backed API route, not Redis directly, ensuring progress visibility survives browser refresh.

### Critical Pitfalls

1. **SSE Route Handler Converted to Background Job Without Job State Persistence** — Browser refresh loses ALL progress visibility if job state is only in Redis. **Prevention:** Create `extraction_jobs` PostgreSQL table with `{ id, artifact_id, job_id, status, progress_message, current_chunk, total_chunks }`. Worker updates DB after each chunk. Client polls PostgreSQL-backed endpoint, not Redis job metadata directly.

2. **Partial Extraction Failure Leaves Orphaned Data** — Multi-chunk extraction processes chunks 1-3, crashes on chunk 4, but chunks 1-3 already committed to workspace tables. Retry re-inserts duplicates. **Prevention:** Stage results in `extraction_jobs.items_staged` JSONB column, don't insert into workspace tables until ALL chunks complete. Atomic transaction commits all deduplicated items at end.

3. **BullMQ Worker Crashes Mid-Job, Redis TTL Expires Before Restart** — Large doc extraction takes 4-6 min. Worker crashes at 3 min. Default Redis TTL (5 min) expires before restart, job metadata discarded, artifact stuck in "extracting" forever. **Prevention:** Set job TTL to 30 minutes, job timeout to 20 minutes, retry attempts to 2 with exponential backoff. Heartbeat pattern: worker updates `extraction_jobs.updated_at` every 30s; cron job detects stale extractions (>10 min, status="running") and marks failed.

4. **Time Tracking Route Refactor Breaks Existing Bookmarks and Email Links** — Current route `/customer/[id]/time` bookmarked by users and embedded in email reminders. Redesign moves to `/time-tracking`. Old links → 404. **Prevention:** Add Next.js redirect in `next.config.ts` mapping `/customer/:id/time` → `/time-tracking?project=:id` (temporary redirect). Update internal link generation and email templates. Keep redirect for 6 months minimum.

5. **Database Schema Migration for Overview Tab Breaks Existing Onboarding Data** — Migration adds `track` column to `onboarding_phases`/`onboarding_steps` but doesn't backfill existing data. Existing projects render empty sections in new UI (looks like data loss). **Prevention:** Migration includes both DDL (ALTER TABLE ADD COLUMN track) and DML (UPDATE to backfill track from phase names with heuristic). Add dual-read fallback in code: if track-filtered query returns 0 rows, fall back to old schema query pattern.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: BullMQ Document Extraction Migration
**Rationale:** Critical infrastructure fix must come first. Current SSE extraction is fragile (browser refresh kills 4-6 minute operations). Background job pattern is reused by Phase 4 (Weekly Focus) — establishes job infrastructure patterns early. No dependencies on other features.

**Delivers:** Resilient document extraction that survives browser refresh, with visible progress tracking and atomic commit preventing duplicate data on failure.

**Stack elements:** Existing BullMQ 5.71.0, PostgreSQL staging table (`extraction_jobs`), worker job handler pattern

**Critical pitfalls addressed:**
- Job state persistence in PostgreSQL (prevents progress loss on refresh)
- Atomic commit with staging table (prevents partial extraction duplicates)
- Job TTL and timeout tuning (prevents silent job loss on worker crash)

**Dependencies:** None — can start immediately

**Research flag:** SKIP RESEARCH — pattern established by existing `worker/jobs/skill-run.ts` and STACK.md polling pattern. Implementation is straightforward extension of existing BullMQ infrastructure.

---

### Phase 2: Time Tracking Global View
**Rationale:** Standalone feature with no dependencies on Phase 1 or 3. Can be built in parallel with Phase 1. Establishes cross-project query patterns used by Phase 3 Metrics (hours logged metric).

**Delivers:** Top-level `/time-tracking` route with cross-project weekly timesheet, project attribution, week grouping, quick project filter, and backward-compatible redirect from old route.

**Uses:** Existing `time_entries` table, Drizzle ORM left join to projects, Next.js redirect API

**Addresses features:**
- Table stakes: global view across projects, week-based grouping, project attribution
- Differentiator: bulk edit from global view (extends existing bulk action infrastructure)

**Critical pitfalls addressed:**
- Route redirect preserves project context (prevents bookmark/email link breakage)
- Query scoping prevents performance trap (date range filter, user scoping, pagination, eager load projects in single query)

**Dependencies:** None — independent feature

**Research flag:** SKIP RESEARCH — standard Next.js route patterns, PostgreSQL JOIN queries, existing bulk action API extension. No novel patterns.

---

### Phase 3: Overview Tab Schema Migration
**Rationale:** Must precede Phase 4-6 because they render workstream-separated data. Schema change is isolated (just add `track` column) and low-risk if data migration included.

**Delivers:** `onboarding_phases.track` and `onboarding_steps.track` columns with backfilled data for existing projects. Enables ADR/Biggy workstream separation in UI components.

**Migration pattern:**
```sql
ALTER TABLE onboarding_phases ADD COLUMN track TEXT;
ALTER TABLE onboarding_steps ADD COLUMN track TEXT;
UPDATE onboarding_phases SET track = 'ADR' WHERE name ILIKE '%ADR%';
UPDATE onboarding_phases SET track = 'Biggy' WHERE name ILIKE '%Biggy%';
UPDATE onboarding_steps os SET track = (SELECT track FROM onboarding_phases op WHERE op.id = os.phase_id);
CREATE INDEX idx_onboarding_steps_track ON onboarding_steps(project_id, track);
```

**Critical pitfall addressed:** Data migration (not just DDL) prevents existing projects from rendering empty sections in new UI. Dual-read fallback code ensures graceful handling of rows where track is NULL.

**Dependencies:** None — schema-only change

**Research flag:** SKIP RESEARCH — standard Drizzle migration pattern. Data backfill heuristic may need adjustment based on actual phase names in production DB (validate during implementation).

---

### Phase 4: Overview Tab — Health Dashboard & Metrics
**Rationale:** Builds on Phase 3 schema (workstream separation). Read-only components with no state changes — low risk. Provides immediate value (executive visibility) before tackling complex AI summary in Phase 5.

**Delivers:** Health Dashboard (overall health, risk count, blocker count, trend text) and Metrics Section (onboarding %, integration counts, phase completion by workstream, time to milestone) with Recharts visualizations.

**Stack elements:** Recharts ^2.15.0 for bar charts and line charts

**Addresses features:**
- Table stakes: all Health Dashboard and Metrics requirements
- Differentiator: Phase health by workstream (ADR vs Biggy granularity)

**Uses architecture components:** Read from existing tables (`risks`, `actions`, `milestones`, `integrations`, `time_entries`, `workstreams`) with aggregation queries. No new tables required.

**Dependencies:** Phase 3 (schema migration for workstream separation)

**Research flag:** SKIP RESEARCH — standard aggregation queries and Recharts component composition. FEATURES.md provides clear metric definitions.

---

### Phase 5: Overview Tab — Weekly Focus Summary (AI)
**Rationale:** Complex feature requiring AI generation, caching, and scheduled job. Builds on BullMQ patterns from Phase 1 (job handler, scheduler integration). Isolated behind Suspense boundary — failure doesn't break other Overview sections.

**Delivers:** Weekly focus summary (3 AI-generated bullets) cached in Redis, generated by scheduled BullMQ job every Monday 6am, rendered with React Suspense to prevent blocking page load.

**Stack elements:** Existing BullMQ scheduler, Anthropic SDK, Redis cache

**Addresses features:**
- Table stakes: weekly focus top 3-5 priorities with circular progress bar
- Differentiator: auto-refresh on data change with smart ranking (via scheduled regeneration)

**Critical pitfall addressed:** AI call does NOT block page render. Summary generated by scheduled job, cached for 24 hours, page loads summary from cache with Suspense fallback. If cache miss, shows "Generating summary..." instead of 4-second white screen.

**Dependencies:** Phase 1 (BullMQ job patterns established) — not a hard blocker but better to validate job infrastructure first

**Research flag:** NEEDS LIGHT RESEARCH — Claude prompt engineering for weekly summary generation (what context to include, how to structure prompt for consistent 3-bullet output). ~2 hours research during phase planning.

---

### Phase 6: Overview Tab — Milestone Timeline
**Rationale:** Visual polish after core metrics proven. Can use react-chrono library or custom Tailwind implementation. Low complexity, no state management, purely presentational.

**Delivers:** Horizontal or vertical timeline showing milestones with target dates, rendered at top of Overview tab (high visual hierarchy).

**Stack elements:** react-chrono ^3.0.0 (or custom Tailwind if design doesn't match library styling)

**Addresses features:** Table stakes requirement for visual milestone timeline near top of Overview

**Dependencies:** None (reads from existing `milestones` table) — can be built anytime after Phase 3

**Research flag:** SKIP RESEARCH — react-chrono API is well-documented, STACK.md provides implementation examples. If custom Tailwind chosen, no research needed (standard CSS).

---

### Phase 7: Integration Tracker Redesign
**Rationale:** Lower priority than Overview tab work. Uses same workstream separation pattern from Phase 3 schema. Standalone UI enhancement with no architecture changes.

**Delivers:** Integration tracker split into ADR vs Biggy sections with category grouping (observability, incident, collaboration tools).

**Addresses features:** Differentiator — split by ADR vs Biggy, category grouping

**Dependencies:** Phase 3 (schema migration if `integrations.track` column doesn't exist — verify during planning)

**Research flag:** SKIP RESEARCH — UI reorganization using existing `integrations` table. If schema change needed, same pattern as Phase 3.

---

### Phase 8: Test Failure Fixes
**Rationale:** Last phase allows tests to be updated with knowledge of final implementation patterns. Fixing tests earlier risks cascading breakage as architecture evolves across phases 1-7.

**Delivers:** All 13 failing tests in `tests/teams-arch/` directory pass, with root cause fixes (not setTimeout workarounds).

**Critical pitfalls addressed:**
- Isolate test fixes (one at a time, commit immediately, verify no passing tests broken)
- No arbitrary timeouts or changed assertions without production code fix
- Document why test failed and how fix addresses root cause

**Dependencies:** Phases 1-7 (implementation patterns finalized)

**Research flag:** SKIP RESEARCH — tests document expected behavior, no external research needed. Investigation per test to determine if bug is in test or production code.

---

### Phase Ordering Rationale

- **Phase 1 first:** Critical infrastructure fix with no dependencies. Background job pattern is reused by Phase 5 (Weekly Focus). Browser-refresh resilience is production-critical for 4-6 minute extraction operations.
- **Phase 2 parallel:** Can build alongside Phase 1 (no shared components). Establishes cross-project query patterns reused by Phase 4 Metrics (hours logged).
- **Phase 3 before 4-7:** Schema migration must precede any UI that renders workstream-separated data. Isolated change (just add column + backfill) reduces risk.
- **Phase 4 before 5:** Prove static metrics work before adding AI complexity. Health Dashboard and Metrics are read-only aggregations (low risk) vs. AI summary (cache, scheduled job, prompt engineering).
- **Phase 5 before 6:** Weekly Focus is higher value than Milestone Timeline (executive decision-making vs. visual polish). Can build Phase 6 in parallel if resources available.
- **Phase 7 independent:** Integration Tracker can slot in anytime after Phase 3. Lower priority than Overview work.
- **Phase 8 last:** Fix tests after implementation patterns finalized to avoid cascading breakage.

**Parallel workstreams:**
- **Week 1-2:** Phase 1 + Phase 2 in parallel (different developers)
- **Week 3:** Phase 3 (schema migration — short, ~2 days)
- **Week 3-4:** Phase 4 (Metrics) + Phase 6 (Timeline) in parallel
- **Week 5:** Phase 5 (Weekly Focus)
- **Week 6:** Phase 7 (Integration Tracker) + Phase 8 (Test Fixes) in parallel

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Weekly Focus):** Claude prompt engineering for consistent 3-bullet summary generation. Research time budget: 2 hours. Use existing project data to prototype prompts and validate output format.

Phases with standard patterns (skip research-phase):
- **Phase 1 (BullMQ Extraction):** Pattern established by existing `worker/jobs/skill-run.ts` and STACK.md polling documentation
- **Phase 2 (Time Tracking):** Standard Next.js route patterns and PostgreSQL JOIN queries
- **Phase 3 (Schema Migration):** Standard Drizzle migration pattern with data backfill
- **Phase 4 (Metrics):** Standard aggregation queries and Recharts component composition
- **Phase 6 (Milestone Timeline):** react-chrono library is well-documented with examples in STACK.md
- **Phase 7 (Integration Tracker):** UI reorganization using existing table schema
- **Phase 8 (Test Fixes):** Tests document expected behavior, no external research needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing infrastructure fully supports new features; only 2 new packages needed (react-chrono, Recharts). BullMQ job progress pattern validated via official docs and existing codebase analysis. |
| Features | MEDIUM | Table stakes derived from training data on PM tools (Jira, Monday.com, Asana) and time tracking tools (Harvest, Toggl) — patterns consistent but unverified via web search (training data current through January 2025). Differentiators validated against existing codebase capabilities. |
| Architecture | HIGH | All patterns grounded in existing codebase structure (`worker/index.ts`, `app/api/ingestion/extract/route.ts`, schema.ts). Schema migration strategy tested against actual table definitions. Data flow patterns validated via working BullMQ infrastructure. |
| Pitfalls | HIGH | Derived from direct codebase inspection (current SSE extraction implementation, existing BullMQ job handlers, schema structure) and documented requirements in PROJECT.md. All pitfalls are specific to this application's architecture (Next.js 16, BullMQ, Drizzle ORM, PostgreSQL). |

**Overall confidence:** HIGH

Research is grounded in existing codebase analysis (not generic recommendations). All architectural recommendations integrate cleanly with validated v3.0 patterns. Stack recommendations are minimal (only 2 new packages) and well-supported by official documentation.

### Gaps to Address

1. **Integrations.track field existence** — FEATURES.md and ARCHITECTURE.md reference splitting integrations by ADR/Biggy track, but schema.ts doesn't show `integrations.track` column. **Resolution:** During Phase 7 planning, inspect `integrations` table schema. If column missing, add migration identical to Phase 3 pattern (ALTER TABLE ADD COLUMN track, UPDATE to backfill from integration names).

2. **Workstream phase standardization** — FEATURES.md mentions "standardized phase models" for ADR vs Biggy comparison, but current schema has freeform `workstreams.current_status` text field. **Resolution:** During Phase 4 planning, determine if phase standardization is required for metrics. If yes, create mapping table or enum; if no, use existing percent_complete for comparison (simpler).

3. **Weekly focus prompt tuning** — ARCHITECTURE.md provides example prompt template, but effectiveness depends on production data structure (action descriptions, risk details, milestone names). **Resolution:** During Phase 5 planning, prototype prompt with 3-5 real projects, validate output format consistency, refine prompt if needed. Budget 2 hours.

4. **Test failure root causes** — 13 tests failing in `tests/teams-arch/` directory. PROJECT.md notes "tests were written speculatively before implementation." Unknown if failures are test bugs or implementation bugs. **Resolution:** During Phase 8, investigate each test individually to determine if bug is in test setup or production code. Fix root cause, not symptom.

5. **Extraction job TTL and timeout values** — STACK.md recommends 30-minute TTL, 20-minute timeout, but optimal values depend on largest expected document size in production. **Resolution:** During Phase 1 planning, measure current extraction times for 95th percentile document size. Set timeout to 2x P95 time, TTL to 3x P95 time (with 20 min minimum).

## Sources

### Primary (HIGH confidence)
- Existing codebase: `worker/index.ts`, `worker/scheduler.ts`, `worker/jobs/skill-run.ts`, `worker/connection.ts` — BullMQ patterns and job infrastructure
- Existing codebase: `app/api/ingestion/extract/route.ts` — Current SSE extraction implementation with chunk processing and dedup logic
- Existing codebase: `app/customer/[id]/overview/page.tsx`, `components/OnboardingDashboard.tsx` — Current Overview tab structure
- Existing codebase: `db/schema.ts` — PostgreSQL schema structure for onboarding_phases, onboarding_steps, workstreams, time_entries, artifacts
- PROJECT.md — v4.0 requirements and scope (test fixes, extraction to BullMQ, time tracking redesign, Overview overhaul)
- BullMQ Documentation — Job Progress API (job.updateProgress, job.log, job.getState) — official docs
- BullMQ Documentation — Repeatable Jobs (cron scheduling) — official docs
- Next.js 16 Documentation — Route Handlers, redirects() API — official docs
- Drizzle ORM Documentation — Migrations (SQL file generation) — official docs

### Secondary (MEDIUM confidence)
- Training data on PM tool patterns: Jira, Monday.com, Asana, Linear (2024-2025 knowledge) — used for table stakes feature definitions
- Training data on time tracking tool patterns: Harvest, Toggl, Clockify (2024 knowledge) — used for time tracking UX patterns
- Training data on onboarding tool patterns: Pendo, Userpilot, WalkMe (2024 knowledge) — used for onboarding completion metrics

### Tertiary (LOW confidence)
- react-chrono npm package page — version 3.0.0 current as of January 2025 (may have updates)
- Recharts npm package page — version 2.15.0 current as of January 2025 (may have updates)

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*
