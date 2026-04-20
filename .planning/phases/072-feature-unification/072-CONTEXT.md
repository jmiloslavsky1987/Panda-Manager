# Phase 72: Feature Unification - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate all duplicate implementations and UX inconsistencies identified in the Phase 71 Feature Consistency Audit. Every finding in `FEATURE-CONSISTENCY-AUDIT.md` must be resolved — either by code change, rename, or documented as intentional. No new features in this phase.

Audit report: `.planning/phases/71-feature-consistency-audit/FEATURE-CONSISTENCY-AUDIT.md`

</domain>

<decisions>
## Implementation Decisions

### Scope — all 13 findings close in Phase 72
- High priority first: DB enum migration for Risks + Milestones status (data integrity)
- Medium priority second: text search for Risks/Milestones, EmptyState for WorkstreamTableClient, filter-zero-results display fix in DecisionsTableClient
- Low priority last: SearchBar/GlobalSearchBar renames, InlineEditModal rename, severity enum test, document intentional differences
- Findings marked "intentional exclusion" (Decisions bulk actions, Workstreams bulk actions, Decisions no edit modal) are resolved by adding inline `// intentional:` comments — not by implementing the "missing" features

### DB migration approach — standard Drizzle migration
- Use `drizzle-kit generate` to produce a new numbered SQL migration file in `db/migrations/`
- Migration sequence for each table (risks, milestones):
  1. Add `riskStatusEnum`/`milestoneStatusEnum` pgEnum to `db/schema.ts`
  2. Run an UPDATE in the migration to normalize any non-standard status values to their closest valid enum value before adding the constraint (needed because xlsx import can produce raw strings)
  3. ALTER COLUMN to use the new enum type
- The `migrate-local.ts` xlsx importer already validates severity before inserting; update it the same way to validate risk/milestone status against the new enum values
- No separate rollback script — Drizzle migrations are forward-only in this project (existing pattern)
- Normalization mapping for risks: null stays null; 'open' → 'open'; 'mitigated' → 'mitigated'; 'resolved' → 'resolved'; 'accepted' → 'accepted'; anything else → null
- Normalization mapping for milestones: null stays null; 'not_started' → 'not_started'; 'in_progress' → 'in_progress'; 'completed' → 'completed'; 'blocked' → 'blocked'; anything else → 'not_started'

### Text search — client-side only, matching ActionsTableClient pattern
- Add `q` (text search) filter to both `RisksTableClient` and `MilestonesTableClient`
- Risks: search on `description` and `mitigation` fields (client-side filter on loaded data)
- Milestones: search on `name` and `notes` fields (client-side filter on loaded data)
- No server-side `?q=` param changes to API routes — the filter bar approach already loads all rows per project; row counts per project are small enough that in-memory filtering is sufficient
- Match the exact filter UI pattern used in `ActionsTableClient`: controlled `q` state, `<Input>` in the filter bar row, filter applied inside the `useMemo` that builds `filteredItems`

### EmptyState unification — WorkstreamTableClient
- Replace the inline `<p className="text-zinc-400 text-sm py-4">` empty state in `WorkstreamTableClient.tsx` with the `<EmptyState>` component
- Text: title = "No workstreams yet", description = "Workstreams organize delivery tracks. Add the first workstream to get started."
- Action CTA: omit or use `onClick: () => {}` placeholder (no AddWorkstreamModal exists) — match audit recommendation

### Filter-zero-results display — DecisionsTableClient
- Update `DecisionsTableClient.tsx` to wrap the "No decisions match your filters." message in `<TableRow><TableCell colSpan={N}>...</TableCell></TableRow>` structure
- Match the in-table empty row pattern used by Actions, Risks, Milestones (single row spanning all columns)

### Component renames — low priority, same PR/wave
- `SearchBar.tsx` → `GlobalProjectSearchBar.tsx` (searches all projects — naming was backwards)
- `GlobalSearchBar.tsx` → `WorkspaceSearchBar.tsx` (searches within a workspace/project)
- `components/teams/InlineEditModal.tsx` → `TeamMetadataEditModal.tsx` (edits project-level team metadata, not entity rows)
- Update all import paths for each rename

