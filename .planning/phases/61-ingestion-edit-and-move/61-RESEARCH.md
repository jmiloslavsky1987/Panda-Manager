# Phase 61: Ingestion Edit & Move - Research

**Researched:** 2026-04-14
**Domain:** Ingestion UI (React components + approval route) — field editing, note reclassification, client-side validation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Edit discoverability (INGEST-01)**
- The click-to-expand `ExtractionItemEditForm` pattern in `ExtractionItemRow` is sufficient — do not redesign the UX
- Focus is on verifying that edited fields propagate correctly through the full approval flow end-to-end
- No change to how the edit form is triggered

**Note reclassification UI (INGEST-05)**
- A **Type dropdown** appears at the top of the `ExtractionItemEditForm` when the item's `entityType` is `note`
- Changing the type in the dropdown transforms the visible fields to match the target entity's schema
- Reclassification updates the item's `entityType` in the `ReviewItem` state — the approval route receives the new type and routes to the correct table

**Field mapping on reclassification**
- Note `content` maps to the primary field of the target type:
  - `action` → `description`
  - `task` → `title`
  - `milestone` → `name`
  - `decision` → `decision`
  - `risk` → `description`
- All other note fields (`author`, `date`) are cleared when the type changes
- User fills in the remaining fields of the target schema before approving

**Target types for note reclassification**
- Available targets: **action, task, milestone, decision, risk**
- These five types only — not all 21 entity types

**Field validation**
- Client-side validation on Approve: each item's required primary field must be non-empty
- If a required field is empty, show an **inline error on the offending row** and prevent the Approve button from submitting
- Required fields per type: the first/primary field in `ENTITY_FIELDS` (e.g. `description` for action/risk, `title` for task, `name` for milestone, `decision` for decision)

### Claude's Discretion
- Visual styling of the Type dropdown (size, placement within the form)
- Error indicator style on validation failure (red border on input, inline text, or row-level badge)
- Whether the Type dropdown is disabled for non-note entity types (most likely: yes, show as read-only label)

### Deferred Ideas (OUT OF SCOPE)
- **INGEST-02: Move approved items** — "Move to different workspace section" for already-approved items in the DB was deferred entirely. Not in scope for Phase 61. Consider as a standalone future phase if the need becomes concrete.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INGEST-01 | User can edit extracted field values on an ingested item before approving it | Editing infrastructure already exists (`ExtractionItemEditForm`, `handleSave`, `onChange`); research confirms the pipeline from edit form → `ReviewItem` state → approve POST body is complete. The gap is verifying `edited: true` propagates correctly and that field values survive the full round-trip. |
| INGEST-05 | User can reclassify a note entity to any valid entity type in the draft modal (fields transform to target schema; approved note routes to the correct table on approval) | `ENTITY_FIELDS` already has all 5 target type field definitions. The approve route already handles all 5 target types via `insertItem`. Backend needs zero changes. The work is: (a) `onTypeChange` prop on `ExtractionItemEditForm`, (b) content→primary field mapping in `IngestionModal.handleItemChange`, (c) Type dropdown rendering conditionally for notes. |
</phase_requirements>

---

## Summary

Phase 61 is a **pure front-end surgical change** on an existing, functioning ingestion pipeline. The backend approve route at `/api/ingestion/approve/route.ts` already handles all 5 reclassification target types (`action`, `task`, `milestone`, `decision`, `risk`) and emits correct DB inserts. No API changes are required.

The edit flow (`ExtractionItemEditForm` → `handleSave` → `onChange({ fields, edited: true })` → `handleItemChange` → `reviewItems` state → approve POST body) is complete end-to-end. INGEST-01 work is confirming that `edited: true` is correctly included in the items sent to `/api/ingestion/approve`, the Zod schema on that endpoint accepts it (it does, with `.passthrough()` behavior via `z.array(z.unknown())`), and that field values are merged rather than dropped.

INGEST-05 adds a **Type dropdown** to `ExtractionItemEditForm` conditional on `item.entityType === 'note'`. When the user changes the type, the parent (`IngestionModal` via `ExtractionItemRow`) must (a) remap `content` → target primary field, (b) clear `author`/`date`, (c) update `entityType` in `ReviewItem` state. The approve route then routes the item to the correct table naturally — zero backend work.

