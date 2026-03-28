-- Phase 23: in-app notifications table
CREATE TABLE IF NOT EXISTS "app_notifications" (
  "id"          SERIAL PRIMARY KEY,
  "user_id"     TEXT NOT NULL DEFAULT 'default',   -- single-user for now; extends naturally for multi-user
  "type"        TEXT NOT NULL,                      -- 'timesheet_reminder' | 'timesheet_overdue' | 'timesheet_approved' | 'timesheet_rejected'
  "title"       TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "read"        BOOLEAN NOT NULL DEFAULT false,
  "data"        JSONB,                              -- extra context: { project_id, entry_ids, reason }
  "created_at"  TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user ON app_notifications(user_id, read, created_at DESC);
