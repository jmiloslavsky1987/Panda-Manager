-- Create chat_messages table if it does not exist (with project_id included)
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- If table already existed without project_id, add the column (safe no-op if already present)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

-- Index for project-scoped queries
CREATE INDEX IF NOT EXISTS chat_messages_project_id_idx ON chat_messages(project_id);
