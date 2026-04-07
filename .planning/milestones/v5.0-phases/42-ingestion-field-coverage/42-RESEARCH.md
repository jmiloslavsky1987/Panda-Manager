# Phase 42: Ingestion Field Coverage - Research

**Researched:** 2026-04-07
**Domain:** Document ingestion pipeline — LLM extraction prompt + Drizzle ORM approve route
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase Boundary — Two touch points only:**
1. Extraction prompt (`worker/jobs/document-extraction.ts`) — teach Claude to extract all missing fields
2. Approve route (`app/api/ingestion/approve/route.ts`) — write those fields to DB, including cross-entity FK resolution

**Cross-entity linking (task→milestone, task→workstream):**
- Auto-link using ilike fuzzy match — same mechanism already used by dedup logic
- If exactly one match found → set `milestone_id` / `workstream_id` FK automatically
- If zero or multiple matches → leave FK null
- Extract milestone and workstream names verbatim — no Claude normalization or inference
- Same fuzzy-match logic applies to both: task→milestone and task→workstream

**Owner-to-stakeholder resolution:**
- No FK resolution possible — `owner` is text on all tables; no `stakeholder_id` FK columns exist
- Fix is prompt-only: extract owner names verbatim so they naturally align with stakeholder `name` values

**Unmatched reference handling:**
- task→milestone no match: leave `milestone_id` null AND store extracted raw name as "Milestone ref: [name]" appended to `task.description`
- task→workstream no match: leave `workstream_id` null AND store extracted raw name as "Workstream ref: [name]" (same pattern)
- Both unresolved on same task: "Milestone ref: [m-name] | Workstream ref: [w-name]"
- After approval: include plain-text notice in API response: "N tasks had unresolved milestone references, M had unresolved workstream references — link them manually via the Plan tab"
- No retroactive backfill of existing tasks with null FKs

**Update path (re-ingestion / fill-null-only policy):**
- Universal fill-null-only: ingested values fill empty DB fields; NEVER overwrite values a user manually set
- Applies to ALL new fields: `task.start_date`, `task.due`, `task.milestone_id`, `task.workstream_id`, `risk.severity`, `decision.context`, `milestone.owner`, `stakeholder.company`
- Fill-null-only applies to BOTH the re-ingest update path AND the merge conflict-resolution path
- Pattern: `beforeRecord.field ? undefined : coercedValue`
- Exception: `milestone_id` FK on task UPDATE can be set if currently null — consistent with fill-null-only

**Approval UI visibility:**
- Task cards show: `start_date`, `due`, `milestone_name` (raw extracted name), `priority`, `description`
- Risk cards show: `severity`
- Decision cards show: `rationale`
- Milestone cards show: `owner`
- Resolved milestone link shown as extracted name only — no status indicator
- Confidence scores remain internal only

**Extraction prompt additions (per entity type):**
- task: add `start_date` (ISO date), `due_date` (ISO date), `milestone_name` (verbatim), `workstream_name` (verbatim), `priority` (high/medium/low), `description`
- risk: `severity` already in prompt — fix is in approve route only (write severity to DB with coercion)
- milestone: add `owner` (verbatim name)
- stakeholder: `account` → `company` already correctly implemented — verify only
- decision: `rationale` → `context` already correctly implemented — verify only
- action: add `notes`, `type` (minor fields)

**Severity enum coercion:**
- DB uses `severityEnum('severity', ['low', 'medium', 'high', 'critical'])` — strict Postgres enum
- Add `coerceRiskSeverity` helper following `coerceIntegrationStatus` pattern
- Mapping: `'critical'|'crit'` → `'critical'`; `'high'` → `'high'`; `'medium'|'med'|'moderate'` → `'medium'`; `'low'|'minor'` → `'low'`; anything else → `'medium'`
- Apply in both INSERT and MERGE paths

### Claude's Discretion
- Exact ilike pattern for cross-entity resolution (`%name%` vs `name%` — decide based on what existing dedup uses)
- Whether to run cross-entity resolution before or after the dedup check
- Error handling if DB lookup itself fails during resolution (should not block entity creation)
- Exact string format for multi-ref appends when both milestone and workstream are unresolved on the same task

### Deferred Ideas (OUT OF SCOPE)
- Retroactive backfill of existing tasks when a new milestone is approved
- Confidence score display in approval cards
- Dedicated unresolved-links resolution UI with dropdowns
- `stakeholder_id` FK columns on tasks/actions/risks — no such columns exist; adding them is a future data model phase
</user_constraints>

