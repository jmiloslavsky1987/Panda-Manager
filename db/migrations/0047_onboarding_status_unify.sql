-- 0047: Unify onboarding statuses to not-started/in-progress/complete/blocked
-- Integrations: drop pg enum, switch to text, remap legacy values
-- team_onboarding_status: add a single 'status' text column

-- Step 1: add a new text column for integrations status
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS status_text text;

-- Step 2: remap existing enum values to new text values
UPDATE integrations SET status_text = CASE status::text
  WHEN 'not-connected' THEN 'not-started'
  WHEN 'configured'    THEN 'in-progress'
  WHEN 'validated'     THEN 'complete'
  WHEN 'production'    THEN 'complete'
  WHEN 'blocked'       THEN 'blocked'
  ELSE 'not-started'
END;

-- Step 3: drop the old enum column and rename the text column
ALTER TABLE integrations DROP COLUMN status;
ALTER TABLE integrations RENAME COLUMN status_text TO status;
ALTER TABLE integrations ALTER COLUMN status SET NOT NULL;
ALTER TABLE integrations ALTER COLUMN status SET DEFAULT 'not-started';

-- Step 4: add status column to team_onboarding_status
ALTER TABLE team_onboarding_status ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not-started';
