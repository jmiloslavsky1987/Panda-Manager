# Architecture Research

**Domain:** AI-native project management platform — v9.0 UX Maturity & Intelligence
**Researched:** 2026-04-22
**Confidence:** HIGH (all conclusions from direct codebase inspection of Panda-Manager repo)

---

## Context: Subsequent Milestone Research

This is not a fresh architecture design. The core patterns are established and must not change.
This document answers only the 10 integration questions for v9.0 features. All recommendations
are grounded in direct inspection of the live codebase at `/Users/jmiloslavsky/Documents/Panda-Manager/`.

---

## Established Patterns (reference, not re-researched)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Next.js 16 App Router                               │
├────────────────────────────────┬────────────────────────────────────────────┤
│  Server Components (page.tsx)  │  Route Handlers (app/api/**/route.ts)       │
│  - DB queries via lib/queries  │  - requireSession()/requireProjectRole()    │
│  - Pass full data to client    │  - Zod validation schemas                   │
│  - No auth logic here          │  - Drizzle ORM + audit_log writes           │
├────────────────────────────────┴────────────────────────────────────────────┤
│                   Client Islands ('use client')                               │
│  - In-memory filter via URL params (useSearchParams)                         │
│  - Optimistic updates → fetch PATCH → router.refresh()                      │
│  - CustomEvent(metrics:invalidate) for cross-tab sync                        │
│  - @dnd-kit/core already installed (WbsTree + TaskBoard both use it)         │
├─────────────────────────────────────────────────────────────────────────────┤
│                        BullMQ + Redis                                         │
│  - Long-running jobs: extraction, weekly-focus, skill runs                   │
│  - Polling pattern: client polls /api/.../status every N ms                  │
│  - Advisory lock prevents duplicate LLM calls per project                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                     PostgreSQL via Drizzle ORM                                │
│  - Schema in db/schema.ts — enums defined before tables that reference them  │
│  - Migrations in db/migrations/ — auto-applied by run-migrations.ts          │
│  - Audit log: every PATCH/DELETE writes before/after JSON to audit_log       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature-by-Feature Architecture Decisions

### Feature 1: Kanban DnD — Cross-Column Status Updates

**Status: Already implemented. No architecture change needed.**

**Verified from codebase:**

`components/TaskBoard.tsx` lines 290–327 shows:
- `DndContext` with `PointerSensor` (`activationConstraint: { distance: 5 }`) from `@dnd-kit/core`
- `onDragEnd` resolves target column from `over.id` or the task's current status fallback:
  `tasks.find((t) => t.id === Number(overId))?.status`
- Optimistic state update via `setTasks()` before the server call
- `PATCH /api/tasks/${taskId}` with `{ status: columnId }`
- Revert on error using `initialTasks` reference
- `router.refresh()` on success to re-sync Server Component data

The PATCH route at `app/api/tasks/[id]/route.ts` accepts `status` in its Zod schema and
writes an audit_log entry. The full drag-to-column flow is functional end-to-end.

**What may still need attention (not architecture, but UX):**
- Dropping a card onto a column header vs onto another card — the fallback
  `tasks.find((t) => t.id === Number(overId))?.status` handles card-to-card drops.
- Each column needs a `droppable` zone large enough to catch drops when the column is empty.
  Check whether empty columns accept drops or require a minimum `SortableContext` item.

**Schema impact:** None.

---

### Feature 2: Gantt Baseline Tracking

**Decision: New `gantt_baselines` table with JSONB snapshot per capture.**

**Rationale:** JSONB on `projects` table limits to one baseline, prevents history, and bloats
all `SELECT *` queries on projects. A dedicated table with FK supports named baselines, multiple
captures, and future diff UIs.

**New table — Drizzle schema addition (`db/schema.ts`):**

```typescript
export const ganttBaselines = pgTable('gantt_baselines', {
  id:            serial('id').primaryKey(),
  project_id:    integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  label:         text('label').notNull().default('Baseline'),
  snapshot_json: jsonb('snapshot_json').notNull(),
  // snapshot_json shape: Array<{ wbs_item_id: number, name: string, start: string, end: string }>
  created_at:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  created_by:    text('created_by'),  // session user_id
});
export type GanttBaseline = typeof ganttBaselines.$inferSelect;
```

**Data flow:**