---

## Summary

Phase 42 is a tightly scoped backend-only fix with two touch points: the LLM extraction prompt string in `worker/jobs/document-extraction.ts` and the entity write logic in `app/api/ingestion/approve/route.ts`. The goal is to stop silently dropping fields that the DB schema already supports.

The codebase is well-established. The extraction pipeline runs as a BullMQ worker job, calls the Anthropic Claude Sonnet 4.6 streaming API, outputs a JSON array of `ExtractionItem` objects, and stages them in `extractionJobs.staged_items_json`. The approve route reads those staged items from the client payload, deduplicates against existing DB records using `ilike` prefix matching, then inserts (new) or merges (conflict) each entity in a `db.transaction` together with an audit log entry.

The critical discovery from code inspection: the `insertItem` case for `risk` does not currently write `severity` to the DB at all (line 267–278 of approve/route.ts only inserts `description`, `owner`, `mitigation`). The `mergeItem` case for `risk` also omits `severity`. The `insertItem` case for `task` only writes `title`, `owner`, `phase`, `status` — entirely missing `start_date`, `due`, `description`, `priority`, `milestone_id`, `workstream_id`. The `insertItem` case for `milestone` is missing `owner`. These are confirmed gaps against the schema. The `decision` INSERT already maps `f.rationale` to `context`, and the `stakeholder` INSERT already maps `f.account` to `company` — both are correctly implemented and need only verification.

**Primary recommendation:** Work in the following order — (1) verify the two "already correct" paths (decision rationale, stakeholder company) with a code read; (2) add `coerceRiskSeverity` helper; (3) extend `insertItem` for risk, task, milestone, action; (4) extend `mergeItem` for the same with fill-null-only guards; (5) add cross-entity FK resolution function in the approve route; (6) add `milestone_name`, `workstream_name` etc. to the extraction prompt; (7) update `ENTITY_FIELDS` in `ExtractionItemEditForm.tsx` for the approval card UI; (8) add unresolved-ref count to the API response.

---

## Standard Stack

### Core (confirmed by direct code inspection)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Drizzle ORM | project version | DB queries — select, insert, update, transaction | All entity writes use `db.transaction(async tx => ...)` pattern; `ilike`, `eq`, `and` from `drizzle-orm` |
| Zod | project version | Request body validation in approve route | `ApproveRequestSchema` validates entire payload |
| Anthropic SDK | project version | Streaming Claude calls in extraction worker | `claude-sonnet-4-6` model, `max_tokens: 16384` |
| PostgreSQL `severityEnum` | schema-defined | Strict enum `['low','medium','high','critical']` | Raw Claude output must be coerced before insert |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jsonrepair` | project version | Fix malformed JSON from Claude | Already in extraction worker, no change needed |
| Next.js `revalidatePath` | project version | Cache invalidation after approve | Already in use; no change needed for this phase |

### Alternatives Considered
None — all decisions are locked. The existing stack is the only target.

---

## Architecture Patterns

### Relevant Project Structure
```
bigpanda-app/
├── worker/jobs/document-extraction.ts   # BullMQ job: LLM extraction, dedup, stage
├── app/api/ingestion/approve/route.ts   # POST: insert/merge/delete staged items to DB
├── lib/extraction-types.ts              # Shared types: EntityType, ExtractionItem, isAlreadyIngested
├── components/ExtractionItemEditForm.tsx # ENTITY_FIELDS drives approval card edit layout
├── components/ExtractionPreview.tsx     # Tab grouping by entity type
├── components/IngestionModal.tsx        # Orchestrates upload → extract → review → approve
└── db/schema.ts                         # Source of truth for all column definitions
```

### Pattern 1: Enum Coercion Helper
**What:** Free-form Claude text mapped to a strict Postgres enum before DB write.
**When to use:** Any field backed by a `pgEnum` — the LLM returns natural language; the DB rejects anything not in the enum.
**Existing model** (`coerceIntegrationStatus` in approve/route.ts):
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts lines 58-65
type IntegrationStatus = 'not-connected' | 'configured' | 'validated' | 'production' | 'blocked';
function coerceIntegrationStatus(raw: string | undefined | null): IntegrationStatus {
  const v = (raw ?? '').toLowerCase().trim();
  if (['production', 'prod', 'live', 'active', 'enabled', 'running'].includes(v)) return 'production';
  if (['configured', 'setup', 'installed', 'connected'].includes(v)) return 'configured';
  if (['validated', 'tested', 'verified', 'working'].includes(v)) return 'validated';
  if (['blocked', 'failed', 'error', 'broken', 'disabled'].includes(v)) return 'blocked';
  return 'not-connected';
}
```
**New function to add** (same file, same location):
```typescript
type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
function coerceRiskSeverity(raw: string | undefined | null): RiskSeverity {
  const v = (raw ?? '').toLowerCase().trim();
  if (['critical', 'crit'].includes(v)) return 'critical';
  if (['high'].includes(v)) return 'high';
  if (['medium', 'med', 'moderate'].includes(v)) return 'medium';
  if (['low', 'minor'].includes(v)) return 'low';
  return 'medium'; // safe default
}
```

