# Roadmap: BigPanda AI Project Management App

## Milestones

- ✅ **v1.0** — Foundation + Read/Write Surface + Skills + MCP + Cross-Project — Phases 1–16 (shipped 2026-03-26)
- ✅ **v2.0** — AI Ingestion & Enhanced Operations — Phases 17–25 (shipped 2026-03-30)
- ✅ **v3.0** — Collaboration & Intelligence — Phases 26–30 (shipped 2026-04-01)
- 📋 **v4.0** — Infrastructure & UX Foundations (Phases 31–36)

## Phases

<details>
<summary>✅ v1.0 — Foundation + Read/Write Surface + Skills + MCP + Cross-Project (Phases 1–16) — SHIPPED 2026-03-26</summary>

Full details: `.planning/milestones/v1.0-ROADMAP.md` (archived)

- [x] Phase 1: Data Foundation (completed 2026-03-19)
- [x] Phase 2: App Shell + Read Surface (completed 2026-03-19)
- [x] Phase 3: Write Surface + Plan Builder (completed 2026-03-20)
- [x] Phase 4: Job Infrastructure (completed 2026-03-20)
- [x] Phase 5: Skill Engine (completed 2026-03-23)
- [x] Phase 5.1: Onboarding Dashboard [INSERTED] (completed 2026-03-23)
- [x] Phase 5.2: Time Tracking Tab [INSERTED] (completed 2026-03-23)
- [x] Phase 6: MCP Integrations (completed 2026-03-24)
- [x] Phase 7: File Generation + Remaining Skills (completed 2026-03-24)
- [x] Phase 8: Cross-Project Features (completed 2026-03-24)
- [x] Phase 9: Notifications + Badges (completed 2026-03-25)
- [x] Phase 10: Search (completed 2026-03-25)
- [x] Phase 11: Settings + Admin (completed 2026-03-25)
- [x] Phase 12: Output Library (completed 2026-03-25)
- [x] Phase 13: Dashboard Panels (completed 2026-03-25)
- [x] Phase 14: Analytics (completed 2026-03-25)
- [x] Phase 15: Scheduler (completed 2026-03-26)
- [x] Phase 16: Verification Retrofit (completed 2026-03-26)

</details>

<details>
<summary>✅ v2.0 — AI Ingestion & Enhanced Operations (Phases 17–25) — SHIPPED 2026-03-30</summary>

Full details: `.planning/milestones/v2.0-ROADMAP.md` (archived)

- [x] Phase 17: Schema Extensions (completed 2026-03-26)
- [x] Phase 18: Document Ingestion (completed 2026-03-26)
- [x] Phase 19: External Discovery Scan (completed 2026-03-27)
- [x] Phase 20: Project Initiation Wizard (completed 2026-03-27)
- [x] Phase 21: Teams + Architecture Tabs (completed 2026-03-27)
- [x] Phase 22: Source Badges + Audit Log (completed 2026-03-27)
- [x] Phase 23: Time Tracking Advanced (completed 2026-03-27)
- [x] Phase 24: Scheduler Enhanced (completed 2026-03-30)
- [x] Phase 25: Wizard Fix + Audit Completion [GAP CLOSURE] (completed 2026-03-30)

</details>

<details>
<summary>✅ v3.0 — Collaboration & Intelligence (Phases 26–30) — SHIPPED 2026-04-01</summary>

Full details: `.planning/milestones/v3.0-ROADMAP.md` (archived)

- [x] Phase 26: Multi-User Auth — better-auth sessions, role-based access, 40+ route guards, email invite flow (completed 2026-03-31)
- [x] Phase 27: UI Overhaul + Templates — sub-tab navigation, TypeScript template registry, new project seeding (completed 2026-03-31)
- [x] Phase 28: Interactive Visuals — React Flow org charts + workflow diagrams with Dagre auto-layout (completed 2026-04-01)
- [x] Phase 29: Project Chat — Vercel AI SDK streaming chat grounded in live project DB data (completed 2026-04-01)
- [x] Phase 30: Context Hub — document upload/extraction/routing, upload history, completeness analysis (completed 2026-04-01)

