# Phase 83: Architecture Sub-Capability Columns — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current flat per-node column layout in the ADR Track architecture diagram with a **grouped sub-capability column structure** that mirrors the BigPanda Future State Alert Pipeline reference diagram. Each major pipeline section (Alert Intelligence, Incident Intelligence, Workflow Automation) becomes a colored section header containing multiple sub-capability columns. Integration cards, normalization data, enrichment config, and team-specific workflow paths are shown in the appropriate sub-column.

The AI Assistant Track structure is unchanged.

This phase also updates all downstream consumers: the context upload extraction pipeline and the chat write tools must understand and route to the new sub-capability column names.

</domain>

<decisions>
## Design Decisions

### New ADR Track Structure

The flat 4-node ADR layout (Alert Intelligence → Incident Intelligence → Console → Workflow Automation) is replaced with a **grouped, expanded layout**:

**Section: Alert Intelligence** (blue group header, not a column itself)
- Sub-column: Monitoring Integrations — tool cards (Datadog, Splunk, Sahara, Dynatrace, Netcool, etc.)
- Sub-column: Alert Normalization — tag maps configured, normalization rules, mapping status
- Sub-column: Alert Enrichment — CMDB mappings, enrichment logic entries

**Console** (narrow circle node, unchanged — still its own special node between sections)

**Section: Incident Intelligence** (amber group header, not a column itself)
- Sub-column: Alert Correlation — correlation patterns and configs
- Sub-column: Incident Enrichment — incident tags, topology integrations
- Sub-column: Incident Classification — environments, classification rules
- Sub-column: Suggested Root Cause — change integrations, RCA configs

**Section: Workflow Automation** (green group header, not a column itself)
- Sub-column: Environments — customer internal/external environments, autoshares
- Sub-column: Automated Incident Creation — ITSM ticketing configs (ServiceNow, Jira, etc.)
- Sub-column: Automated Incident Notification — Slack, PagerDuty, Teams routing rules
- Sub-column: Automated Incident Remediation — runbook automation, EAP, action plans

### Schema Change: `parent_id` on `arch_nodes`

Add nullable `parent_id` (FK → `arch_nodes.id`) to the `arch_nodes` table.

- **Section nodes** (Alert Intelligence, Incident Intelligence, Workflow Automation): `parent_id = NULL`, `display_order` determines left-to-right section order. These render as colored group header bars, NOT as columns.
- **Sub-capability nodes** (Monitoring Integrations, Alert Normalization, etc.): `parent_id = <section node id>`, `display_order` determines column order within the section.
- **Console node**: `parent_id = NULL` — special node rendered as narrow circle between sections (unchanged).

Migration: `0046_arch_nodes_parent_id.sql`

### `architecture_integrations.phase` — map to sub-capability names

The `phase` field on `architecture_integrations` previously held section-level names (e.g. `'Alert Intelligence'`). It now holds sub-capability column names (e.g. `'Monitoring Integrations'`, `'Alert Normalization'`). The UI routes cards into columns by matching `integration.phase === node.name`.

Existing `phase = 'Alert Intelligence'` integrations → migrate to `phase = 'Monitoring Integrations'` (best default for monitoring source tools).

### Rendering Model

`InteractiveArchGraph` renders the ADR track as:

```
[Section Header: Alert Intelligence (blue)]
  [col: Monitoring Integrations] → [col: Alert Normalization] → [col: Alert Enrichment]
[Console (narrow circle)]
[Section Header: Incident Intelligence (amber)]
  [col: Alert Correlation] → [col: Incident Enrichment] → [col: Incident Classification] → [col: Suggested Root Cause]
[Section Header: Workflow Automation (green)]
  [col: Environments] → [col: Automated Incident Creation] → [col: Automated Incident Notification] → [col: Automated Incident Remediation]
```

Section headers span their child columns with a colored left-border bar + label. Sub-columns are regular `PhaseColumn` instances with `w-[220px]`. Arrows appear between sub-columns within a section, and a larger section-spanning arrow appears between sections.

Drag-and-drop reordering: sub-columns are sortable within their section (same DnD Kit pattern). Section headers are not draggable.

### Integration Add/Edit Modal

Phase picker becomes a grouped `<select>` (using `<optgroup>`) — sub-capability names appear under their section. Remove the old flat phase list for ADR.

### `getArchNodes` Query

Fetch both section nodes (parent_id IS NULL, display_order < 100) and sub-capability nodes (parent_id IS NOT NULL). The current `display_order < 100` filter for the column-nodes query stays. Section nodes are fetched separately.

### Document Extraction Updates

