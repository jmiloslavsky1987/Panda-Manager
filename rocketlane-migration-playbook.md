# RocketLane → Project Assistant Migration Playbook

**Version:** 1.0  
**Date:** 2026-04-23  
**Scope:** One PS project, ~50–200 tasks, 10–20 milestones, 20–30 risks, 10–20 stakeholders  
**Constraint:** No code changes to destination app. Migration via API, document ingestion, and UI only.

---

## Part 1: RocketLane Export Capabilities (Research Summary)

### What RocketLane Exposes

Based on research across RocketLane's integrations, Zapier connector, and product documentation:

**Native Export Formats**
| Entity | Export Format | Notes |
|---|---|---|
| Project plan (tasks) | CSV / Excel (.xlsx) | Via the project plan view → "Export" button. Columns vary by custom field configuration. |
| Time entries | CSV | Via Reports > Time Tracking |
| Project reports | CSV / Excel | Via Reporting & Dashboard section; custom reports can be exported |
| Portfolio view | CSV | Multi-project task/milestone list |
| No native JSON export | — | RocketLane has no "export full project as JSON" feature |

**Known Exportable Entities (with typical column names)**

*Tasks/Project Plan (.xlsx or .csv):*
- Task Name
- Section / Phase (hierarchy grouping)
- Assignee(s)
- Due Date
- Start Date
- Status (Not Started / In Progress / Completed / Blocked)
- % Complete
- Priority
- Dependencies (linked task names or IDs)
- Tags
- Description / Notes
- Custom fields (varies per org)
- Milestone (if task is linked to a milestone)
- Parent Task (for subtask hierarchy)

*Milestones (embedded in project plan export or separate milestone list):*
- Milestone Name
- Due Date
- Status
- Linked Tasks
- Owner

*Time Entries:*
- Date
- Team Member
- Hours Logged
- Task
- Project
- Notes/Description

*No native export for:*
- Risks (risks live in RocketLane but have no dedicated export — must be manually captured)
- Decisions / action items as standalone entities
- Stakeholder/contact directory (no dedicated export)
- Documents / attachments (must be downloaded individually)
- Customer portal activity
- CSAT responses (only available in reporting views)

### RocketLane API

RocketLane has a documented REST API (confirmed by multiple review sources). Key facts:

- **Authentication:** API key (Bearer token), obtained from Settings > Integrations > API
- **Base URL pattern:** `https://api.rocketlane.com/api/v1/` (exact base URL per org tenant)
- **Available via API:** projects, tasks, accounts (customers), users
- **Zapier-exposed operations:** Create/update accounts, projects, tasks; search accounts/projects/tasks/users
- **NOT available via API (as of research date):** milestones as a distinct resource, risks, decisions, stakeholder directory, documents
- **Rate limits:** Not publicly documented; assume standard SaaS rate limiting (100–500 req/min)

**Sample API calls (based on Zapier connector field inspection):**
```
GET  /api/v1/projects
GET  /api/v1/projects/{projectId}/tasks
GET  /api/v1/accounts
GET  /api/v1/users
```

**Task fields returned by API (inferred from Zapier field list):**
- `id`, `name`, `status`, `assignees` (array), `dueDate`, `startDate`, `projectId`, `sectionId`, `parentTaskId`, `description`, `priority`, `percentComplete`

### Important Caveat

RocketLane's API documentation is not fully public. The field names above are inferred from the Zapier integration connector and product screenshots. Before beginning migration, the PS manager should:
1. Generate an API key in RocketLane Settings > Integrations
2. Run `GET /api/v1/projects/{id}/tasks` and inspect the actual response fields
3. Adjust the field mapping table below accordingly

---

## Part 2: Field Mapping — RocketLane → Destination App

### Legend
- **Direct** = value can be copied with minor formatting
- **Transform** = value needs normalization (status rename, date format, etc.)
- **Derive** = value must be constructed from multiple source fields or context
- **Manual** = no source in RocketLane; must be entered by hand
- **Discard** = RocketLane field has no equivalent in destination

### 2.1 Project

| RocketLane Field | Destination Field | Mapping Type | Notes |
|---|---|---|---|
| Project Name | `projects.name` | Direct | — |
| Account / Customer Name | `projects.customer` | Direct | — |
| Project Status (Active/Archived) | `projects.status` | Transform | "Active" → `active`, "Archived" → `archived` |
| Project Start Date | `projects.start_date` | Direct | TEXT field; accepts ISO or "Q3 2026" |
| Project End Date / Go-Live | `projects.end_date`, `projects.go_live_target` | Direct | Same value in both fields |
| Project Description | `projects.description` | Direct | — |
| Overall Health | `projects.overall_status` | Transform | Map to free text: "On Track", "At Risk", "Off Track" |
| Status Summary | `projects.status_summary` | Direct | Paste latest status note |
| — | `projects.weekly_hour_target` | Manual | Not tracked in RocketLane |
| Custom Fields (varies) | — | Discard | No equivalent in destination schema |

