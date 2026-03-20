-- Migration 0004: Skill Engine tables (Phase 5)
-- Run: cd bigpanda-app && DATABASE_URL=postgresql://localhost:5432/bigpanda_app npx drizzle-kit migrate

CREATE TYPE skill_run_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE draft_status AS ENUM ('pending', 'dismissed', 'sent');

CREATE TABLE skill_runs (
  id          SERIAL PRIMARY KEY,
  run_id      TEXT NOT NULL UNIQUE,
  project_id  INTEGER REFERENCES projects(id),
  skill_name  TEXT NOT NULL,
  status      skill_run_status NOT NULL DEFAULT 'pending',
  input       TEXT,
  full_output TEXT,
  error_message TEXT,
  started_at  TIMESTAMP,
  completed_at TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE skill_run_chunks (
  id      SERIAL PRIMARY KEY,
  run_id  INTEGER NOT NULL REFERENCES skill_runs(id) ON DELETE CASCADE,
  seq     INTEGER NOT NULL,
  chunk   TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(run_id, seq)
);
CREATE INDEX idx_skill_run_chunks_run_seq ON skill_run_chunks(run_id, seq);

CREATE TABLE drafts (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER REFERENCES projects(id),
  run_id      INTEGER REFERENCES skill_runs(id),
  draft_type  TEXT NOT NULL,
  recipient   TEXT,
  subject     TEXT,
  content     TEXT NOT NULL,
  status      draft_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Outputs archived column (needed for OUT-04 regenerate)
ALTER TABLE outputs ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
