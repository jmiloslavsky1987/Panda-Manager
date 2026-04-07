# Roadmap: BigPanda AI Project Management App

## Milestones

- ✅ **v1.0** — Foundation + Read/Write Surface + Skills + MCP + Cross-Project — Phases 1–16 (shipped 2026-03-26)
- ✅ **v2.0** — AI Ingestion & Enhanced Operations — Phases 17–25 (shipped 2026-03-30)
- ✅ **v3.0** — Collaboration & Intelligence — Phases 26–30 (shipped 2026-04-01)
- ✅ **v4.0** — Infrastructure & UX Foundations — Phases 31–35 (shipped 2026-04-03)
- 🚧 **v5.0** — Workspace UX Overhaul (Phases 37–41)

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

<details>
<summary>✅ v4.0 — Infrastructure &amp; UX Foundations (Phases 31–35) — SHIPPED 2026-04-03</summary>

Full details: `.planning/milestones/v4.0-ROADMAP.md` (archived)

- [x] Phase 31: BullMQ Document Extraction Migration — browser-refresh resilient (completed 2026-04-01)
- [x] Phase 32: Time Tracking Global View — standalone /time-tracking section (completed 2026-04-02)
- [x] Phase 33: Overview Tab Schema Migration + Workstream Structure (completed 2026-04-03)
- [x] Phase 34: Overview Tab — Metrics & Health Dashboard (completed 2026-04-03)
- [x] Phase 35: Overview Tab — Weekly Focus & Integration Tracker (completed 2026-04-03)
- ~~Phase 36: Test Failure Fixes~~ — deferred to v6.0

</details>

### 🚧 v5.0 — Workspace UX Overhaul (Phases 37–42)

**Milestone Goal:** Replace modal-heavy, siloed tab UX with inline-editable tables, cross-tab data sync, a working Gantt with milestones, consistent patterns across every view, and a fully enriched ingestion pipeline that populates every field for every entity type.

- [x] **Phase 37: Actions & Inline Editing Foundation** — Actions table layout, inline editing for Actions/Risks/Milestones, date pickers, and owner autocomplete wired across all entity edit surfaces (completed 2026-04-06)
- [x] **Phase 38: Gantt Overhaul** — Milestone markers, view mode switcher, milestone-grouped swim lanes, and drag-to-reschedule with immediate DB save (completed 2026-04-06)
- [x] **Phase 39: Cross-Tab Sync & Plan Tab** — Overview metrics refresh on entity edits, clickable chart drill-downs, active blocker list, Plan tab overdue highlighting, and bulk action wiring (completed 2026-04-07)
- [x] **Phase 40: Search, Traceability & Skills UX** — Global search bar, Decisions filtering, artifact reverse lookup, Engagement History auto-log, and Skills job progress + cancel (completed 2026-04-07)
- [ ] **Phase 41: UX Polish & Consistency** — Actionable empty states, unified overdue highlighting, and consistent loading skeletons across all tabs
- [ ] **Phase 42: Ingestion Field Coverage** — Full-field extraction for all entity types, cross-entity ID resolution (task→milestone, task→workstream), and consistent DB persistence so uploaded documents produce Gantt-ready data

## Phase Details

### Phase 37: Actions & Inline Editing Foundation
**Goal**: Users can manage Actions, Risks, and Milestones entirely from table rows — no modal required for common status, owner, or date updates
**Depends on**: Phase 35 (v5.0 starting point)
**Requirements**: ACTN-01, ACTN-02, ACTN-03, ACTN-04, ACTN-05, IEDIT-01, IEDIT-02, IEDIT-03, IEDIT-04, FORM-01, FORM-02, FORM-03, SRCH-03
**Success Criteria** (what must be TRUE):
  1. Actions tab renders as a table with ID, description, owner, due date, status, and source badge columns
  2. Clicking a table cell for status, owner, or due date on an Action, Risk, or Milestone opens an inline editor in-place (no modal opens)
  3. Risk status and Milestone status fields use fixed dropdowns (open/mitigated/resolved/accepted and not_started/in_progress/completed/blocked) rather than freeform text
  4. Date fields on Actions, Risks, Milestones, and Tasks display a date picker component when clicked
  5. Owner fields suggest names from the project's stakeholder list and accept freeform entry for non-listed names
**Plans**: 6 plans

