-- Migration 0028: WBS, Team Engagement, and Architecture Schema
-- Phase 45 Plan 01 — Database Schema Foundation
-- Creates: wbs_items, wbs_task_assignments, team_engagement_sections,
--          arch_tracks, arch_nodes, arch_team_status, project_dependencies
-- Also adds: exec_action_required column to projects table

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "wbs_item_status" AS ENUM('not_started', 'in_progress', 'complete');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "arch_node_status" AS ENUM('planned', 'in_progress', 'live');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── Alter Existing Tables ───────────────────────────────────────────────────

ALTER TABLE projects ADD COLUMN IF NOT EXISTS exec_action_required BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── WBS Items ───────────────────────────────────────────────────────────────

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

-- ─── WBS Task Assignments ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wbs_task_assignments (
  id SERIAL PRIMARY KEY,
  wbs_item_id INTEGER NOT NULL REFERENCES wbs_items(id),
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Team Engagement Sections ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_engagement_sections (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  source_trace TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Architecture Tracks ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arch_tracks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Architecture Nodes ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arch_nodes (
  id SERIAL PRIMARY KEY,
  track_id INTEGER NOT NULL REFERENCES arch_tracks(id),
  project_id INTEGER NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  status arch_node_status NOT NULL DEFAULT 'planned',
  notes TEXT,
  source_trace TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Architecture Team Status ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arch_team_status (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  team_name TEXT NOT NULL,
  capability_stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Project Dependencies ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_dependencies (
  id SERIAL PRIMARY KEY,
  source_project_id INTEGER NOT NULL REFERENCES projects(id),
  depends_on_project_id INTEGER NOT NULL REFERENCES projects(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_wbs_items_project_track ON wbs_items(project_id, track);
CREATE INDEX IF NOT EXISTS idx_wbs_items_parent ON wbs_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_team_engagement_project ON team_engagement_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_arch_nodes_track ON arch_nodes(track_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_deps ON project_dependencies(source_project_id);
