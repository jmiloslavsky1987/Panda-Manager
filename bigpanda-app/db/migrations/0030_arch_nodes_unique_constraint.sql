CREATE UNIQUE INDEX IF NOT EXISTS arch_nodes_project_track_name_idx
  ON arch_nodes (project_id, track_id, name);
