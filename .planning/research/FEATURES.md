# Feature Research

**Domain:** Professional Services Project Management App — v9.0 New Capabilities
**Researched:** 2026-04-22
**Confidence:** HIGH (grounded in live codebase inspection + established PM tool conventions)

---

## Scope

This file covers 13 new features planned for v9.0 of the BigPanda PS Project Assistant. All features are
additive to an existing, production-quality Next.js 16 / PostgreSQL / BullMQ application (~75,894 LOC).
Research is focused on expected behaviors, table stakes vs differentiators, complexity, and intra-feature
dependencies — not on technology selection (stack is fixed).

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users of any modern PM tool assume exist. Missing or broken = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Task Board DnD between columns | Every Kanban tool since Trello (2011) supports column-to-column drag. The app already uses @dnd-kit/core; cards are `useSortable` but the current `handleDragEnd` only resolves the over-target as same-column reorder, not cross-column move. | MEDIUM | @dnd-kit architecture needs `DroppableColumn` containers registered via `useDroppable` so cards dropped on a column header or empty zone resolve to the column id, not a task id. Optimistic update + PATCH /api/tasks/:id already exists. |
| Task Board Week view | PM tools (Jira, Asana, Linear) offer timeline/date-based views alongside status columns. "Week view" groups tasks by ISO week of `due` date. Null-due tasks go to an "Unscheduled" bucket. | MEDIUM | No new API needed — same task payload. Client-side grouping by `isoWeek(task.due)`. Week navigation (+/- week) expected. |
| Milestone Status field with standard values | Every PM tool has status on milestones. The DB already has `milestoneStatusEnum` with values `not_started`, `in_progress`, `completed`, `blocked`. The MilestoneEditModal renders it as a freeform text `<input>` — a regression from the enum that exists in schema. | LOW | Replace `<input>` with `<select>` bound to the four enum values. Aligned with v8.0 DB enum already in place. The Gantt milestone markers should reflect status via color (green=completed, yellow=in_progress/not_started, red=blocked). |
| Risk structured fields (Likelihood, Impact, Score) | PRINCE2, PMI, and every enterprise risk framework uses a 2-axis (Likelihood x Impact) model with computed Risk Score. Users of PS tooling assume risks have this structure. Current schema has only `severity` (a single axis rolled up from both) and `mitigation`. | HIGH | Requires DB migration: add `likelihood` (integer 1-5), `impact` (integer 1-5), `risk_score` (computed or stored integer = likelihood * impact), `target_date` (TEXT, consistent with other date fields). `severity` enum becomes derivable from score but should be retained for backward compat. UI: RiskEditModal gains 4 new fields. |
| Owner field as person picker | Owner fields as free-text strings that don't autocomplete or link to known people break in teams. Tools like Jira/Asana resolve owners to actual user records. The app has a Stakeholder table per project with name/role/email/slack_id already populated. | MEDIUM | The `OwnerCell` component already exists but renders a free-text `<input>`. Needs conversion to a combobox: search stakeholders by name, display as chip, save `stakeholder_id` FK to tasks/actions/risks/milestones, with free-text fallback when no match. Requires FK column additions to the four entity tables. |
| Chat conversation persistence | Users expect chat history to survive page navigation. Current `ChatPanel.tsx` stores messages only in React state (`useChat` with no `initialMessages`). Refreshing the page clears all history. | MEDIUM | New `chat_messages` DB table (project_id, role, content, created_at, pinned boolean). Load last 50 on mount via `initialMessages` prop. Persist on each exchange via API route. Pin endpoint: PATCH /api/chat-messages/:id with `{pinned: true}`. |
| Admin: Project rename + settings | Every PM tool allows renaming a project and editing core metadata. Current Admin > Project Settings panel only exposes archive/delete actions. `projects.name`, `description`, `go_live_target`, `start_date` all already exist in schema. | LOW | A `<form>` with controlled inputs for `name`, `description`, `go_live_target`, `start_date`. Single PATCH /api/projects/:id. No new schema needed for these four fields. |

