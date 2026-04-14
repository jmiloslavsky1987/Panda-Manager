# Project Research Summary

**Project:** BigPanda AI Project Management App — v7.0 Governance & Operational Maturity
**Domain:** AI-native Professional Services project management with governance controls
**Researched:** 2026-04-13
**Confidence:** HIGH

## Executive Summary

v7.0 adds operational maturity to an existing AI-native project management platform with 57 phases already shipped. The research reveals that **minimal new technology** is needed — only a lightweight code editor (@uiw/react-codemirror) for prompt editing UI. The existing stack (Next.js 16, PostgreSQL, Drizzle ORM, better-auth@1.5.6, Redis/BullMQ) handles all other features through schema additions and application logic changes.

The recommended approach is **foundation-first**: implement per-project RBAC before any other feature, as it's a dependency blocker for archive/delete, scheduling controls, and prompt editing. better-auth's global roles must be supplemented with a custom `project_members` table for per-project Admin/User roles. Archive/restore follows standard soft-delete patterns using timestamp columns, with explicit query filtering to prevent data leakage. Project-scoped scheduling extends existing BullMQ infrastructure with Redis indexing for efficient filtering.

**Critical risk: RBAC migration incompleteness.** With 40+ route handlers already using `requireSession()`, partial migration to per-project roles creates security holes. The mitigation strategy is audit-first (map all route handlers), create a `requireProjectRole()` wrapper, deprecate global role checks immediately, and validate with E2E tests covering all handlers. Secondary risks include soft-delete cascade blind spots (FK relationships across 57+ phases), Gantt bi-directional sync race conditions, and filesystem prompt editing concurrency issues.

## Key Findings

### Recommended Stack

**No major stack changes needed.** The existing Next.js 16 + PostgreSQL + Drizzle ORM + better-auth + BullMQ architecture supports all v7.0 features. Only addition: @uiw/react-codemirror (~80KB) for editable prompt UI — chosen over Monaco Editor (300KB, SSR-incompatible) because prompts are plain text/markdown, not full IDE content.

**Core technologies:**
- **@uiw/react-codemirror ^4.25.9**: Editable prompt UI with syntax highlighting — lightweight, React 18 native, SSR-compatible
- **Custom project_members table**: Per-project RBAC (better-auth has global roles only) — follows existing Drizzle schema patterns
- **Timestamp-based soft-delete**: archived_at + deleted_at columns on projects table — standard PostgreSQL pattern, no library needed
- **Redis Set indexing**: Project-scoped job filtering for BullMQ scheduler — addresses O(N) filtering performance trap

**Critical version compatibility:** All existing packages (better-auth@1.5.6, drizzle-orm@0.45.1, Next.js@16.2.0, BullMQ@5.71.0) are v7.0-compatible with no upgrades required.

### Expected Features

Research identified a clear MVP boundary: **governance foundations + executive visibility + data quality**. Per-project RBAC is the highest-priority table stake — multi-user apps need project ownership. Archive/restore provides project lifecycle management (soft-delete with read-only preservation, reversible). Health Dashboard redesign delivers auto-derived executive KPIs from existing data. Analyze Completeness surfaces missing/sparse/conflicting fields for validation feedback.

**Must have (table stakes):**
- Per-project Admin/User roles — two-tier model expected; enforces ownership
- Archive project (soft-delete) — completed projects need preservation without cluttering active list
- Restore archived project — archive must be reversible for mistake recovery
- Permanent delete project — admin nuclear option for test data cleanup
- View archived projects list — discoverable toggle on portfolio dashboard
- Logout button — basic auth hygiene (currently missing)
- Health Dashboard with auto-derived metrics — executive KPIs from tasks/milestones/risks data
- Analyze Completeness on-demand — surface missing/conflicting data with per-field scoring
- Edit before approve in ingestion — correction workflow without re-extraction
- Skills Design Standard audit — identify non-compliant skills, grey out in UI
- Project-scoped scheduling — skills run per-project, scoping is table stakes

**Should have (competitive):**
- Static + dynamic tracks in Overview tab — hybrid manual config + live integration data
- Editable prompts UI — tune AI behavior without code changes (HIGH complexity, P2)
- Move items between sections — reclassify extraction errors (task → action, note → decision)
- Note entity reclassification — upgrade "note" catch-all to structured types
- Repurpose Decisions tab — focus on operational impact vs append-only log