### Severity enum consistency — test assertion
- Add a Vitest unit test asserting that `SEVERITY_OPTIONS.map(o => o.value)` exactly matches the DB enum values `['low', 'medium', 'high', 'critical']`
- Place in existing test suite alongside other schema/constant tests
- This makes the duplication (DB enum + component constant) self-guarding

### Documentation of intentional design differences — inline comments
- Add `// intentional: Decisions are append-only — no bulk actions or status lifecycle` comment to `DecisionsTableClient.tsx`
- Add `// intentional: Workstreams use progress-slider UX — bulk status updates not applicable` comment to `WorkstreamTableClient.tsx`
- Add `// intentional: Decisions are immutable append-only records — no edit modal` comment to `DecisionsTableClient.tsx`
- Add `// intentional: SearchBar serves all-project search scope; WorkspaceSearchBar serves single-project scope — two components are correct` to each file header

### Claude's Discretion
- Exact SQL in the Drizzle migration for data normalization (CASE WHEN ... END pattern or separate UPDATE)
- Order of changes within each wave (schema first, then component changes)
- Whether to combine risk + milestone enum migration into one migration file or two
- Exact column count for `colSpan` in DecisionsTableClient fix
- Whether to co-locate the severity enum test with existing component tests or schema tests

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmptyState` component: already used by Actions, Risks, Milestones, Decisions — drop-in for WorkstreamTableClient
- `ActionsTableClient.tsx`: canonical pattern for filter bar, text search (`q` state), bulk actions, in-table empty row — use as reference for Risks and Milestones updates
- `InlineSelectCell`, `OwnerCell`, `DatePickerCell`: inline editing components — no changes needed, already well-used
- `actionStatusEnum` / `severityEnum` in `db/schema.ts`: canonical examples for how new `riskStatusEnum` + `milestoneStatusEnum` should be defined and wired

### Established Patterns
- Drizzle migration files: numbered SQL files in `db/migrations/` (latest: `0035_*.sql`); run via `drizzle-kit generate` then applied manually; migrations are forward-only
- Filter bar pattern: `ActionsTableClient` has q/status/owner/date filters all in a flex row above the table — same pattern to replicate for Risks (add text search) and Milestones (add text search)
- `drizzle.config.ts`: `schema: './db/schema.ts'`, `out: './db/migrations'`, dialect postgresql — standard setup

### Integration Points
- `db/schema.ts` (lines 182, 200): `risks.status` and `milestones.status` are `text('status')` — change to pgEnum after adding enum definition
- `scripts/migrate-local.ts` (lines 411, 442): inserts `risk.status` and `ms.status` as raw strings from xlsx/YAML — update to validate against new enum values the same way severity is validated (lines 395-402)
- `components/WorkstreamTableClient.tsx` (line 62): inline `<p>` empty state — direct replacement
- `components/DecisionsTableClient.tsx` (line 133): inline `<p>` filter-zero message — wrap in TableRow/TableCell
- `components/SearchBar.tsx` and `components/GlobalSearchBar.tsx`: file-level renames; grep all import sites before renaming
- `components/teams/InlineEditModal.tsx`: file-level rename; grep import sites

</code_context>

<specifics>
## Specific Ideas

- The severity validation pattern in `migrate-local.ts` (lines 395-402: explicitly checks each valid value, falls back to null) is the exact same pattern to apply to risk and milestone status validation — consistent, already in the file
- The audit confirmed Add modals are fully consistent and API route auth is fully consistent — no changes needed in those areas
- Decisions append-only design: the audit noted this could be extended with a "supersede decision" feature (new decision with `supersedes_id` FK) if editing is ever needed — this is explicitly deferred

</specifics>

<deferred>
## Deferred Ideas

- "Supersede decision" feature (new decision with `supersedes_id` FK, for correcting immutable decisions) — future phase if user feedback requests it
- Workstream bulk progress updates (e.g., "mark all 100% complete") — future phase if workstream row counts grow
- Workstream filter bar (track/lead/progress-range filters) — only warranted if workstream row counts exceed ~20 per project
- Add `owner` column to `key_decisions` table (to enable owner filter) — deferred from audit; not a v8.0 requirement

</deferred>

---

*Phase: 072-feature-unification*
*Context gathered: 2026-04-20*
