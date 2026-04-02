---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: — Infrastructure & UX Foundations
status: executing
last_updated: "2026-04-02T00:46:38.569Z"
last_activity: "2026-04-02 — Plan 31-03 complete: API routes (enqueue, polling, batch status)"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 5
  completed_plans: 5
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

## Current Status

**Phase:** 31 (BullMQ Document Extraction Migration)
**Plan:** 05 of 5 (complete)
**Status:** Phase 31 Complete — All BullMQ extraction migration plans finished
**Last activity:** 2026-04-01 — Plan 31-05 complete: Human UAT verification with 11 bugs found and fixed

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** v4.0 — Infrastructure & UX Foundations. Phase 31: BullMQ Document Extraction Migration.

## Milestone History

- **v1.0** — Foundation + Read/Write Surface + Skills + MCP + Cross-Project (Phases 1–16, 63 plans, complete 2026-03-26)
- **v2.0** — AI Ingestion & Enhanced Operations (Phases 17–25, 63 plans, complete 2026-03-30)
- **v3.0** — Collaboration & Intelligence (Phases 26–30, 26 plans, complete 2026-04-01)
- **v4.0** — Infrastructure & UX Foundations (Phases 31–36, TBD plans, started 2026-04-01)

## Phase Progress (v4.0)

| Phase | Status |
|-------|--------|
| 31. BullMQ Extraction | Complete (5/5) |
| 32. Time Tracking Global | Not started |
| 33. Schema Migration | Not started |
| 34. Metrics & Health | Not started |
| 35. Weekly Focus | Not started |
| 36. Test Fixes | Not started |

## Active Work

**Phase 31 — Complete (2026-04-01):**
All 5 plans complete: BullMQ document extraction migration fully verified and production-ready.
- Plan 01: extraction_jobs schema + Wave 0 tests
- Plan 02: BullMQ worker job handler
- Plan 03: API routes (enqueue, polling, batch status)
- Plan 04: UI migration to polling (IngestionModal + ContextTab)
- Plan 05: Human UAT verification (6 tests passed, 11 bugs found and fixed)

**Requirements Verified:**
- EXTR-01: Navigation-away persistence and browser refresh resilience
- EXTR-02: Real-time progress visibility with % and chunk labels
- EXTR-03: Atomic commit pattern (workspace unchanged until approval)

**Key Technical Achievements:**
- Complete SSE-to-BullMQ migration for document extraction
- Background job processing with polling-based progress updates
- Browser-refresh resilience via PostgreSQL staging table pattern
- Atomic commit prevents partial data on failure
- Toast fires exactly once per batch (ref-guarded with Set)
- Review modal handoff with pre-loaded staged items

v4.0 roadmap created 2026-04-01. All 15 requirements mapped across 6 phases (31–36).

**Execution order:**
- Phases 31 and 32 can run in parallel (no shared components)
- Phase 33 must precede Phases 34 and 35 (schema migration prerequisite)
- Phase 36 is last (fix tests after implementation patterns finalized)

**Coverage:** 15/15 requirements mapped ✓

## Decisions

