-- Phase 14: Time + Project Analytics
-- Adds per-project weekly hour target for capacity planning

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS weekly_hour_target NUMERIC(5,2);