### 2.2 Tasks

| RocketLane Field | Destination Field | Mapping Type | Notes |
|---|---|---|---|
| Task Name / title | `tasks.title` | Direct | — |
| Description / Notes | `tasks.description` | Direct | — |
| Assignee(s) | `tasks.owner` | Transform | Use primary assignee name (first if multiple) |
| Due Date | `tasks.due` | Direct | Convert to ISO (YYYY-MM-DD) or leave as "TBD" |
| Start Date | `tasks.start_date` | Direct | Convert to ISO |
| Status | `tasks.status` | Transform | See status table below |
| Priority | `tasks.priority` | Transform | Map to "high"/"medium"/"low" |
| Section / Phase | `tasks.phase` | Direct | This is the WBS link field — use section name |
| Milestone (linked) | `tasks.milestone_id` | Derive | Resolve milestone name to DB id after milestones are imported |
| Dependencies | `tasks.blocked_by` | Derive | Resolve dependent task title to DB id after tasks are imported |
| Parent Task | — | Discard | Destination has no subtask hierarchy in `tasks` table; use `wbs_items` instead |
| Tags | — | Discard | No equivalent |
| % Complete | — | Discard | Destination derives progress from status, not a numeric field |
| Custom Fields | `tasks.description` (append) | Derive | Append any important custom field values to description |

**Status mapping:**
| RocketLane Status | Destination `tasks.status` |
|---|---|
| Not Started | `todo` |
| In Progress | `in_progress` |
| Completed / Done | `done` |
| Blocked | `blocked` |
| Cancelled | `cancelled` (store as `done` with note, or omit) |

### 2.3 Milestones

| RocketLane Field | Destination Field | Mapping Type | Notes |
|---|---|---|---|
| Milestone Name | `milestones.name` | Direct | — |
| Due Date | `milestones.date` | Direct | TEXT; accepts ISO or quarter string |
| Target Date (original) | `milestones.target` | Direct | Same as due date if not separately tracked |
| Status | `milestones.status` | Transform | See table below |
| Owner (if shown) | `milestones.owner` | Direct | Name string, not FK |
| Notes | `milestones.notes` | Direct | — |

**Status mapping:**
| RocketLane | Destination `milestones.status` |
|---|---|
| Not Started | `not_started` |
| In Progress | `in_progress` |
| Completed | `completed` |
| Blocked / Overdue | `blocked` |

**Destination gap:** `milestones.external_id` is required by schema. Generate as `M-[PROJECTCODE]-001`, incrementing per milestone.

### 2.4 Risks

RocketLane does not natively export risks as a structured entity. Risks are typically tracked as:
- Tasks with a "Risk" tag or type
- Freeform notes in a project "Risks" section
- Custom fields on tasks

| Source (RocketLane) | Destination Field | Mapping Type | Notes |
|---|---|---|---|
| Risk task title / description | `risks.description` | Direct | — |
| Risk severity tag / custom field | `risks.severity` | Transform | Map to `low`/`medium`/`high`/`critical` |
| Risk owner (assignee) | `risks.owner` | Direct | — |
| Mitigation notes | `risks.mitigation` | Direct | — |
| Risk status | `risks.status` | Transform | `open`/`mitigated`/`resolved`/`accepted` |
| — | `risks.external_id` | Derive | Generate as `R-[PROJECTCODE]-001` etc. |

**Destination gap:** `risks.external_id` is required. Must be generated during migration.

### 2.5 Stakeholders

RocketLane tracks stakeholders as project members and customer contacts. No dedicated CSV export — must be compiled from:
- Project Settings > Members
- Account > Contacts view
- Task assignee list

| RocketLane Source | Destination Field | Mapping Type | Notes |
|---|---|---|---|
| Contact Name | `stakeholders.name` | Direct | — |
| Contact Title / Role | `stakeholders.role` | Direct | — |
| Company | `stakeholders.company` | Direct | — |
| Email | `stakeholders.email` | Direct | — |
| Slack handle (if tracked) | `stakeholders.slack_id` | Direct | — |
| Notes / custom fields | `stakeholders.notes` | Direct | — |

### 2.6 Actions (Action Items)

RocketLane tracks action items as tasks with a specific type or tag. Export as part of the project plan.

| RocketLane Field | Destination Field | Mapping Type | Notes |
|---|---|---|---|
| Task title (action-type tasks) | `actions.description` | Direct | — |
| Assignee | `actions.owner` | Direct | — |
| Due Date | `actions.due` | Direct | TEXT |
| Status | `actions.status` | Transform | `open`/`in_progress`/`completed`/`cancelled` |
| Notes | `actions.notes` | Direct | — |
| — | `actions.external_id` | Derive | Generate as `A-[PROJECTCODE]-001` etc. |