**v4.0 Architectural Decisions:**
- **[2026-04-01] Plan 31-05:** Enum value coercion required — Claude returns free-text like 'Active' but DB expects 'active' (lowercase)
- **[2026-04-01] Plan 31-05:** ConflictResolution defaults to 'skip' on approve submission (safest default, preserves existing data)
- **[2026-04-01] Plan 31-05:** Upload history filters by source='upload' only to exclude old ingestion pipeline records
- **[2026-04-01] Plan 31-05:** Worker cannot use server-only imports — must use ../../lib/settings-core not settings.ts
- **[2026-04-02] Plan 31-03:** SSE route completely replaced — extraction logic now in worker, API route only enqueues
- **[2026-04-02] Plan 31-03:** Shared types moved to lib/extraction-types.ts — prevents import breakage, supports both API and worker
- **[2026-04-02] Plan 31-03:** Stale detection inline in polling endpoint — no cron required, self-healing on next poll
- **[2026-04-02] Plan 31-03:** Batch status filters for active jobs only — excludes 'failed' to keep UI response clean
- **[2026-04-02] Plan 31-03:** queue.close() after all enqueues — prevents Redis connection leaks in API route
- **[2026-04-02] Plan 31-01:** extraction_jobs has NO RLS (internal job tracking table, matches skill_runs/job_runs pattern)
- **[2026-04-02] Plan 31-01:** Idempotent enum pattern (DO $$ / EXCEPTION WHEN duplicate_object) allows safe migration re-runs
- **[2026-04-02] Plan 31-01:** Three indexes on extraction_jobs: project_id, batch_id, status for query optimization
- **[2026-04-02] Plan 31-01:** Wave 0 tests use vi.mock() with explicit module paths to fail RED without brittle import errors
- **[2026-04-01] v4.0 roadmap:** Phase numbering starts at 31 — Phase 30 was last phase of v3.0
- **[2026-04-01] v4.0 roadmap:** Phases 31 and 32 can run in parallel — BullMQ extraction and time tracking share no components
- **[2026-04-01] v4.0 roadmap:** Phase 33 is prerequisite for Phases 34 and 35 — track column migration must precede workstream-separated UI
- **[2026-04-01] v4.0 roadmap:** Phase 36 placed last — test fixes after implementation patterns finalized to avoid cascading breakage
- **[2026-04-01] BullMQ extraction pattern:** PostgreSQL staging table (not just Redis) for browser-refresh resilience; atomic commit prevents partial data on failure
- **[2026-04-01] Time tracking route:** /customer/[id]/time → /time-tracking with redirect preserving project context
- **[2026-04-01] ADR/Biggy separation:** track column on onboarding_phases + onboarding_steps with data backfill heuristic
- **[2026-04-01] New packages:** react-chrono (timeline), Recharts (metrics charts) — minimal dependency additions

