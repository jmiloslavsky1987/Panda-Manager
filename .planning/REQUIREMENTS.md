# Requirements: BigPanda AI Project Management App

**Defined:** 2026-03-25
**Milestone:** v2.0 — AI Ingestion & Enhanced Operations
**Core Value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

---

## v2.0 Requirements

### SCHEMA — Data Model Extensions
*Foundation for all other v2.0 features. Must land in the first phase.*

- [x] **SCHEMA-01**: DB gains `discovery_items` table (id, project_id, source, content, suggested_field, suggested_value, status: pending/approved/dismissed, scan_timestamp, source_url)
- [x] **SCHEMA-02**: DB gains `audit_log` table (id, entity_type, entity_id, action, actor_id, before_json, after_json, timestamp)
- [x] **SCHEMA-03**: `time_entries` extended with submitted_on, submitted_by, approved_on, approved_by, rejected_on, rejected_by, locked (boolean)
- [x] **SCHEMA-04**: `artifacts` table extended with ingestion_status (pending/extracting/preview/approved/failed) and ingestion_log_json
- [x] **SCHEMA-05**: `scheduled_jobs` extended with last_run_outcome (success/failure/partial), run_history_json, timezone, skill_params_json
- [x] **SCHEMA-06**: DB gains `business_outcomes` table (id, project_id, title, track, description, delivery_status, mapping_note)
- [x] **SCHEMA-07**: DB gains `e2e_workflows` table (id, project_id, team_name, workflow_name) with child `workflow_steps` (id, workflow_id, label, track, status, position)
- [x] **SCHEMA-08**: DB gains `focus_areas` table (id, project_id, title, tracks, why_it_matters, current_status, next_step, bp_owner, customer_owner)
- [x] **SCHEMA-09**: DB gains `architecture_integrations` table (id, project_id, tool_name, track, phase, status, integration_method, notes)
- [x] **SCHEMA-10**: DB gains `before_state` table (id, project_id, aggregation_hub_name, alert_to_ticket_problem, pain_points_json)
- [x] **SCHEMA-11**: DB gains `team_onboarding_status` table (id, project_id, team_name, track, ingest_status, correlation_status, incident_intelligence_status, sn_automation_status, biggy_ai_status)

### INGESTION — Document Ingestion
*Net new — no file upload or AI extraction capability exists today.*

- [x] **ING-01**: User can upload one or more files (PDF, DOCX, PPTX, XLSX, MD, TXT) via drag-and-drop or file browse from the project Artifacts tab
- [x] **ING-02**: Platform validates file type and size (max 50 MB per file) before accepting upload; shows a clear error on rejection
- [x] **ING-03**: Uploaded files are stored on disk at the configured workspace path and an Artifact record is created in the DB with ingestion_status: pending
- [x] **ING-04**: Claude extracts structured project data from the document targeting all entity types: actions, risks, decisions, stakeholders, milestones, tasks, architecture notes, engagement history, business outcomes, team data
- [x] **ING-05**: Extraction results are shown as a structured preview grouped by destination tab, with a confidence indicator per item and the source text excerpt
- [x] **ING-06**: User can approve, edit, or reject each extracted item individually before it is written to the DB
- [x] **ING-07**: User can bulk-approve all extracted items in one action after reviewing the preview
- [x] **ING-08**: Platform detects conflicts with existing records and prompts: merge, replace, or skip — not a silent overwrite
- [x] **ING-09**: Confirmed items are written to the appropriate DB tables with source attribution (filename, upload timestamp) and the artifact_id as source reference
- [x] **ING-10**: Each ingestion event is logged: filename, upload time, items extracted, approved, rejected; artifact.ingestion_log_json updated
- [x] **ING-11**: Uploading a new version of a previously ingested document triggers the preview-and-confirm flow — no silent overwrite of existing data
- [x] **ING-12**: Incremental uploads only surface net-new items not already present in the DB — already-ingested data is not re-presented

### DISC — External Discovery Scan
*Net new — MCP connectors (Slack, Gmail, Glean, Gong) exist and are unchanged; scan logic and review queue are new.*

