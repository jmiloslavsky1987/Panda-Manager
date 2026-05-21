-- Migration 0055: track_workstream_stages + team_onboarding_stage_status (Phase 88.1 G1 gap closure)
-- Replaces the hardcoded 5-column COLUMNS constant in components/arch/TeamOnboardingTable.tsx
-- with a data-driven per-track stages model. Stages mirror the project Overview tab's 5
-- expandable onboarding pillars per track (user directive 2026-05-20: "It should match the overview tab.").
--
-- PRESERVE / BACKWARDS-COMPAT: The legacy team_onboarding_status table is NOT dropped and NOT
-- altered (no DROP COLUMN). The existing read path keeps working through the Plan 08 UI transition.
-- Existing ADR team_onboarding_status rows are backfilled into team_onboarding_stage_status using
-- the LEGACY_ADR_COLUMN_TO_STAGE_KEY mapping (lib/constants/track-workstream-stages.ts):
--   ingest_status + sn_automation_status  → 'integrations'           (highest progress wins)
--   correlation_status + incident_intelligence_status + biggy_ai_status → 'platform_configuration'
--   discovery_kickoff / teams / uat have no legacy equivalent → seeded as 'planned' (default)
--
-- Idempotent: every DDL is IF NOT EXISTS, every DML uses ON CONFLICT DO NOTHING. Re-runnable
-- via psql with zero ERROR lines and zero duplicate rows on subsequent runs.
--
-- Apply pattern (per [88.1-01] / [87-01]):
--   docker exec -i panda-postgres psql -U postgres -d panda < db/migrations/0055_track_workstream_stages.sql
--   docker exec panda-postgres psql -U postgres -d panda \
--     -c "INSERT INTO _migrations (filename, applied_at) VALUES ('0055_track_workstream_stages.sql', NOW()) ON CONFLICT (filename) DO NOTHING;"

BEGIN;

-- ─── Table 1: track_workstream_stages ─────────────────────────────────────────
-- Per-project, per-track, per-stage configuration. Replaces the global COLUMNS constant.
-- Source of stage definitions: lib/constants/track-workstream-stages.ts
-- DEFAULT_TRACK_WORKSTREAM_STAGES (locked 2026-05-20, Plan 88.1-06).