</details>

### 📋 v4.0 — Infrastructure & UX Foundations (Phases 31–36)

**Milestone Goal:** Resolve accumulated technical debt and deliver two significant UX redesigns: time tracking as a standalone top-level section and a fully overhauled Overview tab with ADR/Biggy workstream structure.

- [x] **Phase 31: BullMQ Document Extraction Migration** - Move extraction to background job with browser-refresh resilience (completed 2026-04-01)
- [x] **Phase 32: Time Tracking Global View** - Standalone top-level section with cross-project timesheet (completed 2026-04-02)
- [ ] **Phase 33: Overview Tab Schema Migration + Workstream Structure** - Add track column for ADR/Biggy separation
- [ ] **Phase 34: Overview Tab — Metrics & Health Dashboard** - Read-only aggregation sections with visualizations
- [ ] **Phase 35: Overview Tab — Weekly Focus & Integration Tracker** - AI-generated weekly summary and redesigned integration tracker
- [ ] **Phase 36: Test Failure Fixes** - Resolve 13 pre-existing test failures with root-cause fixes

## Phase Details

### Phase 31: BullMQ Document Extraction Migration
**Goal**: Document extraction runs reliably in background without losing progress on browser refresh or navigation
**Depends on**: Nothing (infrastructure improvement)
**Requirements**: EXTR-01, EXTR-02, EXTR-03
**Success Criteria** (what must be TRUE):
  1. User can navigate away from Context Hub during document extraction and return to see progress
  2. Extraction progress displays percentage complete and current chunk being processed
  3. Failed extraction does not leave partial data in workspace tabs (atomic commit only when complete)
  4. Long-running extraction (4-6 minutes) completes successfully even if browser refreshes mid-extraction
**Plans**: 5 plans

Plans:
- [x] 31-01-PLAN.md — extraction_jobs schema + migration + Wave 0 test scaffolds
- [x] 31-02-PLAN.md — Worker job handler (document-extraction.ts + worker/index.ts registration)
- [x] 31-03-PLAN.md — API routes: enqueue endpoint + polling endpoint + batch status endpoint
- [x] 31-04-PLAN.md — UI: IngestionModal SSE→polling + ContextTab inline progress + review card
- [x] 31-05-PLAN.md — Full test suite + build check + human UAT verification (6 tests passed, 11 bugs fixed)

### Phase 32: Time Tracking Global View
**Goal**: Users can view and manage all time entries across projects from a single top-level location
**Depends on**: Nothing (independent feature)
**Requirements**: TIME-01, TIME-02, TIME-03
**Success Criteria** (what must be TRUE):
  1. User can access /time-tracking route from main navigation showing all time entries across all projects
  2. Each time entry displays project attribution and user can filter by project
  3. Time entries are grouped by week with date range headers
  4. Per-project Time Tracking tab no longer appears in customer workspace tabs
  5. Old /customer/[id]/time route redirects to /time-tracking with project filter preserved
**Plans**: 5 plans

Plans:
- [ ] 32-01-PLAN.md — Wave 0 test scaffolds (3 failing stubs for TIME-01, TIME-02, TIME-03)
- [ ] 32-02-PLAN.md — API endpoints: GET /api/time-entries (cross-project), GET /api/projects, global export + calendar import
- [ ] 32-03-PLAN.md — Navigation surgery: Sidebar link, WorkspaceTabs Time tab removal, /customer/[id]/time redirect
- [ ] 32-04-PLAN.md — GlobalTimeView component + TimeEntryModal global adaptation + /time-tracking page shell
- [ ] 32-05-PLAN.md — Full test suite + build check + human UAT verification

