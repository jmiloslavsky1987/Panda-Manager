# Phase 17: Schema Extensions - Research

**Researched:** 2026-03-25
**Domain:** PostgreSQL schema migrations — Drizzle ORM + raw SQL DDL
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Migration structure**
- Single migration file: `bigpanda-app/db/migrations/0011_v2_schema.sql` (see note below)
- All additions are additive (CREATE TABLE + ALTER TABLE ADD COLUMN) — no data destruction
- Atomic: either the full migration lands or none of it does
- Drizzle schema.ts must also be updated with all new tables and column additions (same pattern as Phases 1–16)

**New table enums**
- Use typed `pgEnum` for new status fields — consistent with existing `action_status`, `severity`, `project_status` pattern
- New enums needed:
  - `discovery_item_status`: `'pending' | 'approved' | 'dismissed'`
  - `ingestion_status`: `'pending' | 'extracting' | 'preview' | 'approved' | 'failed'`
  - `job_run_outcome`: `'success' | 'failure' | 'partial'`
  - `delivery_status`: `'live' | 'in_progress' | 'blocked' | 'planned'`
  - `integration_track_status`: `'live' | 'in_progress' | 'pilot' | 'planned'`

**Existing table extensions**
- `time_entries` new columns: `submitted_on TIMESTAMP NULL`, `submitted_by TEXT NULL`, `approved_on TIMESTAMP NULL`, `approved_by TEXT NULL`, `rejected_on TIMESTAMP NULL`, `rejected_by TEXT NULL`, `locked BOOLEAN NOT NULL DEFAULT FALSE`
- `artifacts` new columns: `ingestion_status ingestion_status NULL`, `ingestion_log_json JSONB NULL`
- `scheduled_jobs` new columns: `last_run_outcome job_run_outcome NULL`, `run_history_json JSONB NOT NULL DEFAULT '[]'`, `timezone TEXT NULL`, `skill_params_json JSONB NOT NULL DEFAULT '{}'`