**Note:** The destination distinguishes between `tasks` (project plan items) and `actions` (action items / follow-ups). Filter RocketLane tasks tagged as "Action" or assigned in meeting notes into `actions`; the rest into `tasks`.

### 2.7 Decisions (key_decisions)

No RocketLane equivalent export. Source from:
- Meeting notes in RocketLane's project messages
- Documents/spaces in RocketLane

| Source | Destination Field | Mapping Type |
|---|---|---|
| Decision text from meeting notes | `key_decisions.decision` | Manual/Direct |
| Context / rationale | `key_decisions.context` | Manual/Direct |
| Date of decision | `key_decisions.date` | Direct |

**Note:** `key_decisions` is append-only (DB trigger prevents UPDATE/DELETE). Insert once.

### 2.8 WBS Items (wbs_items)

RocketLane's section/task hierarchy maps to the WBS tree.

| RocketLane Concept | Destination | Notes |
|---|---|---|
| Top-level Section | `wbs_items` level=1 | e.g. "Solution Design" |
| Sub-section | `wbs_items` level=2 | Nested sections |
| Task within section | `wbs_items` level=3 | Leaf tasks |

Required fields: `name`, `level`, `track` (use "ADR" or "Biggy"), `project_id`, `status`.
The `parent_id` must be resolved after parent rows are created.

### 2.9 Entities With No RocketLane Source (Manual Entry Required)

| Destination Entity | Why No Source | Recommended Action |
|---|---|---|
| `onboarding_phases` / `onboarding_steps` | RocketLane-specific; PS-managed template | Build via UI onboarding dashboard |
| `integrations` | Tool connection registry | Enter via UI Settings or ingestion doc |
| `architecture_integrations` | Architecture pipeline mapping | Enter via ingestion doc |
| `wbs_items` beyond simple hierarchy | Requires track assignment | Ingestion doc or UI |
| `business_outcomes` | No equivalent in RocketLane | Ingestion doc |
| `focus_areas` | No equivalent | Manual entry or ingestion doc |
| `before_state` | Pre-BigPanda context | Write into ingestion doc |
| `knowledge_base` | Project-specific knowledge | Manual entry |
| `workstreams` | Named delivery tracks | Manual entry or ingestion doc |
| `time_entries` | RL has time tracking but destination schema differs | Re-enter manually if critical |

---

## Part 3: Migration Playbook

### Prerequisites

- [ ] Access to RocketLane project (admin or project manager role)
- [ ] Destination app running and accessible (admin account)
- [ ] Project already created in destination app (note the `project_id`)
- [ ] API authentication cookie or session token for destination app (see Step 0)
- [ ] Postman or curl available
- [ ] Excel/Numbers/Google Sheets for data transformation

### Step 0 — Authentication

The destination app uses session-based auth (better-auth). All API calls require a valid session cookie.

**How to obtain session cookie:**
1. Log in to the destination app in a browser
2. Open DevTools > Application > Cookies
3. Copy the session cookie value (typically `better-auth.session_token` or similar)
4. Use in curl: `curl -H "Cookie: better-auth.session_token=<value>" ...`
5. Or configure Postman with the same cookie header

**Session expires:** Typically after browser session or 7-day timeout. Refresh by logging in again.

---

### Phase A — Project Setup (UI)

**Estimated time:** 15 minutes

1. Navigate to Admin > Settings in destination app
2. Create the project (or verify it exists): enter name, customer, description, go_live_target, start_date, end_date
3. Set project status to `active`
4. Note the integer `project_id` from the URL (e.g., `/projects/3` → `project_id = 3`)

---

### Phase B — Export Data from RocketLane

**Estimated time:** 30–60 minutes

**B1. Export project plan (tasks + milestones):**
1. Open the project in RocketLane
2. Navigate to the Project Plan view (Gantt or list)
3. Click Export → Download as Excel (.xlsx)
4. Save as `rocketlane-project-plan.xlsx`

**B2. Via API (if task CSV is insufficient):**
```bash
# Replace YOUR_API_KEY and PROJECT_ID
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://app.rocketlane.com/api/v1/projects/PROJECT_ID/tasks" \
  -o rocketlane-tasks.json
```
Inspect the JSON response to confirm field names before proceeding.

**B3. Export time entries (if needed):**
- Reports > Time Tracking > Filter by project > Export CSV

**B4. Manual capture (no export available):**
- Open the Risks section (or risk-tagged tasks) → copy to a spreadsheet manually
- Open project Members/Contacts → copy stakeholder info manually
- Review project messages/notes for decisions and action items

---

### Phase C — Data Transformation

