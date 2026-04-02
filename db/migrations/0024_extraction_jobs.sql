-- Migration 0024: Extraction Jobs table (Phase 31)
-- Creates extraction_jobs table for BullMQ document extraction queue

-- Idempotent enum creation
DO $$ BEGIN
  CREATE TYPE extraction_job_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Extraction jobs table (no RLS — internal job tracking table)
CREATE TABLE IF NOT EXISTS extraction_jobs (
  id                 SERIAL PRIMARY KEY,
  artifact_id        INTEGER NOT NULL REFERENCES artifacts(id),
  project_id         INTEGER NOT NULL REFERENCES projects(id),
  batch_id           TEXT NOT NULL,
  status             extraction_job_status NOT NULL DEFAULT 'pending',
  progress_pct       INTEGER NOT NULL DEFAULT 0,
  current_chunk      INTEGER NOT NULL DEFAULT 0,
  total_chunks       INTEGER NOT NULL DEFAULT 0,
  staged_items_json  JSONB,
  filtered_count     INTEGER NOT NULL DEFAULT 0,
  error_message      TEXT,
  created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_project_id ON extraction_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_batch_id ON extraction_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON extraction_jobs(status);
