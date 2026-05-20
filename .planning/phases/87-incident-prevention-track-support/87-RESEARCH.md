# Phase 87: incident-prevention-track-support — Research

**Researched:** 2026-05-19
**Domain:** Multi-track product expansion — schema migration, seed pipelines, UI track selection, arch diagram, extraction prompts
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Onboarding-config:** Add `INCIDENT_PREVENTION_ONBOARDING_CONFIG` export matching `PhaseConfig[]` shape. 4 phases, 13 steps total (Discovery & Kickoff display_order 1 / Platform Configuration display_order 3 / Validation display_order 5 / Go-Live display_order 6). Extend `ALL_STANDARD_STEP_NAMES` to include new step names.

**WBS seeding:** 10 L1 phases in order: Kickoff & Scope, Change Process Discovery, Single Sign-On, ITSM Integration (ServiceNow / JSM), Data Source Connectors, Risk Categories & Weights, Write-Back Configuration, CAB Workflow Enablement, UAT & Threshold Tuning, Go-Live & CAB Enablement. #8 and #10 are distinct — planner must not merge. ~30-40 L2 total (planner picks exact count). Seeded only when `active_tracks.incident_prevention` is true.

**Architecture diagram:** `arch_tracks` row name = "Incident Prevention Track", `display_order` = 30. Three section nodes (Data Ingestion do=10, Risk Engine do=20, Decision & Write-Back do=30). Console node = "Change Risk Console" `node_type='console'` `display_order=15`. 13 sub-caps total (4+5+4). Sub-cap `display_order < 100`. Migration 0052 seeds for all existing projects (idempotent NOT EXISTS guards) AND updates `lib/seed-project.ts`.

**Schema default change:** `projects.active_tracks` DEFAULT changes to `'{"adr":false,"biggy":false,"incident_prevention":false}'`. TypeScript type widens to `{ adr: boolean; biggy: boolean; incident_prevention: boolean }`.

**Existing-project backfill:** `UPDATE projects SET active_tracks = active_tracks || '{"incident_prevention":false}'` — preserves existing adr/biggy values verbatim.

**Wizard rule:** Track-selection step added to project-create wizard (3 checkboxes, all unchecked by default). Submit disabled unless ≥1 box checked. Applies to all three tracks.

**Retroactive seeding on Settings toggle:** When track flips false→true in PATCH `/api/projects/[projectId]/settings`, run idempotent seeding for that track: WBS L1 phases, arch section + sub-cap + console nodes, onboarding phases/steps, team placeholder rows — WHERE NOT EXISTS. Wrapped in DB transaction.

**Toggle OFF behavior:** Render-layer filter only. No soft-delete. Per ADMIN-04.

**Labels/ordering:** UI label = "Incident Prevention". Ordering always ADR → Biggy → Incident Prevention. DB key = `"incident_prevention"`. `track` text column value = `"Incident Prevention"`. `arch_tracks.name` = `"Incident Prevention Track"`.

**Extraction prompt cues:** Strong cues (change ticket, change request, CHG-, RFC, ServiceNow change, JSM change, risk score, change risk, risk prediction, CAB, change advisory board). Supporting cues (blast radius, CI, configuration item, freeze window, blackout window, 5-category, weighted risk, risk engine, approval workflow, change approval). Applied in `worker/jobs/document-extraction.ts` Pass 0 classification + entity routing AND `lib/discovery-scanner.ts` DISCOVERY_SYSTEM_TEMPLATE.

**Team placeholder:** Extend `seed-project.ts` teamOnboardingStatus insert to also insert `Team Gamma` / track='Incident Prevention' WHEN `active_tracks.incident_prevention` is true. All three placeholder inserts (Alpha/ADR, Beta/Biggy, Gamma/IP) must become conditional on `active_tracks[trackKey] === true`.

**DB strings:**
- JSONB key: `"incident_prevention"`
- track text column: `"Incident Prevention"`
- arch_tracks.name: `"Incident Prevention Track"`

**Briefing skill:** Stays untouched — already track-agnostic.

### Claude's Discretion
- Exact L2 WBS sub-task names and counts (~30-40 total)
- Migration file structure (single 0052 vs split 0052/0053)
- Wizard step placement (after project metadata? as sub-step?)
- Settings UI: whether all three track toggles live in same panel or get a dedicated "Tracks" sub-section
- Display label color/icon for Incident Prevention in arch diagram
- Exact JSONB merge SQL (`||` vs `jsonb_set`)

### Deferred Ideas (OUT OF SCOPE)
- Chat write-ops track filtering (Phase 82)
- Integration suggestions / preloading for Incident Prevention integrations
- Soft-delete vs hard-hide when track toggled OFF
- Extraction cue tuning loop
- Per-track skill access control
</user_constraints>

---

## Summary

Phase 87 adds "Incident Prevention" as a first-class third track throughout the Panda Manager app, alongside the existing ADR and Biggy tracks. The work spans five coupled layers: (1) DB schema and migration 0052, (2) project creation pipeline (wizard + API route), (3) Settings UI + retroactive seeding, (4) architecture diagram rendering in `InteractiveArchGraph`, and (5) extraction prompt extension. The phase is additive and backward-safe: all default changes preserve existing customer data, and migration 0052 uses `NOT EXISTS` guards identical to 0046.

The codebase is further along than CONTEXT.md implies for some files. WBS page, Gantt page, and GanttChart type definitions **already reference "Incident Prevention"** as a valid track value — this work was scaffolded in an earlier phase. The primary gap is that `active_tracks` consumers, the project-create API route, `lib/seed-project.ts`, `lib/onboarding-config.ts`, `ProjectSettingsForm`, `InteractiveArchGraph`, and the extraction prompt still hardcode ADR/Biggy only.