`document-extraction.ts` prompt updates:
- `architecture` entity `phase` field: sub-capability names replace section names in the stage assignment guide. Monitoring sources → `'Monitoring Integrations'`, enrichment/normalization → `'Alert Normalization'` or `'Alert Enrichment'`, ITSM ticketing → `'Automated Incident Creation'`, notifications → `'Automated Incident Notification'`, etc.
- `arch_node` entity: section nodes (Alert Intelligence, Incident Intelligence, Workflow Automation) remain valid `node_name` values for status updates. Sub-capability nodes can also be referenced by their exact names.

### Chat Context Builder

`lib/chat-context-builder.ts` — the architecture section of the context string groups by section → sub-column for clarity. Integration cards reference their sub-capability column.

### Chat Write Tools

`app/api/projects/[projectId]/chat/tools/arch.ts` — `createArchNodeTool` Zod schema: add optional `parent_node_name` field. When provided, resolve the parent node id before inserting. When creating a sub-capability node, Claude passes both `track_name` and `parent_node_name`.

### Seed Scripts & New Project Creation

`app/api/projects/route.ts` and `scripts/seed-projects.ts` — replace the 4-node flat ADR seed with the full 3-section + 10-sub-column structure (plus Console). Section nodes inserted first, sub-capability nodes inserted with `parent_id` set.

### Existing Project Migration

DB migration script updates existing projects' `arch_nodes`:
1. Insert section nodes (Alert Intelligence, Incident Intelligence, Workflow Automation) as parent nodes with `display_order` 1, 2, 3.
2. Insert sub-capability nodes for each section.
3. Delete the old flat section nodes (old `Alert Intelligence`, `Incident Intelligence`, `Workflow Automation`, `Workflow Automation` rows that had no children).
4. Migrate `architecture_integrations.phase = 'Alert Intelligence'` → `'Monitoring Integrations'`.

</decisions>

<specifics>
## Layout Reference

From the BigPanda Future State Alert Pipeline diagram:

**EVENTS (= Alert Intelligence section)**
- Event Ingest sources feed into: Event Normalization & Event Filtering → Events API → Event Aggregation
- Alert Normalization: Mapping Enrichment + Alert Tags → Alert Enrichment → Alert Filtering → Alert Suppression
- CMDB feeds into Alert Enrichment
→ Mapped to: Monitoring Integrations | Alert Normalization | Alert Enrichment

**INCIDENTS (= Incident Intelligence section)**
- Alert Correlation → Incident Enrichment (Incident Tags) → Incident Classification (Environments) → Suggested Root Cause
- Change source feeds into Incident Classification and Suggested Root Cause
→ Mapped to: Alert Correlation | Incident Enrichment | Incident Classification | Suggested Root Cause

**ACTIONED INCIDENTS (= Workflow Automation section)**
- Environments → Autoshares + Manual Shares → Automated Incident Creation / Notification / Remediation
→ Mapped to: Environments | Automated Incident Creation | Automated Incident Notification | Automated Incident Remediation

**BigPanda Console** sits between Incident Intelligence and Workflow Automation (narrow circle, unchanged).

</specifics>

<code_context>
## Files to Touch

### New
- `db/migrations/0046_arch_nodes_parent_id.sql` — ADD COLUMN parent_id integer REFERENCES arch_nodes(id)

### Modified
- `db/schema.ts` — add `parent_id` to `archNodes` table definition
- `lib/queries.ts` — `getArchNodes()`: fetch section nodes + sub-capability nodes separately; extend `ArchNode` type
- `components/arch/InteractiveArchGraph.tsx` — full rendering overhaul: section headers + sub-columns; `PhaseColumn` unchanged, new `SectionHeader` wrapper
- `components/arch/IntegrationEditModal.tsx` — grouped `<optgroup>` phase picker for ADR
- `app/api/projects/route.ts` — new project arch seed: section + sub-capability nodes
- `scripts/seed-projects.ts` — same update for dev seed script
- `lib/chat-context-builder.ts` — group architecture context by section → sub-column
- `worker/jobs/document-extraction.ts` — sub-capability phase names in stage assignment guide
- `app/api/ingestion/approve/route.ts` — no change needed (arch_node upsert uses `node_name` match which still works)
- `app/api/projects/[projectId]/chat/tools/arch.ts` — `createArchNodeTool` adds optional `parent_node_name`

### DB (direct migration for existing projects)
Embedded in migration SQL: seed section nodes and sub-capability nodes for existing projects. Phase names in `architecture_integrations` remapped.

</code_context>

<deferred>
## Deferred

- AI Assistant Track sub-capability expansion (deferred to a future phase — current structure is good)
- Tooltip hover showing sub-capability descriptions (could be added without schema change in a future polish phase)
- Sub-capability status badges (each sub-column has its own status independent of the section — low priority for now, section-level status is sufficient)

</deferred>

---

*Phase: 83-architecture-sub-capability-columns*
*Context gathered: 2026-04-29*
