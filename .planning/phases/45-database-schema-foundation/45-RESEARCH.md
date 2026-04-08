# Phase 45: Database Schema Foundation - Research

**Researched:** 2026-04-08
**Domain:** PostgreSQL schema design with Drizzle ORM, hierarchical data modeling, atomic seeding patterns
**Confidence:** HIGH

## Summary

Phase 45 creates the database foundation for WBS, Team Engagement, and Architecture features. This is a pure data model phase—no UI changes, just schema additions, seed data, and query functions.

The primary technical challenge is implementing a self-referencing hierarchical structure (WBS items with `parent_id`) in Drizzle ORM with PostgreSQL. The codebase already has a proven pattern for this (tasks.blocked_by self-FK), and the seeding pattern is well-established (onboarding phases/steps in app/api/projects/route.ts transaction block).

**Primary recommendation:** Follow existing patterns exactly—self-referencing FK using `references((): AnyPgColumn => tableName.id)`, pgEnum declarations before tables in migrations, and atomic seeding inside the existing db.transaction in route.ts.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **WBS hierarchy storage:** `parent_id + level` columns on wbs_items. Each row has nullable parent_id (self-reference) and explicit level integer (1, 2, 3). Max depth of 3 enforced at application level. Status per item: not_started / in_progress / complete. Task linkage via wbs_task_assignments join table. Tasks assignable at ANY level.
- **WBS template seeding—ADR (10 sections):** Seeded on project creation inside db.transaction. Level-1 sections and level-2 sub-items as specified in CONTEXT.md (Discovery & Kickoff, Solution Design with 3 sub-items, Alert Source Integration with 2 sub-items, etc.).
- **WBS template seeding—Biggy (5 sections):** Discovery & Kickoff, Integrations (3 sub-items), Workflow (3 sub-items), Teams & Training (3 sub-items), Deploy.
- **Team Engagement section schema:** 5 sections stored as rows in team_engagement_sections table (Business Outcomes, Architecture, E2E Workflows, Teams & Engagement, Top Focus Areas). Each section has single content text field (markdown-friendly)—one blob per section. Pre-seeded for every new project (empty content) inside same db.transaction.
- **Architecture node model:** arch_tracks and arch_nodes seeded per project. Two tracks: ADR Track (Event Ingest → Alert Intelligence → Incident Intelligence → Console → Workflow Automation) and AI Assistant Track (Knowledge Sources → Real-Time Query → AI Capabilities → Console → Outputs & Actions). Each arch_node has track_id, name, display_order, status (planned / in_progress / live), notes text. Team Onboarding Status matrix in separate arch_team_status table.
- **Projects table additions:** exec_action_required boolean column (default false). Project dependencies stored in project_dependencies join table (source_project_id + depends_on_project_id).
- **Migration file:** Next migration is 0028_wbs_team_arch_schema.sql. Adds all new tables and exec_action_required column.
- **Query functions:** getWbsItems(projectId, track), getTeamEngagementSections(projectId), getArchNodes(projectId), getArchTeamStatus(projectId) in lib/queries.ts.

### Claude's Discretion
- Exact column names and Drizzle type definitions beyond what is specified
- display_order column on wbs_items (assumed yes, consistent with onboardingPhases pattern)
- source_trace column on wbs_items (consistent with project-wide source tracing—assume yes)
- Whether to extract seeding logic into shared seedProjectDefaults(tx, projectId) helper or keep inline in route.ts