**audit_log user attribution**
- Include `actor_id TEXT NULL` column — stores `'system'` for automated mutations, `'admin'` for single-user actions
- NO FK constraint to a users table (doesn't exist yet)

**RLS on new tables**
- All project-scoped tables get RLS via `app.current_project_id` — same pattern as existing tables
- `audit_log` does NOT get RLS — system-wide table; access controlled at API layer
- Append-only trigger NOT needed on new tables

### Claude's Discretion
- Exact column ordering within new tables
- Whether to add CHECK constraints on text fields with known value sets (beyond enum columns)
- Index strategy for foreign keys and common query patterns (project_id lookups, status filters)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHEMA-01 | DB gains `discovery_items` table (id, project_id, source, content, suggested_field, suggested_value, status: pending/approved/dismissed, scan_timestamp, source_url) | Enum + table + RLS pattern documented below |
| SCHEMA-02 | DB gains `audit_log` table (id, entity_type, entity_id, action, actor_id, before_json, after_json, timestamp) | No-RLS system table pattern; JSONB columns |
| SCHEMA-03 | `time_entries` extended with submitted_on, submitted_by, approved_on, approved_by, rejected_on, rejected_by, locked (boolean) | ALTER TABLE ADD COLUMN IF NOT EXISTS pattern |
| SCHEMA-04 | `artifacts` table extended with ingestion_status (enum) and ingestion_log_json | Enum column on existing table; NULL default for backward compat |
| SCHEMA-05 | `scheduled_jobs` extended with last_run_outcome, run_history_json, timezone, skill_params_json | **scheduled_jobs table does not exist yet — must CREATE, then Phase 24 uses it** |
| SCHEMA-06 | DB gains `business_outcomes` table (id, project_id, title, track, description, delivery_status, mapping_note) | Enum + project-scoped + RLS |
| SCHEMA-07 | DB gains `e2e_workflows` + child `workflow_steps` tables | Parent/child FK with position integer for ordering |
| SCHEMA-08 | DB gains `focus_areas` table (id, project_id, title, tracks, why_it_matters, current_status, next_step, bp_owner, customer_owner) | project_id FK + RLS |
| SCHEMA-09 | DB gains `architecture_integrations` table (id, project_id, tool_name, track, phase, status, integration_method, notes) | `integration_track_status` enum; project_id FK + RLS |
| SCHEMA-10 | DB gains `before_state` table (id, project_id, aggregation_hub_name, alert_to_ticket_problem, pain_points_json) | JSONB column; project_id FK + RLS |
| SCHEMA-11 | DB gains `team_onboarding_status` table (id, project_id, team_name, track, ingest_status, correlation_status, incident_intelligence_status, sn_automation_status, biggy_ai_status) | Five `integration_track_status` enum columns |
</phase_requirements>

---

## Summary

Phase 17 is a pure database schema phase — no UI, no API routes. It consists of a single atomic SQL migration file plus parallel updates to `bigpanda-app/db/schema.ts`. All 11 requirements are DDL-only: 8 new tables (plus 5 new enums), ALTER TABLE extensions on 3 existing tables, and RLS policies on all project-scoped new tables.

The most important discovery from codebase inspection: **`scheduled_jobs` does not exist in the current database.** Requirements and planning docs refer to "extending" it, but there is no `scheduled_jobs` table in any migration (0001–0010) or in `schema.ts`. The v1.0 scheduler uses BullMQ (Redis) for job execution and only `job_runs` (a log table) in PostgreSQL. SCHEMA-05 therefore requires a full CREATE TABLE for `scheduled_jobs`, which Phase 24 (Scheduler Enhanced) will then populate via the Create Job wizard.

The second important discovery: the CONTEXT.md specifies file `0006_v2_schema.sql` but migration 0006 already exists (`0006_time_tracking.sql`). The correct filename is **`0011_v2_schema.sql`** — the next available number after `0010_analytics.sql`.

**Primary recommendation:** Write `0011_v2_schema.sql` as one atomic file: enums first, then CREATE TABLE for all 8 new tables, then ALTER TABLE for time_entries/artifacts, then CREATE TABLE for scheduled_jobs, then RLS blocks. Mirror every DDL addition in `schema.ts` using the same Drizzle patterns already established.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | already installed | Drizzle table/enum definitions in schema.ts | Project-established pattern — all 17 existing tables use it |
| drizzle-kit | already installed | Migration apply command | Project-established (`npx drizzle-kit migrate` or manual psql) |
| PostgreSQL | local install | Target database | Project-established; all migrations target psql |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| psql CLI | system | Manual migration apply fallback | Primary apply method per project pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single migration file | Multiple files (one per table) | Multiple files add rollback complexity; single atomic file matches all prior multi-table migrations (0001, 0005) |
| pgEnum | TEXT with CHECK constraint | pgEnum is project standard for status fields; CHECK constraints considered as optional supplement only |

**Installation:** None — all tooling already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
bigpanda-app/
├── db/
│   ├── migrations/
│   │   └── 0011_v2_schema.sql   # new migration file
│   └── schema.ts                 # updated with new tables + enums
```

### Pattern 1: Migration file structure (established by 0001, 0005)
**What:** SQL file with sections — enums first, then CREATE TABLE blocks, then ALTER TABLE blocks, then RLS blocks.
**When to use:** Always — every prior multi-table migration follows this order.
**Example (from 0005_onboarding_dashboard.sql):**
```sql
-- Enums first
CREATE TYPE onboarding_step_status AS ENUM ('not-started', 'in-progress', 'complete', 'blocked');

-- Tables next
CREATE TABLE onboarding_steps (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id),
  ...
);
```

### Pattern 2: Idempotent enum creation (from 0001_initial.sql, 0003_add_job_runs.sql)
**What:** Wrap `CREATE TYPE` in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;`
**When to use:** Any migration that adds a new enum — protects against double-apply.
```sql
DO $$ BEGIN
  CREATE TYPE discovery_item_status AS ENUM ('pending', 'approved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

### Pattern 3: ALTER TABLE ADD COLUMN IF NOT EXISTS (from 0008, 0010)
**What:** Use `ADD COLUMN IF NOT EXISTS` for all column extensions.
**When to use:** Any ALTER TABLE — idempotency on re-apply.
```sql
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS submitted_on  TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS submitted_by  TEXT NULL,
  ADD COLUMN IF NOT EXISTS locked        BOOLEAN NOT NULL DEFAULT FALSE;
