-- Enable trigram extension for fuzzy entity matching (Pass 5 change detection)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add proposed changes storage to extraction_jobs for Pass 5 output
ALTER TABLE extraction_jobs
  ADD COLUMN IF NOT EXISTS proposed_changes_json jsonb;
