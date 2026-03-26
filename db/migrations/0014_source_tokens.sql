-- Phase 19.1: user_source_tokens — stores per-user OAuth tokens (Gmail)
-- user_id defaults to 'default' (single-user app, forward-compatible with multi-user auth)
CREATE TABLE IF NOT EXISTS user_source_tokens (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL DEFAULT 'default',
  source        TEXT NOT NULL,
  access_token  TEXT,
  refresh_token TEXT NOT NULL,
  expires_at    TIMESTAMP WITH TIME ZONE,
  email         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, source)
);