### Pattern 2: Fill-Null-Only Guard in mergeItem
**What:** Before setting a field in the patch object, check whether the existing record already has a value.
**When to use:** ALL new fields in `mergeItem` — prevents overwriting user-edited data.
**Existing model** (not yet used for new fields; concept from CONTEXT.md):
```typescript
// Pattern for fill-null-only:
const patch = {
  // Existing (currently wrong — ?? undefined overwrites):
  owner: f.owner ?? undefined,
  // New fields (correct fill-null-only pattern):
  severity: beforeRecord.severity ? undefined : coerceRiskSeverity(f.severity),
  start_date: beforeRecord.start_date ? undefined : (f.start_date ?? undefined),
  due: beforeRecord.due ? undefined : (f.due_date ?? undefined),
  milestone_id: beforeRecord.milestone_id ? undefined : resolvedMilestoneId,
  workstream_id: beforeRecord.workstream_id ? undefined : resolvedWorkstreamId,
};
```
**Important:** The existing `mergeItem` for `risk` uses `f.mitigation ?? undefined` which unconditionally overwrites. For EXISTING fields in mergeItem, the fill-null-only policy only applies to NEW fields being added in this phase. The user locked this policy on the new fields; existing behaviour for `owner`, `mitigation` etc. is not changed by this phase.

### Pattern 3: Cross-Entity FK Resolution
**What:** A DB lookup to find the matching milestone or workstream by name, to set a FK on a task.
**When to use:** During `insertItem` and `mergeItem` for tasks, before writing the row.
**ilike pattern:** Existing dedup uses `ilike(tasks.title, `${key}%`)` — prefix match. For cross-entity resolution where verbatim names are extracted, `%name%` (contains) is more forgiving for display names that may include surrounding context. This is in Claude's discretion (see constraints). The implementation below uses `%key%` for higher recall.
```typescript
// Source: pattern derived from approve/route.ts findConflict() function
async function resolveEntityRef(
  tableName: 'milestones' | 'workstreams',
  nameField: string,
  projectId: number,
): Promise<number | null> {
  // Returns the ID if exactly one match, null if 0 or multiple
  // DB lookup MUST NOT throw — catch and return null to not block entity creation
  try {
    const key = normalize(nameField); // reuse existing normalize() helper
    if (!key) return null;
    let rows: { id: number }[];
    if (tableName === 'milestones') {
      rows = await db.select({ id: milestones.id }).from(milestones)
        .where(and(eq(milestones.project_id, projectId), ilike(milestones.name, `%${key}%`)));
    } else {
      rows = await db.select({ id: workstreams.id }).from(workstreams)
        .where(and(eq(workstreams.project_id, projectId), ilike(workstreams.name, `%${key}%`)));
    }
    return rows.length === 1 ? rows[0].id : null;
  } catch {
    return null; // DB lookup failure must not block entity creation
  }
}
```

### Pattern 4: Extraction Prompt Entity Guidance
**What:** The `EXTRACTION_SYSTEM` constant in `document-extraction.ts` lists per-entity field guidance.
**Current task guidance:**
```
- task: { title, status, owner, phase }
```
**New task guidance (after phase):**
```
- task: { title, status, owner, phase, description, start_date (ISO date or null), due_date (ISO date or null), priority (high/medium/low or null), milestone_name (verbatim name as it appears in document), workstream_name (verbatim name as it appears in document) }
```
The system prompt addition should include the verbatim extraction instruction: "Extract names exactly as they appear in the document; do not abbreviate, normalize, or infer."