**Primary recommendation:** Write migration 0052 as a single file covering schema change + backfill + arch seed for existing projects. Keep new-project seeding in `app/api/projects/route.ts` (which owns all project-creation seeding) and `lib/seed-project.ts` (which owns Registry seeding). Do NOT use the `onboarding/seed` route for retroactive seeding — write dedicated logic in the settings PATCH handler.

---

## Requirements Note

Phase 87 roadmap entry has `Requirements: TBD` — no formal requirement IDs are defined. The planner should use CONTEXT.md decisions as the authoritative scope and define phase-local requirement IDs (e.g., IP-01 through IP-NN) in the VALIDATION.md to match the pattern established by Phase 86 (DORM/TOKEN/BACKUP/HEALTH/RBAC).

---

## Standard Stack

### Core (all pre-existing in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | (existing) | Schema type widening, query building | Already used for all DB access |
| PostgreSQL JSONB `\|\|` operator | n/a | Additive JSONB merge for backfill | Safe for append-only key addition; preserves existing keys |
| Next.js Server Components | (existing) | Settings page, WBS page | Pattern established throughout |
| Vitest | (existing) | Test framework | `vitest.config.ts` at project root; `npx vitest run <test>` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | (existing) | Request schema validation | Settings PATCH must widen `active_tracks` schema |
| `sonner` toast | (existing) | User feedback on settings save | Already used in ProjectSettingsForm error handling |

**Installation:** No new packages required.

---

## Architecture Patterns

### Migration Directory and Naming Convention

**Confirmed:** Migrations live at `/Users/jmiloslavsky/Documents/Panda-Manager/db/migrations/`.

Current highest migration: `0051_daily_briefings.sql`.

**Next migration number:** `0052` — file name should be `0052_incident_prevention_track.sql`.

**Naming pattern:** `{4-digit-zero-padded}_{snake_case_description}.sql` — verified across 0033–0051.