- [x] **DISC-01**: User can manually trigger a discovery scan for any project via a "Scan for Updates" button in the project sidebar
- [x] **DISC-02**: Discovery scan can be configured as a recurring scheduled job per project via the Scheduler (SCHED-01)
- [x] **DISC-03**: Per-project scan configuration defines which sources to include: Slack, Gmail, Glean, Gong (any combination)
- [x] **DISC-04**: Platform shows an in-app notification when a scan completes and items are pending review
- [x] **DISC-05**: Slack scan: searches configured channels for messages mentioning the project or customer name since the last scan timestamp; retrieves full thread context for matching messages
- [x] **DISC-06**: Gmail scan: searches inbox for emails matching project or customer keywords since the last scan timestamp; retrieves full email threads
- [x] **DISC-07**: Glean scan: searches for documents and content matching the project name since the last scan timestamp
- [x] **DISC-08**: Gong scan: retrieves call transcripts for the customer since the last scan timestamp
- [x] **DISC-09**: Claude analyzes all scan results and identifies: action items, decisions, risks, blockers, status updates — outputs structured DiscoveryItem records
- [x] **DISC-10**: Review Queue page accessible from the project sidebar and from a global notification badge showing pending item count
- [x] **DISC-11**: Each queue item displays: source tool, date found, source excerpt, suggested destination tab/field, Claude's extracted value
- [x] **DISC-12**: User can Approve, Edit then Approve, or Dismiss each queue item individually
- [x] **DISC-13**: User can bulk-approve all items in the queue in one action
- [x] **DISC-14**: Approved items are written to the appropriate DB tables with source attribution (source tool, scan timestamp)
- [x] **DISC-15**: Dismissed items are retained in dismissal history (status = dismissed) — not permanently deleted
- [x] **DISC-16**: Queue items have no expiry — they remain pending until explicitly acted upon
- [x] **DISC-17**: When a discovered item conflicts with an existing record, a side-by-side diff view is shown before the merge/replace/skip prompt

### WIZ — Project Initiation Wizard
*Net new — projects are currently created by manually seeding the DB; there is no guided onboarding flow.*

- [x] **WIZ-01**: User can create a new project via a guided multi-step wizard accessible from the Dashboard; the wizard replaces direct DB seed as the primary new-project flow
- [x] **WIZ-02**: Wizard step 1 captures: project name, customer name, status, start date, expected end date, description; creates Project and initialises all tab data structures in DB
- [x] **WIZ-03**: Wizard presents the recommended collateral checklist (SOW, Kickoff Deck, Discovery Notes, Presales Notes, Customer Org Chart, Prior Tracker, Gong Transcripts, Architecture Diagram Notes, Budget Sheet) and triggers the ingestion pipeline for each uploaded file
- [x] **WIZ-04**: Wizard shows AI extraction preview grouped by destination tab across all uploaded documents; user approves before any data is written to DB
- [x] **WIZ-05**: Wizard step allows manual addition of items not captured in documents via inline forms per tab
- [ ] **WIZ-06**: Wizard step configures time tracking for the project: weekly capacity, working days, submission due date, approver
- [x] **WIZ-07**: Wizard launch step shows a completeness summary; clicking "Launch Project" sets project status to Active
- [x] **WIZ-08**: Platform calculates a Project Completeness Score (0–100%) based on the proportion of tabs that have at least one populated record
- [x] **WIZ-09**: Completeness score is visible on the project Overview tab; a prompt appears when score falls below 60% identifying specific gaps

### TTADV — Time Tracking Advanced
*Extends the existing basic time entry tab (Phase 5.2/14). The entry grid exists; approval, calendar integration, admin config, and notifications do not.*

