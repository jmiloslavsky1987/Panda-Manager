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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Duration | Key Change |
|-----------|--------|----------|------------|
| v1.0 | 16 | ~7 days | Foundation — established TDD wave pattern |
| v2.0 | 9 | ~4 days | Added ingestion, wizard, enhanced ops |
| v3.0 | 5 | 3 days | Auth + AI features; wave pattern now automatic |
| v4.0 | 5 | 3 days | Infrastructure migration + UI overhaul; parallel wave execution mature |
| v5.0 | 6 | 5 days | Full UX overhaul; custom Gantt, cross-tab sync, global search, polish |

### Cumulative Quality

| Milestone | Tests Passing | Key Coverage |
|-----------|--------------|--------------|
| v1.0 | ~200 | Core workspace tabs, skills, scheduler |
| v2.0 | ~325 | Ingestion, wizard, audit, time tracking |
| v3.0 | 363 | Auth, visuals, chat, context hub |
| v4.0 | ~370 | BullMQ extraction, global time, Overview metrics/health/focus |
| v5.0 | ~370 | Inline editing, custom Gantt, cross-tab sync, global search, empty states (6 pre-existing failures remain) |

### Top Lessons (Verified Across Milestones)

1. **Wave 0 RED stubs before any implementation** — consistent across all 4 milestones; prevents scope drift and makes verification binary
2. **Production build before every human checkpoint** — enforced since Phase 28; catches SSR issues dev mode hides
3. **Capture decisions with rationale at the moment they're made** — STATE.md decisions log has paid off in every resume-work session
4. **UAT drives more real improvements than automated tests** — Phases 34 and 35 UAT both discovered meaningful UX issues invisible to unit tests; human eyes on real browser are irreplaceable
5. **Milestone audit catches cross-phase integration gaps** — SYNC-01 and Phase 41 verification gap would not have been caught by per-phase verification alone; auditing before archiving is non-negotiable