```
[Capture Baseline button in GanttChart toolbar]
    ↓
POST /api/projects/[projectId]/gantt-baseline
    → Query: for each wbs_item, compute min(task.start_date) and max(task.due) for tasks in row
    → Build snapshot_json: [{ wbs_item_id, name, computed_start, computed_end }]
    → INSERT INTO gantt_baselines
    ↓
gantt/page.tsx (Server Component) — on every page load:
    → SELECT * FROM gantt_baselines WHERE project_id = X ORDER BY created_at DESC LIMIT 1
    → Pass baseline prop to GanttChart
    ↓
GanttChart.tsx:
    → Accepts optional `baseline?: BaselineRow[]` prop
    → In bar rendering loop: if baseline entry exists for wbs_item_id, render ghost bar
      behind the active bar (same row, lower opacity, dashed border)
```

**New route:** `app/api/projects/[projectId]/gantt-baseline/route.ts`
- `GET` — fetch latest baseline (or all, with `?all=true`)
- `POST` — capture new baseline

**GanttChart.tsx changes:**
- Add `baseline?: BaselineRow[]` to `GanttChartProps`
- Add `BaselineRow` interface: `{ wbs_item_id: number; start: string; end: string }`
- In the bar render loop, look up `baseline.find(b => b.wbs_item_id === row.id)` and
  render a second semi-transparent bar if found

**Migration:** `0038_gantt_baseline.sql`

---

### Feature 3: Chat Persistence

**Decision: New `chat_messages` table per project. Restore last 50 messages on `ChatPanel` mount
via `useChat` `initialMessages` prop.**

**Current state confirmed:** `ChatPanel.tsx` uses `useChat` with React state only — messages
are lost on tab navigate away. The `setMessages` function is available but unused for seeding.

**New table — Drizzle schema addition (`db/schema.ts`):**

```typescript
export const chatMessages = pgTable('chat_messages', {
  id:         serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  role:       text('role').notNull(),        // 'user' | 'assistant'
  content:    text('content').notNull(),
  message_id: text('message_id'),            // Vercel AI SDK message.id for dedup
  pinned:     boolean('pinned').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export type ChatMessage = typeof chatMessages.$inferSelect;
```

```sql
-- Index for the "last 50 messages" query pattern
CREATE INDEX chat_messages_project_created_idx ON chat_messages(project_id, created_at DESC);
```

**Data flow change:**

```
BEFORE:
  ChatPanel mounts → useChat state = [] → messages lost on navigate away

AFTER:
  ChatPanel mounts
      → GET /api/projects/[projectId]/chat-messages?limit=50
      → Server returns last 50 rows ordered by created_at ASC (for chronological display)
      → ChatPanel passes as useChat initialMessages OR calls setMessages() in useEffect
      → useChat manages session from that point forward
      → On each user send: POST /api/projects/[projectId]/chat-messages { role: 'user', ... }
      → On useChat onFinish callback: POST with { role: 'assistant', content, message_id }
```

**Vercel AI SDK note:** The `useChat` hook from `@ai-sdk/react` supports `initialMessages` prop.
Passing the restored messages as `initialMessages` avoids a flash of empty state and is cleaner
than `setMessages` in `useEffect`. The Server Component (`chat/page.tsx`) should fetch the last
50 messages and pass them as a prop to `ChatPanel`, eliminating the client-side fetch on mount.

**ChatPanel.tsx props change:**

```typescript
interface ChatPanelProps {
  projectId: number
  initialContext: string
  initialMessages?: UIMessage[]   // NEW — passed from Server Component
}
```

**New routes:**
- `GET /api/projects/[projectId]/chat-messages` — returns `{ messages: ChatMessage[] }`
- `POST /api/projects/[projectId]/chat-messages` — persist a single message

---

### Feature 4: Pinned Answers

**Decision: `pinned` boolean column on `chat_messages` table. No separate table.**

The `chat_messages` table above already includes `pinned BOOLEAN NOT NULL DEFAULT false`.

**UI change to `ChatMessage.tsx`:**
- Add a pin icon button (shows on hover for assistant messages only)
- On click: `PATCH /api/projects/[projectId]/chat-messages/[messageId]` with `{ pinned: true/false }`
- Pinned messages get a visual indicator (border, background, or icon) in the message list

**New route:** `app/api/projects/[projectId]/chat-messages/[messageId]/route.ts`
- `PATCH` — toggle `pinned` flag

**Schema impact:** Covered by `chat_messages.pinned`. No additional migration needed beyond
what Feature 3 adds.

---

### Feature 5: Owner Picker — Saving Stakeholder ID