**Estimated time:** 1–2 hours for a typical project

**C1. Open `rocketlane-project-plan.xlsx` in Excel/Sheets**

Create the following output tabs:
- `tasks_import` — for tasks bulk import via `/api/plan-import`
- `milestones_manual` — for milestone API calls
- `risks_manual` — for risk API calls
- `stakeholders_manual` — for stakeholder API calls
- `actions_manual` — for action item API calls

**C2. Build `tasks_import` tab**

Required columns (matching `/api/plan-import` KAISER format):
```
Task/Action | Owner | Status | Target Date | Notes
```

Rules:
- Filter out milestone rows (export them separately)
- Filter out risks (they go to `risks_manual`)
- Status: normalize using the mapping table in Part 2.2
- Target Date: convert all dates to YYYY-MM-DD format; use "TBD" if blank
- Notes: paste any RocketLane description/custom field content here
- Phase: add a `Phase` column if you want `tasks.phase` populated — use the Section name from RocketLane

**C3. Build `milestones_manual` tab**

Columns: `Name | Date | Status | Owner | Notes`

Add an `external_id` column and generate IDs: `M-[ABBR]-001`, `M-[ABBR]-002`, etc.  
(Replace `[ABBR]` with a 3–6 letter project abbreviation.)

**C4. Build `risks_manual` tab**

Columns: `Description | Severity | Owner | Mitigation | Status | external_id`

- Generate external IDs: `R-[ABBR]-001` etc.
- Severity: map to `low` / `medium` / `high` / `critical`
- Status: map to `open` / `mitigated` / `resolved` / `accepted`

**C5. Build `stakeholders_manual` tab**

Columns: `Name | Role | Company | Email | Slack_ID | Notes`

**C6. Build `actions_manual` tab**

Columns: `Description | Owner | Due | Status | Notes | external_id`

- Filter: only rows that are action items (not project plan tasks)
- Generate external IDs: `A-[ABBR]-001` etc.

---

### Phase D — Import Tasks via XLSX

**This is the fastest path for large task lists (50–200 tasks).**

**D1. Save `tasks_import` tab as a standalone .xlsx file** (`tasks-for-import.xlsx`)

**D2. POST to `/api/plan-import`:**
```bash
curl -X POST \
  -H "Cookie: better-auth.session_token=<YOUR_SESSION>" \
  -F "project_id=<PROJECT_ID>" \
  -F "file=@tasks-for-import.xlsx" \
  http://localhost:3000/api/plan-import
```

Expected response: `{"count": 142}` (number of tasks inserted)

**Column name requirements for the importer:**
| Required | Accepted Header Variants |
|---|---|
| Title (required) | `Task/Action`, `task/action`, `Action` |
| Owner (optional) | `Owner`, `owner` |
| Status (optional) | `Status`, `status` |
| Due date (optional) | `Target Date`, `target date`, `Due Date`, `due date` |
| Notes → description (optional) | `Notes`, `notes` |

**D3. Verify import:**
```bash
curl -H "Cookie: better-auth.session_token=<SESSION>" \
  "http://localhost:3000/api/projects/<PROJECT_ID>/tasks" | jq '.tasks | length'
```

---

### Phase E — Import Milestones via API

No bulk milestone import endpoint exists. Use individual POST calls or the document ingestion path.

**Option E1: Individual API calls (recommended for ≤20 milestones)**

The milestones route only has GET — milestones must be created via ingestion or a different path.

Check available routes:
```bash
# Check if there is a POST on the milestones route
curl -X POST \
  -H "Cookie: better-auth.session_token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Go-Live","date":"2026-09-01","status":"not_started","owner":"Jane Smith","external_id":"M-PROJ-001"}' \
  "http://localhost:3000/api/projects/<PROJECT_ID>/milestones"
```

**Option E2: Document ingestion (recommended — handles all milestones at once)**

See Phase G (Document Ingestion) — include milestones in the migration document.

**Option E3: UI entry**

For ≤10 milestones, enter directly in the Milestones UI view.

---

### Phase F — Import Risks, Stakeholders, and Actions via API

**F1. Stakeholders**

```bash
curl -X POST \
  -H "Cookie: better-auth.session_token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": <PROJECT_ID>,
    "name": "Jane Smith",
    "role": "IT Operations Lead",
    "company": "Acme Corp",
    "email": "jane.smith@acme.com",
    "slack_id": "@janesmith",
    "notes": "Primary technical contact",
    "source": "rocketlane_migration"
  }' \
  "http://localhost:3000/api/stakeholders"
```

Repeat for each stakeholder. For 10–20 stakeholders, write a small shell loop or use Postman's Collection Runner.

