-- Migration 0008: Full-text search infrastructure + knowledge_base link columns
-- Written manually — drizzle-kit generate not available (Phase 03-02 decision)
-- Covers: KB-02, KB-03 (KB link columns), SRCH-01 (FTS tsvector + GIN indexes + triggers)

-- ─── Section 1: Extend knowledge_base for linkability (KB-02, KB-03) ───────────

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS linked_risk_id    INTEGER REFERENCES risks(id),
  ADD COLUMN IF NOT EXISTS linked_history_id INTEGER REFERENCES engagement_history(id),
  ADD COLUMN IF NOT EXISTS linked_date       TEXT;

-- ─── Section 2: Add tsvector column to each of the 8 FTS tables ─────────────

ALTER TABLE actions            ADD COLUMN IF NOT EXISTS search_vec tsvector;
ALTER TABLE risks              ADD COLUMN IF NOT EXISTS search_vec tsvector;
ALTER TABLE key_decisions      ADD COLUMN IF NOT EXISTS search_vec tsvector;
ALTER TABLE engagement_history ADD COLUMN IF NOT EXISTS search_vec tsvector;
ALTER TABLE stakeholders       ADD COLUMN IF NOT EXISTS search_vec tsvector;
ALTER TABLE tasks              ADD COLUMN IF NOT EXISTS search_vec tsvector;
ALTER TABLE artifacts          ADD COLUMN IF NOT EXISTS search_vec tsvector;
ALTER TABLE knowledge_base     ADD COLUMN IF NOT EXISTS search_vec tsvector;

-- ─── Section 3: GIN indexes for fast FTS ────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_actions_search_vec            ON actions            USING GIN(search_vec);
CREATE INDEX IF NOT EXISTS idx_risks_search_vec              ON risks              USING GIN(search_vec);
CREATE INDEX IF NOT EXISTS idx_key_decisions_search_vec      ON key_decisions      USING GIN(search_vec);
CREATE INDEX IF NOT EXISTS idx_engagement_history_search_vec ON engagement_history USING GIN(search_vec);
CREATE INDEX IF NOT EXISTS idx_stakeholders_search_vec       ON stakeholders       USING GIN(search_vec);
CREATE INDEX IF NOT EXISTS idx_tasks_search_vec              ON tasks              USING GIN(search_vec);
CREATE INDEX IF NOT EXISTS idx_artifacts_search_vec          ON artifacts          USING GIN(search_vec);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_search_vec     ON knowledge_base     USING GIN(search_vec);

-- ─── Section 4: Trigger functions + triggers ────────────────────────────────

-- actions: description + notes + owner
CREATE OR REPLACE FUNCTION tsvector_update_actions() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.notes, '')        || ' ' ||
    coalesce(NEW.owner, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actions_search_vec ON actions;
CREATE TRIGGER trg_actions_search_vec
  BEFORE INSERT OR UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_actions();

-- risks: description + mitigation + owner
CREATE OR REPLACE FUNCTION tsvector_update_risks() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.mitigation, '')  || ' ' ||
    coalesce(NEW.owner, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_risks_search_vec ON risks;
CREATE TRIGGER trg_risks_search_vec
  BEFORE INSERT OR UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_risks();

-- key_decisions: decision + context
CREATE OR REPLACE FUNCTION tsvector_update_key_decisions() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.decision, '') || ' ' ||
    coalesce(NEW.context, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_key_decisions_search_vec ON key_decisions;
CREATE TRIGGER trg_key_decisions_search_vec
  BEFORE INSERT OR UPDATE ON key_decisions
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_key_decisions();

-- engagement_history: content
CREATE OR REPLACE FUNCTION tsvector_update_engagement_history() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_engagement_history_search_vec ON engagement_history;
CREATE TRIGGER trg_engagement_history_search_vec
  BEFORE INSERT OR UPDATE ON engagement_history
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_engagement_history();

-- stakeholders: name + role + notes
CREATE OR REPLACE FUNCTION tsvector_update_stakeholders() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.name, '')  || ' ' ||
    coalesce(NEW.role, '')  || ' ' ||
    coalesce(NEW.notes, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stakeholders_search_vec ON stakeholders;
CREATE TRIGGER trg_stakeholders_search_vec
  BEFORE INSERT OR UPDATE ON stakeholders
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_stakeholders();

-- tasks: title + description + owner
CREATE OR REPLACE FUNCTION tsvector_update_tasks() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.title, '')       || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.owner, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_search_vec ON tasks;
CREATE TRIGGER trg_tasks_search_vec
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_tasks();

-- artifacts: name + description
CREATE OR REPLACE FUNCTION tsvector_update_artifacts() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.name, '')        || ' ' ||
    coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_artifacts_search_vec ON artifacts;
CREATE TRIGGER trg_artifacts_search_vec
  BEFORE INSERT OR UPDATE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_artifacts();

-- knowledge_base: title + content
CREATE OR REPLACE FUNCTION tsvector_update_knowledge_base() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.title, '')   || ' ' ||
    coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_knowledge_base_search_vec ON knowledge_base;
CREATE TRIGGER trg_knowledge_base_search_vec
  BEFORE INSERT OR UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_knowledge_base();

-- ─── Section 5: Backfill existing rows ──────────────────────────────────────

UPDATE actions
  SET search_vec = to_tsvector('english',
    coalesce(description, '') || ' ' || coalesce(notes, '') || ' ' || coalesce(owner, ''));

UPDATE risks
  SET search_vec = to_tsvector('english',
    coalesce(description, '') || ' ' || coalesce(mitigation, '') || ' ' || coalesce(owner, ''));

UPDATE key_decisions
  SET search_vec = to_tsvector('english',
    coalesce(decision, '') || ' ' || coalesce(context, ''));

UPDATE engagement_history
  SET search_vec = to_tsvector('english',
    coalesce(content, ''));

UPDATE stakeholders
  SET search_vec = to_tsvector('english',
    coalesce(name, '') || ' ' || coalesce(role, '') || ' ' || coalesce(notes, ''));

UPDATE tasks
  SET search_vec = to_tsvector('english',
    coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(owner, ''));

UPDATE artifacts
  SET search_vec = to_tsvector('english',
    coalesce(name, '') || ' ' || coalesce(description, ''));

UPDATE knowledge_base
  SET search_vec = to_tsvector('english',
    coalesce(title, '') || ' ' || coalesce(content, ''));
