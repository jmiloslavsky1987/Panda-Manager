-- ============================================================================
-- Migration: 0001_initial.sql
-- Phase 1, Plan 02: Bootstrap all 13 domain tables
--
-- This file contains:
--   1. Drizzle-compatible DDL for all 13 tables (4 enums + 13 tables)
--   2. MANUAL: append-only triggers added below drizzle-kit output
--   3. MANUAL: RLS policies for project-scoped tables
--
-- Apply with: cd bigpanda-app && npx drizzle-kit migrate
-- Or manually: psql $DATABASE_URL -f db/migrations/0001_initial.sql
-- ============================================================================

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "project_status" AS ENUM('active', 'archived', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "action_status" AS ENUM('open', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "severity" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "output_status" AS ENUM('running', 'complete', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Table 1: projects ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "projects" (
  "id"             SERIAL PRIMARY KEY,
  "name"           TEXT NOT NULL,
  "customer"       TEXT NOT NULL,
  "status"         "project_status" NOT NULL DEFAULT 'active',
  "overall_status" TEXT,
  "status_summary" TEXT,
  "go_live_target" TEXT,
  "last_updated"   TEXT,
  "source_file"    TEXT,
  "created_at"     TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at"     TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Table 2: workstreams ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "workstreams" (
  "id"             SERIAL PRIMARY KEY,
  "project_id"     INTEGER NOT NULL REFERENCES "projects"("id"),
  "name"           TEXT NOT NULL,
  "track"          TEXT,
  "current_status" TEXT,
  "lead"           TEXT,
  "last_updated"   TEXT,
  "state"          TEXT,
  "source"         TEXT NOT NULL,
  "created_at"     TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Table 3: actions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "actions" (
  "id"           SERIAL PRIMARY KEY,
  "project_id"   INTEGER NOT NULL REFERENCES "projects"("id"),
  "external_id"  TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "owner"        TEXT,
  "due"          TEXT,
  "status"       "action_status" NOT NULL DEFAULT 'open',
  "last_updated" TEXT,
  "notes"        TEXT,
  "type"         TEXT NOT NULL DEFAULT 'action',
  "source"       TEXT NOT NULL,
  "created_at"   TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Table 4: risks ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "risks" (
  "id"           SERIAL PRIMARY KEY,
  "project_id"   INTEGER NOT NULL REFERENCES "projects"("id"),
  "external_id"  TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "severity"     "severity",
  "owner"        TEXT,
  "mitigation"   TEXT,
  "status"       TEXT,
  "last_updated" TEXT,
  "source"       TEXT NOT NULL,
  "created_at"   TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Table 5: milestones ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "milestones" (
  "id"          SERIAL PRIMARY KEY,
  "project_id"  INTEGER NOT NULL REFERENCES "projects"("id"),
  "external_id" TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "status"      TEXT,
  "target"      TEXT,
  "date"        TEXT,
  "notes"       TEXT,
  "owner"       TEXT,
  "source"      TEXT NOT NULL,
  "created_at"  TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Table 6: artifacts ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "artifacts" (
  "id"          SERIAL PRIMARY KEY,
  "project_id"  INTEGER NOT NULL REFERENCES "projects"("id"),
  "external_id" TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "status"      TEXT,
  "owner"       TEXT,
  "source"      TEXT NOT NULL,
  "created_at"  TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Table 7: engagement_history — APPEND ONLY ───────────────────────────────

CREATE TABLE IF NOT EXISTS "engagement_history" (
  "id"         SERIAL PRIMARY KEY,
  "project_id" INTEGER NOT NULL REFERENCES "projects"("id"),
  "date"       TEXT,
  "content"    TEXT NOT NULL,
  "source"     TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Table 8: key_decisions — APPEND ONLY ────────────────────────────────────

CREATE TABLE IF NOT EXISTS "key_decisions" (
  "id"         SERIAL PRIMARY KEY,
  "project_id" INTEGER NOT NULL REFERENCES "projects"("id"),
  "date"       TEXT,
  "decision"   TEXT NOT NULL,
  "context"    TEXT,
  "source"     TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Table 9: stakeholders ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "stakeholders" (
  "id"         SERIAL PRIMARY KEY,
  "project_id" INTEGER NOT NULL REFERENCES "projects"("id"),
  "name"       TEXT NOT NULL,
  "role"       TEXT,
  "company"    TEXT,
  "email"      TEXT,
  "slack_id"   TEXT,
  "notes"      TEXT,
  "source"     TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Table 10: tasks ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tasks" (
  "id"            SERIAL PRIMARY KEY,
  "project_id"    INTEGER NOT NULL REFERENCES "projects"("id"),
  "title"         TEXT NOT NULL,
  "description"   TEXT,
  "owner"         TEXT,
  "due"           TEXT,
  "priority"      TEXT,
  "type"          TEXT,
  "phase"         TEXT,
  "workstream_id" INTEGER REFERENCES "workstreams"("id"),
  "status"        TEXT NOT NULL DEFAULT 'todo',
  "source"        TEXT,
  "created_at"    TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Table 11: outputs ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "outputs" (
  "id"               SERIAL PRIMARY KEY,
  "project_id"       INTEGER REFERENCES "projects"("id"),
  "skill_name"       TEXT NOT NULL,
  "idempotency_key"  TEXT NOT NULL UNIQUE,
  "status"           "output_status" NOT NULL DEFAULT 'running',
  "content"          TEXT,
  "filename"         TEXT,
  "filepath"         TEXT,
  "created_at"       TIMESTAMP DEFAULT NOW() NOT NULL,
  "completed_at"     TIMESTAMP
);

-- ─── Table 12: plan_templates ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "plan_templates" (
  "id"            SERIAL PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "template_type" TEXT,
  "data"          TEXT,
  "created_at"    TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Table 13: knowledge_base — scaffolded for Phase 8 ───────────────────────

CREATE TABLE IF NOT EXISTS "knowledge_base" (
  "id"           SERIAL PRIMARY KEY,
  "project_id"   INTEGER REFERENCES "projects"("id"),
  "title"        TEXT NOT NULL,
  "content"      TEXT NOT NULL,
  "source_trace" TEXT,
  "created_at"   TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Drizzle migrations journal table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
  "id"         SERIAL PRIMARY KEY,
  "hash"       TEXT NOT NULL,
  "created_at" BIGINT
);

-- ============================================================================
-- MANUAL: append-only triggers and RLS added below drizzle-kit output
-- ============================================================================

-- ─── Append-Only Trigger Function ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only: UPDATE and DELETE are prohibited. Entry ID: %',
    TG_TABLE_NAME, OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ─── Append-Only Triggers ────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS engagement_history_append_only ON engagement_history;
CREATE TRIGGER engagement_history_append_only
  BEFORE UPDATE OR DELETE ON engagement_history
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();

DROP TRIGGER IF EXISTS key_decisions_append_only ON key_decisions;
CREATE TRIGGER key_decisions_append_only
  BEFORE UPDATE OR DELETE ON key_decisions
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Single-user local app: project isolation via session variable app.current_project_id
-- FORCE ROW LEVEL SECURITY ensures even the table owner (superuser) is subject to RLS
-- in test contexts.

-- actions
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON actions;
CREATE POLICY project_isolation ON actions
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- risks
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON risks;
CREATE POLICY project_isolation ON risks
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- milestones
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON milestones;
CREATE POLICY project_isolation ON milestones
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- engagement_history
ALTER TABLE engagement_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON engagement_history;
CREATE POLICY project_isolation ON engagement_history
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- key_decisions
ALTER TABLE key_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_decisions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON key_decisions;
CREATE POLICY project_isolation ON key_decisions
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- stakeholders
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON stakeholders;
CREATE POLICY project_isolation ON stakeholders
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- artifacts
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON artifacts;
CREATE POLICY project_isolation ON artifacts
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- outputs (project_id nullable — cross-project outputs bypass RLS check when project_id IS NULL)
ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outputs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON outputs;
CREATE POLICY project_isolation ON outputs
  USING (
    project_id IS NULL
    OR project_id = current_setting('app.current_project_id', true)::integer
  );

-- Note: projects, workstreams, tasks, plan_templates, knowledge_base do NOT have RLS
-- policies here. They are accessed via app logic or Phase 8 will configure knowledge_base.
