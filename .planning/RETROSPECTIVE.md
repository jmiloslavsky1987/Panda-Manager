# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v3.0 — Collaboration & Intelligence

**Shipped:** 2026-04-01
**Phases:** 5 (26–30) | **Plans:** 26 | **Duration:** 3 days (2026-03-30 → 2026-04-01)
**Code delta:** +17,427 / -334 lines across 207 files

### What Was Built

- **Multi-user auth (Phase 26):** better-auth sessions, admin/user roles, route guards on 40+ handlers, email invite token flow, bcryptjs password hashing, Okta-ready schema
- **UI overhaul + templates (Phase 27):** Sub-tab navigation with hybrid URL pattern, SubTabBar component, TypeScript template registry enforcing fixed section structure per tab, new project seeding with placeholder content tagged source='template'
- **Interactive visuals (Phase 28):** React Flow org charts and workflow diagrams with Dagre auto-layout; dynamic import + ssr:false pattern for all @xyflow/react components
- **Project chat (Phase 29):** Vercel AI SDK streaming chat (useChat + streamText), live DB context injection (2000–4000 token snapshot), XML-wrapped context for prompt injection defense, temperature 0.3 for anti-hallucination
- **Context Hub (Phase 30):** Dedicated Context tab, document extraction routing to 3 new entity types (workstream, onboarding_step, integration), upload history, completeness analysis API with Claude structured outputs serializing 11 workspace tabs, per-tab gap descriptions with record IDs

### What Worked

- **Wave pattern discipline:** Each phase's Wave 0 RED stubs established clear contracts before implementation — prevented scope creep and made GREEN verification unambiguous
- **Decision logging in STATE.md:** Captured every architectural choice with rationale as we went; made resume-work seamless across sessions
- **SSE chunked progress display:** Users could see extraction progress ("chunk 1 of 4") which set expectations even when slow — better than a spinner with no feedback
- **TypeScript exhaustive tab registry:** The `satisfies Record` pattern for tab types caught missing cases at compile time rather than runtime
- **Phase 27 templates as foundation for Phase 30:** Placeholder rows tagged source='template' before Phase 30 existed — planning ahead paid off with zero-effort completeness filter

### What Was Inefficient

- **Large document extraction UX:** 350KB Word doc took 4–6 minutes, killed by browser refresh and Claude credit exhaustion mid-chunk — SSE tied to browser connection is wrong for large documents; BullMQ background job captured as v4.0 todo
- **13 accumulated test failures:** Pre-existing failures from Phases 18–24 were never fixed as they accumulated; carried as tech debt into v3.0; cleanup todo now captured
- **Verification with large test files:** Using a 350KB document for first-time Flow 2 verification added 20+ minutes of waiting; smaller test docs should be used for smoke tests, large docs for stress tests
- **PROJECT.md stale through milestones:** Key Decisions table was "— Pending" throughout v3.0; Out of Scope still listed multi-user auth as deferred after Phase 26 shipped it; needed catch-up at milestone close

### Patterns Established

- **`ssr:false` dynamic import for DOM-dependent packages:** @xyflow/react, any package using `window`/`document` APIs — must always use `dynamic(() => import(...), { ssr: false })`
- **`--legacy-peer-deps` for React 19 / Next.js 16 installs:** Required for better-auth, Vercel AI SDK, and likely any new packages until ecosystem catches up
- **`undefined + toBeDefined()` Wave 0 stub pattern:** Fails RED without brittle import errors on missing modules — established in Phase 26, used through Phase 30
- **XML-wrapped context in Claude prompts:** `<project_data>` tags delimiter for prompt injection defense in all AI features using user-controlled project data
- **`requireSession()` at Route Handler level:** Security boundary is at the handler, not middleware — CVE-2025-29927 defense-in-depth pattern now established across 40+ routes

### Key Lessons

