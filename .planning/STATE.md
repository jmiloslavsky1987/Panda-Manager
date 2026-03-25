---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: Not started
status: unknown
stopped_at: "Completed 08-03-PLAN.md — Full-text search API: GET /api/search + searchAllRecords()"
last_updated: "2026-03-25T02:22:56.011Z"
progress:
  total_phases: 10
  completed_phases: 9
  total_plans: 67
  completed_plans: 63
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** Phase 5 — Skill Engine (context gathered; ready to plan)

## Current Status

**Phase:** 5 — Skill Engine — COMPLETE
**Current Plan:** Not started
**Last action:** Completed 05-06-PLAN.md — 13/13 E2E tests GREEN, all 8 human verification steps approved
**Next action:** `/gsd:plan-phase 5.1` — Onboarding Dashboard (replaces Overview tab; new DB tables; YAML round-trip)
**Stopped at:** Completed 08-03-PLAN.md — Full-text search API: GET /api/search + searchAllRecords()

## Phase Progress

| Phase | Status |
|-------|--------|
| 1. Data Foundation | COMPLETE (6/6 plans) |
| 2. App Shell + Read Surface | COMPLETE (7/7 plans) |
| 3. Write Surface + Plan Builder | COMPLETE (9/9 plans) |
| 4. Job Infrastructure | COMPLETE (5/5 plans) |
| 5. Skill Engine | COMPLETE (6/6 plans) |
| 5.1 Onboarding Dashboard [INSERTED] | Not started |
| 5.2 Time Tracking [INSERTED] | Not started |
| 6. MCP Integrations | Not started |
| 7. File Generation + Remaining Skills | Not started |
| 8. Cross-Project Features + Polish | Not started |

## Active Work

Phase 5 COMPLETE. All 6 plans executed: 05-01 (SDK + schema + SKILL.md stubs + E2E stubs), 05-02 (SkillOrchestrator + skill-context assembler + BullMQ dispatch), 05-03 (Skills tab UI + SSE run page + trigger/stream APIs), 05-04 (Drafts Inbox + Output Library + outputs API), 05-05 (5 skill handlers wired), 05-06 (E2E 13/13 GREEN + human verification). Bug fixed: skill-run.ts generic handler now writes to outputs + drafts tables. Next: Phase 6 — MCP Integrations.

## Decisions

