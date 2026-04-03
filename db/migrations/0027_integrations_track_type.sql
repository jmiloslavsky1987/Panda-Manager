-- Phase 35: Integration Tracker Track + Type Columns + Weekly Focus Job
-- Adds track and integration_type columns for ADR/Biggy workstream categorization
-- Registers weekly-focus scheduled job for Monday 6am execution
--
-- Run manually with:
--   psql $DATABASE_URL -f bigpanda-app/db/migrations/0027_integrations_track_type.sql

ALTER TABLE integrations ADD COLUMN track TEXT;
ALTER TABLE integrations ADD COLUMN integration_type TEXT;

CREATE INDEX idx_integrations_track ON integrations(project_id, track);

-- Register weekly-focus job (Monday 6am) - idempotent via NOT EXISTS check
INSERT INTO scheduled_jobs (name, skill_name, cron_expression, enabled)
SELECT 'weekly-focus', 'weekly-focus', '0 6 * * 1', true
WHERE NOT EXISTS (SELECT 1 FROM scheduled_jobs WHERE name = 'weekly-focus');