1. **Browser-connection-dependent streaming fails for long operations** — any Claude call over ~30 seconds should use a background job with polling, not SSE tied to the browser tab
2. **Accumulate todos aggressively during verification** — the testing session surfaced 5 concrete improvements; capturing them immediately prevents them from being forgotten
3. **Tab template design benefits upstream phases** — Phase 27's source='template' tagging was decided knowing Phase 30 would need it; cross-phase planning in STATE.md decisions prevented rework
4. **Production build verification is non-negotiable** — dev mode hides SSR/hydration errors that only appear in `next build`; established as required step before every human checkpoint
5. **STATE.md decisions log compounds in value** — by Phase 30, the accumulated decisions from Phases 26–29 provided instant context on why specific patterns were used, preventing re-investigation

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~10 sessions across 3 days
- Notable: Wave 0 stubs + targeted per-phase test runs kept context windows clean; full suite only run at verification gates

---

## Milestone: v4.0 — Infrastructure & UX Foundations

**Shipped:** 2026-04-03
**Phases:** 5 (31–35) | **Plans:** 26 | **Duration:** 3 days (2026-04-01 → 2026-04-03)
**Code delta:** +25,843 / −2,793 lines across 150 files

### What Was Built

- **BullMQ extraction migration (Phase 31):** SSE→polling architecture, extraction_jobs table, browser-refresh resilience, progress display — 11 UAT bugs found and fixed
- **Global time tracking (Phase 32):** Standalone /time-tracking route with cross-project view, project attribution, week grouping; per-project Time tab removed
- **Overview workstream structure (Phase 33):** ADR/Biggy dual-track DB migration, auto-seeding phases on project create, completeness indicator removed
- **Metrics & health dashboard (Phase 34):** Recharts ProgressRing + PieChart, OverviewMetrics, HealthDashboard with rule-based health formula, MilestoneTimeline; user preferred original dot-on-spine timeline (UAT reversion)
- **Weekly Focus & integration tracker (Phase 35):** AI-generated bullets via BullMQ + Redis 7-day cache, side-by-side ADR/Biggy integration columns, two UAT layout bugs fixed (Generate Now feedback + badge overlap)

### What Worked

- **Wave-based execution maturity:** The 3-wave pattern with parallel subagents ran without agent tool errors this milestone; descriptions parameter issue resolved early
- **Infrastructure-first sequencing:** Phases 31–32 (infrastructure/UX migrations) completed before the Overview overhaul meant no rework — clean foundation for Phases 33–35
- **UAT driving real UX decisions:** Phase 34 timeline reversion (dot-on-spine vs horizontal) and Phase 35 two-column layout were both UAT-driven improvements that wouldn't have been caught by automated tests
- **Advisory lock pattern for AI jobs:** weekly-focus BullMQ job advisory lock + Redis cache pattern is reusable for any per-project AI job needing deduplication

### What Was Inefficient

- **Phase 36 accumulation:** The test failures from v3.0 (13) were never addressed and still linger (6 after partial cleanup) — deferring this milestone-to-milestone compounds the debt
- **Integration tracker empty-state confusion:** All integrations had `track=null` on first load so ADR/Biggy sections appeared invisible — the layout was technically correct but visually confusing; would have been caught earlier with a seed data fixture
- **Redis-not-running discovery late:** UAT hit a wall because `npm run next-only` was running (no Redis) — weekly-focus POST silently failed; should make Redis check a startup assertion

### Patterns Established

- **Side-by-side dual-track layout:** ADR (blue left border) / Biggy (orange right border) two-column grid with always-visible empty states — reuse for any future workstream comparison view
- **BullMQ + Redis cache for periodic AI jobs:** advisory lock prevents duplicate calls, 7-day TTL balances freshness and cost, on-demand POST trigger bypasses schedule — apply to any future periodic LLM job
- **`space-y-1` + `flex-wrap` for dense card headers:** avoids overlap of title/badge in narrow grid columns — use for all card-style layouts in v5.0

### Key Lessons

1. **Seed data matters as much as test stubs** — missing `track` values in the DB made the integration tracker look broken even though the code was correct; fixtures with realistic data should be part of Wave 0
2. **Server startup dependencies should fail loudly** — Redis absence causing silent POST failures delayed UAT debugging; add early startup health checks for required services
3. **UAT timeline is the right verification** — two of the three most valuable improvements in this milestone were UAT-driven (timeline reversion, two-column layout); automated tests alone wouldn't have caught them
4. **Defer surgical debt carefully** — TEST-01 deferred to v6.0 is justified (mock plumbing, not logic), but deferral should be explicit with a v6.0 slot reserved so it doesn't drift forever

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~5 sessions across 3 days
- Notable: Parallel wave execution reduced wall time significantly; Phase 35 completed in a single session including 6 plans