CREATE TABLE IF NOT EXISTS track_workstream_stages (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  track         TEXT NOT NULL,       -- 'ADR' | 'Biggy' | 'Incident Prevention'
  stage_key     TEXT NOT NULL,       -- snake_case immutable identifier (natural key)
  stage_label   TEXT NOT NULL,       -- user-facing column header
  display_order INTEGER NOT NULL,    -- 1-based, ascending within track
  source        TEXT NOT NULL DEFAULT 'seed',  -- 'seed' | 'manual'
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS track_workstream_stages_uniq
  ON track_workstream_stages (project_id, track, stage_key);

CREATE INDEX IF NOT EXISTS track_workstream_stages_project_track_order_idx
  ON track_workstream_stages (project_id, track, display_order);

-- ─── Table 2: team_onboarding_stage_status (status pivot) ─────────────────────
-- Per-team-row, per-stage status. FK to team_onboarding_status; ON DELETE CASCADE.
-- Reuses the existing integration_track_status enum (live | in_progress | pilot | planned).
-- Nullable status matches current legacy column semantics (some rows have NULLs).

CREATE TABLE IF NOT EXISTS team_onboarding_stage_status (
  id                  SERIAL PRIMARY KEY,
  team_onboarding_id  INTEGER NOT NULL REFERENCES team_onboarding_status(id) ON DELETE CASCADE,
  stage_key           TEXT NOT NULL,
  status              integration_track_status,  -- REUSE existing enum — nullable
  source              TEXT NOT NULL DEFAULT 'manual',
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS team_onboarding_stage_status_uniq
  ON team_onboarding_stage_status (team_onboarding_id, stage_key);

-- ─── SEED: default stages per project per track ───────────────────────────────
-- For every project, seed the three tracks' default stages (5 per track × 3 tracks = 15 per project).
-- Idempotent via ON CONFLICT (project_id, track, stage_key) DO NOTHING.
--
-- Stage labels match lib/constants/track-workstream-stages.ts DEFAULT_TRACK_WORKSTREAM_STAGES
-- (locked 2026-05-20 per user directive "It should match the overview tab"):
--   ADR:                discovery_kickoff | integrations | platform_configuration | teams | uat
--   Biggy:              discovery_kickoff | it_knowledge_graph | platform_configuration | teams | validation
--   Incident Prevention: discovery_kickoff | change_risk_data_sources | platform_configuration | teams | validation

-- ADR stages (5) — match the Overview tab's ADR onboarding pillar sections
INSERT INTO track_workstream_stages (project_id, track, stage_key, stage_label, display_order, source)
SELECT p.id, 'ADR', s.stage_key, s.stage_label, s.display_order, 'seed'
FROM projects p
CROSS JOIN (VALUES
  ('discovery_kickoff',      'Discovery & Kickoff',    1),
  ('integrations',           'Integrations',           2),
  ('platform_configuration', 'Platform Configuration', 3),
  ('teams',                  'Teams',                  4),
  ('uat',                    'UAT',                    5)
) AS s(stage_key, stage_label, display_order)
ON CONFLICT (project_id, track, stage_key) DO NOTHING;

-- Biggy (AI Assistant) stages (5) — match the Overview tab's Biggy onboarding pillar sections
INSERT INTO track_workstream_stages (project_id, track, stage_key, stage_label, display_order, source)
SELECT p.id, 'Biggy', s.stage_key, s.stage_label, s.display_order, 'seed'
FROM projects p
CROSS JOIN (VALUES
  ('discovery_kickoff',      'Discovery & Kickoff',    1),
  ('it_knowledge_graph',     'IT Knowledge Graph',     2),
  ('platform_configuration', 'Platform Configuration', 3),
  ('teams',                  'Teams',                  4),
  ('validation',             'Validation',             5)
) AS s(stage_key, stage_label, display_order)
ON CONFLICT (project_id, track, stage_key) DO NOTHING;

-- Incident Prevention stages (5) — match the Overview tab's IP onboarding pillar sections
INSERT INTO track_workstream_stages (project_id, track, stage_key, stage_label, display_order, source)
SELECT p.id, 'Incident Prevention', s.stage_key, s.stage_label, s.display_order, 'seed'
FROM projects p
CROSS JOIN (VALUES
  ('discovery_kickoff',         'Discovery & Kickoff',       1),
  ('change_risk_data_sources',  'Change Risk Data Sources',  2),
  ('platform_configuration',    'Platform Configuration',    3),
  ('teams',                     'Teams',                     4),
  ('validation',                'Validation',                5)
) AS s(stage_key, stage_label, display_order)
ON CONFLICT (project_id, track, stage_key) DO NOTHING;

-- ─── BACKFILL: preserve existing ADR team_onboarding_status data ──────────────
-- BACKWARDS-COMPAT ADDITIVE ONLY: the legacy team_onboarding_status table and its
-- 5 *_status columns are NOT dropped, renamed, or altered. This backfill copies
-- existing non-null values into the new pivot table so both read paths work during
-- the Plan 08 UI transition.
--
-- Mapping (LEGACY_ADR_COLUMN_TO_STAGE_KEY from lib/constants/track-workstream-stages.ts):
--   ingest_status, sn_automation_status → 'integrations'           (N:1 — highest progress wins)
--   correlation_status, incident_intelligence_status, biggy_ai_status → 'platform_configuration' (N:1)
--   discovery_kickoff / teams / uat have no legacy equivalent → seeded as 'planned'
--
-- Scope: only rows where track IS NULL OR track = 'ADR' (the legacy ADR-shaped columns
-- do NOT apply to Biggy or Incident Prevention tracks).
--
-- Idempotent: ON CONFLICT (team_onboarding_id, stage_key) DO NOTHING.

-- 'discovery_kickoff': no legacy column — insert 'planned' default for all ADR rows
INSERT INTO team_onboarding_stage_status (team_onboarding_id, stage_key, status, source)
SELECT t.id, 'discovery_kickoff', 'planned'::integration_track_status, 'backfill'
FROM team_onboarding_status t
WHERE (t.track IS NULL OR t.track = 'ADR')
ON CONFLICT (team_onboarding_id, stage_key) DO NOTHING;

-- 'integrations': highest progress wins between ingest_status and sn_automation_status
-- Precedence: live > in_progress > pilot > planned > NULL
-- Uses CASE expression to compute MAX(ingest_status, sn_automation_status) per precedence.
INSERT INTO team_onboarding_stage_status (team_onboarding_id, stage_key, status, source)
SELECT
  t.id,
  'integrations',
  CASE
    WHEN 'live'::integration_track_status IN (t.ingest_status, t.sn_automation_status)        THEN 'live'::integration_track_status
    WHEN 'in_progress'::integration_track_status IN (t.ingest_status, t.sn_automation_status) THEN 'in_progress'::integration_track_status
    WHEN 'pilot'::integration_track_status IN (t.ingest_status, t.sn_automation_status)       THEN 'pilot'::integration_track_status
    WHEN 'planned'::integration_track_status IN (t.ingest_status, t.sn_automation_status)     THEN 'planned'::integration_track_status
    ELSE NULL
  END,
  'backfill'
FROM team_onboarding_status t
WHERE (t.track IS NULL OR t.track = 'ADR')
  AND (t.ingest_status IS NOT NULL OR t.sn_automation_status IS NOT NULL)
ON CONFLICT (team_onboarding_id, stage_key) DO NOTHING;

-- 'platform_configuration': highest progress wins among correlation_status,
-- incident_intelligence_status, and biggy_ai_status (3:1 reduction)
INSERT INTO team_onboarding_stage_status (team_onboarding_id, stage_key, status, source)
SELECT
  t.id,
  'platform_configuration',
  CASE
    WHEN 'live'::integration_track_status IN (t.correlation_status, t.incident_intelligence_status, t.biggy_ai_status)        THEN 'live'::integration_track_status
    WHEN 'in_progress'::integration_track_status IN (t.correlation_status, t.incident_intelligence_status, t.biggy_ai_status) THEN 'in_progress'::integration_track_status
    WHEN 'pilot'::integration_track_status IN (t.correlation_status, t.incident_intelligence_status, t.biggy_ai_status)       THEN 'pilot'::integration_track_status
    WHEN 'planned'::integration_track_status IN (t.correlation_status, t.incident_intelligence_status, t.biggy_ai_status)     THEN 'planned'::integration_track_status
    ELSE NULL
  END,
  'backfill'
FROM team_onboarding_status t
WHERE (t.track IS NULL OR t.track = 'ADR')
  AND (t.correlation_status IS NOT NULL OR t.incident_intelligence_status IS NOT NULL OR t.biggy_ai_status IS NOT NULL)
ON CONFLICT (team_onboarding_id, stage_key) DO NOTHING;

-- 'teams': no legacy column — insert 'planned' default for all ADR rows
INSERT INTO team_onboarding_stage_status (team_onboarding_id, stage_key, status, source)
SELECT t.id, 'teams', 'planned'::integration_track_status, 'backfill'
FROM team_onboarding_status t
WHERE (t.track IS NULL OR t.track = 'ADR')
ON CONFLICT (team_onboarding_id, stage_key) DO NOTHING;

-- 'uat': no legacy column — insert 'planned' default for all ADR rows
INSERT INTO team_onboarding_stage_status (team_onboarding_id, stage_key, status, source)
SELECT t.id, 'uat', 'planned'::integration_track_status, 'backfill'
FROM team_onboarding_status t
WHERE (t.track IS NULL OR t.track = 'ADR')
ON CONFLICT (team_onboarding_id, stage_key) DO NOTHING;

-- Note: Biggy and Incident Prevention rows in team_onboarding_status are NOT backfilled
-- from the legacy 5 *_status columns. Those columns are ADR-shaped (Ingest/Correlation/etc.)
-- and do not apply to Biggy or Incident Prevention tracks. Plan 08's UI renders those track
-- rows with empty (—) stage cells until the user enters values via TeamOnboardingEditModal.

COMMIT;