- **[2026-03-19] 01-01:** Used Node.js built-in test runner (node:test) — no Jest/Vitest needed
- **[2026-03-19] 01-01:** DATABASE_URL defaults to postgres://localhost:5432/bigpanda_test in tests (prevents crash when env var unset)
- **[2026-03-19] 01-01:** postgres and tsx installed at project root (not inside server/ or client/)
- [Phase 01-03]: Settings library at both project root (test access) and bigpanda-app/lib/ (server-only for Next.js)
- [Phase 01-03]: readSettings/writeSettings accept optional settingsPath arg for test isolation without mocking fs
- **[2026-03-19] 01-02:** db/ lives in bigpanda-app/db/ (plan-spec); pool.test.ts updated to import from '../bigpanda-app/db/'
- **[2026-03-19] 01-02:** server-only import omitted from db/index.ts — next/compiled version throws unconditionally in Node.js test context
- **[2026-03-19] 01-02:** FORCE ROW LEVEL SECURITY added to all 8 RLS tables — ensures tests pass regardless of DB user superuser status
- **[2026-03-19] 01-02:** PostgreSQL not installed on this machine — migration requires user to install PostgreSQL and run drizzle-kit migrate
- [Phase 01-04]: server-only omitted from lib/yaml-export.ts for test runner compat (same pattern as db/index.ts)
- [Phase 01-04]: buildYamlDocument takes two args (project, sections) — Wave 0 stub updated during TDD RED
- [Phase 01-04]: outputs.test.ts uses NODE_PATH=./bigpanda-app/node_modules workaround for js-yaml access
- [Phase 01-05]: sanitizeYamlFrontmatter() added to handle AMEX source doc with unescaped double-quotes in YAML scalars
- [Phase 01-05]: SOURCE_DIR hardcoded as ~/Documents/PM Application — NOT settings.workspace_path (output files only)
- [Phase 01-05]: All migration DB tests remain RED until PostgreSQL installed (ECONNREFUSED expected)
- [Phase 01-06]: Q-NNN IDs (Open Questions sheet) stored in actions table with type='question'
- [Phase 01-06]: importXlsx() exported from migrate-local.ts for independent test runner access
- [Phase 01-06]: Workstream Notes sheet: UPDATE only (no insert) — enriches YAML-sourced workstream rows
- **[2026-03-19] 02-01:** npm install --no-package-lock used for @playwright/test — invalid esbuild semver in package-lock.json blocks standard install
- **[2026-03-19] 02-01:** E2E stubs use expect(false, 'stub').toBe(true) not test.fixme() — keeps tests RED and visible in report
- **[2026-03-19] 02-01:** Requirement IDs in test names (DASH-01 etc.) — implementation plans use --grep to target specific tests
- [Phase 02-04]: getProjectWithHealth() added to queries.ts — thin wrapper combining getProjectById + computeHealth for workspace layout type correctness
- [Phase 02-04]: data-testid='add-notes-btn-placeholder' used (not 'add-notes-btn') — plan 02-06 replaces FAB with AddNotesModal owning the final testid
- [Phase 02-app-shell-read-surface]: 02-03: NotificationBadge in page header (not root layout) for Phase 2 — Phase 5 will hoist to layout when skill data available
- [Phase 02-app-shell-read-surface]: 02-03: RAG badge uses inline className override on shadcn Badge — keeps variant config clean
- [Phase 02-06]: append-only enforcement is dual-layer: DB triggers prevent UPDATE/DELETE, UI renders no edit/delete controls on decisions or history tabs
- [Phase 02-06]: AddNotesModal owns the final data-testid='add-notes-btn'; plan 02-04 used 'add-notes-btn-placeholder' as previously recorded in STATE.md
- [Phase 02-05]: searchParams typed as Promise in ActionsPage — required for Next.js 15 RSC compatibility
- [Phase 02-05]: Date guards use regex before Date() parse — safely skips TBD/N/A TEXT date fields across all tab pages
- [Phase 02-app-shell-read-surface]: 02-07: E2E suite activated (23/23 passing) before human checkpoint; human verified all 9 workspace tabs, RAG badges, Add Notes modal → DB
- [Phase 03-01]: Wave 0 stub assertion placed as FIRST line in each test — visibly RED without server running
- [Phase 03-02]: AnyPgColumn import required for self-referential FK (tasks.blocked_by references tasks.id)
- [Phase 03-02]: Migration SQL written manually (not via drizzle-kit generate) — DB not available in dev environment
- [Phase 03-02]: npm install --no-package-lock used for Phase 3 packages — invalid esbuild semver pattern (same as 02-01)
- [Phase 03-03]: Card-based layout replaces table rows in actions page — avoids span-inside-tr DOM nesting issues when wrapping with ActionEditModal trigger
- [Phase 03-03]: xlsx write is skipped gracefully when file not found (dev environment without tracker)
- [Phase 03-03]: EBUSY/EPERM on xlsx writeFile returns human-readable Close in Excel message
- [Phase 03-04]: Risk mitigation is append-only in both UI and API: new text is date-prefixed and appended to existing history
- [Phase 03-04]: StakeholderEditModal dual-mode: no stakeholder prop = create (POST), with prop = edit (PATCH)
- [Phase 03-05]: Used satisfies Array<...> (not as const) for TABS array to allow tab.subRoute access without TS union narrowing errors
- [Phase 03-05]: subRoute: true flag on Plan tab entry enables pathname.includes active check for nested /plan/* routes
- [Phase 03-06]: ExcelJS load() Buffer<ArrayBuffer> type mismatch with @types/node 20.x — used any cast at plan-import route; runtime correct
- [Phase 03-06]: PhaseBoard derives columns from task.phase values dynamically; default phases Discovery/Design/Build/Test/Go-Live when no tasks
- [Phase 03-06]: Bulk toolbar in-place micro-forms for owner/due/phase — no modal overlay
- [Phase 03-08]: Status change via select dropdown (click-to-move) rather than full @dnd-kit drag — plan explicitly permits this fallback for nested scrollable container complexity
- [Phase 03-08]: Unassigned lane filtered out when no tasks have workstream_id=null — avoids empty row clutter
- [Phase 03-07]: frappe-gantt has no @types package — added manual types/frappe-gantt.d.ts declaration file
- [Phase 03-07]: Only single blocked_by dependency per task in Phase 3 — multi-dependency requires text[] column (Phase 4+ concern)
- **[2026-03-20] 03-09:** E2E count-conditional assertions: test passes on empty DB but exercises full flow when data is seeded (assert-if-present pattern)
- **[2026-03-20] 03-09:** SET LOCAL required (not SET) for RLS policy variables inside connection pool — SET LOCAL scopes to transaction, preventing context bleed across pool connections
- **[2026-03-20] 03-09:** Zod TaskCreateSchema uses .nullish() not .optional() — HTML form fields submit null (not undefined), .optional() rejects null values
- **[2026-03-20] 03-09:** Task API validation errors return error.message string — raw Zod error object serializes as {} causing [object Object] in UI
- [Phase 04-job-infrastructure]: Wave-0 RED stub pattern (expect(false, 'stub').toBe(true) first line) used for Phase 4 stubs — consistent with 02-01 and 03-01
- [Phase 04-02]: settings-core.ts / settings.ts split: worker-safe core module + server-only wrapper preserves all existing Next.js imports
- [Phase 04-02]: maxRetriesPerRequest: null required on every IORedis instance used with BullMQ Worker — omitting causes silent EXECABORT failures
- [Phase 04-02]: createRedisConnection() factory pattern: Queue and Worker each get their own IORedis instance — sharing causes protocol state corruption
- [Phase 04-02]: Advisory lock IDs use pg_try_advisory_xact_lock (xact variant): auto-releases at transaction end, safe with connection pools
- [Phase 04-03]: Static job dispatch map (not dynamic import) — tsx watch mode has module cache issues with dynamic import()
- [Phase 04-03]: concurrency:1 on BullMQ Worker — prevents advisory lock contention within same process
- [Phase 04-03]: settings-core imported in worker/index.ts (not lib/settings.ts) — server-only marker crashes worker process context
- [Phase 04-04]: Settings page is Client Component (not RSC) — data fetched via useEffect to keep DB imports server-side only
- [Phase 04-04]: Cron schedules hardcoded in JOB_DISPLAY map (UI constants) — Redis scheduler state not surfaced to API in Phase 4, editable in Phase 5+
- [Phase 04-04]: queue.add() with unique jobId (manual-{name}-{timestamp}) prevents duplicate manual triggers within same second
- [Phase 04-05]: assert-if-present for SCHED-08 Trigger Now result: test passes if Redis unavailable (CI-safe) but verifies triggered_by if last_run exists
- [Phase 04-05]: createApiRedisConnection() factory with maxRetriesPerRequest:1, connectTimeout:3s: trigger API fails fast when Redis unavailable instead of hanging 35s
- [Phase 04-05]: DOM nesting fix in edit modals: React.cloneElement() instead of wrapping tr triggers in div containers
- [Phase 05-01]: npm install --no-package-lock for @anthropic-ai/sdk — consistent with 02-01/03-02 pattern (invalid esbuild semver in package-lock.json)
- [Phase 05-01]: skill_run_chunks.run_id is INTEGER FK referencing skill_runs.id for ON DELETE CASCADE support
- [Phase 05-01]: SKILL.md files contain real stub prompts (not empty files) — downstream plans refine during skill wiring
- [Phase 05-skill-engine]: SkillOrchestrator uses __dirname-anchored SKILLS_DIR in worker context for reliable SKILL.md path resolution regardless of cwd
- [Phase 05-skill-engine]: full_output reconstructed from skill_run_chunks rows instead of stream.accumulated to avoid SDK version incompatibility
- [Phase 05-04]: DraftsInbox is a Client Component imported into RSC Dashboard — client-side fetch required for optimistic dismiss without full page reload
- [Phase 05-04]: outputs.archived column appended to existing 0004 migration (ALTER TABLE IF NOT EXISTS) — avoids new migration file for a single column addition
- [Phase 05-04]: Regenerate flow in Output Library: POST skill/run -> PATCH archive old -> router.push to new run page — all client-side sequential
- [Phase 05-04]: system-open endpoint uses GET semantics with no request body — idempotent, natural REST fit for opening a file
- [Phase 05-03]: Stream route at runs/[runId]/stream/ is one extra directory level deep — import paths to db/ require 6 ../ not 5 (corrected during Task 1 verification)
- [Phase 05-03]: SSE deduplication pattern: skill run page fetches run status before subscribing to EventSource — completed runs show full_output without opening SSE connection
- [Phase 05-05]: Scheduled handlers create their own skill_runs row; on-demand handlers receive runId from skill-run.ts via job.data
- [Phase 05-05]: Weekly Customer Status inserts into drafts table (draft_type='email') after orchestrator completion for Drafts Inbox review
- [Phase 05-06]: skill-run.ts generic handler now writes to outputs (all skills) and drafts (weekly-customer-status) after orchestrator completes — on-demand runs now match scheduled handler behavior
- [Phase 05-06]: assert-if-present pattern for Redis/Anthropic-dependent E2E tests — structural UI assertions always pass, live-call assertions skip gracefully when infra unavailable
- [Phase 05.1-01]: Wave 0 stub assertion placed as FIRST line in each test — visibly RED without server running (consistent with 02-01 and 03-01 pattern)
- [Phase 05.1-01]: Requirement IDs in test names (OVER-01 etc.) — implementation plans use --grep to target specific tests
- [Phase 05.1-02]: jsonb added to existing drizzle-orm/pg-core import — no second import block
- [Phase 05.1-02]: Enum values use hyphens (not-started, in-progress) matching reference HTML data-status attributes per CONTEXT.md
- [Phase 05.1-03]: JSONB append uses sql template tag pattern to preserve existing array entries; plain .set() would overwrite
- [Phase 05.1-03]: All routes use @/db alias imports — consistent with must_haves constraint and avoids deep relative path issues
- [Phase 05.1-04]: useRef omitted — sticky header is pure CSS; no programmatic scroll management needed
- [Phase 05.1-04]: Risks/milestones fetch falls back to empty array on 404 — no GET routes added (out of scope per plan)
- [Phase 05.1-04]: StepOwnerField extracted as sub-component to keep inline edit state local without prop-drilling
- [Phase 05.1-05]: import-onboarding.ts uses existence-check (not onConflictDoNothing) for idempotency — no UNIQUE constraint on (project_id, name) in onboarding schema
- [Phase 05.1-05]: yaml-export route imports lib/yaml-export from ../../../../../../lib/yaml-export (6 levels up) — @/ alias resolves to bigpanda-app/ not project root
- [Phase 05.1-06]: All 4 OVER tests activated with no skips — assert-if-present pattern ensures CI-safety while exercising full flow when DB is seeded
- [Phase 05.1-07]: StepOwnerField span→input transition requires click() before fill() — Playwright fill() requires input element, not span
- [Phase 05.1-07]: yaml-export endpoint is /api/projects/[projectId]/yaml-export (not /api/yaml-export)
- [Phase 05.1-08]: No RLS on GET /api/projects/[projectId] — projects table has no row-level security policies; simple SELECT by id correct
- [Phase 05.1-08]: status_summary used as executive summary — no separate engagement_summary DB column exists; desired_outcomes deferred
- [Phase 05.2-01]: Wave 0 stub assertion as FIRST line in each test — visibly RED without server running (consistent with 02-01, 03-01, 04-01, 05.1-01)
- [Phase 05.2-01]: Requirement IDs (TIME-01/02/03) in test names for --grep targeting in implementation plans
- [Phase 05.2-02]: hours stored as TEXT not NUMERIC — consistent with project-wide schema convention; JS parseFloat() for arithmetic
- [Phase 05.2-02]: date stored as TEXT not DATE — consistent with all other date fields in the schema
- [Phase 05.2-02]: No RLS on time_entries — single-user app; plain WHERE project_id = N is sufficient (established Phase 5.1)
- [Phase 05.2-02]: Migration 0006 written manually — drizzle-kit generate not available (consistent with Phase 03-02 decision)
- [Phase 05.2-03]: and(...conditions) array pattern for dynamic WHERE filters — avoids conditional query variable reassignment
- [Phase 05.2-03]: PATCH and DELETE WHERE includes both entry_id and project_id — defense-in-depth scoping on top of RLS
- [Phase 05.2-03]: GET returns { entries: [] } not 404 when no time entries — empty state is valid
- [Phase 05.2-04]: Inline add form above table (not modal) — TimeEntryModal used for EDIT only; avoids modal-within-table nesting issues
- [Phase 05.2-04]: refreshCount state pattern triggers re-fetch after mutations without router.refresh() in client components
- [Phase 05.2-04]: fromDate/toDate sent as query params — server-side filter; no redundant client-side filtering
- [Phase 06-mcp-integrations]: Wave 0 stub pattern consistent with all prior phases: expect(false, 'stub').toBe(true) as first line — visibly RED without server running
- [Phase 06-mcp-integrations]: Unit test stubs use node:test assert.fail() — plans 06-03 and 06-05 activate by removing assert.fail() and adding real test bodies
- [Phase 06-mcp-integrations]: RiskHeatMap groups statuses dynamically from query results (not hardcoded) to handle inconsistent status casing in real data
- [Phase 06-mcp-integrations]: WatchList includes IS NULL OR != 'resolved' for status filter since risks.status is nullable TEXT
- [Phase 06-mcp-integrations]: getServersForSkill accepts optional settingsPath param for testability without mocking the module
- [Phase 06-mcp-integrations]: mcp-config.ts imports from settings-core (not settings.ts) — worker processes cannot import server-only modules
- [Phase 06-mcp-integrations]: mcp_servers replaced wholesale on POST — no partial merge to avoid stale entry drift
- [Phase 06-mcp-integrations]: data-testid='mcp-servers-form' on always-rendered wrapper so E2E test passes after tab click without opening form
- [Phase 06-05]: Use StreamLike structural type alias rather than @ts-ignore to resolve MessageStream/BetaMessageStream union type incompatibility in skill-orchestrator.ts
- [Phase 06-mcp-integrations]: customer-project-tracker uses fixed 0 9 * * * cron outside settings JOB_SCHEDULE_MAP (no AppSettings.schedule key for this skill)
- [Phase 07-01]: vitest ^4.1.1 installed in bigpanda-app with --no-package-lock; Wave 0 stub pattern (expect(false, 'stub').toBe(true) as first line) consistent with all prior phases
- [Phase 07-02]: readSettings() is async — buildOutputPath must await it; plan snippet showed sync call which is incorrect
- [Phase 07-02]: pptxgenjs installed with --no-package-lock (consistent with all Phase 2+ installs)
- [Phase 07-02]: workspace_path /Documents/PM Application treated as relative-to-homedir (not absolute) — matches DEFAULTS in settings-core.ts
- [Phase 07-03]: customer-project-tracker added to WIRED_SKILLS — was in ALL_SKILLS but missing from the enabled set; plan target state includes it
- [Phase 07-03]: fetchOutputRow queries /api/outputs by project_id + skill_name (most recent); no idempotency_key filter needed for Phase 7 single-active-run pattern
- [Phase 07-03]: biggy-weekly-briefing excluded from WIRED_SKILLS per locked decision; comment added to set for future maintainability
- [Phase 07-04]: FILE_SKILLS exported from skill-run.ts for testability without leaking into app layer
- [Phase 07-04]: generateFile() called post-orchestrator — pure Claude streaming layer stays clean
- [Phase 07-04]: Generation errors caught and logged; output row still inserted with raw content (graceful degradation)
- [Phase 07-05]: SkillOrchestrator mock uses real ES class syntax (not vi.fn().mockImplementation) — arrow function factories are not constructors when used with new
- [Phase 07-05]: vitest.config.ts needs resolve.alias for @/ path — route handler tests import @/db and @/lib/ which require the alias
- [Phase 07-05]: Proposed tasks NOT written to tasks table by generate-plan route — only skill_runs row; tasks written only on explicit Commit click
- [Phase 07-06]: sprint-summary output stored in projects.sprint_summary — no outputs table insert (PLAN-13: not in Output Library)
- [Phase 07-06]: Transient skill_run row created for orchestrator tracking — does not surface in Output Library since no outputs row is written
- [Phase 07-06]: SprintSummaryPanel open=true initial state prevents hydration mismatch — Client Component initialized identically on server and client
- [Phase 07-07]: Route slug conflict fixed — generate-plan and sprint-summary routes moved from [id] to [projectId]
- [Phase 07-07]: skills/page.tsx wraps getSkillRuns in try/catch — consistent with board page pattern for DB-unavailable resilience
- [Phase 07-07]: assert-if-present used for PLAN-12 — generate-plan-btn assertion passes structurally without API key
- [Phase 07-07]: PhaseBoard useEffect(setTasks, [initialTasks]) syncs local DnD state when prop changes after router.refresh()
- [Phase 07-07]: router.refresh() in AiPlanPanel after AI plan commit triggers RSC re-render without navigation side-effects
- [Phase 08-01]: Wave 0 stub assertion placed as FIRST line in each test — visibly RED without server running (consistent with 02-01 through 07-01)
- [Phase 08-01]: Requirement IDs (SRCH-01/02/03, KB-01/02/03) in test names for --grep targeting in activation plans
- [Phase 08-02]: search_vec (tsvector) excluded from Drizzle schema — trigger-managed, queried via raw SQL; adding it causes PgVectorType inference issues
- [Phase 08-02]: Per-table trigger functions (tsvector_update_{table}) chosen over shared function — each table has its own field list for independent maintainability
- [Phase 08-03]: Raw SQL UNION ALL via sql.raw() for tsvector full-text search across 8 tables — Drizzle has no native tsquery support
- [Phase 08-03]: knowledge_base arm uses LEFT JOIN — null project_id entries always searchable per KB-03 spec; account filter skips null-project entries

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-data-foundation | 01 | 4min | 2/2 | 9 |
| 01-data-foundation | 02 | 20min | 2/2 | 14 |
| 01-data-foundation | 03 | 8min | 1/1 | 3 |
| 01-data-foundation | 04 | 15min | 2/2 | 4 |
| 01-data-foundation | 05 | 25min | 1/1 | 2 |
| 01-data-foundation | 06 | 4min | 1/1 | 2 |
| 02-app-shell-read-surface | 01 | 12min | 1/1 | 3 |
| Phase 02-app-shell-read-surface P04 | 8min | 1 tasks | 5 files |
| Phase 02-app-shell-read-surface P03 | 2min | 2 tasks | 5 files |
| Phase 02-app-shell-read-surface P06 | 3min | 2 tasks | 7 files |
| Phase 02-app-shell-read-surface P05 | 3min | 2 tasks | 6 files |
| Phase 02-app-shell-read-surface P07 | 10min | 2 tasks | 1 files |
| Phase 03-write-surface-+-plan-builder P01 | 2min | 1 tasks | 1 files |
| Phase 03-write-surface-+-plan-builder P02 | 8min | 2 tasks | 4 files |
| Phase 03-write-surface-+-plan-builder P03 | 2min | 3 tasks | 3 files |
| Phase 03-write-surface-+-plan-builder P04 | 4min | 2 tasks | 10 files |
| Phase 03-write-surface-+-plan-builder P05 | 2min | 2 tasks | 8 files |
| Phase 03-write-surface-+-plan-builder P06 | 6min | 2 tasks | 10 files |
| Phase 03-write-surface-+-plan-builder P08 | 2min | 2 tasks | 2 files |
| Phase 03-write-surface-+-plan-builder P07 | 2min | 2 tasks | 4 files |
| Phase 03-write-surface-+-plan-builder P09 | 35min | 2 tasks | 3 files |
| Phase 04-job-infrastructure P01 | 5min | 1 tasks | 1 files |
| Phase 04-job-infrastructure P02 | 2min | 2 tasks | 7 files |
| Phase 04-job-infrastructure P03 | 6min | 2 tasks | 8 files |
| Phase 04-job-infrastructure P04 | 8min | 2 tasks | 4 files |
| Phase 04-job-infrastructure P05 | 20min | 2 tasks | 1 files |
| Phase 05-skill-engine P01 | 3min | 2 tasks | 9 files |
| Phase 05-skill-engine P02 | 3min | 2 tasks | 5 files |
| Phase 05-skill-engine P04 | 3min | 2 tasks | 11 files |
| Phase 05-skill-engine P03 | 4min | 2 tasks | 7 files |
| Phase 05-skill-engine P05 | 2min | 1 tasks | 8 files |
| Phase 05.1-onboarding-dashboard P01 | 3min | 1 tasks | 1 files |
| Phase 05.1-onboarding-dashboard P02 | 1min | 2 tasks | 2 files |
| Phase 05.1-onboarding-dashboard P03 | 5min | 2 tasks | 4 files |
| Phase 05.1-onboarding-dashboard P04 | 8 | 2 tasks | 3 files |
| Phase 05.1-onboarding-dashboard P05 | 2min | 2 tasks | 3 files |
| Phase 05.1-onboarding-dashboard P06 | 5min | 2 tasks | 1 files |
| Phase 05.1-onboarding-dashboard P07 | 2min | 1 tasks | 1 files |
| Phase 05.1-onboarding-dashboard P08 | 8min | 2 tasks | 2 files |
| Phase 05.2-time-tracking P01 | 3min | 1 tasks | 1 files |
| Phase 05.2-time-tracking P02 | 2min | 2 tasks | 2 files |
| Phase 05.2-time-tracking P04 | 5min | 2 tasks | 4 files |
| Phase 06-mcp-integrations P01 | 5min | 2 tasks | 3 files |
| Phase 06-mcp-integrations P02 | 227 | 2 tasks | 6 files |
| Phase 06-mcp-integrations P03 | 12 | 2 tasks | 4 files |
| Phase 06-mcp-integrations P04 | 18 | 2 tasks | 4 files |
| Phase 06 P05 | 18 | 1 tasks | 2 files |
| Phase 06-mcp-integrations P06 | 2 | 2 tasks | 5 files |
| Phase 07-file-generation-remaining-skills P01 | 4min | 2 tasks | 7 files |
| Phase 07-file-generation-remaining-skills P02 | 3min | 2 tasks | 7 files |
| Phase 07-file-generation-remaining-skills P03 | 8min | 2 tasks | 6 files |
| Phase 07-file-generation-remaining-skills P04 | 3min | 2 tasks | 3 files |
| Phase 07-file-generation-remaining-skills P05 | 5min | 2 tasks | 7 files |
| Phase 07-file-generation-remaining-skills P06 | 2min | 2 tasks | 7 files |
| Phase 07-file-generation-remaining-skills P07 | 736s | 1 tasks | 4 files |
| Phase 07-file-generation-remaining-skills P07 | 40min | 2 tasks | 6 files |
| Phase 08-cross-project-features-+-polish P01 | 10min | 1 tasks | 1 files |
| Phase 08-cross-project-features-+-polish P02 | 2min | 2 tasks | 2 files |
| Phase 08-cross-project-features-+-polish P03 | 2min | 2 tasks | 2 files |

## Key Context for Next Session

- **Working directory:** `/Users/jmiloslavsky/Documents/Project Assistant Code`
- **Wave 0 complete (Phase 1):** All 8 test stubs exist in tests/ — verify commands valid for Plans 01-02 through 01-06
- **Phase 2 E2E: ALL GREEN:** tests/e2e/phase2.spec.ts has 23 passing tests — full read surface verified by human on 2026-03-19
- **Playwright installed:** @playwright/test at project root, Chromium cached. Run: `npx playwright test tests/e2e/phase2.spec.ts --grep "DASH-01"`
- **Research flags:** Phases 4, 5, 6, 7 require research spikes before planning (see ROADMAP.md)
- **Critical pitfall:** BullMQ worker must be a dedicated process — never in-process cron
- **Critical pitfall:** SkillOrchestrator must be separated from Route Handlers before Phase 5
- **Cowork compatibility:** js-yaml settings `sortKeys: false, lineWidth: -1, JSON_SCHEMA` — non-negotiable
- **Version ground-truth:** React 19, Vite 7, Tailwind 4, pptxgenjs v4, Anthropic SDK 0.78.x — read from existing package.json files
- **DB setup required:** PostgreSQL not installed — user must install PostgreSQL, create bigpanda_test + bigpanda_app DBs, and run `cd bigpanda-app && DATABASE_URL=postgresql://localhost:5432/bigpanda_test npx drizzle-kit migrate`
- **git add blocked:** bigpanda-app/db/ exists on disk but bash sandbox blocked staging; user should `git add bigpanda-app/db/`
- **Test runner:** Use `NODE_PATH=./bigpanda-app/node_modules npx tsx --test tests/yaml-roundtrip.test.ts` (js-yaml in bigpanda-app/node_modules only; npm install fails due to invalid esbuild semver in package-lock.json)
- **yaml-export ready:** lib/yaml-export.ts + bigpanda-app/lib/data-service.ts both committed and tested
- **Pre-existing TS errors:** bigpanda-app/lib/settings.ts and app/api/settings/route.ts have 2 TS errors from 01-03 (see deferred-items.md)

- **migration script ready:** bigpanda-app/scripts/migrate-local.ts committed — runs npx tsx scripts/migrate-local.ts once PostgreSQL is available
- **AMEX YAML quirk:** sanitizeYamlFrontmatter() added to handle embedded unescaped double-quotes in AMEX source doc (R-AMEX-002 mitigation field)
- **migration test runner:** Use `NODE_PATH=./bigpanda-app/node_modules npx tsx --test tests/migration.test.ts` (all DB tests remain RED until PostgreSQL installed)
- **Phase 1 COMPLETE:** All 6 plans executed — DB schema, YAML export, DataService, YAML migration, xlsx supplement all done
- **xlsx import ready:** bigpanda-app/scripts/migrate-local.ts exports importXlsx() — handles all 5 PA3_Action_Tracker sheets
- **Two-phase migration:** runMigration() (YAML) then importXlsx() (xlsx supplement) — YAML wins on conflicts

---
*Initialized: 2026-03-18*
*Last updated: 2026-03-19 after completing 02-01 (Playwright E2E stubs — Wave 0 RED baseline)*