### Phase 33: Overview Tab Schema Migration + Workstream Structure
**Goal**: Database schema supports ADR and Biggy as separate parallel workstreams with standardized phase models
**Depends on**: Nothing (schema-only change)
**Requirements**: WORK-01, WORK-02
**Success Criteria** (what must be TRUE):
  1. Database tables onboarding_phases and onboarding_steps have track column populated with 'ADR' or 'Biggy'
  2. Existing projects have track column backfilled based on phase names (no NULL values for active projects)
  3. Overview tab renders ADR and Biggy onboarding sections separately with standardized phase models
  4. Project Completeness indicator is removed from Overview tab UI
  5. Migration includes index on track column for query performance
**Plans**: 5 plans in 5 waves

Plans:
- [ ] 33-01-PLAN.md — Wave 0 test scaffolds (4 test files for WORK-01 and WORK-02)
- [ ] 33-02-PLAN.md — Schema migration (add track column + indexes)
- [ ] 33-03-PLAN.md — Auto-seed phases in POST /api/projects
- [ ] 33-04-PLAN.md — API grouping (return { adr, biggy } from GET endpoint)
- [ ] 33-05-PLAN.md — Dual-track UI + completeness removal

### Phase 34: Overview Tab — Metrics & Health Dashboard
**Goal**: Overview tab displays actionable metrics and health indicators with visual charts
**Depends on**: Phase 33 (requires track column for workstream-separated metrics)
**Requirements**: METR-01, HLTH-01, TMLN-01
**Success Criteria** (what must be TRUE):
  1. Metrics section shows onboarding completion percentage, integration counts by status, and validation progress
  2. Health Dashboard displays overall health indicator, risk count by severity, phase health by workstream (ADR vs Biggy), and active blocker count
  3. Milestone timeline renders as visual timeline component (not text list) near top of Overview tab
  4. All metrics are read-only aggregations computed from live database data (no manual entry)
  5. Charts render using Recharts library with responsive design
**Plans**: TBD

### Phase 35: Overview Tab — Weekly Focus & Integration Tracker
**Goal**: Overview tab shows AI-generated weekly priorities and redesigned integration tracker split by workstream
**Depends on**: Phase 33 (requires track column for workstream separation)
**Requirements**: WKFO-01, WKFO-02, OINT-01
**Success Criteria** (what must be TRUE):
  1. Weekly focus section displays 3-5 auto-generated priority bullets refreshed weekly via scheduled BullMQ job
  2. Circular progress bar appears in weekly focus section tied to meaningful progress data
  3. Integration tracker splits into ADR and Biggy sections
  4. ADR integrations categorized by type: Inbound, Outbound, Enrichment
  5. Biggy integrations categorized by type: Real-time, Context/Knowledge/UDC
**Plans**: TBD

### Phase 36: Test Failure Fixes
**Goal**: Test suite passes completely with all 13 pre-existing failures resolved
**Depends on**: Phases 31-35 (implementation patterns finalized)
**Requirements**: TEST-01
**Success Criteria** (what must be TRUE):
  1. All 13 failing tests in tests/teams-arch/ directory pass with root-cause fixes (not assertion workarounds)
  2. No previously passing tests break during fix process
  3. Each fix documents the root cause and resolution approach
  4. Production build remains clean with no new warnings or errors
  5. Test fixes validate actual production behavior (not just making tests pass)
**Plans**: TBD

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1–16 | v1.0 | 63/63 | Complete | 2026-03-26 |
| 17–25 | v2.0 | 63/63 | Complete | 2026-03-30 |
| 26–30 | v3.0 | 26/26 | Complete | 2026-04-01 |
| 31. BullMQ Extraction | v4.0 | 5/5 | Complete | 2026-04-02 |
| 32. Time Tracking Global | 5/5 | Complete    | 2026-04-02 | — |
| 33. Schema Migration | 1/5 | In Progress|  | — |
| 34. Metrics & Health | v4.0 | 0/TBD | Not started | — |
| 35. Weekly Focus | v4.0 | 0/TBD | Not started | — |
| 36. Test Fixes | v4.0 | 0/TBD | Not started | — |
