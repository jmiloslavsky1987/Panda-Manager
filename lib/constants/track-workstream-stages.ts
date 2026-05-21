/**
 * Canonical per-track workstream stages for the Team Onboarding Status table.
 *
 * Single source of truth shared by:
 * - db/migrations/0055_track_workstream_stages.sql (seeds track_workstream_stages on project create)
 * - lib/seed-project.ts + lib/seed-incident-prevention.ts (seeds default stages per project at create time / track-enable time)
 * - components/arch/TeamOnboardingTable.tsx (renders column headers per track section, no global COLUMNS constant)
 * - components/arch/TeamOnboardingEditModal.tsx (renders the editable field set per track)
 *
 * Phase 88.1 gap closure: replaces the hardcoded 5 ADR-centric COLUMNS constant
 * that previously rendered identically over every track section.
 *
 * Source: 2026-05-20 user directive — "It should match the overview tab."
 * The 5 stages per track mirror the 5 expandable phase sections rendered in the
 * project Overview tab's onboarding pillars (ADR / Biggy / Incident Prevention).
 * The "Mark Live" Go-Live banner from the Overview tab is a transition state
 * (track go-live event), NOT a workstream stage, and is intentionally excluded.
 *
 * Natural key: (track, stage_key) — stage_keys are intentionally repeated across
 * tracks where labels match (e.g. discovery_kickoff, platform_configuration, teams).
 */

export type TrackKey = 'ADR' | 'Biggy' | 'Incident Prevention'

export interface TrackWorkstreamStage {
  stage_key: string       // snake_case, immutable identifier (used in DB pivot)
  stage_label: string     // user-facing column header
  display_order: number   // 1-based, ascending
}

export const DEFAULT_TRACK_WORKSTREAM_STAGES: Record<TrackKey, TrackWorkstreamStage[]> = {
  // Track key matches teamOnboardingStatus.track (TEXT — 'ADR' | 'Biggy' | 'Incident Prevention')
  'ADR': [
    { stage_key: 'discovery_kickoff',      stage_label: 'Discovery & Kickoff',     display_order: 1 },
    { stage_key: 'integrations',           stage_label: 'Integrations',            display_order: 2 },
    { stage_key: 'platform_configuration', stage_label: 'Platform Configuration',  display_order: 3 },
    { stage_key: 'teams',                  stage_label: 'Teams',                   display_order: 4 },
    { stage_key: 'uat',                    stage_label: 'UAT',                     display_order: 5 },
  ],
  'Biggy': [
    { stage_key: 'discovery_kickoff',      stage_label: 'Discovery & Kickoff',     display_order: 1 },
    { stage_key: 'it_knowledge_graph',     stage_label: 'IT Knowledge Graph',      display_order: 2 },
    { stage_key: 'platform_configuration', stage_label: 'Platform Configuration',  display_order: 3 },
    { stage_key: 'teams',                  stage_label: 'Teams',                   display_order: 4 },
    { stage_key: 'validation',             stage_label: 'Validation',              display_order: 5 },
  ],
  'Incident Prevention': [
    { stage_key: 'discovery_kickoff',         stage_label: 'Discovery & Kickoff',         display_order: 1 },
    { stage_key: 'change_risk_data_sources',  stage_label: 'Change Risk Data Sources',    display_order: 2 },
    { stage_key: 'platform_configuration',    stage_label: 'Platform Configuration',      display_order: 3 },
    { stage_key: 'teams',                     stage_label: 'Teams',                       display_order: 4 },
    { stage_key: 'validation',                stage_label: 'Validation',                  display_order: 5 },
  ],
}

/**
 * Backfill helper: maps the legacy 5 hardcoded *_status columns on team_onboarding_status
 * to ADR stage_keys for migration 0055's backfill INSERT.
 *
 * Mapping rationale (documented in 88.1-06-SUMMARY.md "Legacy ADR backfill mapping"):
 * - ingest_status                → integrations            (Ingest & Normalization is a connector concern)
 * - correlation_status           → platform_configuration  (Alert Correlation is platform-tech tuning)
 * - incident_intelligence_status → platform_configuration  (Incident Intelligence is platform-tech config)
 * - sn_automation_status         → integrations            (ServiceNow Automation is a connector/integration)
 * - biggy_ai_status              → platform_configuration  (Biggy AI seed is platform-tech config)
 *
 * The new stages `discovery_kickoff`, `teams`, and `uat` have no legacy column equivalent
 * and are seeded as 'planned' (default) by the migration for existing ADR rows.
 *
 * NOTE: Because TWO legacy columns each map to `integrations` and THREE map to
 * `platform_configuration`, the migration must reduce per-row using a "highest progress wins"
 * rule (live > complete > in_progress > planned) when collapsing duplicates. Plan 07
 * implements this reduction; this mapping only declares the column-to-stage relationship.
 */
export const LEGACY_ADR_COLUMN_TO_STAGE_KEY: Record<string, string> = {
  ingest_status:                'integrations',
  correlation_status:           'platform_configuration',
  incident_intelligence_status: 'platform_configuration',
  sn_automation_status:         'integrations',
  biggy_ai_status:              'platform_configuration',
}
