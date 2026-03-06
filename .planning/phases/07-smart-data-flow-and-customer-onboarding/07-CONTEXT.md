# Phase 7: Smart Data Flow and Customer Onboarding - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning
**Source:** User conversation — direct requirements

<domain>
## Phase Boundary

This phase addresses five interconnected improvements that make the app work better across the full customer lifecycle:
1. New customer creation with optional YAML upload to seed the customer file
2. Extended artifacts to capture notes/decisions that don't qualify as formal risks or actions
3. Weekly Update view removed — its data-entry step merged into the Reports → Weekly Status flow
4. ELT deck reports (Internal + External) pre-populated with timeline-scoped data
5. Project Setup auto-fills from the initial YAML on first load

</domain>

<decisions>
## Implementation Decisions

### New Customer Creation (MGT-01)
- Form with customer name and optional YAML file upload
- If YAML uploaded: use as the customer file (must validate against YAML schema)
- If no YAML: generate a template YAML with empty/default values for all required fields
- Customer appears in sidebar immediately after creation
- Creating a new customer requires Drive: server writes a new YAML file to the Drive folder
- "Which customer" identification is resolved by the creation form itself — the user names the customer during creation

### Extended Artifacts — Notes Organization (MGT-02)
- USER DECISION: Extend Artifacts (not a new notes section) — add new artifact types to the existing X-### schema
- New artifact types to add to the YAML artifact type options: `workflow-decision`, `team-contact`, `backlog-item`, `integration-note`
- Artifact Manager should support grouping by type (accordion or tabs) and filtering by type
- Existing X-### artifacts with existing types (document, report, spec, etc.) are unaffected
- The YAML artifacts array shape stays the same: { id, type, title, status, owner, last_updated, link }

### Weekly Update Merged into Reports (MGT-03)
- USER DECISION: Remove WeeklyUpdateForm.jsx as a standalone view
- Remove "Weekly Update" from Sidebar NAV_LINKS
- When user selects "Weekly Status" in the Reports view, show an inline data-entry form FIRST (pre-filled with last history entry via buildWeeklyFormPrefill), then generate the report
- After generating, offer an optional "Save to history" button that writes the entry to the YAML history array (same as WeeklyUpdateForm currently does)
- The Reports view becomes the single entry point for weekly workflow
- Note: Plan 06-04 Task 2 was already trimmed to NOT modify WeeklyUpdateForm.jsx

### ELT Reports Pre-Population with Timeline (MGT-04)
- Internal ELT Deck and External ELT Deck report types get a timeline/date range input when generating
- The input specifies "report as of" date — data from YAML is scoped to that date (actions/risks/history entries on or before that date)
- Pre-populate slides with relevant and recent information automatically — user doesn't need to manually describe the state
- The existing report generators (generateExternalELT, generateInternalELT in reportGenerator.js) already read from YAML; the timeline filter narrows which history/actions/risks are included

### Project Setup Pre-Fill from YAML (MGT-05)
- On Project Setup load for any customer, read the customer's YAML and auto-fill all Project Setup fields that can be derived from YAML data
- Specifically: workstream scope, workstream status, go_live_target, program name, customer name
- Fields that can't be derived are left blank/at defaults
- This applies both to existing customers (auto-fill on load) and new customers created with a YAML upload (auto-fill immediately)

### Claude's Discretion
- Server endpoint for new customer creation: POST /api/customers — implementation details (Drive file naming, template generation)
- YAML upload mechanism: multipart form data vs. base64 in JSON body
- Artifact type grouping UI pattern: tabs vs. accordion vs. filter dropdown
- ELT timeline UI: date picker vs. text input vs. relative selector (e.g., "Last 4 weeks")
- How to handle the Route/Nav cleanup after WeeklyUpdateForm removal (main.jsx route, api.js exports)

</decisions>

<specifics>
## Specific Ideas

### Template YAML for new customers without upload
The template should include all required top-level keys with sensible defaults:
- `customer:` block with name, program, go_live_target: ''
- `workstreams:` block with adr and biggy groups, all 11 sub-workstreams with status: not_started, percent_complete: 0
- `actions: []`, `risks: []`, `milestones: []`, `artifacts: []`, `history: []`
- `status: not_started`

### Weekly Status inline form
The inline form in Reports should mirror what WeeklyUpdateForm currently collects:
- week_ending (pre-filled today)
- Per-workstream: status, percent_complete, progress_notes, blockers for all 11 sub-workstreams
- Summary: progress (bullets), decisions (bullets), outcomes (bullets)
- Use buildWeeklyFormPrefill from reportGenerator.js for pre-fill logic

### ELT Timeline
The timeline date is passed as a parameter to the report generators. History entries with week_ending > timeline date are excluded. Actions with due > timeline date are excluded from "looking ahead" section.

</specifics>

<deferred>
## Deferred Ideas

- Bulk YAML import (multiple customers at once)
- History entry editing/deletion (read-only timeline for now)
- Artifact attachment uploads (links only for now)
- Report templates/customization

</deferred>

---

*Phase: 07-smart-data-flow-and-customer-onboarding*
*Context gathered: 2026-03-05 via direct user requirements*
