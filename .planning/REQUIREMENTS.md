# Requirements: BigPanda Project Intelligence App

**Defined:** 2026-03-04
**Core Value:** The dashboard gives instant health visibility across all customers — at-risk flagging, % complete, open action counts, high-severity risks — so nothing slips through the cracks.

## v1 Requirements

### Infrastructure & Backend (INFRA)

- [x] **INFRA-01**: Server reads all `*_Master_Status.yaml` files from a designated Google Drive folder using a service account
- [x] **INFRA-02**: Server writes updated YAML back to Drive atomically (read → modify in memory → write full file — never partial)
- [x] **INFRA-03**: YAML is parsed and serialized with js-yaml using options that prevent type coercion (yes/no/on/off stay as strings) and preserve key order and multiline strings
- [x] **INFRA-04**: yamlService enforces the fixed schema on every read and write — all top-level keys must be present, no extra keys allowed
- [x] **INFRA-05**: Sequential ID assignment (A-###, R-###, X-###) is enforced server-side by reading all existing IDs and incrementing the highest
- [ ] **INFRA-06**: Express REST API exposes all endpoints specified in the brief (GET /api/customers, GET/PUT /api/customers/:id, PATCH action endpoints, POST /api/reports/generate)
- [ ] **INFRA-07**: Vite proxy routes `/api` requests to Express — no CORS package used
- [x] **INFRA-08**: Environment variables loaded from `.env` (ANTHROPIC_API_KEY, GOOGLE_SERVICE_ACCOUNT_PATH, DRIVE_FOLDER_ID, PORT)
- [x] **INFRA-09**: `.env.example` with all required keys and inline comments
- [ ] **INFRA-10**: `npm run dev` starts both Express and Vite concurrently, app opens at localhost:3000

### Dashboard — View 1 (DASH)

- [ ] **DASH-01**: Customer cards displayed in a responsive grid, one card per customer YAML file
- [ ] **DASH-02**: Each card shows: customer name, overall status badge (On Track / At Risk / Off Track), days to go-live, overall % complete, open action count, open high-severity risk count (red if > 0)
- [ ] **DASH-03**: Cards sorted: At Risk first, then On Track, then Off Track
- [ ] **DASH-04**: "View" button on each card navigates to that customer's overview
- [ ] **DASH-05**: Overall status derived from most recent history entry workstream statuses (red → Off Track, any yellow → At Risk, all green → On Track)
- [ ] **DASH-06**: % complete is the average of all sub-workstream percentages from the most recent history entry
- [ ] **DASH-07**: Days to go-live calculated from the nearest planned milestone date
- [ ] **DASH-08**: UI updates optimistically — Drive data refreshes in background on mount

### Customer Overview — View 2 (CUST)

- [ ] **CUST-01**: Persistent left sidebar shows all customers; active customer highlighted; clicking any navigates to that customer's overview
- [ ] **CUST-02**: Header shows customer name, project name, overall status badge, go-live target date, last updated date (from metadata.updated_on), and "Generate Report" button
- [ ] **CUST-03**: Workstream health section: ADR and Biggy cards side by side; each card lists its sub-workstreams as rows with progress bar, percentage label, status dot (green/yellow/red), and truncated progress note with tooltip
- [ ] **CUST-04**: Sub-workstream names match exactly: ADR (Inbound Integrations, Configuration, Outbound Integrations, Workflow Configuration) and Biggy (Integrations, Workflow Configuration)
- [ ] **CUST-05**: Workstream data pulled from the most recent history entry
- [ ] **CUST-06**: Open actions summary shows count and the 3 most overdue actions; "Manage Actions" button navigates to Action Manager
- [ ] **CUST-07**: Risks section lists risks sorted by severity (high first); each row shows description, owner, status badge; existing risk fields are editable inline (description, owner, mitigation, severity, status)
- [ ] **CUST-08**: Milestones section lists milestones chronologically; each row shows name, date, status badge; existing milestone fields are editable inline (name, date, status)
- [ ] **CUST-09**: All inline edits in CUST-07/CUST-08 write to Drive atomically and update the UI optimistically with a "Saving…" indicator
- [ ] **CUST-10**: New risks and milestones are added via the YAML editor (not inline in this view)

### Action Manager — View 3 (ACT)

- [x] **ACT-01**: Open actions displayed in a sortable table with columns: checkbox, ID (monospace), description, owner, due date, status badge, workstream, actions
- [x] **ACT-02**: Checking the checkbox immediately marks the action complete as of today, moves it to the completed table, and writes updated YAML to Drive atomically — no confirmation dialog
- [ ] **ACT-03**: UI updates optimistically on checkbox click; "Saving…" indicator shown until Drive confirms
- [x] **ACT-04**: Description and owner are editable inline on click; changes write to Drive on blur/enter
- [x] **ACT-05**: Due date is editable inline; renders red if the date is in the past
- [x] **ACT-06**: Status badge cycles on click: Open → Delayed → In Review → Open; each cycle writes to Drive
- [x] **ACT-07**: Workstream field is a dropdown matching the fixed workstream hierarchy
- [ ] **ACT-08**: Table supports sort by any column header; filter by workstream (dropdown) and by status (toggle buttons: All / Open / Delayed / In Review)
- [x] **ACT-09**: "Add Action" row pinned to bottom of open table with fields: description, owner, due, workstream, Save button; Save assigns the next sequential A-### ID and writes to Drive
- [ ] **ACT-10**: Completed actions table is collapsed by default and expandable; columns: ID, description, owner, due, completed date; each row has a "Reopen" button
- [x] **ACT-11**: "Reopen" moves the action back to open with status: open and clears the completion date; writes to Drive atomically
- [x] **ACT-12**: "Mark Delayed" button in actions column sets status to delayed and optionally accepts a new due date inline

### Report Generator — View 4 (RPT)

- [ ] **RPT-01**: Report type selection with four options: Weekly Customer Status, Internal ELT Deck, External ELT Deck, Both ELT Decks
- [ ] **RPT-02**: "Generate" button POSTs to `/api/reports/generate` with customer ID and report type
- [ ] **RPT-03**: Loading state shown during generation with a status message (generation takes 10-20 seconds)
- [ ] **RPT-04**: Backend calls Claude API (`claude-sonnet-4-6`) with system prompt, full template text, full customer YAML, and current date; uses streaming to avoid Express timeout
- [ ] **RPT-05**: Weekly Status output: rendered preview styled like an email; "Copy to Clipboard" and "Download as .txt" buttons
- [ ] **RPT-06**: ELT Deck output: Claude returns structured JSON matching the slide schema in the brief; backend passes to pptxService which builds PPTX using pptxgenjs; "Download PPTX" button; slide-by-slide text preview panel
- [ ] **RPT-07**: PPTX delivered as base64 in JSON response; client decodes and triggers download
- [ ] **RPT-08**: PPTX style constants (colors, fonts, shadow) match exactly the spec in the brief
- [ ] **RPT-09**: All background shapes drawn before all text (z-order rule enforced in pptxService)
- [ ] **RPT-10**: System prompt enforces: never invent data, never expose internal risk severity in external reports, follow template structure exactly

### YAML Editor — View 5 (YAML)

- [ ] **YAML-01**: CodeMirror 6 editor with YAML syntax highlighting loads current YAML from Drive on mount
- [ ] **YAML-02**: "Validate" button runs yamlService schema check and shows errors inline in the editor
- [ ] **YAML-03**: "Save to Drive" button writes the validated YAML back; disabled if validation errors exist
- [ ] **YAML-04**: Unsaved changes warning shown when navigating away with pending edits
- [ ] **YAML-05**: Banner warns that saving strips any YAML comments (js-yaml limitation)

### Artifact Manager — View 6 (ART)

- [ ] **ART-01**: Lists all artifacts for the current customer (id, type, title, status, owner, last_updated) in a table
- [ ] **ART-02**: "Add Artifact" inline row at bottom of table; Save assigns next sequential X-### ID and writes to Drive
- [ ] **ART-03**: All artifact fields are editable inline: type (dropdown matching schema types), title, description, status (dropdown: active / in_review / superseded / retired), owner
- [ ] **ART-04**: Status change to superseded or retired writes to Drive atomically
- [ ] **ART-05**: All writes optimistic with "Saving…" indicator

### Weekly Update Form — View 7 (UPD)

- [ ] **UPD-01**: Form to create a new history entry for the current week; week_of defaults to today's date
- [ ] **UPD-02**: Per-workstream section for each sub-workstream: status selector (green/yellow/red), percent_complete slider/input, progress_notes text field, blockers text field
- [ ] **UPD-03**: Summary section: multi-entry fields for progress bullets, decisions, and outcomes for the week
- [ ] **UPD-04**: Submit prepends a new well-formed history entry to the YAML history array and writes to Drive atomically
- [ ] **UPD-05**: After successful submit, navigates back to Customer Overview (which now reflects the new entry)

### Reusable UI Components (UI)

- [ ] **UI-01**: StatusBadge component: On Track (green) / At Risk (yellow) / Off Track (red)
- [ ] **UI-02**: ProgressBar component: two overlapping rectangles (gray background, teal foreground) sized by percent_complete
- [ ] **UI-03**: Sidebar component: persistent customer list with active state, usable across all customer views

## v2 Requirements

### Enhanced Navigation

- **NAV-01**: Global cross-customer action search (find overdue actions across all customers)
- **NAV-02**: Overdue actions roll-up panel on Dashboard
- **NAV-03**: History timeline view — read past weekly entries as a browsable list

### Quick Entry

- **QE-01**: Action quick-add from Customer Overview (without navigating to Action Manager)

### Advanced Risk Management

- **RISK-01**: Ability to add new risks inline in Customer Overview (currently requires YAML editor)

### Inline Milestone Creation

- **MILE-01**: Ability to add new milestones inline in Customer Overview (currently requires YAML editor)

## Out of Scope

| Feature | Reason |
|---------|---------|
| Multi-user / authentication | Local single-user app by design |
| Real-time sync / webhooks | No background process; Drive polling not needed for 1-user |
| Mobile / responsive design | Desktop-only local tool |
| Email sending from the app | Reports are copied/downloaded; no SMTP integration |
| YAML versioning / undo history | Drive's built-in version history is sufficient |
| Customer YAML creation wizard | New customers added manually to Drive |
| Drag-and-drop reordering | Adds complexity; not needed for 1-10 customers |
| In-app notifications / OS alerts | Requires daemon infrastructure; dashboard IS the notification system |
| Report archiving | Out of scope for v1; reports are generated on demand |
| Monaco Editor | CodeMirror 6 chosen instead — smaller bundle, sufficient for occasional YAML edits |
| CORS package | Vite proxy used instead; CORS not needed for local dev |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1: Foundation | Complete |
| INFRA-02 | Phase 1: Foundation | Complete |
| INFRA-03 | Phase 1: Foundation | Complete |
| INFRA-04 | Phase 1: Foundation | Complete |
| INFRA-05 | Phase 1: Foundation | Complete |
| INFRA-06 | Phase 1: Foundation | Pending |
| INFRA-07 | Phase 1: Foundation | Pending |
| INFRA-08 | Phase 1: Foundation | Complete |
| INFRA-09 | Phase 1: Foundation | Complete |
| INFRA-10 | Phase 1: Foundation | Pending |
| DASH-01 | Phase 2: Read Surface | Pending |
| DASH-02 | Phase 2: Read Surface | Pending |
| DASH-03 | Phase 2: Read Surface | Pending |
| DASH-04 | Phase 2: Read Surface | Pending |
| DASH-05 | Phase 2: Read Surface | Pending |
| DASH-06 | Phase 2: Read Surface | Pending |
| DASH-07 | Phase 2: Read Surface | Pending |
| DASH-08 | Phase 2: Read Surface | Pending |
| CUST-01 | Phase 2: Read Surface | Pending |
| CUST-02 | Phase 2: Read Surface | Pending |
| CUST-03 | Phase 2: Read Surface | Pending |
| CUST-04 | Phase 2: Read Surface | Pending |
| CUST-05 | Phase 2: Read Surface | Pending |
| CUST-06 | Phase 2: Read Surface | Pending |
| CUST-07 | Phase 2: Read Surface | Pending |
| CUST-08 | Phase 2: Read Surface | Pending |
| CUST-09 | Phase 2: Read Surface | Pending |
| CUST-10 | Phase 2: Read Surface | Pending |
| UI-01 | Phase 2: Read Surface | Pending |
| UI-02 | Phase 2: Read Surface | Pending |
| UI-03 | Phase 2: Read Surface | Pending |
| ACT-01 | Phase 3: Action Manager | Complete |
| ACT-02 | Phase 3: Action Manager | Complete |
| ACT-03 | Phase 3: Action Manager | Pending |
| ACT-04 | Phase 3: Action Manager | Complete |
| ACT-05 | Phase 3: Action Manager | Complete |
| ACT-06 | Phase 3: Action Manager | Complete |
| ACT-07 | Phase 3: Action Manager | Complete |
| ACT-08 | Phase 3: Action Manager | Pending |
| ACT-09 | Phase 3: Action Manager | Complete |
| ACT-10 | Phase 3: Action Manager | Pending |
| ACT-11 | Phase 3: Action Manager | Complete |
| ACT-12 | Phase 3: Action Manager | Complete |
| UPD-01 | Phase 4: Structured Write Views | Pending |
| UPD-02 | Phase 4: Structured Write Views | Pending |
| UPD-03 | Phase 4: Structured Write Views | Pending |
| UPD-04 | Phase 4: Structured Write Views | Pending |
| UPD-05 | Phase 4: Structured Write Views | Pending |
| ART-01 | Phase 4: Structured Write Views | Pending |
| ART-02 | Phase 4: Structured Write Views | Pending |
| ART-03 | Phase 4: Structured Write Views | Pending |
| ART-04 | Phase 4: Structured Write Views | Pending |
| ART-05 | Phase 4: Structured Write Views | Pending |
| RPT-01 | Phase 5: AI Reports and YAML Editor | Pending |
| RPT-02 | Phase 5: AI Reports and YAML Editor | Pending |
| RPT-03 | Phase 5: AI Reports and YAML Editor | Pending |
| RPT-04 | Phase 5: AI Reports and YAML Editor | Pending |
| RPT-05 | Phase 5: AI Reports and YAML Editor | Pending |
| RPT-06 | Phase 5: AI Reports and YAML Editor | Pending |
| RPT-07 | Phase 5: AI Reports and YAML Editor | Pending |
| RPT-08 | Phase 5: AI Reports and YAML Editor | Pending |
| RPT-09 | Phase 5: AI Reports and YAML Editor | Pending |
| RPT-10 | Phase 5: AI Reports and YAML Editor | Pending |
| YAML-01 | Phase 5: AI Reports and YAML Editor | Pending |
| YAML-02 | Phase 5: AI Reports and YAML Editor | Pending |
| YAML-03 | Phase 5: AI Reports and YAML Editor | Pending |
| YAML-04 | Phase 5: AI Reports and YAML Editor | Pending |
| YAML-05 | Phase 5: AI Reports and YAML Editor | Pending |

**Coverage:**
- v1 requirements: 68 total
- Mapped to phases: 68
- Unmapped: 0

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 after roadmap creation (traceability expanded to per-requirement rows; count corrected from 58 to 68)*
