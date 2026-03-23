-- Phase 5.1: Onboarding Dashboard
-- Adds onboarding_phases, onboarding_steps, integrations tables

CREATE TYPE onboarding_step_status AS ENUM ('not-started', 'in-progress', 'complete', 'blocked');
CREATE TYPE integration_status AS ENUM ('not-connected', 'configured', 'validated', 'production', 'blocked');

CREATE TABLE onboarding_phases (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id),
  name          TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE onboarding_steps (
  id            SERIAL PRIMARY KEY,
  phase_id      INTEGER NOT NULL REFERENCES onboarding_phases(id) ON DELETE CASCADE,
  project_id    INTEGER NOT NULL REFERENCES projects(id),
  name          TEXT NOT NULL,
  description   TEXT,
  status        onboarding_step_status NOT NULL DEFAULT 'not-started',
  owner         TEXT,
  dependencies  TEXT[] DEFAULT '{}',
  updates       JSONB NOT NULL DEFAULT '[]',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE integrations (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id),
  tool          TEXT NOT NULL,
  category      TEXT,
  status        integration_status NOT NULL DEFAULT 'not-connected',
  color         TEXT,
  notes         TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