**Decision: Add `owner_stakeholder_id` FK column alongside existing `owner` TEXT on 4 tables.
Dual-write both fields during v9.0. Do NOT remove `owner` text yet.**

**Rationale:** The `owner` text field is read by:
- Extraction pipeline (ingests free text into `owner`)
- YAML export (`lib/yaml-export.ts`)
- Skill context builders (`lib/skill-context.ts`)
- Audit log (stores owner as string in before/after JSON)

Removing it breaks all four without a migration path. The safe pattern is dual-write: UI writes
both `owner = stakeholder.name` and `owner_stakeholder_id = stakeholder.id`. All existing readers
continue using the text field. Future milestones can migrate readers to the FK once all write
paths are updated.

**Schema changes — add columns only:**

```sql
ALTER TABLE tasks      ADD COLUMN owner_stakeholder_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL;
ALTER TABLE actions    ADD COLUMN owner_stakeholder_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL;
ALTER TABLE risks      ADD COLUMN owner_stakeholder_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL;
ALTER TABLE milestones ADD COLUMN owner_stakeholder_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL;
```

**Drizzle schema change** (add to each of the 4 table definitions):

```typescript
owner_stakeholder_id: integer('owner_stakeholder_id').references(() => stakeholders.id, { onDelete: 'set null' }),
```

**OwnerCell.tsx upgrade:**

The current `OwnerCell` fetches stakeholder names for datalist autocomplete via
`GET /api/stakeholders?project_id=X`. Upgrade the autocomplete to return `{ id, name }` objects.
When the user selects from the datalist (exact match), include `owner_stakeholder_id` in the
PATCH payload. When the user types a free-text name not in the list, send only `owner` with no
`owner_stakeholder_id` (null or unchanged).

```typescript
// OwnerCell sends:
{ owner: 'Alice Chen', owner_stakeholder_id: 42 }  // from datalist select
{ owner: 'unknown person', owner_stakeholder_id: null }  // free text
```

PATCH schema for tasks/actions/risks/milestones routes must add `owner_stakeholder_id` as an
optional nullable field to their Zod schemas.

**Migration:** `0039_owner_stakeholder_id.sql` (single migration covering all 4 tables)

---

### Feature 6: Exceptions Panel (Per-Project)

**Decision: Pure server-side query evaluation on page load. No BullMQ job. No cache.**

**Rationale:** All data needed to evaluate exceptions is already fetched for the Overview tab
via `getWorkspaceData(projectId)`. A pure client-side computation function (following the
`PortfolioExceptionsPanel.computeExceptions()` pattern) runs in sub-millisecond time over
the existing data. BullMQ adds latency (stale results) and Redis dependency for what is a
trivial computation.

**Exception rules and data sources:**

| Exception Type | Rule | Data Already Available |
|----------------|------|------------------------|
| Overdue tasks | `due < today AND status != 'done'` | `getTasksForProject()` |
| At-risk milestones | `date < today AND status NOT IN ('completed','blocked')` | `getMilestonesForProject()` |
| High/critical open risks | `severity IN ('high','critical') AND status = 'open'` | `getWorkspaceData().risks` |
| Blocked tasks | `status = 'blocked'` | `getTasksForProject()` |
| Actions overdue | `due < today AND status NOT IN ('completed','cancelled')` | `getWorkspaceData().actions` |
| Stale project | `project.updated_at < (today - 14 days)` | `getProjectWithHealth()` |

**Data flow:**

```
overview/page.tsx (Server Component)
    → getWorkspaceData(projectId)  [already called for Overview metrics]
    ↓
<ExceptionsPanel data={workspaceData} />  (new client component, co-located with HealthDashboard)
    → computeProjectExceptions(data)  [pure function, same pattern as PortfolioExceptionsPanel]
    → Render sorted exception rows with severity badges and entity links
```

**New component:** `components/ProjectExceptionsPanel.tsx`

Follows exact same shape as `PortfolioExceptionsPanel.tsx`:
- Accepts pre-fetched workspace data as props
- `computeProjectExceptions()` is a pure function (no fetch calls)
- Returns sorted `ExceptionRow[]` with `{ entityType, entityId, description, severity }`
- Links to the relevant entity (e.g., risk R-KAISER-001 → `/customer/[id]/risks?id=1`)

**Schema impact:** None. All data already exists.

---

### Feature 7: Risk Score

**Decision: Computed in application layer (pure function). New columns `likelihood` and `impact`
(integer 1–5) and `target_date` (TEXT) on the `risks` table. Score label derived as
Low/Medium/High/Critical from `likelihood * impact`.**

