# Requirements: BigPanda AI Project Management App

**Defined:** 2026-04-13
**Milestone:** v7.0 — Governance & Operational Maturity
**Core Value:** Every PS delivery intelligence the team has built — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

## v7.0 Requirements

### Auth & Access

- [x] **AUTH-01**: User can log out of the application from the navigation or user menu
- [x] **AUTH-02**: Admin can manage project membership and role assignments (Admin/User role per project)
- [x] **AUTH-03**: User with Admin role on a project has full access: delete, archive, user management, and global scheduler actions on that project
- [x] **AUTH-04**: User with User role on a project is restricted from destructive actions (delete, archive) and admin functions
- [x] **AUTH-05**: Role-based access is enforced at the route handler level for all project actions

### Project Lifecycle

- [x] **PROJ-01**: Admin can archive a project (soft-delete: project becomes read-only, preserved in system)
- [x] **PROJ-02**: Admin can permanently delete a project
- [x] **PROJ-03**: User can view archived projects in a dedicated archived projects view (read-only)
- [x] **PROJ-04**: Admin can restore an archived project back to active status

### Overview Tab

- [x] **OVRVW-01**: Overview section displays static onboarding tracks (ADR: Discovery & Kickoff, Platform Config, UAT; Biggy: Discovery & Kickoff, Platform Config, Validation) from hardcoded config — no Claude call, no Generate button
- [x] **OVRVW-02**: Overview section displays dynamic onboarding tracks (ADR: Integrations, Teams; Biggy: IT Knowledge Graph, Teams) populated from context and integration data
- [x] **OVRVW-03**: Weekly Focus generates automatically every Monday morning via scheduled job (not on manual trigger by default)
- [x] **OVRVW-04**: Weekly Focus "Generate Now" button is labeled and presented as a manual override
- [x] **OVRVW-05**: User can delete integrations from the Integration Tracker

### Health Dashboard

- [x] **HLTH-01**: Redesigned Health Dashboard displays project health metrics derivable solely from existing system data (no manual input required)
- [x] **HLTH-02**: Health Dashboard is optimized for at-a-glance executive readability

### Document Ingestion

- [x] **INGEST-01**: User can edit extracted field values on an ingested item before approving it
- [ ] **INGEST-02**: User can move an approved ingested item to a different workspace section
- [x] **INGEST-03**: "Scan for Updates" functionality is consolidated into the Document Ingestion tab (removed from individual workspace tabs)
- [x] **INGEST-04**: "Analyze Completeness" compares existing project data against the expected data model and surfaces specific missing, sparse, or conflicting sections/fields (not binary pass/fail)
- [x] **INGEST-05**: User can reclassify a note entity to any valid entity type in the draft modal (fields transform to target schema; approved note routes to the correct table on approval)

### Delivery Tab

- [ ] **DLVRY-01**: Gantt chart displays a static structural skeleton (phases, milestone markers) on page load without user action
- [ ] **DLVRY-02**: Gantt chart supports drag-edge date adjustment and manual date entry
- [ ] **DLVRY-03**: Date changes in Gantt propagate to milestone and task records across the application
- [ ] **DLVRY-04**: Date changes to milestones or tasks outside the Gantt propagate back to the Gantt display
- [ ] **DLVRY-05**: Plan tab is removed; "Generate Plan" button and functionality are available in the Task Board tab
- [ ] **DLVRY-06**: WBS structure is audited and aligned with Generate Plan output schema before reimplementation
- [ ] **DLVRY-07**: Actions tab hides ID and Source columns by default
- [ ] **DLVRY-08**: Risks tab hides ID column by default
- [ ] **DLVRY-09**: Milestones tab hides ID column by default
- [ ] **DLVRY-10**: Decisions entry form is scoped to operational impact documentation only (business transformation events, event intelligence improvements, automation and routing changes); existing records are preserved

### Team Tab

- [ ] **TEAM-01**: User can move a stakeholder to a different section
- [ ] **TEAM-02**: User can delete a stakeholder

### Skills

- [x] **SKILL-01**: A Skills Design Standard is defined and documented covering: input spec, output format, scheduling interface, and error/fallback behavior
- [x] **SKILL-02**: All previously grayed-out/disabled skills are audited and made functional
- [x] **SKILL-03a**: Admin can enable or disable prompt editing as a global setting (default: off; preserves "prompts must not be modified" constraint when off)
- [x] **SKILL-03b**: When prompt editing is globally enabled, user can view and edit the prompt for any skill from the Skills tab UI
- [x] **SKILL-04**: All skills produce output conforming to the Skills Design Standard

