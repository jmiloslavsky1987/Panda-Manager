# Requirements: BigPanda AI Project Management App

**Defined:** 2026-04-01
**Milestone:** v4.0 — Infrastructure & UX Foundations
**Core Value:** Every PS delivery intelligence the team has built — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

## v4.0 Requirements

### Test Failures

- [ ] **TEST-01**: All 13 pre-existing test failures across 6 files are resolved with root-cause fixes (not assertion workarounds)

### Document Extraction

- [ ] **EXTR-01**: User can navigate away from a document upload without losing the extraction — job runs in background via BullMQ
- [ ] **EXTR-02**: User can see extraction progress (% complete, current chunk) while the job is running
- [ ] **EXTR-03**: A failed or partial extraction does not leave orphaned data in workspace tabs — all changes commit atomically when complete

### Time Tracking

- [ ] **TIME-01**: User can view all time entries across all projects from a standalone top-level /time-tracking section
- [ ] **TIME-02**: User can assign or attribute each time entry to a project from the global view
- [ ] **TIME-03**: Per-project time tracking tab is removed from the workspace

### Overview — Workstream Structure

- [ ] **WORK-01**: Overview tab displays ADR and Biggy onboarding progress as separate parallel sections with standardized phase models (ADR: Discovery & Kickoff → Integrations → Platform Configuration → Teams → UAT; Biggy: Discovery & Kickoff → IT Knowledge Graph → Platform Configuration → Teams → Validation)
- [ ] **WORK-02**: Project Completeness indicator is removed from the Overview tab

### Overview — Weekly Focus

- [ ] **WKFO-01**: Overview tab displays a weekly focus summary showing the top 3–5 priorities for the current week, auto-refreshed on a weekly cadence
- [ ] **WKFO-02**: Circular progress bar is retained in the weekly focus section, tied to meaningful progress data (not removed Completeness metric)

### Overview — Milestone Timeline

- [ ] **TMLN-01**: Milestone timeline is positioned near the top of the Overview tab and rendered as a visual timeline (not a text list)

### Overview — Integration Tracker

- [ ] **OINT-01**: Integration tracker is split into ADR and Biggy sections, with each section's integrations categorized by type (ADR: Inbound, Outbound, Enrichment; Biggy: Real-time, Context/Knowledge/UDC)

### Overview — Metrics

- [ ] **METR-01**: Overview tab includes a Metrics section showing onboarding progress indicators: milestones completed, integration completion counts, validation progress, team enablement progress

### Overview — Health Dashboard

- [ ] **HLTH-01**: Overview tab includes a Health Dashboard section showing: overall project health, risk status by severity, phase health by workstream (ADR vs Biggy), active blockers, and trend indicators

## Future Requirements (v5.0+)

### UI Polish

- **UI-02**: Color palette, typography, spacing, and component styling modernized throughout (deferred from v3.0)

### QA & Standardization

- **QA-01**: Thorough tab-by-tab UAT with documented fixes backlog
- **QA-02**: Consistent UI patterns for empty states, tables, status badges, loading states across all tabs and reports

## Out of Scope

| Feature | Reason |
|---------|--------|
| BullMQ job cancellation (extraction) | Adds state complexity; restart is acceptable workaround for v4.0 |
| Bulk edit in global time tracking view | Existing per-project bulk actions sufficient; global bulk deferred to v5.0 |
| Custom ADR/Biggy phase editor | Phase model is standardized and fixed per requirements — no user customization |
| Redirect from old per-project time tab | Tab is removed entirely; no redirect needed |
| Customer-facing read-only portal | Deferred — email updates sufficient |
| pgvector/RAG knowledge base | Structured DB context sufficient at single-project scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | TBD | Pending |
| EXTR-01 | TBD | Pending |
| EXTR-02 | TBD | Pending |
| EXTR-03 | TBD | Pending |
| TIME-01 | TBD | Pending |
| TIME-02 | TBD | Pending |
| TIME-03 | TBD | Pending |
| WORK-01 | TBD | Pending |
| WORK-02 | TBD | Pending |
| WKFO-01 | TBD | Pending |
| WKFO-02 | TBD | Pending |
| TMLN-01 | TBD | Pending |
| OINT-01 | TBD | Pending |
| METR-01 | TBD | Pending |
| HLTH-01 | TBD | Pending |

**Coverage:**
- v4.0 requirements: 15 total
- Mapped to phases: 0 (roadmap not yet created)
- Unmapped: 15 ⚠️

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 after initial definition*