### Pattern 5: ENTITY_FIELDS Update for Approval Card UI
**What:** `ExtractionItemEditForm.tsx` has a static `ENTITY_FIELDS` record that drives which fields appear in the approval card edit form.
**Current task fields:** `['title', 'status', 'owner', 'phase']`
**New task fields:** `['title', 'status', 'owner', 'phase', 'description', 'start_date', 'due_date', 'milestone_name', 'workstream_name', 'priority']`
**Other entities to update:**
- `risk`: add `severity` — already listed in `ENTITY_FIELDS` (line 12: `['description', 'severity', 'mitigation', 'owner']`) — no change needed
- `milestone`: add `owner` — current: `['name', 'target_date', 'status']` → new: `['name', 'target_date', 'status', 'owner']`
- `decision`: `rationale` already listed — no change needed
- `action`: add `notes`, `type` — current: `['description', 'owner', 'due_date', 'status']` → new: `['description', 'owner', 'due_date', 'status', 'notes', 'type']`

**Verified observation:** `ExtractionItemRow.tsx` uses `ExtractionItemEditForm` for the expand/edit form but NOT for the collapsed row summary display. The collapsed row only shows the primary field (line 84-96 of ExtractionItemRow.tsx). The approval card summary display does NOT need structural changes — new fields appear in the expanded edit form automatically when added to `ENTITY_FIELDS`. This confirms the CONTEXT.md claim: "new extracted fields appear automatically when added to the prompt."

### Pattern 6: Approval API Response — Unresolved Ref Count
**Current response shape:**
```typescript
return NextResponse.json({ written, skipped, rejected }, { status: 200 });
```
**New response shape:**
```typescript
return NextResponse.json({
  written,
  skipped,
  rejected,
  unresolvedRefs: unresolvedMessage, // string | null
}, { status: 200 });
```
Where `unresolvedMessage` is either null (no unresolved refs) or the plain-text notice. The `IngestionModal.tsx` currently ignores the response body after a successful approve (line 343-344: `setStage('done')` immediately). The unresolved ref message would need to be surfaced in the done stage UI or as a banner — this is a minor UI addition within the "done" stage render block.

### Anti-Patterns to Avoid
- **Using `?? undefined` in mergeItem for new fields:** `f.severity ?? undefined` will set severity to `undefined` (which Drizzle treats as "omit from SET clause" — actually safe), BUT `f.severity ?? undefined` also means "write it if provided" which violates fill-null-only. Use `beforeRecord.severity ? undefined : coerceRiskSeverity(f.severity)` instead.
- **Modifying `lib/extraction-types.ts` for dedup:** Cross-entity resolution is a separate concern from dedup. The `isAlreadyIngested` function in extraction-types.ts is used by the BullMQ worker to pre-filter already-ingested items. FK resolution happens at approve time, in the approve route only. Do not conflate the two.
- **Running cross-entity resolution inside the BullMQ worker:** The worker runs before user review and dedup; FK resolution must happen at approve time when the user has confirmed the item should be written. Running it in the worker would mean resolving against a DB state that may change before approval.
- **Extracting action.notes / action.type into the DB schema as a mandatory field:** These are minor additions. `notes` is TEXT nullable; `type` is TEXT with default `'action'` — safe to write conditionally.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Enum coercion | Custom regex or switch | `coerceIntegrationStatus` pattern | Established in codebase; consistent safe-default behavior |
| Ilike fuzzy match | Levenshtein distance, trigram | Drizzle `ilike()` | Already used throughout dedup/conflict-check code; consistent, understood behavior |
| DB transaction + audit | Manual rollback logic | `db.transaction(async tx => {...})` | Already established for all entity writes in this route |
| JSON validation | Manual field checking | Zod `ApproveRequestSchema` | Schema already validates all approved items |

---

## Common Pitfalls

### Pitfall 1: Forgetting to add `severity` to the risk INSERT (not just MERGE)
**What goes wrong:** The extraction prompt already extracts `severity`. The gap is entirely in the approve route — the `insertItem` case for `risk` (lines 267-278) does not pass `severity` to `db.insert(risks).values(...)`. The MERGE path also omits it.
**Why it happens:** The existing mergeItem for risk only patches `owner` and `mitigation` — severity was never wired up.
**How to avoid:** When extending insertItem for risk, add `severity: coerceRiskSeverity(f.severity)`. When extending mergeItem, add `severity: beforeRecord.severity ? undefined : coerceRiskSeverity(f.severity)`.
**Warning signs:** Risks inserted via ingestion have `severity: null` even when the source document explicitly states a severity level.