### Differentiators (Competitive Advantage)

Features that distinguish this tool from generic PM software. Not universally expected, but create outsized
value for the PS delivery workflow.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Gantt Baseline Tracking | Allows PS managers to show clients/leadership how scope has shifted vs original plan. Jira Advanced Roadmaps and MS Project do this; most lightweight tools do not. A baseline snapshot + ghost bars is a meaningful differentiator for project reporting. | HIGH | Requires new `gantt_baselines` table (project_id, snapshot_date, snapshot_json JSONB). UI: "Snapshot Baseline" button stores current task dates as JSON. Gantt renders ghost bars (dashed outlines) at baseline dates alongside live bars. Variance column shows delta in days. |
| Proactive exceptions panel on Health Dashboard (project-level) | Rather than just showing aggregate health color, surfacing specific actionable exceptions ("3 tasks overdue in ADR track", "Risk R-BP-007 has no owner", "Milestone M-BP-003 is 5 days past due") is far more operationally useful. The portfolio-level `PortfolioExceptionsPanel` already implements this pattern; the project-level HealthDashboard does not. | MEDIUM | 6+ exception types: overdue tasks, at-risk milestones (by status or date), open critical risks with no mitigation, tasks blocked with no resolution date, actions past due, stale update (no engagement history entry in 7 days). Rule engine is pure JS — no AI, no new API. Computed from existing `overview-metrics` endpoint data supplemented with task/risk/action queries. |
| AI Meeting Prep | On-demand AI brief contextualizing open items, recent activity, and a suggested agenda. Competitors have ad-hoc AI chat but not a purpose-built "prepare me for a client call" brief. This directly serves the PS delivery workflow. | HIGH | New skill (SKILL.md) or dedicated API route. Gathers: open high/critical risks, overdue actions, last 5 engagement history entries, next 2 milestones, blocked tasks. Passes to Claude with explicit `<meeting_context>` XML wrapper. Output: structured brief with sections (Status Summary, Open Items, Risks to Discuss, Suggested Agenda). Can be surfaced from Health Dashboard or Chat tab. |
| Task dependency picker (searchable, chip display) | The DB already has `tasks.blocked_by` (self-FK) and `tasks.milestone_id` (FK to milestones). The `TaskEditModal` currently renders these as raw `<input type="text">` fields where the user must type an integer ID. Searchable pickers over actual task/milestone names transform a broken UX into a usable feature. | MEDIUM | Fetch all tasks for the project; render as combobox with title+id chip display. `blocked_by` = single-select (one blocking task). `milestone_id` = single-select (one linked milestone). Validate no circular dependency (task cannot block itself). No new API needed; use existing task list endpoint. |
| Stakeholder contact extraction from ingested docs | PS teams spend time manually transcribing names/emails/Slack handles from meeting notes into the stakeholder table. Auto-populating contact fields during document extraction removes friction. The stakeholder schema already has `email` and `slack_id` columns. | HIGH | Requires extraction pipeline changes (Pass enrichment or expanding existing passes). Email regex + Slack handle regex (`@username` or `<@UXXXXX>`) as a post-extraction enrichment step. Proposed entities with email/slack should surface in IngestionModal for approval. Must handle duplicates — match existing stakeholder by name before creating new. |
| Outputs Library inline preview | The Outputs Library currently shows a list with filename, status, and date. Content exists in `outputs.content` (TEXT) and `outputs.filepath`. Users expect to read generated content without leaving the app. Competitor tools (Notion AI, Coda) show inline rendered documents. | MEDIUM | Two render modes: (1) Markdown output: render with a markdown-to-HTML renderer (react-markdown, likely already addable with zero new infra). (2) File output (.docx, .pptx, .xlsx): show a "Download" button since browser-native preview is not feasible without external viewers. HTML outputs: render in a sandboxed `<iframe>`. Toggle between raw text and rendered view. |
| Admin: Active tracks configuration | ADR and Biggy are the two standard delivery tracks but future projects may use different track names. Exposing track configuration in Admin > Project Settings allows the PS team to adapt the tool to non-standard engagements without code changes. | MEDIUM | `workstreams.track` is currently populated via static constants in code. A tracks config could be stored in `projects` (JSONB column `active_tracks`) or a new `project_tracks` table. UI: editable list of track names in Admin tab. Downstream impact: WBS, Gantt, and Onboarding tabs filter by track. Requires design decision before implementation. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multi-select task dependencies (blocked_by array) | "A task can be blocked by multiple things" | The current schema has a single `blocked_by` integer FK. Converting to an array or junction table is a migration + UI overhaul. PS delivery rarely needs true multi-blocker tracking at task granularity — that level of dependency tracking belongs in the WBS. | Keep `blocked_by` as single-select for now. Add free-text `notes` on blocking context. |
| Real-time collaborative chat (multi-user live sync) | Teams share a project and want to see each other's chat | `useChat` is per-user; syncing chat across tabs/users requires WebSocket infrastructure not currently in the stack. The value does not justify the complexity for a PS tool used by small teams. | Persistence (last 50 messages) solves the "I lose history on refresh" problem. Multi-user sync is v10+ territory. |
| Gantt critical path calculation | "Show me what's on the critical path" | Critical path requires a full dependency graph across all tasks. The current task dependency model (`blocked_by` single FK) is insufficient for a proper CPM calculation. Building CPM on incomplete data is worse than not having it. | Implement dependency picker first (v9.0). Critical path can follow once dependency data quality is established. |
| AI auto-close of risks/actions when conditions are met | "The AI should mark R-BP-007 as resolved when mitigation is done" | Auto-closing items without explicit user confirmation violates the trust model for audit-trail data. PS teams are accountable for risk dispositions — they need to confirm closure. | Surface exceptions that highlight stale open items ("R-BP-007 has been open 45 days with mitigation noted — consider closing"). User closes manually. |

