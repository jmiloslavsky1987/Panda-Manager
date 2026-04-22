ALTER TABLE projects ADD COLUMN IF NOT EXISTS active_tracks JSONB DEFAULT '{"adr": true, "biggy": true}'::jsonb;