Plans:
- [ ] 37-01-PLAN.md — Wave 0 test scaffolds (5 API test files, all RED before implementation)
- [ ] 37-02-PLAN.md — Package install + shared components (InlineSelectCell, DatePickerCell, OwnerCell)
- [ ] 37-03-PLAN.md — API additions (stakeholders GET, actions bulk-update, enum validation on risks/milestones)
- [ ] 37-04-PLAN.md — Actions page refactor (ActionsTableClient with table, filters, search, bulk bar)
- [ ] 37-05-PLAN.md — Risks + Milestones inline editing wiring
- [ ] 37-06-PLAN.md — Human verify checkpoint (full test suite + 30-step UI verification)

### Phase 38: Gantt Overhaul
**Goal**: The Gantt chart is a functional planning tool showing milestone context, supporting flexible time horizons, milestone-grouped swim lanes, and direct drag-to-reschedule
**Depends on**: Phase 37
**Requirements**: GNTT-01, GNTT-02, GNTT-03, GNTT-04, PLAN-03
**Success Criteria** (what must be TRUE):
  1. Milestone target dates appear as labelled vertical markers on the Gantt timeline
  2. A toggle in the Gantt UI switches between Day, Week, Month, and Quarter Year view modes
  3. Tasks are visually grouped under their parent milestone in labelled swim lanes on the Gantt
  4. Dragging a task bar to a new date saves the updated start and end dates to the database immediately without requiring a separate save action
**Plans**: 4 plans

Plans:
- [ ] 38-01-PLAN.md — Wave 0 test scaffold: tasks-patch-dates.test.ts (GNTT-04 unit tests, RED before implementation)
- [ ] 38-02-PLAN.md — Data contracts: getMilestonesForProject query, GanttMilestone type, milestone fetch in Gantt page
- [ ] 38-03-PLAN.md — GanttChart overhaul: accordion swim lanes, view mode toggle, drag-to-reschedule with PATCH save
- [ ] 38-04-PLAN.md — Milestone markers SVG injection + human verify checkpoint (all 5 requirements)

### Phase 39: Cross-Tab Sync & Plan Tab
**Goal**: Edits made in any tab are immediately reflected in the Overview metrics, and the Plan tab surfaces overdue work and bulk actions that actually work
**Depends on**: Phase 37
**Requirements**: SYNC-01, SYNC-02, SYNC-03, PLAN-01, PLAN-02
**Success Criteria** (what must be TRUE):
  1. Saving a Risk, Action, or Milestone edit updates the Overview metrics section in-place without requiring a page navigation or manual refresh
  2. Clicking a severity segment on the Overview risk distribution chart opens the Risks tab pre-filtered to that severity
  3. The Overview HealthDashboard active blockers section shows a list of the actual blocked items with clickable links to their records
  4. Tasks with past-due dates are visually highlighted in red on both the Phase Board and Task Board
  5. Selecting multiple tasks or phases via checkbox and applying a bulk status update executes the change (bulk action is not dead UI)
**Plans**: 4 plans

Plans:
- [ ] 39-01-PLAN.md — Wave 0 test scaffolds (5 test files covering all 5 requirements, all RED)
- [ ] 39-02-PLAN.md — SYNC work: dispatchers, listeners, blocked tasks list, pie chart drill-down, severity filter
- [ ] 39-03-PLAN.md — PLAN tab work: overdue card highlighting + bulk status on TaskBoard and PhaseBoard
- [ ] 39-04-PLAN.md — Full test suite gate + human verify checkpoint (12-step UI verification)

### Phase 40: Search, Traceability & Skills UX
**Goal**: Users can find any project entity by keyword from anywhere, trace every artifact to its extracted data, auto-see audit-driven history, and monitor or cancel running skill jobs
**Depends on**: Phase 37
**Requirements**: SRCH-01, SRCH-02, ARTF-01, HIST-01, SKLS-01, SKLS-02
**Success Criteria** (what must be TRUE):
  1. A search bar in the workspace header queries across actions, risks, milestones, tasks, decisions, and stakeholders using the existing FTS API and returns results
  2. The Decisions tab has a text search input and a date-range filter that narrow the displayed decisions
  3. An artifact detail view lists all entities (risks, actions, milestones, decisions) that were extracted from that artifact, each as a clickable link to its record
  4. The Engagement History tab shows entries sourced from the audit log — who changed what and when — for risks, actions, milestones, and tasks, without any manual curation
  5. Running or queued skill jobs display elapsed time and a progress indicator; a cancel button stops the job from the Skills tab
**Plans**: 6 plans

