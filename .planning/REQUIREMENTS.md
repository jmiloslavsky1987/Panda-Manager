# Requirements: BigPanda AI Project Management App

**Defined:** 2026-04-07
**Milestone:** v6.0 — Dashboard, Navigation & Intelligence
**Core Value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

## v6.0 Requirements

### Dashboard

- [ ] **DASH-01**: User can view portfolio-level health summary showing total active projects, on track / at risk / off track counts, overdue milestones, and blocked project count
- [ ] **DASH-02**: User can view a visual status distribution rollup (chart or heatmap) on the portfolio dashboard
- [ ] **DASH-03**: User can view a multi-project portfolio table with standardized columns: name, owner, team, phase, health status, % complete, next milestone, next milestone date, risk level, dependency status, last updated, and exec action flag
- [ ] **DASH-04**: User can filter, sort, and search the portfolio table by status, owner, team, phase, priority, milestone date, risk level, and dependency state
- [ ] **DASH-05**: User can view an exceptions panel that surfaces projects with overdue milestones, stale updates, open blockers, missing ownership, or unresolved dependencies
- [ ] **DASH-06**: User can drill down from a portfolio table row into the individual project workspace

### Navigation

- [x] **NAV-01**: Delivery tab shows Plan as first sub-tab; old Intel and Phase Board URLs redirect to new locations (no broken links)
- [x] **NAV-02**: WBS, Task Board, and Gantt are promoted to direct sub-tabs of Delivery at the same level as Plan, Actions, Risks, and Milestones (no longer nested under Plan)
- [x] **NAV-03**: Swimlane view is removed from the application
- [x] **NAV-04**: Decisions sub-tab is moved from the Intel tab into the Delivery tab
- [x] **NAV-05**: Intel tab is removed; Engagement History sub-tab is moved to the Admin tab

### Risks & Milestones Parity

- [x] **RISK-01**: User can filter the Risks table by multiple dimensions (status, severity, owner, date range)
- [x] **RISK-02**: User can multi-select risks and apply bulk status or field updates
- [x] **MILE-01**: User can filter the Milestones table by multiple dimensions (status, owner, date range)
- [x] **MILE-02**: User can multi-select milestones and apply bulk status or field updates

### Work Breakdown Structure

- [x] **WBS-01**: Phase Board is replaced with a WBS view that displays both ADR and Biggy WBS templates as a collapsible 3-level hierarchy within a single project workspace
- [x] **WBS-02**: Both ADR and Biggy WBS template structures seed automatically on project creation
- [x] **WBS-03**: When context is uploaded, extracted tasks are auto-classified to the nearest WBS node via AI (with fallback to manual assignment)
- [x] **WBS-04**: "Generate Plan" button analyzes available project context, identifies missing WBS tasks, and fills gaps; re-runnable to catch tasks not covered in earlier runs
- [x] **WBS-05**: User can manually add, edit, reorder, and delete tasks within any WBS node

### Team Engagement Overview

- [ ] **TEAM-01**: Teams sub-tab (renamed "Team Engagement Overview") displays a 4-section engagement map: Business Outcomes, E2E Workflows, Teams & Engagement, and Top Focus Areas (Architecture section is covered by the dedicated Architecture tab — excluded from Overview per scope decision)
- [x] **TEAM-02**: Context upload extracts and routes structured data to populate all Team Engagement Map sections automatically
- [ ] **TEAM-03**: Sections with missing or incomplete data display a visible warning prompting the user to supply required content
- [ ] **TEAM-04**: Team Engagement Overview sub-tab is read-only; users edit content in the source tabs (Actions, Teams Detail). TEAM-04 is satisfied by those existing edit flows — no add/edit/delete controls exist in the Overview sub-tab.

### Architecture Diagrams

- [ ] **ARCH-01**: Architecture tab displays two sub-tabs: Before State (legacy flow with customer pain points) and Current & Future State
- [ ] **ARCH-02**: Current & Future State shows ADR Track (Event Ingest → Alert Intelligence → Incident Intelligence → Console → Workflow Automation) and AI Assistant Track (Knowledge Sources → Real-Time Query → AI Capabilities → Console → Outputs & Actions), each with per-node status indicators (Live / In Progress / Planned)
- [ ] **ARCH-03**: A Team Onboarding Status table below both tracks shows per-team, per-capability-stage status with colored indicators
- [x] **ARCH-04**: Context upload extracts and routes architecture data (tool names, integration statuses, team names, phase assignments) to populate both diagram tabs

### Skills

- [x] **SKILL-01**: Skill runner resolves SKILL.md file paths dynamically at runtime (no hardcoded absolute paths)

## Future Requirements

### Performance & Observability

- **PERF-01**: Portfolio dashboard query performance validated at 25+ projects (target <500ms)
- **PERF-02**: WBS tree rendering validated at 120+ nodes without perceptible lag
- **EXTR-01**: Extraction accuracy monitored — classification precision ≥80% after entity type expansion

### Deferred Capabilities

- **TEST-01**: 6 pre-existing test failures resolved (leftJoin/db.transaction/db.query mock setup)
- **CTA-01**: Empty state onClick handlers wired to actual creation forms
- **UIVIZ-01**: UI visual overhaul — color palette, typography, spacing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom dashboard widget builder | Infinite configuration = support burden; standardized layout covers PS team needs |
| Real-time collaboration cursors on WBS | WebSocket complexity not justified for single-user review surface |
| Resource allocation/leveling | Finance system is source of truth; conflict with external data |
| Video transcription in context upload | Digital docs (PDF/DOCX/PPTX) cover all PS delivery artifacts |
| Microsoft Outlook Calendar integration | Permanently excluded (BRD explicit exclusion) |
| Customer-facing read-only portal | Email updates sufficient; external access deferred |
| pgvector/RAG knowledge base | Structured DB query sufficient at single-project scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SKILL-01 | Phase 43 | Complete |
| NAV-01 | Phase 44 | Complete |
| NAV-02 | Phase 44 | Complete |
| NAV-03 | Phase 44 | Complete |
| NAV-04 | Phase 44 | Complete |
| NAV-05 | Phase 44 | Complete |
| RISK-01 | Phase 44 | Complete |
| RISK-02 | Phase 44 | Complete |
| MILE-01 | Phase 44 | Complete |
| MILE-02 | Phase 44 | Complete |
| WBS-01 | Phase 45 | Complete |
| WBS-02 | Phase 45 | Complete |
| WBS-03 | Phase 46 | Complete |
| TEAM-02 | Phase 46 | Complete |
| ARCH-04 | Phase 46 | Complete |
| WBS-04 | Phase 47 | Complete |
| WBS-05 | Phase 47 | Complete |
| ARCH-01 | Phase 48 | Pending |
| ARCH-02 | Phase 48 | Pending |
| ARCH-03 | Phase 48 | Pending |
| TEAM-01 | Phase 48 | Pending |
| TEAM-03 | Phase 48 | Pending |
| TEAM-04 | Phase 48 | Pending |
| DASH-01 | Phase 49 | Pending |
| DASH-02 | Phase 49 | Pending |
| DASH-03 | Phase 49 | Pending |
| DASH-04 | Phase 49 | Pending |
| DASH-05 | Phase 49 | Pending |
| DASH-06 | Phase 49 | Pending |

**Coverage:**
- v6.0 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after roadmap creation*
