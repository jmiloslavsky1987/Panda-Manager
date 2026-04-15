-- Migration: 0034_scheduled_jobs_project_id
-- Phase: 65-01 (Project-Scoped Scheduling)
-- Purpose: Add nullable project_id FK to scheduled_jobs table
--          Enables filtering jobs by project (NULL = global jobs)

ALTER TABLE "scheduled_jobs"
  ADD COLUMN "project_id" integer REFERENCES "projects"("id") ON DELETE SET NULL;

-- Note: Existing jobs automatically get project_id = NULL (become global jobs)
-- No backfill needed - nullable column with ON DELETE SET NULL cascade
