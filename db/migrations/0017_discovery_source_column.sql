-- Migration 0017: Add discovery_source column to entity tables
-- This column stores the tool name (e.g., 'Slack', 'Gmail', 'Gong', 'Glean')
-- for rows where source='discovery', enabling SourceBadge to display "Discovered — Slack" etc.
-- Uses ADD COLUMN IF NOT EXISTS for idempotency (safe to re-run).

ALTER TABLE actions                  ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE risks                    ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE milestones               ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE stakeholders             ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE key_decisions            ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE engagement_history       ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE artifacts                ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE business_outcomes        ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE focus_areas              ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE architecture_integrations ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE e2e_workflows            ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE workflow_steps           ADD COLUMN IF NOT EXISTS discovery_source TEXT;