---

## Feature Dependencies

```
[Owner picker (stakeholder combobox)]
    └──requires──> [Stakeholder table populated per project]  (ALREADY EXISTS)
    └──requires──> [FK columns owner_stakeholder_id on tasks/actions/risks/milestones]  (NEW — migration)

[Task dependency picker]
    └──requires──> [tasks.blocked_by FK already exists]  (ALREADY EXISTS)
    └──requires──> [tasks endpoint returns full task list for the project]  (ALREADY EXISTS)
    └──enhances──> [Gantt baseline variance — blocked tasks highlighted]

[Gantt baseline tracking]
    └──requires──> [New gantt_baselines table]  (NEW — migration needed)
    └──requires──> [GanttTask date model stable]  (ALREADY EXISTS — drag-reschedule ships in v7.0)
    └──enhances──> [Health Dashboard exceptions — task slipped X days from baseline]

[Milestone Status enum select]
    └──requires──> [milestoneStatusEnum already in schema]  (ALREADY EXISTS)
    └──blocks-until-fixed──> [Proactive exceptions — needs reliable status to detect at-risk milestones]
    └──enhances──> [Gantt milestone markers — color by status]
    └──enhances──> [AI Meeting Prep — at-risk milestones surfaced in brief]
    └──fixes──> [Portfolio overdue milestones counter — needs status != 'completed' filter]

[Proactive exceptions panel (project-level)]
    └──requires──> [overview-metrics endpoint]  (ALREADY EXISTS)
    └──requires──> [Milestone Status as enum select — fix first]
    └──enhances──> [AI Meeting Prep — exceptions feed the brief context]

[AI Meeting Prep]
    └──requires──> [overview-metrics data]  (ALREADY EXISTS)
    └──requires──> [Engagement history data]  (ALREADY EXISTS)
    └──optionally-enhances-if-present──> [Proactive exceptions — exceptions appear in brief]

[Chat conversation persistence]
    └──requires──> [New chat_messages table]  (NEW — migration needed)
    └──requires──> [ChatPanel.tsx refactored to load initialMessages on mount]
    └──enables──> [Pin AI responses — pinned boolean on chat_messages]

[Pin AI responses]
    └──requires──> [Chat conversation persistence]  (hard dependency — pin is meaningless without persistence)

[Stakeholder contact extraction]
    └──requires──> [Stakeholder table with email + slack_id columns]  (ALREADY EXISTS)
    └──requires──> [Extraction pipeline Pass 0-5 architecture]  (ALREADY EXISTS)
    └──enhances──> [Owner picker — more stakeholders populated = better autocomplete]

[Outputs Library inline preview]
    └──requires──> [outputs.content column populated]  (ALREADY EXISTS — content stored as TEXT)
    └──requires──> [react-markdown or equivalent renderer]  (trivial add)

[Admin Project Settings expansion]
    └──requires──> [projects.name, description, go_live_target, start_date columns]  (ALREADY EXISTS)
    └──requires──> [projects.active_tracks OR new project_tracks table]  (NEW for tracks config only)

[Risk structured fields]
    └──requires──> [DB migration: likelihood, impact, risk_score, target_date on risks table]
    └──enhances──> [Proactive exceptions — high risk_score triggers exception rule]
    └──enhances──> [AI Meeting Prep — high-score risks prioritized in brief]

[Task Board DnD cross-column]
    └──requires──> [@dnd-kit/core useDroppable on columns]  (ALREADY PARTIALLY WIRED)
    └──requires──> [PATCH /api/tasks/:id status update]  (ALREADY EXISTS)

[Task Board Week view]
    └──requires──> [tasks.due field]  (ALREADY EXISTS)
    └──no-new-api-needed──> client-side grouping only
```