**Rationale:** PostgreSQL generated columns for this computation would add migration complexity
with no benefit. A pure function (`computeRiskScore()`) is testable and consistent with the
existing `computeOverallHealth()` and `computeTrackHealth()` pattern in `HealthDashboard.tsx`.

**Schema changes:**

```sql
ALTER TABLE risks ADD COLUMN likelihood  INTEGER CHECK (likelihood BETWEEN 1 AND 5);
ALTER TABLE risks ADD COLUMN impact      INTEGER CHECK (impact BETWEEN 1 AND 5);
ALTER TABLE risks ADD COLUMN target_date TEXT;
```

**Drizzle schema additions on `risks` table:**

```typescript
likelihood:  integer('likelihood'),
impact:      integer('impact'),
target_date: text('target_date'),
```

**Score formula — new file `lib/risk-score.ts`:**

```typescript
export type RiskScoreLabel = 'low' | 'medium' | 'high' | 'critical'

export function computeRiskScore(
  likelihood: number | null,
  impact: number | null
): RiskScoreLabel | null {
  if (!likelihood || !impact) return null
  const score = likelihood * impact      // 1-25 scale
  if (score <= 4)  return 'low'
  if (score <= 9)  return 'medium'
  if (score <= 16) return 'high'
  return 'critical'
}
```

**Component changes:**
- `RisksTableClient.tsx`: Import `computeRiskScore`, add Risk Score column showing computed
  label badge next to severity badge. Severity remains the manual field; Risk Score is derived.
- `RiskEditModal.tsx`: Add likelihood (1–5 select) and impact (1–5 select) fields + target_date
  DatePicker. Show live preview of computed score as user adjusts sliders/selects.
- `AddRiskModal.tsx`: Same new fields.

**PATCH route for risks** (`app/api/projects/[projectId]/risks/route.ts` or the risk-by-ID
handler): Add `likelihood`, `impact`, `target_date` to the Zod patch schema.

**Migration:** `0040_risk_fields.sql`

---

### Feature 8: Gantt ↔ Task Dates (Phase Date Aggregation)

**Decision: Compute phase date range in `mapDataToWbsRows()` in `gantt/page.tsx` Server
Component. No extra DB query — derive from the already-fetched tasks array.**

**Rationale:** `gantt/page.tsx` already fetches all tasks and maps them into `GanttWbsRow[]`.
Extending `mapDataToWbsRows()` to compute `MIN(task.start_date)` and `MAX(task.due)` per row
from the in-memory tasks array adds a 1–2 line computation with zero additional DB cost.

**`GanttWbsRow` interface extension:**

```typescript
export interface GanttWbsRow {
  id: number
  name: string
  colorIdx: number
  level: number
  parentId: number | null
  track?: 'ADR' | 'Biggy'
  tasks: GanttTask[]
  phaseStart?: string   // NEW: min(task.start_date) for tasks in this row (ISO date)
  phaseEnd?: string     // NEW: max(task.due) for tasks in this row (ISO date)
}
```

**`mapDataToWbsRows()` extension in `gantt/page.tsx`:**

After building the `wbsToTasks` map and before returning the `GanttWbsRow[]`, add:

```typescript
// Compute phase date range from assigned tasks
function computePhaseDates(rowTasks: typeof tasks): { phaseStart?: string; phaseEnd?: string } {
  const starts = rowTasks.map(t => t.start_date).filter((s): s is string => !!s && /^\d{4}-\d{2}-\d{2}/.test(s))
  const ends   = rowTasks.map(t => t.due).filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}/.test(d))
  return {
    phaseStart: starts.length > 0 ? starts.sort()[0] : undefined,
    phaseEnd:   ends.length > 0   ? ends.sort().at(-1) : undefined,
  }
}
```

**GanttChart.tsx rendering:** The WBS row-level bar span uses `phaseStart`/`phaseEnd` when
present as the overall row header bar. Individual task bars within the row continue to render
as-is. This creates a two-level visual: a wide phase span bar at the row header + individual
task bars inside the row.

**Schema impact:** None.

---

### Feature 9: Active Tracks Config — Project Settings

**Decision: Add `active_tracks` JSONB column to existing `projects` table.**

**Rationale:** This is project metadata — a small JSONB object `{ ADR: boolean, Biggy: boolean }`.
A new `project_settings` table is premature abstraction for what is effectively two boolean
flags. The `projects` table already carries optional config columns (`weekly_hour_target`,
`exec_action_required`, `description`). If the settings surface grows substantially in future,
extract to `project_settings` then.