- [ ] **TTADV-01**: Admin can enable/disable time tracking globally from Settings > Time Tracking; disabled by default for new installs
- [ ] **TTADV-02**: Admin can configure: weekly capacity (hours), working days, submission due date/time, and reminder frequency
- [ ] **TTADV-03**: Admin can create and manage custom time entry categories (e.g., Development, QA, Discovery, Meetings)
- [ ] **TTADV-04**: Admin can restrict time entry to assigned projects only and filter by project status (e.g., Active only)
- [ ] **TTADV-05**: Admin can designate specific team members as exempt from submission requirements and reminders
- [ ] **TTADV-06**: Admin can lock timesheets after approval, preventing further edits without explicit unlock
- [ ] **TTADV-07**: User can submit their timesheet for the current week via a "Submit Week for Approval" action
- [ ] **TTADV-08**: Approver can approve or reject individual time entries and can approve/reject in bulk
- [ ] **TTADV-09**: Approver can submit a timesheet on behalf of a team member
- [ ] **TTADV-10**: Approved time entries are locked for editing unless the approver or admin explicitly overrides
- [ ] **TTADV-11**: User can authenticate with Google Calendar via OAuth and import events from the current week as draft time entries
- [ ] **TTADV-12**: System auto-matches each imported calendar event to a project by comparing event attendees against project participant lists; pre-populates for user review
- [ ] **TTADV-13**: User can override the auto-matched project or assign unmatched events to any project or mark as non-project activity
- [ ] **TTADV-14**: Imported time entries are created on the event date, not the import date
- [ ] **TTADV-15**: Approver can bulk-approve, bulk-reject, bulk-move (between projects), and bulk-delete time entries
- [ ] **TTADV-16**: Time entry table is exportable to CSV and Excel; export includes audit fields (submitted/approved/rejected on/by)
- [ ] **TTADV-17**: Table supports grouping by: project, team member, status, role, phase, or task — with billable/non-billable subtotals per group
- [ ] **TTADV-18**: Submission reminder notifications are sent before the due date and again when overdue (exempt users excluded)
- [ ] **TTADV-19**: Approval and rejection notifications are sent to the submitting user with a summary

### SCHED — Scheduler Enhanced
*Extends the existing basic scheduler (Phases 4/15). The job runner and cron engine exist; the configurable UI, run history, and admin view do not.*

- [ ] **SCHED-01**: User can create a new scheduled job via a "Create Job" wizard from the Scheduler page
- [ ] **SCHED-02**: Supported job frequencies: once, daily, weekly (pick day), bi-weekly, monthly (pick day of month), custom cron expression
- [ ] **SCHED-03**: Each job has a configurable run time (hour + minute) with timezone support; defaults to browser timezone on creation
- [ ] **SCHED-04**: Each job supports skill-specific configuration parameters (e.g., which project to scope, which Slack channels to scan, which customer)
- [ ] **SCHED-05**: Jobs can be enabled or disabled without deleting them; disabled jobs do not run but retain their config and history
- [ ] **SCHED-06**: Any job can be manually triggered on demand regardless of its next scheduled run time
- [ ] **SCHED-07**: Scheduler UI shows per job: Last Run timestamp, Last Run Outcome (success/failure/partial), and Next Run time
- [ ] **SCHED-08**: Failed job runs generate an in-app notification to the job creator with an error summary
- [ ] **SCHED-09**: Each job maintains a run history log: run time, outcome, duration, and links to output artifacts or error messages
- [ ] **SCHED-10**: Scheduler page is accessible from the main sidebar navigation
- [ ] **SCHED-11**: Create Job wizard guides through: skill selection, scope (global/per-project/per-user), frequency, time, and skill-specific parameters
- [ ] **SCHED-12**: All 12 skills are schedulable via the wizard: Morning Briefing, Customer Project Tracker, Weekly Customer Status, ELT External, ELT Internal, Biggy Weekly Briefing, Context Updater, Meeting Summary, Workflow Diagram, Team Engagement Map, Discovery Scan, Timesheet Reminder

### AUDIT — Source Attribution & Audit Trail
*Extends all workspace tabs; requires SCHEMA-01 and SCHEMA-02 to be in place first.*