### Dependency Notes

- **Owner picker requires stakeholder table:** The Stakeholders table is populated per project and already has name/role/email columns. The picker displays stakeholder names from this table. Empty stakeholder table = picker shows only free-text option. No crash risk — graceful fallback to free-text is required. The implementation must NOT prevent saving if stakeholder table is empty.

- **Owner picker requires FK migration:** `tasks.owner`, `actions.owner`, `risks.owner`, `milestones.owner` are all `text` columns storing a name string. To save a stakeholder_id reference, new nullable FK columns must be added (`tasks.owner_stakeholder_id`, etc.) while the existing `owner` text column is retained for backward compat and free-text fallback. A dual-write pattern (save both the text name and the FK) is the safest migration path.

- **Proactive exceptions panel requires milestone status to be reliable:** If milestone status is still a freeform string (current MilestoneEditModal state), exception rules like "milestone is at-risk" cannot fire reliably. Fixing milestone status to an enum select is a prerequisite, not a parallel task. This is also the fix for the "portfolio overdue milestones counter" bug mentioned in the v9.0 target list.

- **Chat persistence enables pin:** Pinning requires a `pinned` column on persisted messages. Without the persistence table, pin is meaningless (messages disappear on reload anyway). These two features must be implemented together in one phase.

- **Gantt baseline is self-contained:** No dependency on other v9.0 features. Can be implemented independently. Its value increases if dependency picker is also present (baseline + dependency data = richer variance analysis), but the two are not coupled.

- **Stakeholder contact extraction enhances owner picker:** More stakeholders extracted from docs = more options in the owner picker autocomplete. However, neither feature blocks the other. Implementation order does not matter.

- **Risk score enhances exceptions panel:** The proactive exceptions panel can fire a rule like "risk with score >= 15 has no mitigation" only after risk_score is available. However the exceptions panel should be built first with the rules it can compute from existing data, then extended when risk_score is available.

---

## Expected Behaviors (PM Tool Conventions)

These are implicit user expectations grounded in how Jira, Asana, Linear, and Notion handle these patterns.
Violating these creates friction even when the feature technically works.

### Task Board DnD
- Cards must drop into the column they are released over, not require pixel-perfect targeting.
- Empty columns must be droppable drop zones (not zero-height invisible targets). Use `min-h-[120px]` — already in code.
- Optimistic update must happen immediately on drop; rollback on API error with toast.
- The drag overlay (ghost card) should show the task title — already implemented in DragOverlay.
- Sorting within a column (reorder) is a bonus; cross-column move is the baseline requirement.
- Bulk-selected cards should NOT be draggable — DnD is single-card only.

