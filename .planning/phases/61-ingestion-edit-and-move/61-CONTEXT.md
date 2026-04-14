# Phase 61: Ingestion Edit & Move - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can correct extraction errors before approval (edit any field in the draft modal) and reclassify misidentified note entities to a valid target type before approving. INGEST-02 (move approved items post-approval) is deferred — see Deferred Ideas below.

</domain>

<decisions>
## Implementation Decisions

### Edit discoverability (INGEST-01)
- The click-to-expand `ExtractionItemEditForm` pattern in `ExtractionItemRow` is sufficient — do not redesign the UX
- Focus is on verifying that edited fields propagate correctly through the full approval flow end-to-end
- No change to how the edit form is triggered

### Note reclassification UI (INGEST-05)
- A **Type dropdown** appears at the top of the `ExtractionItemEditForm` when the item's `entityType` is `note`
- Changing the type in the dropdown transforms the visible fields to match the target entity's schema
- Reclassification updates the item's `entityType` in the `ReviewItem` state — the approval route receives the new type and routes to the correct table

### Field mapping on reclassification
- Note `content` maps to the primary field of the target type:
  - `action` → `description`
  - `task` → `title`
  - `milestone` → `name`
  - `decision` → `decision`
  - `risk` → `description`
- All other note fields (`author`, `date`) are cleared when the type changes
- User fills in the remaining fields of the target schema before approving

### Target types for note reclassification
- Available targets: **action, task, milestone, decision, risk**
- These five types only — not all 21 entity types

### Field validation
- Client-side validation on Approve: each item's required primary field must be non-empty
- If a required field is empty, show an **inline error on the offending row** and prevent the Approve button from submitting
- Required fields per type: the first/primary field in `ENTITY_FIELDS` (e.g. `description` for action/risk, `title` for task, `name` for milestone, `decision` for decision)

### Claude's Discretion
- Visual styling of the Type dropdown (size, placement within the form)
- Error indicator style on validation failure (red border on input, inline text, or row-level badge)
- Whether the Type dropdown is disabled for non-note entity types (most likely: yes, show as read-only label)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExtractionItemEditForm.tsx` → `ENTITY_FIELDS`: Already has field definitions for all 21 types including `note` and the 5 reclassification targets — use directly for rendering the transformed field set
- `ExtractionItemRow.tsx`: Click-to-expand wiring for `ExtractionItemEditForm` already in place — `handleSave(updatedFields)` calls `onChange({ fields: updatedFields, edited: true })`
- `ReviewItem` type in `IngestionModal.tsx`: Has `entityType`, `fields`, `edited`, `approved` — add `entityType` mutation support here for reclassification
- `handleItemChange(index, changes)` in `IngestionModal.tsx`: Already accepts `Partial<ReviewItem>` — can pass `{ entityType: newType, fields: mappedFields, edited: true }` to reclassify
- `/api/ingestion/approve/route.ts`: Already accepts the full `entityType` enum and routes to the correct table — no backend changes needed for reclassification if the frontend sends the correct type

### Established Patterns
- `ENTITY_FIELDS` keyed by entity type: use to derive the field set after type change
- `metrics:invalidate` CustomEvent: fire after approval to refresh cross-tab counts
- `requireSession()` at route level: already in place on the approve endpoint

### Integration Points
- `ExtractionItemEditForm.tsx`: Add a `onTypeChange?: (newType: EntityType) => void` prop (only rendered when `item.entityType === 'note'`) — parent handles the field remapping in state
- `ExtractionItemRow.tsx`: Pass `onTypeChange` down to the edit form; the `onChange` callback is already the bridge to `IngestionModal` state
- `IngestionModal.tsx` → `handleItemChange`: When `entityType` changes, also remap `fields` using the content-to-primary-field mapping before updating state
- `ExtractionPreview.tsx` → Approve button: Add validation pass before calling `onApprove` — check all approved items for empty primary fields

</code_context>

<specifics>
## Specific Ideas

- The Type dropdown should only render inside `ExtractionItemEditForm` when `item.entityType === 'note'` — non-note entities show the type as a read-only label (no reclassification option)
- The content-to-primary-field mapping is deterministic: note `content` → target's first primary field, everything else cleared

</specifics>

<deferred>
## Deferred Ideas

- **INGEST-02: Move approved items** — "Move to different workspace section" for already-approved items in the DB was deferred entirely. Not in scope for Phase 61. Consider as a standalone future phase if the need becomes concrete.

</deferred>

---

*Phase: 61-ingestion-edit-and-move*
*Context gathered: 2026-04-14*