**Other v9.0 Settings tab fields and their existing columns:**
- Project rename → `projects.name` (already exists)
- Go-live date → `projects.go_live_target` (already exists)
- Description → `projects.description` (already exists)

**Active tracks is the only new field.**

**Schema change:**

```sql
ALTER TABLE projects ADD COLUMN active_tracks JSONB NOT NULL DEFAULT '{"ADR": true, "Biggy": true}';
```

**Drizzle schema addition on `projects` table:**

```typescript
active_tracks: jsonb('active_tracks').$type<{ ADR: boolean; Biggy: boolean }>().notNull().default({ ADR: true, Biggy: true }),
```

**Settings tab data flow:**

```
settings/page.tsx (Server Component)
    → getProjectWithHealth(projectId)  [already fetches project row]
    ↓
<ProjectSettingsForm project={project} isProjectAdmin={isProjectAdmin} />
    (new client component — replaces the current DangerZoneSection-only layout)
    → Fields: name input, description textarea, go_live_target DatePicker
    → Toggles: ADR active (boolean), Biggy active (boolean)
    → PATCH /api/projects/[projectId] { name, description, go_live_target, active_tracks }
    ↓
<DangerZoneSection ... />   [existing — remains as-is below settings form]
```

**Track hiding in WBS and Gantt:**
- `wbs/page.tsx`: Filter `getWbsItems()` calls — skip the track if `active_tracks[track] === false`
- `gantt/page.tsx`: Filter `adrWbs`/`biggyWbs` before `mapDataToWbsRows()` if track disabled
- `active_tracks` must be fetched in these Server Components and used to conditionally skip
  the `getWbsItems()` call for disabled tracks

**PATCH route extension:** `app/api/projects/[projectId]/route.ts` — add `active_tracks` to
the project PATCH Zod schema.

**Migration:** `0041_active_tracks.sql`

---

### Feature 10: Meeting Prep Skill

**Decision: New `SKILL.md` file in the skills directory. Uses the existing skill execution
infrastructure end-to-end. No inline AI call in a modal.**

**Rationale:** The `SkillOrchestrator` → `skill_runs` → `skill_run_chunks` → SSE polling
pipeline is already fully operational across 15 skills. Adding a 16th skill requires only:
1. A new `SKILL.md` file in the skills directory
2. That file satisfies the Phase 63 Skills Design Standard YAML front-matter schema

`lib/skill-path.ts` resolves the skills directory at runtime via `resolveSkillsDir()`. The
skills page (`app/customer/[id]/skills/page.tsx`) discovers skills via `readdir()` + YAML
front-matter parsing — no code changes needed to surface a new skill in the UI.

An inline AI modal approach would bypass `skill_runs` history, Output Library storage,
streaming UI, cancel button, progress indicator, and the Skills Design Standard compliance
check. These are regressions, not simplifications.

**Implementation:**

New file: `[skills_dir]/meeting-prep/SKILL.md`

Required YAML front-matter (must be Phase 63 compliant):

```yaml
---
name: meeting-prep
label: Meeting Prep
description: Generates a structured meeting brief with open actions, upcoming milestones, recent decisions, and stakeholder context for an upcoming customer meeting.
inputRequired: true
inputLabel: Meeting agenda or attendees (optional — leave blank for a general brief)
schedulable: false
errorBehavior: retry
---
```

**Context builder:** `buildSkillContext()` in `lib/skill-context.ts` already assembles project
context (actions, risks, milestones, stakeholders, engagement history). Meeting Prep can use the
same context builder with no changes. The prompt body in `SKILL.md` directs which sections to
emphasize.

**Skill invocation chain (unchanged):**

```
Skills tab → SkillsTabClient → POST /api/projects/[projectId]/runs
    ↓
BullMQ job → SkillOrchestrator.run(params)
    → reads SKILL.md from disk via resolveSkillsDir() + readFile()
    → builds context via buildSkillContext()
    → calls Anthropic API with streaming
    → writes chunks to skill_run_chunks table
    ↓
Client polls /api/projects/[projectId]/runs/[runId]
    → streams chunks to SkillOutput display
    → on complete: saves to Output Library
```

**Schema impact:** None.

---

## New Schema Elements — Complete Reference

