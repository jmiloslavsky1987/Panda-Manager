# Architecture Integration Research

**Domain:** Next.js 16 App with v6.0 Feature Integration
**Researched:** 2026-04-07
**Confidence:** HIGH

## Integration Overview

v6.0 adds five major feature areas to an existing Next.js 16 architecture with established patterns. Integration analysis focuses on **new vs modified components**, **data flow changes**, and **build order dependencies**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js 16 App Router                        │
│  /app/page.tsx (Portfolio Dashboard) ← NEW AGGREGATE QUERIES        │
│  /app/customer/[id]/* (Workspace) ← NEW TABS, MODIFIED COMPONENTS   │
├─────────────────────────────────────────────────────────────────────┤
│                        API Route Handlers                            │
│  /app/api/projects/[projectId]/wbs ← NEW                            │
│  /app/api/projects/[projectId]/team-engagement ← NEW                │
│  /app/api/projects/[projectId]/architecture ← MODIFIED              │
│  /app/api/projects/portfolio ← NEW (aggregates)                     │
│  /app/api/ingestion/extract ← MODIFIED (new entity types)           │
├─────────────────────────────────────────────────────────────────────┤
│                        Data Layer (lib/)                             │
│  queries.ts ← MODIFIED (portfolio rollup, new entity queries)       │
│  lib/wbs-generator.ts ← NEW (AI Generate Plan)                      │
│  worker/jobs/document-extraction.ts ← MODIFIED (new routing)        │
├─────────────────────────────────────────────────────────────────────┤
│                       Database (PostgreSQL)                          │
│  projects ← MODIFIED (exec_action_required, dependency_projects)    │
│  wbs_templates ← NEW                                                 │
│  wbs_items ← NEW                                                     │
│  wbs_task_assignments ← NEW                                          │
│  team_engagement_sections ← NEW (business outcomes, panels, etc)    │
│  arch_tracks ← NEW (Before State, Current & Future)                 │
│  arch_nodes ← NEW (diagram node data with track FK)                 │
├─────────────────────────────────────────────────────────────────────┤
│                    Background Workers (BullMQ)                       │
│  worker/index.ts ← UNMODIFIED (handler dispatch exists)             │
│  worker/jobs/document-extraction.ts ← MODIFIED (3 new extractors)   │
└─────────────────────────────────────────────────────────────────────┘
```

## New vs Modified Components

### Portfolio Dashboard (DASH-01–06)

**New Components:**
- `/app/page.tsx` — **MAJOR REWRITE** from simple health cards to full portfolio view
- `components/PortfolioTable.tsx` — multi-project table with client-side filtering/sort
- `components/PortfolioExceptionsPanel.tsx` — aggregated exception detection
- `components/PortfolioHealthSummary.tsx` — cross-project health rollup

**Modified Components:**
- `lib/queries.ts::getDashboardData()` — add portfolio aggregation query
- `lib/queries.ts::computeProjectHealth()` — add `exec_action_required` flag logic

**Data Flow:**
```
Server Component: /app/page.tsx
  → lib/queries.ts::getPortfolioDashboardData()
    → Aggregate query: projects + actions + risks + milestones
    → Health scoring: detect overdue + high-risk + stalled + exec escalation
    → Return: ProjectWithHealth[] + exceptions[]
  → Pass to PortfolioTable (Client Component with URL param filtering)
```

**Database Changes:**
- `projects.exec_action_required` (boolean) — set by health logic
- `projects.dependency_projects` (text[]) — array of project IDs for cross-project dependencies

**Integration Points:**
- Reuses existing `ProjectWithHealth` type (extended with new fields)
- Reuses existing health scoring logic (`computeProjectAnalytics`)
- Drill-down links to `/customer/[id]/actions?filter=overdue` (existing pattern)

### WBS (Work Breakdown Structure) — WBS-01–05

**New Components:**
- `/app/customer/[id]/plan/wbs/page.tsx` — replaces Phase Board
- `components/WBSTree.tsx` — collapsible hierarchy renderer (React state)
- `components/WBSGeneratePlanModal.tsx` — AI gap-fill UI
- `lib/wbs-generator.ts` — Claude API call for Generate Plan
- `/app/api/projects/[projectId]/wbs/route.ts` — CRUD endpoints
- `/app/api/projects/[projectId]/wbs/generate/route.ts` — Generate Plan endpoint

**Modified Components:**
- `worker/jobs/document-extraction.ts` — add `wbs_item` entity extraction
- Tab navigation in `/app/customer/[id]/layout.tsx` — replace "Phase Board" with "WBS"

**Data Flow:**
```
1. Context Upload:
   artifact → BullMQ extraction job → Claude → extract wbs_item entities
   → staged_items_json (preview) → user approves → INSERT wbs_items

2. Manual Edit:
   WBSTree (client) → onUpdate → POST /api/projects/{id}/wbs → db.update(wbs_items)

3. Generate Plan (AI gap-fill):
   User clicks Generate Plan
   → POST /api/projects/{id}/wbs/generate
     → lib/wbs-generator.ts::generateMissingWbsItems()
       → Read: existing wbs_items, tasks, milestones
       → Prompt Claude with template structure + context
       → Parse response → INSERT wbs_items (source: 'ai-generated')
   → Client refetches WBS tree → shows new items with [AI] badge
```

**Database Changes:**
- `wbs_templates` (id, project_id, name, track, structure_json, created_at)
  - `structure_json`: hierarchy of phases/tasks with descriptions
  - Seed with ADR + Biggy templates on project create
- `wbs_items` (id, template_id, project_id, parent_id, title, track, phase, status, owner, start_date, due_date, description, source, created_at)
  - Self-referential tree via `parent_id`
  - `source`: 'manual' | 'ingested' | 'ai-generated'
- `wbs_task_assignments` (id, wbs_item_id, task_id) — links WBS items to tasks table

**Integration Points:**
- Reuses existing `tasks` table — WBS items can link to tasks for execution tracking
- Reuses BullMQ document extraction infrastructure (add new entity type)
- Reuses Claude API patterns from existing skill-orchestrator.ts

### Team Engagement Overview — TEAM-01–04

**New Components:**
- `/app/customer/[id]/teams/engagement/page.tsx` — replaces generic Teams list
- `components/TeamEngagementPanel.tsx` — 5-section structured view
- `/app/api/projects/[projectId]/team-engagement/route.ts` — CRUD endpoints

**Modified Components:**
- `worker/jobs/document-extraction.ts` — add `team_engagement_section` entity extraction
- `/app/customer/[id]/layout.tsx` — add "Engagement Overview" sub-tab under Teams

**Data Flow:**
```
1. Context Upload:
   artifact → extraction job → Claude
   → extract: businessOutcome, architecture_panel, workflow, team_card, focus_area
   → route each to team_engagement_sections with section_type field

2. Manual Edit:
   TeamEngagementPanel → onEdit → PATCH /api/projects/{id}/team-engagement/{sectionId}

3. Missing Data Warnings:
   Server Component reads team_engagement_sections, groups by section_type
   → if section empty → render EmptyState with "Upload SOW/kickoff deck" CTA
```

**Database Changes:**
- `team_engagement_sections` (id, project_id, section_type, track, title, content_json, display_order, source, source_artifact_id, created_at)
  - `section_type`: 'business_outcome' | 'architecture_panel' | 'workflow' | 'team_card' | 'focus_area'
  - `content_json`: flexible structure per section type
    - business_outcome: {title, track, description, delivery_status}
    - architecture_panel: {panel_name, tools: [{name, phase, status}]}
    - workflow: {team_name, workflow_name, steps: [{label, track, status}]}
    - team_card: {team_name, bp_owner, customer_owner, tracks, current_status, next_step}
    - focus_area: {title, why_it_matters, current_status, next_step}

**Integration Points:**
- Consolidates existing scattered tables: `businessOutcomes`, `e2eWorkflows`, `focusAreas`, `teamOnboardingStatus`
- All now in single `team_engagement_sections` table with structured `content_json`
- Reuses existing context upload → extraction → approval flow

### Architecture Diagram — ARCH-01–04

**New Components:**
- `/app/customer/[id]/architecture/diagrams/page.tsx` — two-tab diagram view
- `components/ArchitectureDiagramFlow.tsx` — React Flow component for Before State + Current & Future State
- `/app/api/projects/[projectId]/architecture/diagrams/route.ts` — CRUD for diagram data

**Modified Components:**
- Existing `/app/customer/[id]/architecture/page.tsx` — now shows onboarding status table only
- `worker/jobs/document-extraction.ts` — add `arch_node` entity extraction with track routing

**Data Flow:**
```
1. Context Upload:
   artifact → extraction → Claude → extract arch_node entities
   → Each node has: {tool_name, track, phase, status, integration_method}
   → track field routes to Before State ('before') vs Current & Future ('current')

2. Manual Diagram Edit:
   ArchitectureDiagramFlow (client, React Flow)
   → Node drag/add/edit → POST /api/projects/{id}/architecture/diagrams
   → Persist node positions + edges to arch_nodes.positions_json

3. Tab Navigation:
   Server Component renders two React Flow instances:
   - Before State tab: filters arch_nodes WHERE track = 'before'
   - Current & Future State tab: filters arch_nodes WHERE track IN ('adr', 'biggy', 'current')
```

**Database Changes:**
- `arch_tracks` (id, project_id, name, description, display_order)
  - Seed: 'Before State', 'ADR Track', 'Biggy Track'
- `arch_nodes` (id, track_id, project_id, tool_name, node_type, status, phase, integration_method, positions_json, source, created_at)
  - `node_type`: 'tool' | 'data_store' | 'external_system'
  - `positions_json`: {x, y, width, height} for React Flow layout
  - `status`: enum integrationTrackStatusEnum ('live', 'in_progress', 'pilot', 'planned')

**Integration Points:**
- Reuses existing React Flow patterns from org charts/workflow diagrams (Phase 28)
- Reuses existing `architectureIntegrations` table for onboarding status (different concern)
- Distinction: `arch_nodes` = diagram data, `architectureIntegrations` = operational connection status

### Context Upload Expansion — Extraction Routing

**Modified Components:**
- `worker/jobs/document-extraction.ts::EXTRACTION_SYSTEM` — extend entity type enum
- `worker/jobs/document-extraction.ts::isAlreadyIngested()` — add dedup logic for new types
- Extraction routing map (lines 16-17 in existing code) — add new table imports

**New Entity Types:**
- `wbs_item` → routes to `wbs_items` table
- `team_engagement_section` → routes to `team_engagement_sections` (with section_type routing)
- `arch_node` → routes to `arch_nodes` (with track_id resolution)

**Data Flow Changes:**
```
BEFORE (v5.0):
  extraction → 11 entity types (action, risk, milestone, task, decision, etc)

AFTER (v6.0):
  extraction → 14 entity types (+ wbs_item, team_engagement_section, arch_node)

Routing logic:
  switch (item.entityType) {
    case 'wbs_item':
      → resolve template_id from item.fields.track
      → INSERT wbs_items (parent_id resolved from item.fields.parent_title match)
    case 'team_engagement_section':
      → route to team_engagement_sections
      → section_type = infer from item.fields structure (has 'workflow_name'? → 'workflow')
    case 'arch_node':
      → resolve track_id from item.fields.track ('before' | 'adr' | 'biggy')
      → INSERT arch_nodes
  }
```

**Integration Points:**
- No changes to BullMQ worker infrastructure (existing handler dispatch works)
- No changes to extraction job lifecycle (pending → extracting → preview → approved)
- Only changes: entity parsing logic + DB insert routing

## Recommended Build Order

Build order optimizes for **testability** (data layer first) and **dependency resolution** (shared components before consumers).

### Phase 1: Database Schema & Core Queries (Foundational)

**Why first:** All features depend on new tables. Migrate schema before any feature work.

1. **DB Migration:**
   - Add columns: `projects.exec_action_required`, `projects.dependency_projects`
   - Create tables: `wbs_templates`, `wbs_items`, `wbs_task_assignments`, `team_engagement_sections`, `arch_tracks`, `arch_nodes`
   - Seed: ADR + Biggy WBS templates, arch_tracks (Before State, ADR, Biggy)

2. **Query Extensions:**
   - `lib/queries.ts::getPortfolioDashboardData()` — aggregated multi-project query
   - `lib/queries.ts::computeProjectHealth()` — add exec escalation detection
   - `lib/queries.ts::getWbsItems()` — tree query with parent/child resolution
   - `lib/queries.ts::getTeamEngagementSections()` — grouped by section_type
   - `lib/queries.ts::getArchNodes()` — filtered by track_id

**Test:** Direct DB queries via Drizzle (no UI needed yet)

### Phase 2: Context Upload Extraction (Enables Auto-Population)

**Why second:** Once extraction works, all downstream features can be populated via upload.

1. **Extraction System Prompt:**
   - Extend `EXTRACTION_SYSTEM` with 3 new entity types (wbs_item, team_engagement_section, arch_node)
   - Add field guidance for each type

2. **Extraction Routing:**
   - `isAlreadyIngested()` — add dedup logic for new entity types
   - Add insert handlers for new tables (with FK resolution: template_id, track_id, parent_id)

3. **Testing:**
   - Upload test SOW/kickoff deck → verify staged_items_json contains new entity types
   - Approve → verify DB inserts to new tables

**Dependency:** Phase 1 (schema must exist)

### Phase 3: WBS (Lowest Cross-Feature Dependency)

**Why third:** WBS is self-contained — doesn't depend on Team Engagement or Architecture features.

1. **WBS Tree Component:**
   - `components/WBSTree.tsx` — collapsible hierarchy with inline edit
   - Client-side state for expand/collapse
   - PATCH `/api/projects/[id]/wbs/{itemId}` for updates

2. **WBS Page:**
   - `/app/customer/[id]/plan/wbs/page.tsx` — Server Component fetches tree, passes to WBSTree client

3. **Generate Plan:**
   - `lib/wbs-generator.ts::generateMissingWbsItems()` — Claude API call with template + context
   - `/app/api/projects/[id]/wbs/generate/route.ts` — POST endpoint
   - `components/WBSGeneratePlanModal.tsx` — trigger UI

4. **Tab Navigation:**
   - Update `/app/customer/[id]/layout.tsx` — replace "Phase Board" link with "WBS"

**Dependency:** Phase 2 (extraction must populate wbs_items from uploads)

### Phase 4: Architecture Diagrams (React Flow Reuse)

**Why fourth:** Reuses existing React Flow patterns (Phase 28). Independent of WBS and Team Engagement.

1. **Architecture Diagram Component:**
   - `components/ArchitectureDiagramFlow.tsx` — React Flow with two track filters
   - Dynamic import + `ssr: false` (existing pattern)
   - Node drag/edit → PATCH `/api/projects/[id]/architecture/diagrams/{nodeId}`

2. **Architecture Diagrams Page:**
   - `/app/customer/[id]/architecture/diagrams/page.tsx` — two-tab layout (Before State, Current & Future)
   - Server Component fetches arch_nodes grouped by track_id

3. **Tab Integration:**
   - Update `/app/customer/[id]/architecture/layout.tsx` — add "Diagrams" sub-tab

**Dependency:** Phase 2 (extraction must populate arch_nodes)

### Phase 5: Team Engagement Overview (Consolidates Existing Data)

**Why fifth:** Consolidates scattered existing tables — requires data migration + UI rebuild.

1. **Team Engagement Panel Component:**
   - `components/TeamEngagementPanel.tsx` — 5-section structured view
   - Each section: title + content_json renderer (varies by section_type)
   - Edit modal per section → PATCH `/api/projects/[id]/team-engagement/{sectionId}`

2. **Team Engagement Page:**
   - `/app/customer/[id]/teams/engagement/page.tsx` — Server Component groups sections
   - Missing data warnings: if section_type count = 0 → EmptyState

3. **Data Migration (optional):**
   - Script: migrate existing `businessOutcomes`, `e2eWorkflows`, `focusAreas` → `team_engagement_sections`
   - Only if preserving existing project data; new projects seed from context uploads

**Dependency:** Phase 2 (extraction populates team_engagement_sections)

### Phase 6: Portfolio Dashboard (Aggregates All Projects)

**Why last:** Depends on all other features being complete for full testing. Aggregates data from WBS, Architecture, Team Engagement.

1. **Portfolio Query:**
   - `lib/queries.ts::getPortfolioDashboardData()` — multi-project aggregation with health rollup

2. **Portfolio Components:**
   - `components/PortfolioTable.tsx` — client-side filtering/sort (reuses ActionsTableClient pattern)
   - `components/PortfolioExceptionsPanel.tsx` — overdue actions + high risks + exec escalations
   - `components/PortfolioHealthSummary.tsx` — cross-project health chart (Recharts)

3. **Dashboard Page Rewrite:**
   - `/app/page.tsx` — MAJOR REWRITE from project health cards to portfolio view
   - Layout: Health Summary → Exceptions Panel → Multi-Project Table → Recent Activity

**Dependency:** Phase 1 (portfolio queries), Phase 3-5 (features to aggregate)

## Architectural Patterns (Established, Reused in v6.0)

### Pattern 1: Server Component + Client Island Filtering

**What:** Server Component fetches full dataset, passes to Client Component that filters in-memory via URL params.

**When to use:** Table views with filtering/sorting that don't require server pagination (< 1000 rows).

**Example (existing):**
```typescript
// Server Component: /app/customer/[id]/actions/page.tsx
export default async function ActionsPage({ params, searchParams }) {
  const actions = await getAllActions(projectId); // full dataset
  return <ActionsTableClient actions={actions} searchParams={searchParams} />;
}

// Client Component: ActionsTableClient.tsx
'use client';
export function ActionsTableClient({ actions, searchParams }) {
  const filtered = useMemo(() => {
    return actions.filter(a => {
      if (searchParams.status && a.status !== searchParams.status) return false;
      if (searchParams.owner && a.owner !== searchParams.owner) return false;
      return true;
    });
  }, [actions, searchParams]);

  return <table>...</table>;
}
```

**v6.0 Reuse:**
- `PortfolioTable.tsx` — filters projects client-side by status/health/owner
- `WBSTree.tsx` — filters WBS items by track/phase
- No API calls on filter change → instant UX

**Trade-offs:**
- ✅ Fast filtering (no network round-trip)
- ✅ Shareable URLs (filter state in query params)
- ❌ All data sent to client (not suitable for 10k+ rows)

### Pattern 2: BullMQ Background Job + Polling UI

**What:** Long-running operation (document extraction, AI generation) runs in BullMQ worker. UI polls for completion.

**When to use:** Operations > 10 seconds, browser-refresh resilient required.

**Example (existing):**
```typescript
// API Route: /app/api/ingestion/extract/route.ts
const job = await extractionQueue.add('document-extraction', {
  jobId: extractionJob.id,
  artifactId,
  projectId,
  batchId,
});

// Client: polls /api/ingestion/jobs/{jobId} every 2 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    const status = await fetch(`/api/ingestion/jobs/${jobId}`).then(r => r.json());
    if (status.status === 'completed') {
      clearInterval(interval);
      refetchData();
    }
  }, 2000);
}, [jobId]);
```

**v6.0 Reuse:**
- WBS Generate Plan → POST `/api/projects/{id}/wbs/generate` → BullMQ job → poll for completion
- No code changes to worker infrastructure (existing handler dispatch works)

**Trade-offs:**
- ✅ Browser-refresh resilient
- ✅ Decouples long-running task from HTTP request timeout
- ❌ Polling overhead (consider WebSocket for real-time progress in v7.0)

### Pattern 3: Structured JSON in Single Column

**What:** Store rich structured data in JSONB column instead of multiple tables with FKs.

**When to use:** Schema varies by record, read-heavy workload, no need for SQL filtering on nested fields.

**Example (existing):**
```typescript
// artifacts.ingestion_log_json stores:
{
  "extracted": 15,
  "filtered": 3,
  "chunks": [{"start": 0, "end": 80000, "duration_ms": 12500}]
}

// Queried as whole object, never filtered by chunk.duration_ms
const artifacts = await db.select().from(artifacts).where(eq(artifacts.project_id, projectId));
artifacts.forEach(a => console.log(a.ingestion_log_json.extracted));
```

**v6.0 Reuse:**
- `wbs_templates.structure_json` — stores phase hierarchy (no need for separate phase/task tables)
- `team_engagement_sections.content_json` — flexible structure per section_type
- `arch_nodes.positions_json` — React Flow node positions {x, y, width, height}

**Trade-offs:**
- ✅ Avoids table explosion (5 section types = 5 different JSON shapes, not 5 tables)
- ✅ Flexible schema evolution (add field without migration)
- ❌ No SQL filtering on nested fields (use separate column if filtering required)
- ❌ JSONB parsing in app code (more complex than scalar fields)

### Pattern 4: Cross-Tab Sync via CustomEvent

**What:** Client components in different React trees communicate via browser CustomEvent API.

**When to use:** Edit on one tab should refresh another tab without full page reload (same browser tab, not cross-tab browser tabs).

**Example (existing):**
```typescript
// Actions edit triggers metrics refresh
// ActionsTableClient.tsx
const handleSave = async () => {
  await updateAction(actionId, data);
  window.dispatchEvent(new CustomEvent('metrics:invalidate'));
};

// OverviewMetrics.tsx (different component tree)
useEffect(() => {
  const handler = () => refetchMetrics();
  window.addEventListener('metrics:invalidate', handler);
  return () => window.removeEventListener('metrics:invalidate', handler);
}, []);
```

**v6.0 Reuse:**
- WBS edit → dispatch `metrics:invalidate` → Overview dashboard refetches health
- Architecture diagram node edit → dispatch `team:invalidate` → Team Engagement panel refetches
- No external state library needed (React Context would re-render entire tree)

**Trade-offs:**
- ✅ Zero dependencies (browser native)
- ✅ Decoupled components (no direct refs)
- ❌ Only works within same browser tab (not cross-tab sync — would need BroadcastChannel)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Over-Normalizing JSONB Data

**What people do:** Create separate tables for every nested object in a flexible structure.

**Why it's wrong:**
- `team_engagement_sections` has 5 section types, each with different fields
- Creating 5 tables (`business_outcomes`, `architecture_panels`, `workflows`, `team_cards`, `focus_areas`) requires:
  - 5 migration files
  - 5 Drizzle schema definitions
  - 5 sets of CRUD API routes
  - Complex JOIN queries to render Team Engagement page

**Do this instead:**
- Single `team_engagement_sections` table with `section_type` enum + `content_json` JSONB
- Type-safe parsing in app code:
```typescript
type TeamEngagementContent =
  | { type: 'business_outcome'; title: string; track: string; description: string }
  | { type: 'workflow'; team_name: string; steps: {label: string}[] }
  // ... other types

function parseContent(section: TeamEngagementSection): TeamEngagementContent {
  return section.content_json as TeamEngagementContent;
}
```

**When to normalize instead:** If you need to filter/sort by nested fields in SQL queries.

### Anti-Pattern 2: Client-Side Aggregation for Portfolio Queries

**What people do:** Fetch all projects client-side, compute health rollup in React.

**Why it's wrong:**
```typescript
// BAD: 10 projects × 5 API calls each = 50 requests on page load
const [projects, setProjects] = useState([]);
useEffect(() => {
  Promise.all(projectIds.map(id =>
    Promise.all([
      fetch(`/api/projects/${id}`),
      fetch(`/api/projects/${id}/actions`),
      fetch(`/api/projects/${id}/risks`),
      // ...
    ])
  )).then(aggregateHealthClientSide);
}, []);
```

**Do this instead:**
- Single server-side query with JOIN + GROUP BY:
```typescript
// lib/queries.ts::getPortfolioDashboardData()
const projects = await db
  .select({
    id: projects.id,
    name: projects.name,
    overdueActions: sql<number>`count(case when actions.status = 'open' and actions.due < now() then 1 end)`,
    highRisks: sql<number>`count(case when risks.severity = 'high' then 1 end)`,
  })
  .from(projects)
  .leftJoin(actions, eq(actions.project_id, projects.id))
  .leftJoin(risks, eq(risks.project_id, projects.id))
  .groupBy(projects.id);
```

**Performance:** 1 query vs 50 queries = 50x faster page load.

### Anti-Pattern 3: Separate Extraction Jobs per Entity Type

**What people do:** Create 3 new BullMQ job types (`extract-wbs`, `extract-team-engagement`, `extract-architecture`) for new entity types.

**Why it's wrong:**
- 3x worker handler code duplication
- 3x job registration in `worker/index.ts`
- 3x API route handlers for job status polling
- Document uploaded once, but triggers 3 separate Claude API calls → 3x cost

**Do this instead:**
- Single `document-extraction` job extracts ALL entity types in one Claude call
- Routing logic in `isAlreadyIngested()` and insert handlers dispatch by entity type
- Existing BullMQ infrastructure unchanged

**When separate jobs are correct:** If entity types have fundamentally different extraction logic (e.g., OCR for images vs text parsing for documents).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 projects | Current architecture is optimal. Client-side filtering works well. |
| 10-100 projects | Portfolio table needs server-side pagination. Convert `PortfolioTable` to fetch data per page. WBS tree may need lazy-loading for deep hierarchies (> 500 nodes). |
| 100-1000 projects | Add Redis caching for portfolio aggregation query (cache key: `portfolio:summary:{timestamp}`). Move health computation to scheduled background job (nightly rollup). |

### Scaling Priorities

1. **First bottleneck (at ~50 projects):** Portfolio dashboard query becomes slow (5+ tables JOIN with GROUP BY).
   - **Fix:** Add composite index on `(project_id, status, due)` to actions/risks/milestones tables.
   - **Fix:** Cache aggregated health data in `projects.health_summary_json` (updated nightly or on-demand).

2. **Second bottleneck (at ~100 projects):** Client-side filtering on PortfolioTable causes UI lag (filtering 100+ rows with 20+ columns).
   - **Fix:** Convert to server-side filtering with `searchParams` → SQL WHERE clause.
   - **Fix:** Add pagination (50 projects per page).

3. **Third bottleneck (at ~500 WBS items per project):** WBS tree render is slow (recursive component rendering 500+ nodes).
   - **Fix:** Lazy-load children on expand (fetch subtree via API when parent expanded).
   - **Fix:** Virtualized list rendering (react-window) for visible nodes only.

## Integration Points Summary

### Shared Infrastructure (Reused, No Changes)

| Component | v6.0 Usage |
|-----------|------------|
| BullMQ worker dispatch | Document extraction adds 3 entity types, no worker code changes |
| React Flow diagrams | Architecture diagrams reuse existing pattern (ssr: false, dynamic import) |
| Client-side filtering | Portfolio table, WBS tree both use URL param filtering |
| CustomEvent sync | WBS/Architecture edits trigger metrics refresh |
| Recharts visualizations | Portfolio health summary reuses existing chart components |

### New Integration Points

| Feature | Depends On | Provides To |
|---------|------------|-------------|
| Portfolio Dashboard | All project data (actions, risks, milestones, WBS, architecture) | Aggregated health view, exceptions panel |
| WBS | tasks table (linkage), wbs_templates (seeded structure) | Task assignments, phase tracking |
| Team Engagement | Consolidates businessOutcomes, e2eWorkflows, focusAreas tables | Unified engagement map |
| Architecture Diagrams | arch_tracks (seeded), React Flow infrastructure | Before/After state visualization |
| Context Upload | All new tables (extraction routing) | Auto-population of all features |

### Cross-Feature Dependencies

```
Context Upload (Phase 2)
  ↓ populates via extraction
WBS (Phase 3) + Architecture (Phase 4) + Team Engagement (Phase 5)
  ↓ consumed by
Portfolio Dashboard (Phase 6)
  ↓ aggregates for
Executive view (health summary, exceptions)
```

**Critical path:** Context Upload must work before downstream features are testable with real data.

## Sources

- Existing codebase: `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/`
- PROJECT.md: v6.0 requirements (DASH-01–06, WBS-01–05, TEAM-01–04, ARCH-01–04)
- db/schema.ts: Existing table structures and patterns
- worker/jobs/document-extraction.ts: Extraction infrastructure
- lib/queries.ts: Existing query patterns
- components/: Existing UI component patterns (ActionsTableClient, React Flow org charts)

---
*Architecture research for: BigPanda Project Assistant v6.0*
*Researched: 2026-04-07*
