-- Remove duplicate onboarding steps (keep lowest id per phase+name)
DELETE FROM onboarding_steps
WHERE id NOT IN (
  SELECT MIN(id)
  FROM onboarding_steps
  GROUP BY phase_id, name
);

-- Unique constraint prevents future duplicates from concurrent seed calls
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_steps_phase_id_name_idx
  ON onboarding_steps (phase_id, name);
