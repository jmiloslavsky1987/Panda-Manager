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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Duration | Key Change |
|-----------|--------|----------|------------|
| v1.0 | 16 | ~7 days | Foundation — established TDD wave pattern |
| v2.0 | 9 | ~4 days | Added ingestion, wizard, enhanced ops |
| v3.0 | 5 | 3 days | Auth + AI features; wave pattern now automatic |
| v4.0 | 5 | 3 days | Infrastructure migration + UI overhaul; parallel wave execution mature |

### Cumulative Quality

| Milestone | Tests Passing | Key Coverage |
|-----------|--------------|--------------|
| v1.0 | ~200 | Core workspace tabs, skills, scheduler |
| v2.0 | ~325 | Ingestion, wizard, audit, time tracking |
| v3.0 | 363 | Auth, visuals, chat, context hub |
| v4.0 | ~370 | BullMQ extraction, global time, Overview metrics/health/focus |

### Top Lessons (Verified Across Milestones)

1. **Wave 0 RED stubs before any implementation** — consistent across all 4 milestones; prevents scope drift and makes verification binary
2. **Production build before every human checkpoint** — enforced since Phase 28; catches SSR issues dev mode hides
3. **Capture decisions with rationale at the moment they're made** — STATE.md decisions log has paid off in every resume-work session
4. **UAT drives more real improvements than automated tests** — Phases 34 and 35 UAT both discovered meaningful UX issues invisible to unit tests; human eyes on real browser are irreplaceable