**Migration file structure recommendation (Claude's Discretion):** Single file `0052_incident_prevention_track.sql`. Rationale: 0046 demonstrates that schema ALTER + DO block seeding works cleanly in one file. Splitting into 0052/0053 would require coordination and adds no safety benefit since the seeding is idempotent.

### Migration 0052 Shape (Template: migration 0046)

```sql
-- Migration 0052: Incident Prevention Track support
-- Phase 87: adds incident_prevention JSONB key, arch_tracks row + nodes for all existing projects

-- 1. Widen schema default
ALTER TABLE projects
  ALTER COLUMN active_tracks SET DEFAULT '{"adr":false,"biggy":false,"incident_prevention":false}'::jsonb;

-- 2. Backfill existing rows (additive — preserves adr/biggy values)
UPDATE projects
  SET active_tracks = active_tracks || '{"incident_prevention":false}'::jsonb
  WHERE active_tracks ? 'adr'
    AND NOT (active_tracks ? 'incident_prevention');

-- 3. Seed Incident Prevention arch_tracks + arch_nodes for all existing projects
DO $$
DECLARE
  proj_id integer;
  ip_track_id integer;
  section_di_id integer;
  section_re_id integer;
  section_dw_id integer;
BEGIN
  FOR proj_id IN (SELECT id FROM projects) LOOP
    -- Guard: skip if track already seeded
    IF EXISTS (SELECT 1 FROM arch_tracks WHERE project_id = proj_id AND name = 'Incident Prevention Track') THEN
      CONTINUE;
    END IF;

    INSERT INTO arch_tracks (project_id, name, display_order)
      VALUES (proj_id, 'Incident Prevention Track', 30)
      RETURNING id INTO STRICT ip_track_id;

    -- Section nodes
    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, ip_track_id, 'Data Ingestion', 10, 'planned', 'section', 'migration')
      RETURNING id INTO STRICT section_di_id;

    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, ip_track_id, 'Risk Engine', 20, 'planned', 'section', 'migration')
      RETURNING id INTO STRICT section_re_id;

    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, ip_track_id, 'Decision & Write-Back', 30, 'planned', 'section', 'migration')
      RETURNING id INTO STRICT section_dw_id;

    -- Console node (between Data Ingestion do=10 and Risk Engine do=20)
    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, ip_track_id, 'Change Risk Console', 15, 'planned', 'console', 'migration');

    -- Sub-cap: Data Ingestion (4)
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, ip_track_id, section_di_id, 'ITSM Connectors',            1, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_di_id, 'CMDB Connectors',            2, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_di_id, 'Monitoring Connectors',      3, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_di_id, 'Deployment History Connectors', 4, 'planned', 'sub-capability', 'migration');

    -- Sub-cap: Risk Engine (5)
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, ip_track_id, section_re_id, 'Change History Risk',        1, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_re_id, 'Blast Radius Risk',          2, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_re_id, 'CI Criticality Risk',        3, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_re_id, 'Timing & Freeze Window Risk',4, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_re_id, 'Team Performance Risk',      5, 'planned', 'sub-capability', 'migration');

    -- Sub-cap: Decision & Write-Back (4)
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, ip_track_id, section_dw_id, 'Risk Threshold Rules',             1, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_dw_id, 'ITSM Write-Back (ServiceNow / JSM)', 2, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_dw_id, 'CAB Notifications',                3, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_dw_id, 'Reporting & Dashboards',           4, 'planned', 'sub-capability', 'migration');

  END LOOP;
END $$;
```

**Key difference from 0046:** 0046 deleted pre-existing nodes first (conflict risk from flat → section restructure). Migration 0052 uses a top-level `IF EXISTS ... CONTINUE` guard per project because there are no pre-existing IP nodes to clean up — the track doesn't exist yet.

### active_tracks Consumers — Full Audit

**CONFIRMED consumers by file:**

| File | Pattern | Hardcoded ADR/Biggy? | Action Needed |
|------|---------|---------------------|---------------|
| `db/schema.ts:114` | Type def + default | YES — type is `{ adr: boolean; biggy: boolean }` | Widen type + change DEFAULT |
| `components/ProjectSettingsForm.tsx` | Reads `.adr`/`.biggy` state; sends `{ adr, biggy }` to PATCH | YES — hardcoded 2 checkboxes | Add third checkbox; send `{ adr, biggy, incident_prevention }` |
| `app/api/projects/[projectId]/settings/route.ts` | Zod schema validates `{ adr: z.boolean(), biggy: z.boolean() }` | YES — Zod schema | Add `incident_prevention: z.boolean()` to Zod object; add retroactive seeding logic on toggle |
| `app/api/projects/route.ts` (POST) | Seeds ADR + Biggy phases/steps/WBS/archTracks unconditionally | YES — unconditional seed | Make WBS + onboarding seeding conditional on `active_tracks`; add IP seeding when IP is true |
| `lib/seed-project.ts` | Inserts Team Alpha/ADR + Team Beta/Biggy unconditionally | YES — hardcoded two-row insert | Make all three team inserts conditional on `active_tracks[track]`; add Team Gamma/IP |
| `lib/onboarding-config.ts` | Exports only ADR + BIGGY configs | YES — no IP config | Add `INCIDENT_PREVENTION_ONBOARDING_CONFIG` export + extend `ALL_STANDARD_STEP_NAMES` |
| `app/api/projects/[projectId]/onboarding/seed/route.ts` | Seeds ADR + Biggy tracks | YES — hardcoded two tracks | Add `seedTrack(INCIDENT_PREVENTION_ONBOARDING_CONFIG, 'Incident Prevention')` |
| `lib/skill-context-teams.ts:23-27` | Hardcodes `i.track === 'ADR'` / `'Biggy'` filter | YES | Add IP filter section or make generic |
| `lib/skill-context-arch.ts:28-32` | Same hardcoded pattern | YES | Extend or make generic |
| `lib/chat-context-builder.ts:183` | Tool hint comment hardcodes track_name must be "ADR Track" or "AI Assistant Track" | YES (comment) | Add "Incident Prevention Track" to tool hint |
| `components/arch/InteractiveArchGraph.tsx` | `isADR = trackData.name === 'ADR Track'`; non-ADR falls through to flat layout | YES — needs IP section-grouped layout | Extend to detect "Incident Prevention Track" and render section-grouped + console (same as ADR) |
| `components/arch/InteractiveArchGraph.tsx:614-635` | Track color/bg pills — isADR ? blue : amber | YES | Add IP color (violet or green recommended) |
| `components/arch/ConsoleNode` | `isADR` → 'BigPanda Console'; `isAI` → 'Biggy AI Console'; else → 'Console' | YES | Add IP console label = "Change Risk Console" |
| `components/WorkspaceKpiStrip.tsx:51-60` | Hardcoded adrSteps/biggySteps vars | YES — explicit 6 vars for 2 tracks | Add ipSteps/ipInteg/ipTeams vars + include in total/complete |
| `components/OverviewMetrics.tsx:148-224` | Same pattern as KpiStrip | YES | Add IP track computation + ring |
| `components/HealthDashboard.tsx:148-215` | Hardcoded `adrHealth`/`biggyHealth` + two badges | YES | Add `ipHealth` + third badge |
| `components/arch/TeamOnboardingTable.tsx:26-27` | Filters `r.track === 'ADR'` and `r.track === 'Biggy'` | YES | Add IP filter + third section |
| `components/arch/TeamOnboardingEditModal.tsx:16-24` | Type `'ADR' | 'Biggy'` | YES | Widen type to include `'Incident Prevention'` |
| `components/arch/IntegrationEditModal.tsx:23-43` | Type + dropdown `'ADR' | 'Biggy'` | YES | Widen + add option |
| `components/arch/CurrentFutureStateTab.tsx:56-79` | Hardcodes adrTeamNames/biggyTeamNames props | YES | Add ipTeamNames prop + "Add Incident Prevention" button |
| `worker/jobs/document-extraction.ts` | Pass 0 classification + wbs_task track inference + arch_node track names | YES | Add IP cues to Pass 0; add IP to arch_node valid track names; add IP inference for wbs_task |
| `lib/discovery-scanner.ts` DISCOVERY_SYSTEM_TEMPLATE | `existingStructureBlock` populated at runtime — already generic | NO — generic | Only needs content update if IP track/sections need to appear in the block |
| `lib/extraction-types.ts:228` | `f.track ?? 'ADR'` default for wbs_task dedup | SOFT HARDCODE | Review: default 'ADR' is fine for ADR-only docs; no change strictly needed but document |

**Files that are already IP-aware (no action needed):**
- `app/customer/[id]/wbs/WbsPageClient.tsx` — already has `'Incident Prevention'` in WbsTrack union type
- `app/customer/[id]/wbs/page.tsx` — already calls `getWbsItems(projectId, 'Incident Prevention')`
- `app/customer/[id]/gantt/page.tsx` — already fetches `getWbsItems(projectId, 'Incident Prevention')` and includes ipWbs in mapDataToWbsRows
- `components/GanttChart.tsx` — track type already includes `'Incident Prevention'`

### Project-Create Wizard Architecture

**Actual location:** No wizard subdirectory exists. Project creation is handled entirely by:
- `app/api/projects/route.ts` (POST handler — the API endpoint)
- The new-project form is client-side UI (likely in a modal or page that POSTs to this endpoint)

The POST handler in `app/api/projects/route.ts` is the canonical source of truth for what gets seeded at project creation. It currently:
1. Inserts the project row
2. Seeds ADR onboarding phases + steps
3. Seeds Biggy onboarding phases + steps
4. Seeds ADR WBS L1 + L2 items (10 L1, 25 L2 — unconditionally)
5. Seeds Biggy WBS L1 + L2 items (5 L1, 9 L2 — unconditionally)
6. Seeds teamEngagementSections
7. Seeds archTracks + archNodes for ADR Track (section-grouped, 11 sub-caps)
8. Seeds archTracks + archNodes for AI Assistant Track (flat, 5 nodes)
9. Seeds project_members for creator

**Current state:** WBS + onboarding seeding is unconditional (both ADR and Biggy always seeded regardless of active_tracks). The POST handler also reads a hardcoded `body` with `{ name, customer, description, start_date, end_date }` — no `active_tracks` parameter is passed from the client.

**Required changes for Phase 87:**
1. Accept `active_tracks` as a POST body parameter (with validation — at least one track must be true)
2. Make all WBS seeding conditional on `active_tracks.{track}`
3. Add IP WBS seeding (10 L1 + ~30-40 L2) when `active_tracks.incident_prevention === true`
4. Make onboarding phase seeding conditional on `active_tracks.{track}`
5. Add IP onboarding seeding when active
6. Make archTracks/archNodes seeding conditional on `active_tracks.{track}`
7. Add IP archTrack + archNodes seeding when active
8. Store `active_tracks` on the inserted project row

The wizard "track-selection step" in CONTEXT.md refers to UI added to the new-project creation flow (wherever that form lives) that sends `active_tracks` in the POST body. The API route receives it and gates all seeding accordingly.

**Wizard step placement (Claude's Discretion):** Research finds no existing wizard UI directory — project creation appears to use a simple form. The track-selection UI should be added as a step or section in the existing new-project form. Recommend: add a "Select Tracks" section/step after the project metadata fields (name, customer, description, dates). The submit button validation can be done client-side with a simple `atLeastOneTrack` boolean check.

### Settings UI Pattern

**Confirmed:** Settings route is `app/api/projects/[projectId]/settings/route.ts` (PATCH).

Current Zod schema: `{ name, description, go_live_target, active_tracks: { adr: z.boolean(), biggy: z.boolean() } }`.

Current UI: `components/ProjectSettingsForm.tsx` — two checkboxes (ADR Track, Biggy Track), saves `{ adr: adrEnabled, biggy: biggyEnabled }`.

**Settings UI placement (Claude's Discretion):** Adding a third checkbox to the existing "Active Tracks" section is the lowest-friction approach. A dedicated "Tracks" sub-section is defensible if the team wants cleaner separation. Recommend appending a third checkbox directly in the existing section — matches the current two-checkbox pattern exactly.

**Critical: retroactive seeding on toggle.** The settings PATCH route currently does only a DB update. Phase 87 requires it to also trigger per-track idempotent seeding when a track transitions `false → true`. The route must:
1. Read the current `active_tracks` value from DB before applying the patch
2. Diff the new vs old value
3. For each track that flipped `false → true`, run idempotent seeding inside the same DB transaction
4. The seeding functions to call are the same as new-project seeding, but guarded with `WHERE NOT EXISTS` at each insert

**Transaction safety:** The PATCH + seeding should be a single `db.transaction()` call. The existing route uses `.update().set().where()` without a transaction — this must be wrapped.

### InteractiveArchGraph — Exact Extension Points

**Confirmed hardcoded checks (line numbers from `components/arch/InteractiveArchGraph.tsx`):**

1. **Line 350:** `const isADR = trackData.name === 'ADR Track'` — controls section-grouped rendering path
2. **Line 351:** `const isBiggy = trackData.name.includes('Biggy') || trackData.name.includes('AI')` — controls amber color
3. **Lines 352-353:** `borderClass` and `labelClass` — 3-way ternary (isADR blue / isBiggy amber / else zinc)
4. **Line 358:** `if (isADR) { ... }` — the entire section-grouped + console rendering block
5. **Line 526:** `const isADRTrack = track?.name === 'ADR Track'` — inside `handleDragEnd`, controls whether drag reorder uses section-scoped logic vs flat logic
6. **Line 533:** `if (isADRTrack) { ... }` — section-scoped drag end logic
7. **Lines 614-615:** Track color pills — `isADR ? 'bg-blue-600' : 'bg-amber-500'`
8. **Lines 634-635:** teamNames props — `isADR ? adrTeamNames : biggyTeamNames`

**Line 122-125 (ConsoleNode):** `isADR` → 'BigPanda Console' zinc-900 bg; `isAI` → 'Biggy AI Console' amber-500 bg; else → 'Console' zinc-700. Needs a third branch for `track.includes('Incident Prevention')`.

**Required extension pattern:**
```typescript
// TrackPipeline component — extend isADR check to also handle IP:
const isADR = trackData.name === 'ADR Track'
const isIP = trackData.name === 'Incident Prevention Track'  // NEW
const isBiggy = trackData.name.includes('Biggy') || trackData.name.includes('AI')

// Section-grouped layout applies to BOTH ADR and IP:
if (isADR || isIP) {
  // existing section-grouped + console rendering — identical for both
  // sectionColor() function needs IP section names mapped to colors
  // ConsoleNode label for IP = 'Change Risk Console'
}
```

**sectionColor() function (line 193):** Currently maps ADR section names only. Must add IP section names:
- 'Data Ingestion' → 'violet' (or 'purple' / 'indigo' — Claude's Discretion)
- 'Risk Engine' → 'red' (or 'orange')
- 'Decision & Write-Back' → 'green' (or 'teal')

**handleDragEnd (line 526):** Change `const isADRTrack = track?.name === 'ADR Track'` to `const isSectionGrouped = track?.name === 'ADR Track' || track?.name === 'Incident Prevention Track'`.

**Props interface (line 13):** Currently has `adrTeamNames` and `biggyTeamNames`. Must add `ipTeamNames?: string[]`.

**Top nav pills (line 614):** Must add IP color. Recommend: `isADR ? 'bg-blue-600' : isIP ? 'bg-violet-600' : 'bg-amber-500'`.

### seedProjectFromRegistry — Idempotency Model

**Confirmed current behavior:** `lib/seed-project.ts` uses `projects.seeded` as a gate (skip if `seeded: true`). This is a coarse per-project flag — once set, no further seeding runs via this function.

**Phase 87 problem:** When a project starts with `incident_prevention: false` and the user later flips it to `true` in Settings, the project is already `seeded: true`. `seedProjectFromRegistry` will skip entirely.

**Confirmed approach (per CONTEXT.md):** Do NOT rely on `seedProjectFromRegistry` for retroactive seeding. Instead:
1. Write a dedicated `seedIncidentPreventionTrack(projectId, tx)` function (or inline in the settings PATCH handler) that uses `WHERE NOT EXISTS` guards for every entity insert
2. For new-project seeding in `app/api/projects/route.ts` (POST), the track-selection logic is built directly into the transaction (already unconditionally inline — not using seedProjectFromRegistry)
3. `lib/seed-project.ts` (Registry seeding — teamOnboardingStatus etc.) needs the track-conditional insert pattern for the 3 team placeholder rows. Since this runs only when `seeded: false`, it's fine as-is once updated to read `active_tracks` from the project row.

**Retroactive seeding idempotency guards required:**
- `wbs_items`: `WHERE NOT EXISTS (SELECT 1 FROM wbs_items WHERE project_id=? AND track='Incident Prevention' AND name=?)` — or use `ON CONFLICT DO NOTHING` on a unique index if one exists
- `onboarding_phases` + `onboarding_steps`: the existing `onboarding/seed` route uses `onConflictDoNothing()` — reuse this pattern
- `arch_tracks`: `WHERE NOT EXISTS ... WHERE project_id=? AND name='Incident Prevention Track'`
- `arch_nodes`: same NOT EXISTS guard on (project_id, track_id, name) — mirrors 0046 pattern
- `teamOnboardingStatus`: `INSERT ... ON CONFLICT DO NOTHING` — follows existing seed pattern

### Extraction Prompt Changes

**Pass 0 prompt location:** `worker/jobs/document-extraction.ts` — constant `PASS_0_PROMPT` (line ~439). The pre-analysis classifies document type and predicts entity types.

**Arch node valid track names:** In `PASS_2_PROMPT` (and referenced in PASS_3_PROMPT disambiguation), the rule currently reads: `arch_node track names: ONLY valid values are "ADR Track" and "AI Assistant Track". If the document mentions a different track name, do NOT extract an arch_node entity.`

This rule must be extended to include `"Incident Prevention Track"`.

**wbs_task track inference:** In PASS_3_PROMPT, the rule reads: `INFER from document context: "ADR" if BigPanda/enterprise deployment, "Biggy" if startup/SMB. Default to "ADR" if unclear`. Must add: `"Incident Prevention" if document contains change ticket / change risk / CAB / risk score references`.

**DISCOVERY_SYSTEM_TEMPLATE:** The template has an `{existingStructureBlock}` placeholder that is populated at runtime with project-specific existing structure. When `active_tracks.incident_prevention` is true for the scanned project, the discovery scanner's existing-structure builder should include the IP arch track sections and WBS items. Review `runDiscoveryScan()` in `lib/discovery-scanner.ts` to confirm how `existingStructureBlock` is assembled — the research scan shows the placeholder is substituted at call time, so the existing structure builder just needs to include IP-relevant data when the track is active.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSONB additive merge | Custom JS object merge + JSON.stringify | PostgreSQL `||` operator in migration SQL | Atomic, handles concurrent updates correctly |
| Idempotent node seeding | Complex "check-then-insert" logic | `ON CONFLICT DO NOTHING` + `WHERE NOT EXISTS` DO block (per 0046 pattern) | Already proven in codebase |
| Section-grouped arch rendering | New layout component | Extend existing `isADR` path in `TrackPipeline` to `isADR || isIP` | Identical rendering logic — no duplication needed |
| Per-track seeding gate | New `seeded_tracks` DB column | NOT EXISTS guards at each insert (per CONTEXT.md decision) | Column would require its own migration and complicates rollback |

---

## Common Pitfalls

### Pitfall 1: JSONB Key Collision on Backfill
**What goes wrong:** If migration 0052 runs twice (Docker rebuild, migration re-run), the `UPDATE ... SET active_tracks = active_tracks || '{"incident_prevention":false}'` would write false over a user's manually-set `incident_prevention: true` value.
**Why it happens:** The `||` operator overwrites matching keys.
**How to avoid:** Add `WHERE NOT (active_tracks ? 'incident_prevention')` to the UPDATE — only runs on rows that don't yet have the key. Already shown in the template above.
**Warning signs:** User's IP track flips back to false after a migration re-run.

### Pitfall 2: Settings PATCH Sending Only Two Keys
**What goes wrong:** The existing `ProjectSettingsForm` sends `{ adr: adrEnabled, biggy: biggyEnabled }`. After Phase 87, if the form is only partially updated, the PATCH could JSONB-merge only `{adr, biggy}` and accidentally drop `incident_prevention` from the DB value.
**Why it happens:** The settings route does `.set({ ...patch })` where patch includes `active_tracks`. If `active_tracks` in the patch is `{adr: true, biggy: false}` (missing IP key), it overwrites the JSONB column with a 2-key object.
**How to avoid:** Ensure the form always sends all three keys. The Zod schema in the settings route must require all three keys in `active_tracks` when that field is present.

### Pitfall 3: Migration Ordering vs Phase 86
**Risk:** Phase 86 is complete and all its migrations (up to 0051) are applied. There is no in-flight Phase 86 schema work. Migration 0052 is safe to write and apply without coordination concerns.
**Confidence:** HIGH — STATE.md confirms Phase 86 CLOSED 2026-05-18 with all migrations applied.

### Pitfall 4: `isADR` Check in handleDragEnd Must Match TrackPipeline
**What goes wrong:** If `TrackPipeline` renders IP as section-grouped but `handleDragEnd` still uses `track?.name === 'ADR Track'` only for section-scoped drag logic, dragging sub-caps in the IP track will use flat reorder logic and break.
**How to avoid:** Both checks must be updated together: `const isSectionGrouped = track?.name === 'ADR Track' || track?.name === 'Incident Prevention Track'`.

### Pitfall 5: OnboardingDashboard Hardcoded Two Columns
**What goes wrong:** `components/OnboardingDashboard.tsx` has extensive hardcoded ADR/Biggy column logic — two-column layout, ADR/Biggy state arrays, team/integration/goLive card renders per track. Adding a third column requires significant surgery.
**Why it happens:** The component was built for a fixed two-track model. It has ~250 lines of ADR-specific state + render logic.
**How to avoid:** This is the largest UI file needing changes. Plan a dedicated task for it. The pattern to follow: add parallel `rawIpPhases`/`ipPhases`/`ipGoLivePhase`/`ipTeams` state, extend `addingTeam` and `newTeamName` maps to include `'Incident Prevention'`, render a third column in the main layout.
**Warning signs:** Rendering only two columns when IP track is active.

### Pitfall 6: Extraction Prompt `arch_node` Track Name Rule Is Doubled
**What goes wrong:** The constraint "ONLY valid values are 'ADR Track' and 'AI Assistant Track'" appears in BOTH PASS_2 and PASS_3 disambiguation sections. Both occurrences must be updated.
**How to avoid:** Search for the literal string "AI Assistant Track" in `document-extraction.ts` and update all occurrences.

### Pitfall 7: `lib/seed-project.ts` Still Gated on `seeded` Flag
**What goes wrong:** The Registry seeder (`lib/seed-project.ts`) skips if `project.seeded === true`. For retroactive IP seeding triggered from Settings, you cannot call `seedProjectFromRegistry` — it will silently no-op.
**How to avoid:** Write separate per-track seeding logic for the retroactive path. `seedProjectFromRegistry` only needs to be updated for the Team Gamma conditional insert (which only runs at initial project activation when `seeded: false`).

---

## Code Examples

### Settings Route — Retroactive Seeding on Toggle

The settings PATCH route currently does a simple DB update. Phase 87 pattern:

```typescript
// app/api/projects/[projectId]/settings/route.ts
// Source: existing route.ts + 0046 migration retroactive seeding pattern

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  go_live_target: z.string().nullable().optional(),
  active_tracks: z.object({
    adr: z.boolean(),
    biggy: z.boolean(),
    incident_prevention: z.boolean(),  // NEW
  }).optional(),
})

// In PATCH handler body:
const [current] = await db.select({ active_tracks: projects.active_tracks })
  .from(projects).where(eq(projects.id, projectId)).limit(1)

const currentTracks = (current?.active_tracks as ActiveTracks | null) ?? { adr: false, biggy: false, incident_prevention: false }
const newTracks = patch.active_tracks

// Detect tracks that flipped false → true
const flippedOn: string[] = []
if (newTracks) {
  if (!currentTracks.incident_prevention && newTracks.incident_prevention) flippedOn.push('incident_prevention')
  // (extend for adr/biggy if retroactive seeding is needed for those too)
}

// Wrap update + seeding in a single transaction
await db.transaction(async (tx) => {
  await tx.update(projects).set({ ...patch, updated_at: new Date() }).where(eq(projects.id, projectId))

  if (flippedOn.includes('incident_prevention')) {
    await seedIncidentPreventionForProject(tx, projectId)
  }
})
```

### Migration Idempotency Guard (per 0046 pattern)

```sql
-- Source: db/migrations/0046_arch_nodes_parent_id.sql — established pattern
-- Guard exists-check at project loop level (new in 0052 since there are no pre-existing nodes to delete):
IF EXISTS (SELECT 1 FROM arch_tracks WHERE project_id = proj_id AND name = 'Incident Prevention Track') THEN
  CONTINUE;
END IF;
```

### `lib/onboarding-config.ts` Extension

```typescript
// Source: lib/onboarding-config.ts — append after BIGGY_ONBOARDING_CONFIG

export const INCIDENT_PREVENTION_ONBOARDING_CONFIG: PhaseConfig[] = [
  {
    name: 'Discovery & Kickoff',
    display_order: 1,
    steps: ['Kickoff', 'Change Process Discovery', 'ITSM Audit', 'Single Sign-On'],
  },
  {
    name: 'Platform Configuration',
    display_order: 3,
    steps: ['ITSM Integration', 'Data Source Connectors', 'Risk Categories & Weights', 'Write-Back Setup'],
  },
  {
    name: 'Validation',
    display_order: 5,
    steps: ['Historical Backtest', 'Live Scoring UAT', 'Threshold Tuning'],
  },
  {
    name: 'Go-Live',
    display_order: 6,
    steps: ['Go Live', 'CAB Enablement'],
  },
]

export const ALL_STANDARD_STEP_NAMES = [
  ...ADR_ONBOARDING_CONFIG.flatMap(p => p.steps),
  ...BIGGY_ONBOARDING_CONFIG.flatMap(p => p.steps),
  ...INCIDENT_PREVENTION_ONBOARDING_CONFIG.flatMap(p => p.steps),  // NEW
].filter((v, i, a) => a.indexOf(v) === i)
```

### `lib/seed-project.ts` — Conditional Team Inserts

```typescript
// Source: lib/seed-project.ts lines 96-99 — current unconditional insert
// Phase 87 pattern:

const tracks = (project.active_tracks as { adr: boolean; biggy: boolean; incident_prevention: boolean } | null)
  ?? { adr: true, biggy: true, incident_prevention: false }

const teamRows = [
  tracks.adr              && { project_id: projectId, team_name: 'Team Alpha', track: 'ADR',                  source: 'template' as const },
  tracks.biggy            && { project_id: projectId, team_name: 'Team Beta',  track: 'Biggy',               source: 'template' as const },
  tracks.incident_prevention && { project_id: projectId, team_name: 'Team Gamma', track: 'Incident Prevention', source: 'template' as const },
].filter(Boolean) as typeof teamOnboardingStatus.$inferInsert[]

if (teamRows.length > 0) {
  await db.insert(teamOnboardingStatus).values(teamRows)
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 87 |
|--------------|------------------|---------------------|
| Flat arch diagram (pre-Phase 83) | Section-grouped with parent_id hierarchy | IP track gets identical section-grouped treatment — same migration pattern as 0046 |
| Single-gate seeding (`projects.seeded`) | Per-track NOT EXISTS guards needed | Must write dedicated retroactive seeding function; cannot reuse seedProjectFromRegistry |
| Fixed two-track `active_tracks` | Three-track JSONB with configurable defaults | TypeScript type + Zod schema widening required in 3 places |
| Unconditional new-project seeding | Track-conditional (wizard-driven) | `app/api/projects/route.ts` POST must accept and gate on `active_tracks` |

**Pre-scaffolded (already done):**
- WBS page, WBS client, Gantt page, GanttChart types — all already include "Incident Prevention" as a valid track
- This means those files need minimal/no changes for Phase 87 (just ensure the data flows through)

---

## Open Questions

1. **Registry seeder vs inline seeder for new-project arch seeding**
   - What we know: `app/api/projects/route.ts` POST has inline arch seeding for ADR + AI tracks (not going through seedProjectFromRegistry)
   - What's unclear: Should IP arch seeding be added inline to that transaction (matches current pattern) or extracted to a helper?
   - Recommendation: Keep it inline in the POST transaction for consistency with ADR/Biggy arch seeding already there

2. **`lib/skill-context-arch.ts` and `lib/skill-context-teams.ts` — generic vs hardcoded refactor scope**
   - What we know: Both files hardcode ADR/Biggy section headers. For skill context (AI consumption), adding a third section is additive and low-risk.
   - What's unclear: Whether to do a full generic refactor (iterate over tracks) or just add a third branch
   - Recommendation: Add third branch for IP — generic refactor is out of scope per CONTEXT.md "briefing skill untouched" philosophy

3. **OnboardingDashboard — scope of changes**
   - What we know: `components/OnboardingDashboard.tsx` is a large (~1200 line) component with deeply hardcoded ADR/Biggy state. Adding a full IP column is significant work.
   - What's unclear: Whether Phase 87 requires the third column to be fully functional or if a stub is acceptable
   - Recommendation: Full third column is required (CONTEXT.md: "Onboarding Dashboard column" is in scope). Assign a dedicated plan wave for it.

---

## Validation Architecture

> `nyquist_validation` is `true` in `.planning/config.json` — section required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts at project root) |
| Config file | `/Users/jmiloslavsky/Documents/Panda-Manager/vitest.config.ts` |
| Quick run command | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run tests/ui/seed-project.test.ts` |
| Full suite command | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run` |

### Phase Requirements → Test Map

Phase 87 has no roadmap-defined requirement IDs. Planner should define phase-local IDs in VALIDATION.md. Proposed mapping:

| Proposed ID | Behavior | Test Type | Automated Command | Notes |
|-------------|----------|-----------|-------------------|-------|
| IP-01 | Migration 0052 applies cleanly — adds `incident_prevention: false` to all existing projects | Integration (migration round-trip) | `psql $DATABASE_URL -f db/migrations/0052_incident_prevention_track.sql` | Manual / Docker smoke |
| IP-02 | Migration 0052 is idempotent — re-running does not duplicate arch_tracks rows | Integration | Same migration re-run + `SELECT count(*) FROM arch_tracks WHERE name='Incident Prevention Track'` | Manual |
| IP-03 | Existing ADR/Biggy projects retain their `adr`/`biggy` active_tracks values post-migration | Unit (schema validation) | Source-scan or SQL assertion test | Wave 0 RED |
| IP-04 | `INCIDENT_PREVENTION_ONBOARDING_CONFIG` exports correct 4-phase, 13-step shape | Unit | `npx vitest run tests/ui/onboarding-config.test.ts` | Wave 0 RED |
| IP-05 | `ALL_STANDARD_STEP_NAMES` includes all 13 IP step names | Unit | Same as IP-04 | Wave 0 RED |
| IP-06 | New project POST with `active_tracks: { incident_prevention: true, adr: false, biggy: false }` seeds IP WBS L1 items and no ADR/Biggy items | Unit (route mock) | `npx vitest run tests/api/projects.test.ts` | Wave 0 RED |
| IP-07 | Wizard submit is disabled when all three track checkboxes are unchecked | Unit (component) | Source-scan or jsdom test | Wave 0 RED |
| IP-08 | Settings PATCH with `incident_prevention: false → true` triggers retroactive seeding (arch_tracks row inserted for project) | Unit (route mock) | `npx vitest run tests/api/project-settings.test.ts` | Wave 0 RED |
| IP-09 | Settings PATCH retroactive seeding is idempotent — re-toggle false→true→false→true does not duplicate rows | Unit | Same test with double-toggle mock | Wave 0 RED |
| IP-10 | `seedProjectFromRegistry` inserts Team Gamma / 'Incident Prevention' row when `active_tracks.incident_prevention === true` | Unit | `npx vitest run tests/ui/seed-project.test.ts` | Wave 0 RED |
| IP-11 | `seedProjectFromRegistry` does NOT insert Team Gamma when `active_tracks.incident_prevention === false` | Unit | Same test | Wave 0 RED |
| IP-12 | `InteractiveArchGraph` renders section-grouped layout for "Incident Prevention Track" (not flat) | Unit (source-scan) | `npx vitest run tests/arch/interactive-arch-graph.test.ts` | Wave 0 RED |
| IP-13 | `db/schema.ts` type includes `incident_prevention: boolean` in active_tracks type signature | Source-scan | `npx vitest run tests/schema/active-tracks-type.test.ts` | Wave 0 RED |
| IP-14 | Extraction Pass 2 prompt includes "Incident Prevention Track" as a valid arch_node track name | Source-scan | `npx vitest run tests/extraction/ip-track-cues.test.ts` | Wave 0 RED |
| IP-15 | Visual: Incident Prevention track column renders in Architecture diagram (human verify) | Manual (browser) | N/A | Wave 3 human checkpoint |
| IP-16 | Visual: OnboardingDashboard renders three columns with IP column for IP-active project | Manual (browser) | N/A | Wave 3 human checkpoint |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/ui/ tests/api/project-settings.test.ts tests/arch/ tests/extraction/ip-track-cues.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/ui/onboarding-config.test.ts` — covers IP-04, IP-05
- [ ] `tests/api/projects.test.ts` — extend existing POST project tests to cover IP-06, IP-07 (or create if not exists)
- [ ] `tests/api/project-settings.test.ts` — covers IP-08, IP-09 (retroactive seeding on toggle)
- [ ] `tests/arch/interactive-arch-graph.test.ts` — covers IP-12 (source-scan for IP section-grouped condition)
- [ ] `tests/schema/active-tracks-type.test.ts` — covers IP-13 (source-scan db/schema.ts)
- [ ] `tests/extraction/ip-track-cues.test.ts` — covers IP-14 (source-scan document-extraction.ts)

Tests for seed-project (IP-10, IP-11) can extend the existing `tests/ui/seed-project.test.ts`.

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `/Users/jmiloslavsky/Documents/Panda-Manager/db/migrations/0046_arch_nodes_parent_id.sql` — template for 0052
- Direct code read: `/Users/jmiloslavsky/Documents/Panda-Manager/components/arch/InteractiveArchGraph.tsx` — exact line numbers for all hardcoded checks
- Direct code read: `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/projects/route.ts` — full project creation seeding pipeline
- Direct code read: `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/projects/[projectId]/settings/route.ts` — current settings PATCH handler
- Direct code read: `/Users/jmiloslavsky/Documents/Panda-Manager/lib/seed-project.ts` — current Registry seeder
- Direct code read: `/Users/jmiloslavsky/Documents/Panda-Manager/lib/onboarding-config.ts` — current config shape
- Direct code read: `/Users/jmiloslavsky/Documents/Panda-Manager/components/ProjectSettingsForm.tsx` — current settings UI
- Direct code read: `/Users/jmiloslavsky/Documents/Panda-Manager/worker/jobs/document-extraction.ts` — extraction prompt structure
- Direct code read: `/Users/jmiloslavsky/Documents/Panda-Manager/db/schema.ts` — active_tracks type + default
- Direct code grep: all files referencing `active_tracks`, `'ADR'`, `'Biggy'` across the codebase

### Secondary (MEDIUM confidence)
- CONTEXT.md: locked decisions for all implementation specifics
- STATE.md accumulated decisions: Phase 83 [83-01], [83-02], [82-05] patterns
- WbsPageClient.tsx + GanttChart.tsx: pre-scaffolded IP track support confirmed

---

## Metadata

**Confidence breakdown:**
- Migration 0052 shape: HIGH — 0046 is a direct template; pattern is proven
- active_tracks consumers audit: HIGH — direct file reads + grep across full codebase
- Wizard architecture: HIGH — no wizard subdirectory exists; creation is API POST-based
- Settings retroactive seeding: HIGH — current route code read; gap is well-defined
- InteractiveArchGraph extension points: HIGH — exact line numbers read from file
- OnboardingDashboard surgery scope: MEDIUM — file is large (~1200 lines) and deeply ADR/Biggy-specific; confirm exact state management needed during planning
- Extraction prompt changes: HIGH — exact strings and locations identified

**Research date:** 2026-05-19
**Valid until:** 2026-06-18 (stable codebase; 30-day window)
