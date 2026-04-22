-- Migration 0043: Create milestone_status enum with correct domain values and cast column
-- Context: In this environment the milestones.status column is TEXT (not the legacy enum).
-- Old values (if any): not_started, in_progress, completed, blocked
-- New values: on_track, at_risk, complete, missed

-- Step 1: Create new enum type with correct domain values
-- (DROP + CREATE handles cases where enum was partially applied)
DROP TYPE IF EXISTS milestone_status;
CREATE TYPE milestone_status AS ENUM ('on_track', 'at_risk', 'complete', 'missed');

-- Step 2: Migrate existing data — map old text values to nearest new equivalent
UPDATE milestones SET status = 'complete' WHERE status = 'completed';
UPDATE milestones SET status = 'on_track' WHERE status IN ('not_started', 'in_progress');
UPDATE milestones SET status = NULL WHERE status = 'blocked';

-- Step 3: Cast column to enum type
ALTER TABLE milestones ALTER COLUMN status TYPE milestone_status USING status::milestone_status;