| Change | Type | Purpose | Migration |
|--------|------|---------|-----------|
| `gantt_baselines` table | New table | Gantt snapshot for ghost bar comparison | `0038_gantt_baseline.sql` |
| `chat_messages` table | New table | Chat persistence + pin flag | `0039_chat_messages.sql` |
| `tasks.owner_stakeholder_id` | New FK column | Stakeholder picker saves resolved ID | `0040_owner_stakeholder_id.sql` |
| `actions.owner_stakeholder_id` | New FK column | Same | same migration |
| `risks.owner_stakeholder_id` | New FK column | Same | same migration |
| `milestones.owner_stakeholder_id` | New FK column | Same | same migration |
| `risks.likelihood` | New integer column | Risk score input (1–5) | `0041_risk_fields.sql` |
| `risks.impact` | New integer column | Risk score input (1–5) | same migration |
| `risks.target_date` | New TEXT column | Target resolution date | same migration |
| `projects.active_tracks` | New JSONB column | Track enable/disable per project | `0042_active_tracks.sql` |

**Migration numbering:** Current highest is `0037_entity_lifecycle.sql`. Confirm before writing.

---

## Component Change Map

### Modified Existing Components

| Component | Nature of Change |
|-----------|-----------------|
| `components/GanttChart.tsx` | Add `baseline?: BaselineRow[]` prop; render ghost bars alongside active bars |
| `components/GanttChart.tsx` | Extend `GanttWbsRow` interface with `phaseStart?`, `phaseEnd?` |
| `app/customer/[id]/gantt/page.tsx` | Fetch latest baseline row; pass to GanttChart; compute phase date ranges in `mapDataToWbsRows()` |
| `components/chat/ChatPanel.tsx` | Accept `initialMessages` prop; add persist-on-send/finish behavior |
| `components/chat/ChatMessage.tsx` | Add pin icon button; PATCH pin route on click |
| `app/customer/[id]/chat/page.tsx` | Fetch last 50 messages server-side; pass as `initialMessages` |
| `components/OwnerCell.tsx` | Return `{ id, name }` from autocomplete; include `owner_stakeholder_id` in PATCH payload |
| `components/RisksTableClient.tsx` | Add Risk Score badge column (computed client-side) |
| `components/RiskEditModal.tsx` | Add likelihood/impact selects + target_date DatePicker |
| `components/AddRiskModal.tsx` | Same new fields as RiskEditModal |
| `app/customer/[id]/settings/page.tsx` | Replace DangerZoneSection-only layout with full settings form |
| `app/customer/[id]/wbs/page.tsx` | Read `active_tracks` from project; skip disabled track queries |
| `app/customer/[id]/gantt/page.tsx` | Read `active_tracks` from project; filter wbs items before mapping |
| `db/schema.ts` | Add all new table and column definitions |

### New Components

| Component | Purpose |
|-----------|---------|
| `components/ProjectSettingsForm.tsx` | Project rename, go-live date, description, active tracks toggles |
| `components/GanttBaselineCapture.tsx` | Label input + Capture button; POSTs to gantt-baseline route |
| `components/ProjectExceptionsPanel.tsx` | Per-project exceptions: pure computation over workspace data |
| `lib/risk-score.ts` | Pure `computeRiskScore(likelihood, impact)` function |

### New Route Handlers

| Route | Methods | Purpose |
|-------|---------|---------|
| `app/api/projects/[projectId]/gantt-baseline/route.ts` | GET, POST | Fetch latest baseline; capture new snapshot |
| `app/api/projects/[projectId]/chat-messages/route.ts` | GET, POST | List last N messages; persist message |
| `app/api/projects/[projectId]/chat-messages/[messageId]/route.ts` | PATCH | Toggle `pinned` flag |

### New Files (non-component)

| File | Purpose |
|------|---------|
| `[skills_dir]/meeting-prep/SKILL.md` | Meeting Prep skill definition (read at runtime) |
| `db/migrations/0038_gantt_baseline.sql` | `gantt_baselines` table |
| `db/migrations/0039_chat_messages.sql` | `chat_messages` table + index |
| `db/migrations/0040_owner_stakeholder_id.sql` | FK columns on tasks/actions/risks/milestones |
| `db/migrations/0041_risk_fields.sql` | `likelihood`, `impact`, `target_date` on risks |
| `db/migrations/0042_active_tracks.sql` | `active_tracks` JSONB on projects |

---

## Build Order — Dependency-Aware

Schema must exist before UI that depends on it. Migrations must be applied before any
route handlers reference the new columns/tables.

### Wave 1 — Schema Foundation (all 5 migrations as one batch)

Build these first, together, with no UI:

