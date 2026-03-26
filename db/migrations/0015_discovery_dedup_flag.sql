-- 0015_discovery_dedup_flag.sql
-- Add likely_duplicate flag to discovery_items.
-- Allows the scanner to mark items that appear to duplicate existing project data,
-- so the review queue can surface them separately without discarding them.
--
-- Run manually: psql -d bigpanda_app -f bigpanda-app/db/migrations/0015_discovery_dedup_flag.sql

ALTER TABLE discovery_items
  ADD COLUMN IF NOT EXISTS likely_duplicate BOOLEAN NOT NULL DEFAULT FALSE;
