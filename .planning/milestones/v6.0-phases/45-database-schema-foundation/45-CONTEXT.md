# Phase 45: Database Schema Foundation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Create all new tables, columns, seed data, and query functions needed to support WBS, Team Engagement, and Architecture features. Nothing visible to users yet — this is pure data model. Downstream phases (46: extraction, 47: WBS UI, 48: Architecture & Team Engagement) consume this schema directly.

</domain>

<decisions>
## Implementation Decisions

### WBS hierarchy storage
- `parent_id + level` column on `wbs_items`: each row has a nullable `parent_id` (self-reference) and an explicit `level` integer (1, 2, 3)
- Level 1 = top-level sections, Level 2 = sub-items, Level 3 = tasks
- Max depth of 3 enforced at application level (level column makes it trivial to check)
- Status per item: `not_started` / `in_progress` / `complete`
- Task linkage via `wbs_task_assignments` join table (wbs_item_id + task_id) — a task can link to multiple WBS nodes
- Tasks must be assignable at ANY level (section or sub-item), not forced to leaf nodes only

### WBS template seeding — ADR (10 sections)
Seeded on project creation inside `db.transaction`, same pattern as onboarding phases.

Level-1 sections and their level-2 sub-items:

1. **Discovery & Kickoff** — no predefined sub-items
2. **Solution Design**
   - Ops Shadowing / Current State
   - Future State Workflow
   - ADR Process Consulting
3. **Alert Source Integration**
   - Outbound Integrations
   - Inbound Integrations
4. **Alert Enrichment & Normalization**
   - Tag Documentation
   - Normalization Configuration
   - CMDB
5. **Platform Configuration**
   - Environments
   - Incident Tags
   - Role Based Access Control
   - Incident Routing
   - Maintenance Plans
   - Single Sign-On
   - Admin / Reporting
6. **Correlation**
   - Use Case Discovery
   - Correlation Configuration
7. **Routing & Escalation** — no predefined sub-items (highly project-specific)
8. **Teams & Training**
   - User Training
9. **UAT & Go-Live Preparation**
   - UAT
   - Documentation
   - Go-Live Prep
10. **Go-Live**
    - Go Live
    - Post Go-Live Survey
    - Unified Analytics
    - Project Closure

### WBS template seeding — Biggy (5 sections)

1. **Discovery & Kickoff** — no predefined sub-items
2. **Integrations**
   - Real-Time Integrations
   - Context Integrations
   - UDC
3. **Workflow**
   - Action Plans
   - Workflows
   - Managed Incident Channels
4. **Teams & Training**
   - Team-Specific Workflow Enablement
   - Workflow Automations
   - Training
5. **Deploy** — no predefined sub-items

### Team Engagement section schema
- 5 sections stored as rows in `team_engagement_sections` table: Business Outcomes, Architecture, E2E Workflows, Teams & Engagement, Top Focus Areas
- Each section has a single `content` text field (markdown-friendly) — one blob per section
- Sections are pre-seeded for every new project (empty content) inside the same `db.transaction` as project creation
- Phase 46 writes extracted content; Phase 48 renders as editable rich text areas
- No structured sub-fields — extraction writes to the blob, UI displays/edits the blob

### Architecture node model
- `arch_tracks` and `arch_nodes` seeded per project (not a global template) — each customer is at a different deployment stage
- Two tracks seeded per project:
  - **ADR Track**: Event Ingest → Alert Intelligence → Incident Intelligence → Console → Workflow Automation
  - **AI Assistant Track**: Knowledge Sources → Real-Time Query → AI Capabilities → Console → Outputs & Actions
- Each `arch_node` has: track_id, name, display_order, status (`planned` / `in_progress` / `live`), notes text
- Team Onboarding Status matrix lives in a separate `arch_team_status` table (team_name + capability_stage + status per project) — not mixed into arch_nodes

### Projects table additions
- `exec_action_required` boolean column (default false) — flags projects needing executive action; used by Phase 49 portfolio dashboard exceptions panel
- Project dependencies stored in a `project_dependencies` join table (source_project_id + depends_on_project_id) — proper relational model, consistent with wbs_task_assignments pattern

### Migration file
- Next migration: `0028_wbs_team_arch_schema.sql`
- Adds: wbs_items, wbs_task_assignments, team_engagement_sections, arch_tracks, arch_nodes, arch_team_status, project_dependencies tables; exec_action_required column on projects

### Query functions (lib/queries.ts additions)
- `getWbsItems(projectId, track)` — returns wbs_items for a project/track, ordered by level + display_order
- `getTeamEngagementSections(projectId)` — returns all 5 sections for a project
- `getArchNodes(projectId)` — returns arch_tracks + arch_nodes for a project
- `getArchTeamStatus(projectId)` — returns arch_team_status rows for a project

### Claude's Discretion
- Exact column names and Drizzle type definitions beyond what is specified here
- display_order column on wbs_items (assumed yes, consistent with onboardingPhases pattern)
- source_trace column on wbs_items (consistent with project-wide source tracing requirement — assume yes)
- Whether to extract seeding logic into a shared `seedProjectDefaults(tx, projectId)` helper or keep inline in route.ts

</decisions>

<specifics>
## Specific Ideas

- WBS structure derived directly from `/Users/jmiloslavsky/Downloads/ADR WBS Template.xlsx` — level-2 sub-items mapped to the 10-section structure we defined
- Tasks not fitting exactly into the WBS structure must still be assignable — the schema must not enforce WBS node assignment (wbs_task_assignments is optional, not required)
- Seeding pattern: follow `app/api/projects/route.ts` exactly — `db.transaction`, insert project, then seed all dependent tables atomically

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/api/projects/route.ts` — existing seeding transaction pattern (ADR + Biggy onboarding phases); extend this file to also seed WBS items, team_engagement_sections, arch_tracks/nodes
- `db/schema.ts` — add all new table definitions here; follow existing table comment style (`// ─── Table N: name`)
- `db/migrations/` — next file is `0028_wbs_team_arch_schema.sql`; follow existing SQL migration style (no transactions in migration files, plain DDL)
- `lib/queries.ts` — add new query functions after existing ones; follow `export async function getFoo(projectId: number)` pattern

### Established Patterns
- Migration files: plain DDL SQL in `db/migrations/00XX_name.sql`; Drizzle schema in `db/schema.ts` must match
- Atomic seeding: all seeds inside `db.transaction` in `app/api/projects/route.ts` — never outside transaction
- No backfill needed — dev data wiped before go-live (confirmed Phase 33)
- Self-referencing FK pattern: not yet used in codebase — `parent_id integer references wbs_items(id)` is new
- Enums: PostgreSQL `pgEnum` in schema.ts; requires `CREATE TYPE` in migration SQL before `CREATE TABLE`

### Integration Points
- `app/api/projects/route.ts` POST handler: add WBS, team_engagement_sections, arch seeding inside existing transaction (after onboarding phase inserts)
- `lib/queries.ts`: new query functions consumed by Phase 47 (WBS page), Phase 48 (Architecture + Team Engagement pages)
- `app/customer/[id]/wbs/page.tsx`: Phase 44 created a placeholder — Phase 47 will call `getWbsItems()` here; schema must be ready
- `db/schema.ts` exports: add TypeScript types (`export type WbsItem = typeof wbsItems.$inferSelect`) for use in query return types

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 45-database-schema-foundation*
*Context gathered: 2026-04-08*