**Defer (v2+):**
- Scheduled completeness analysis — on-demand sufficient for v7.0
- Custom role builder — two-tier Admin/User binary sufficient (explicit PROJECT.md exclusion)
- Per-skill permissions — granular RBAC adds complexity; skills should be safe by design
- Editable prompt version history — audit log captures runs; git is version control

### Architecture Approach

v7.0 integrates with existing Next.js 16 App Router architecture through **extension, not replacement**. Route Handlers maintain the requireSession() security boundary (CVE-2025-29927 defense-in-depth pattern). Per-project RBAC extends this with a post-session check that queries project_members table. Soft-delete uses timestamp filtering at the query layer (all projects queries filtered WHERE archived_at IS NULL). Gantt bi-directional sync operates through transaction-based cascading updates with advisory locks to prevent race conditions. BullMQ workers read project_id from job metadata and verify RBAC on execution.

**Major components:**
1. **Auth layer extension** — `requireProjectRole(projectId, minRole)` wrapper for route handlers; queries project_members table after session check
2. **Query layer filtering** — helper functions (getActiveProjects(), notDeleted()) wrap Drizzle queries to ensure archived_at IS NULL filter applied consistently
3. **Gantt sync utility** — transaction-based date propagation across tasks/milestones with pg_advisory_xact_lock for concurrency control
4. **Scheduler Redis index** — projects:{projectId}:jobs Set maintains per-project job ID index for efficient filtering (avoids O(N) in-memory filter)
5. **Prompt editing service** — filesystem write-back with proper-lockfile for atomicity, schema validation, backup creation, and audit logging

**Key patterns:** Authorization at route handler level (not middleware), soft-delete through timestamps (not separate state tables), single source of truth for Gantt (DB drives UI, never reverse), Redis indexing for BullMQ metadata filtering.

### Critical Pitfalls

Research identified eight critical pitfalls with specific prevention strategies:

1. **Incomplete RBAC Migration (CRITICAL)** — With 40+ route handlers, partial migration creates security holes where some check global role, others check project role. **Avoid:** Create exhaustive audit manifest (grep all user.role references), introduce requireProjectRole() wrapper, deprecate global role immediately, extract all auth logic to single lib/auth-rbac.ts module.

2. **Soft-Delete Cascade Blind Spots (CRITICAL)** — 57+ phases of schema evolution = dozens of project_id FKs with different semantics. Archive can violate FK constraints or leak archived data. **Avoid:** Map every table with project_id FK, add archived_at IS NULL to base query helpers (never raw db.query.projects), implement archive pre-flight checks (no active jobs), test cascade on RESTORE.

3. **Gantt Bi-Directional Sync Race Conditions (HIGH)** — Drag updates DB while API in-flight causes state divergence or infinite loops. **Avoid:** DB is single source of truth, optimistic update with rollback, debounce drag events (send on onDragEnd only), cascade propagation in transaction with advisory lock, version-based concurrency control.

4. **Filesystem Prompt Edit Security Holes (HIGH)** — Web UI editing SKILL.md files without validation enables prompt injection or concurrent write corruption. **Avoid:** Atomic write with file locking (proper-lockfile), schema validation on write (verify required sections), backup before overwrite, append-only audit log, RBAC enforcement (admin-only), strip XML/control characters.

5. **Project-Scoped Scheduling Filter Brittleness (MODERATE)** — BullMQ metadata filtering in-memory = O(N) performance, missing metadata passes filter. **Avoid:** Redis Set index (projects:{projectId}:jobs), job name prefix convention, RBAC at job action level, metadata schema validation, handle pre-v7.0 jobs with migration.

6. **Completeness Analysis Definition Drift (MODERATE)** — Schema evolution makes old projects retroactively "incomplete" without versioning. **Avoid:** Version completeness schemas (v1.json, v2.json), grandfather old projects, score components separately (per-area breakdowns), time-series storage for trend tracking.

7. **Cross-Feature Integration Gap (MODERATE)** — Archive + RBAC + Scheduling + Extraction developed in isolation create interaction bugs (archived project with running jobs). **Avoid:** Cross-feature validation matrix, pre-flight checks for destructive actions, background job identity re-verification, integration tests for cross-feature scenarios, saga pattern for multi-step operations.

