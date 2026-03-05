# Roadmap: BigPanda Project Intelligence App

## Overview

Five phases in dependency order: backend services first (Drive + YAML block everything), then the read surface (validates the data model end-to-end with real Drive data), then the highest-frequency write view (Action Manager proves the atomic write pattern), then the remaining structured write views (Weekly Update Form + Artifact Manager), and finally the AI-powered Report Generator and YAML Editor (isolated external dependencies, safest to build last). Each phase delivers a complete, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Backend scaffold, Drive service, YAML service, Vite proxy, React Router skeleton
- [ ] **Phase 2: Read Surface** - Dashboard and Customer Overview powered by real Drive data
- [ ] **Phase 3: Project Setup + Action Manager** - Project Setup screen for workstream scope intake; full inline action editing with atomic Drive writes and optimistic UI
- [ ] **Phase 4: Structured Write Views** - Weekly Update Form and Artifact Manager
- [ ] **Phase 5: AI Reports and YAML Editor** - Claude report generation, PPTX export, CodeMirror editor

## Phase Details

### Phase 1: Foundation
**Goal**: The app starts, connects to Google Drive, reads and validates customer YAMLs, and exposes a working API — so every subsequent phase builds on a verified data layer
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09, INFRA-10
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts both Express and Vite concurrently; browser opens at localhost:3000 with no console errors
  2. `GET /api/health/drive` returns 200 and lists the customer YAMLs found in the Drive folder (proves service account auth and correct scope)
  3. `GET /api/customers` returns all parsed customer objects with all top-level schema keys present; no YAML type coercion errors on fields like `status: on`
  4. `PUT /api/customers/:id` round-trips a YAML without data loss: field order preserved, multiline strings intact, no boolean coercion
  5. All 7 view routes render placeholder components (no blank screen, no missing Outlet errors)
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Wave 0: test stubs and sample.yaml fixture (yamlService tests)
- [ ] 01-02-PLAN.md — Wave 1: driveService.js, server dependencies, .env.example, .gitignore
- [ ] 01-03-PLAN.md — Wave 1: yamlService.js, asyncWrapper, errorHandler, fill test assertions
- [ ] 01-04-PLAN.md — Wave 2: Express server scaffold with all 8 route files
- [ ] 01-05-PLAN.md — Wave 3: Vite + React scaffold, concurrently dev runner, human verification

### Phase 2: Read Surface
**Goal**: Users can see health status for all customers at a glance on the Dashboard, and drill into any customer's full workstream, risk, milestone, and action summary on the Customer Overview
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, CUST-01, CUST-02, CUST-03, CUST-04, CUST-05, CUST-06, CUST-07, CUST-08, CUST-09, CUST-10, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. Dashboard shows one card per customer YAML, sorted At Risk first then On Track then Off Track, with correct name, status badge, days to go-live, % complete, open action count, and high-severity risk count
  2. Clicking "View" on any card navigates to that customer's Customer Overview without a page reload
  3. Customer Overview displays workstream health for all 11 sub-workstreams (ADR: 6, Biggy: 5) with progress bars, percentage labels, status dots, and truncated progress notes; scope tags shown for inbound_integrations, outbound_integrations, udc, real_time_integrations
  4. Risks and milestones are visible in Customer Overview; existing risk and milestone fields are editable inline with a "Saving..." indicator that confirms Drive write success
  5. Persistent sidebar lists all customers; clicking any navigates to that customer's overview without losing current page state
**Plans**: 5 plans

Plans:
- [ ] 02-01-PLAN.md — Wave 0: test stubs (risks.test.js, milestones.test.js, deriveCustomer.test.js), install supertest + clsx, deriveCustomer.js skeleton
- [ ] 02-02-PLAN.md — Wave 1: Implement PATCH risks + milestones endpoints, fill test assertions
- [ ] 02-03-PLAN.md — Wave 1: Client shared components (StatusBadge, ProgressBar, deriveCustomer.js full) + Dashboard.jsx
- [ ] 02-04-PLAN.md — Wave 1: CustomerOverview.jsx (workstream health, risks/milestones inline edit, actions summary)
- [ ] 02-05-PLAN.md — Wave 2: Sidebar.jsx + AppLayout wiring + visual browser checkpoint

### Phase 3: Project Setup + Action Manager
**Goal**: Users can configure the scope and initial status of all 11 sub-workstreams via a dedicated Project Setup screen, and can manage all open actions for a customer — add, edit, complete, reopen, filter, and sort — with every change written atomically to Drive and reflected immediately in the UI
**Depends on**: Phase 2
**Requirements**: ACT-01, ACT-02, ACT-03, ACT-04, ACT-05, ACT-06, ACT-07, ACT-08, ACT-09, ACT-10, ACT-11, ACT-12
**Success Criteria** (what must be TRUE):
  1. Project Setup screen at `/customer/:id/setup` renders all 11 sub-workstreams grouped by ADR/Biggy; scope-enabled sub-workstreams (inbound_integrations, outbound_integrations, udc, real_time_integrations) show a tag-input for tools in scope
  2. Saving Project Setup writes the full `workstreams` nested object to Drive atomically and Customer Overview immediately reflects the new scope tags and statuses
  3. Open actions table is sortable by any column and filterable by workstream and status; overdue due dates render red
  4. Checking an action's checkbox immediately moves it to the completed table and writes to Drive atomically — no confirmation dialog; a "Saving..." indicator appears and resolves
  5. Description, owner, due date, workstream, and status are all editable inline; each edit writes to Drive on blur/enter and updates the UI optimistically
  6. "Add Action" row at the bottom of the table assigns the next sequential A-### ID on save and writes to Drive
  7. Completed actions table is collapsed by default; "Reopen" moves an action back to open status with the completion date cleared
