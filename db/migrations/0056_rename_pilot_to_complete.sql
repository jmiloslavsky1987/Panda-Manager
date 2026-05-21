-- Phase 88.1 Gap G4: rename integration_track_status enum value 'pilot' → 'complete'
-- so the lifecycle reads naturally: Planned → In progress → Complete → Live.
--
-- Postgres ≥12 supports in-place enum value rename via ALTER TYPE ... RENAME VALUE.
-- This is a metadata-only operation: NO row rewrite, NO FK fan-out, NO data migration.
-- Rows previously holding 'pilot' transparently report 'complete' after this runs.
--
-- Idempotency: wrapped in DO block that exits silently if 'pilot' already gone
-- (i.e. this migration has already been applied on this database).
--
-- Rollback caveat (Postgres limitation): there is no in-place RENAME-back. To revert,
-- would require CREATE TYPE integration_track_status_v2 + ALTER TABLE ... ALTER COLUMN
-- TYPE _v2 USING status::text::integration_track_status_v2 + DROP TYPE + ALTER TYPE _v2
-- RENAME TO integration_track_status. See Plan 09 SUMMARY for full rollback recipe.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'integration_track_status' AND e.enumlabel = 'pilot'
  ) THEN
    ALTER TYPE integration_track_status RENAME VALUE 'pilot' TO 'complete';
  END IF;
END$$;