Plans:
- [ ] 40-01-PLAN.md — Wave 0 TDD test scaffolds (6 test files, all RED before implementation)
- [ ] 40-02-PLAN.md — GlobalSearchBar component + workspace header integration (SRCH-01)
- [ ] 40-03-PLAN.md — Decisions tab filtering + Artifact reverse lookup (SRCH-02, ARTF-01)
- [ ] 40-04-PLAN.md — Audit log query + Engagement History unified feed (HIST-01)
- [ ] 40-05-PLAN.md — Skills job progress indicator + cancel endpoint (SKLS-01, SKLS-02)
- [ ] 40-06-PLAN.md — Full test gate + human verification checkpoint

### Phase 41: UX Polish & Consistency
**Goal**: Every tab that can be empty gives the user a clear next action, overdue items are consistently highlighted everywhere, and data-fetching tabs show skeletons instead of blank screens
**Depends on**: Phase 39 (all overdue patterns established)
**Requirements**: UXPOL-01, UXPOL-02, UXPOL-03
**Success Criteria** (what must be TRUE):
  1. Every tab capable of having zero records shows an empty state with a short description and a CTA button (not a blank area or generic "No data" text)
  2. Overdue items display a consistent red border and background treatment in Actions, Milestones, and Tasks — all using the same visual style
  3. All tabs that fetch data client-side show loading skeleton components during the initial data load rather than blank content areas
**Plans**: 4 plans

Plans:
- [ ] 41-01-PLAN.md — Wave 0 TDD scaffolds (3 test files RED) + shared EmptyState component
- [ ] 41-02-PLAN.md — Table client empty states (Actions, Risks, Milestones, Decisions) + overdue row highlighting (Actions, Milestones)
- [ ] 41-03-PLAN.md — Server page empty states (Stakeholders, Teams, Architecture, Artifacts, History) + loading skeleton expansion (OverviewMetrics, HealthDashboard, SkillsTabClient)
- [ ] 41-04-PLAN.md — Full test gate + human verify checkpoint (18-step UI verification)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–16 | v1.0 | 63/63 | Complete | 2026-03-26 |
| 17–25 | v2.0 | 63/63 | Complete | 2026-03-30 |
| 26–30 | v3.0 | 26/26 | Complete | 2026-04-01 |
| 31. BullMQ Extraction | v4.0 | 5/5 | Complete | 2026-04-01 |
| 32. Time Tracking Global | v4.0 | 5/5 | Complete | 2026-04-02 |
| 33. Schema Migration | v4.0 | 5/5 | Complete | 2026-04-03 |
| 34. Metrics & Health | v4.0 | 5/5 | Complete | 2026-04-03 |
| 35. Weekly Focus | v4.0 | 6/6 | Complete | 2026-04-03 |
| 36. Test Fixes | v6.0 | 0/TBD | Deferred | — |
| 37. Actions & Inline Editing Foundation | 6/6 | Complete    | 2026-04-06 | — |
| 38. Gantt Overhaul | 3/4 | Complete    | 2026-04-06 | — |
| 39. Cross-Tab Sync & Plan Tab | 4/4 | Complete    | 2026-04-07 | — |
| 40. Search, Traceability & Skills UX | 6/6 | Complete    | 2026-04-07 | — |
| 41. UX Polish & Consistency | 3/4 | In Progress|  | — |
| 42. Ingestion Field Coverage | 3/5 | In Progress|  | — |

### Phase 42: Ingestion Field Coverage
**Goal**: Uploading a project document produces fully-populated entities — tasks with dates and milestone links, risks with severity, decisions with rationale, stakeholders with company — matching what the DB schema supports, so the Gantt and every other tab show real data immediately after ingestion
**Depends on**: Phase 35 (ingestion pipeline exists; independent of v5.0 UX phases)
**Requirements**: TBD
**Plans:** 3/5 plans executed

Plans:
- [ ] 42-01-PLAN.md — Wave 0 TDD scaffolds: extend write.test.ts + extraction-job.test.ts with RED failing cases
- [ ] 42-02-PLAN.md — Approve route Part 1: coerceRiskSeverity + resolveEntityRef + insertItem fixes (risk, task, milestone, action)
- [ ] 42-03-PLAN.md — Approve route Part 2: mergeItem fill-null-only + unresolvedRefs API response + IngestionModal notice
- [ ] 42-04-PLAN.md — Extraction prompt additions + ENTITY_FIELDS update (parallel with Plan 03)
- [ ] 42-05-PLAN.md — Full test gate + human verify checkpoint (approval card fields + unresolved refs notice)