- [ ] **AUDIT-01**: All workspace tab records display a source badge: "Manual", "Ingested — [filename]", or "Discovered — [source tool]"
- [ ] **AUDIT-02**: All data modifications (create, update, delete) on workspace records are written to audit_log with actor, timestamp, entity, and before/after JSON values
- [ ] **AUDIT-03**: Deletion of any workspace record requires a confirmation dialog and is always logged to audit_log

### TEAMS — Teams Tab: Team Engagement Map View
*Replaces the existing basic Teams tab with a rich, DB-powered 5-section engagement view. The team-engagement-map skill is updated to export from DB.*

- [x] **TEAMS-01**: Teams tab renders a 5-section Team Engagement Map view: (1) Business Value & Expected Outcomes, (2) Architecture overview (ADR + Biggy panels), (3) End-to-End Workflows, (4) Teams & Engagement Status cards, (5) Top Focus Areas
- [x] **TEAMS-02**: Business Value & Outcomes section renders outcome cards with: icon + title, track pills (ADR/Biggy/Both), delivery status badge (Live/In Progress/Blocked/Planned), and a mapping note — all sourced from DB, not inferred or generic
- [x] **TEAMS-03**: Architecture section within the Teams tab shows ADR panel (left, blue) and Biggy panel (right, purple) side by side, each listing integration nodes with live/in-progress/planned status using the defined design tokens
- [x] **TEAMS-04**: End-to-End Workflows section renders per-team step sequences with track ownership (ADR blue / Biggy purple) and status per step; arrows connect steps
- [x] **TEAMS-05**: Teams & Engagement Status section renders one card per team with: ADR track status items, Biggy track status items (if applicable), E2E workflow note (if applicable), top 2–3 open items as plain text (no ticket IDs), and footer status tags
- [x] **TEAMS-06**: Top Focus Areas section renders 3–5 cards with: title, track pills, why it matters (1–2 sentences), current status + next step, and named owners (customer-side and BigPanda-side)
- [x] **TEAMS-07**: Any section that cannot be fully populated from DB renders a visible yellow warning banner inside that section — content is never silently omitted or replaced with generic copy
- [x] **TEAMS-08**: Users can add and edit business outcomes, E2E workflow steps, focus areas, and team card data inline within the Teams tab (same optimistic-UI pattern as all other tabs)
- [x] **TEAMS-09**: For AMEX, the Teams tab enforces the canonical 8-team structure and order: ITSM & Platform Ops, Loyalty, Observability & Monitoring, OETM/Infrastructure, MIM Team, Global Remittance, Merchant Domain, Change Management
- [x] **TEAMS-10**: team-engagement-map skill is updated to read from DB (business_outcomes, e2e_workflows, focus_areas, team card data) and generate a self-contained HTML export of the same 5-section view
- [x] **TEAMS-11**: Design tokens applied consistently: ADR `#1e40af`/`#eff6ff`/`#bfdbfe`, Biggy `#6d28d9`/`#f5f3ff`/`#ddd6fe`, E2E `#065f46`/`#ecfdf5`/`#6ee7b7`, with Live/In Progress/Blocked/Planned status colors

### ARCH — Architecture Tab: Workflow Diagram View
*Replaces the existing basic Architecture tab with a rich, DB-powered 2-tab before/after diagram. The workflow-diagram skill is updated to export from DB.*