1. `0038_gantt_baseline.sql` — `gantt_baselines` table
2. `0039_chat_messages.sql` — `chat_messages` table + index
3. `0040_owner_stakeholder_id.sql` — FK columns on 4 tables
4. `0041_risk_fields.sql` — `likelihood`, `impact`, `target_date` on `risks`
5. `0042_active_tracks.sql` — `active_tracks` JSONB on `projects`

**And update `db/schema.ts` with all new Drizzle definitions in the same commit.**

### Wave 2 — Independent Features (no cross-feature dependencies, parallelizable)

6. **Risk Score** — `lib/risk-score.ts` + `RisksTableClient` + `RiskEditModal` + `AddRiskModal`
   + risks PATCH route extension *(depends on Wave 1 migration 0041)*

7. **Gantt ↔ Task Dates** — Extend `GanttWbsRow` interface + `mapDataToWbsRows()` computation
   *(no new schema — pure data transformation of existing tasks)*

8. **Meeting Prep Skill** — New `SKILL.md` file only
   *(no schema — uses existing skill_runs infrastructure; zero code changes)*

9. **Exceptions Panel** — `ProjectExceptionsPanel.tsx` + integrate into `overview/page.tsx`
   *(no new schema — pure computation over existing workspace data)*

### Wave 3 — Features With Wave 1 Schema

10. **Owner Picker with ID** — Upgrade `OwnerCell.tsx` + extend Zod schemas on PATCH routes
    *(depends on Wave 1 migration 0040)*

11. **Active Tracks Config** — `ProjectSettingsForm.tsx` (tracks toggles) + filter WBS/Gantt
    *(depends on Wave 1 migration 0042)*

### Wave 4 — Chat Features (build together — table + routes + UI)

12. **Chat Persistence** — New routes + ChatPanel `initialMessages` change + chat/page.tsx fetch
    *(depends on Wave 1 migration 0039)*

13. **Pinned Answers** — `ChatMessage.tsx` pin button + PATCH route
    *(depends on Feature 12 being complete; `chat_messages.pinned` column exists from Wave 1)*

### Wave 5 — Gantt Baseline (most complex — benefits from Wave 2 Gantt date work)

14. **Gantt Baseline** — `GanttBaselineCapture.tsx` + gantt-baseline routes + `GanttChart.tsx`
    ghost bar rendering *(depends on Wave 1 migration 0038; benefits from Wave 2 phase date
    aggregation being done first so the baseline snapshot captures phase-level dates)*

### Wave 6 — Settings Tab (consolidates multiple fields)

15. **Project Settings Form** — `ProjectSettingsForm.tsx` full form (rename + go-live +
    description + active tracks) + PATCH route extension
    *(depends on Wave 3 active tracks work being complete; rename/go-live/description pre-exist)*

---

## Data Flow Summaries

### Chat Tab — Before and After

```
BEFORE: ChatPanel mounts → useChat initialMessages=[] → messages lost on tab navigate

AFTER:  chat/page.tsx (Server Component)
            → SELECT * FROM chat_messages WHERE project_id=X ORDER BY created_at DESC LIMIT 50
            → reverse to chronological order
            → <ChatPanel initialMessages={restoredMessages} ... />
        ChatPanel mounts with pre-seeded messages
        On user send: POST /chat-messages { role: 'user', content, message_id }
        On useChat onFinish: POST /chat-messages { role: 'assistant', content, message_id }
```

### Gantt Tab — Before and After

```
BEFORE: page.tsx → wbs_items + tasks → mapDataToWbsRows() → GanttChart(active bars only)

AFTER:  page.tsx → wbs_items + tasks + gantt_baselines (latest) →
            mapDataToWbsRows() [extended with phaseStart/phaseEnd computation] →
            GanttChart(
              wbsRows=[...with phaseStart/phaseEnd],
              baseline=[...baseline snapshot],
            )
        GanttChart renders: active bars + phase-span bars + optional ghost bars
```

### Risks Tab — Before and After

```
BEFORE: risks (severity, status, owner text) → RisksTableClient → severity badge

AFTER:  risks (+ likelihood, impact, target_date, owner_stakeholder_id) →
            RisksTableClient → severity badge + computeRiskScore() → Risk Score badge
```

### Settings Tab — Before and After

```
BEFORE: settings/page.tsx → DangerZoneSection only (archive/delete)

AFTER:  settings/page.tsx → ProjectSettingsForm (name, go_live_target, description, active_tracks)
                           + DangerZoneSection (archive/delete, unchanged)
```