**Recent Decisions from v3.0:**
- **[Phase 30]** SSE document extraction vulnerable to browser refresh on large docs (4-6 min operations) — BullMQ migration is v4.0 Phase 31
- **[Phase 29]** XML-wrapped project context in chat prompt prevents hallucination — temperature 0.3 for anti-hallucination
- **[Phase 26]** requireSession() at Route Handler level is security boundary (CVE-2025-29927 defense-in-depth) — pattern established across 40+ handlers
- [Phase 31]: Worker job uses ../../lib/settings-core (NOT settings.ts — has server-only marker that crashes worker)
- [Phase 31]: Relative imports (../../lib/*) instead of Next.js @/ alias — worker is plain Node.js process
- [Phase 31]: Progress heartbeat: updated_at set after every chunk for stale detection (10 min threshold)
- [Phase 31]: Polling intervals: 2s for modal (foreground), 5s for ContextTab (background) — balances responsiveness with backend load
- [Phase 31]: Toast ref-guarded with Set — prevents duplicate notifications when polling detects batch_complete multiple times

## Accumulated Technical Context

### BullMQ Infrastructure (Phase 31 Context)
- Existing patterns from worker/jobs/skill-run.ts — job handler, progress tracking, polling endpoint
- PostgreSQL staging table pattern for atomic commit (prevent partial extraction on failure)
- Job TTL and timeout tuning: set timeout to 2x P95 extraction time, TTL to 3x P95 time (minimum 20/30 min)
- Polling endpoint pattern (not SSE) for browser-refresh resilience
- Worker heartbeat pattern: update extraction_jobs.updated_at every 30s; cron detects stale jobs (>10 min, status="running") and marks failed

### Time Tracking Global View (Phase 32 Context)
- Current route: /customer/[id]/time (per-project)
- New route: /time-tracking (top-level, cross-project)
- Redirect pattern: /customer/:id/time → /time-tracking?project=:id (preserve context)
- Query patterns: LEFT JOIN to projects, date range filter, user scoping, pagination
- Bulk action API extension from existing v2.0 bulk actions infrastructure

### Overview Tab Schema Migration (Phase 33 Context)
- Add track column to onboarding_phases and onboarding_steps
- Backfill data using heuristic: UPDATE onboarding_phases SET track = 'ADR' WHERE name ILIKE '%ADR%'
- Create index: CREATE INDEX idx_onboarding_steps_track ON onboarding_steps(project_id, track)
- Dual-read fallback: if track-filtered query returns 0 rows, fall back to old schema query pattern
- Standardized phase models: ADR (Discovery & Kickoff → Integrations → Platform Configuration → Teams → UAT); Biggy (Discovery & Kickoff → IT Knowledge Graph → Platform Configuration → Teams → Validation)

### Metrics & Health Dashboard (Phase 34 Context)
- Read-only aggregation queries from existing tables: risks, actions, milestones, integrations, time_entries, workstreams
- Recharts library for bar charts and line charts
- Metrics: onboarding completion %, integration counts by status, phase completion by workstream, time to milestone
- Health Dashboard: overall health, risk count by severity, phase health by workstream (ADR vs Biggy), active blocker count, trend text
- Milestone Timeline: react-chrono library or custom Tailwind implementation

### Weekly Focus & Integration Tracker (Phase 35 Context)
- Weekly focus: 3-5 AI-generated priority bullets cached in Redis, generated by scheduled BullMQ job every Monday 6am
- React Suspense boundary: AI call does NOT block page render — summary generated by scheduled job, cached for 24 hours
- Integration tracker: split by ADR vs Biggy with category grouping (ADR: Inbound/Outbound/Enrichment; Biggy: Real-time/Context-Knowledge-UDC)
- Prompt engineering research needed during planning (2 hour budget)

### Test Fixes (Phase 36 Context)
- 13 failing tests in tests/teams-arch/ directory
- Root cause fixes required (not setTimeout workarounds)
- Isolate test fixes: one at a time, commit immediately, verify no passing tests broken
- Document why test failed and how fix addresses root cause

## Previous Milestone Context

### v3.0 Decisions (Collaboration & Intelligence)
- [Phase 26]: better-auth install requires --legacy-peer-deps due to Next.js 16 peer dep mismatch
- [Phase 26]: Wave 0 stub pattern: const target: any = undefined; expect(target).toBeDefined() — fails RED without brittle import errors
- [Phase 26]: cookieCache omitted from lib/auth.ts (known bug #7008 with Next.js App Router RSC); disableSignUp:true blocks self-registration
- [Phase 26]: proxy.ts (not middleware.ts) — Next.js 16 convention; requireSession() in route handlers is security boundary
- [Phase 27]: Hybrid URL pattern (pathname + searchParams) preserves existing route segments with zero migration risk
- [Phase 27]: SubTabBar component extracts secondary tab row for clean separation of concerns
- [Phase 27]: Seed 10 of 11 tabs: skip Skills (0 sections) and Architecture (complex nested structure)
- [Phase 28]: React Flow requires dynamic import with ssr: false — prevents ResizeObserver/DOM API hydration errors
- [Phase 28]: Direction-specific spacing (LR 150/100, TB 100/80) — hub-and-spoke needs more space
- [Phase 29]: Vercel AI SDK chosen over raw Anthropic SDK for chat streaming (toUIMessageStreamResponse + useChat)
- [Phase 29]: Temperature 0.3 for anti-hallucination (balances accuracy with conversational fluency)
- [Phase 29]: XML-wrapped project context (<project_data> tags) for prompt injection defense
- [Phase 30]: Two-phase API: POST /api/context-hub/[id]/ingest (Claude routing) → POST /api/context-hub/[id]/apply (DB writes)
- [Phase 30]: Completeness analysis: on-demand trigger (not BullMQ-scheduled) for v3.0

### v2.0 Decisions (AI Ingestion & Enhanced Operations)
- [Phase 18]: SSE event type alignment: extract route emits type:'complete'; IngestionModal listens for 'complete'
- [Phase 18]: max_tokens 8192→16384 in extract route — dense documents silently truncated at lower limit
- [Phase 19.1]: server-only mock required in vitest.config.ts — mapping to empty stub unblocks adapter test files
- [Phase 22]: Source attribution badges (Manual/Ingested/Discovered) applied across all workspace tab records
- [Phase 23]: Google Calendar OAuth UI verified but full auth flow needs Google Cloud Console setup
- [Phase 24]: ioredis/bullmq TS2322 type conflict resolved with `as any` cast — bullmq v5 bundles own ioredis
