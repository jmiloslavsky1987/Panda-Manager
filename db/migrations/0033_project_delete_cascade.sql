-- ─── Migration 0033: project delete cascade ───────────────────────────────────
--
-- Problem: DELETE FROM projects fails because:
--   1. ~25 child tables have FK references to projects.id with no ON DELETE CASCADE.
--   2. engagement_history and key_decisions have triggers blocking DELETE.
--
-- Fix:
--   1. Modify enforce_append_only() to block only UPDATE (not DELETE).
--      Individual history rows should not be editable; but a full project wipe must work.
--   2. Dynamically find every FK constraint pointing at projects(id) that has
--      delete_rule = 'NO ACTION' and re-add it with ON DELETE CASCADE.
--      Dynamic approach means no manual list to maintain as new tables are added.

-- ─── Step 1: Update trigger to block UPDATE only, allow DELETE ────────────────

CREATE OR REPLACE FUNCTION enforce_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only: UPDATE is prohibited. Entry ID: %',
    TG_TABLE_NAME, OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers to fire on UPDATE only (not DELETE)
DROP TRIGGER IF EXISTS engagement_history_append_only ON engagement_history;
CREATE TRIGGER engagement_history_append_only
  BEFORE UPDATE ON engagement_history
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();

DROP TRIGGER IF EXISTS key_decisions_append_only ON key_decisions;
CREATE TRIGGER key_decisions_append_only
  BEFORE UPDATE ON key_decisions
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();

-- ─── Step 2: Add ON DELETE CASCADE to all FKs pointing at projects(id) ────────
--
-- Dynamically discovers every FK with delete_rule = 'NO ACTION' that references
-- projects.id and re-creates it with ON DELETE CASCADE.
--
-- This covers all tables from all migrations without a manual list.

DO $$
DECLARE
  r RECORD;
  fk_cols TEXT;
BEGIN
  FOR r IN
    SELECT
      tc.table_name,
      tc.constraint_name,
      array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
      AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'projects'
      AND ccu.column_name = 'id'
      AND rc.delete_rule = 'NO ACTION'
    GROUP BY tc.table_name, tc.constraint_name
  LOOP
    fk_cols := array_to_string(r.columns, ', ');
    RAISE NOTICE 'Adding CASCADE to %.% (columns: %)',
      r.table_name, r.constraint_name, fk_cols;

    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT %I',
      r.table_name,
      r.constraint_name
    );
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES projects(id) ON DELETE CASCADE',
      r.table_name,
      r.constraint_name,
      fk_cols
    );
  END LOOP;
END;
$$;