Client-side validation before approval submission is needed: check each `approved` item's primary field for emptiness, surface inline row errors, and block the submit.

**Primary recommendation:** Three focused front-end changes — (1) verify edit propagation end-to-end, (2) add `onTypeChange` to edit form + field remapping in modal state, (3) add pre-submit primary field validation in `ExtractionPreview`.

---

## Standard Stack

### Core (already in use — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (Next.js 16) | 16 | UI component state, controlled inputs | Project stack |
| TypeScript | 5.x | Type safety across component props | Project-wide |
| Zod | 3.x | Schema validation in approve route | Already used in approve route |
| Vitest | 1.x | Unit tests, route handler tests | Project test framework |

### Supporting (already present)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/components/ui/button` | (shadcn) | Consistent button styling | All action buttons |
| `@/components/ui/checkbox` | (shadcn) | Approve checkboxes | Row-level approve |
| HTML `<select>` (native) | n/a | Type dropdown for reclassification | Already used for conflict resolution dropdown in `ExtractionItemRow` — consistent pattern |

**Installation:** No new packages required.

---

## Architecture Patterns

### Existing Component Hierarchy

```
IngestionModal.tsx              (state owner: reviewItems: ReviewItem[])
└── ExtractionPreview.tsx       (renders tabs, Approve button, validation gate)
    └── ExtractionItemRow.tsx   (renders one item row, expand/collapse edit form)
        └── ExtractionItemEditForm.tsx  (renders field inputs for entityType)
```

### Data Flow: Edit Propagation (INGEST-01)

```
ExtractionItemEditForm
  onSave(updatedFields)          ← user clicks Save
    ↓
ExtractionItemRow.handleSave(updatedFields)
  onChange({ fields: updatedFields, edited: true })   ← already implemented
    ↓
ExtractionPreview
  onItemChange(globalIndex, changes)
    ↓
IngestionModal.handleItemChange(index, changes)
  setReviewItems(prev => prev.map((item, i) => i === index ? { ...item, ...changes } : item))
    ↓
handleApprove(approvedItems) → POST /api/ingestion/approve
  body: { items: approvedItems.map(item => ({ ...item })) }
```

The `edited` flag is passed as part of `...item` spread. The approve route's `ApprovalItemSchema` uses `z.array(z.unknown())` on items and `ApprovalItemSchema.safeParse` per item, which means extra fields (`edited`, `conflict`, etc.) are silently stripped. **The key fields — `entityType`, `fields`, `approved` — are all preserved.**

### Data Flow: Note Reclassification (INGEST-05)

```
ExtractionItemEditForm (item.entityType === 'note')
  renders: <select> Type dropdown (action/task/milestone/decision/risk)
  onTypeChange(newType)          ← new prop to add
    ↓
ExtractionItemRow
  passes onTypeChange down; calls onChange({ entityType: newType, fields: mappedFields, edited: true })
    ↓
IngestionModal.handleItemChange
  performs content→primary field mapping BEFORE setState:
    const contentValue = prev[index].fields.content ?? ''
    const primaryField = NOTE_RECLASSIFY_PRIMARY_FIELD[newType]
    const newFields = { [primaryField]: contentValue }
    changes = { entityType: newType, fields: newFields, edited: true }
    ↓
reviewItems state updated: entityType = newType, fields = { [primary]: value }
    ↓
approve POST → insertItem routes to correct table by entityType
```

### Field Mapping Constants (define once, use in multiple places)

```typescript
// Source: CONTEXT.md decisions — deterministic mapping
export const NOTE_RECLASSIFY_TARGETS = ['action', 'task', 'milestone', 'decision', 'risk'] as const
export type NoteReclassifyTarget = typeof NOTE_RECLASSIFY_TARGETS[number]

export const NOTE_RECLASSIFY_PRIMARY_FIELD: Record<NoteReclassifyTarget, string> = {
  action: 'description',
  task: 'title',
  milestone: 'name',
  decision: 'decision',
  risk: 'description',
}
```

Define these in `ExtractionItemEditForm.tsx` alongside `ENTITY_FIELDS` — they're used in the edit form (Type dropdown render) and referenced in `IngestionModal` for the field remap.

### Primary Field Map for Validation