**Shell loop example:**
```bash
#!/bin/bash
SESSION="<YOUR_SESSION_TOKEN>"
PROJECT_ID=<YOUR_PROJECT_ID>

while IFS='|' read -r name role company email slack notes; do
  curl -s -X POST \
    -H "Cookie: better-auth.session_token=$SESSION" \
    -H "Content-Type: application/json" \
    -d "{\"project_id\":$PROJECT_ID,\"name\":\"$name\",\"role\":\"$role\",\"company\":\"$company\",\"email\":\"$email\",\"slack_id\":\"$slack\",\"notes\":\"$notes\",\"source\":\"migration\"}" \
    "http://localhost:3000/api/stakeholders"
  echo ""
done < stakeholders.pipe
```

Where `stakeholders.pipe` is a pipe-delimited file: `Name|Role|Company|Email|Slack|Notes`

**F2. Actions**

```bash
curl -X POST \
  -H "Cookie: better-auth.session_token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": <PROJECT_ID>,
    "description": "Configure alert routing rules",
    "owner": "John",
    "due": "2026-06-15",
    "status": "open",
    "notes": "Blocking go-live"
  }' \
  "http://localhost:3000/api/actions"
```

**F3. Decisions**

```bash
curl -X POST \
  -H "Cookie: better-auth.session_token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": <PROJECT_ID>,
    "decision": "Proceed with ServiceNow integration via REST API, not email",
    "context": "Email integration was ruled out due to latency concerns in the 2025-11-15 architecture review"
  }' \
  "http://localhost:3000/api/decisions"
```

**Warning:** `key_decisions` is APPEND-ONLY (DB trigger). There is no update or delete. Insert carefully.

---

### Phase G — Document Ingestion (Recommended for Milestones, Risks, Decisions, and Stakeholders)

The ingestion pipeline is the most powerful migration path for entities that lack a direct API. A well-structured Word document uploaded as an artifact will have Claude extract milestones, risks, decisions, stakeholders, and other entities automatically.

**G1. Prepare the Migration Document** (see Part 4 for the full template)

The document should be structured with the specific section headers that maximally trigger extraction. Save as `.docx`.

**G2. Upload the document:**
```bash
curl -X POST \
  -H "Cookie: better-auth.session_token=<SESSION>" \
  -F "project_id=<PROJECT_ID>" \
  -F "files=@migration-document.docx" \
  "http://localhost:3000/api/ingestion/upload"
```

Response: `{"artifacts":[{"id":42,"name":"migration-document.docx","ingestion_status":"pending"}]}`

**G3. Trigger extraction:**
```bash
curl -X POST \
  -H "Cookie: better-auth.session_token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{"artifactIds":[42],"projectId":<PROJECT_ID>}' \
  "http://localhost:3000/api/ingestion/extract"
```

Response: `{"jobIds":[7],"batchId":"uuid-here"}`

**G4. Poll for completion:**
```bash
# Poll until status = "completed"
curl -H "Cookie: better-auth.session_token=<SESSION>" \
  "http://localhost:3000/api/ingestion/jobs/7"
```

Watch for `"status":"completed"` and `"progress_pct":100`. Typically takes 60–120 seconds per document.

**G5. Review and approve in the UI:**
1. Navigate to the project's Artifacts section
2. Find `migration-document.docx` → click "Review Extracted Entities"
3. The app shows a preview of all extracted entities with confidence scores
4. Approve or dismiss each entity
5. Click "Apply Approved Changes"

**What gets extracted automatically from a well-structured migration document:**
- `milestone` entities → saved to `milestones` table
- `risk` entities → saved to `risks` table
- `stakeholder` entities → saved to `stakeholders` table
- `decision` entities → saved to `key_decisions` table
- `action` entities → saved to `actions` table
- `task` entities → saved to `tasks` table
- `workstream` entities → saved to `workstreams` table
- `integration` entities → saved to `integrations` table
- `onboarding_step` entities → saved to `onboarding_steps` table
- `wbs_task` entities → saved to `wbs_items` table
- `before_state`, `focus_area`, `business_outcome` entities as applicable

---

### Phase H — Post-Import Cleanup and Linking

After all entities are created, several linkages must be resolved manually:

**H1. Link tasks to milestones**

Tasks created via the xlsx importer have `milestone_id = null`. After milestones are created, link them:

1. In the UI, open each task and set the Milestone field
2. Or use PATCH via API:
```bash
curl -X PATCH \
  -H "Cookie: better-auth.session_token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{"milestone_id": <MILESTONE_DB_ID>}' \
  "http://localhost:3000/api/tasks/<TASK_ID>"
```

**H2. Link tasks to workstreams**

```bash
curl -X PATCH \
  -H "Cookie: better-auth.session_token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{"workstream_id": <WORKSTREAM_ID>}' \
  "http://localhost:3000/api/tasks/<TASK_ID>"
```

**H3. Set task blockers (blocked_by)**

