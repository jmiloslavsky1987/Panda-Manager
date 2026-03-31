CREATE TABLE IF NOT EXISTS team_pathways (
  id                  SERIAL PRIMARY KEY,
  project_id          INTEGER NOT NULL REFERENCES projects(id),
  team_name           TEXT NOT NULL,
  route_steps         JSONB NOT NULL DEFAULT '[]',
  status              integration_track_status NOT NULL DEFAULT 'planned',
  notes               TEXT,
  source              TEXT NOT NULL DEFAULT 'manual',
  source_artifact_id  INTEGER REFERENCES artifacts(id) ON DELETE SET NULL,
  discovery_source    TEXT,
  ingested_at         TIMESTAMP,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE team_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_pathways FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_isolation ON team_pathways;
CREATE POLICY project_isolation ON team_pathways
  USING (project_id = current_setting('app.current_project_id', true)::integer);
CREATE INDEX IF NOT EXISTS idx_team_pathways_project_id ON team_pathways(project_id);