- [x] **ARCH-01**: Architecture tab renders a two-tab Workflow Diagram: "Before BigPanda" (grey dot) and "Current & Future State" (green dot); tab switching works without page reload
- [ ] **ARCH-02**: Before BigPanda tab renders a horizontal 5-phase flow: Event Sources → Aggregation Hub → Ticket Creation → Incident Response → Resolution — all tool names sourced from customer DB data, no placeholders
- [x] **ARCH-03**: Before BigPanda tab renders 5–6 customer-specific pain point cards below the phase flow (sourced from before_state.pain_points — no generic placeholders)
- [ ] **ARCH-04**: Current & Future State tab renders the ADR Track (5 phase columns with status pills on each node) separated from Biggy AI Track by a full-width bold amber divider labeled "↓ BIGGY AI TRACK ↓"
- [ ] **ARCH-05**: ADR Track renders phase columns: Event Ingest → Alert Intelligence (Normalization sub-group + Correlation sub-group) → Incident Intelligence → Console (🐼 BigPanda Console) → Workflow Automation — each node shows tool name, method, and status pill
- [ ] **ARCH-06**: Biggy AI Track renders phase columns: Knowledge Sources (Ingested) → Real-Time Query Sources → Biggy Capabilities → Console (🤖 Biggy AI Console) → Outputs & Actions — each node shows integration name and status pill
- [ ] **ARCH-07**: Team Onboarding Status table rendered below both tracks — columns: Team / Ingest & Normalization / Alert Correlation / Incident Intelligence / SN Automation / Biggy AI; split into ADR Track section (blue header) and Biggy AI Track section (amber header) with a dot legend
- [x] **ARCH-08**: All integration/capability nodes carry status pills: LIVE (green `#dcfce7`/`#14532d`) / In Progress (amber `#fef3c7`/`#92400e`) / Pilot (same as In Progress) / Planned (gray `#f1f5f9`/`#475569`)
- [ ] **ARCH-09**: Users can add and edit integration nodes, before-state data, pain points, and team onboarding status inline within the Architecture tab
- [x] **ARCH-10**: workflow-diagram skill is updated to read from DB (architecture_integrations, before_state, team_onboarding_status) and generate a self-contained HTML export of the same 2-tab diagram
- [x] **ARCH-11**: Customer-specific rules applied: Kaiser ADR panel shows "live in production" framing (not onboarding flow); Amex Before tab shows "Sahara" as the orange aggregation hub; Merck renders mostly Planned status
- [x] **ARCH-12**: Architecture tab view renders self-contained when exported — no external CSS/JS dependencies; correct at 1280px and 1600px widths

---

## Deferred to v2.1

- User Access & Roles: multi-user auth (email+password, Google OAuth login), RBAC (Admin/Project Owner/User roles), user invitation flow, per-user project scoping
- Approver hierarchy (TT-205): single approver sufficient for v2.0 single-user context

## Out of Scope

