-- Phase 32: Time Tracking Global View
-- Adds user_id column to time_entries for multi-user filtering
--
-- Background: time_entries was created in Phase 5.2 (v1.0) before multi-user auth
-- was added in Phase 26 (v3.0). This migration adds user scoping to support
-- the global time tracking view where users should only see their own entries.
--
-- Run manually with:
--   psql $DATABASE_URL -f bigpanda-app/db/migrations/0025_time_entries_user_id.sql

ALTER TABLE time_entries
ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default';

-- Create index for user filtering performance
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);

-- Create composite index for common query pattern (user + project + date range)
CREATE INDEX idx_time_entries_user_project_date ON time_entries(user_id, project_id, date DESC);
