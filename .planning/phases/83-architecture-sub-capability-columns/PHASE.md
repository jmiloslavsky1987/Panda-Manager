# Phase 83: Architecture Sub-Capability Columns

**Milestone:** v11.0 (or standalone patch)
**Status:** Planned
**Goal:** Expand the ADR track architecture diagram from 4 flat columns into a grouped sub-capability layout matching the BigPanda Future State Alert Pipeline reference. Three section groups (Alert Intelligence, Incident Intelligence, Workflow Automation) each contain 3–4 sub-columns. Console remains as a narrow circle between sections. All downstream consumers (extraction pipeline, chat write tools, integration modal) updated to use sub-capability column names.

---

## Requirements

### ARCH-SUB-01 — Schema: `parent_id` on `arch_nodes`
Add nullable `parent_id` FK (`arch_nodes.id`) to `arch_nodes`. Section nodes have `parent_id = NULL`. Sub-capability nodes have `parent_id = <section node id>`. Console node has `parent_id = NULL`.

### ARCH-SUB-02 — DB Migration: existing projects
Migration `0046` seeds section nodes + sub-capability nodes for all existing projects and remaps `architecture_integrations.phase` from section names to sub-capability names.

### ARCH-SUB-03 — `getArchNodes` query update
Fetch section nodes and sub-capability nodes, return structured `{ sections: ArchNode[], subNodes: ArchNode[] }` (or flat with `parent_id` set). Preserve `display_order < 100` filter for column nodes.

### ARCH-SUB-04 — `InteractiveArchGraph` rendering overhaul
ADR track renders as: colored section header bar → child sub-columns with arrows between them → section-spanning arrow → next section. Console node between Incident Intelligence and Workflow Automation sections. AI Assistant Track unchanged.

### ARCH-SUB-05 — `IntegrationEditModal` phase picker
ADR phase `<select>` uses `<optgroup>` elements grouping sub-capability names under their section label.

### ARCH-SUB-06 — New project seed (`app/api/projects/route.ts`)
Replace 4-node flat ADR seed with full section + 10 sub-column seed. Console unchanged.

### ARCH-SUB-07 — Dev seed script (`scripts/seed-projects.ts`)
Same update as ARCH-SUB-06 for the dev seed.

### ARCH-SUB-08 — Document extraction prompt
`document-extraction.ts` stage assignment guide maps tool categories to sub-capability column names (Monitoring Integrations, Alert Normalization, Alert Enrichment, Alert Correlation, Incident Enrichment, Incident Classification, Suggested Root Cause, Environments, Automated Incident Creation, Automated Incident Notification, Automated Incident Remediation).

### ARCH-SUB-09 — Chat context builder
`lib/chat-context-builder.ts` architecture section groups integrations by section → sub-column for clearer AI context.

### ARCH-SUB-10 — Chat write tools: arch node creation
`createArchNodeTool` adds optional `parent_node_name` field. Claude can create sub-capability nodes under a named section.

---

## Plan Breakdown

### Plan 83-00: Wave 0 — Schema, Migration, Query (foundation)
**Wave:** 0 | **Depends on:** none | **Autonomous:** yes

Tasks:
1. Write `db/migrations/0046_arch_nodes_parent_id.sql` — `ALTER TABLE arch_nodes ADD COLUMN parent_id integer REFERENCES arch_nodes(id) ON DELETE CASCADE;`
2. Update `db/schema.ts` — add `parent_id: integer('parent_id').references(() => archNodes.id)` to `archNodes` table
3. Update `lib/queries.ts` — `getArchNodes()` returns `{ tracks, sectionNodes, subNodes }` where sectionNodes have `parent_id IS NULL AND display_order < 100`, subNodes have `parent_id IS NOT NULL`; extend `ArchNode` export type (already includes all columns via `$inferSelect`)
4. Run migration inside Docker: `docker-compose exec postgres psql -U postgres -d bigpanda_app -f /dev/stdin < migration`

Verification: `db/schema.ts` compiles clean, migration applies, `getArchNodes` returns correctly shaped data.

---