| Feature | Reason |
|---------|--------|
| Microsoft Outlook Calendar integration | Permanently excluded — BRD explicit exclusion |
| Custom role builder | Post-launch roadmap item — BRD explicit exclusion |
| Customer-facing read-only portal | Auth complexity; email updates sufficient |
| QBR deck generator | External ELT deck covers the need |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | Phase 17 | Complete |
| SCHEMA-02 | Phase 17 | Complete |
| SCHEMA-03 | Phase 17 | Complete |
| SCHEMA-04 | Phase 17 | Complete |
| SCHEMA-05 | Phase 17 | Complete |
| SCHEMA-06 | Phase 17 | Complete |
| SCHEMA-07 | Phase 17 | Complete |
| SCHEMA-08 | Phase 17 | Complete |
| SCHEMA-09 | Phase 17 | Complete |
| SCHEMA-10 | Phase 17 | Complete |
| SCHEMA-11 | Phase 17 | Complete |
| ING-01 | Phase 18 | Complete |
| ING-02 | Phase 18 | Complete |
| ING-03 | Phase 18 | Complete |
| ING-04 | Phase 18 | Complete |
| ING-05 | Phase 18 | Complete |
| ING-06 | Phase 18 | Complete |
| ING-07 | Phase 18 | Complete |
| ING-08 | Phase 18 | Complete |
| ING-09 | Phase 18 | Complete |
| ING-10 | Phase 18 | Complete |
| ING-11 | Phase 18 | Complete |
| ING-12 | Phase 18 | Complete |
| DISC-01 | Phase 19 | Complete |
| DISC-02 | Phase 19 | Complete |
| DISC-03 | Phase 19 | Complete |
| DISC-04 | Phase 19 | Complete |
| DISC-05 | Phase 19 | Complete |
| DISC-06 | Phase 19 | Complete |
| DISC-07 | Phase 19 | Complete |
| DISC-08 | Phase 19 | Complete |
| DISC-09 | Phase 19 | Complete |
| DISC-10 | Phase 19 | Complete |
| DISC-11 | Phase 19 | Complete |
| DISC-12 | Phase 19 | Complete |
| DISC-13 | Phase 19 | Complete |
| DISC-14 | Phase 19 | Complete |
| DISC-15 | Phase 19 | Complete |
| DISC-16 | Phase 19 | Complete |
| DISC-17 | Phase 19 | Complete |
| WIZ-01 | Phase 20 | Complete |
| WIZ-02 | Phase 20 | Complete |
| WIZ-03 | Phase 20 | Complete |
| WIZ-04 | Phase 20 | Complete |
| WIZ-05 | Phase 20 | Complete |
| WIZ-06 | Phase 20 | Pending |
| WIZ-07 | Phase 20 | Complete |
| WIZ-08 | Phase 20 | Complete |
| WIZ-09 | Phase 20 | Complete |
| TEAMS-01 | Phase 21 | Complete |
| TEAMS-02 | Phase 21 | Complete |
| TEAMS-03 | Phase 21 | Complete |
| TEAMS-04 | Phase 21 | Complete |
| TEAMS-05 | Phase 21 | Complete |
| TEAMS-06 | Phase 21 | Complete |
| TEAMS-07 | Phase 21 | Complete |
| TEAMS-08 | Phase 21 | Complete |
| TEAMS-09 | Phase 21 | Complete |
| TEAMS-10 | Phase 21 | Complete |
| TEAMS-11 | Phase 21 | Complete |
| ARCH-01 | Phase 21 | Complete |
| ARCH-02 | Phase 21 | Pending |
| ARCH-03 | Phase 21 | Complete |
| ARCH-04 | Phase 21 | Pending |
| ARCH-05 | Phase 21 | Pending |
| ARCH-06 | Phase 21 | Pending |
| ARCH-07 | Phase 21 | Pending |
| ARCH-08 | Phase 21 | Complete |
| ARCH-09 | Phase 21 | Pending |
| ARCH-10 | Phase 21 | Complete |
| ARCH-11 | Phase 21 | Complete |
| ARCH-12 | Phase 21 | Complete |
| AUDIT-01 | Phase 22 | Pending |
| AUDIT-02 | Phase 22 | Pending |
| AUDIT-03 | Phase 22 | Pending |
| TTADV-01 | Phase 23 | Pending |
| TTADV-02 | Phase 23 | Pending |
| TTADV-03 | Phase 23 | Pending |
| TTADV-04 | Phase 23 | Pending |
| TTADV-05 | Phase 23 | Pending |
| TTADV-06 | Phase 23 | Pending |
| TTADV-07 | Phase 23 | Pending |
| TTADV-08 | Phase 23 | Pending |
| TTADV-09 | Phase 23 | Pending |
| TTADV-10 | Phase 23 | Pending |
| TTADV-11 | Phase 23 | Pending |
| TTADV-12 | Phase 23 | Pending |
| TTADV-13 | Phase 23 | Pending |
| TTADV-14 | Phase 23 | Pending |
| TTADV-15 | Phase 23 | Pending |
| TTADV-16 | Phase 23 | Pending |
| TTADV-17 | Phase 23 | Pending |
| TTADV-18 | Phase 23 | Pending |
| TTADV-19 | Phase 23 | Pending |
| SCHED-01 | Phase 24 | Pending |
| SCHED-02 | Phase 24 | Pending |
| SCHED-03 | Phase 24 | Pending |
| SCHED-04 | Phase 24 | Pending |
| SCHED-05 | Phase 24 | Pending |
| SCHED-06 | Phase 24 | Pending |
| SCHED-07 | Phase 24 | Pending |
| SCHED-08 | Phase 24 | Pending |
| SCHED-09 | Phase 24 | Pending |
| SCHED-10 | Phase 24 | Pending |
| SCHED-11 | Phase 24 | Pending |
| SCHED-12 | Phase 24 | Pending |

**Coverage:**
- v2.0 requirements: 96 total
- Mapped to phases: 96
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 — traceability populated by roadmapper agent; all 96 requirements mapped to Phases 17–24*
