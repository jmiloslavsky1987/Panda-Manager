# Phase 83: Architecture Sub-Capability Columns - Research

**Researched:** 2026-04-29
**Domain:** Architecture diagram restructuring, Drizzle ORM schema migration, DnD Kit reordering, React component rendering
**Confidence:** HIGH

## Summary

Phase 83 replaces the current flat 4-node ADR Track pipeline (Alert Intelligence, Incident Intelligence, Console, Workflow Automation) with a grouped, hierarchical structure: 3 section headers containing 10 sub-capability columns total, matching the BigPanda Future State Alert Pipeline reference. This requires a DB schema migration, a full rendering overhaul in `InteractiveArchGraph.tsx`, updates to the integration add/edit modal, seed script updates for new and existing projects, and downstream updates to the context pipeline and chat tools.

The current code is clean and well-understood. The `archNodes` table currently holds flat nodes; the addition of `parent_id` (nullable self-FK) and `node_type` (text discriminant) is a straightforward additive migration. The renderer already uses `PhaseColumn` as a reusable component with DnD Kit `SortableContext` — the new code wraps sub-capability `PhaseColumn` instances under a new `SectionHeader` component without modifying `PhaseColumn` itself. All downstream consumers reference node names or integration `phase` field values, so name-remapping is the only concern for `document-extraction.ts` and `lib/chat-context-builder.ts`.

The migration number is confirmed as `0046` (latest existing is `0045_daily_prep_tables.sql`). All existing arch integration rows are seed/dummy data, so no business-logic preservation is required during the `architecture_integrations.phase` migration.

**Primary recommendation:** Implement in 5 waves: (0) test scaffolds, (1) DB migration + schema + queries, (2) rendering overhaul + modal, (3) seed scripts + new project creation, (4) downstream consumers (extraction + chat + context builder), (5) verification.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**New ADR Track Structure**

The flat 4-node ADR layout (Alert Intelligence → Incident Intelligence → Console → Workflow Automation) is replaced with a grouped, expanded layout:

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

**Schema Change: `parent_id` + `node_type` on `arch_nodes`**

Add two columns to the `arch_nodes` table:
- `parent_id` — nullable FK → `arch_nodes.id`
- `node_type` — enum `'section' | 'sub-capability' | 'console'`

`node_type` is the renderer's discriminant — no name-matching or display_order conventions needed.

Migration: `0046_arch_nodes_parent_id.sql`

**`architecture_integrations.phase` — map to sub-capability names**

The `phase` field now holds sub-capability column names (e.g. `'Monitoring Integrations'`, `'Alert Normalization'`). Migration of existing integrations:
- `phase = 'Alert Intelligence'` → `'Monitoring Integrations'`
- `phase = 'Incident Intelligence'` → DELETE
- `phase = 'Workflow Automation'` → DELETE

All existing integration rows are seed/dummy data. No business-logic preservation needed.

**Rendering Model**

Section headers span their child columns with a colored left-border bar + label. Colors use Kata design system tokens: Alert Intelligence → `kata-status-blue`, Incident Intelligence → `kata-status-amber`, Workflow Automation → `kata-status-green`. Sub-columns are regular `PhaseColumn` instances with `w-[220px]`. Arrows appear between sub-columns within a section, and a larger section-spanning arrow appears between sections.

Drag-and-drop reordering: sub-columns are sortable within their section (same DnD Kit pattern). Section headers are not draggable.

**Integration Add/Edit Modal**

Phase picker becomes a grouped `<select>` (using `<optgroup>`) — sub-capability names appear under their section. Remove the old flat phase list for ADR.

**`getArchNodes` Query**

Fetch both section nodes (parent_id IS NULL, display_order < 100) and sub-capability nodes (parent_id IS NOT NULL). The current `display_order < 100` filter for the column-nodes query stays. Section nodes are fetched separately.

**Document Extraction Updates**

`document-extraction.ts` prompt updates: `architecture` entity `phase` field uses sub-capability names. Stage assignment guide updated to map tools to sub-capability column names.

**Chat Context Builder**

`lib/chat-context-builder.ts` groups architecture section by section → sub-column for clarity.

**Chat Write Tools**

`app/api/projects/[projectId]/chat/tools/arch-tools.ts` — `createArchNodeTool` Zod schema: add optional `parent_node_name` field. When provided, resolve the parent node id before inserting.

**Seed Scripts & New Project Creation**

`app/api/projects/route.ts` and `scripts/seed-projects.ts` — replace the 4-node flat ADR seed with the full 3-section + 10-sub-column structure (plus Console).

**Existing Project Migration**