### Deferred Ideas (OUT OF SCOPE)
None—discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WBS-01 | Phase Board is replaced with a WBS view that displays both ADR and Biggy WBS templates as a collapsible 3-level hierarchy within a single project workspace | Schema provides wbs_items table with parent_id + level columns (1/2/3), track column (ADR/Biggy), display_order for consistent rendering order. Self-referencing FK enables tree queries. Status tracking per node (not_started/in_progress/complete). |
| WBS-02 | Both ADR and Biggy WBS template structures seed automatically on project creation | Seeding pattern proven in app/api/projects/route.ts—extend existing db.transaction to insert 10 ADR sections + 23 sub-items and 5 Biggy sections + 9 sub-items atomically. Template data defined in CONTEXT.md maps directly to wbs_items rows. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.45.1 | Type-safe PostgreSQL ORM | Project standard—used for all 27 existing tables. Provides schema definitions, migrations, and query builder. |
| drizzle-kit | 0.31.10 | Migration generation tool | Project standard—generates and applies migrations. Manual SQL editing workflow already established. |
| PostgreSQL | 14+ | Relational database | Project standard—deployed database. Self-referencing FKs, enums, transactions all supported natively. |
| Vitest | latest | Test framework | Project standard—370+ passing tests. Unit tests for seeding logic and query functions. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.3.6 | Schema validation | Already in use—validate API request bodies for future bulk updates (not this phase). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle self-referencing FK | Adjacency list with raw SQL | Drizzle provides type safety and existing pattern (tasks.blocked_by). No reason to switch. |
| Nested Set Model | Adjacency List (parent_id) | Nested Set optimizes queries but complicates writes. WBS is write-heavy (user edits, AI generation). Adjacency list + level column is simpler and sufficient. |
| Separate ADR/Biggy tables | Single wbs_items table with track column | Single table reduces duplication, simplifies queries, matches onboardingPhases pattern. Track column filters at query time. |

**Installation:**
```bash
# Already installed—no new dependencies
cd bigpanda-app && npm install  # Confirms existing Drizzle setup
```

## Architecture Patterns

### Recommended Project Structure
```
bigpanda-app/
├── db/
│   ├── schema.ts                 # All Drizzle table definitions (append new tables)
│   └── migrations/
│       └── 0028_wbs_team_arch_schema.sql  # New migration (plain DDL)
├── lib/
│   └── queries.ts                # Query functions (append new exports)
└── app/api/projects/
    └── route.ts                  # POST handler (extend transaction block)
```

### Pattern 1: Self-Referencing Foreign Key (Hierarchical Data)
**What:** Table column references its own primary key to model parent-child relationships.
**When to use:** Tree structures (WBS items, org charts, comment threads).
**Example:**
```typescript
// Source: bigpanda-app/db/schema.ts (tasks.blocked_by pattern)
import { type AnyPgColumn } from 'drizzle-orm/pg-core';

export const wbsItems = pgTable('wbs_items', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  parent_id: integer('parent_id').references((): AnyPgColumn => wbsItems.id),  // Self-FK, nullable
  level: integer('level').notNull(),                                            // 1, 2, or 3
  name: text('name').notNull(),
  track: text('track').notNull(),                                                // 'ADR' | 'Biggy'
  status: wbsItemStatusEnum('status').default('not_started').notNull(),
  display_order: integer('display_order').notNull().default(0),
  source_trace: text('source_trace'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
```