---

## Milestone: v5.0 — Workspace UX Overhaul

**Shipped:** 2026-04-07
**Phases:** 6 (37–42) | **Plans:** 29 | **Duration:** 5 days (2026-04-03 → 2026-04-07)
**Code delta:** ~42,385 LOC TypeScript (cumulative)

### What Was Built

- **Inline editing (Phase 37):** ActionsTableClient table layout, InlineSelectCell/DatePickerCell/OwnerCell shared components, inline row editing for Risks/Milestones, stakeholder owner autocomplete, bulk status bar — zero modals for common updates
- **Custom Gantt (Phase 38):** Complete replacement of frappe-gantt with custom split-panel GanttChart.tsx — milestone markers as dashed indigo vertical lines, accordion swim lanes, Day/Week/Month/Quarter view toggle, drag-to-reschedule with immediate PATCH save, ResizeObserver for container fill
- **Cross-tab sync (Phase 39):** CustomEvent (metrics:invalidate) dispatch pattern after every entity PATCH, clickable risk severity pie chart drill-down, active blocker list, overdue card highlighting on TaskBoard/PhaseBoard, bulk status update wired through
- **Search + traceability (Phase 40):** GlobalSearchBar in workspace header (FTS API, 300ms debounce), Decisions tab text/date filtering, ArtifactEditModal with lazy-loading entity tab, Engagement History from audit log (no manual curation), Skills tab elapsed timer + cancel button
- **UX polish (Phase 41):** EmptyState component with per-entity CTA, unified overdue treatment (red border + background) across Actions/Milestones/Tasks, loading skeletons for OverviewMetrics/HealthDashboard/SkillsTabClient
- **Ingestion field coverage (Phase 42):** coerceRiskSeverity, resolveEntityRef (ilike pattern for higher recall), mergeItem fill-null-only guards, unresolvedRefs API response + IngestionModal notice, ENTITY_FIELDS extended for task/milestone/action, SYNC-01 gap fixed post-audit

### What Worked

- **Audit-then-fix pattern:** Milestone audit caught the SYNC-01 integration gap (IngestionModal not dispatching metrics:invalidate) before archiving — 2-line fix prevented a user-facing refresh bug shipping with the milestone
- **Gate plans as required checkpoints:** Every phase ended with a test suite gate + human verification plan; bugs found during Phase 38 and 40 verification (drag race condition, header duplicate) were caught and fixed before proceeding
- **CustomEvent for cross-tab sync:** Zero new dependencies, clean dispatch/listen pattern; the metrics:invalidate event was the right abstraction level — easy to extend to ingestion in Phase 42 once the pattern existed
- **Client-side filtering consistency:** Server Component passes full data, ActionsTableClient/RisksTableClient/DecisionsTableClient all filter client-side via URL params — consistent pattern across all table views

### What Was Inefficient

- **frappe-gantt SVG injection dead end:** Phase 38 original plan called for SVG DOM injection into frappe-gantt for milestone markers; abandoned mid-plan for a full custom Gantt replacement — the replacement was ultimately better, but the discovery cost time
- **Phase 41 VERIFICATION.md gap:** gsd-verifier was not run for Phase 41 despite all plans completing — audit caught this as a process gap; SUMMARY frontmatter confirmed delivery but the formal step was skipped
- **Empty state CTA placeholders:** onClick handlers shipped as `() => {}` — the component structure is correct but the wiring to creation modals was deferred as tech debt, meaning the feature is cosmetically complete but not functionally useful

### Patterns Established

- **Split-panel Gantt pattern (GanttChart.tsx):** Left panel (task names, ResizeObserver drag grip), right panel (SVG timeline, pxPerDay auto-scale, milestone dashed markers, drag-override overlay) — reuse for any timeline visualization
- **metrics:invalidate CustomEvent pattern:** Dispatch after any entity PATCH/POST that changes counts/status; listen in OverviewMetrics/HealthDashboard useEffect — zero extra dependencies, extend for new event types
- **Merge fill-null-only pattern:** `beforeRecord.field ? undefined : (newValue)` — used in mergeItem to prevent ingestion from overwriting manual edits; apply to any AI-assisted merge with user-authoritative fields
- **Phase 39 gate verification protocol:** Automated test suite GREEN → 12-step manual browser walkthrough → ship approval; now standard for all phase gates