DB migration script updates existing projects' `arch_nodes`:
1. Insert section nodes (Alert Intelligence, Incident Intelligence, Workflow Automation) as parent nodes with `display_order` 1, 2, 3.
2. Insert sub-capability nodes for each section.
3. Delete the old flat section nodes.
4. Migrate `architecture_integrations.phase = 'Alert Intelligence'` → `'Monitoring Integrations'`.

### Claude's Discretion
None specified.

### Deferred Ideas (OUT OF SCOPE)
- AI Assistant Track sub-capability expansion
- Tooltip hover showing sub-capability descriptions
- Sub-capability status badges (each sub-column has its own status independent of the section)
</user_constraints>

---

## Standard Stack

### Core Libraries Already in Use
| Library | Version | Purpose | Confirmed Usage |
|---------|---------|---------|-----------------|
| @dnd-kit/core | in package | DnD context, sensors, events | `InteractiveArchGraph.tsx` lines 8-9 |
| @dnd-kit/sortable | in package | `SortableContext`, `useSortable`, `arrayMove`, `horizontalListSortingStrategy` | `InteractiveArchGraph.tsx` line 9 |
| @dnd-kit/utilities | in package | `CSS.Transform.toString` | `InteractiveArchGraph.tsx` line 10 |
| drizzle-orm | in package | `eq`, `and`, `lt`, `asc`, `inArray`, `or`, `isNull`, `isNotNull` | `lib/queries.ts` |
| zod | in package | Tool schema validation | `arch-tools.ts` |
| @radix-ui/react-tooltip | in package | Node notes tooltip | `InteractiveArchGraph.tsx` line 11 |

### No New Dependencies Required
All rendering, DnD, and DB access needs are covered by existing packages. This phase adds no new npm dependencies.

**Installation:**
```bash
# No new packages needed
```

---

## Architecture Patterns

### Current `archNodes` Schema (before migration)
```typescript
// db/schema.ts lines 866-878
export const archNodes = pgTable('arch_nodes', {
  id: serial('id').primaryKey(),
  track_id: integer('track_id').notNull().references(() => archTracks.id),
  project_id: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  display_order: integer('display_order').default(0).notNull(),
  status: archNodeStatusEnum('status').default('planned').notNull(),  // 'planned' | 'in_progress' | 'live'
  notes: text('notes'),
  source_trace: text('source_trace'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('arch_nodes_project_track_name_idx').on(t.project_id, t.track_id, t.name),
]);

export type ArchNode = typeof archNodes.$inferSelect;
// ArchNode fields: id, track_id, project_id, name, display_order, status, notes, source_trace, created_at
// MISSING: parent_id, node_type — added in migration 0046
```

### Post-Migration `ArchNode` Type
After migration 0046, `ArchNode` will gain:
- `parent_id: number | null` — FK to `arch_nodes.id` (self-referential, nullable)
- `node_type: 'section' | 'sub-capability' | 'console'` — text discriminant, DEFAULT `'sub-capability'`

The `lib/queries.ts` type alias `export type ArchNode = typeof archNodes.$inferSelect` will automatically pick up the new columns once `schema.ts` is updated.

### Current `getArchNodes` Query Pattern
```typescript
// lib/queries.ts lines 1292-1304
export async function getArchNodes(projectId: number): Promise<{ tracks: ArchTrack[]; nodes: ArchNode[] }> {
  const tracks = await db
    .select()
    .from(archTracks)
    .where(eq(archTracks.project_id, projectId))
    .orderBy(asc(archTracks.display_order));
  const nodes = await db
    .select()
    .from(archNodes)
    .where(and(eq(archNodes.project_id, projectId), lt(archNodes.display_order, 100)))
    .orderBy(asc(archNodes.display_order));
  return { tracks, nodes };
}
```

The `display_order < 100` filter already excludes chat-created sentinel nodes (`display_order: 999`). After migration, section nodes will be inserted with `display_order` 1, 2, 3 and sub-capability nodes with 1-4 within each section — all safely under 100.

### New `getArchNodes` Query Pattern (post-migration)
The updated query must return section nodes and sub-capability nodes separately so the renderer can build the grouped layout:

```typescript
// Recommended approach: return all nodes with parent_id populated;
// renderer groups by parent_id client-side.
export async function getArchNodes(projectId: number): Promise<{ tracks: ArchTrack[]; nodes: ArchNode[] }> {
  const tracks = await db
    .select()
    .from(archTracks)
    .where(eq(archTracks.project_id, projectId))
    .orderBy(asc(archTracks.display_order));
  const nodes = await db
    .select()
    .from(archNodes)
    .where(and(eq(archNodes.project_id, projectId), lt(archNodes.display_order, 100)))
    .orderBy(asc(archNodes.display_order));
  return { tracks, nodes };
  // Consumer groups nodes by node_type and parent_id in the component.
  // Section nodes: node_type === 'section', parent_id === null
  // Sub-capability nodes: node_type === 'sub-capability', parent_id = section id
  // Console node: node_type === 'console', parent_id === null
}
```

