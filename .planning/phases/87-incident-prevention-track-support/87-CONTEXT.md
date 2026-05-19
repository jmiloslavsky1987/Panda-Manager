# Phase 87: Incident Prevention Track Support - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a third product track ("Incident Prevention" — BigPanda's AI Change Risk Prediction product) as a sibling of ADR and Biggy throughout the project structure. New `active_tracks.incident_prevention` JSONB key, onboarding-config entry, project-create WBS seeding, settings UI toggle, project-create wizard track-selection, retroactive seeding on Settings toggle, architecture diagram entry (section-grouped, mirrors ADR), extraction prompt inference rule, seed-project team placeholder.

Briefing skill (Phase 85.2) stays untouched — already track-agnostic; "Biggy" in skill names is the AI persona, not the product track.

In scope: schema migration 0052 (additive JSONB key + arch_tracks row + section/sub-cap arch_nodes seed for existing projects), `lib/onboarding-config.ts` INCIDENT_PREVENTION_ONBOARDING_CONFIG export, `lib/seed-project.ts` extensions, project-create wizard track-selection UI (now applies to all three tracks, not just incident_prevention), Admin > Settings > Project Settings toggle for all three tracks with idempotent retroactive seeding on enable, extraction prompt cue list update, `seedProjectFromRegistry` team placeholder for Incident Prevention.

Out of scope: any modification to the briefing skill, any data migration that resets existing customers' ADR/Biggy values, soft-delete behavior when a track is toggled OFF (left at render-layer filter only per ADMIN-04), chat tool track-filtering for Phase 82 write-ops, integration_phase suggestion preloading for ServiceNow / JSM.

</domain>

<decisions>
## Implementation Decisions

### Onboarding-config (lib/onboarding-config.ts)
- Add `INCIDENT_PREVENTION_ONBOARDING_CONFIG` export matching the existing `PhaseConfig[]` shape
- 4 phases, 13 steps total (mirrors ADR + Biggy cadence Discovery / Config / Validation / Go-Live):
  - **Discovery & Kickoff** (display_order 1) — Kickoff, Change Process Discovery, ITSM Audit, Single Sign-On
  - **Platform Configuration** (display_order 3) — ITSM Integration, Data Source Connectors, Risk Categories & Weights, Write-Back Setup
  - **Validation** (display_order 5) — Historical Backtest, Live Scoring UAT, Threshold Tuning
  - **Go-Live** (display_order 6) — Go Live, CAB Enablement
- Extend `ALL_STANDARD_STEP_NAMES` to include the new step names for extraction prompt sharpening

### WBS new-project seed (10 L1 phases, ~30-40 L2 sub-tasks)
- L1 list (ordered):
  1. Kickoff & Scope
  2. Change Process Discovery
  3. Single Sign-On
  4. ITSM Integration (ServiceNow / JSM)
  5. Data Source Connectors
  6. Risk Categories & Weights
  7. Write-Back Configuration
  8. CAB Workflow Enablement — *configure the ITSM change-approval workflow (auto-route by risk score, gating rules)*
  9. UAT & Threshold Tuning
  10. Go-Live & CAB Enablement — *train change advisory board humans on consuming the risk score*
- #8 and #10 are distinct: #8 is workflow configuration, #10 is human training; planner must not merge
- L2 sub-tasks deferred to gsd-planner: target ~3-4 per L1 (~30-40 total). Generation guidance: derive from onboarding-config steps + standard engagement patterns. The phase note's "~39 L2" was approximate; planner picks the exact count
- Seeded only when active_tracks.incident_prevention is true at project create (or flips to true via Settings)

### Architecture diagram (section-grouped, mirrors ADR pattern from Phase 83)
- New `arch_tracks` row per project: name = "Incident Prevention Track", display_order = 30 (after ADR=10 and Biggy=20)
- Three section nodes (parent_id=NULL, node_type='section'):
  - **Data Ingestion** (display_order 10) — ITSM Connectors, CMDB Connectors, Monitoring Connectors, Deployment History Connectors
  - **Risk Engine** (display_order 20) — Change History Risk, Blast Radius Risk, CI Criticality Risk, Timing & Freeze Window Risk, Team Performance Risk *(the 5 sub-caps map 1:1 to the 5-category weighted risk model)*
  - **Decision & Write-Back** (display_order 30) — Risk Threshold Rules, ITSM Write-Back (ServiceNow / JSM), CAB Notifications, Reporting & Dashboards
- Special **Change Risk Console** centerpiece node: parent_id=NULL, node_type='console', display_order=15 (between Data Ingestion at 10 and Risk Engine at 20). Mirrors ADR's "Console" pattern.
- Migration 0052 seeds all of the above for every existing project (idempotent — guarded by NOT EXISTS check on arch_tracks.name and arch_nodes.name) AND updates new-project seed (`lib/seed-project.ts`) to seed per project
- 13 sub-capabilities total (4 + 5 + 4)
- All sub-cap display_order < 100 (excluded from extraction-pipeline sentinel filter per [82-05] decision); Change Risk Console placed via parent_id=NULL + node_type='console' filter