### Scheduler

- [x] **SCHED-01**: Global Scheduler section is restricted to non-project-specific jobs
- [x] **SCHED-02**: User can schedule skills/jobs within an individual project (project-scoped scheduling)
- [x] **SCHED-03**: Scheduler job list persists when navigating away and returning to the Scheduler
- [x] **SCHED-04**: Manually triggered job results appear in a job history / "Last Run" view in the Scheduler
- [x] **SCHED-05**: Nav badge next to Scheduler label in navigation is removed

### Portfolio Dashboard

- [x] **PORTF-01**: Portfolio dashboard displays archived projects in a separate view or filter, distinct from active projects
- [x] **PORTF-02**: Portfolio dashboard excludes permanently deleted projects from all views

### Knowledge Base

- [ ] **KB-01**: Knowledge Base is updated with a defined use case or deprecated/removed

### Outputs Section

- [ ] **OUT-01**: Outputs section is removed if its content is redundant with individual project access

### Testing

- [ ] **TEST-01**: 4 RED portfolio TDD stubs in `__tests__/portfolio/` are driven to GREEN

## Future Requirements

### v7.x Candidates (deferred from v7.0)

- Scheduled completeness analysis (on-demand sufficient for v7.0)
- Prompt version history / diff view (audit log captures runs; git is version control)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Project Export | Archive covers the preservation need; export bundle not required |
| Custom role builder | Two-tier Admin/User sufficient for v7.0 (PROJECT.md explicit exclusion) |
| Per-skill RBAC permissions | Granular skill permissions add complexity without clear need; skills safe by design |
| Scheduled completeness analysis | On-demand trigger is correct for v7.0; infrastructure exists if needed later |
| Microsoft Outlook Calendar integration | Permanent exclusion (BRD explicit) |
| pgvector/RAG knowledge base | Structured DB query context injection correct at single-project scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 59 | Complete |
| AUTH-02 | Phase 58 | Complete |
| AUTH-03 | Phase 58 | Complete |
| AUTH-04 | Phase 58 | Complete |
| AUTH-05 | Phase 58 | Complete |
| PROJ-01 | Phase 59 | Complete |
| PROJ-02 | Phase 59 | Complete |
| PROJ-03 | Phase 59 | Complete |
| PROJ-04 | Phase 59 | Complete |
| OVRVW-01 | Phase 66 | Complete |
| OVRVW-02 | Phase 66 | Complete |
| OVRVW-03 | Phase 66 | Complete |
| OVRVW-04 | Phase 66 | Complete |
| OVRVW-05 | Phase 66 | Complete |
| HLTH-01 | Phase 60 | Complete |
| HLTH-02 | Phase 60 | Complete |
| INGEST-01 | Phase 61 | Complete |
| INGEST-02 | Phase 61 | Pending |
| INGEST-03 | Phase 62 | Complete |
| INGEST-04 | Phase 62 | Complete |
| INGEST-05 | Phase 61 | Complete |
| DLVRY-01 | Phase 68 | Pending |
| DLVRY-02 | Phase 68 | Pending |
| DLVRY-03 | Phase 68 | Pending |
| DLVRY-04 | Phase 68 | Pending |
| DLVRY-05 | Phase 67 | Pending |
| DLVRY-06 | Phase 67 | Pending |
| DLVRY-07 | Phase 67 | Pending |
| DLVRY-08 | Phase 67 | Pending |
| DLVRY-09 | Phase 67 | Pending |
| DLVRY-10 | Phase 67 | Pending |
| TEAM-01 | Phase 67 | Pending |
| TEAM-02 | Phase 67 | Pending |
| SKILL-01 | Phase 63 | Complete |
| SKILL-02 | Phase 63 | Complete |
| SKILL-03a | Phase 64 | Complete |
| SKILL-03b | Phase 64 | Complete |
| SKILL-04 | Phase 63 | Complete |
| SCHED-01 | Phase 65 | Complete |
| SCHED-02 | Phase 65 | Complete |
| SCHED-03 | Phase 65 | Complete |
| SCHED-04 | Phase 65 | Complete |
| SCHED-05 | Phase 65 | Complete |
| PORTF-01 | Phase 59 | Complete |
| PORTF-02 | Phase 59 | Complete |
| KB-01 | Phase 69 | Pending |
| OUT-01 | Phase 69 | Pending |
| TEST-01 | Phase 69 | Pending |

**Coverage:**
- v7.0 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓

**Coverage validation:** 100% — all requirements mapped exactly once

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after v7.0 roadmap creation*
