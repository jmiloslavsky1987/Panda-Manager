# Phase 12: Complete Workspace Write Surface — Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Every workspace tab built read-only in Phase 2 now has a working write surface: Artifacts get their own new 13th tab, Decisions can be appended to via a modal, Architecture workstream cards can be edited, and Teams shows an editable percent_complete slider. All "available in Phase 3" placeholder banners are removed. No new DB tables required.

</domain>

<decisions>
## Implementation Decisions

### Architecture Inline Edit
- **Trigger:** Edit button (top-right of each workstream card) opens a shadcn Dialog modal — same pattern as ActionEditModal/RiskEditModal
- **Fields exposed:** `state` (multi-line textarea, preserves whitespace-pre-wrap behavior) + `lead` (text input) only
- **On save:** Auto-set `last_updated` to today's date (keeps stall detection in Teams tab accurate); router.refresh() after successful save
- **API route:** PATCH `/api/workstreams/[id]` — new route needed

### Decisions "Add Decision" Modal
- **Trigger:** "Add Decision" button next to the page heading (top-right of the header row) — same positioning as Add buttons on other tabs
- **Fields exposed:** `decision` (required textarea) + `context` (optional textarea) only
- **Auto-set on save:** `date` = today's date; `source` = 'manual_entry'
- **After save:** router.refresh() — decision appears at top of chronological list (sorted newest-first)
- **API route:** POST `/api/decisions` — new route needed

### Artifacts Tab
- **Nav position:** 13th tab, after Time — minimal disruption to existing tab order
- **Route:** `/customer/[id]/artifacts`
- **Layout:** Table (like Actions/Risks/Milestones) — columns: ID (X-NNN), Name, Status, Owner; click row opens edit modal
- **Create modal fields:** `name` (required), `status`, `owner`; `external_id` auto-assigned by API (next sequential X-NNN for the project); `description` optional
- **Create + Edit:** same modal component (ArtifactEditModal), mode determined by whether an artifact record is passed
- **"New Artifact" button:** next to heading, top-right — consistent with other tabs
- **API routes:** GET `/api/artifacts?projectId=X` + POST `/api/artifacts` + PATCH `/api/artifacts/[id]`

### Teams percent_complete Edit
- **Interaction:** Inline HTML range slider (0–100) in the Teams tab table — new "Progress" column added to WorkstreamTable
- **Save trigger:** A small "Save" button appears when the slider value changes; user clicks Save to commit
- **After save:** router.refresh() — health score will reflect updated value on next Dashboard visit (no same-page health badge update needed)
- **Override behavior:** Manual edit writes directly to `workstreams.percent_complete`; if tasks change later, `updateWorkstreamProgress()` will recalculate and overwrite — no lock flag needed
- **API route:** PATCH `/api/workstreams/[id]` (same route as Architecture edit, different fields)

### Optimistic UI / Error Handling
- All write operations follow Phase 3 convention: optimistic "Saving…" state, error toast on failure, router.refresh() on success
- No new conventions needed — extend existing patterns

### Placeholder Banner Cleanup
- Remove amber "available in Phase 3" banner from Decisions tab
- Remove blue "Inline editing available in Phase 3" banner from Architecture tab
- Any other similar banners across tabs should be removed

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ActionEditModal.tsx` / `RiskEditModal.tsx`: Complete reference implementation for the modal write pattern — shadcn Dialog + form state + fetch PATCH + router.refresh() + error handling. Architecture and Artifact modals should follow this exactly.
- `WorkspaceTabs.tsx`: 12-tab TABS array — add `{ label: 'Artifacts', segment: 'artifacts' }` at position 13 (after `time`)
- `updateWorkstreamProgress()` in `lib/queries.ts`: Already handles percent_complete recalculation from tasks — Phase 12 writes to the same column via a direct DB update (no need to call this function from the manual edit route)
- `computeHealth()` in `lib/queries.ts`: Reads `workstreams.percent_complete` — no changes needed; health score auto-updates on next read after DB write
- `getWorkspaceData()` in `lib/queries.ts`: Already returns `workstreams` and `keyDecisions` — check if it also returns `artifacts`; if not, extend it or create `getArtifacts(projectId)`

### Established Patterns
- Modal trigger: `DialogTrigger asChild` wrapping a `<span data-testid="...">` or `<Button>`
- Write route pattern: `app/api/[resource]/[id]/route.ts` for PATCH, `app/api/[resource]/route.ts` for POST
- `router.refresh()` after all mutations (RSC re-fetch)
- Error state: `setError(data.error ?? 'Save failed')` shown inline in modal
- Saving state: `setSaving(true)` disables submit button and shows "Saving…"

### Integration Points
- `WorkspaceTabs.tsx` — add Artifacts tab entry
- `lib/queries.ts` — add `getArtifacts(projectId)` and/or extend `getWorkspaceData()` to include artifacts
- `app/api/workstreams/[id]/route.ts` — new PATCH route (state + lead, or percent_complete — same route, conditional field update)
- `app/api/decisions/route.ts` — new POST route (append key_decision)
- `app/api/artifacts/route.ts` + `app/api/artifacts/[id]/route.ts` — new GET/POST/PATCH routes

</code_context>

<specifics>
## Specific Ideas

- Architecture edit: the existing card renders `ws.state` with `whitespace-pre-wrap` — the textarea must preserve this (no trimming on save)
- Artifacts table: external_id format is X-NNN (e.g. X-001, X-002) — API auto-assigns next sequential ID per project
- Teams slider: show current percent value as a text label next to the slider (e.g. "42%") so the user can see the exact number while dragging

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-complete-workspace-write-surface*
*Context gathered: 2026-03-25*
