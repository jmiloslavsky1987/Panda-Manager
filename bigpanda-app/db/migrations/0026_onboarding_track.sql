-- Phase 33: Onboarding Track Column
-- Adds track column to onboarding_phases and onboarding_steps for ADR/Biggy separation
--
-- Run manually with:
--   psql $DATABASE_URL -f bigpanda-app/db/migrations/0026_onboarding_track.sql

ALTER TABLE onboarding_phases ADD COLUMN track TEXT;

ALTER TABLE onboarding_steps ADD COLUMN track TEXT;

CREATE INDEX idx_onboarding_phases_track ON onboarding_phases(project_id, track);

CREATE INDEX idx_onboarding_steps_track ON onboarding_steps(project_id, track);
