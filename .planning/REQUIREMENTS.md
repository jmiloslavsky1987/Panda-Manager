# Requirements: BigPanda AI Project Management App

**Defined:** 2026-04-22
**Core Value:** Every PS delivery intelligence the team has built — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

## v9.0 Requirements

### Task Board

- [x] **TASK-01**: User can drag task cards between Kanban columns to update task status
- [x] **TASK-02**: User can select multiple task cards and change status in bulk
- [x] **TASK-03**: User can bulk delete selected task cards
- [x] **TASK-04**: User can toggle to Week view to see tasks grouped by due-date week
- [x] **TASK-05**: Tasks with no due date appear in an "Unscheduled" group in Week view

### Gantt

- [ ] **GANTT-01**: WBS phase date range is derived from earliest task start / latest task due date across all tasks assigned to that phase
- [ ] **GANTT-02**: User can save a Gantt baseline (snapshot of current phase and task dates)
- [ ] **GANTT-03**: User can toggle a ghost bar overlay showing baseline vs current schedule
- [ ] **GANTT-04**: User can see a Variance column (+/- days from baseline) for each Gantt row

### Pickers

- [x] **PICK-01**: User can assign owner on Tasks, Actions, Risks, and Milestones from a searchable stakeholder dropdown (saves stakeholder ID, not just display name)
- [x] **PICK-02**: Owner picker allows free-text fallback for assignees not in the stakeholder list
- [x] **PICK-03**: User can set "Blocked By" tasks via a searchable multi-select dropdown showing task titles (with chip display)
- [x] **PICK-04**: User can link a task to a milestone via a searchable dropdown showing milestone names
- [x] **PICK-05**: Tasks with unresolved blockers (blocking task not yet Done) display a blocked indicator on Task Board and WBS views

### Risk Register

- [x] **RISK-01**: User can set Likelihood (Low / Medium / High) on a risk
- [x] **RISK-02**: User can set Impact (Low / Medium / High) on a risk
- [x] **RISK-03**: User can set Target Date on a risk
- [x] **RISK-04**: Risk list displays auto-computed Risk Score derived from Likelihood × Impact

### Milestones

- [x] **MILE-01**: User can set Status on a milestone (On Track / At Risk / Complete / Missed)
- [x] **MILE-02**: Portfolio "Overdue Milestones" counter reflects live data (target_date < today AND status != Complete)

### Admin Settings

- [x] **ADMIN-01**: User can rename a project from Admin > Settings
- [x] **ADMIN-02**: User can set and edit a project go-live date from Admin > Settings
- [x] **ADMIN-03**: User can add and edit a project description/notes from Admin > Settings
- [x] **ADMIN-04**: User can enable or disable ADR Track and Biggy Track per project from Admin > Settings; disabling a track hides it from WBS, Gantt, and Overview

### Outputs Library

- [ ] **OUT-01**: User can view an inline preview of a skill output (markdown outputs rendered as formatted text; DOCX outputs rendered via docx-preview)
- [ ] **OUT-02**: PPTX outputs show slide count and a download link (no inline render)

### Health Dashboard

- [ ] **HLTH-01**: Project Overview displays an Exceptions panel listing specific, actionable issues detected in project data
- [ ] **HLTH-02**: Project health status (Healthy / At Risk / Red) is auto-computed from exception count and severity, replacing the manual health field
- [ ] **HLTH-03**: Each exception in the panel links directly to the relevant record or tab

### AI Skills

- [ ] **SKILL-01**: User can trigger Meeting Prep from the Skills tab (as a standard skill entry, using the existing skill execution infrastructure)
- [ ] **SKILL-02**: Meeting Prep brief includes open items, recent activity, and a suggested agenda derived from live project data
- [ ] **SKILL-03**: Meeting Prep output is rendered inline and copyable to clipboard
- [ ] **SKILL-04**: Meeting Prep prompt is editable via the existing Admin > Prompts UI (inherited from skill infrastructure)

## Future Requirements

### Stakeholder Contact Extraction

- **STKHLD-01**: Ingestion pipeline extracts and populates email addresses for stakeholders when present in source documents
- **STKHLD-02**: Ingestion pipeline extracts and populates Slack handles for stakeholders when present
- **STKHLD-03**: Extracted contact values are tagged as "ingested" and never overwrite manually-entered values

### Chat Persistence

- **CHAT-01**: Chat conversation history persists per project (last 50 messages restored on tab return)
- **CHAT-02**: User can pin individual AI responses to a persistent Pinned Answers section
- **CHAT-03**: "Clear conversation" clears chat history but leaves pinned answers intact

## Out of Scope

| Feature | Reason |
|---------|--------|
| Chat persistence and pinning | Deferred — stakeholder dropdown (PICK-01) covers the immediate owner-assignment need; chat persistence is lower priority |
| Stakeholder contact extraction from docs | High complexity; owner dropdown covers the immediate need without extraction changes |
| PPTX inline preview | No viable modern browser renderer without legacy jQuery/D3 dependencies |
| Gantt critical path | Task dependency data model insufficient for CPM until PICK-03 ships and data quality improves |
| AI auto-close of risks/actions | Violates audit-trail trust model; exceptions panel (HLTH-01) surfaces stale items instead |
| Multi-user real-time chat sync | WebSocket infrastructure not in stack |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MILE-01 | Phase 75 | Complete |
| MILE-02 | Phase 75 | Complete |
| TASK-01 | Phase 75 | Complete |
| TASK-02 | Phase 75 | Complete |
| TASK-03 | Phase 75 | Complete |
| TASK-04 | Phase 75 | Complete |
| TASK-05 | Phase 75 | Complete |
| ADMIN-01 | Phase 75 | Complete |
| ADMIN-02 | Phase 75 | Complete |
| ADMIN-03 | Phase 75 | Complete |
| ADMIN-04 | Phase 75 | Complete |
| PICK-01 | Phase 76 | Complete |
| PICK-02 | Phase 76 | Complete |
| PICK-03 | Phase 76 | Complete |
| PICK-04 | Phase 76 | Complete |
| PICK-05 | Phase 76 | Complete |
| RISK-01 | Phase 76 | Complete |
| RISK-02 | Phase 76 | Complete |
| RISK-03 | Phase 76 | Complete |
| RISK-04 | Phase 76 | Complete |
| HLTH-01 | Phase 77 | Pending |
| HLTH-02 | Phase 77 | Pending |
| HLTH-03 | Phase 77 | Pending |
| GANTT-01 | Phase 77 | Pending |
| GANTT-02 | Phase 77 | Pending |
| GANTT-03 | Phase 77 | Pending |
| GANTT-04 | Phase 77 | Pending |
| SKILL-01 | Phase 78 | Pending |
| SKILL-02 | Phase 78 | Pending |
| SKILL-03 | Phase 78 | Pending |
| SKILL-04 | Phase 78 | Pending |
| OUT-01 | Phase 78 | Pending |
| OUT-02 | Phase 78 | Pending |

**Coverage:**
- v9.0 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 — traceability revised to 4-phase v9.0 roadmap (Phases 75–78)*