### Key Lessons

1. **Replace don't patch third-party chart libraries** — SVG injection into frappe-gantt was fragile and limited; a custom React component gave full control with less total code
2. **Always run gsd-verifier at phase close** — Phase 41 skipping VERIFICATION.md was caught by the milestone audit; the cost of running the verifier is lower than the cost of the audit finding the gap
3. **Audit integration gaps between phases, not just within them** — SYNC-01 gap was a cross-phase connection issue (Phase 39 pattern, Phase 42 consumer) invisible to per-phase verification
4. **Deferred wiring creates user confusion** — empty state CTAs that don't work look broken, not "partially complete"; defer only things users won't encounter in real usage

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~8 sessions across 5 days
- Notable: 6 phases including the large Phase 37 inline editing foundation ran in 5 days; parallel independent phases (38/39/40 could proceed after 37) would have been faster with true parallel planning

---

## Milestone: v6.0 — Dashboard, Navigation & Intelligence

**Shipped:** 2026-04-14
**Phases:** 16 (43–57, including 48.1) | **Plans:** 45 | **Duration:** 7 days (2026-04-07 → 2026-04-14)
**Code delta:** +46,127 / -19,810 lines across 367 files | **Total LOC:** ~69,606 TypeScript

### What Was Built

- **Skills portability (Phase 43):** lib/skill-path.ts resolves SKILL.md at runtime — no hardcoded paths; shared across Next.js + BullMQ workers
- **Navigation restructure (Phase 44):** Plan first in Delivery, WBS/Task Board/Gantt promoted to top level, Swimlane removed, Decisions → Delivery, Intel → Context tab, Engagement History → Admin; all old URLs redirect
- **WBS tab (Phase 47):** 3-level collapsible ADR+Biggy tree with ADR/Biggy tab switch, Set-based expand state, React.memo() recursive tree, Generate Plan AI gap-fill modal, full CRUD with level-1 protection and subtree delete
- **Architecture tab (Phase 48):** Before State + Current & Future State two-sub-tab diagram with DB-driven nodes, status cycling, drag-reorder, TeamOnboardingTable below both tracks
- **Teams tab (Phase 48+56):** 4-section engagement map aligned to spec (Architecture excluded); ArchOverviewSection + TeamsPageTabs + TeamEngagementOverview orphans removed (~450 lines)
- **Portfolio dashboard (Phase 49):** Health chips, filterable 12-column table with client-side filtering, exceptions panel, project drill-down
- **3-pass extraction pipeline (Phase 52):** Pass 0 pre-analysis + 3 entity-group passes (actions/risks/tasks, architecture, teams/delivery), intra-batch dedup with composite keys, pass-aware IngestionModal progress
- **Extraction prompt intelligence (Phase 53):** document-first layout, few-shot examples, field-level inference rules, status normalization table, `record_entities` tool use API (replaces jsonrepair), 2000-char overlap, coverage reporting
- **Synthesis-first extraction (Phase 57):** Document type classification (transcript/status-update/formal-doc), entity type prediction in Pass 0, transcript-mode conditional instructions in all 3 passes, confidence calibration rubric (0.5–0.7 inferred, 0.8–0.95 explicit), SINGLETON markers, e2e_workflow assembly from scattered mentions
- **15 pre-existing test failures fixed (post-v5.0):** leftJoin mock chains, db.transaction mocks, db default vs named exports, drizzle gt/ne operators, mockReturnValueOnce queue pollution, component import/jsdom issues

### What Worked