For tasks with dependencies:
```bash
curl -X PATCH \
  -H "Cookie: better-auth.session_token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{"blocked_by": <BLOCKING_TASK_ID>}' \
  "http://localhost:3000/api/tasks/<TASK_ID>"
```

**H4. Bulk-update task status/owner/phase**

If you need to apply the same phase label to a batch of tasks:
```bash
curl -X POST \
  -H "Cookie: better-auth.session_token=<SESSION>" \
  -H "Content-Type: application/json" \
  -d '{"task_ids": [101,102,103,104], "patch": {"phase": "Solution Design"}}' \
  "http://localhost:3000/api/tasks-bulk"
```

**H5. Set up onboarding phases/steps**

These must be created via the UI onboarding dashboard. There is no bulk import API for onboarding structure. Use the onboarding dashboard to:
- Create phases matching RocketLane project phases
- Add steps with owner and status

---

### Phase I — Verification Checklist

After migration is complete, verify:

**Counts:**
- [ ] Task count matches RocketLane export row count (allow ±5% for header/milestone rows)
- [ ] Milestone count matches
- [ ] Risk count matches manual capture spreadsheet
- [ ] Stakeholder count matches

**Data quality:**
- [ ] At least one milestone has a valid date (not null)
- [ ] Tasks have owners assigned (not all null)
- [ ] At least one risk has severity set
- [ ] Stakeholder emails are present for key contacts
- [ ] Decisions are recorded (check key_decisions table)

**Links:**
- [ ] Critical tasks are linked to their milestone
- [ ] Blocked tasks have `blocked_by` set
- [ ] Tasks are assigned to phases or workstreams

**API spot checks:**
```bash
# Tasks
curl -H "Cookie: ..." "http://localhost:3000/api/projects/<ID>/tasks" | jq '.tasks | length'
# Milestones
curl -H "Cookie: ..." "http://localhost:3000/api/projects/<ID>/milestones" | jq '.milestones | length'
# Risks
curl -H "Cookie: ..." "http://localhost:3000/api/projects/<ID>/risks" | jq '.risks | length'
# Stakeholders
curl -H "Cookie: ..." "http://localhost:3000/api/stakeholders?project_id=<ID>" | jq 'length'
```

---

## Part 4: Migration Document Template (for AI Ingestion)

The following is a template to fill out from RocketLane data. When uploaded as a .docx and processed by the ingestion pipeline, it will maximize entity extraction. The section headers are designed to match what the AI extraction prompts look for.

**Instructions for the PS Manager filling this template:**
- Fill every section from your RocketLane exports
- Use the exact table structures shown
- Leave "[NOT TRACKED]" for data you don't have
- Do NOT change section header names — the AI uses them for entity type disambiguation

---