8. **Editable Prompts Cowork Compatibility Break (MODERATE)** — User edits break Cowork skills repo compatibility; later updates overwrite edits. **Avoid:** Fork-on-edit (create SKILL.md.custom), versioned skill registry with custom badge, export format validation, rollback to canonical, block edits for integration-critical skills.

## Implications for Roadmap

Based on research, suggested phase structure prioritizes **foundations → lifecycle → visibility → quality → maturity**:

### Phase 1: Per-Project RBAC Foundation
**Rationale:** Dependency blocker for archive/delete, scheduling controls, prompt editing. Must come first to avoid security holes. With 40+ route handlers, this is the highest-risk migration.
**Delivers:** project_members table, requireProjectRole() wrapper, migration of all route handlers, E2E test coverage
**Addresses:** AUTH-02, AUTH-03, AUTH-04, AUTH-05 (Admin/User roles per project)
**Avoids:** Pitfall #1 (Incomplete RBAC Migration) — exhaustive audit prevents global role leakage
**Research needed:** No — standard two-tier RBAC pattern, well-documented

### Phase 2: Project Lifecycle Management
**Rationale:** Natural next step after RBAC; archive/delete/restore require admin role enforcement. Soft-delete is standard pattern with low risk.
**Delivers:** archived_at/deleted_at columns, query layer filtering, portfolio dashboard toggle, admin-only delete with confirmation
**Addresses:** PROJ-01 (archive), PROJ-02 (permanent delete), PROJ-03 (view archived), PROJ-04 (restore), AUTH-01 (logout)
**Uses:** Timestamp-based soft-delete (standard PostgreSQL pattern from STACK.md)
**Avoids:** Pitfall #2 (Soft-Delete Cascade Blind Spots) — FK audit and pre-flight checks prevent constraint violations
**Research needed:** No — established soft-delete pattern

### Phase 3: Health Dashboard Redesign
**Rationale:** Executive visibility is high-value, low-risk. Uses existing data (tasks, milestones, risks) and existing Recharts library. Independent of other features.
**Delivers:** Auto-derived metrics (overdue tasks, at-risk milestones, stale updates), portfolio-level rollup, drill-down transparency
**Addresses:** HLTH-01 (Health Dashboard redesign), HLTH-02 (auto-derived metrics)
**Uses:** Recharts ^3.8.1 (already installed) — no new dependencies
**Avoids:** Anti-feature: manual metric overrides (defeats auto-derivation purpose)
**Research needed:** No — metric derivation from existing data model

### Phase 4: Data Completeness Analysis
**Rationale:** Data quality validation complements Health Dashboard. On-demand analysis is sufficient (scheduled analysis deferred to v8.0).
**Delivers:** Per-field completeness scoring (0-100%), missing/sparse/conflicting detection, modal with per-tab gaps and recommendations
**Addresses:** INGEST-04 (Analyze Completeness fix), INGEST-05 (structured output migration)
**Implements:** Completeness analysis component from ARCHITECTURE.md
**Avoids:** Pitfall #6 (Definition Drift) — versioned schemas prevent retroactive scoring changes
**Research needed:** MEDIUM — Claude structured outputs pattern for completeness scoring may need validation

### Phase 5: Ingestion Corrections Workflow
**Rationale:** Depends on data quality visibility from Phase 4. High UX complexity (21 entity types in single form) but high user value.
**Delivers:** Editable ExtractionPreview modal, merge edited values with extracted values, client-side validation
**Addresses:** INGEST-01 (edit before approve), INGEST-02 (move items), INGEST-03 (note reclassification)
**Uses:** Existing ExtractionPreview UI state management
**Avoids:** Forced re-extraction on misclassification (slow iteration)
**Research needed:** HIGH — Complex form design for 21 entity types needs UX research

### Phase 6: Skills Design Standard
**Rationale:** Foundation for editable prompts (Phase 7). Runtime validation prevents broken skills. Medium complexity, high operational value.
**Delivers:** SKILL.md YAML front-matter schema (input, output, schedule), runtime validation, UI with "Fix required" badges, grey out non-compliant
**Addresses:** SKILL-01 (Design Standard definition), SKILL-02 (audit all skills), SKILL-04 (scheduling interface)
**Uses:** Markdown parser + YAML validation
**Avoids:** Opaque prompts causing frustration when output wrong
**Research needed:** No — YAML schema definition for skill metadata