The return shape `{ tracks, nodes }` stays identical — the renderer gets all nodes and groups them in the component, not the query.

### Current Rendering Model (TrackPipeline)
```typescript
// InteractiveArchGraph.tsx lines 313-381
// TrackPipeline renders all nodes for a track flat via SortableContext
// sortedNodes = [...nodes].sort by display_order
// Renders: SortablePhaseColumn per node with Arrow() between
// Each SortablePhaseColumn wraps PhaseColumn
// PhaseColumn renders: colored header (via phaseHeaderStyle) + integration cards + grouped cards
```

**Key insight for migration:** `phaseHeaderStyle()` (lines 193-212) currently maps section names like `'Alert Intelligence'` to colors. After migration, section header rendering moves to a new `SectionHeader` component driven by `node.node_type === 'section'`, and `PhaseColumn` is only invoked for `node_type === 'sub-capability'`.

### Recommended New Rendering Structure (ADR Track)

```
TrackPipeline (ADR Track)
  DndContext (scoped to ADR track)
    // Section: Alert Intelligence
    SectionHeader (node_type=section, kata-status-blue)
      SortableContext (items = sub-capability node ids under this section)
        [SortablePhaseColumn (Monitoring Integrations)] [Arrow] [SortablePhaseColumn (Alert Normalization)] [Arrow] [SortablePhaseColumn (Alert Enrichment)]
    // Section Arrow (between Alert Intelligence and Console)
    SectionArrow
    // Console (special node)
    ConsoleNode
    // Section Arrow (between Console and Incident Intelligence)
    SectionArrow
    // Section: Incident Intelligence
    SectionHeader (node_type=section, kata-status-amber)
      SortableContext (...)
        [sub-columns x4]
    SectionArrow
    // Section: Workflow Automation
    SectionHeader (node_type=section, kata-status-green)
      SortableContext (...)
        [sub-columns x4]
```

**DnD scope:** Each section gets its own `SortableContext` (sub-columns sortable within section, not across sections). The outer `DndContext` for the track remains; `handleDragEnd` logic filters by section when building `trackNodes`.

### Migration SQL Pattern (0046)
```sql
-- db/migrations/0046_arch_nodes_parent_id.sql
ALTER TABLE arch_nodes ADD COLUMN parent_id integer REFERENCES arch_nodes(id);
ALTER TABLE arch_nodes ADD COLUMN node_type text NOT NULL DEFAULT 'sub-capability';

-- Migrate existing projects: insert section nodes + sub-capability nodes per project
DO $$
DECLARE
  proj_id integer;
  adr_track_id integer;
  section_ai_id integer;
  section_ii_id integer;
  section_wa_id integer;
BEGIN
  FOR proj_id IN (SELECT DISTINCT project_id FROM arch_tracks WHERE name = 'ADR Track') LOOP
    SELECT id INTO adr_track_id FROM arch_tracks WHERE project_id = proj_id AND name = 'ADR Track';

    -- Delete old flat section nodes
    DELETE FROM arch_nodes
      WHERE project_id = proj_id AND track_id = adr_track_id
        AND name IN ('Alert Intelligence', 'Incident Intelligence', 'Workflow Automation');

    -- Insert section nodes
    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, adr_track_id, 'Alert Intelligence',    1, 'planned', 'section', 'migration')
      RETURNING id INTO section_ai_id;
    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, adr_track_id, 'Incident Intelligence', 2, 'planned', 'section', 'migration')
      RETURNING id INTO section_ii_id;
    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, adr_track_id, 'Workflow Automation',   3, 'planned', 'section', 'migration')
      RETURNING id INTO section_wa_id;

    -- Update Console node_type
    UPDATE arch_nodes SET node_type = 'console'
      WHERE project_id = proj_id AND track_id = adr_track_id AND name = 'Console';

    -- Insert sub-capability nodes under Alert Intelligence
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, adr_track_id, section_ai_id, 'Monitoring Integrations', 1, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_ai_id, 'Alert Normalization',     2, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_ai_id, 'Alert Enrichment',        3, 'planned', 'sub-capability', 'migration');

    -- Insert sub-capability nodes under Incident Intelligence
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, adr_track_id, section_ii_id, 'Alert Correlation',       1, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_ii_id, 'Incident Enrichment',     2, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_ii_id, 'Incident Classification', 3, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_ii_id, 'Suggested Root Cause',    4, 'planned', 'sub-capability', 'migration');

    -- Insert sub-capability nodes under Workflow Automation
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, adr_track_id, section_wa_id, 'Environments',                      1, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_wa_id, 'Automated Incident Creation',       2, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_wa_id, 'Automated Incident Notification',   3, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_wa_id, 'Automated Incident Remediation',    4, 'planned', 'sub-capability', 'migration');

  END LOOP;
END $$;

-- Remap integration phase values
UPDATE architecture_integrations SET phase = 'Monitoring Integrations'
  WHERE phase = 'Alert Intelligence';
DELETE FROM architecture_integrations
  WHERE phase IN ('Incident Intelligence', 'Workflow Automation');
```