**Migration SQL:**
```sql
-- Source: Existing pattern from 0002_add_task_deps.sql
CREATE TABLE wbs_items (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  parent_id INTEGER REFERENCES wbs_items(id),  -- Self-referencing FK
  level INTEGER NOT NULL,
  name TEXT NOT NULL,
  track TEXT NOT NULL,
  status wbs_item_status NOT NULL DEFAULT 'not_started',
  display_order INTEGER NOT NULL DEFAULT 0,
  source_trace TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Pattern 2: PostgreSQL Enum Declaration (Migration Order)
**What:** Enums must be created BEFORE tables that reference them in migration SQL.
**When to use:** Every pgEnum in schema.ts requires corresponding CREATE TYPE in migration.
**Example:**
```sql
-- Source: bigpanda-app/db/migrations/0001_initial.sql
-- ENUM FIRST
DO $$ BEGIN
  CREATE TYPE "wbs_item_status" AS ENUM('not_started', 'in_progress', 'complete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- TABLE SECOND (references enum)
CREATE TABLE wbs_items (
  ...
  status wbs_item_status NOT NULL DEFAULT 'not_started',
  ...
);
```

**Drizzle schema.ts:**
```typescript
// Declare enum BEFORE table definition
export const wbsItemStatusEnum = pgEnum('wbs_item_status', [
  'not_started', 'in_progress', 'complete',
]);

// Use enum in table
export const wbsItems = pgTable('wbs_items', {
  status: wbsItemStatusEnum('status').default('not_started').notNull(),
});
```

### Pattern 3: Atomic Seeding in Transaction
**What:** All default data for a new project inserted atomically inside db.transaction.
**When to use:** Any table requiring seed data on project creation.
**Example:**
```typescript
// Source: bigpanda-app/app/api/projects/route.ts (existing pattern)
const result = await db.transaction(async (tx) => {
  // 1. Insert project
  const [inserted] = await tx
    .insert(projects)
    .values({ name, customer, status: 'draft' })
    .returning({ id: projects.id });

  // 2. Seed onboarding phases (existing)
  await tx.insert(onboardingPhases).values(
    adrPhases.map((p) => ({
      project_id: inserted.id,
      track: 'ADR',
      name: p.name,
      display_order: p.display_order,
    }))
  );

  // 3. Seed WBS items (NEW in this phase)
  await tx.insert(wbsItems).values([
    { project_id: inserted.id, level: 1, name: 'Discovery & Kickoff', track: 'ADR', display_order: 1, source_trace: 'template' },
    // ... all ADR sections + sub-items
  ]);

  // 4. Seed team engagement sections (NEW)
  await tx.insert(teamEngagementSections).values([
    { project_id: inserted.id, name: 'Business Outcomes', content: '', source_trace: 'template' },
    // ... all 5 sections
  ]);

  // 5. Seed architecture tracks + nodes (NEW)
  const [adrTrack] = await tx.insert(archTracks).values({
    project_id: inserted.id, name: 'ADR Track', display_order: 1
  }).returning({ id: archTracks.id });

  await tx.insert(archNodes).values([
    { track_id: adrTrack.id, name: 'Event Ingest', display_order: 1, status: 'planned' },
    // ... all 5 ADR nodes
  ]);

  return inserted;
});
```

### Pattern 4: Query Function Conventions
**What:** Server-only query functions with typed return values.
**When to use:** All data fetching for Server Components.
**Example:**
```typescript
// Source: bigpanda-app/lib/queries.ts (existing pattern)
import { db } from '@/db';
import { wbsItems } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export type WbsItem = typeof wbsItems.$inferSelect;

export async function getWbsItems(projectId: number, track: string): Promise<WbsItem[]> {
  return db
    .select()
    .from(wbsItems)
    .where(and(
      eq(wbsItems.project_id, projectId),
      eq(wbsItems.track, track)
    ))
    .orderBy(asc(wbsItems.level), asc(wbsItems.display_order));
}

// Export type for use in components
export type { WbsItem };
```

### Anti-Patterns to Avoid
- **Mixing seeding logic outside transaction:** All seeds must be inside the db.transaction block in route.ts. Partial failures leave inconsistent state.
- **Hardcoding parent IDs in seed data:** Use returning({ id }) after inserting parent rows, then reference those IDs for children.
- **Skipping source_trace on seeded data:** All template-generated rows need source_trace: 'template' for auditability.
- **Creating separate migrations for enums:** Enums and tables go in same migration file (0028). Enum creation before table creation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tree traversal queries | Recursive CTE builder | Direct SQL with Drizzle sql tagged template | Drizzle doesn't yet support recursive CTEs in query builder. Future phases will use raw SQL for tree queries (Phase 47 WBS UI). This phase only needs flat select + orderBy. |
| Enum validation | Runtime string checks | PostgreSQL enum type + Drizzle pgEnum | Database enforces enum constraints. Drizzle types propagate to TypeScript. No manual validation needed. |
| Transaction rollback logic | Manual try/catch + rollback | Drizzle db.transaction() auto-rollback | Transaction callback failures automatically rollback. No manual commit/rollback code required. |
| Foreign key cascade | Application-level deletion loops | ON DELETE CASCADE in migration SQL | Database handles cascading deletes. No need to manually delete children before parents. |

**Key insight:** Drizzle abstracts most PostgreSQL patterns cleanly EXCEPT recursive CTEs. For this phase, we only need simple queries (flat list with orderBy), so no raw SQL required yet.

## Common Pitfalls

### Pitfall 1: Forgetting `(): AnyPgColumn` Cast for Self-Referencing FK
**What goes wrong:** TypeScript error "Type 'PgTableWithColumns<...>' is not assignable to type 'AnyPgColumn'".
**Why it happens:** Drizzle's type system needs explicit cast when a column references its own table before the table definition is complete.
**How to avoid:** Use exact pattern from tasks.blocked_by: `references((): AnyPgColumn => tableName.id)`
**Warning signs:** TypeScript error at table definition site (not query site).

### Pitfall 2: Enum Creation After Table Creation in Migration
**What goes wrong:** Migration fails with "type wbs_item_status does not exist".
**Why it happens:** SQL executes sequentially—table creation references enum that doesn't exist yet.
**How to avoid:** Always put all CREATE TYPE statements at the top of migration file, before any CREATE TABLE statements.
**Warning signs:** Migration runs fine locally (existing enum from previous dev work) but fails on fresh database or CI.

### Pitfall 3: Seeding Without Awaiting Intermediate Inserts
**What goes wrong:** Child rows reference parent IDs that haven't been committed yet, causing FK constraint violations or race conditions.
**Why it happens:** Transaction is async—inserts don't complete until awaited.
**How to avoid:** Use returning({ id }) pattern and await parent inserts before inserting children. For WBS items, level-1 rows must be inserted and IDs captured before inserting level-2 rows.
**Warning signs:** Intermittent FK constraint violations, especially under load.

### Pitfall 4: Hardcoding Display Order Values
**What goes wrong:** Reordering items requires manual SQL updates. Template additions break ordering.
**Why it happens:** Using sequential integers (1, 2, 3) leaves no gaps for insertions.
**How to avoid:** Use gap-based ordering (10, 20, 30) to allow insertions (15) without renumbering. Or use fractional indexing pattern. For Phase 45, simple integers are fine since templates are static.
**Warning signs:** Future feature requests for manual reordering become expensive.

### Pitfall 5: Missing `source_trace` on Template Data
**What goes wrong:** Impossible to distinguish user-created vs template-generated items. Reporting and debugging suffer.
**Why it happens:** Forgetting to add source_trace: 'template' during seeding.
**How to avoid:** Every seeded row MUST have source_trace: 'template'. Add to insert values alongside other fields.
**Warning signs:** Extraction logic (Phase 46) has no way to skip template items, leading to duplicate detection issues.

## Code Examples

Verified patterns from existing codebase:

### Self-Referencing FK Declaration
```typescript
// Source: bigpanda-app/db/schema.ts line 272
import { type AnyPgColumn } from 'drizzle-orm/pg-core';

export const wbsItems = pgTable('wbs_items', {
  id: serial('id').primaryKey(),
  parent_id: integer('parent_id').references((): AnyPgColumn => wbsItems.id), // nullable by default
  level: integer('level').notNull(),
  // ... other columns
});

export type WbsItem = typeof wbsItems.$inferSelect;
export type WbsItemInsert = typeof wbsItems.$inferInsert;
```

### Migration File Structure (Enum + Table)
```sql
-- Source: bigpanda-app/db/migrations/0005_onboarding_dashboard.sql
-- ENUMS FIRST (idempotent with DO block)
DO $$ BEGIN
  CREATE TYPE "wbs_item_status" AS ENUM('not_started', 'in_progress', 'complete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "arch_node_status" AS ENUM('planned', 'in_progress', 'live');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- TABLES SECOND (idempotent with IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS wbs_items (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  parent_id INTEGER REFERENCES wbs_items(id),
  level INTEGER NOT NULL,
  name TEXT NOT NULL,
  track TEXT NOT NULL,
  status wbs_item_status NOT NULL DEFAULT 'not_started',
  display_order INTEGER NOT NULL DEFAULT 0,
  source_trace TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- INDEXES LAST
CREATE INDEX IF NOT EXISTS idx_wbs_items_project_track ON wbs_items(project_id, track);
CREATE INDEX IF NOT EXISTS idx_wbs_items_parent ON wbs_items(parent_id);
```

### Atomic Seeding with Parent ID Capture
```typescript
// Source: bigpanda-app/app/api/projects/route.ts (extended pattern)
const result = await db.transaction(async (tx) => {
  const [inserted] = await tx
    .insert(projects)
    .values({ name, customer, status: 'draft' })
    .returning({ id: projects.id });

  // Level 1 WBS items (ADR track)
  const adrLevel1 = [
    { name: 'Discovery & Kickoff', display_order: 1 },
    { name: 'Solution Design', display_order: 2 },
    // ... 8 more sections
  ];

  const adrParents = await tx.insert(wbsItems).values(
    adrLevel1.map((item) => ({
      project_id: inserted.id,
      level: 1,
      track: 'ADR',
      name: item.name,
      display_order: item.display_order,
      status: 'not_started' as const,
      source_trace: 'template',
    }))
  ).returning({ id: wbsItems.id, name: wbsItems.name });

  // Level 2 WBS items (children of Solution Design)
  const solutionDesignParent = adrParents.find(p => p.name === 'Solution Design');
  if (solutionDesignParent) {
    await tx.insert(wbsItems).values([
      {
        project_id: inserted.id,
        parent_id: solutionDesignParent.id,  // Reference captured parent ID
        level: 2,
        track: 'ADR',
        name: 'Ops Shadowing / Current State',
        display_order: 1,
        status: 'not_started' as const,
        source_trace: 'template',
      },
      // ... 2 more sub-items
    ]);
  }

  return inserted;
});
```

### Query Function with Type Export
```typescript
// Source: bigpanda-app/lib/queries.ts (pattern)
import { db } from '@/db';
import { wbsItems, teamEngagementSections, archTracks, archNodes } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export type WbsItem = typeof wbsItems.$inferSelect;
export type TeamEngagementSection = typeof teamEngagementSections.$inferSelect;
export type ArchTrack = typeof archTracks.$inferSelect;
export type ArchNode = typeof archNodes.$inferSelect;

export async function getWbsItems(projectId: number, track: string): Promise<WbsItem[]> {
  return db
    .select()
    .from(wbsItems)
    .where(and(
      eq(wbsItems.project_id, projectId),
      eq(wbsItems.track, track)
    ))
    .orderBy(asc(wbsItems.level), asc(wbsItems.display_order));
}

export async function getTeamEngagementSections(projectId: number): Promise<TeamEngagementSection[]> {
  return db
    .select()
    .from(teamEngagementSections)
    .where(eq(teamEngagementSections.project_id, projectId))
    .orderBy(asc(teamEngagementSections.display_order));
}

export async function getArchNodes(projectId: number) {
  const tracks = await db
    .select()
    .from(archTracks)
    .where(eq(archTracks.project_id, projectId))
    .orderBy(asc(archTracks.display_order));

  const nodes = await db
    .select()
    .from(archNodes)
    .where(eq(archNodes.project_id, projectId))
    .orderBy(asc(archNodes.display_order));

  return { tracks, nodes };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Drizzle 0.28 (2024) | Drizzle 0.45.1 (2026) | Incremental updates | Self-referencing FK pattern unchanged. API stable since 0.28. |
| Manual migration writing | drizzle-kit generate + manual edits | Phase 1 (2026-03-18) | Project workflow: generate skeleton, hand-edit for idempotency (DO blocks, IF NOT EXISTS). |
| Nested JSON for hierarchies | Relational parent_id columns | Standard practice | JSON trees hard to query. Relational model enables future recursive CTEs, joins, constraints. |
| Phase Board (existing) | WBS View (Phase 45-47) | v6.0 (2026-04) | Phase Board was flat list of onboarding phases. WBS is 3-level tree with task linkage. |

**Deprecated/outdated:**
- **drizzle-orm 0.28 and earlier:** Type inference for self-referencing FKs was buggy. Now fixed—use `(): AnyPgColumn` cast pattern.
- **Manual transaction commit/rollback:** Pre-0.30 required explicit tx.commit(). Now automatic via callback return/throw.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (latest) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- --run --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WBS-01 | wbs_items table stores 3-level hierarchy with parent_id, level, track columns | unit | `npm test tests/schema/wbs-items.test.ts --run` | ❌ Wave 0 |
| WBS-02 | New project creation seeds 10 ADR sections + 23 sub-items and 5 Biggy sections + 9 sub-items | unit | `npm test tests/seeding/wbs-templates.test.ts --run` | ❌ Wave 0 |
| WBS-02 | getWbsItems(projectId, track) returns correctly ordered items | unit | `npm test tests/queries/wbs-queries.test.ts --run` | ❌ Wave 0 |
| (Implicit) | team_engagement_sections table pre-seeded with 5 empty sections | unit | `npm test tests/seeding/team-engagement.test.ts --run` | ❌ Wave 0 |
| (Implicit) | arch_tracks and arch_nodes seeded with 2 tracks + 10 nodes | unit | `npm test tests/seeding/architecture.test.ts --run` | ❌ Wave 0 |
| (Implicit) | project_dependencies join table allows M:M project relationships | unit | `npm test tests/schema/project-dependencies.test.ts --run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test tests/schema/ tests/seeding/ tests/queries/ --run` (< 5 seconds)
- **Per wave merge:** `npm test --run` (full suite, ~30 seconds)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/schema/wbs-items.test.ts` — validates wbs_items table structure, self-referencing FK, enum constraints
- [ ] `tests/seeding/wbs-templates.test.ts` — verifies ADR (10+23) and Biggy (5+9) template seeding logic
- [ ] `tests/queries/wbs-queries.test.ts` — tests getWbsItems returns correctly ordered items
- [ ] `tests/seeding/team-engagement.test.ts` — verifies 5 sections seeded with empty content
- [ ] `tests/seeding/architecture.test.ts` — verifies 2 tracks + 10 nodes seeded per project
- [ ] `tests/schema/project-dependencies.test.ts` — validates join table and FK constraints
- [ ] Mock setup for db.transaction in test environment (extend existing vitest mocks)

## Sources

### Primary (HIGH confidence)
- `bigpanda-app/db/schema.ts` — verified existing patterns (tasks.blocked_by self-FK, onboardingPhases display_order, pgEnum declarations)
- `bigpanda-app/db/migrations/0001_initial.sql` — verified enum creation pattern (DO blocks with EXCEPTION)
- `bigpanda-app/db/migrations/0002_add_task_deps.sql` — verified self-referencing FK migration syntax
- `bigpanda-app/db/migrations/0005_onboarding_dashboard.sql` — verified enum + table migration structure
- `bigpanda-app/app/api/projects/route.ts` — verified atomic seeding pattern (db.transaction with multiple inserts)
- `bigpanda-app/lib/queries.ts` — verified query function conventions (typed exports, eq/and/asc usage)
- `.planning/phases/45-database-schema-foundation/45-CONTEXT.md` — all user decisions and template structures

### Secondary (MEDIUM confidence)
- Project memory (bigpanda-app.md) — confirmed Drizzle ORM 0.45.1, PostgreSQL database, Vitest test framework
- Existing test patterns (`tests/ui/seed-project.test.ts`) — confirmed vitest mock setup for db operations

### Tertiary (LOW confidence)
- None — all research based on existing codebase patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, versions confirmed via package.json
- Architecture: HIGH — all patterns verified in existing codebase (schema.ts, route.ts, migrations)
- Pitfalls: HIGH — all pitfalls derived from existing code comments and migration history
- Validation: HIGH — vitest config and existing test patterns confirm approach

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days—stable domain, no breaking changes expected in Drizzle 0.45.x)