```

### Pattern 4: RLS on project-scoped tables (from 0001_initial.sql)
**What:** ENABLE + FORCE ROW LEVEL SECURITY, DROP POLICY IF EXISTS, CREATE POLICY with `current_setting('app.current_project_id', true)::integer`.
**When to use:** Every new table with a `project_id` column.
```sql
ALTER TABLE discovery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON discovery_items;
CREATE POLICY project_isolation ON discovery_items
  USING (project_id = current_setting('app.current_project_id', true)::integer);
```

### Pattern 5: Drizzle schema.ts additions (from schema.ts)
**What:** Add `pgEnum` exports before the table that uses them; add `pgTable` export following existing column type conventions.
**When to use:** Every new table — schema.ts is the source of truth for TypeScript types.
```typescript
// Source: bigpanda-app/db/schema.ts existing pattern
export const discoveryItemStatusEnum = pgEnum('discovery_item_status', [
  'pending', 'approved', 'dismissed',
]);

export const discoveryItems = pgTable('discovery_items', {
  id:               serial('id').primaryKey(),
  project_id:       integer('project_id').notNull().references(() => projects.id),
  source:           text('source').notNull(),
  content:          text('content').notNull(),
  suggested_field:  text('suggested_field'),
  suggested_value:  text('suggested_value'),
  status:           discoveryItemStatusEnum('status').default('pending').notNull(),
  scan_timestamp:   timestamp('scan_timestamp'),
  source_url:       text('source_url'),
  created_at:       timestamp('created_at').defaultNow().notNull(),
});
```

### Pattern 6: JSONB columns (from schema.ts — outputs, onboarding_steps)
**What:** Use `jsonb('column_name')` in Drizzle; `JSONB` in SQL. Use `.default('[]')` or `.default('{}')` for non-null JSONB.
```typescript
// non-null with default
run_history_json: jsonb('run_history_json').default([]).notNull(),
skill_params_json: jsonb('skill_params_json').default({}).notNull(),
// nullable
ingestion_log_json: jsonb('ingestion_log_json'),
```

### Anti-Patterns to Avoid
- **Using TIMESTAMP for date fields that could be fuzzy:** All existing date fields in domain tables are TEXT. Exception: `created_at`, `updated_at`, and the new submission/approval timestamp columns on time_entries — these are system-generated and safe as TIMESTAMP.
- **Omitting `IF NOT EXISTS` from ALTER TABLE ADD COLUMN:** Migration rollback and re-apply will fail on duplicate column error.
- **Adding RLS to audit_log:** Decided against — it is a system-wide table, access controlled at API layer.
- **Using the wrong migration filename:** `0006_v2_schema.sql` is already taken by `0006_time_tracking.sql`. File must be `0011_v2_schema.sql`.
- **Extending scheduled_jobs with ALTER TABLE:** The table does not exist; it must be CREATE TABLE.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotent enum creation | Custom IF NOT EXISTS workaround | `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object ...` | Established PostgreSQL pattern; already used in 0001 and 0003 |
| TypeScript types for new tables | Manual type definitions | `typeof newTable.$inferSelect` / `$inferInsert` | Drizzle generates correct types from schema definition |
| Migration apply mechanism | Custom apply script | `psql $DATABASE_URL -f bigpanda-app/db/migrations/0011_v2_schema.sql` | Project-established pattern per 0001 header comment |

**Key insight:** This phase is pure DDL. No new npm packages, no new application logic. The only non-trivial decisions are column definitions and RLS policy wording — both follow locked patterns already established in the codebase.

---

## Common Pitfalls

### Pitfall 1: Wrong migration file number
**What goes wrong:** File named `0006_v2_schema.sql` per CONTEXT.md conflicts with existing `0006_time_tracking.sql`.
**Why it happens:** CONTEXT.md was written before verifying the actual migration sequence; phases 5.2–14 added migrations 0006–0010 after the v2.0 plan was drafted.
**How to avoid:** Use `0011_v2_schema.sql` — the next available number after `0010_analytics.sql`.
**Warning signs:** `psql` error `relation already exists` or Drizzle conflict on migration hash.

### Pitfall 2: ALTER TABLE on non-existent scheduled_jobs
**What goes wrong:** SCHEMA-05 says "extend scheduled_jobs" but no `scheduled_jobs` table exists in the DB.
**Why it happens:** Planning docs assumed the table existed; v1.0 scheduler used BullMQ + Redis, not a PostgreSQL `scheduled_jobs` table.
**How to avoid:** Create `scheduled_jobs` via `CREATE TABLE IF NOT EXISTS` with all columns (id, name, skill_name, cron_expression, timezone, skill_params_json, enabled, last_run_at, last_run_outcome, run_history_json, created_at) in one go. The `last_run_outcome`, `run_history_json`, `timezone`, `skill_params_json` columns are included at table creation, not added later.
**Warning signs:** `ALTER TABLE scheduled_jobs ADD COLUMN` will error with `relation "scheduled_jobs" does not exist`.

### Pitfall 3: Enum column on existing table — NULL default requirement
**What goes wrong:** Adding `ingestion_status ingestion_status NOT NULL` to `artifacts` fails because existing rows have no value.
**Why it happens:** PostgreSQL cannot backfill a NOT NULL enum column without a DEFAULT on existing rows.
**How to avoid:** Declare `ingestion_status ingestion_status NULL` (nullable). CONTEXT.md already specifies NULL; the semantic meaning is "not via ingestion pipeline."
**Warning signs:** `ERROR: column "ingestion_status" contains null values` when applying migration.

### Pitfall 4: Missing FORCE ROW LEVEL SECURITY
**What goes wrong:** RLS is enabled but superuser bypass is possible in test context.
**Why it happens:** `ENABLE ROW LEVEL SECURITY` alone doesn't apply to table owners with superuser privileges.
**How to avoid:** Always pair with `FORCE ROW LEVEL SECURITY` per project convention (established in 0001 and STATE.md decision `[2026-03-19] 01-02`).
**Warning signs:** Tests pass for non-superuser but fail for superuser connections; cross-project data leaks in test suite.

### Pitfall 5: CREATE TYPE order in migration
**What goes wrong:** A `CREATE TABLE` referencing an enum fails because the enum type doesn't exist yet.
**Why it happens:** SQL executes sequentially; forward references fail.
**How to avoid:** All `CREATE TYPE` / `DO $$ BEGIN CREATE TYPE ... END $$` blocks must appear before any `CREATE TABLE` that references them. In this migration: 5 new enum types must precede the 8 new table definitions.
**Warning signs:** `ERROR: type "discovery_item_status" does not exist`.

### Pitfall 6: workflow_steps references e2e_workflows — ordering matters
**What goes wrong:** `workflow_steps` FK to `e2e_workflows(id)` fails if `workflow_steps` is defined first.
**Why it happens:** FK target table must exist when the referencing table is created.
**How to avoid:** `e2e_workflows` must be created before `workflow_steps` in the migration file.

---

## Code Examples

Verified patterns from existing codebase:

### Full RLS block (from 0001_initial.sql)
```sql
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON actions;
CREATE POLICY project_isolation ON actions
  USING (project_id = current_setting('app.current_project_id', true)::integer);
