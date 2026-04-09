# Phase 51: Extraction Intelligence Overhaul — Full Tab Coverage - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Source:** Conversation context + Phase 50 UAT session + full codebase audit

<domain>
## Phase Boundary

Fix all known gaps in the extraction pipeline so every renderable area of every tab can be populated via document extraction. This phase does NOT touch the UI tab structure — only the extraction prompt, approval route handlers, and feedback mechanisms.

**In scope:**
- Gaps A–J: all extraction gaps identified in Phase 50 UAT + follow-up codebase audit
- Extraction prompt improvements (disambiguation, status coercers, examples)
- Approval route handler fixes and additions
- Per-entity write feedback to user after approval

**Out of scope:**
- Time entries (manual tracking, not extractable)
- Plan templates (static DB seeds)
- Skill runs / Chat tab (AI tools, not extraction targets)
- UI tab structure changes
- New tabs or features

</domain>

<decisions>
## Implementation Decisions

### Gap A: `before_state` entity type (LOCKED)
- Add new entity type `before_state` to extraction prompt
- Fields: `aggregation_hub_name` (string), `alert_to_ticket_problem` (string), `pain_points` (string array)
- Add insert handler in `approve/route.ts` → writes to `beforeState` table (`pain_points_json` is jsonb)
- One row per project — use upsert (update if exists, insert if not)

### Gap B: `wbs_task` orphan fallback (LOCKED)
- Current behavior: `parentId = null` when parent section name doesn't fuzzy-match seeded WBS items
- Fix: If parent not found, insert as Level 1 item (top-level) rather than orphaning with null parent
- Do NOT auto-create missing parent sections (too risky — could duplicate seeded sections)

### Gap C: `arch_node` graceful degradation (LOCKED)
- Current behavior: throws `Error('Architecture track not found: ...')` → whole approve request fails
- Fix: graceful skip — log warning, skip the arch_node entity, continue processing remaining entities
- Do NOT create new tracks — only write to pre-seeded tracks ("ADR Track", "AI Assistant Track")

### Gap D: `team_engagement` dead-end (LOCKED)
- Current behavior: writes to `teamEngagementSections` table which is NOT rendered in Teams tab
- Investigation result: Teams tab sections 1-5 use `businessOutcomes`, `architectureIntegrations`, `e2eWorkflows`, `teamOnboardingStatus`, `focusAreas` — NOT `teamEngagementSections`
- Fix: Remove `team_engagement` entity type from extraction prompt entirely — it routes to a dead-end table
- The 5 Teams tab sections are already covered by: `businessOutcome`, `architecture`, `e2e_workflow`, `team`, `focus_area`

### Gap E: Extraction prompt improvements (LOCKED)
- Add disambiguation examples for commonly confused types:
  - `task` vs `wbs_task`: task = generic action item; wbs_task = hierarchical WBS breakdown item with track/level/parent context
  - `architecture` vs `arch_node` vs `integration`: architecture = tool in BigPanda workflow (has phase/status); arch_node = capability node within ADR/Biggy track; integration = connection between systems
  - `team` vs `stakeholder`: team = team-level onboarding status row; stakeholder = named individual
- Add status coercers for ALL enum fields (not just the ones fixed in Phase 50):
  - `wbs_task` status: `not_started`|`in_progress`|`complete`|`blocked` (normalize variants)
  - `arch_node` status: normalize to valid `arch_node_status` enum values
  - `onboarding_step` status: normalize free-text to enum
- Add valid track name guidance: "ADR Track" and "AI Assistant Track" are the only valid values for `arch_node.track`
- Add `before_state` entity type description and examples

### Gap F: Per-entity write feedback (LOCKED)
- After `POST /api/ingestion/approve` completes, return structured result:
  ```json
  {
    "written": { "action": 3, "risk": 2, "milestone": 1, ... },
    "skipped": { "arch_node": 1 },
    "errors": []
  }
  ```
- Surface this in the Review Queue UI — replace generic success toast with breakdown per entity type
- Silent failures (currently caught by outer try-catch) must be surfaced in `errors` array

### Gap G: `weekly_focus` bullets (LOCKED)
- No extraction entity type exists for `/api/projects/[projectId]/weekly-focus`
- Add `weekly_focus` entity type to extraction prompt → extracts this-week focus bullets from documents
- Add insert handler → POST to weekly-focus API (replace existing bullets or append)
- Weekly focus is a simple `{ bullets: string[] }` structure

### Gap H: `team_pathway` verification (LOCKED)
- Entity type `team_pathway` exists in approve route but status in extraction prompt is unclear
- Verify it is in the extraction prompt with correct field definitions
- If missing: add it. If present: ensure field names match handler expectations

### Gap I: `workstream` disambiguation (LOCKED)
- `workstream` entity type exists but is easily confused with `task` and `wbs_task` in messy documents
- Add clear disambiguation rule to prompt: workstream = named delivery track/stream (e.g. "ADR Workstream", "Integration Workstream") with owner and percent_complete; not individual tasks
- Verify `percent_complete` coercion handles non-numeric strings (NaN fix from Phase 50 is in place)

### Gap J: `arch_node` track name guidance (LOCKED)
- Extraction prompt must explicitly state valid track names: "ADR Track" and "AI Assistant Track"
- Claude must be told to skip arch_nodes if the track name doesn't match one of these values
- This prevents the Gap C throw scenario from ever occurring at extraction time

### Claude's Discretion
- Order of handler fixes in approve route (suggest: fix throws first, then add new handlers)
- Whether to use a single approval response accumulator or per-entity-type result tracking
- Test strategy for new entity types

</decisions>

<specifics>
## Specific References

**Key files:**
- Extraction prompt: `bigpanda-app/worker/jobs/document-extraction.ts` → `EXTRACTION_SYSTEM` constant
- Approval pipeline: `bigpanda-app/app/api/ingestion/approve/route.ts` → `insertItem()` switch
- Weekly focus API: `bigpanda-app/app/api/projects/[projectId]/weekly-focus/route.ts`
- Before state API: `bigpanda-app/app/api/projects/[projectId]/before-state/route.ts`
- Review Queue UI: `bigpanda-app/components/ReviewQueue.tsx` (or similar)

**DB schema:**
- `beforeState`: `{ id, project_id, aggregation_hub_name, alert_to_ticket_problem, pain_points_json }`
- `teamEngagementSections`: exists but NOT rendered in any Teams tab section
- `archNodes`: pre-seeded per project via project creation API

**Established patterns:**
- Status coercers pattern: `coerceOnboardingStatus()`, `coerceTrackStatus()` in approve route — follow same pattern
- Attribution columns: `source='ingestion'`, `source_artifact_id`, `ingested_at` where schema supports it
- Dedup pattern: `ilike` with wildcard match on name fields before insert

</specifics>

<deferred>
## Deferred Ideas

- Multi-document batch context stitching across extractions before staging
- Re-extraction from existing artifact without re-upload
- Extraction quality score / confidence threshold filtering in UI
- WeeklyFocus auto-generation from project metrics (skill-based, not extraction)
- Time entries extraction (intentionally manual)
- Plan templates extraction (static DB seeds)

</deferred>

---

*Phase: 51-extraction-intelligence-overhaul-full-tab-coverage*
*Context gathered: 2026-04-09 via conversation + Phase 50 UAT + codebase audit*