```
═══════════════════════════════════════════════════════════════
PROJECT MIGRATION DOCUMENT
[Project Name] — [Customer Name]
Prepared: [Date] | Source: RocketLane Export
═══════════════════════════════════════════════════════════════

PROJECT OVERVIEW

Customer: [Customer Name]
Project Name: [Project Name]
Go-Live Target: [YYYY-MM-DD or Q3 2026]
Start Date: [YYYY-MM-DD]
Project Status: [On Track / At Risk / Off Track]
Status Summary: [1–3 sentence summary of current project health]
Project Description: [Brief description of the engagement and what is being implemented]


MILESTONES

[List every milestone. Include name, target date, status, and owner.]

| Milestone Name | Target Date | Status | Owner | Notes |
|---|---|---|---|---|
| Kickoff Complete | 2025-11-01 | completed | Jane Smith | All attendees confirmed |
| Solution Design Approved | 2025-12-15 | completed | Jane Smith | Architecture doc signed off |
| Data Normalization Phase 1 | 2026-02-01 | in_progress | John Doe | 3 of 5 sources complete |
| UAT Complete | 2026-04-30 | not_started | Jane Smith | Blocked by integration work |
| Go-Live | 2026-06-01 | not_started | Jane Smith | — |


RISKS

[List all active risks, including probability, impact, owner, and mitigation plan.]

| Risk Description | Severity | Owner | Mitigation | Status |
|---|---|---|---|---|
| ServiceNow custom field mapping may require Professional Services support | high | John Doe | Engage ServiceNow support team by end of April | open |
| NOC team bandwidth during go-live week is constrained | medium | Jane Smith | Schedule go-live for a low-incident period | open |
| Legacy monitoring tool (SolarWinds) decommission delayed | high | Customer IT | Parallel run planned for 60 days post go-live | accepted |


STAKEHOLDERS

[List all project stakeholders — both customer and vendor team members.]

| Name | Role | Company | Email | Slack Handle | Notes |
|---|---|---|---|---|---|
| Jane Smith | IT Operations Director | Acme Corp | jane.smith@acme.com | @janesmith | Executive sponsor |
| John Doe | BigPanda PS Lead | BigPanda | john.doe@bigpanda.io | @johndoe | Primary delivery lead |
| Sarah Lee | NOC Manager | Acme Corp | sarah.lee@acme.com | @sarahl | Technical lead |


OPEN ACTION ITEMS

[List all open action items and their owners. These become "action" entities.]

| Action | Owner | Due Date | Status | Notes |
|---|---|---|---|---|
| Configure alert routing rules for ServiceNow | John Doe | 2026-05-01 | open | Required for UAT entry |
| Provide network ACL rules for BigPanda IPs | Sarah Lee | 2026-04-30 | open | Blocking integration |
| Schedule UAT kickoff call | Jane Smith | 2026-04-25 | open | — |
| Complete correlation policy review | John Doe | 2026-05-15 | in_progress | Draft complete, review pending |


KEY DECISIONS

[Record all decisions made during the project. These are append-only once saved.]

1. Decision: Proceed with ServiceNow integration via REST API (not email)
   Date: 2025-11-20
   Context: Email integration was evaluated but rejected due to latency concerns raised in the architecture review. REST API provides real-time ticket creation required for SLA compliance.

2. Decision: Data normalization will use custom parsing rules rather than OOB enrichment
   Date: 2025-12-10
   Context: The customer's monitoring tools (Dynatrace, Nagios) use non-standard alert formats that require custom normalization policies.

3. Decision: Go-live in phased approach — NOC team first, then Cloud team
   Date: 2026-01-15
   Context: Risk reduction strategy. NOC team is highest volume and most urgent. Cloud team to follow 4–6 weeks later.


PROJECT TASKS

[List the top 20–30 most important tasks. The full task list will be imported via Excel.
This section is for context and any tasks not captured in the Excel export.]

| Task | Owner | Phase | Due Date | Status | Priority |
|---|---|---|---|---|---|
| Complete solution architecture document | John Doe | Solution Design | 2025-12-01 | completed | high |
| Define alert routing policy for NOC team | John Doe | Solution Design | 2025-12-15 | completed | high |
| ServiceNow REST API integration testing | John Doe | Implementation | 2026-03-01 | in_progress | high |
| PagerDuty notification rules configuration | Sarah Lee | Implementation | 2026-03-15 | not_started | medium |
| Data normalization for Dynatrace alerts | John Doe | Implementation | 2026-04-01 | in_progress | high |
| UAT test plan preparation | Sarah Lee | UAT | 2026-04-15 | not_started | medium |


DELIVERY WORKSTREAMS

[List the major delivery tracks/workstreams with their current status and completion percentage.]

| Workstream Name | Track | Status | % Complete | Lead |
|---|---|---|---|---|
| ADR Workstream | ADR | in_progress | 45% | John Doe |
| Integration Track | ADR | in_progress | 30% | John Doe |
| Customer Onboarding | ADR | in_progress | 60% | Jane Smith |


INTEGRATIONS STATUS

[List all tool integrations and their current connection status.]

| Tool | Category | Connection Status | Notes |
|---|---|---|---|
| ServiceNow | ITSM | configured | Basic connection active, field mapping incomplete |
| PagerDuty | Incident Management | not-connected | Planned for Phase 2 |
| Dynatrace | Monitoring | production | Live and validated |
| Nagios | Monitoring | production | Live |
| Splunk | SIEM | planned | Q3 2026 |


CUSTOMER BACKGROUND (BEFORE STATE)

[Describe the customer's situation before this engagement. This is important context.]

Before BigPanda, the customer was using ServiceNow as the primary aggregation point for all alerts. 
Every monitoring alert created a ticket directly in ServiceNow, resulting in 80–90% alert noise. 
The NOC team was spending 3–4 hours per shift on manual triage. There was no alert correlation 
capability, so related alerts from different monitoring tools created separate, unlinked tickets. 
MTTR averaged 4.5 hours for P1 incidents. The NOC team also lacked visibility into which alerts 
were symptomatic versus root-cause events.


ENGAGEMENT HISTORY

[Summarize key project events and status updates, oldest first. These become history entries.]

2025-10-15: Project kickoff meeting held. All stakeholders confirmed. Project charter signed.
2025-11-01: Solution design workshop completed. Architecture document v1 drafted.
2025-12-15: Architecture document approved by customer IT leadership after one revision cycle.
2026-01-10: Data normalization work started. Dynatrace integration went live in production.
2026-02-20: ServiceNow integration encountered issues with custom field mapping. Workaround identified.
2026-03-15: NOC team onboarding workshop held. UAT date set for end of April.


WEEKLY FOCUS (THIS WEEK)

[List the 3–5 most important items the delivery team should focus on this week.]

- Resolve ServiceNow custom field mapping blocker before end of week to unblock UAT schedule
- Complete data normalization for Nagios alerts (2 of 5 rule sets remaining)
- Get customer network ACL approval — blocking integration environment access
- Review and finalize UAT test plan with Sarah Lee
- Update project health status in executive dashboard before Thursday EBC

═══════════════════════════════════════════════════════════════
END OF MIGRATION DOCUMENT
═══════════════════════════════════════════════════════════════
```

