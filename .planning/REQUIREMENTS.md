# Requirements: BigPanda AI Project Management App

**Defined:** 2026-04-03
**Milestone:** v5.0 — Workspace UX Overhaul
**Core Value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

## v5.0 Requirements

### Actions Table Overhaul (ACTN)

- [x] **ACTN-01**: User can view Actions in a table layout with columns for ID, description, owner, due date, status, and source badge
- [x] **ACTN-02**: User can edit action status, owner, and due date inline by clicking the table cell — no modal required
- [x] **ACTN-03**: User can filter Actions by owner and due date range in addition to existing status filter
- [x] **ACTN-04**: User can search Actions by description text
- [x] **ACTN-05**: User can bulk-update status for multiple selected actions via checkbox selection

### Inline Editing — Risks & Milestones (IEDIT)

- [x] **IEDIT-01**: User can edit Risk status, severity, owner, and mitigation inline in the Risks table row
- [x] **IEDIT-02**: User can edit Milestone status, target date, owner, and notes inline in the Milestones table row
- [x] **IEDIT-03**: Risk status uses a fixed dropdown (open / mitigated / resolved / accepted) replacing the current freeform text input
- [x] **IEDIT-04**: Milestone status uses a fixed dropdown (not_started / in_progress / completed / blocked) replacing the current freeform text input

### Forms: Date Pickers & Owner Autocomplete (FORM)

- [x] **FORM-01**: All entity edit surfaces (Actions, Risks, Milestones, Tasks) use a date picker component for date fields instead of freeform text
- [x] **FORM-02**: Owner field on Actions, Risks, Milestones, and Tasks offers autocomplete suggestions drawn from the project's stakeholder list
- [x] **FORM-03**: Owner autocomplete allows freeform entry for names not in the stakeholder list (backwards compatible)

### Gantt Overhaul (GNTT)

- [x] **GNTT-01**: Gantt chart displays milestone target dates as labelled vertical markers on the timeline
- [x] **GNTT-02**: User can switch Gantt view mode between Day, Week, Month, and Quarter Year via a UI toggle
- [x] **GNTT-03**: Gantt chart groups tasks under their associated milestone in labelled swim lanes
- [x] **GNTT-04**: User can drag task bars on the Gantt to reschedule start and end dates, saving immediately to the DB

### Cross-Tab Data Sync (SYNC)

- [x] **SYNC-01**: Editing a Risk, Action, or Milestone in its tab triggers an in-place refresh of Overview metrics without requiring the user to navigate away and back
- [x] **SYNC-02**: Clicking a severity segment in the Overview risk distribution chart navigates to the Risks tab pre-filtered to that severity
- [x] **SYNC-03**: Overview HealthDashboard "active blockers" count is replaced with a list of the actual blocked items with links to the relevant tab

### Plan Tab Improvements (PLAN)

- [x] **PLAN-01**: Tasks with past-due dates are visually highlighted (red styling) on the Task Board and Phase Board, consistent with Actions overdue style
- [x] **PLAN-02**: Phase Board and Task Board multi-select checkboxes are wired to a bulk status update action (currently dead UI)
- [x] **PLAN-03**: Gantt view colour-codes or groups tasks by their associated milestone so milestone membership is visible on the timeline

### Global Search & Filtering (SRCH)

- [x] **SRCH-01**: A global search bar accessible from the workspace header searches across all project data (actions, risks, milestones, tasks, decisions, stakeholders) using the existing full-text search API
- [x] **SRCH-02**: Decisions tab supports text search and date-range filtering
- [x] **SRCH-03**: Actions tab supports text search on the description field (in addition to status, owner, and date filters)

### Artifact Traceability (ARTF)

- [x] **ARTF-01**: Artifact detail view shows a list of all entities (risks, actions, milestones, decisions) extracted from that artifact, each linking to its record

### Engagement History & Audit Log (HIST)

- [x] **HIST-01**: Engagement History tab surfaces entries from the existing audit log table showing who changed what and when for risks, actions, milestones, and tasks — automatically, without manual curation

### Skills & Jobs UX (SKLS)

- [x] **SKLS-01**: Skills tab shows elapsed time and a progress indicator for currently running or queued jobs
- [x] **SKLS-02**: User can cancel a queued or in-progress skill job from the Skills tab

### UX Polish & Consistency (UXPOL)

- [ ] **UXPOL-01**: Every tab that can have zero records displays an actionable empty state with a short description and a CTA button
- [ ] **UXPOL-02**: Overdue visual treatment (red border + background) is applied consistently to overdue items across Actions, Milestones, and Tasks
- [ ] **UXPOL-03**: Loading skeletons are used consistently across all tabs that fetch data client-side

## v6.0 Requirements (Deferred)

### Test Suite (TEST)

- **TEST-01**: 6 remaining pre-existing test failures (create-project, launch, extraction-status DB mocks) resolved with root-cause fixes

### UI Visual Overhaul (UIVIZ)

- **UIVIZ-01**: Color palette, typography, spacing, and component styling modernised throughout the application

### Advanced Plan Features (ADVPLAN)

- **ADVPLAN-01**: Tasks and Actions can be linked to each other or promoted from one to the other

## Out of Scope

| Feature | Reason |
|---------|--------|
| Customer-facing read-only portal | External access deferred; email updates sufficient for now |
| Mobile / responsive layout audit | Web-first; tablet/phone testing deferred |
| Real-time collaborative editing (WebSockets) | High complexity; polling + refresh sufficient for current team size |
| Undo / redo for all edits | Complex state management; not worth engineering cost at this scale |
| In-app notifications / @mentions | No notification infrastructure; deferred |
| Calendar import for time entries | Google Cloud Console setup required; deferred |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACTN-01 | Phase 37 | Complete |
| ACTN-02 | Phase 37 | Complete |
| ACTN-03 | Phase 37 | Complete |
| ACTN-04 | Phase 37 | Complete |
| ACTN-05 | Phase 37 | Complete |
| IEDIT-01 | Phase 37 | Complete |
| IEDIT-02 | Phase 37 | Complete |
| IEDIT-03 | Phase 37 | Complete |
| IEDIT-04 | Phase 37 | Complete |
| FORM-01 | Phase 37 | Complete |
| FORM-02 | Phase 37 | Complete |
| FORM-03 | Phase 37 | Complete |
| SRCH-03 | Phase 37 | Complete |
| GNTT-01 | Phase 38 | Complete |
| GNTT-02 | Phase 38 | Complete |
| GNTT-03 | Phase 38 | Complete |
| GNTT-04 | Phase 38 | Complete |
| PLAN-03 | Phase 38 | Complete |
| SYNC-01 | Phase 39 | Complete |
| SYNC-02 | Phase 39 | Complete |
| SYNC-03 | Phase 39 | Complete |
| PLAN-01 | Phase 39 | Complete |
| PLAN-02 | Phase 39 | Complete |
| SRCH-01 | Phase 40 | Complete |
| SRCH-02 | Phase 40 | Complete |
| ARTF-01 | Phase 40 | Complete |
| HIST-01 | Phase 40 | Complete |
| SKLS-01 | Phase 40 | Complete |
| SKLS-02 | Phase 40 | Complete |
| UXPOL-01 | Phase 41 | Pending |
| UXPOL-02 | Phase 41 | Pending |
| UXPOL-03 | Phase 41 | Pending |

**Coverage:**
- v5.0 requirements: 31 distinct requirements (32 rows — ACTN-04 and SRCH-03 are the same deliverable, both mapped to Phase 37)
- Mapped to phases: 31/31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 — traceability populated after v5.0 roadmap creation*
