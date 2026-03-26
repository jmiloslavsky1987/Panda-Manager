-- Phase 17: Schema Extensions (v2.0)
-- Adds 5 new enum types, 9 new tables, and extends time_entries + artifacts
-- Apply: psql $DATABASE_URL -f bigpanda-app/db/migrations/0011_v2_schema.sql

-- ============================================================
-- SECTION 1: New Enum Types (idempotent)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE discovery_item_status AS ENUM ('pending', 'approved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ingestion_status AS ENUM ('pending', 'extracting', 'preview', 'approved', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE job_run_outcome AS ENUM ('success', 'failure', 'partial');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('live', 'in_progress', 'blocked', 'planned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE integration_track_status AS ENUM ('live', 'in_progress', 'pilot', 'planned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- SECTION 2: New Tables (dependency order: parents before children)
-- ============================================================

-- SCHEMA-01: discovery_items
CREATE TABLE discovery_items (
  id               SERIAL PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES projects(id),
  source           TEXT NOT NULL DEFAULT 'manual',
  content          TEXT NOT NULL,
  suggested_field  TEXT,
  suggested_value  TEXT,
  status           discovery_item_status NOT NULL DEFAULT 'pending',
  scan_timestamp   TIMESTAMP,
  source_url       TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE discovery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON discovery_items;
CREATE POLICY project_isolation ON discovery_items
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- SCHEMA-02: audit_log (no RLS — system-wide table)
CREATE TABLE audit_log (
  id           SERIAL PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    INTEGER,
  action       TEXT NOT NULL,
  actor_id     TEXT,
  before_json  JSONB,
  after_json   JSONB,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- SCHEMA-06: business_outcomes
CREATE TABLE business_outcomes (
  id               SERIAL PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES projects(id),
  title            TEXT NOT NULL,
  track            TEXT NOT NULL,
  description      TEXT,
  delivery_status  delivery_status NOT NULL DEFAULT 'planned',
  mapping_note     TEXT,
  source           TEXT NOT NULL DEFAULT 'manual',
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE business_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_outcomes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON business_outcomes;
CREATE POLICY project_isolation ON business_outcomes
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- SCHEMA-07 parent: e2e_workflows
CREATE TABLE e2e_workflows (
  id             SERIAL PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id),
  team_name      TEXT NOT NULL,
  workflow_name  TEXT NOT NULL,
  source         TEXT NOT NULL DEFAULT 'manual',
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE e2e_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2e_workflows FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON e2e_workflows;
CREATE POLICY project_isolation ON e2e_workflows
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- SCHEMA-07 child: workflow_steps (after e2e_workflows — FK dependency)
CREATE TABLE workflow_steps (
  id           SERIAL PRIMARY KEY,
  workflow_id  INTEGER NOT NULL REFERENCES e2e_workflows(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  track        TEXT,
  status       TEXT,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON workflow_steps;
CREATE POLICY project_isolation ON workflow_steps
  USING (EXISTS (
    SELECT 1 FROM e2e_workflows w
    WHERE w.id = workflow_steps.workflow_id
      AND w.project_id = current_setting('app.current_project_id', true)::integer
  ));

-- SCHEMA-08: focus_areas
CREATE TABLE focus_areas (
  id               SERIAL PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES projects(id),
  title            TEXT NOT NULL,
  tracks           TEXT,
  why_it_matters   TEXT,
  current_status   TEXT,
  next_step        TEXT,
  bp_owner         TEXT,
  customer_owner   TEXT,
  source           TEXT NOT NULL DEFAULT 'manual',
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE focus_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_areas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON focus_areas;
CREATE POLICY project_isolation ON focus_areas
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- SCHEMA-09: architecture_integrations
CREATE TABLE architecture_integrations (
  id                  SERIAL PRIMARY KEY,
  project_id          INTEGER NOT NULL REFERENCES projects(id),
  tool_name           TEXT NOT NULL,
  track               TEXT NOT NULL,
  phase               TEXT,
  status              integration_track_status NOT NULL DEFAULT 'planned',
  integration_method  TEXT,
  notes               TEXT,
  source              TEXT NOT NULL DEFAULT 'manual',
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE architecture_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_integrations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON architecture_integrations;
CREATE POLICY project_isolation ON architecture_integrations
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- SCHEMA-10: before_state
CREATE TABLE before_state (
  id                       SERIAL PRIMARY KEY,
  project_id               INTEGER NOT NULL REFERENCES projects(id),
  aggregation_hub_name     TEXT,
  alert_to_ticket_problem  TEXT,
  pain_points_json         JSONB NOT NULL DEFAULT '[]',
  source                   TEXT NOT NULL DEFAULT 'manual',
  created_at               TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE before_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE before_state FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON before_state;
CREATE POLICY project_isolation ON before_state
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- SCHEMA-11: team_onboarding_status
CREATE TABLE team_onboarding_status (
  id                             SERIAL PRIMARY KEY,
  project_id                     INTEGER NOT NULL REFERENCES projects(id),
  team_name                      TEXT NOT NULL,
  track                          TEXT,
  ingest_status                  integration_track_status,
  correlation_status             integration_track_status,
  incident_intelligence_status   integration_track_status,
  sn_automation_status           integration_track_status,
  biggy_ai_status                integration_track_status,
  source                         TEXT NOT NULL DEFAULT 'manual',
  created_at                     TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE team_onboarding_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_onboarding_status FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON team_onboarding_status;
CREATE POLICY project_isolation ON team_onboarding_status
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- SCHEMA-05: scheduled_jobs (no RLS — global scheduler table, not project-scoped)
CREATE TABLE scheduled_jobs (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  skill_name          TEXT NOT NULL,
  cron_expression     TEXT NOT NULL,
  enabled             BOOLEAN NOT NULL DEFAULT TRUE,
  timezone            TEXT,
  skill_params_json   JSONB NOT NULL DEFAULT '{}',
  last_run_at         TIMESTAMP,
  last_run_outcome    job_run_outcome,
  run_history_json    JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 3: Existing Table Extensions
-- ============================================================

-- SCHEMA-03: time_entries — add 7 approval workflow columns
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS submitted_on   TIMESTAMP,
  ADD COLUMN IF NOT EXISTS submitted_by   TEXT,
  ADD COLUMN IF NOT EXISTS approved_on    TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approved_by    TEXT,
  ADD COLUMN IF NOT EXISTS rejected_on    TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_by    TEXT,
  ADD COLUMN IF NOT EXISTS locked         BOOLEAN NOT NULL DEFAULT FALSE;

-- SCHEMA-04: artifacts — add 2 ingestion pipeline columns
ALTER TABLE artifacts
  ADD COLUMN IF NOT EXISTS ingestion_status    ingestion_status,
  ADD COLUMN IF NOT EXISTS ingestion_log_json  JSONB;

-- ============================================================
-- SECTION 4: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_discovery_items_project_id            ON discovery_items(project_id);
CREATE INDEX IF NOT EXISTS idx_discovery_items_status                ON discovery_items(status);
CREATE INDEX IF NOT EXISTS idx_business_outcomes_project_id          ON business_outcomes(project_id);
CREATE INDEX IF NOT EXISTS idx_e2e_workflows_project_id              ON e2e_workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id            ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_focus_areas_project_id                ON focus_areas(project_id);
CREATE INDEX IF NOT EXISTS idx_architecture_integrations_project_id  ON architecture_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_before_state_project_id               ON before_state(project_id);
CREATE INDEX IF NOT EXISTS idx_team_onboarding_status_project_id     ON team_onboarding_status(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity                      ON audit_log(entity_type, entity_id);