**Plans**: 6 plans

Plans:
- [ ] 03-01-PLAN.md — Wave 1: Update sample.yaml (11 subworkstreams), test stubs (actions.test.js, workstreams.test.js), deriveCustomer WORKSTREAM_OPTIONS + STATUS_CYCLE
- [ ] 03-02-PLAN.md — Wave 2: Implement POST + PATCH actions endpoints, fill actions.test.js assertions
- [ ] 03-03-PLAN.md — Wave 2: Create workstreams route + PATCH endpoint + mount in server/index.js
- [ ] 03-04-PLAN.md — Wave 3: ProjectSetup.jsx + setup route in main.jsx + api.js additions + CustomerOverview Link fix
- [ ] 03-05-PLAN.md — Wave 3: ActionManager.jsx (full inline CRUD table, sort/filter, add action, completed table)
- [ ] 03-06-PLAN.md — Wave 4: Full suite test run + human visual verification checkpoint

### Phase 4: Structured Write Views
**Goal**: Users can submit a structured weekly update that prepends a new history entry to the YAML, and can manage the full lifecycle of customer artifacts — add, edit, retire, and supersede — with all changes persisted atomically to Drive
**Depends on**: Phase 3
**Requirements**: UPD-01, UPD-02, UPD-03, UPD-04, UPD-05, ART-01, ART-02, ART-03, ART-04, ART-05
**Success Criteria** (what must be TRUE):
  1. Weekly Update Form pre-fills week_ending with today's date and provides per-workstream inputs (status, %, progress notes, blockers) for all 11 sub-workstreams (ADR: 6, Biggy: 5)
  2. Submitting the form prepends a new well-formed history entry to the YAML and writes to Drive atomically; Customer Overview immediately reflects the new entry after redirect
  3. Artifact Manager lists all customer artifacts with id, type, title, status, owner, and last_updated; all fields are editable inline with a "Saving..." indicator
  4. Adding a new artifact assigns the next sequential X-### ID; changing status to superseded or retired writes to Drive atomically
**Plans**: 6 plans

Plans:
- [x] 04-01-PLAN.md — Wave 0: Test stubs (artifacts.test.js + history.test.js)
- [ ] 04-02-PLAN.md — Wave 1: artifacts.js endpoints (POST + PATCH) + test assertions
- [ ] 04-03-PLAN.md — Wave 1: history.js POST endpoint + test assertions (parallel with 04-02)
- [ ] 04-04-PLAN.md — Wave 2: Extract InlineEditField/InlineSelectField + api.js additions + ArtifactManager.jsx
- [ ] 04-05-PLAN.md — Wave 2: WeeklyUpdateForm.jsx
- [ ] 04-06-PLAN.md — Wave 3: Full suite test run + human visual verification checkpoint

### Phase 5: AI Reports and YAML Editor
**Goal**: Users can generate Claude-powered reports (weekly status text and ELT PPTX decks) from any customer's data, and can directly edit and validate raw customer YAML in a syntax-highlighted editor as an escape hatch
**Depends on**: Phase 4
**Requirements**: RPT-01, RPT-02, RPT-03, RPT-04, RPT-05, RPT-06, RPT-07, RPT-08, RPT-09, RPT-10, YAML-01, YAML-02, YAML-03, YAML-04, YAML-05
**Success Criteria** (what must be TRUE):
  1. Selecting a report type and clicking Generate shows a loading state for the 10-20 second generation; the Generate button is disabled during generation to prevent double-submit
  2. Weekly Status report renders a styled preview with working "Copy to Clipboard" and "Download as .txt" buttons
  3. ELT Deck report produces a downloadable PPTX file with correct colors, fonts, and z-order (background shapes drawn before all text); a slide-by-slide text preview is visible before download
  4. YAML Editor loads the current customer YAML in a CodeMirror 6 editor with syntax highlighting; "Validate" surfaces schema errors inline; "Save to Drive" is disabled when validation errors exist
  5. Navigating away from the YAML Editor with unsaved changes shows a warning; a banner warns that saving strips YAML comments
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/5 | In Progress|  |
| 2. Read Surface | 0/5 | Not started | - |
| 3. Project Setup + Action Manager | 6/6 | Complete | 2026-03-05 |
| 4. Structured Write Views | 3/6 | In Progress|  |
| 5. AI Reports and YAML Editor | 0/TBD | Not started | - |
