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
- [ ] **Phase 3: Action Manager** - Full inline action editing with atomic Drive writes and optimistic UI
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
- [ ] 01-01-PLAN.md — Wave 0: test stubs and sample.yaml fixture (yamlService tests)
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
  3. Customer Overview displays workstream health for all 6 sub-workstreams (ADR: 4, Biggy: 2) with progress bars, percentage labels, status dots, and truncated progress notes matching the most recent history entry
  4. Risks and milestones are visible in Customer Overview; existing risk and milestone fields are editable inline with a "Saving..." indicator that confirms Drive write success
  5. Persistent sidebar lists all customers; clicking any navigates to that customer's overview without losing current page state
**Plans**: TBD

### Phase 3: Action Manager
**Goal**: Users can manage all open actions for a customer — add, edit, complete, reopen, filter, and sort — with every change written atomically to Drive and reflected immediately in the UI
**Depends on**: Phase 2
**Requirements**: ACT-01, ACT-02, ACT-03, ACT-04, ACT-05, ACT-06, ACT-07, ACT-08, ACT-09, ACT-10, ACT-11, ACT-12
**Success Criteria** (what must be TRUE):
  1. Open actions table is sortable by any column and filterable by workstream and status; overdue due dates render red
  2. Checking an action's checkbox immediately moves it to the completed table and writes to Drive atomically — no confirmation dialog; a "Saving..." indicator appears and resolves
  3. Description, owner, due date, workstream, and status are all editable inline; each edit writes to Drive on blur/enter and updates the UI optimistically
  4. "Add Action" row at the bottom of the table assigns the next sequential A-### ID on save and writes to Drive
  5. Completed actions table is collapsed by default; "Reopen" moves an action back to open status with the completion date cleared
**Plans**: TBD

### Phase 4: Structured Write Views
**Goal**: Users can submit a structured weekly update that prepends a new history entry to the YAML, and can manage the full lifecycle of customer artifacts — add, edit, retire, and supersede — with all changes persisted atomically to Drive
**Depends on**: Phase 3
**Requirements**: UPD-01, UPD-02, UPD-03, UPD-04, UPD-05, ART-01, ART-02, ART-03, ART-04, ART-05
**Success Criteria** (what must be TRUE):
  1. Weekly Update Form pre-fills week_of with today's date and provides per-workstream inputs (status, %, progress notes, blockers) for all 6 sub-workstreams
  2. Submitting the form prepends a new well-formed history entry to the YAML and writes to Drive atomically; Customer Overview immediately reflects the new entry after redirect
  3. Artifact Manager lists all customer artifacts with id, type, title, status, owner, and last_updated; all fields are editable inline with a "Saving..." indicator
  4. Adding a new artifact assigns the next sequential X-### ID; changing status to superseded or retired writes to Drive atomically
**Plans**: TBD

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
| 1. Foundation | 0/5 | Not started | - |
| 2. Read Surface | 0/TBD | Not started | - |
| 3. Action Manager | 0/TBD | Not started | - |
| 4. Structured Write Views | 0/TBD | Not started | - |
| 5. AI Reports and YAML Editor | 0/TBD | Not started | - |
