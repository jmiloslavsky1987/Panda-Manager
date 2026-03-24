-- Migration 0007: Add sprint summary columns to projects table
-- Written manually — drizzle-kit generate not available (Phase 03-02 decision)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS sprint_summary TEXT,
  ADD COLUMN IF NOT EXISTS sprint_summary_at TIMESTAMPTZ;
