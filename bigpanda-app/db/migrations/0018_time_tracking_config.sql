-- Phase 23: Time Tracking Advanced — admin configuration table
CREATE TABLE IF NOT EXISTS "time_tracking_config" (
  "id"                    SERIAL PRIMARY KEY,
  "enabled"               BOOLEAN NOT NULL DEFAULT false,
  "weekly_capacity_hours" NUMERIC(5,2) NOT NULL DEFAULT 40,
  "working_days"          TEXT[] NOT NULL DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri'],
  "submission_due_day"    TEXT NOT NULL DEFAULT 'Friday',
  "submission_due_time"   TEXT NOT NULL DEFAULT '17:00',
  "reminder_days_before"  INTEGER NOT NULL DEFAULT 1,
  "categories"            TEXT[] NOT NULL DEFAULT ARRAY['Development','Meetings','QA','Discovery','Admin'],
  "restrict_to_assigned"  BOOLEAN NOT NULL DEFAULT false,
  "active_projects_only"  BOOLEAN NOT NULL DEFAULT true,
  "lock_after_approval"   BOOLEAN NOT NULL DEFAULT true,
  "exempt_users"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at"            TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at"            TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Seed a default row so config always exists (single-row config table)
INSERT INTO "time_tracking_config" DEFAULT VALUES ON CONFLICT DO NOTHING;