```typescript
// Already implicit in ExtractionItemRow.primaryFieldKeys — make explicit for validation
export const PRIMARY_FIELD: Record<string, string> = {
  action: 'description',
  risk: 'description',
  decision: 'decision',
  milestone: 'name',
  task: 'title',
  // ... other types omitted from validation per CONTEXT.md — only required for reclassification targets + all approved items
}
```

The validation gate in `ExtractionPreview.handleSubmit` must check: for each `approved` item, if `item.entityType` has a known primary field, that field must be non-empty.

### Validation Gate Pattern

```typescript
// In ExtractionPreview.handleSubmit (before calling onApprove)
function handleSubmit() {
  const approvedItems = items.filter(i => i.approved)

  // Validate primary fields
  const validationErrors: number[] = []
  for (const item of approvedItems) {
    const primaryField = PRIMARY_FIELD[item.entityType]
    if (primaryField && !item.fields[primaryField]?.trim()) {
      validationErrors.push(items.indexOf(item))
    }
  }
  if (validationErrors.length > 0) {
    setValidationErrorIndices(validationErrors)
    return  // block submission
  }

  onApprove(approvedItems)
}
```

`ExtractionPreview` needs a `validationErrorIndices: Set<number>` state and passes error flag down to `ExtractionItemRow` (which renders inline error indicator).

### Anti-Patterns to Avoid

- **Remapping fields inside `ExtractionItemEditForm`**: The form must NOT own reclassification state. It fires `onTypeChange(newType)` and the parent (IngestionModal via ExtractionItemRow) handles the field remap. Keeps the edit form stateless regarding type changes.
- **Blocking the approve route for validation**: Validation is client-side only. The approve route already handles missing fields gracefully (uses `?? ''` or `?? null` for all DB inserts). Do not add server-side primary-field validation.
- **Re-initializing draft state on type change inside ExtractionItemEditForm**: When `onTypeChange` fires, the parent updates `ReviewItem.entityType` and `ReviewItem.fields`. This causes `ExtractionItemEditForm` to re-render with the new `item` prop. The local `draft` state is initialized from `item` via `useState(() => ...)` — this means a key prop reset is needed on type change, OR the edit form must reset its draft in a `useEffect` on `item.entityType` change.
- **Showing type dropdown for non-note entities**: Non-note entities must show a read-only label for entity type. Rendering a disabled `<select>` for all 21 types adds complexity; a `<p>` or `<span>` label for non-notes is cleaner.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type dropdown styling | Custom select component | Native `<select>` with Tailwind | `ConflictControl` in `ExtractionItemRow` already uses `<select>` — consistent |
| Field label formatting | Custom formatter | Existing `fieldLabel(key)` in `ExtractionItemEditForm` | Already handles `_` → space + title case |
| Field set for each entity type | New field registry | Existing `ENTITY_FIELDS` in `ExtractionItemEditForm` | All 21 types already defined |
| Tab label lookup | New registry | Existing `TAB_LABELS` in `ExtractionPreview` | All 21 types already labelled |
| Approve routing by entity type | Custom dispatch | Existing `insertItem` switch in approve route | Handles all 21 types, including 5 reclassification targets |

**Key insight:** This phase is almost entirely wiring together existing infrastructure. Every piece needed (field registries, DB insert handlers, state update patterns, conflict resolution UX) already exists — the work is adding 3 missing props and one mapping function.

---

## Common Pitfalls

### Pitfall 1: Draft State Stale After Type Change

**What goes wrong:** `ExtractionItemEditForm` initializes `draft` state from `item.fields` via `useState(() => {...})`. When the parent updates `item.entityType` and `item.fields` via `onTypeChange`, the component re-renders with new props but `draft` still holds the old field values — the form shows stale inputs.

**Why it happens:** `useState` initializer only runs once (on mount). Prop changes don't re-initialize state.

**How to avoid:** Two options:
1. Pass a `key={item.entityType}` prop to `ExtractionItemEditForm` from `ExtractionItemRow` — forces remount on type change, reinitializing draft from new item props. Cleanest approach.
2. Add `useEffect(() => { setDraft(reinit()) }, [item.entityType])` inside the form.

**Recommended:** Option 1 (`key` prop reset) — no additional `useEffect`, no dependency array footgun.

### Pitfall 2: `onTypeChange` Prop Bypass of Validation State