### Pitfall 2: Using `%key%` (contains) vs `key%` (prefix) for cross-entity resolution
**What goes wrong:** The existing dedup ilike pattern uses `key%` (prefix). If the cross-entity resolution uses `%key%` (contains), a short milestone name like "Go Live" could match many records in a large project.
**Why it happens:** The decision (per CONTEXT.md) is Claude's discretion. The tradeoff is recall (contains finds more) vs precision (prefix reduces false positives).
**Recommendation:** Use `%key%` (contains) for cross-entity resolution and accept null (no-match) on ambiguity via the "exactly one match" guard. The existing normalize() truncates to 120 chars — for multi-word milestone names this is safe. A more specific name (e.g., "Q2 Integration Milestone") is unlikely to match multiple records with a contains match.
**Warning signs:** Multiple tasks unexpectedly linked to the wrong milestone after ingestion.

### Pitfall 3: Cross-entity resolution running INSIDE the db.transaction
**What goes wrong:** If the `resolveEntityRef` DB lookup runs inside the entity write transaction, a lookup failure becomes a transaction rollback, blocking the entire insert.
**Why it happens:** It's natural to put all DB work inside the transaction.
**How to avoid:** Run `resolveEntityRef` BEFORE opening the transaction. Pass the resolved IDs as arguments to the insert. If the lookup throws, catch outside and default to null — the transaction never sees the error.
**Warning signs:** Tasks fail to insert entirely when a milestone lookup throws (e.g., on a DB hiccup).

### Pitfall 4: `??undefined` vs fill-null-only in mergeItem
**What goes wrong:** `f.start_date ?? undefined` evaluates to `undefined` when `f.start_date` is an empty string `""`. Drizzle omits undefined from SET clauses, so this is safe from the "not overwriting" perspective — but it also won't write the value even when it's present. The real risk is the opposite direction: if the user wrote `"2026-Q2"` manually, and Claude extracts `"2026-04-15"`, `f.start_date ?? undefined` would overwrite.
**Why it happens:** `??` only short-circuits on null/undefined, not on empty string. Claude may return an empty string for a missing field.
**How to avoid:** Use `beforeRecord.start_date ? undefined : (f.start_date || undefined)` — using `||` instead of `??` treats empty string as falsy too.
**Warning signs:** User-manually-set dates getting overwritten after re-ingestion.

### Pitfall 5: The "done" stage UI doesn't surface unresolved ref notice
**What goes wrong:** The API returns `unresolvedRefs` message in the response body, but `IngestionModal.tsx` immediately sets stage to `done` without reading it (lines 343-344). The notice is silently dropped.
**Why it happens:** Current code ignores the response body content on success.
**How to avoid:** In `handleApprove` in `IngestionModal.tsx`, read `data.unresolvedRefs` after a successful response and store it in component state; render it in the "done" stage block.
**Warning signs:** Unresolved refs are recorded in the DB description fields but users never see the notice to go link them manually.

### Pitfall 6: `task.description` append logic when description already has content
**What goes wrong:** If a task already has a `description` from the user, appending "Milestone ref: [name]" creates awkward text like "User wrote this description. Milestone ref: Alpha Sprint".
**Why it happens:** Naive append without whitespace/separator handling.
**How to avoid:** Use a clear separator: `existingDescription ? `${existingDescription}\nMilestone ref: ${milestoneName}`` : `Milestone ref: ${milestoneName}`. This is only for INSERT (new records). For MERGE, the fill-null-only policy means we only write `description` if `beforeRecord.description` is null.

---

## Code Examples

Verified by direct code inspection:

### Current risk insertItem (MISSING severity)
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts lines 267-285
case 'risk':
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(risks).values({
      project_id: projectId,
      external_id: syntheticExternalId('risk', artifactId),
      description: f.description ?? '',
      owner: f.owner ?? null,
      mitigation: f.mitigation ?? null,
      // MISSING: severity — not written despite extraction prompt including it
      ...attribution,
    }).returning();
    // ...audit log insert
  });