**Critical note:** The unique index `arch_nodes_project_track_name_idx` is on `(project_id, track_id, name)`. After migration, section nodes (Alert Intelligence, Incident Intelligence, Workflow Automation) are re-inserted with `node_type='section'`; the old rows with those names are deleted first. No unique constraint conflict.

### Pattern: Kata Design System Colors for Section Headers
Section header colors use Kata tokens (from `kata-tokens.css`):
- Alert Intelligence: `var(--kata-status-blue)` — Tailwind class `kata-status-blue`
- Incident Intelligence: `var(--kata-status-amber)` — Tailwind class `kata-status-amber`
- Workflow Automation: `var(--kata-status-green)` — Tailwind class `kata-status-green`

Since Phase 81 established Kata tokens, the component should reference CSS variables directly in inline `style` props or via Tailwind custom class names defined in the token layer.

### IntegrationEditModal — Grouped Optgroup Pattern
```tsx
// Before (flat list):
// <select> <option value="Alert Intelligence">...</option> ...

// After (grouped):
<select value={phase} onChange={...}>
  {track === 'ADR' ? (
    <>
      <optgroup label="Alert Intelligence">
        <option value="Monitoring Integrations">Monitoring Integrations</option>
        <option value="Alert Normalization">Alert Normalization</option>
        <option value="Alert Enrichment">Alert Enrichment</option>
      </optgroup>
      <optgroup label="Incident Intelligence">
        <option value="Alert Correlation">Alert Correlation</option>
        <option value="Incident Enrichment">Incident Enrichment</option>
        <option value="Incident Classification">Incident Classification</option>
        <option value="Suggested Root Cause">Suggested Root Cause</option>
      </optgroup>
      <optgroup label="Workflow Automation">
        <option value="Environments">Environments</option>
        <option value="Automated Incident Creation">Automated Incident Creation</option>
        <option value="Automated Incident Notification">Automated Incident Notification</option>
        <option value="Automated Incident Remediation">Automated Incident Remediation</option>
      </optgroup>
    </>
  ) : (
    BIGGY_PHASES.map(p => <option key={p} value={p}>{p}</option>)
  )}
</select>
```

The `ADR_PHASES` array in `IntegrationEditModal.tsx` currently holds `['Alert Intelligence', 'Incident Intelligence', 'Console', 'Workflow Automation']` — replace this entirely with the grouped `<optgroup>` structure.

### createArchNodeTool — parent_node_name Addition
```typescript
// arch-tools.ts — createArchNodeTool updated inputSchema
z.object({
  name: z.string().min(1).describe('Node name'),
  track_name: z.string().min(1).describe('Architecture track name'),
  parent_node_name: z.string().optional().describe(
    'Name of the parent section node (e.g. "Alert Intelligence") — required when creating a sub-capability node'
  ),
  status: z.enum(['planned', 'in_progress', 'live']).optional(),
  notes: z.string().optional(),
})

// execute(): if parent_node_name provided, resolve to parent_id
// insert with node_type = parent_node_name ? 'sub-capability' : 'section'
```

### `buildArchPhasesContext` in document-extraction.ts
This function (lines 726-761) fetches `archNodes.name` joined with `archTracks.name` and builds a stage assignment guide string for the extraction LLM. After migration, it will return sub-capability node names (Monitoring Integrations, Alert Normalization, etc.) instead of section names. The stage assignment guide paragraph hardcoded in the function (lines 753-760) must be updated to use sub-capability names in all examples.

The existing `display_order < 100` filter in `getArchNodes` means `buildArchPhasesContext` will only see the correct sub-capability nodes — not sentinel nodes with `display_order: 999`.