**What goes wrong:** When the user reclassifies a note to `task`, the `validationErrorIndices` in `ExtractionPreview` may still reference the old index. Since the `entityType` changes but the array index doesn't, the error state should clear correctly — but if type change fires AFTER a failed submit attempt, the stale error indicator may persist.

**Why it happens:** `validationErrorIndices` is indexed by `items` array position, not by entityType. The position is stable across reclassification.

**How to avoid:** Clear `validationErrorIndices` when any item changes via `handleItemChange`. The simplest fix: call `setValidationErrorIndices(new Set())` at the top of `handleItemChange` in `ExtractionPreview`, or pass `onClearErrors` to `ExtractionItemRow`.

**Alternative:** Recompute validation errors live on each render (derived state) rather than storing them. This eliminates the staleness entirely.

### Pitfall 3: `ExtractionPreview` Tab Does Not Update After Reclassification

**What goes wrong:** Note items appear in the "Notes" tab. After reclassifying to `action`, the item `entityType` changes in state but the user still sees it in the Notes tab (UI doesn't reflect the move).

**Why it happens:** `grouped` in `ExtractionPreview` is derived from `items` on each render. It recalculates every render — so the tab grouping WILL update immediately when `reviewItems` state changes. This is NOT an actual pitfall if the parent state update triggers a re-render.

**Verification:** Confirm that `IngestionModal.handleItemChange` calls `setReviewItems(...)` which triggers a re-render of `ExtractionPreview` with the updated items. The `grouped` recalculation then correctly moves the item to the new tab. **This works correctly by design.**

**Warning sign to watch:** If the item count on the Notes tab badge doesn't decrease after reclassification, the state update is not flowing.

### Pitfall 4: Approve Route Drops `note` Entities Without Reclassification

**What goes wrong:** A note that is NOT reclassified and is approved goes to `engagementHistory`. But after reclassification, if `entityType` is still `'note'` due to a bug, it silently inserts into `engagementHistory` instead of the intended table — no error is thrown.

**Why it happens:** The approve route handles `'note'` → `engagementHistory`. If reclassification mapping fails silently, the item reaches the route as `note` not as `action`/`task`/etc.

**How to avoid:** The Wave 0 test for INGEST-05 should assert that when a reclassified note arrives at the approve route with `entityType: 'action'`, it writes to the `actions` table (not `engagementHistory`). This is verifiable via the existing test mock pattern in `ingestion-approve.test.ts`.

### Pitfall 5: Validation Runs Against All Items, Not Just Approved Items

**What goes wrong:** Validation blocks submit because an unapproved item (checkbox unchecked) has an empty primary field.

**Why it happens:** Iterating `items` instead of `items.filter(i => i.approved)` for validation.

**How to avoid:** Always filter to `approvedItems` first, then validate. Unapproved items are ignored by the approve route anyway.

---

## Code Examples

### ExtractionItemEditForm: Type Dropdown for Notes

```typescript
// Source: based on existing ConflictControl pattern in ExtractionItemRow.tsx
// Only rendered when item.entityType === 'note'
interface ExtractionItemEditFormProps {
  item: ReviewItem
  onSave: (updatedFields: Record<string, string>) => void
  onCancel: () => void
  onTypeChange?: (newType: string) => void  // new prop
}

// Inside ExtractionItemEditForm render, BEFORE the field grid:
{item.entityType === 'note' && onTypeChange && (
  <div className="flex flex-col gap-1 mb-3">
    <label className="text-xs font-medium text-zinc-600">Reclassify as</label>
    <select
      value="note"
      onChange={e => onTypeChange(e.target.value)}
      className="border border-zinc-200 rounded px-2 py-1 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      <option value="note">Note (keep as-is)</option>
      <option value="action">Action</option>
      <option value="task">Task</option>
      <option value="milestone">Milestone</option>
      <option value="decision">Decision</option>
      <option value="risk">Risk</option>
    </select>
  </div>
)}

// For non-note entities — read-only label:
{item.entityType !== 'note' && (
  <p className="text-xs text-zinc-500 mb-3">
    Type: <span className="font-medium text-zinc-700">{item.entityType}</span>
  </p>
)}
```

### ExtractionItemRow: Pass `onTypeChange` Down

```typescript
// ExtractionItemRow receives onTypeChange from ExtractionPreview → IngestionModal
interface ExtractionItemRowProps {
  item: ReviewItem
  globalIndex: number
  isExpanded: boolean
  onToggleExpand: () => void
  onChange: (changes: Partial<ReviewItem>) => void
  onTypeChange?: (newType: string) => void  // new prop
}

// In handleSave — unchanged
// Add handleTypeChange:
function handleTypeChange(newType: string) {
  onTypeChange?.(newType)
}

// Pass to ExtractionItemEditForm with key reset:
{isExpanded && (
  <ExtractionItemEditForm
    key={item.entityType}   // resets draft when type changes
    item={item}
    onSave={handleSave}
    onCancel={handleCancel}
    onTypeChange={handleTypeChange}
  />
)}
```

### IngestionModal: Field Remap on Type Change

```typescript
// NOTE_RECLASSIFY_PRIMARY_FIELD defined in ExtractionItemEditForm and imported
function handleItemChange(index: number, changes: Partial<ReviewItem>) {
  // If entityType is changing (reclassification), remap fields
  if (changes.entityType && changes.entityType !== reviewItems[index]?.entityType) {
    const contentValue = reviewItems[index]?.fields?.content ?? ''
    const primaryField = NOTE_RECLASSIFY_PRIMARY_FIELD[changes.entityType as NoteReclassifyTarget]
    if (primaryField) {
      changes = {
        ...changes,
        fields: { [primaryField]: contentValue },
        edited: true,
      }
    }
  }
  setReviewItems(prev => prev.map((item, i) => i === index ? { ...item, ...changes } : item))
}
```

### ExtractionPreview: Pre-Submit Validation

```typescript
// In ExtractionPreview component — add state:
const [validationErrors, setValidationErrors] = useState<Set<number>>(new Set())

// PRIMARY_FIELD map (can be derived from ENTITY_FIELDS[type][0]):
function getPrimaryField(entityType: string): string | undefined {
  const fields = ENTITY_FIELDS[entityType]
  return fields?.[0]  // first field is always primary per CONTEXT.md
}

function handleSubmit() {
  const approvedItems = items.filter(i => i.approved)
  const errorIndices = new Set<number>()

  items.forEach((item, idx) => {
    if (!item.approved) return
    const primaryField = getPrimaryField(item.entityType)
    if (primaryField && !item.fields[primaryField]?.trim()) {
      errorIndices.add(idx)
    }
  })

  if (errorIndices.size > 0) {
    setValidationErrors(errorIndices)
    return
  }
  setValidationErrors(new Set())
  onApprove(approvedItems)
}

// Pass hasError to ExtractionItemRow:
<ExtractionItemRow
  ...
  hasValidationError={validationErrors.has(globalIdx)}
/>
```

### ExtractionItemRow: Inline Error Display

```typescript
// In ExtractionItemRow — accept hasValidationError prop:
{hasValidationError && (
  <span className="text-xs text-red-600 font-medium shrink-0">Required field empty</span>
)}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual field copy when editing | `ENTITY_FIELDS` registry drives form dynamically | Adding new entity types only requires updating ENTITY_FIELDS |
| Note entities disappear into history | Note reclassification routes to target table | No information loss |
| Silent approve of empty fields | Pre-submit client validation | User gets immediate feedback before HTTP round-trip |

**No deprecated patterns relevant to this phase.**

---

## Open Questions

1. **Does `ExtractionPreview` need to scroll to the first validation error?**
   - What we know: The modal is scrollable; validation errors are per-row
   - What's unclear: Whether the error row is visible without scrolling
   - Recommendation: Implement error indicators first; add auto-scroll only if the verifier flags discoverability

2. **Should the Notes tab badge count decrease immediately after reclassification?**
   - What we know: `grouped` in `ExtractionPreview` is derived from `items` on each render — it recalculates when state updates. Yes, it will update immediately.
   - What's unclear: Nothing — this is confirmed working by architecture.
   - Recommendation: Include in Wave 0 test assertions.

3. **`team_engagement` in approve route vs. `EntityType`**
   - What we know: `ApprovalItemSchema` in the approve route includes `'team_engagement'` in its entity type enum, but `EntityType` in `extraction-types.ts` does NOT include it. This is a pre-existing inconsistency.
   - What's unclear: Whether this causes any TypeScript errors in practice
   - Recommendation: Out of scope for Phase 61 — do not touch this inconsistency.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (no version pin — latest installed) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run tests/extraction/ tests/ingestion/write.test.ts app/api/__tests__/ingestion-approve.test.ts` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INGEST-01 | `edited: true` flag included in items sent to approve route | unit | `cd bigpanda-app && npx vitest run tests/ingestion/write.test.ts -t "edited"` | ❌ Wave 0 |
| INGEST-01 | Field values from edit form survive full round-trip to approve POST body | unit | `cd bigpanda-app && npx vitest run tests/extraction/extraction-item-row-fields.test.ts` | ❌ Wave 0 (extend existing) |
| INGEST-05 | Note reclassify: `content` maps to `description` for action/risk | unit | `cd bigpanda-app && npx vitest run tests/extraction/ -t "reclassif"` | ❌ Wave 0 |
| INGEST-05 | Note reclassify: `content` maps to `title` for task | unit | `cd bigpanda-app && npx vitest run tests/extraction/ -t "reclassif"` | ❌ Wave 0 |
| INGEST-05 | Note reclassify: `content` maps to `name` for milestone | unit | `cd bigpanda-app && npx vitest run tests/extraction/ -t "reclassif"` | ❌ Wave 0 |
| INGEST-05 | Note reclassify: `content` maps to `decision` for decision | unit | `cd bigpanda-app && npx vitest run tests/extraction/ -t "reclassif"` | ❌ Wave 0 |
| INGEST-05 | Reclassified note with `entityType: 'action'` routes to actions table in approve route | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/ingestion-approve.test.ts -t "reclassif"` | ❌ Wave 0 |
| INGEST-01 | Validation: empty primary field blocks submit, shows error indicator | unit | `cd bigpanda-app && npx vitest run tests/extraction/ -t "validation"` | ❌ Wave 0 |
| INGEST-01 | Validation: unapproved items are excluded from validation | unit | `cd bigpanda-app && npx vitest run tests/extraction/ -t "validation"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd bigpanda-app && npx vitest run tests/extraction/ tests/ingestion/write.test.ts`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `bigpanda-app/tests/extraction/ingestion-edit-propagation.test.ts` — covers INGEST-01 (edited flag, field round-trip, validation logic)
- [ ] `bigpanda-app/tests/extraction/note-reclassification.test.ts` — covers INGEST-05 (all 5 content→primary field mappings, entityType change)
- [ ] `bigpanda-app/app/api/__tests__/ingestion-approve-reclassify.test.ts` — covers INGEST-05 approve route routing for reclassified notes

*(No new framework or fixture files needed — existing `vi.mock('@/db')` pattern from `write.test.ts` and `ingestion-approve.test.ts` is reusable)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `bigpanda-app/components/ExtractionItemEditForm.tsx` — ENTITY_FIELDS registry, component interface
- Direct code inspection: `bigpanda-app/components/ExtractionItemRow.tsx` — edit form wiring, `handleSave`, `onChange` bridge
- Direct code inspection: `bigpanda-app/components/IngestionModal.tsx` — `ReviewItem` type, `handleItemChange`, `handleApprove`
- Direct code inspection: `bigpanda-app/components/ExtractionPreview.tsx` — `handleSubmit`, tab grouping, Approve button
- Direct code inspection: `bigpanda-app/app/api/ingestion/approve/route.ts` — `ApprovalItemSchema`, `insertItem` (all 5 target types confirmed), `case 'note'` handler
- Direct code inspection: `bigpanda-app/lib/extraction-types.ts` — `EntityType` union, `ExtractionItem` interface
- Direct code inspection: `bigpanda-app/vitest.config.ts` — test setup, aliases

### Secondary (MEDIUM confidence)
- `bigpanda-app/tests/extraction/*.test.ts` — test pattern reference for Wave 0 stub structure
- `bigpanda-app/app/api/__tests__/ingestion-approve.test.ts` — mock pattern for approve route tests
- `bigpanda-app/tests/ingestion/write.test.ts` — full Drizzle mock pattern for DB tests

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing dependencies, no new libraries
- Architecture: HIGH — all components read directly, data flow traced end-to-end in source
- Pitfalls: HIGH — identified from actual component implementations (stale draft state is a confirmed React pattern, tab reclassification verified by derived state analysis)

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable codebase, no external dependencies)