```

### Multi-column ALTER TABLE (from 0008_fts_and_kb.sql)
```sql
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS linked_risk_id    INTEGER REFERENCES risks(id),
  ADD COLUMN IF NOT EXISTS linked_history_id INTEGER REFERENCES engagement_history(id),
  ADD COLUMN IF NOT EXISTS linked_date       TEXT;
```

### Drizzle pgEnum + pgTable with enum column (from schema.ts)
```typescript
export const onboardingStepStatusEnum = pgEnum('onboarding_step_status', [
  'not-started', 'in-progress', 'complete', 'blocked',
]);

export const onboardingSteps = pgTable('onboarding_steps', {
  id:       serial('id').primaryKey(),
  phase_id: integer('phase_id').notNull().references(() => onboardingPhases.id),
  status:   onboardingStepStatusEnum('status').default('not-started').notNull(),
  updates:  jsonb('updates').default([]).notNull(),
  ...
});
```

### Parent/child table FK pattern (from schema.ts — tasks self-ref, skill_run_chunks)
```typescript
export const skillRunChunks = pgTable('skill_run_chunks', {
  id:     serial('id').primaryKey(),
  run_id: integer('run_id').notNull().references(() => skillRuns.id, { onDelete: 'cascade' }),
  seq:    integer('seq').notNull(),
  ...
});
```
```sql
-- SQL equivalent
CREATE TABLE workflow_steps (
  id          SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES e2e_workflows(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  label       TEXT NOT NULL,
  track       TEXT,
  status      TEXT
);
```

### Drizzle column extensions on existing table (pattern from schema.ts `timeEntries`)
```typescript
// In schema.ts, add to existing timeEntries table definition:
submitted_on:  timestamp('submitted_on'),
submitted_by:  text('submitted_by'),
approved_on:   timestamp('approved_on'),
approved_by:   text('approved_by'),
rejected_on:   timestamp('rejected_on'),
rejected_by:   text('rejected_by'),
locked:        boolean('locked').default(false).notNull(),
```

---

## Complete Table Inventory for 0011_v2_schema.sql

### New Enums (5)
1. `discovery_item_status`: `'pending' | 'approved' | 'dismissed'`
2. `ingestion_status`: `'pending' | 'extracting' | 'preview' | 'approved' | 'failed'`
3. `job_run_outcome`: `'success' | 'failure' | 'partial'`
4. `delivery_status`: `'live' | 'in_progress' | 'blocked' | 'planned'`
5. `integration_track_status`: `'live' | 'in_progress' | 'pilot' | 'planned'`

### New Tables (9 — 8 domain + scheduled_jobs)
1. **discovery_items** — project_id FK, source, content, suggested_field, suggested_value, status (discovery_item_status), scan_timestamp, source_url, created_at → RLS
2. **audit_log** — entity_type, entity_id, action, actor_id, before_json (JSONB), after_json (JSONB), timestamp, created_at → NO RLS
3. **business_outcomes** — project_id FK, title, track, description, delivery_status, mapping_note, source, created_at → RLS
4. **e2e_workflows** — project_id FK, team_name, workflow_name, source, created_at → RLS
5. **workflow_steps** — workflow_id FK (e2e_workflows), label, track, status, position, created_at → NO project_id (inherits isolation via workflow_id); consider policy on join or omit RLS
6. **focus_areas** — project_id FK, title, tracks, why_it_matters, current_status, next_step, bp_owner, customer_owner, source, created_at → RLS
7. **architecture_integrations** — project_id FK, tool_name, track, phase, status (integration_track_status), integration_method, notes, source, created_at → RLS
8. **before_state** — project_id FK, aggregation_hub_name, alert_to_ticket_problem, pain_points_json (JSONB), source, created_at → RLS
9. **team_onboarding_status** — project_id FK, team_name, track, ingest_status, correlation_status, incident_intelligence_status, sn_automation_status, biggy_ai_status (all integration_track_status), source, created_at → RLS
10. **scheduled_jobs** — name, skill_name, cron_expression, enabled (BOOLEAN DEFAULT TRUE), timezone, skill_params_json (JSONB DEFAULT '{}'), last_run_at (TIMESTAMP NULL), last_run_outcome (job_run_outcome NULL), run_history_json (JSONB DEFAULT '[]'), created_at, updated_at → NO project_id (global scheduler table); NO RLS

### Existing Tables Extended (3 via ALTER TABLE)
- **time_entries**: +submitted_on, +submitted_by, +approved_on, +approved_by, +rejected_on, +rejected_by, +locked
- **artifacts**: +ingestion_status (NULL), +ingestion_log_json (JSONB NULL)
- (scheduled_jobs is CREATE, not ALTER — see above)

### Note on workflow_steps RLS
`workflow_steps` has no direct `project_id` column — isolation is inherited through `workflow_id → e2e_workflows.project_id`. Options:
1. Add no RLS to workflow_steps — simplest; isolation relies on application joining through e2e_workflows
2. Add RLS via subquery: `USING (EXISTS (SELECT 1 FROM e2e_workflows WHERE e2e_workflows.id = workflow_steps.workflow_id AND e2e_workflows.project_id = current_setting('app.current_project_id', true)::integer))`

Recommend option 2 for consistency with the rest of the schema (defense in depth), but the planner should make the final call.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual CREATE TYPE per migration | `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object ...` | Phase 1 | Idempotent migrations |
| Implicit RLS (ENABLE only) | ENABLE + FORCE ROW LEVEL SECURITY | Phase 1 | Superuser test coverage |
| Single-column ALTER TABLE | Multi-column ALTER TABLE in one statement | Phase 8 | Cleaner migrations |

---

## Open Questions

1. **workflow_steps RLS strategy**
   - What we know: No direct project_id column; isolation via workflow_id FK
   - What's unclear: Should Phase 17 add a subquery RLS policy or rely on application-layer join isolation?
   - Recommendation: Include subquery RLS policy (defense in depth) — stated in Table Inventory above as option 2. Planner can choose either.

2. **scheduled_jobs — column set for initial creation**
   - What we know: SCHEMA-05 specifies 4 columns (last_run_outcome, run_history_json, timezone, skill_params_json). Phase 24 will use the full table.
   - What's unclear: What additional columns does Phase 24 need (job name, cron expression, enabled flag)?
   - Recommendation: Create the full table now with all reasonably anticipated columns (name, skill_name, cron_expression, enabled, timezone, skill_params_json, last_run_at, last_run_outcome, run_history_json, created_at, updated_at). This satisfies SCHEMA-05 and avoids another ALTER TABLE in Phase 24.

3. **source column on all new tables**
   - What we know: All existing project-scoped tables have `source TEXT NOT NULL`.
   - What's unclear: CONTEXT.md specifics and REQUIREMENTS.md column specs don't mention `source` on new v2.0 tables.
   - Recommendation: Add `source TEXT NOT NULL` to all new project-scoped tables (discovery_items, business_outcomes, e2e_workflows, focus_areas, architecture_integrations, before_state, team_onboarding_status) per established convention. `audit_log` and `scheduled_jobs` are not project-scoped and don't need it.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts present, environment: node) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run tests/` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map

Schema migrations are DDL-only — there is no TypeScript source code to unit-test. Validation is structural (DB introspection) or insert-based smoke tests.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHEMA-01 | discovery_items table accepts inserts with all 3 status values | DB smoke | `psql $DATABASE_URL -c "SELECT * FROM discovery_items LIMIT 1"` after seed | ❌ Wave 0 |
| SCHEMA-02 | audit_log table accepts inserts with JSONB before/after | DB smoke | `psql $DATABASE_URL -c "SELECT * FROM audit_log LIMIT 1"` after seed | ❌ Wave 0 |
| SCHEMA-03 | time_entries rows have all 7 new columns | DB introspect | `psql $DATABASE_URL -c "\d time_entries"` | ❌ Wave 0 |
| SCHEMA-04 | artifacts rows have ingestion_status and ingestion_log_json | DB introspect | `psql $DATABASE_URL -c "\d artifacts"` | ❌ Wave 0 |
| SCHEMA-05 | scheduled_jobs table has all 4 specified columns + is creatable | DB introspect | `psql $DATABASE_URL -c "\d scheduled_jobs"` | ❌ Wave 0 |
| SCHEMA-06 | business_outcomes accepts seed rows scoped to project_id | DB smoke | Insert + SELECT under RLS | ❌ Wave 0 |
| SCHEMA-07 | e2e_workflows + workflow_steps accept seed rows; workflow_steps ordered by position | DB smoke | Insert parent + child rows | ❌ Wave 0 |
| SCHEMA-08 | focus_areas accepts seed rows with bp_owner/customer_owner | DB smoke | Insert + SELECT | ❌ Wave 0 |
| SCHEMA-09 | architecture_integrations accepts seed rows with integration_track_status enum | DB smoke | Insert + SELECT | ❌ Wave 0 |
| SCHEMA-10 | before_state accepts seed rows with JSONB pain_points_json | DB smoke | Insert + SELECT | ❌ Wave 0 |
| SCHEMA-11 | team_onboarding_status accepts seed rows with all 5 dimension columns | DB smoke | Insert + SELECT | ❌ Wave 0 |

**Note:** Verification for this phase is primarily manual DB introspection and seed-row insertion. A Vitest test can validate Drizzle schema.ts exports (that table exports are defined), which is the automatable portion.

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run tests/`
- **Per wave merge:** Full Vitest suite + psql column introspection checks
- **Phase gate:** All new tables visible in `\dt` + all column checks pass + seed inserts succeed without FK violations

### Wave 0 Gaps
- [ ] `bigpanda-app/tests/schema-v2.test.ts` — Vitest test verifying Drizzle schema.ts exports new table names (discoveryItems, auditLog, businessOutcomes, e2eWorkflows, workflowSteps, focusAreas, architectureIntegrations, beforeState, teamOnboardingStatus, scheduledJobs) and enum exports
- [ ] Seed SQL snippet in plan for smoke-testing all new tables (not a test file — inline psql commands in verification steps)

---

## Sources

### Primary (HIGH confidence)
- `bigpanda-app/db/schema.ts` — direct read; all existing table/enum patterns
- `bigpanda-app/db/migrations/0001_initial.sql` — direct read; RLS pattern, enum idempotency pattern
- `bigpanda-app/db/migrations/0003_add_job_runs.sql` — direct read; enum creation pattern
- `bigpanda-app/db/migrations/0005_onboarding_dashboard.sql` — direct read; template for new migration structure
- `bigpanda-app/db/migrations/0006_time_tracking.sql` — direct read; confirms 0006 is taken
- `bigpanda-app/db/migrations/0008_fts_and_kb.sql` — direct read; multi-column ALTER TABLE pattern
- `bigpanda-app/db/migrations/0010_analytics.sql` — direct read; confirms last migration is 0010
- `bigpanda-app/worker/scheduler.ts` — direct read; confirms no `scheduled_jobs` PostgreSQL table exists

### Secondary (MEDIUM confidence)
- `.planning/phases/17-schema-extensions/17-CONTEXT.md` — direct read; locked decisions
- `.planning/REQUIREMENTS.md` — direct read; SCHEMA-01 through SCHEMA-11 column specs

### Tertiary (LOW confidence)
- None — all findings verified against codebase directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling inspected directly in codebase
- Architecture: HIGH — migration patterns read from actual migration files
- Pitfalls: HIGH — `scheduled_jobs` absence and wrong file number verified by direct file inspection
- Column specifications: HIGH — from locked CONTEXT.md decisions

**Research date:** 2026-03-25
**Valid until:** Stable until codebase migration sequence changes (no expiry concern for this project)