### Plan 83-01: Wave 1 — DB Seed: existing projects + new project creation
**Wave:** 1 | **Depends on:** 83-00 | **Autonomous:** yes

Tasks:
1. Write and execute SQL to seed existing projects (1, 2, 3 inside Docker):
   - Insert section nodes for ADR Track (Alert Intelligence parent, Incident Intelligence parent, Workflow Automation parent) with `display_order` 1/2/3, `parent_id = NULL`
   - Insert 10 sub-capability nodes per project with correct `parent_id` values:
     - Under Alert Intelligence: Monitoring Integrations (order 1), Alert Normalization (order 2), Alert Enrichment (order 3)
     - Under Incident Intelligence: Alert Correlation (order 1), Incident Enrichment (order 2), Incident Classification (order 3), Suggested Root Cause (order 4)
     - Under Workflow Automation: Environments (order 1), Automated Incident Creation (order 2), Automated Incident Notification (order 3), Automated Incident Remediation (order 4)
   - Delete old flat section nodes (Alert Intelligence, Incident Intelligence, Workflow Automation, Workflow Automation with no parent_id that were created in Phase 82 work)
   - Migrate `architecture_integrations.phase`: `'Alert Intelligence'` → `'Monitoring Integrations'`; `'Workflow Automation'` → `'Automated Incident Creation'`
2. Update `app/api/projects/route.ts` — new project arch seed uses section + sub-capability structure
3. Update `scripts/seed-projects.ts` — same

Verification: Docker postgres shows correct node tree for each project. New project creation produces expected nodes.

---

### Plan 83-02: Wave 2 — `InteractiveArchGraph` rendering overhaul
**Wave:** 2 | **Depends on:** 83-01 | **Autonomous:** yes

Tasks:
1. Update `components/arch/InteractiveArchGraph.tsx`:
   - `getArchNodes` now returns `sectionNodes` + `subNodes` — update props type to accept both
   - New `SectionGroup` component: renders a colored left-border header bar (blue/amber/green based on section name) spanning its child sub-columns, with section label top-left
   - `TrackPipeline` for ADR: group `subNodes` by `parent_id`, iterate `sectionNodes` in order, render `SectionGroup` containing its children as `SortablePhaseColumn` instances with arrows between them; render `ConsoleNode` between Incident Intelligence section and Workflow Automation section
   - Section-to-section arrow: a wider arrow connector between `SectionGroup` elements
   - `phaseHeaderStyle` — sub-capability column headers inherit the color of their parent section (Monitoring Integrations gets blue header, Alert Correlation gets amber, Environments gets green)
   - AI Assistant Track: unchanged — still flat node list
   - DnD: sub-columns sortable within their section (existing `SortableContext` per section); section headers not draggable
2. Update `components/arch/WorkflowDiagram.tsx` — pass `sectionNodes` + `subNodes` through to `InteractiveArchGraph`
3. Update `app/customer/[id]/architecture/page.tsx` — destructure new shape from `getArchNodes`

Verification: Build clean. Architecture tab shows grouped layout. Cards appear in sub-columns. Console node renders between Incident Intelligence and Workflow Automation. AI Assistant Track unaffected.

---

### Plan 83-03: Wave 3 — Integration Modal + Extraction + Chat updates
**Wave:** 3 | **Depends on:** 83-01 | **Autonomous:** yes (parallel with 83-02)

Tasks:
1. Update `components/arch/IntegrationEditModal.tsx` — ADR phase `<select>` uses `<optgroup>` grouping:
   ```
   Alert Intelligence: Monitoring Integrations, Alert Normalization, Alert Enrichment
   Incident Intelligence: Alert Correlation, Incident Enrichment, Incident Classification, Suggested Root Cause
   Workflow Automation: Environments, Automated Incident Creation, Automated Incident Notification, Automated Incident Remediation
   ```
