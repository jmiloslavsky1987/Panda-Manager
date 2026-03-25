-- Migration 0009: FTS expansion for Phase 5.1/5.2 tables
-- Written manually — drizzle-kit generate not available (Phase 03-02 decision)
-- Covers: SRCH-01 (FTS tsvector + GIN indexes + triggers + backfill for 4 new tables)
-- Tables: onboarding_steps, onboarding_phases, integrations, time_entries

-- ─── onboarding_steps ────────────────────────────────────────────────────────

ALTER TABLE onboarding_steps ADD COLUMN IF NOT EXISTS search_vec tsvector;

CREATE INDEX IF NOT EXISTS idx_onboarding_steps_search_vec ON onboarding_steps USING GIN(search_vec);

CREATE OR REPLACE FUNCTION tsvector_update_onboarding_steps() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.name, '')        || ' ' ||
    coalesce(NEW.owner, '')       || ' ' ||
    coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_steps_search_vec ON onboarding_steps;
CREATE TRIGGER trg_onboarding_steps_search_vec
  BEFORE INSERT OR UPDATE ON onboarding_steps
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_onboarding_steps();

UPDATE onboarding_steps
  SET search_vec = to_tsvector('english',
    coalesce(name, '') || ' ' || coalesce(owner, '') || ' ' || coalesce(description, ''));

-- ─── onboarding_phases ───────────────────────────────────────────────────────

ALTER TABLE onboarding_phases ADD COLUMN IF NOT EXISTS search_vec tsvector;

CREATE INDEX IF NOT EXISTS idx_onboarding_phases_search_vec ON onboarding_phases USING GIN(search_vec);

CREATE OR REPLACE FUNCTION tsvector_update_onboarding_phases() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_phases_search_vec ON onboarding_phases;
CREATE TRIGGER trg_onboarding_phases_search_vec
  BEFORE INSERT OR UPDATE ON onboarding_phases
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_onboarding_phases();

UPDATE onboarding_phases
  SET search_vec = to_tsvector('english',
    coalesce(name, ''));

-- ─── integrations ────────────────────────────────────────────────────────────

ALTER TABLE integrations ADD COLUMN IF NOT EXISTS search_vec tsvector;

CREATE INDEX IF NOT EXISTS idx_integrations_search_vec ON integrations USING GIN(search_vec);

CREATE OR REPLACE FUNCTION tsvector_update_integrations() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.tool, '')     || ' ' ||
    coalesce(NEW.notes, '')    || ' ' ||
    coalesce(NEW.category, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_integrations_search_vec ON integrations;
CREATE TRIGGER trg_integrations_search_vec
  BEFORE INSERT OR UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_integrations();

UPDATE integrations
  SET search_vec = to_tsvector('english',
    coalesce(tool, '') || ' ' || coalesce(notes, '') || ' ' || coalesce(category, ''));

-- ─── time_entries ─────────────────────────────────────────────────────────────

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS search_vec tsvector;

CREATE INDEX IF NOT EXISTS idx_time_entries_search_vec ON time_entries USING GIN(search_vec);

CREATE OR REPLACE FUNCTION tsvector_update_time_entries() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_time_entries_search_vec ON time_entries;
CREATE TRIGGER trg_time_entries_search_vec
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_time_entries();

UPDATE time_entries
  SET search_vec = to_tsvector('english',
    coalesce(description, ''));
