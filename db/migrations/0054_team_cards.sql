-- Migration 0054: Team Cards + Key Metrics + outcomeAchievementStatusEnum + milestones.linked_track
-- Phase 88.1 Teams Tab Redesign. ADDITIVE only — no DROP, no DELETE, preserves all existing data.
-- Idempotent — safe to re-run (IF NOT EXISTS guards; DO block for enum; ADD COLUMN IF NOT EXISTS).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outcome_achievement_status') THEN
    CREATE TYPE outcome_achievement_status AS ENUM (
      'not_started', 'in_progress', 'partially_achieved', 'achieved', 'blocked'
    );
  END IF;
END $$;

ALTER TABLE business_outcomes
  ADD COLUMN IF NOT EXISTS achievement_status outcome_achievement_status NOT NULL DEFAULT 'not_started';

UPDATE business_outcomes
SET achievement_status = CASE delivery_status
  WHEN 'live' THEN 'achieved'::outcome_achievement_status
  WHEN 'in_progress' THEN 'in_progress'::outcome_achievement_status
  WHEN 'blocked' THEN 'blocked'::outcome_achievement_status
  WHEN 'planned' THEN 'not_started'::outcome_achievement_status
  ELSE 'not_started'::outcome_achievement_status
END
WHERE achievement_status = 'not_started'
  AND delivery_status != 'planned';

CREATE TABLE IF NOT EXISTS team_cards (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  success_definition TEXT,
  overall_status TEXT NOT NULL DEFAULT 'not_started',
  latest_activity_date TEXT,
  latest_activity_text TEXT,
  latest_activity_source TEXT,
  next_milestone_id INTEGER REFERENCES milestones(id) ON DELETE SET NULL,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  CONSTRAINT team_cards_project_team_unique UNIQUE (project_id, team_name),
  CONSTRAINT team_cards_overall_status_check
    CHECK (overall_status IN ('on_track', 'at_risk', 'blocked', 'not_started')),
  CONSTRAINT team_cards_latest_activity_source_check
    CHECK (latest_activity_source IS NULL OR latest_activity_source IN ('manual', 'context_upload'))
);

CREATE INDEX IF NOT EXISTS team_cards_project_idx ON team_cards(project_id);

CREATE TABLE IF NOT EXISTS team_card_key_metrics (
  id SERIAL PRIMARY KEY,
  team_card_id INTEGER NOT NULL REFERENCES team_cards(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  target TEXT,
  current TEXT,
  trend TEXT,
  display_order INTEGER DEFAULT 0 NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  CONSTRAINT team_card_key_metrics_trend_check
    CHECK (trend IS NULL OR trend IN ('up', 'down', 'flat')),
  CONSTRAINT team_card_key_metrics_source_check
    CHECK (source IN ('manual', 'context_upload'))
);

CREATE INDEX IF NOT EXISTS team_card_key_metrics_card_idx ON team_card_key_metrics(team_card_id);

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS linked_track TEXT;