- **Gap-closure phase pattern:** Phases 54–57 systematically closed every audit gap from the v6.0 audit. Running the audit mid-milestone (before archiving) then generating explicit gap-closure phases is a clean pattern for quality assurance — much better than leaving gaps as indefinite tech debt
- **Wave 0 + immediate RED→GREEN discipline:** With 45 plans across 16 phases, the TDD contract established by Wave 0 stubs made every phase's completion condition unambiguous
- **REQUIREMENTS.md as living checklist:** 55/55 requirements ended up `[x]` and the traceability table was complete — the requirements doc actually served its purpose as a single-source completion check
- **Per-entity approval feedback (Phase 51):** The `Record<entityType, { written, skipped }>` response pattern surfaced silent extraction failures as visible UI feedback — caught real ingestion bugs that would have been invisible
- **Multi-pass extraction architecture:** 3 separate Claude calls with entity-group specialization materially improved recall for architecture and teams entities that a single-pass prompt missed entirely

### What Was Inefficient

- **Audit discovered 2 partial requirements after 16 phases:** TEAM-01 (5 sections instead of 4) and TEAM-02 (write path worked, read path was never connected) required 3 additional gap-closure phases. Earlier spec verification during Phase 48 planning would have caught the ArchOverviewSection discrepancy before it shipped.
- **57-01-SUMMARY.md never created during execution:** Plan completed with 10 commits and all tests GREEN, but the summary document was forgotten and had to be written retrospectively. The VERIFICATION.md even noted this gap explicitly. Summary creation should be part of the plan's done criteria, not optional.
- **Audit file status stale at milestone close:** v6.0 audit showed `status: gaps_found` (from 2026-04-10) even though all gaps were closed by Phase 57 (2026-04-13). The audit doc was never re-run or updated after gap closure. Stale audit status caused extra pre-flight work at milestone completion.
- **team_engagement entity type lifecycle took 3 phases to fully resolve:** Phase 46 added it, Phase 51 removed it from prompts, Phase 53 investigated it again (EXTR-15), Phase 56 finally deleted the dead handler and orphaned infrastructure. A clearer decommission protocol would have resolved this in one phase.

### Patterns Established

- **Gap-closure phase chain after milestone audit:** Run `/gsd:audit-milestone` before archiving; any `gaps_found` items generate explicit gap-closure phases (54–57 pattern). Does NOT block milestone close if audit shows all gaps resolved.
- **4-pass extraction pipeline:** Pass 0 (doc pre-analysis + entity prediction) → Pass 1 (actions/risks/tasks) → Pass 2 (architecture) → Pass 3 (teams/delivery) — progress scale: 10/40/70/100%. Apply to any multi-entity AI extraction that benefits from pass specialization.
- **Document type classification + conditional instructions:** Pass 0 outputs `<document_type>` tag, which passes enable transcript-mode aggressive inference vs formal-doc explicit extraction. Generalizes to any prompt that needs input-adaptive behavior.
- **Confidence calibration by source explicitness (not just certainty):** Four tiers (0.5–0.6 weak inference, 0.6–0.7 strong inference, 0.8–0.9 explicit informal, 0.9–0.95 explicit structured) make AI confidence scores meaningful to end users.

### Key Lessons

1. **Verify spec compliance during planning, not just during verification** — TEAM-01's Architecture section discrepancy existed in code for 2+ phases before the audit caught it; a 30-second spec read during Phase 48 planning would have prevented 3 gap-closure phases
2. **Summary documents are part of "done"** — 57-01-SUMMARY.md was a documentation gap that required retroactive reconstruction; the plan's done criteria must include summary creation explicitly, not treat it as optional
3. **Re-run audit after gap-closure phases complete** — or at minimum update the audit file's `status` field; a stale `gaps_found` status creates unnecessary friction at milestone close
4. **Dead code needs a decommission plan, not just removal from prompts** — team_engagement entity type removal should have been one atomic change (remove from prompt, remove handler, remove infrastructure, update docs); doing it piecemeal across 3 phases created confusion about what was intentional vs. missed

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~15 sessions across 7 days
- Notable: The extraction intelligence phases (50–57) were the most context-intensive — each required loading large prompt constants and test files. Parallel subagent execution (gsd:execute-phase) kept individual agent contexts manageable. Test repair session at milestone close (15 fixes in one session) demonstrated how accumulated test debt can be addressed efficiently in a single focused pass.

---

## Milestone: v7.0 — Governance & Operational Maturity

**Shipped:** 2026-04-16
**Phases:** 12 (58–69) | **Plans:** 41 | **Duration:** 3 days (2026-04-14 → 2026-04-16)
**Code delta:** ~75,894 LOC TypeScript (from ~69,606 at v6.0; +~6,288)