### Task Board Week view
- Current week is the default focused week on open.
- Weeks labeled "Apr 21 – Apr 27" style (not ISO week numbers — those are engineer-facing).
- Tasks with no due date appear in "Unscheduled" bucket at the bottom.
- Overdue tasks (past due date, not done) appear in "Overdue" bucket, not in their historical week.
- Navigation: prev/next week chevrons + "This week" reset button.
- The week view does not replace the Kanban view; it is a toggle added to the existing view switcher.

### Gantt Baseline
- "Snapshot baseline" action creates a point-in-time record of all current task start/end dates.
- Only one active baseline per project at a time (new snapshot replaces the previous; old one can be archived in the JSONB blob).
- Ghost bars render behind live bars with dashed outline and reduced opacity (~30%).
- Variance column: format as "+5d" (slipped) or "-2d" (ahead), not raw integer.
- If no baseline exists, the variance column is hidden (not shown as empty/zero).
- Baseline snapshot date shown prominently in the Gantt header ("Baseline: Apr 15, 2026").

### Task Dependency Picker
- Picker renders current task's title as context so user can see what they are setting a dependency for.
- Blocked-by dropdown shows task title + status chip (so users can see if the blocker is already done).
- Selecting a done task as blocker should show a warning ("This task is already complete") but not prevent saving.
- Self-dependency is blocked at the UI level (task cannot block itself — validate on form submit).
- Milestone link shows milestone name + target date chip.

### Owner Picker (Stakeholder Combobox)
- Typing in the owner field filters stakeholders by name in real-time (client-side filter is fine — full stakeholder list is small).
- Selecting a stakeholder shows their name as a chip with a clear (x) button.
- Free-text fallback: if typed name does not match any stakeholder, allow saving as free-text string (no forced match).
- Owner display across the app (task cards, table rows) shows the stakeholder name, not their DB ID.
- When a stakeholder is deleted from the project, tasks/risks/actions that referenced them display the name from the text column as fallback (not NULL or broken).

### Risk Structured Fields
- Likelihood and Impact each rendered as a 1–5 scale (radio buttons or compact select — not a text field).
- Risk Score = Likelihood x Impact (1–25). Displayed as a colored badge: 1-5 green, 6-14 yellow, 15-25 red.
- The existing `severity` enum (low/medium/high/critical) must be retained — extraction pipeline and existing data uses it. Do not remove it. It can be derived from score OR remain user-editable.
- Target Date on risks behaves identically to due dates on actions (TEXT field, accepts TBD or ISO date, DatePickerCell UI).
- Risks table columns: Score badge, Likelihood, Impact as new sortable columns.

### Milestone Status (Enum Select)
- The four existing enum values display as human-readable labels: "Not Started", "In Progress", "Completed", "Blocked".
- Gantt milestone diamond markers change color: completed=green, in_progress/not_started=yellow/gray, blocked=red.
- Portfolio overdue milestones counter must count milestones where `date < today AND status != 'completed'`. The current count logic is broken because status is freetext — this fix is the reason milestone status enum is P1.

### Proactive Exceptions Panel (Project-Level Health Dashboard)
- This is a project-scoped version of the existing `PortfolioExceptionsPanel` logic in components/PortfolioExceptionsPanel.tsx.
- Exceptions are computed entirely client-side via rule engine — no AI call, no new backend API.
- Minimum 6 exception types: overdue task, at-risk milestone (status=blocked or date < today and status!=completed), open critical risk with no mitigation text, task blocked > 7 days, action past due, stale project (no engagement history > 7 days).
- Each exception row: severity icon, description, deep-link to the relevant entity tab.
- Panel is collapsible (default open if any exceptions exist, default collapsed if zero exceptions).
- "0 exceptions — Project Healthy" state shown explicitly (not empty panel).

