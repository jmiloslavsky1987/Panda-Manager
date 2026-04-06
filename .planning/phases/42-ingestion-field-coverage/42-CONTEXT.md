# Phase 42: Ingestion Field Coverage - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the document ingestion pipeline — two touch points only:
1. **Extraction prompt** (`worker/jobs/document-extraction.ts`) — teach Claude to extract all missing fields
2. **Approve route** (`app/api/ingestion/approve/route.ts`) — write those fields to the DB, including cross-entity FK resolution

Uploading a project document must produce fully-populated entities: tasks with dates and milestone/workstream links, risks with severity, decisions with rationale, milestones with owner, stakeholders with company. Every field the DB schema supports should be populated after ingestion — no silent drops.

This is a backend-only phase except for two UI additions: new fields visible in approval cards, and an unresolved-reference count in the approval summary response.

</domain>

<decisions>
## Implementation Decisions

### Cross-entity linking (task→milestone, task→workstream)
- Auto-link using ilike fuzzy match — same mechanism already used by dedup logic
- If exactly one match found → set `milestone_id` / `workstream_id` FK automatically
- If zero or multiple matches → leave FK null (see Unmatched reference handling)
- Extract milestone and workstream names **verbatim** — no Claude normalization or inference; exact document text gives the DB lookup the best chance of matching
- Same fuzzy-match logic applies to both: task→milestone and task→workstream

### Owner-to-stakeholder resolution
- The user wants owner fields to reference stakeholder records, but there are no `stakeholder_id` FK columns on tasks/actions/risks/milestones — `owner` is text everywhere
- Implementation: instruct the extraction prompt to extract owner names verbatim as they appear in the document (no abbreviation, no normalization), so they naturally align with stakeholder `name` values in the DB
- No FK resolution possible; this is a data quality/consistency improvement to the extraction prompt only

### Unmatched reference handling
- task→milestone no match: leave `milestone_id` null AND store the extracted raw name in `task.description` (appended as "Milestone ref: [name]" if description is otherwise empty, or appended to existing description) so the reference isn't silently lost
- task→workstream no match: leave `workstream_id` null silently — no extra action
- After approval completes: include a plain-text notice in the approval API response if any tasks had unresolved milestone references, e.g. `"3 tasks had unresolved milestone references — link them manually via the Plan tab"`
- No retroactive backfill: existing tasks with null FKs are never touched when new milestones arrive later

### Update path (re-ingestion behavior)
- Universal **fill-null-only** policy: ingested values fill empty DB fields; never overwrite values a user manually set
- Applies to ALL new fields: `task.start_date`, `task.due`, `task.milestone_id`, `task.workstream_id`, `risk.severity`, `decision.context` (rationale), `milestone.owner`, `stakeholder.company`
- Exception clarification: `milestone_id` FK on task UPDATE can be set if currently null — consistent with fill-null-only
- Existing update paths for actions/risks/milestones/tasks must be extended with the new fields under this policy

### Approval UI visibility
- New fields ARE shown in existing approval card layout before commit — no blind writes
- Task cards show: `start_date`, `due`, `milestone_name` (raw extracted name, not resolution status), `priority`, `description`
- Risk cards show: `severity`
- Decision cards show: `rationale`
- Milestone cards show: `owner`
- Resolved milestone link shown as extracted name only — not "→ linked" or "→ unresolved" status indicator
- Confidence scores remain internal only — not exposed in UI

### Extraction prompt additions (per entity type)
- **task**: add `start_date` (ISO date), `due_date` (ISO date), `milestone_name` (verbatim), `workstream_name` (verbatim), `priority` (high/medium/low), `description`
- **risk**: `severity` already in prompt — no change needed; fix is in the approve route
- **milestone**: add `owner` (verbatim name)
- **stakeholder**: `account` is already extracted but maps to `company` in DB — fix the field name mapping in approve route (already done in update path, verify insert path)
- **decision**: `rationale` already extracted — fix is in the approve route (add `context: f.rationale` to insert/update)
- **action**: add `notes`, `type` (minor fields, not critical)

### Claude's Discretion
- Exact ilike pattern for cross-entity resolution (e.g., `%name%` vs `name%` — Claude decides based on what the existing dedup uses)
- Whether to run cross-entity resolution before or after the dedup check
- Error handling if the DB lookup itself fails during resolution (should not block entity creation)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/extraction-types.ts` — dedup/find-existing logic per entity type; cross-entity resolution follows same ilike pattern
- `app/api/ingestion/approve/route.ts` — three code paths: INSERT new, UPDATE existing, DELETE; new fields added to each
- `worker/jobs/document-extraction.ts` — extraction prompt string; entity type guidance section is where new fields are added
- Existing ilike fuzzy-match in `lib/extraction-types.ts` for tasks: `ilike(tasks.title, `${key}%`)` — same pattern for milestone/workstream name lookup

### Established Patterns
- `requireSession()` at every route handler — locked, must apply to any new API surface
- Attribution fields (`source`, `source_artifact_id`, `ingested_at`) already applied uniformly to all entities — keep
- `router.refresh()` after PATCH mutations — approval route uses `revalidatePath`, same effect
- Fill-null-only via `f.field ?? undefined` — already used in update paths; extend to new fields

### Integration Points
- Approval card UI (`app/customer/[id]/context/` client components) — new fields need to be rendered in the existing card layout; server already passes `item.fields` to the client
- Approval API response shape — add `unresolvedMilestoneRefs: number` (or similar) to the response body for the summary notice
- Cross-entity resolution happens inside the `insertNewItem` function in `approve/route.ts`, before the DB insert

</code_context>

<specifics>
## Specific Ideas

- Unresolved milestone name stored in task description as: `"Milestone ref: [name]"` appended — keeps it visible without a dedicated column
- The approval summary notice uses plain text, not a link: `"N tasks had unresolved milestone references — link them manually via the Plan tab"`
- Verbatim extraction instruction in prompt: add guidance like "extract names exactly as they appear in the document; do not abbreviate, normalize, or infer"

</specifics>

<deferred>
## Deferred Ideas

- Retroactive backfill: scanning existing tasks when a new milestone is approved to resolve previously unlinked FKs — explicitly out of scope, user chose no backfill
- Confidence score display in approval cards — user chose internal-only
- Dedicated unresolved-links resolution UI with dropdowns — plain text count is sufficient for now
- `stakeholder_id` FK columns on tasks/actions/risks — no such columns exist in schema; owner-as-text is the current architecture; adding FK columns is a schema migration that belongs in a future data model phase

</deferred>

---

*Phase: 42-ingestion-field-coverage*
*Context gathered: 2026-04-06*
