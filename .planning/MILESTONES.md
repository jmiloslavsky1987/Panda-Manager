# Milestones

## v8.0 Codebase Refactor & Multi-Tenant Deployment (Shipped: 2026-04-22)

**Phases completed:** 17 phases, 63 plans, 59 tasks

**Key accomplishments:**
- (none recorded)

---

## v7.0 Governance & Operational Maturity (Shipped: 2026-04-16)

**Phases completed:** 12 phases (58–69), 41 plans
**Code delta:** ~75,894 LOC TypeScript (from ~69,606 at v6.0)
**Timeline:** 3 days (2026-04-14 → 2026-04-16)

**Key accomplishments:**
- Per-project Admin/User RBAC enforced at all 40+ route handlers; project Members tab with role management and email invite (Phase 58)
- Full project lifecycle: archive (read-only soft-delete), permanent delete with pre-flight validation, restore, portfolio separation of archived projects, user logout (Phase 59)
- Health Dashboard redesigned with auto-derived metrics (overdue tasks, at-risk milestones, stale updates) — no manual input required (Phase 60)
- Ingestion edit-before-approve with note entity reclassification (type dropdown, field remap, correct routing on approval); Analyze Completeness with per-field 0–100% scoring and conflicting detection (Phases 61–62)
- Skills Design Standard (YAML front-matter schema); editable prompts UI with CodeMirror editor, admin toggle, atomic file write + backup, audit log capture (Phases 63–64)
- Project-scoped scheduling: per-project jobs with RBAC, CreateJobWizard projectId wiring, state persistence, nav badge removed; global scheduler restricted to non-project jobs (Phase 65)
- Overview tracks hybrid static/dynamic redesign with Monday auto-scheduling via BullMQ; integration delete; Weekly Focus generate-now as quiet manual override (Phase 66)
- Delivery tab cleanup: Plan tab removed (Generate Plan → Task Board), WBS schema aligned, column hiding for ID/Source columns, Decisions repurposed for operational impact, stakeholder move and delete (Phase 67)
- Gantt bi-directional sync: WBS skeleton with full hierarchy (L1→L2→L3), ADR/Biggy track separation, edge drag handles, milestone drag, inline DatePickerCell, depth computed from parent chain (not stale level column) (Phase 68)
- Knowledge Base: audited and retained — use case is cross-project institutional knowledge capture, distinct from document ingestion (Phase 69)

**Known gaps accepted:**
- INGEST-02: Move approved ingested item to different section — deferred to v8.0
- OUT-01: Outputs section audit — dropped (not worth the work)
- TEST-01: 4 portfolio TDD RED stubs — dropped (stubs remain but not blocking)

---

## v6.0 Dashboard, Navigation & Intelligence (Shipped: 2026-04-14)

**Phases completed:** 16 phases, 45 plans, 49 tasks

**Key accomplishments:**
- (none recorded)

---

## v5.0 Workspace UX Overhaul (Shipped: 2026-04-07)

**Phases completed:** 6 phases (37–42), 29 plans, 34 tasks
**Code delta:** ~42,385 LOC TypeScript (cumulative)
**Timeline:** 5 days (2026-04-03 → 2026-04-07)

**Key accomplishments:**
- Full inline editing for Actions, Risks, Milestones — table row edits with date pickers and owner autocomplete, no modal required for common updates (Phase 37)
- Custom split-panel Gantt (GanttChart.tsx) with milestone markers as dashed vertical lines, swim lanes, drag-to-reschedule, and Day/Week/Month/Quarter view toggle (Phase 38)
- Cross-tab metrics sync via CustomEvent (metrics:invalidate) after entity edits, clickable risk distribution chart drill-downs, overdue task highlighting, and wired bulk status actions (Phase 39)
- Global search bar across all project data, Decisions tab filtering, artifact reverse lookup, and audit-driven Engagement History auto-log (Phase 40)
- Actionable empty states with CTAs across all tabs, consistent overdue treatment (red border + background) for Actions/Milestones/Tasks, and loading skeletons (Phase 41)
- Full ingestion field coverage: task dates/FKs/priority, milestone owner, action notes/type, cross-entity ID resolution, and unresolvedRefs notice in IngestionModal (Phase 42)

**Tech debt recorded:**
- Empty state CTA onClick handlers are () => {} placeholders — wiring to creation forms deferred to v6.0
- Skills execution path resolution — hardcoded paths in skill runner (portability issue, captured as todo)
- ActionsTableClient dispatch test needs refactor (deferred, non-blocking)
- 1 resolveEntityRef mock chain test failure (non-blocking; real behavior confirmed manually)

---

## v4.0 Infrastructure & UX Foundations (Shipped: 2026-04-03)

**Phases completed:** 5 phases (31–35), 26 plans, 41 tasks
**Code delta:** +25,843 / −2,793 lines across 150 files
**Timeline:** 3 days (2026-04-01 → 2026-04-03)
**Known gaps:** TEST-01 (6 test failures) — deferred to v6.0

**Key accomplishments:**
- Document extraction moved to BullMQ background job — browser-refresh resilient, 11 UAT bugs found and fixed (Phase 31)
- Time tracking redesigned as standalone global /time-tracking section with cross-project view and weekly grouping (Phase 32)
- Overview tab workstream structure: ADR/Biggy dual-track with DB migration, auto-seeding on project create, completeness indicator removed (Phase 33)
- Overview metrics & health dashboard: Recharts visualizations, OverviewMetrics, HealthDashboard, MilestoneTimeline components (Phase 34)
- Weekly Focus AI-generated priorities via BullMQ + Redis cache, redesigned integration tracker split by ADR/Biggy workstream (Phase 35)

---

## v3.0 Collaboration & Intelligence (Shipped: 2026-04-01)

**Phases completed:** 33 phases, 178 plans, 32 tasks

**Key accomplishments:**
- (none recorded)

---