### AI Meeting Prep
- Invoked via button ("Prepare for Meeting" or "AI Meeting Brief") — not auto-triggered on page load.
- Output has clear sections: Status Summary, Open Actions, Risks to Discuss, Recent Activity, Suggested Agenda.
- Suggested Agenda includes time estimates (e.g. "5 min — status update") — PS workflow convention.
- All facts (dates, counts, names) come from DB; Claude synthesizes structure and narrative only. No invented data.
- Output is saveable to Outputs Library (consistent with all other skill outputs).
- Button placement: Health Dashboard tab is primary; Chat tab is secondary entry point.

### Chat Conversation Persistence
- Load last 50 messages on page open (pagination to earlier history is v10+ scope).
- Session boundary: shared per project (all project members see the same chat history) — appropriate for a PS tool where the project conversation is a shared artifact.
- "Clear conversation" button clears client-side display but does NOT delete DB records (append-only principle).
- Pinned messages: marked with a pin icon. Pinned AI responses float to the top of the message list or appear in a collapsed "Pinned" section.
- Only AI responses (role: assistant) are pinnable. User messages are inputs, not insights.

### Outputs Library Inline Preview
- Toggle between "List view" (current) and inline "Preview" state (expand-in-place or slide-in panel).
- Markdown content: render with react-markdown. Code blocks get syntax highlighting if highlight library available; plain monospace if not.
- File outputs (.docx, .pptx, .xlsx): "Download" button only — browser cannot natively render these.
- HTML outputs: sandboxed `<iframe sandbox="allow-scripts">`.
- Preview panel has a "Copy raw text" button for all output types.

### Stakeholder Contact Extraction
- Extracted email/Slack handle appears in IngestionModal preview as proposed additions to the stakeholder record.
- If a stakeholder with the same name already exists: show as "Update existing" (enrichment), not a new record.
- If a name is new: show as "New stakeholder" with extracted contact fields pre-populated.
- User can approve/reject each contact extraction individually (consistent with existing ingestion approval flow).

### Admin Project Settings Expansion
- Rename: live validation that name is not empty. Soft warning if another project with the same name exists (not a hard block).
- Go-live date: uses the same DatePickerCell component used elsewhere. Stored in `projects.go_live_target` (TEXT — already exists).
- Description: multiline textarea. `projects.description` already exists.
- Active tracks: editable list of track name strings. Default: ["ADR", "Biggy"]. Removing a track does not delete WBS items or tasks — they are hidden from track-filtered views only.

---

## MVP Definition for v9.0

### Build First (Highest-value, lowest-complexity, unblock other features)

- [ ] Milestone Status enum select — LOW complexity, unblocks exceptions panel + Gantt color markers + portfolio counter fix
- [ ] Admin Project Settings: rename, description, go-live date — LOW complexity, fully self-contained
- [ ] Task Board DnD cross-column — MEDIUM, @dnd-kit already wired, fixes a broken core promise
- [ ] Task Board Week view — MEDIUM, self-contained client-side grouping, no new API

### Build Second (Medium-value, medium-complexity, foundation for later features)

- [ ] Task dependency picker — MEDIUM, FKs exist, only UI + validation needed
- [ ] Owner picker / stakeholder combobox — MEDIUM, requires FK migration for owner_stakeholder_id
- [ ] Proactive exceptions panel (project-level) — MEDIUM, requires milestone status fix first
- [ ] Chat conversation persistence + pin — MEDIUM, new table + initialMessages wiring, both in one phase

### Build Third (High-complexity or high-AI features)

