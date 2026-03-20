-- Phase 3 schema additions
-- Adds: tasks.blocked_by (self-FK), tasks.milestone_id (FK milestones), tasks.start_date (text), workstreams.percent_complete

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS blocked_by integer REFERENCES tasks(id),
  ADD COLUMN IF NOT EXISTS milestone_id integer REFERENCES milestones(id),
  ADD COLUMN IF NOT EXISTS start_date text;

ALTER TABLE workstreams
  ADD COLUMN IF NOT EXISTS percent_complete integer;