### What Was Built

- **Per-project RBAC (Phase 58):** `requireProjectRole()` wrapper at all 40+ [projectId] route handlers; project Members tab with role CRUD and email invite flow; Admin/User role distinction enforced at API and UI level
- **Project lifecycle management (Phase 59):** Archive (read-only soft-delete with ArchivedBanner), permanent delete with pre-flight validation (no active BullMQ jobs), restore, portfolio separation into active/archived views, user logout via SidebarUserIsland
- **Health Dashboard redesign (Phase 60):** Auto-derived executive metrics — overdue tasks count, at-risk milestones, stale project updates — no manual health input; verdict-first layout readable at a glance
- **Ingestion edit & reclassification (Phases 61–62):** ExtractionItemEditForm with Type dropdown, field remap on type change, correct DB routing on approval; Analyze Completeness per-field 0–100% scoring with conflicting detection; Scan for Updates consolidated to Context tab
- **Skills Design Standard (Phases 63–64):** YAML front-matter schema (6 required fields), runtime validation with "Fix required" badge and grayed-out non-compliant skills; editable prompts UI with CodeMirror editor (ssr:false, useRef buffering), atomic file write with `.bak` backup, audit log capture, admin-only global toggle
- **Project-scoped scheduling (Phase 65):** `project_id` column on scheduled_jobs with `ON DELETE SET NULL`; per-project job list filtered by projectId; CreateJobWizard projectId prop; global scheduler restricted to IS NULL jobs; nav badge removed
- **Overview tracks redesign (Phase 66):** Static track config constants for ADR/Biggy phases (names never from DB); dynamic summary cards with live counts; Monday auto-schedule via BullMQ (0 6 * * 1 cron); integration DELETE endpoint; Generate Now button as quiet override
- **Delivery tab cleanup (Phase 67):** ID/Source columns hidden by default on Actions/Risks/Milestones with column toggle; Plan tab removed, Generate Plan migrated to Task Board; Decisions form scoped to operational impact; stakeholder move (toggle company field) and delete with audit log
- **Gantt bi-directional sync (Phase 68):** WBS-based row model replacing milestone grouping; ADR/Biggy track separation; L1→L2→L3 hierarchy via `computeDepth` from parent_id chain (DB `level` column is stale); edge drag handles (left/right) with 1-day minimum enforcement; milestone drag with separate dragRef; inline DatePickerCell in left panel
- **Knowledge Base audit (Phase 69):** Feature audited and retained — ~1,408 LOC, cross-project institutional knowledge capture, distinct from document ingestion pipeline

### What Worked

- **Inline phase completion (Phase 69):** KB audit done in-session without a full plan/execute cycle — right call for a verification-only task with no code changes needed
- **DB query as debugging tool:** `psql` query to inspect `level` vs `parent_id` values on wbs_items immediately revealed the root cause of L3 indentation failure; DB inspection before CSS investigation saved multiple context turns
- **computeDepth pattern generalizes:** Recursive depth-from-parent-chain with `depthCache` map is O(n) and handles arbitrary tree depth; correct for any tree stored without reliable level column
- **Phase 67 debt isolation:** Grouping 8 cleanup requirements (column hiding, tab removal, stakeholder ops) into one phase prevented scope creep in earlier phases while ensuring they shipped together

### What Was Inefficient

- **paddingLeft vs spacer div discovery:** First fix (empty flex spacer div) was CSS-correct but masked that the data was wrong; needed two iterations — CSS fix + DB diagnosis — to fully resolve. Root-cause-first approach would have been faster.
- **Phase 69 late scoping:** Original Phase 69 scope (KB + Outputs + TDD stubs) was overly ambitious; only KB audit was actually valuable. Scoping this down could have happened at milestone planning instead of at execution.
- **Progress table staleness in ROADMAP.md:** The inline progress table had stale `In Progress` entries at milestone close; the per-phase `[x]` checkboxes in the phase list are the authoritative source, the table is redundant — removed at archive.

### Patterns Established

