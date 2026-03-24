-- Phase 5.2: Time Tracking
-- Adds time_entries table for per-project time logging
--
-- Run manually with:
--   psql $DATABASE_URL -f bigpanda-app/db/migrations/0006_time_tracking.sql

CREATE TABLE time_entries (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  date        TEXT NOT NULL,          -- ISO: 'YYYY-MM-DD'
  hours       TEXT NOT NULL,          -- decimal string: '1.5'
  description TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