**Important:** `buildArchPhasesContext` queries `archNodes` directly (not via `getArchNodes`) and has no `display_order` filter. After migration it will include section nodes (parent_id=NULL, node_type='section') as well as sub-capability nodes. The function should be updated to filter `WHERE node_type = 'sub-capability'` so the LLM only gets leaf-level column names as valid `phase` values.

### Anti-Patterns to Avoid
- **Modifying PhaseColumn internals:** `PhaseColumn` is stable and correct — wrap it, don't change it.
- **Name-matching for node type discrimination:** Use `node_type` column, not name string matching.
- **Cross-section DnD:** Each `SortableContext` must be scoped to its section's sub-capability nodes only.
- **Forgetting AI Assistant Track nodes:** AI Assistant Track nodes currently have no `node_type` column. After migration they will default to `'sub-capability'` (the DEFAULT). The renderer must handle this: AI Assistant Track nodes are rendered flat as before (all `display_order < 100`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Column reordering within section | Custom drag state | DnD Kit `SortableContext` + `arrayMove` | Already in codebase, handles pointer sensor edge cases |
| HTML grouped select | Custom dropdown component | Native `<select>` with `<optgroup>` | Zero dependencies, native browser accessibility |
| Node type discrimination | Name string matching | `node_type` DB column | Renderer already gets nodes from DB — use the discriminant column |
| Kata color tokens | Hardcoded hex values | CSS variables `var(--kata-status-*)` | Token layer already set up in Phase 81 |

---

## Common Pitfalls

### Pitfall 1: Unique Index Conflict During Migration
**What goes wrong:** The migration inserts new "Alert Intelligence", "Incident Intelligence", "Workflow Automation" section nodes after deleting the old ones. If the DELETE and INSERT are not in the right order (or if an old node wasn't deleted), the unique index `arch_nodes_project_track_name_idx` on `(project_id, track_id, name)` will reject the INSERT.
**Why it happens:** The migration deletes then re-inserts rows with the same `name` values.
**How to avoid:** Execute DELETE before INSERT within the same transaction block. The migration SQL above does this correctly within the PL/pgSQL block.
**Warning signs:** `ERROR: duplicate key value violates unique constraint "arch_nodes_project_track_name_idx"` during migration.

### Pitfall 2: AI Assistant Track Nodes Default to `sub-capability`
**What goes wrong:** After migration, AI Assistant Track nodes (Knowledge Sources, Real-Time Query, AI Capabilities, Console, Outputs & Actions) have `node_type = 'sub-capability'` (the default). The renderer must not apply the new grouped layout to the AI Assistant Track.
**Why it happens:** The migration only restructures ADR Track nodes.
**How to avoid:** In `TrackPipeline`, branch on `trackData.name.includes('ADR')` to choose between the new grouped rendering vs. the existing flat rendering. AI Assistant Track nodes remain flat as before.
**Warning signs:** AI Assistant Track rendering breaks, section headers appear where they shouldn't.

### Pitfall 3: `buildArchPhasesContext` Including Section Node Names
**What goes wrong:** After migration, `buildArchPhasesContext` fetches all arch node names including section-level nodes. The LLM receives "Alert Intelligence" as a valid `phase` value but integration cards should map to sub-capability names.
**Why it happens:** The function has no `node_type` filter.
**How to avoid:** Add `eq(archNodes.node_type, 'sub-capability')` (or `isNotNull(archNodes.parent_id)`) to the `buildArchPhasesContext` query.
**Warning signs:** Extraction pipeline assigns integrations to "Alert Intelligence" instead of "Monitoring Integrations".

### Pitfall 4: DnD Reorder Logic Fails Across Sections
**What goes wrong:** The existing `handleDragEnd` builds `trackNodes` by filtering all nodes for a track by `track_id`, then uses array positions. After migration, sub-capability nodes from different sections are interleaved in the flat array.
**Why it happens:** `handleDragEnd` doesn't know about sections.
**How to avoid:** The `SortableContext` for each section only includes that section's node IDs. A drag event can only fire within its `SortableContext` scope. In `handleDragEnd`, the `active.id` and `over.id` will both be nodes within the same section. Filter `trackNodes` to only the section that contains `active.id` when computing `oldIndex`/`newIndex`.
**Warning signs:** Nodes jump across section boundaries when dragged; `arrayMove` gets wrong indices.

### Pitfall 5: Seed Script `onConflictDoNothing` Gaps
**What goes wrong:** `app/api/projects/route.ts` currently uses `insert(archNodes).values([...])` without `onConflictDoNothing`. If a project already has the seed nodes (e.g. re-running seed on an existing project), it will fail.
**Why it happens:** The old 4-node seed didn't need conflict handling because new projects start clean.
**How to avoid:** The new seed inserts section nodes first, captures their IDs, then inserts sub-capability nodes with those `parent_id` values. Each insert should use `.returning({ id })` for section nodes. The `onConflictDoNothing` used for onboarding steps in the same file is the right pattern to copy.

### Pitfall 6: chat-context-builder.ts Missing arch_nodes Data
**What goes wrong:** `lib/chat-context-builder.ts` currently calls `getArchTabData(projectId)` which does NOT include arch nodes or tracks. The Architecture Integrations section shows integration cards but doesn't show node structure. After phase 83, the context should group integrations by section → sub-column.
**Why it happens:** `getArchTabData` in `lib/queries.ts` only returns `architectureIntegrations`, `beforeState`, `teamOnboardingStatus`, `teamPathways` — not arch nodes/tracks.
**How to avoid:** Add a `getArchNodes(projectId)` call in `buildChatContext` (parallel with other queries). Build the context section by iterating section nodes, then for each section iterating its sub-capability children and the integrations in that column.

---

## Code Examples

### Existing DnD Kit Pattern in Use (Confirmed in codebase)
```typescript
// InteractiveArchGraph.tsx lines 396-403
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  })
)

// TrackPipeline lines 356-379
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={(e) => onDragEnd(e, trackData.id)}
>
  <SortableContext items={sortedNodes.map((n) => n.id)} strategy={horizontalListSortingStrategy}>
    <div className="flex items-start">
      {sortedNodes.map((node, idx) => (
        <div key={node.id} className="flex items-start">
          <SortablePhaseColumn ... />
          {idx < sortedNodes.length - 1 && <Arrow />}
        </div>
      ))}
    </div>
  </SortableContext>
</DndContext>
```

### New Project Seed Pattern (route.ts)
```typescript
// Current pattern (4 flat ADR nodes, lines 225-230):
await tx.insert(archNodes).values([
  { track_id: adrTrack.id, project_id: inserted.id, name: 'Alert Intelligence', display_order: 1, status: 'planned', source_trace: 'template' },
  { track_id: adrTrack.id, project_id: inserted.id, name: 'Incident Intelligence', display_order: 2, status: 'planned', source_trace: 'template' },
  { track_id: adrTrack.id, project_id: inserted.id, name: 'Console', display_order: 3, status: 'planned', source_trace: 'template' },
  { track_id: adrTrack.id, project_id: inserted.id, name: 'Workflow Automation', display_order: 4, status: 'planned', source_trace: 'template' },
]);

// New pattern (3 sections + console + 10 sub-capabilities):
const [sectionAI] = await tx.insert(archNodes).values({
  track_id: adrTrack.id, project_id: inserted.id, name: 'Alert Intelligence',
  display_order: 1, status: 'planned', node_type: 'section', source_trace: 'template'
}).returning({ id: archNodes.id });

const [sectionII] = await tx.insert(archNodes).values({
  track_id: adrTrack.id, project_id: inserted.id, name: 'Incident Intelligence',
  display_order: 2, status: 'planned', node_type: 'section', source_trace: 'template'
}).returning({ id: archNodes.id });

const [sectionWA] = await tx.insert(archNodes).values({
  track_id: adrTrack.id, project_id: inserted.id, name: 'Workflow Automation',
  display_order: 3, status: 'planned', node_type: 'section', source_trace: 'template'
}).returning({ id: archNodes.id });

await tx.insert(archNodes).values({ track_id: adrTrack.id, project_id: inserted.id,
  name: 'Console', display_order: 99, status: 'planned', node_type: 'console', source_trace: 'template'
});

await tx.insert(archNodes).values([
  { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionAI.id,
    name: 'Monitoring Integrations', display_order: 1, status: 'planned', node_type: 'sub-capability', source_trace: 'template' },
  // ... 9 more sub-capability nodes
]);
```

### document-extraction.ts Stage Assignment Guide Update
```
// Current (lines 753-755):
- Alert Intelligence stage: monitoring sources, alert ingest connectors, ...
- Incident Intelligence stage: RCA, incident classification, ...
- Workflow Automation stage: ticketing, notifications, runbooks, ...

// Replacement:
- Monitoring Integrations: monitoring sources, alert ingest connectors, observability tools (Dynatrace, Splunk, Datadog, Nagios, custom APIs)
- Alert Normalization: tag maps, normalization rules, mapping configs, Alert Tags, Mapping & Enrichment
- Alert Enrichment: CMDB mappings, enrichment logic, topology data sources
- Alert Correlation: correlation patterns, deduplication rules, suppression, filtering
- Incident Enrichment: incident tag configs, topology integrations, incident enrichment rules
- Incident Classification: environment classification, incident routing configs
- Suggested Root Cause: change integrations, RCA configs, SRC rules
- Environments: customer environment configs, autoshare rules
- Automated Incident Creation: ITSM ticketing (ServiceNow, Jira), ticket automation rules
- Automated Incident Notification: Slack, PagerDuty, Teams routing rules, notification configs
- Automated Incident Remediation: runbook automation, EAP configs, action plans
```

---

## Files to Touch (Confirmed)

| File | Change | Confidence |
|------|--------|------------|
| `db/migrations/0046_arch_nodes_parent_id.sql` | NEW — ADD COLUMN parent_id + node_type; existing project migration | HIGH |
| `db/schema.ts` | Add `parent_id` and `node_type` to `archNodes` table | HIGH |
| `lib/queries.ts` | `getArchNodes()` unchanged (already returns both section and sub-capability nodes via display_order < 100); ArchNode type automatically updated | HIGH |
| `components/arch/InteractiveArchGraph.tsx` | Full ADR Track rendering overhaul: SectionHeader component, grouped SortableContext per section, section-spanning arrows | HIGH |
| `components/arch/IntegrationEditModal.tsx` | Replace `ADR_PHASES` flat list with `<optgroup>` grouped select | HIGH |
| `app/api/projects/route.ts` | Replace 4-node flat ADR seed with 3-section + console + 10 sub-columns | HIGH |
| `scripts/seed-projects.ts` | Same update as route.ts for dev seed | HIGH |
| `lib/chat-context-builder.ts` | Group architecture section by section → sub-column; add `getArchNodes` call | HIGH |
| `worker/jobs/document-extraction.ts` | Update stage assignment guide text + `buildArchPhasesContext` filter | HIGH |
| `app/api/projects/[projectId]/chat/tools/arch-tools.ts` | Add optional `parent_node_name` to `createArchNodeTool` Zod schema + resolve in execute | HIGH |

**NOT touched (confirmed):**
- `app/api/ingestion/approve/route.ts` — arch_node upsert uses `node_name` match which still works
- `app/api/projects/[projectId]/arch-nodes/route.ts` — POST route works with track_id; no parent_id needed for UI-created nodes
- `app/api/projects/[projectId]/arch-nodes/[nodeId]/route.ts` — PATCH route is additive; status/name/notes update still valid for all node types

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ArchNode` had no hierarchy | `ArchNode` gets `parent_id` + `node_type` | Migration 0046 | Enables section grouping in renderer |
| Flat 4-node ADR pipeline | 3 sections + 10 sub-capabilities | This phase | Matches BigPanda Future State reference diagram |
| `architecture_integrations.phase` = section names | `phase` = sub-capability column names | This phase | Integration cards route to correct sub-columns |
| All ADR Track nodes rendered identically | Sections render as colored header bars; sub-capabilities render as PhaseColumn | This phase | Visual grouping clarity |

**Current migration number:** Latest is `0045_daily_prep_tables.sql`. Next migration is `0046_arch_nodes_parent_id.sql`. Confirmed HIGH confidence from direct filesystem inspection.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (confirmed from existing test files) |
| Config file | `vitest.config.ts` (inferred from project pattern) |
| Quick run command | `npx vitest run tests/arch/` |
| Full suite command | `npx vitest run` |

### Existing Arch Tests
The `tests/arch/` directory already contains:
- `tests/arch/arch-nodes-wiring.test.ts` — tests `getArchNodes` returns `tracks` + `nodes` with required fields
- `tests/arch/column-reorder.test.ts` — tests column reorder behavior
- `tests/arch/status-cycle.test.ts` — tests status cycling (planned → in_progress → live → planned)

### Phase 83 Test Map
| Behavior | Test Type | Automated Command | Notes |
|----------|-----------|-------------------|-------|
| Section nodes returned by getArchNodes (node_type=section, parent_id=null) | unit | `npx vitest run tests/arch/` | Extend arch-nodes-wiring.test.ts |
| Sub-capability nodes have parent_id referencing section | unit | `npx vitest run tests/arch/` | Extend arch-nodes-wiring.test.ts |
| Console node returned with node_type=console | unit | `npx vitest run tests/arch/` | Extend arch-nodes-wiring.test.ts |
| IntegrationEditModal renders optgroup structure for ADR | unit | `npx vitest run tests/arch/` | New test |
| createArchNodeTool accepts parent_node_name | unit | `npx vitest run tests/arch/` | New test — extend arch-tools test |
| document-extraction assigns integration to sub-capability name | integration | manual | LLM-dependent |
| buildArchPhasesContext returns sub-capability names only | unit | `npx vitest run tests/arch/` | New test |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/arch/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/arch/section-grouping.test.ts` — covers section nodes, sub-capability parent_id, node_type values
- [ ] `tests/arch/integration-modal-optgroup.test.ts` — covers IntegrationEditModal grouped ADR phases
- [ ] `tests/arch/arch-context-builder.test.ts` — covers buildArchPhasesContext filtering

*(Existing tests/arch/arch-nodes-wiring.test.ts, column-reorder.test.ts, status-cycle.test.ts are already present — Wave 0 adds new test files, doesn't replace existing ones.)*

---

## Open Questions

1. **`display_order` for Console node in new seed**
   - What we know: Console is currently seeded with `display_order: 3` in the flat 4-node list. It sits between Incident Intelligence and Workflow Automation in the reference diagram.
   - What's unclear: In the new schema, section nodes have `display_order` 1, 2, 3. Console needs a `display_order` that renders it between Incident Intelligence section and Workflow Automation section. Using `display_order: 99` (well under 100 filter threshold) combined with the renderer ordering section nodes by `display_order` works if Console's `display_order` is between Incident Intelligence section (2) and Workflow Automation section (3). Consider `display_order: 2.5` — but integer column. Use 25 for II, 50 for Console, 75 for WA (if display_order is renumbered) OR rely on renderer ordering by type (sections in order, Console between II and WA by convention).
   - Recommendation: Use `display_order` 1, 2, 3 for sections and 10 for Console — renderer sorts all ADR Track nodes by display_order and uses node_type to decide rendering. Section at 1 (AI), section at 2 (II), Console at 10, section at 3 (WA) would sort wrong. Better: use `display_order` 10, 20, 30 for sections; Console at 25. All under 100, sort correctly.

2. **Existing arch test impact of new ArchNode fields**
   - What we know: `tests/arch/arch-nodes-wiring.test.ts` uses a mock that does not include `parent_id` or `node_type` fields.
   - What's unclear: Whether existing tests will fail after schema update (mocks may need to include new fields).
   - Recommendation: Update mock objects in existing arch tests to include `parent_id: null` and `node_type: 'sub-capability'` as TypeScript will require them once schema.ts is updated.

---

## Sources

### Primary (HIGH confidence)
- Direct filesystem inspection of `/Users/jmiloslavsky/Documents/Panda-Manager/db/schema.ts` — confirms current ArchNode shape (no parent_id, no node_type), archNodeStatusEnum values, unique index
- Direct filesystem inspection of `/Users/jmiloslavsky/Documents/Panda-Manager/lib/queries.ts` — confirms getArchNodes query structure, display_order < 100 filter
- Direct filesystem inspection of `/Users/jmiloslavsky/Documents/Panda-Manager/components/arch/InteractiveArchGraph.tsx` — confirms DnD Kit usage, PhaseColumn, SortableContext, TrackPipeline structure
- Direct filesystem inspection of `/Users/jmiloslavsky/Documents/Panda-Manager/components/arch/IntegrationEditModal.tsx` — confirms current ADR_PHASES flat list
- Direct filesystem inspection of `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/projects/route.ts` — confirms current 4-node seed
- Direct filesystem inspection of `/Users/jmiloslavsky/Documents/Panda-Manager/scripts/seed-projects.ts` — confirms seed arch nodes
- Direct filesystem inspection of `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/projects/[projectId]/chat/tools/arch-tools.ts` — confirms createArchNodeTool does NOT have parent_node_name; uses onConflictDoUpdate
- Direct filesystem inspection of `/Users/jmiloslavsky/Documents/Panda-Manager/lib/chat-context-builder.ts` — confirms architecture section renders flat without section grouping
- Direct filesystem inspection of `/Users/jmiloslavsky/Documents/Panda-Manager/worker/jobs/document-extraction.ts` — confirms buildArchPhasesContext, stage assignment guide text
- Direct filesystem inspection of `db/migrations/` — confirms latest migration is 0045; next is 0046
- Direct filesystem inspection of `tests/arch/` — confirms existing arch test files

### Secondary (MEDIUM confidence)
- 83-CONTEXT.md — detailed design decisions providing locked implementation choices

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in codebase via direct inspection
- Architecture: HIGH — current code structure read directly, migration pattern follows established precedent (wbsItems uses same parent_id self-FK pattern)
- Pitfalls: HIGH — derived from reading actual current code

**Research date:** 2026-04-29
**Valid until:** Stable (no external dependencies; all internal codebase)