```

### Current task insertItem (MISSING dates, priority, description, FK columns)
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts lines 369-388
case 'task':
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(tasks).values({
      project_id: projectId,
      title: f.title ?? '',
      owner: f.owner ?? null,
      phase: f.phase ?? null,
      status: f.status ?? 'todo',
      // MISSING: start_date, due, description, priority, milestone_id, workstream_id
      ...attribution,
    }).returning();
```

### Current milestone insertItem (MISSING owner)
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts lines 287-306
case 'milestone':
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(milestones).values({
      project_id: projectId,
      external_id: syntheticExternalId('milestone', artifactId),
      name: f.name ?? '',
      target: f.target_date ?? null,
      date: f.target_date ?? null,
      status: f.status ?? null,
      // MISSING: owner
      ...attribution,
    }).returning();
```

### Confirmed correct: decision INSERT (rationale → context)
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts lines 309-326
case 'decision':
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(keyDecisions).values({
      project_id: projectId,
      decision: f.decision ?? '',
      date: f.date ?? null,
      context: f.rationale ?? null,  // CORRECT: rationale maps to context column
      ...attribution,
    }).returning();
```

### Confirmed correct: stakeholder INSERT (account → company)
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts lines 349-366
case 'stakeholder':
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(stakeholders).values({
      project_id: projectId,
      name: f.name ?? '',
      role: f.role ?? null,
      email: f.email ?? null,
      company: f.account ?? null,  // CORRECT: account maps to company column
      ...attribution,
    }).returning();
```

### Confirmed correct: stakeholder mergeItem (account → company)
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts lines 641-654
case 'stakeholder': {
  const [beforeRecord] = await db.select().from(stakeholders).where(eq(stakeholders.id, existingId));
  const patch = { role: f.role ?? undefined, email: f.email ?? undefined, company: f.account ?? undefined, ...attribution };
  // Note: company: f.account ?? undefined uses ?? not fill-null-only; but per CONTEXT.md,
  // fill-null-only only applies to the NEW fields being added in Phase 42, not existing mergeItem fields.
```

### Current extraction prompt task guidance
```typescript
// Source: bigpanda-app/worker/jobs/document-extraction.ts line 39
- task: { title, status, owner, phase }
```

### Schema: tasks table confirmed FK columns
```typescript
// Source: bigpanda-app/db/schema.ts lines 271-274
workstream_id: integer('workstream_id').references(() => workstreams.id),
milestone_id: integer('milestone_id').references(() => milestones.id),
start_date: text('start_date'),
// due: text('due') — line 267
// description: text('description') — line 265
// priority: text('priority') — line 268
```

### Schema: severityEnum confirmed
```typescript
// Source: bigpanda-app/db/schema.ts lines 43-47
export const severityEnum = pgEnum('severity', [
  'low',
  'medium',
  'high',
  'critical',
]);
// risks table: severity: severityEnum('severity') — nullable (no .notNull())
```

---

## State of the Art

| Old Approach | Current Approach | Phase | Impact |
|--------------|-----------------|-------|--------|
| Tasks inserted with no dates/FKs | Tasks inserted with `start_date`, `due`, `milestone_id`, `workstream_id` | Phase 42 | Gantt shows real bars after ingestion |
| Risks inserted with no severity | Risks inserted with coerced severity | Phase 42 | Risk severity charts populated immediately after ingestion |
| Milestones inserted with no owner | Milestones inserted with owner | Phase 42 | Milestone owner visible without manual edit |
| Extraction prompt: 4 task fields | Extraction prompt: 10 task fields | Phase 42 | More complete data extracted from documents |

---

## Open Questions

1. **Should the `done` stage in IngestionModal show the unresolved ref notice, or should it be shown at the start of the review stage?**
   - What we know: CONTEXT.md specifies it appears "after approval completes" — i.e., in the done stage
   - What's unclear: Whether a single-line banner in the done stage is visible enough before the modal auto-closes at 1200ms
   - Recommendation: Store the message in state before setting stage to `done`; render it in the done stage alongside "Items saved to your project." Consider removing the 1200ms auto-close if there's an unresolved ref message.

2. **Should `action.notes` and `action.type` use fill-null-only in mergeItem?**
   - What we know: CONTEXT.md says fill-null-only applies to all new fields
   - What's unclear: `action.type` has a DB default of `'action'` — it's never null after insert; fill-null-only would mean the extracted value is never applied on re-ingest
   - Recommendation: For `action.type`, use fill-null-only only when the existing value is `'action'` (default), treating it as "user hasn't customized it." For `action.notes`, standard fill-null-only applies.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (confirmed — `vitest` in test files, `describe/it/expect/vi` imports) |