### Defaults & backfill (changes for all three tracks)
- **Schema default change**: `projects.active_tracks` column DEFAULT changes from `'{"adr":true,"biggy":true}'` to `'{"adr":false,"biggy":false,"incident_prevention":false}'`. New projects start with all three tracks OFF.
- **Existing project backfill**: migration patches existing rows additively — `UPDATE projects SET active_tracks = active_tracks || '{"incident_prevention":false}'` — preserving the user's current `adr` and `biggy` values verbatim. Zero customer-facing regression for existing projects.
- **Wizard rule**: project-create wizard adds a track-selection step (3 checkboxes, all unchecked by default). Submit is disabled unless ≥1 box is checked. Form validation prevents creation of all-off projects.
- **Retroactive seeding on Settings toggle**: when a track is toggled false → true in Admin > Settings, the PATCH handler runs idempotent seeding for that track only — inserts WBS L1 phases, arch section + sub-cap + console nodes (where applicable), onboarding phases/steps, and team placeholder rows IF they don't already exist for this project. Same seeding pipeline reused; seeded:false → true is no longer the only gate.
- **Toggle OFF behavior**: stays at render-layer filter only (no soft-delete / no hide of WBS items). Honors Phase 75 ADMIN-04 decision.
- **Scope note**: extending wizard/settings selection behavior to ADR and Biggy is a deliberate expansion of the phase note. Captured explicitly.

### Labels, ordering & DB strings
- **UI label** (Settings toggles, wizard checkboxes, Onboarding Dashboard column, arch column header): `Incident Prevention`
- **Ordering in every UI surface**: ADR → Biggy → Incident Prevention (append last). Stable rule for future tracks.
- **DB strings**:
  - `active_tracks` JSONB key: `"incident_prevention"`
  - `track` text column value (teamOnboardingStatus, businessOutcomes, etc.): `"Incident Prevention"`
  - `arch_tracks.name`: `"Incident Prevention Track"` (parallels ADR's "ADR Track" pattern, not Biggy's descriptive "AI Assistant Track")

### Extraction prompt inference cues
- Strong cues (high confidence routing to incident_prevention):
  - "change ticket", "change request", "CHG-", "RFC"
  - "ServiceNow change", "JSM change"
  - "risk score", "change risk", "risk prediction"
  - "CAB", "change advisory board"
- Supporting cues:
  - "blast radius", "CI", "configuration item"
  - "freeze window", "blackout window"
  - "5-category", "weighted risk", "risk engine"
  - "approval workflow", "change approval"
- Where applied: `worker/jobs/document-extraction.ts` (Pass 0 classification + entity routing), `lib/discovery-scanner.ts` DISCOVERY_SYSTEM_TEMPLATE existing-structure block

### Seed-project team placeholder
- Extend `seed-project.ts` teamOnboardingStatus insert (currently inserts `Team Alpha`/ADR + `Team Beta`/Biggy) to also insert `Team Gamma` with track='Incident Prevention' WHEN active_tracks.incident_prevention is true at seed time
- All three placeholder inserts must become conditional on `active_tracks[trackKey] === true` (not hardcoded) — wizard-driven selection means a project may have only one or two tracks active

### Claude's Discretion
- Exact L2 WBS sub-task names and counts (~30-40 total) — planner picks based on the L1 names + onboarding-config steps + standard engagement patterns
- Migration file structure (single 0052 vs split 0052/0053 for schema + seed) — planner / researcher decides
- Wizard step placement: new track-selection step position in the existing project-create wizard flow (after project metadata? before? as a sub-step of an existing step?)
- Settings UI: whether all three track toggles live in the same Admin > Project Settings panel or get a dedicated "Tracks" sub-section
- Display label color/icon for Incident Prevention in arch diagram (any consistent palette choice)
- Exact JSONB merge SQL for the existing-project backfill (`||` operator vs `jsonb_set` — both work)

</decisions>

<specifics>
## Specific Ideas

