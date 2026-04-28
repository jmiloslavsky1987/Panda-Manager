-- Phase 80: daily_prep_briefs + meeting_prep_templates
CREATE TABLE daily_prep_briefs (
  id           SERIAL PRIMARY KEY,
  user_id      TEXT NOT NULL,
  event_id     TEXT NOT NULL,
  date         TEXT NOT NULL,
  brief_content TEXT NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_prep_briefs_user_event_date UNIQUE (user_id, event_id, date)
);

CREATE TABLE meeting_prep_templates (
  id                  SERIAL PRIMARY KEY,
  user_id             TEXT NOT NULL,
  recurring_event_id  TEXT NOT NULL,
  brief_content       TEXT NOT NULL,
  saved_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meeting_prep_templates_user_series UNIQUE (user_id, recurring_event_id)
);