### Phase 7: Editable Prompts UI
**Rationale:** Depends on Design Standard (Phase 6) for validation. High complexity due to filesystem writes, concurrency, Cowork compatibility.
**Delivers:** CodeMirror editor UI, write-back to SKILL.md, file locking, backup creation, audit log, admin-only RBAC
**Addresses:** SKILL-03 (editable prompts)
**Uses:** @uiw/react-codemirror ^4.25.9 (new dependency)
**Avoids:** Pitfall #4 (Security Holes) — file locking + validation + backup prevent corruption/injection; Pitfall #8 (Cowork Break) — fork-on-edit strategy
**Research needed:** HIGH — File locking patterns, concurrent edit handling, Cowork compatibility strategy

### Phase 8: Project-Scoped Scheduling
**Rationale:** Requires RBAC from Phase 1 for admin-only controls. Medium complexity due to Redis indexing and metadata validation.
**Delivers:** Redis Set index (projects:{projectId}:jobs), scheduler page per-project filtering, admin role enforcement, BullMQ metadata validation
**Addresses:** SCHED-01 (project-scoped scheduling), SCHED-03 (UI), SCHED-04 (RBAC enforcement), SCHED-05 (metadata)
**Uses:** BullMQ ^5.71.0 + Redis indexing pattern from STACK.md
**Avoids:** Pitfall #5 (Filter Brittleness) — Redis index prevents O(N) in-memory filtering
**Research needed:** No — BullMQ job metadata pattern established in v2.0 Phase 24

### Phase 9: Gantt Bi-Directional Sync
**Rationale:** Complex transaction logic, deferred to later phase. Requires load testing with 50+ tasks. Independent of governance features.
**Delivers:** Drag-to-reschedule updates DB with cascade propagation, advisory lock for concurrency, optimistic UI updates with rollback
**Addresses:** DLVRY-02 (bi-directional sync), DLVRY-04 (date propagation)
**Uses:** PostgreSQL advisory locks (pg_advisory_xact_lock) from STACK.md
**Avoids:** Pitfall #3 (Race Conditions) — transaction-based atomic updates, debounced drag events
**Research needed:** MEDIUM — Advisory lock patterns for cascade updates, load testing strategy

### Phase 10: Overview Tracks Redesign
**Rationale:** UX-heavy, independent feature. Deferred to end after core governance complete. Medium complexity.
**Delivers:** Static tracks (fixed config cards), dynamic tracks (integration data), hybrid manual + live system state
**Addresses:** OVRVW-01 through OVRVW-05 (Overview redesign)
**Uses:** Existing workstreams table from v4.0
**Avoids:** None (low-risk UX enhancement)
**Research needed:** No — standard dashboard pattern

### Phase Ordering Rationale

- **RBAC first (Phase 1):** Dependency blocker for archive, delete, scheduling, prompt editing; highest security risk if incomplete
- **Lifecycle second (Phase 2):** Natural next step after ownership model established; standard patterns minimize risk
- **Executive visibility (Phases 3-4):** High value, low risk, independent features; can parallelize Health Dashboard + Completeness
- **Corrections workflow (Phase 5):** Depends on completeness visibility; high UX complexity justifies later placement
- **Skills maturity (Phases 6-7):** Design Standard foundation required before editable prompts; prompt editing high complexity deferred until governance solid
- **Operational features (Phases 8-10):** Scheduling, Gantt sync, Overview tracks are enhancements, not foundations; can ship incrementally

**Dependencies enforced:**
- Phase 7 (Editable Prompts) blocked by Phase 6 (Design Standard) — validation required before editing
- Phase 8 (Scheduling) blocked by Phase 1 (RBAC) — admin role enforcement required
- Phase 2 (Archive/Delete) blocked by Phase 1 (RBAC) — admin-only actions need role model

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Ingestion Corrections):** HIGH complexity — 21 entity types in single editable form; may need UX research for form design patterns
- **Phase 7 (Editable Prompts):** HIGH complexity — filesystem concurrency patterns, Cowork compatibility strategy (fork-on-edit vs DB storage); needs file locking implementation research
- **Phase 9 (Gantt Sync):** MEDIUM complexity — PostgreSQL advisory lock patterns for cascade updates; load testing strategy for 50+ tasks

