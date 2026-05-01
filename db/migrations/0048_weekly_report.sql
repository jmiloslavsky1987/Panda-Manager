-- Add project metadata columns for weekly report
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budgeted_hours numeric(8,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS arr text;

-- Weekly report notes: one row per project per week (ISO week string e.g. '2026-W18')
CREATE TABLE IF NOT EXISTS weekly_report_notes (
  id            serial PRIMARY KEY,
  project_id    integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  week_of       text NOT NULL,  -- ISO week e.g. '2026-W18'
  notes         text NOT NULL DEFAULT '',
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now(),
  UNIQUE (project_id, week_of)
);

CREATE INDEX IF NOT EXISTS idx_weekly_report_notes_week ON weekly_report_notes(week_of);