---

## Part 5: What Cannot Be Migrated Automatically

The following data requires manual handling after migration:

| Data Type | Reason | Recommended Action |
|---|---|---|
| Task-to-milestone links | Destination requires DB id references; importer doesn't resolve names | Manual PATCH per task or UI edit after milestone import |
| Task-to-task dependencies (blocked_by) | Same reason — needs resolved DB ids | Manual PATCH for critical blockers only |
| WBS item parent_id tree | Hierarchy requires sequential creation (parents before children) | Use ingestion doc with indented structure, or build via UI |
| Onboarding phase/step structure | No bulk import API; template-driven setup | Build via UI onboarding dashboard |
| Time entries | Schema and ownership model differ | Re-enter the most recent week manually; historical data may not be worth migrating |
| Document attachments (SOWs, slide decks) | RocketLane stores files separately; no programmatic download API | Download manually from RL; upload to destination via document ingestion |
| Customer portal activity / comments | No equivalent entity in destination | Archive as engagement history entries in the migration doc |
| CSAT scores | No destination entity | Discard or record as knowledge_base entries |
| Custom field values | No mapping to destination schema | Append to `tasks.description` or `actions.notes` |
| RocketLane templates | Different template system in destination | Rebuild templates via the destination app's template system |
| Resource allocation / capacity data | Destination tracks time_entries but not forward allocation | Enter weekly_hour_target in project settings; rebuild schedule as tasks |
| Financial data (budgets, margins) | No financial entity in destination schema | Discard or record as a knowledge_base entry |
| User accounts | Destination uses better-auth; users must be invited separately | Send invites via Admin > Settings > Invites before migration |

---

## Part 6: Recommended Migration Order

The dependencies between entity types require this creation order:

```
1. Project (Phase A)         — required first; provides project_id
2. Workstreams               — required before tasks reference workstream_id
3. Milestones                — required before tasks reference milestone_id
4. Stakeholders              — independent; any order
5. Tasks (xlsx bulk import)  — after milestones and workstreams exist
6. Risks                     — independent; any order
7. Actions                   — independent; any order
8. Decisions                 — independent; any order (append-only)
9. WBS items                 — after tasks exist (for assignments)
10. Onboarding phases/steps  — independent; via UI
11. Integrations             — independent; via ingestion or UI
12. Post-import linking      — task→milestone, task→workstream, blocked_by
```

**Recommended approach for a typical PS project (50–200 tasks):**
1. Phases A–C: ~2 hours (export, transform, spreadsheet prep)
2. Phase D: ~10 minutes (xlsx task import)
3. Phase G: ~30 minutes (prepare + upload migration document for everything else)
4. Phase H: ~1–2 hours (post-import linking and cleanup)
5. Phase I: ~30 minutes (verification)

**Total estimated migration effort: 4–6 hours**

---

## Part 7: API Quick Reference Card

```
BASE: http://localhost:3000  (replace with production URL)
AUTH: Cookie: better-auth.session_token=<token>

# Create stakeholder
POST /api/stakeholders
Body: { project_id, name, role, company, email, slack_id, notes, source }

# Create action item
POST /api/actions
Body: { project_id, description, owner, due, status, notes }

# Create decision (append-only)
POST /api/decisions
Body: { project_id, decision, context }

# Bulk import tasks via xlsx
POST /api/plan-import
Form: project_id=<n>, file=<xlsx>

# Patch individual task
PATCH /api/tasks/:id
Body: { title, owner, due, status, phase, milestone_id, workstream_id, blocked_by }

# Bulk patch tasks (owner/due/phase/status only)
POST /api/tasks-bulk
Body: { task_ids: [n,...], patch: { owner, due, phase, status } }

# Bulk patch milestone status
POST /api/milestones/bulk-update
Body: { milestone_ids: [n,...], patch: { status } }

# Upload document for ingestion
POST /api/ingestion/upload
Form: project_id=<n>, files=<file>

# Trigger extraction
POST /api/ingestion/extract
Body: { artifactIds: [n], projectId: n }

# Poll extraction job
GET /api/ingestion/jobs/:jobId

# Get project tasks
GET /api/projects/:projectId/tasks

# Get project milestones
GET /api/projects/:projectId/milestones

# Get project risks
GET /api/projects/:projectId/risks

# Get stakeholders
GET /api/stakeholders?project_id=<n>
```