| Config file | `bigpanda-app/vitest.config.ts` (inferred from project structure) |
| Quick run command | `cd bigpanda-app && npx vitest run tests/ingestion/` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map

This phase has no formal requirement IDs from REQUIREMENTS.md (it predates the v5.0 requirements set). The behaviors to test derive directly from the implementation decisions:

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `insertItem('risk')` writes `severity` using coerceRiskSeverity | unit | `npx vitest run tests/ingestion/write.test.ts` | Wave 0 — extend existing |
| `insertItem('task')` writes `start_date`, `due`, `description`, `priority`, `milestone_id`, `workstream_id` | unit | `npx vitest run tests/ingestion/write.test.ts` | Wave 0 — extend existing |
| `insertItem('milestone')` writes `owner` | unit | `npx vitest run tests/ingestion/write.test.ts` | Wave 0 — extend existing |
| `coerceRiskSeverity` maps known values correctly and defaults to `'medium'` | unit | `npx vitest run tests/ingestion/write.test.ts` | Wave 0 — add cases |
| `mergeItem('risk')` applies fill-null-only for severity | unit | `npx vitest run tests/ingestion/write.test.ts` | Wave 0 — extend existing |
| `mergeItem('task')` applies fill-null-only for start_date, due, milestone_id | unit | `npx vitest run tests/ingestion/write.test.ts` | Wave 0 — extend existing |
| Cross-entity resolution: exactly 1 match → FK set; 0 or 2+ matches → null | unit | `npx vitest run tests/ingestion/write.test.ts` | Wave 0 — new cases |
| Unresolved milestone ref stored in task.description as "Milestone ref: [name]" | unit | `npx vitest run tests/ingestion/write.test.ts` | Wave 0 — new cases |
| Approval API response includes `unresolvedRefs` message when applicable | unit | `npx vitest run tests/ingestion/write.test.ts` | Wave 0 — new cases |
| Extraction prompt includes milestone_name, workstream_name, start_date, due_date, priority, description for tasks | unit (prompt string inspection) | `npx vitest run tests/ingestion/extraction-job.test.ts` | Wave 0 — extend existing |
| ENTITY_FIELDS for task includes new fields | unit | `npx vitest run tests/ui/` | Wave 0 — new |

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run tests/ingestion/`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/ingestion/write.test.ts` — existing file; must be extended with new test cases for: severity write, task FK write, fill-null-only guards, cross-entity resolution, unresolved ref description append, unresolvedRefs API response field
- [ ] `tests/ingestion/extraction-job.test.ts` — existing file; must be extended to assert new prompt fields for task, milestone, action entity guidance lines

*(No new test files needed — extend existing ingestion test files)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `bigpanda-app/app/api/ingestion/approve/route.ts` — confirmed gaps in insertItem and mergeItem for risk, task, milestone
- Direct code inspection: `bigpanda-app/worker/jobs/document-extraction.ts` — confirmed current extraction prompt entity guidance
- Direct code inspection: `bigpanda-app/db/schema.ts` — confirmed column definitions: `tasks.milestone_id`, `tasks.workstream_id`, `tasks.start_date`, `risks.severity` (nullable enum), `milestones.owner`
- Direct code inspection: `bigpanda-app/components/ExtractionItemEditForm.tsx` — confirmed ENTITY_FIELDS for all entity types
- Direct code inspection: `bigpanda-app/components/IngestionModal.tsx` — confirmed handleApprove ignores response body after success
- `.planning/phases/42-ingestion-field-coverage/42-CONTEXT.md` — all implementation decisions

### Secondary (MEDIUM confidence)
- `bigpanda-app/tests/audit/ingestion-approve-audit.test.ts` — confirmed Vitest framework, test structure, mock pattern for approve route

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Implementation gaps: HIGH — confirmed by direct code inspection of approve route and schema
- Correct implementations (decision/stakeholder): HIGH — confirmed lines 309-326, 349-366 in approve route
- Architecture patterns: HIGH — confirmed from existing codebase patterns
- UI impact: HIGH — confirmed ExtractionItemEditForm ENTITY_FIELDS drives the edit form
- Unresolved ref notice surfacing: MEDIUM — handleApprove flow confirmed, but exact UI placement is discretionary

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable codebase, no external dependencies)
