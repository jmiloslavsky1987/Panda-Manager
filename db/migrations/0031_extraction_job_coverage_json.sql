-- Phase 53: Add coverage_json for per-pass extraction coverage self-reporting (EXTR-10)
ALTER TABLE extraction_jobs ADD COLUMN IF NOT EXISTS coverage_json jsonb;
