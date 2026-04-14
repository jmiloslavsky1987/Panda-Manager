# Phase 50: Extraction Intelligence - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Close 6 specific extraction pipeline gaps introduced by phases 45–48.1. Every entity type must have a working end-to-end path: extraction prompt → staged item → user approval → correct DB table. No new entity types, no new UI, no broad prompt redesign — gap closure only.

</domain>

<decisions>
## Implementation Decisions

### Gap 1: `team` commit handler — redirect to correct table
- Fix `insertItem` case `'team'` in `approve/route.ts`: write to `teamOnboardingStatus`, not `focusAreas`
- Fields to write: `team_name`, `track`, `ingest_status`, `correlation_status`, `incident_intelligence_status`, `sn_automation_status`, `biggy_ai_status`
- `teamOnboardingStatus` has only `source` attribution (no `source_artifact_id` / `ingested_at`) — write `source: 'ingestion'` only
- Also fix `findConflict` case `'team'`: currently queries `focusAreas` (wrong) → query `teamOnboardingStatus` by `team_name`
- The extraction prompt for `team` in `document-extraction.ts` likely lacks the 5 status fields — update the prompt to extract them; coerce values through the existing `integrationTrackStatusEnum` coercer pattern

### Gap 2: `architecture` missing `integration_group`
- Fix `insertItem` case `'architecture'`: add `integration_group: f.integration_group ?? null` to the `architectureIntegrations` insert
- One-line change — schema already has the column, prompt already asks for it

### Gap 3: `focus_area` commit handler (missing entirely)
- Add `case 'focus_area'` to `insertItem` in `approve/route.ts`
- Target table: `focusAreas`
- Fields: `title`, `tracks`, `why_it_matters`, `current_status`, `next_step`, `bp_owner`, `customer_owner`
- Attribution: full (`source`, `source_artifact_id`, `ingested_at`) — `focusAreas` schema has all three
- Add to Zod enum in `ApprovalItemSchema` in `approve/route.ts`
- Add to `EntityType` union in `lib/extraction-types.ts` (it's already in `worker/jobs/document-extraction.ts`)

### Gap 4: `e2e_workflow` commit handler (missing entirely)
- Add `case 'e2e_workflow'` to `insertItem` in `approve/route.ts`
- Two-table write: insert parent row to `e2eWorkflows`, then insert child rows to `workflowSteps`
- Fields from extraction: `team_name`, `workflow_name`, `steps` (JSON string)
- Parse `fields.steps` with `JSON.parse` — expect array of `{ label, track, status, position }`; fall back to empty array if parse fails or field missing
- `e2eWorkflows` has full attribution (`source`, `source_artifact_id`, `ingested_at`)
- `workflowSteps` has no attribution columns — insert with `workflow_id`, `label`, `track`, `status`, `position` only
- Wrap parent insert + all step inserts in a single `db.transaction`
- Add to Zod enum in `approve/route.ts` and to `EntityType` union in `lib/extraction-types.ts`

### Gap 5: `isAlreadyIngested` dedup for `focus_area` and `e2e_workflow`
- In `lib/extraction-types.ts`, add two cases to `isAlreadyIngested`:
  - `case 'focus_area'`: check `focusAreas.title` with `ilike` — same normalize + ilike pattern as other entity types
  - `case 'e2e_workflow'`: check `e2eWorkflows` by `workflow_name + team_name` (both must match for a duplicate)
- Both currently fall through to `default: return false` — every document re-surfaces them as net-new

### Gap 6: Prompt coverage review — `wbs_task`, `team_engagement`, `arch_node`, `onboarding_step`
- Code verification only: trace each entity type through `document-extraction.ts` prompt → `approve/route.ts` commit handler → DB schema to confirm fields align
- If a field is in the prompt but missing in the insert, add it (same pattern as Gap 2 fix)
- No speculative rewrites — only fix confirmed mismatches

### Claude's Discretion
- Whether to update the `team` extraction prompt in `document-extraction.ts` to add the 5 status field definitions, or rely on the existing track/status pattern (the planner should verify the current prompt vs. teamOnboardingStatus schema)
- Exact coercion logic for the 5 team status fields (same `integrationTrackStatusEnum` coercer already exists — reuse it)
- Whether gap #6 review surfaces additional field mismatches beyond what's already known

</decisions>

<specifics>
## Specific Ideas

- "write context, I don't know how to answer these anyway" — user deferred all implementation decisions to Claude; no strong preferences expressed
- All fixes are in two files: `app/api/ingestion/approve/route.ts` and `lib/extraction-types.ts`; the worker file `worker/jobs/document-extraction.ts` already has `focus_area` / `e2e_workflow` in its local EntityType union and prompt

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `coerceIntegrationStatus()` in `approve/route.ts` — already handles `integrationTrackStatusEnum` values; reuse for all 5 team status fields in the `team` fix
- `syntheticExternalId()` in `approve/route.ts` — not needed for `teamOnboardingStatus` (no `external_id` column); needed for `focusAreas` (check schema)
- `db.transaction()` + `auditLog` insert pattern — established in every commit handler; `e2e_workflow` must follow the same pattern (parent + steps in one transaction)
- `teamPathways` case in `insertItem` — closest analog for `e2e_workflow` (also parses a route description into steps array); reference that handler for the two-table write pattern
- `findConflict` function — dedup query per entity type; add `focus_area` and `e2e_workflow` cases here too (in addition to `isAlreadyIngested` in extraction-types.ts)

### Established Patterns
- Attribution: tables with `source_artifact_id` + `ingested_at` get full attribution; tables with only `source` get `source: 'ingestion'` only — check each target table before writing
- Zod enum in `ApprovalItemSchema` and `EntityType` union in `lib/extraction-types.ts` must be kept in sync — both need `focus_area` and `e2e_workflow` added
- `worker/jobs/document-extraction.ts` has its own local `EntityType` union (not imported from lib) — already includes `focus_area` and `e2e_workflow`; the shared `lib/extraction-types.ts` is what's missing them
- Snake_case for newer entity types: `focus_area`, `e2e_workflow` consistent with `wbs_task`, `team_engagement`, `arch_node`

### Integration Points
- `app/api/ingestion/approve/route.ts` — primary fix file: Zod schema enum, `findConflict`, `insertItem`, and `mergeItem` functions all need updates
- `lib/extraction-types.ts` — add `focus_area` and `e2e_workflow` to `EntityType` union + `isAlreadyIngested` switch
- `worker/jobs/document-extraction.ts` — verify `team` prompt has the 5 status fields; update if not; no other changes needed here
- No UI changes, no new API routes, no new DB tables

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 50-extraction-intelligence-full-spectrum-prompt-rewrite-and-semantic-post-classifier-to-surface-all-entity-types-from-any-document-across-every-project-tab*
*Context gathered: 2026-04-08*