Phases with standard patterns (skip research-phase):
- **Phase 1 (RBAC):** Well-documented two-tier pattern; better-auth session + custom project_members table
- **Phase 2 (Archive/Restore):** Standard soft-delete with timestamp columns; established PostgreSQL pattern
- **Phase 3 (Health Dashboard):** Metric derivation from existing data model; Recharts already validated
- **Phase 4 (Completeness):** Per-field scoring pattern; Claude structured outputs for analysis
- **Phase 6 (Design Standard):** YAML schema definition; runtime validation with markdown parser
- **Phase 8 (Scheduling):** BullMQ metadata pattern established in v2.0 Phase 24; Redis indexing standard
- **Phase 10 (Overview Tracks):** Standard dashboard pattern with static/dynamic data sources

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Minimal new dependencies; existing stack handles all features; only @uiw/react-codemirror needed; version compatibility verified |
| Features | MEDIUM | Based on training data + codebase analysis (web research denied); two-tier RBAC and soft-delete patterns well-established; editable prompts UX varies across tools |
| Architecture | HIGH | Clear integration points with existing Next.js 16 patterns; requireSession() security boundary preserved; transaction-based concurrency control standard |
| Pitfalls | HIGH | Based on 57-phase evolution analysis + complex relational DB patterns; RBAC migration risk highest; soft-delete cascade well-documented |

**Overall confidence:** HIGH

### Gaps to Address

**Editable prompts Cowork compatibility:** SKILL.md filesystem writes break "prompts must not be modified" constraint (PROJECT.md line 144). v7.0 explicitly relaxes this for editable UI. Decision needed: fork-on-edit (SKILL.md.custom) OR accept compatibility break with Cowork skills repo. Recommendation: fork-on-edit with versioned skill registry and rollback-to-canonical button preserves both editability and Cowork compatibility.

**Completeness scoring schema versioning:** No explicit versioning mechanism researched. With 57+ phases of schema evolution, definition of "complete" is ambiguous. Recommendation: store rules as versioned JSON configs (completeness_schema_v1.json), projects reference schema version at creation, grandfather existing projects on schema upgrades.

**Gantt sync load testing threshold:** Research identifies 50+ tasks as load test target but doesn't specify failure modes. During Phase 9 planning: define acceptable latency (<100ms drag feedback), cascade propagation limit (max 3 levels), concurrent edit handling (version-based optimistic locking).

**BullMQ job backward compatibility:** Jobs created pre-v7.0 may lack project_id metadata. During Phase 8 planning: create migration script to backfill metadata from job name patterns or related DB records; add schema validation to reject future jobs without metadata.

## Sources

### Primary (HIGH confidence)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/PROJECT.md` — v7.0 requirements, system constraints, 57-phase evolution context
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/db/schema.ts` — existing tables (projects, users, scheduled_jobs), FK constraints, enum definitions
- `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/research/STACK.md` — technology additions research (HIGH confidence)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/research/ARCHITECTURE.md` — integration patterns research (HIGH confidence)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/research/PITFALLS.md` — risk analysis based on system architecture (HIGH confidence)
- better-auth@1.5.6 documentation (WebFetch) — global role limitations confirmed; no per-resource roles
- @uiw/react-codemirror npm (WebFetch) — version 4.25.9, 1.8M weekly downloads, React 18+ support verified

### Secondary (MEDIUM confidence)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/research/FEATURES.md` — based on training data + codebase analysis (web research denied)
- Training data knowledge (January 2025 cutoff) — RBAC patterns (Auth0, AWS IAM), project management tools (Jira, Asana, Linear), soft-delete patterns (GitHub)
- Drizzle ORM soft-delete patterns — community best practice, timestamp filtering standard
- PostgreSQL advisory locks — official docs, pg_advisory_xact_lock for application-level locking
- BullMQ job metadata patterns — v2.0 Phase 24 implementation with project_id in job data

### Tertiary (LOW confidence)
- AI prompt editing UX patterns — limited training data; LangChain/LangSmith approaches vary; editable prompts in web UI non-standard
- Completeness scoring specific UX — data quality tools (dbt, Great Expectations) use different UI paradigms; per-field scoring vs aggregate metrics trade-offs

---
*Research completed: 2026-04-13*
*Ready for roadmap: yes*
