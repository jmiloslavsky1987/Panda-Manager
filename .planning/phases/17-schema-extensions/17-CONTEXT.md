# Phase 17: Schema Extensions - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add all new v2.0 DB tables and extend three existing tables. No UI work. Every subsequent v2.0 phase (18–24) depends on this schema existing — this phase must land cleanly and completely before any other v2.0 phase begins.

**In scope:** CREATE TABLE statements for 8 new tables + ALTER TABLE for time_entries, artifacts, scheduled_jobs.
**Out of scope:** Any API routes, UI components, or data population — those belong in phases 18–24.

</domain>

<decisions>
## Implementation Decisions

### Migration structure
- Single migration file: `bigpanda-app/db/migrations/0006_v2_schema.sql`
- All additions are additive (CREATE TABLE + ALTER TABLE ADD COLUMN) — no data destruction
- Atomic: either the full migration lands or none of it does
- Drizzle schema.ts must also be updated with all new tables and column additions (same pattern as Phases 1–5)

### New table enums
- Use typed `pgEnum` for new status fields — consistent with existing `action_status`, `severity`, `project_status` pattern
- New enums needed:
  - `discovery_item_status`: `'pending' | 'approved' | 'dismissed'`
  - `ingestion_status`: `'pending' | 'extracting' | 'preview' | 'approved' | 'failed'`
  - `job_run_outcome`: `'success' | 'failure' | 'partial'`
  - `delivery_status`: `'live' | 'in_progress' | 'blocked' | 'planned'` (for business_outcomes)
  - `integration_track_status`: `'live' | 'in_progress' | 'pilot' | 'planned'` (for architecture_integrations, team_onboarding_status)

### Existing table extension defaults
- `time_entries` new columns: `submitted_on TIMESTAMP NULL`, `submitted_by TEXT NULL`, `approved_on TIMESTAMP NULL`, `approved_by TEXT NULL`, `rejected_on TIMESTAMP NULL`, `rejected_by TEXT NULL`, `locked BOOLEAN NOT NULL DEFAULT FALSE`
- `artifacts` new columns: `ingestion_status ingestion_status NULL` (NULL = not via ingestion pipeline; existing rows get NULL), `ingestion_log_json JSONB NULL`
- `scheduled_jobs` new columns: `last_run_outcome job_run_outcome NULL`, `run_history_json JSONB NOT NULL DEFAULT '[]'`, `timezone TEXT NULL`, `skill_params_json JSONB NOT NULL DEFAULT '{}'`

### audit_log user attribution
- Include `actor_id TEXT NULL` column now — stores `'system'` for automated mutations, `'admin'` for single-user actions until v2.1 auth adds real user IDs
- Do NOT add FK constraint to a users table (users table doesn't exist yet) — raw TEXT is sufficient until v2.1

### RLS on new tables
- All project-scoped tables (business_outcomes, e2e_workflows, workflow_steps, focus_areas, architecture_integrations, before_state, team_onboarding_status, discovery_items) get RLS via `app.current_project_id` — same pattern as existing tables
- `audit_log` does NOT get RLS — it's a system-wide table; when auth lands in v2.1, access will be controlled at the API layer
- Append-only trigger NOT needed on new tables — only engagement_history and key_decisions have this constraint (v1.0 design decision)

### Claude's Discretion
- Exact column ordering within new tables
- Whether to add CHECK constraints on text fields with known value sets (beyond enum columns)
- Index strategy for foreign keys and common query patterns (project_id lookups, status filters)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bigpanda-app/db/schema.ts`: All new tables and column additions go here using Drizzle ORM definitions — follow existing table structure exactly
- `bigpanda-app/db/migrations/0005_onboarding_dashboard.sql`: Most recent migration — use as the template for 0006 (CREATE TYPE enums first, then CREATE TABLE, then ALTER TABLE)
- `bigpanda-app/db/index.ts`: Singleton pool — no changes needed; new tables auto-available via Drizzle

### Established Patterns
- **Date fields**: Use `TEXT` not `TIMESTAMP`/`DATE` — source data may be 'TBD', '2026-Q3', etc. (Exception: system-generated timestamps like `created_at`, `updated_at`, `submitted_on` use proper `TIMESTAMP`)
- **`source` column**: All existing project-scoped tables have a `text('source').notNull()` column for tracing data origin — new tables that store user-created or ingested data should follow this pattern
- **`external_id`**: Actions, risks, milestones, artifacts use human-readable external IDs (A-KAISER-001). New tables don't need this — they use internal serial IDs only
- **Enums in SQL**: Must `CREATE TYPE` before `CREATE TABLE` that references it
- **RLS setup**: After CREATE TABLE, run `ALTER TABLE x ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` block

### Integration Points
- `bigpanda-app/db/schema.ts` — add all new Drizzle table exports here; downstream phases import from this file
- `bigpanda-app/db/migrations/` — add `0006_v2_schema.sql`; user runs `drizzle-kit migrate` or equivalent to apply
- `bigpanda-app/db/index.ts` — exports the `db` singleton; no changes needed for new tables

</code_context>

<specifics>
## Specific Ideas

No specific UI references — this is a pure schema phase.

Key field notes from requirements:
- `e2e_workflows` has a child table `workflow_steps` (workflow_id FK) with a `position` integer for ordering steps
- `discovery_items` needs a `source_url TEXT NULL` column for linking back to the originating Slack message, email thread, or Gong transcript
- `focus_areas` stores two owner fields: `bp_owner TEXT` and `customer_owner TEXT` — both nullable
- `team_onboarding_status` has 5 dimension columns (ingest_status, correlation_status, incident_intelligence_status, sn_automation_status, biggy_ai_status) — all use `integration_track_status` enum

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-schema-extensions*
*Context gathered: 2026-03-25*