- "5-category weighted risk engine" from STATE.md maps 1:1 to the 5 Risk Engine sub-capabilities (Change History / Blast Radius / CI Criticality / Timing & Freeze Window / Team Performance Risk)
- "Change Risk Console" naming chosen explicitly to parallel ADR's "Console" centerpiece (Phase 83) rather than alternatives like "Risk Cockpit" or "Risk Dashboard"
- ITSM scope = ServiceNow and Jira Service Management; other ITSM tools not explicitly seeded but extraction cues should generalize
- Mid-engagement enable case (customer buys Change Risk Prediction six months into ADR engagement) explicitly called out as a supported flow via Settings toggle → idempotent retroactive seed
- "Team Gamma" naming for the team placeholder follows the Alpha/Beta sequence already in seed-project.ts

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/onboarding-config.ts`: exports ADR_ONBOARDING_CONFIG, BIGGY_ONBOARDING_CONFIG, ALL_STANDARD_STEP_NAMES. Append INCIDENT_PREVENTION_ONBOARDING_CONFIG with the same PhaseConfig[] shape.
- `lib/seed-project.ts`: seedProjectFromRegistry runs at project create; idempotent via projects.seeded flag. Extend the teamOnboardingStatus insert + add per-track WBS seeding via active_tracks check.
- `db/schema.ts:114`: `active_tracks` is `jsonb('active_tracks').$type<{ adr: boolean; biggy: boolean }>().default({ adr: true, biggy: true })`. Type signature widens to `{ adr: boolean; biggy: boolean; incident_prevention: boolean }`; default expression changes to all-false.
- `db/migrations/0046_arch_nodes_parent_id.sql`: ADR section + sub-cap + Console seed pattern is the reference template for Incident Prevention's migration 0052. Same DO block + INSERT ... WHERE NOT EXISTS pattern.
- `lib/queries.ts`, `lib/chat-context-builder.ts`, `lib/skill-context-arch.ts`, `lib/skill-context-teams.ts`: all read active_tracks and filter by it. Need audit for hardcoded `adr` / `biggy` references vs generic iteration.
- `lib/discovery-scanner.ts` DISCOVERY_SYSTEM_TEMPLATE: existing-structure block tells Claude what tracks/sections exist; needs Incident Prevention awareness when track is active.
- `lib/extraction-types.ts`: entity type → track routing. Audit for hardcoded ADR/Biggy branches.

### Established Patterns
- **Migration idempotency**: existing 0046 uses `IF NOT EXISTS` + `WHERE NOT EXISTS` guards. Same pattern for 0052 — safe to re-run.
- **Render-layer filtering only** (ADMIN-04, Phase 75): active_tracks is consulted at render time. Skill context, extraction, Gantt baselines always receive full data.
- **Section/sub-cap arch model** (Phase 83): parent_id NULL = section/console; parent_id = section_id = sub-capability; node_type field disambiguates 'section'|'sub-capability'|'console'. Sub-caps filtered with display_order < 100; sentinel/extraction nodes use display_order=999 to stay out of pipeline rendering.
- **Idempotent seeding** (Phase 79 prior decisions): seeding pipeline must be safe to re-run; current `seeded:true` gate is too coarse for per-track retroactive seeding.
- **Render-layer active_tracks filter**: WBS page, Overview tracks, arch InteractiveArchGraph all read active_tracks and conditionally render. Must extend to incident_prevention.

### Integration Points
- `app/api/projects/[projectId]/admin/settings/route.ts` (or equivalent): PATCH handler for project settings — must trigger retroactive seeding when a track flips false→true. Wrap in DB transaction.
- `app/customer/[id]/wizard/...` (project-create wizard): adds track-selection step; submit guarded by ≥1 selection.
- `app/customer/[id]/wbs/page.tsx` + `app/customer/[id]/wbs/WbsPageClient.tsx`: already read active_tracks; need to surface incident_prevention column.
- `components/OnboardingDashboard.tsx`: render Incident Prevention as third track column (matching label, ordering rules).
- `components/arch/InteractiveArchGraph.tsx`: extend track equality check (currently `trackData.name === 'ADR Track'` per [83-02]) to handle `'Incident Prevention Track'` with section-grouped + console rendering identical to ADR.
- `components/WorkspaceKpiStrip.tsx`, `components/OverviewMetrics.tsx`, `components/GanttChart.tsx`: all consume active_tracks; need third-track-aware iteration rather than hardcoded ADR/Biggy.
- `worker/jobs/document-extraction.ts`: Pass 0 classification prompt + entity routing — extend with incident_prevention cues.

</code_context>

<deferred>
## Deferred Ideas

- **Chat write-ops track filtering** (Phase 82): when chat creates an action/risk/milestone, should it auto-tag with the active track context? Not in scope for Phase 87.
- **Integration suggestions / preloading**: do Incident Prevention integrations (ServiceNow, JSM, Jira) get a preloaded suggestion list in the integrations modal, like ADR's monitoring suggestions? Deferred to a follow-up phase.
- **Soft-delete vs hard-hide when track toggled OFF**: current decision is render-layer filter only. Future phase may add "archive track data on disable + restore on re-enable" if customers complain about losing visibility into deactivated tracks.
- **Extraction cue tuning loop**: cue list is the initial best guess; tune after seeing real-world routing errors. Not blocking for Phase 87.
- **Per-track skill access control**: a future phase could gate specific skills to specific active tracks (e.g. "Change Risk Briefing" skill only available when incident_prevention is true). Out of scope now.

</deferred>

---

*Phase: 87-incident-prevention-track-support*
*Context gathered: 2026-05-19*
