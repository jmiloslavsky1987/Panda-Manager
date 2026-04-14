CREATE TYPE project_member_role AS ENUM ('admin', 'user');

CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role project_member_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_members_project_user_uniq UNIQUE (project_id, user_id)
);

CREATE INDEX project_members_project_user_idx ON project_members(project_id, user_id);

-- Bootstrap: seed all existing users as Admin on all existing projects
-- No one loses access on deploy
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, u.id, 'admin'
FROM projects p
CROSS JOIN users u
ON CONFLICT DO NOTHING;
