-- 0022_project_seeded_flag.sql
-- Adds seeded flag to projects to prevent duplicate seeding

ALTER TABLE projects ADD COLUMN IF NOT EXISTS seeded BOOLEAN NOT NULL DEFAULT FALSE;
