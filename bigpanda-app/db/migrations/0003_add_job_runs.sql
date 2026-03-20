-- Migration: 0003_add_job_runs
-- Adds job_run_status enum and job_runs table for Phase 4 scheduled job tracking.

DO $$ BEGIN
  CREATE TYPE job_run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS job_runs (
  id            SERIAL PRIMARY KEY,
  job_name      TEXT NOT NULL,
  status        job_run_status NOT NULL DEFAULT 'pending',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  error_message TEXT,
  triggered_by  TEXT NOT NULL DEFAULT 'scheduled'
);

CREATE INDEX IF NOT EXISTS idx_job_runs_job_name ON job_runs (job_name);
CREATE INDEX IF NOT EXISTS idx_job_runs_started_at ON job_runs (started_at DESC);