- [ ] Outputs Library inline preview — MEDIUM, react-markdown add + render mode logic
- [ ] Risk structured fields (likelihood, impact, score, target_date) — HIGH, DB migration + full UI
- [ ] Gantt baseline tracking — HIGH, new table + GanttChart ghost bar rendering
- [ ] AI Meeting Prep skill — HIGH, new skill + context assembly + SKILL.md authoring
- [ ] Stakeholder contact extraction — HIGH, extraction pipeline changes + dedup logic
- [ ] Admin: active tracks configuration — MEDIUM, design decision on storage model needed first

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Milestone Status enum select | HIGH | LOW | P1 |
| Admin: rename/description/go-live | HIGH | LOW | P1 |
| Task Board DnD cross-column | HIGH | MEDIUM | P1 |
| Task Board Week view | HIGH | MEDIUM | P1 |
| Task dependency picker | HIGH | MEDIUM | P1 |
| Owner field: stakeholder picker | HIGH | MEDIUM | P1 |
| Proactive exceptions panel | HIGH | MEDIUM | P1 |
| Chat persistence + pin | HIGH | MEDIUM | P2 |
| Outputs Library inline preview | MEDIUM | MEDIUM | P2 |
| Risk structured fields | HIGH | HIGH | P2 |
| Gantt baseline tracking | MEDIUM | HIGH | P2 |
| AI Meeting Prep | HIGH | HIGH | P2 |
| Stakeholder contact extraction | MEDIUM | HIGH | P3 |
| Admin: active tracks config | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must ship in v9.0 — directly fixes broken/missing basics or unblocks other features
- P2: Should ship in v9.0 — high value, manageable complexity
- P3: Ship if time allows or push to v9.1

---

## Schema Impact Summary

Features requiring DB migrations (new columns or tables):

| Feature | Migration Required |
|---------|--------------------|
| Owner picker | ADD COLUMN owner_stakeholder_id integer REFERENCES stakeholders(id) on tasks, actions, risks, milestones (nullable, dual-write with existing owner text column) |
| Risk structured fields | ADD COLUMN likelihood integer, impact integer, risk_score integer, target_date text ON risks |
| Chat persistence + pin | NEW TABLE chat_messages (id serial, project_id integer, role text, content text, pinned boolean default false, created_at timestamp) |
| Gantt baseline | NEW TABLE gantt_baselines (id serial, project_id integer, snapshot_date text, label text, snapshot_json jsonb, created_at timestamp) |
| Admin: active tracks | ADD COLUMN active_tracks jsonb ON projects — OR — new project_tracks table (design decision) |

Features NOT requiring DB migrations (existing schema is sufficient):

| Feature | Schema Note |
|---------|-------------|
| Task Board DnD cross-column | tasks.status already exists; PATCH /api/tasks/:id already handles status update |
| Task Board Week view | tasks.due already exists; client-side grouping only |
| Milestone Status enum select | milestoneStatusEnum already in DB schema; MilestoneEditModal just needs `<select>` |
| Task dependency picker | tasks.blocked_by and tasks.milestone_id FKs already exist |
| Proactive exceptions panel | uses data from existing overview-metrics endpoint |
| Outputs Library inline preview | outputs.content TEXT already stores skill output |
| Admin rename/description/go-live | projects.name, description, go_live_target, start_date all exist |
| AI Meeting Prep | reads from existing tables; output writes to outputs table (already exists) |

---

## Sources

- Live codebase inspection: `/Users/jmiloslavsky/Documents/Panda-Manager` — schema.ts, TaskBoard.tsx,
  GanttChart.tsx, HealthDashboard.tsx, MilestoneEditModal.tsx, RiskEditModal.tsx, TaskEditModal.tsx,
  StakeholderEditModal.tsx, PortfolioExceptionsPanel.tsx, ChatPanel.tsx, app/outputs/page.tsx
- PROJECT.md v9.0 milestone target feature list (validated against codebase state as of 2026-04-22)
- PM tool conventions: Jira, Asana, Linear, Notion — UI behavior expectations (training data, HIGH confidence)
- PRINCE2 / PMI risk matrix: Likelihood x Impact 1-5 scale (industry standard, HIGH confidence)
- @dnd-kit/core library: useDroppable for column drop zones (standard cross-column DnD pattern, HIGH confidence)

---

*Feature research for: BigPanda PS Project Assistant v9.0 UX Maturity and Intelligence*
*Researched: 2026-04-22*
