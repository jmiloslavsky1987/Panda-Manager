-- Phase 85.2: daily_briefings table for synthesized Today's Briefing.
-- One row per (user_id, date). Regenerate is INSERT ... ON CONFLICT ... DO UPDATE.

CREATE TABLE IF NOT EXISTS daily_briefings (
  id                 SERIAL PRIMARY KEY,
  user_id            TEXT NOT NULL,
  date               TEXT NOT NULL,
  briefing_content   TEXT NOT NULL,
  meeting_event_ids  TEXT[],
  action_ids         INTEGER[],
  critical_item_refs JSONB,
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_briefings_user_date ON daily_briefings (user_id, date);