### WBS and Gantt — Track Filtering

```
BEFORE: All tracks always fetched and rendered

AFTER:  page.tsx reads project.active_tracks
        → If active_tracks.ADR === false: skip getWbsItems(projectId, 'ADR')
        → If active_tracks.Biggy === false: skip getWbsItems(projectId, 'Biggy')
        → Only enabled tracks reach GanttChart/WbsTree
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Inline AI Call for Meeting Prep

**What people do:** Create a `MeetingPrepModal` that calls `anthropic.messages.create()` directly
inside a React component or a standalone route handler.

**Why it's wrong:** Bypasses `skill_runs` history, Output Library storage, streaming UI,
cancel button, progress indicator, and the Skills Design Standard compliance check. Creates
a second AI invocation pattern with different UX and no observability.

**Do this instead:** New `SKILL.md` file + existing skill run infrastructure. Zero code changes,
full feature parity with all other skills.

---

### Anti-Pattern 2: Replacing `owner` Text With FK Only

**What people do:** Drop the `owner` text column and add only `owner_stakeholder_id` FK.

**Why it's wrong:** The extraction pipeline (`lib/document-extractor.ts`) writes free text to
`owner`. YAML export reads `owner`. Skill context builders read `owner`. Audit log stores
`owner` as string in before/after JSON. Replacing the column breaks all four without touching any.

**Do this instead:** Dual-write `owner` text AND `owner_stakeholder_id` FK. Remove `owner` in
a later cleanup milestone once all write paths are audited and migrated.

---

### Anti-Pattern 3: Client-Side Exception Data Fetching

**What people do:** Add `useEffect` fetches in `ProjectExceptionsPanel` to independently load
tasks, risks, and milestones to compute exceptions.

**Why it's wrong:** 3–5 additional API calls on tab load. The Server Component data fetch
pattern already returns all required data via `getWorkspaceData()`. The `PortfolioExceptionsPanel`
precedent is correct: receive pre-fetched data as props, compute rules in-memory.

**Do this instead:** Pass workspace data from Server Component → pure `computeProjectExceptions()`
function in the client component.

---

### Anti-Pattern 4: Storing Gantt Baseline on `projects` Table

**What people do:** Add `baseline_json JSONB` directly to the `projects` table row.

**Why it's wrong:** One baseline per project. No history. Cannot compare two baselines.
Bloats every `SELECT *` on the projects table with potentially large JSONB payloads.

**Do this instead:** Dedicated `gantt_baselines` table with `project_id` FK. Supports named
baselines, history, and future diff UIs.

---

### Anti-Pattern 5: BullMQ Job for Exceptions Computation

**What people do:** Schedule a BullMQ job to precompute exceptions and cache in Redis.

**Why it's wrong:** Exceptions are stateless rule evaluations over data already loaded for the
Overview tab. A job adds staleness (cached results may be minutes old), Redis dependency, and
job management complexity for what is a sub-millisecond in-memory computation.

**Do this instead:** Pure synchronous computation in the client component over Server Component
data. Only consider BullMQ if exception rules require cross-project aggregation queries.

---

## Sources

All findings are HIGH confidence — derived from direct codebase inspection:

- `components/TaskBoard.tsx` — Kanban DnD: already implemented (lines 290–327)
- `components/GanttChart.tsx` — GanttChartProps, GanttWbsRow, bar rendering structure
- `app/customer/[id]/gantt/page.tsx` — mapDataToWbsRows() data flow
- `components/chat/ChatPanel.tsx` — current useChat pattern (stateless, no persistence)
- `app/api/projects/[projectId]/chat/route.ts` — chat route handler pattern
- `components/PortfolioExceptionsPanel.tsx` — exceptions panel pattern to replicate
- `components/OwnerCell.tsx` — current owner save pattern and autocomplete fetch
- `components/HealthDashboard.tsx` — computeOverallHealth pure function pattern to follow
- `db/schema.ts` — full schema inventory confirming absent tables/columns
- `app/api/tasks/[id]/route.ts` — PATCH pattern with audit_log (dual-write reference)
- `lib/skill-path.ts`, `lib/skill-orchestrator.ts` — skill execution infrastructure
- `app/customer/[id]/settings/page.tsx` — current settings page structure
- `app/customer/[id]/skills/page.tsx` — skill discovery via readdir() + parseSkillMeta()

---

*Architecture research for: BigPanda Project Assistant v9.0 UX Maturity & Intelligence*
*Researched: 2026-04-22*
