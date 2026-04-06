# BigPanda Project Intelligence App

## What This Is

A local single-user web app for managing BigPanda customer implementation projects. It reads and writes customer YAML files stored in Google Drive, provides a clean UI for managing workstreams, action items, risks, milestones, and artifacts, and generates structured reports via the Claude API. It replaces a manual workflow currently split across multiple Claude.ai projects.

## Core Value

The dashboard gives instant health visibility across all customers — at-risk flagging, overall % complete, open action counts, high-severity risks — so nothing slips through the cracks.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Dashboard (View 1)**
- [ ] Customer cards in a grid sorted by risk: At Risk → On Track → Off Track
- [ ] Each card shows: name, overall status badge, days to go-live, % complete, open action count, high-severity risk count
- [ ] Clicking "View" navigates to Customer Overview

**Customer Overview (View 2)**
- [ ] Header: customer name, project name, overall status badge, go-live date, last updated date, "Generate Report" button
- [ ] Workstream health section: ADR and Biggy cards side-by-side with sub-workstream rows (progress bar, %, status dot, progress note)
- [ ] Open actions summary with count and 3 most overdue, linked to Action Manager
- [ ] Risks section: sorted by severity (high first), inline add/edit/close risk entries
- [ ] Milestones section: chronological list, inline add/edit milestone entries

**Action Manager (View 3)**
- [ ] Open actions table with columns: checkbox, ID, description, owner, due, status, workstream, actions
- [ ] Checkbox immediately completes action, writes updated YAML to Drive atomically
- [ ] Inline editing for description, owner, due date, status (cycles on click), workstream
- [ ] Overdue due dates render red
- [ ] Inline "Add Action" row pinned to bottom; save assigns next sequential A-### ID
- [ ] Sort by any column, filter by workstream and status
- [ ] Completed actions table (collapsed by default) with Reopen button
- [ ] All Drive writes are atomic: read → modify in memory → write full YAML

**Report Generator (View 4)**
- [ ] Report type selection: Weekly Customer Status, Internal ELT Deck, External ELT Deck, Both ELT Decks
- [ ] Generate button triggers Claude API call with full customer YAML + template
- [ ] Loading state shown during 10-20 second generation
- [ ] Weekly Status: rendered preview + Copy to Clipboard + Download .txt
- [ ] ELT Decks: Claude returns structured JSON → pptxService builds PPTX → Download PPTX button + slide-by-slide text preview

**YAML Editor (View 5)**
- [ ] Monaco or CodeMirror editor with YAML syntax highlighting
- [ ] Loads current YAML from Drive on mount
- [ ] Validate button: runs schema check, shows errors inline
- [ ] Save to Drive button: writes validated YAML back
- [ ] Unsaved changes warning on navigation

**Artifact Manager (View 6)**
- [ ] Table/list of all artifacts for a customer (id, type, title, status, owner, last_updated)
- [ ] Add artifact inline with next sequential X-### ID
- [ ] Edit artifact fields inline: type, title, description, status, owner, related_topics, linked_actions
- [ ] Retire/supersede artifacts (status change)
- [ ] Atomic Drive write on every change

**Weekly Update Form (View 7)**
- [ ] Form to create a new history entry (current week)
- [ ] Per-workstream inputs: status (green/yellow/red), percent_complete, progress_notes, blockers
- [ ] Fields for decisions and outcomes for the week
- [ ] On submit: prepends new history entry to YAML history array, writes to Drive atomically

**Backend & Services**
- [ ] Express REST API with all endpoints defined in brief
- [ ] Google Drive integration: list, read, write YAML files via service account
- [ ] Claude API integration (claude-sonnet-4-6) for report generation
- [ ] pptxgenjs PPTX builder from Claude JSON output
- [ ] YAML parse/serialize with schema validation (no extra fields, all top-level keys required)
- [ ] Action/Risk/Artifact sequential ID assignment enforced server-side

### Out of Scope

- Multi-user / authentication — local single-user app only
- Real-time collaboration or sync
- Mobile app / responsive design beyond desktop
- Email sending from within the app (reports are copied/downloaded)
- YAML versioning / undo history beyond Drive's built-in version history
- Customer YAML creation wizard (new customers added manually to Drive)

## Context

- Replaces a workflow split across multiple Claude.ai projects — the user currently manages implementation health manually
- Small dataset: 1-10 active customer YAMLs; performance is not a bottleneck
- All YAMLs live in a single Google Drive folder: `BigPanda/ProjectAssistant/`
- File naming convention: `[Customer]_Master_Status.yaml`
- Authentication via Google service account (credentials gitignored)
- The workstream hierarchy is fixed and must exactly match the brief: ADR (Inbound Integrations, Configuration, Outbound Integrations, Workflow Configuration) and Biggy (Integrations, Workflow Configuration)
- YAML schema is fixed — the app must never add or remove top-level keys

## Constraints

- **Tech Stack**: React + Tailwind CSS frontend, Node.js + Express backend, Google Drive API v3, Anthropic SDK — all as specified in brief
- **Runtime**: Local only — `npm run dev` opens at localhost:3000; no deployment target
- **Model**: claude-sonnet-4-6 (upgraded from brief's claude-sonnet-4-5 to latest)
- **YAML schema**: Immutable — enforce strictly in yamlService.js
- **Drive writes**: Always atomic (read → modify → write full file); never partial writes

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| claude-sonnet-4-6 instead of claude-sonnet-4-5 | Latest model, better quality, same API surface | — Pending |
| Added Artifact Manager view | YAML schema has full artifacts section with no UI coverage in original brief | — Pending |
| Added inline risk/milestone editing to Customer Overview | Without it, every risk/milestone change requires YAML editor — too slow for daily use | — Pending |
| Added Weekly Update form (View 7) | History entries are created weekly; YAML editor is too cumbersome for a recurring structured task | — Pending |
| Dashboard is top priority | User identified it as the must-work-at-launch feature | — Pending |

---
*Last updated: 2026-03-04 after initialization*
