-- Phase 85: WBS overhaul — new columns + dependency table

-- 1. New columns on wbs_items (all additive/nullable — backward safe)
ALTER TABLE wbs_items
  ADD COLUMN IF NOT EXISTS duration_days integer,
  ADD COLUMN IF NOT EXISTS percent_complete integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignee text;

-- 2. Migrate percent_complete from existing status
UPDATE wbs_items SET percent_complete =
  CASE status
    WHEN 'not_started' THEN 0
    WHEN 'in_progress' THEN 50
    WHEN 'complete' THEN 100
    ELSE 0
  END;

-- 3. Make percent_complete NOT NULL after migration
ALTER TABLE wbs_items ALTER COLUMN percent_complete SET NOT NULL;

-- 4. New wbs_dependencies table (dependency_type is text not enum for future FF/SF)
CREATE TABLE IF NOT EXISTS wbs_dependencies (
  id serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_item_id integer NOT NULL REFERENCES wbs_items(id) ON DELETE CASCADE,
  to_item_id integer NOT NULL REFERENCES wbs_items(id) ON DELETE CASCADE,
  dependency_type text NOT NULL DEFAULT 'FS',
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT wbs_dependencies_unique UNIQUE (from_item_id, to_item_id)
);

CREATE INDEX IF NOT EXISTS wbs_dependencies_project_idx ON wbs_dependencies(project_id);
CREATE INDEX IF NOT EXISTS wbs_dependencies_from_idx ON wbs_dependencies(from_item_id);
CREATE INDEX IF NOT EXISTS wbs_dependencies_to_idx ON wbs_dependencies(to_item_id);