- **`requireProjectRole()` wrapper pattern:** Single function wrapping `requireSession()` + role lookup + project membership check — apply to all future project-scoped route handlers
- **`computeDepth` from parent chain for tree depth:** When tree data is stored with a `level` column that may be stale, always compute depth recursively from `parent_id` chain using a `depthCache` map — never trust stored level
- **Weekly-focus job registration on project create (best-effort):** `try/catch` around `upsertJobScheduler` in project creation flow; cron pattern `0 6 * * 1` hardcoded (product requirement, not user config); idempotent via key pattern `weekly-focus-project-{id}`
- **Editable prompts atomic write pattern:** Read file → strip front-matter → validate new body → write atomically with `.${Date.now()}.bak` backup → audit log insert; separate from DB transaction (filesystem not transactional with PostgreSQL)

### Key Lessons

1. **Query the DB before debugging the UI** — L3 indentation investigation wasted a CSS iteration because the root cause was stale DB data, not rendering; inspect data-layer contracts first for layout/display bugs
2. **Scope milestones ruthlessly at planning time** — Phase 69's three-item scope (KB + Outputs + TDD) was too broad; auditing value at the milestone scoping stage would have dropped OUT-01 and TEST-01 immediately
3. **`computeDepth` > stored `level` for trees** — DB `level` column on wbs_items is set inconsistently (child saved with parent's level); structural integrity requires deriving from the parent chain; consider adding a DB check constraint or trigger to enforce level = parent_level + 1 in future
4. **Deprecate dead tech debt at the milestone boundary** — TEST-01 (4 RED portfolio stubs) carried across three milestones; the cost of explicit "drop this" decision at v7.0 close is lower than carrying forward indefinitely

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~3 sessions across 3 days
- Notable: Phase 68 required the most debugging iterations (L3 indentation required DB inspection + two code changes); all other phases executed cleanly in single sessions

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Duration | Key Change |
|-----------|--------|----------|------------|
| v1.0 | 16 | ~7 days | Foundation — established TDD wave pattern |
| v2.0 | 9 | ~4 days | Added ingestion, wizard, enhanced ops |
| v3.0 | 5 | 3 days | Auth + AI features; wave pattern now automatic |
| v4.0 | 5 | 3 days | Infrastructure migration + UI overhaul; parallel wave execution mature |
| v5.0 | 6 | 5 days | Full UX overhaul; custom Gantt, cross-tab sync, global search, polish |
| v6.0 | 16 | 7 days | Dashboard + WBS + Architecture + extraction pipeline maturity; gap-closure phase pattern introduced |
| v7.0 | 12 | 3 days | Governance & operational maturity; RBAC, lifecycle, Skills Design Standard, Gantt sync |

### Cumulative Quality

| Milestone | Tests Passing | Key Coverage |
|-----------|--------------|--------------|
| v1.0 | ~200 | Core workspace tabs, skills, scheduler |
| v2.0 | ~325 | Ingestion, wizard, audit, time tracking |
| v3.0 | 363 | Auth, visuals, chat, context hub |
| v4.0 | ~370 | BullMQ extraction, global time, Overview metrics/health/focus |
| v5.0 | ~370 | Inline editing, custom Gantt, cross-tab sync, global search, empty states (6 pre-existing failures remain) |
| v6.0 | 148 files passing | Portfolio, WBS, Architecture, extraction pipeline (21 entity types); 15 pre-existing failures fixed; 4 intentional RED portfolio stubs |
| v7.0 | 148+ files passing | RBAC, lifecycle, Health Dashboard, ingestion edit, Skills Standard, Gantt hierarchy; 4 RED stubs accepted as known gap |

### Top Lessons (Verified Across Milestones)

1. **Wave 0 RED stubs before any implementation** — consistent across all 4 milestones; prevents scope drift and makes verification binary
2. **Production build before every human checkpoint** — enforced since Phase 28; catches SSR issues dev mode hides
3. **Capture decisions with rationale at the moment they're made** — STATE.md decisions log has paid off in every resume-work session
4. **UAT drives more real improvements than automated tests** — Phases 34 and 35 UAT both discovered meaningful UX issues invisible to unit tests; human eyes on real browser are irreplaceable
5. **Milestone audit catches cross-phase integration gaps** — SYNC-01 and Phase 41 verification gap would not have been caught by per-phase verification alone; auditing before archiving is non-negotiable
