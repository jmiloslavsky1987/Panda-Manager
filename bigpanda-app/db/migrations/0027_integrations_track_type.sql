-- Phase 35: Integration Tracker Track + Type Columns
-- Adds track and integration_type columns for ADR/Biggy workstream categorization
--
-- Run manually with:
--   psql $DATABASE_URL -f bigpanda-app/db/migrations/0027_integrations_track_type.sql

ALTER TABLE integrations ADD COLUMN track TEXT;
ALTER TABLE integrations ADD COLUMN integration_type TEXT;

CREATE INDEX idx_integrations_track ON integrations(project_id, track);