2. Update `worker/jobs/document-extraction.ts` — stage assignment guide:
   - `Monitoring Integrations`: monitoring sources, alert ingest connectors, data feeds (Datadog, Splunk, Dynatrace, Nagios, etc.)
   - `Alert Normalization`: normalization rules, tag mappings, event deduplication, alert tag configuration, CMDB mapping
   - `Alert Enrichment`: enrichment logic, topology mapping, additional context enrichment
   - `Alert Correlation`: correlation patterns, correlation config, use case correlation
   - `Incident Enrichment`: incident tags, topology integrations, incident enrichment rules
   - `Incident Classification`: environments, classification rules, role-based routing
   - `Suggested Root Cause`: change integrations, probable root cause config, RCA analysis
   - `Environments`: customer environments, environment config, autoshare setup
   - `Automated Incident Creation`: ITSM ticketing (ServiceNow, Jira, BMC), auto-create rules
   - `Automated Incident Notification`: Slack, PagerDuty, Teams, notification routing rules
   - `Automated Incident Remediation`: runbook automation, EAP, action plans, auto-remediation
3. Update `lib/chat-context-builder.ts` — architecture context: group by section (Alert Intelligence / Incident Intelligence / Workflow Automation / Console / AI Assistant Track), sub-group by sub-column name, list integrations under each
4. Update `app/api/projects/[projectId]/chat/tools/arch.ts` — `createArchNodeTool` Zod schema: add optional `parent_node_name: z.string().optional()`. Execute: if `parent_node_name` provided, resolve parent node id via `AND(eq(project_id, projectId), eq(name, parent_node_name))` before insert.

Verification: Integration modal shows grouped phase options. Extraction prompt references sub-capability names. Context builder output is correctly structured. Chat tool accepts parent_node_name.

---

### Plan 83-04: Wave 4 — Human Verification
**Wave:** 4 | **Depends on:** 83-02, 83-03 | **Autonomous:** no (human gate)

Verification scenarios:
1. **ADR Track layout** — Architecture tab shows three colored section headers (blue Alert Intelligence, amber Incident Intelligence, green Workflow Automation) each with their sub-columns. Console circle appears between Incident Intelligence and Workflow Automation.
2. **Integration cards in sub-columns** — Existing tool cards (Datadog, PagerDuty, ServiceNow) appear in the correct sub-column.
3. **Empty sub-columns** — Sub-columns with no integrations show `—` placeholder (not hidden).
4. **Add Integration modal** — Phase picker shows grouped `<optgroup>` list. Saving assigns card to correct sub-column.
5. **AI Assistant Track** — Unchanged: Knowledge Sources, Real-Time Query, AI Capabilities, Console, Outputs & Actions still flat.
6. **Context upload** — Upload a document mentioning "Dynatrace sends alerts to BigPanda for normalization". After extraction + approval, Dynatrace card appears under Monitoring Integrations (not Alert Intelligence).
7. **Chat create arch node** — "Add a sub-capability node called 'Custom CMDB Mapping' under Alert Normalization in the ADR Track". Green confirmation card appears. After confirm, new column appears under Alert Intelligence section.
8. **Chat read** — "What's in the Alert Intelligence section?" → Claude lists sub-columns and their contents correctly.
9. **New project** — Create a new project. Architecture tab shows the full sub-capability structure seeded correctly.

---

## Success Criteria

- [ ] ADR track renders as 3 section groups with 10 sub-columns total
- [ ] Console node between Incident Intelligence and Workflow Automation sections
- [ ] AI Assistant Track unchanged
- [ ] Integration cards route to sub-capability columns by phase name
- [ ] IntegrationEditModal phase picker shows grouped options
- [ ] Document extraction assigns to sub-capability column names
- [ ] Chat context builder groups by section → sub-column
- [ ] Chat can create sub-capability nodes with parent_node_name
- [ ] New project creation seeds full sub-capability structure
- [ ] All existing tests GREEN
- [ ] Production build clean
- [ ] Docker rebuilt and deployed
- [ ] git committed and pushed

---

## Wave Execution Order

```
Wave 0: 83-00 (schema + migration + query)
Wave 1: 83-01 (DB seed + new project seed)
Wave 2: 83-02 ║ 83-03 (rendering overhaul ║ modal + extraction + chat) — parallel
Wave 3: 83-04 (human verification)
```
