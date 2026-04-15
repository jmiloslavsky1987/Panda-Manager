# Phase 62: Ingestion Consolidation - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Document scanning and completeness analysis are unified into the Document Ingestion tab. "Scan for Updates" button is removed from the workspace layout header and consolidated into ContextTab as its own dedicated section. "Analyze Completeness" is enhanced with per-tab numeric scoring (0-100%) alongside existing status badges, and upgraded to detect missing, sparse, AND conflicting data. Analysis results are tagged with a schema version to prevent retroactive scoring drift.

</domain>

<decisions>
## Implementation Decisions

### Scan for Updates placement (INGEST-03)
- `ScanForUpdatesButton` is removed from `app/customer/[id]/layout.tsx` entirely
- A new dedicated card section is added to `ContextTab.tsx` — positioned **above** the existing Upload section
- Section title: "Scan for Updates" with the button + source dropdown selector living inside
- The button component itself (`ScanForUpdatesButton.tsx`) is unchanged — only its mounting location moves

### Completeness scoring display (INGEST-04)
- Keep existing status badges (complete / partial / empty) — do NOT replace them
- Add a numeric % score alongside each badge (e.g., "partial — 43%")
- Score is computed per tab: Claude returns both `status` and `score` (0–100 integer) in the JSON schema
- The existing accordion layout (expandable gap list per tab) is retained

### Conflicting data detection (INGEST-04)
- Claude's discretion — Claude identifies conflicts naturally during analysis
- Examples: milestone marked complete but lacking a completion date; risk rated critical with no mitigation plan
- No predefined contradiction rules — Claude flags what it finds semantically meaningful
- The `status` field gains an additional valid value: `conflicting` (alongside existing complete/partial/empty)
- Gap descriptions for conflicting entries must name the specific records and fields in conflict

### Versioned schema (Success Criteria #4)
- Each analysis run stores the schema version used (e.g., `schemaVersion: "v1"`)
- The `TAB_TEMPLATE_REGISTRY` gets a `COMPLETENESS_SCHEMA_VERSION` constant (e.g., `"v1"`)
- The POST response includes `schemaVersion` alongside the results array
- Frontend displays the schema version tag on the completeness panel header (small, muted text)
- Existing results stored in component state are not retroactively affected — they show their version

### Claude's Discretion
- Exact visual weight/position of the % score relative to the status badge
- Whether `conflicting` status uses a distinct color (e.g., orange vs yellow for partial)
- Schema version display format in the UI (e.g., "v1" badge, small footnote, tooltip)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ScanForUpdatesButton.tsx`: Fully self-contained — accepts `projectId` prop, handles source selection, SSE streaming, toast feedback. No changes needed to the component itself; just re-mount it inside ContextTab's new Scan section.
- `ContextTab.tsx` Section 3 (Completeness): Already has `handleAnalyze`, `completeness` state, accordion expand/collapse — extend in place rather than rewrite
- `app/api/projects/[projectId]/completeness/route.ts` POST handler: Already returns `{ tabId, status, gaps }[]` via Claude structured output (`json_schema` format). Add `score: number` and update `status` enum to include `'conflicting'`
- `COMPLETENESS_SYSTEM` prompt in `route.ts`: Already instructs Claude to be specific (record IDs, exact fields) — extend to also detect conflicting data and return a `score` per tab
- `TAB_TEMPLATE_REGISTRY` in `lib/tab-template-registry.ts`: Add `COMPLETENESS_SCHEMA_VERSION = "v1"` constant here

### Established Patterns
- Structured output via `output_config.format json_schema`: Already in use for completeness — extend the schema to add `score` field and `"conflicting"` to the status enum
- `requireProjectRole(id, 'user')` auth guard: Already on both GET and POST completeness endpoints — no change
- Card section pattern in `ContextTab.tsx`: Each section is `<section className="rounded-lg border bg-card p-6">` — follow same pattern for the new Scan section
- Badge colors: `bg-green-100 text-green-800` (complete), `bg-yellow-100 text-yellow-800` (partial), `bg-gray-100 text-gray-600` (empty) — add an orange variant for `conflicting`

### Integration Points
- `app/customer/[id]/layout.tsx` line 6 + 78: Remove `ScanForUpdatesButton` import and JSX — button no longer lives in layout
- `ContextTab.tsx`: Add new Scan section above Section 1 (Upload). Import `ScanForUpdatesButton` here.
- `route.ts` (POST completeness): Update `json_schema` to add `score: integer (0-100)` and `"conflicting"` to status enum. Add `schemaVersion` field to response wrapper.
- `COMPLETENESS_SYSTEM` prompt: Add instructions for `score` (how to calculate) and `conflicting` detection

</code_context>

<specifics>
## Specific Ideas

- The Scan section placement (above Upload) makes the tab read as a workflow: Scan → Upload → Review History → Analyze Completeness — a natural top-to-bottom flow
- % score is additive, not a replacement — the badge label stays ("partial") but the number gives a finer signal

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 62-ingestion-consolidation*
*Context gathered: 2026-04-14*
