# Phase 52: Multi-pass Targeted Extraction for Full Tab Coverage - Research

**Researched:** 2026-04-09
**Domain:** BullMQ extraction worker refactor — multi-pass Claude API orchestration, pass-aware progress reporting, intra-batch dedup
**Confidence:** HIGH (all findings from direct codebase inspection)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pass structure:**
- Always run all 3 passes unconditionally — no heuristic to skip passes
- Pass 1 — Project narrative: `action`, `risk`, `task`, `milestone`, `decision`, `note`, `history`
- Pass 2 — Architecture: `architecture`, `arch_node`, `integration`, `before_state`
- Pass 3 — Teams and delivery: `team`, `wbs_task`, `workstream`, `focus_area`, `e2e_workflow`, `team_pathway`, `weekly_focus`, `stakeholder`, `businessOutcome`, `onboarding_step`
- Same 3-pass structure applies to both PDF and text documents (PDF: same base64 block sent 3 times with different system prompts)

**Prompt design:**
- Shared base prompt with output format rules, disambiguation rules, and field extraction guidance
- Each pass injects only its entity type definitions (fields, examples, disambiguation for that group)
- Pass prompt does NOT include entity type definitions from other passes — reduces cross-type confusion
- The pass-specific user message states explicitly: "Extract ONLY the following entity types: [list]"

**Progress display:**
- Pass-aware progress in IngestionModal: "Pass 1 of 3 — Project data (45%)"
- Progress percentage reflects progress within the current pass
- After all passes complete, transition to review as normal

**Review queue and staging:**
- All 3 passes complete before any items are staged for review
- Items from all passes are merged into a single array
- Intra-batch dedup applied: deduplicate within merged results by `entityType` + primary key field (same logic as `isAlreadyIngested()` but applied within the batch before DB check)
- Existing `isAlreadyIngested()` DB check then filters out items already present in the project
- User reviews a single merged review queue — same UX as today, just more complete

**Modal behavior:**
- Closing modal during multi-pass extraction: same as today — job continues in background via BullMQ
- No cancellation behavior change
- No coverage feedback after extraction — items appear in review queue silently

### Claude's Discretion
- Exact chunking strategy for Pass 1/2/3 on text documents (whether each pass re-sends all chunks or processes them in parallel)
- Intra-batch dedup key field selection per entity type
- Whether to parallelize passes 1/2/3 or run strictly sequentially (consider API rate limits)

### Deferred Ideas (OUT OF SCOPE)
- Re-extraction from existing artifacts without re-upload — future phase
- Tab coverage summary UI showing which tabs will have new data after extraction — future phase
- Extraction quality score / confidence threshold filtering — future phase
- Parallel pass execution (run all 3 passes concurrently) — could be a quick win but needs rate-limit analysis; defer to planner to decide
- Per-pass review queues (review pass 1 before pass 2 starts) — deferred, adds workflow complexity
</user_constraints>

---

## Summary

Phase 52 restructures the BullMQ extraction worker (`worker/jobs/document-extraction.ts`) from a single monolithic Claude call into 3 sequential targeted passes per document. Each pass uses a different system prompt that includes only the entity type definitions relevant to that pass group, preventing Claude from defaulting to familiar generic types when confronted with complex project context documents.

The root cause of the gap (documented in `.planning/extraction-intelligence-gap.md`) is that Claude's single-pass behavior reliably extracts `action`, `risk`, `decision`, `milestone`, and `stakeholder` — the most structurally obvious types — but skips `wbs_task`, `onboarding_step`, `arch_node`, `e2e_workflow`, and similar types because they require deeper semantic pattern recognition. Focused passes eliminate cross-type competition so Claude concentrates its attention on one group at a time.

Infrastructure changes are minimal: the `extraction_jobs` schema has no `current_pass`/`total_passes` columns, but the existing `progress_pct` column can carry pass-aware progress using a simple formula. The polling endpoint at `/api/ingestion/jobs/[jobId]` already returns `progress_pct`, `current_chunk`, and `total_chunks` — and the `IngestionModal` polling loop already reads `progress_pct` to derive its display string. Adding a pass label to the message requires only changing the string template in the modal's poll callback, which reads the raw `progress_pct` returned by the job row. The key question is whether pass number must be surfaced as a DB column or can be encoded into `progress_pct` convention plus a new `error_message`-style field — see Architecture Patterns below.

**Primary recommendation:** Run all 3 passes sequentially in the worker, write pass-aware progress into `progress_pct` using a global progress scale (pass 1 = 0–33%, pass 2 = 33–66%, pass 3 = 66–100%), and store the pass name in an existing writable text column (or add a `current_pass_label` column via migration) so the polling endpoint can return it without changing the API shape. Apply intra-batch dedup synchronously after merging all 3 pass results, before the existing `isAlreadyIngested()` DB sweep.

---

## Standard Stack

### Core (all already in project — no new dependencies)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@anthropic-ai/sdk` | ^0.80.0 | Claude API streaming calls | Already used in `runClaudeCall()` |
| `bullmq` | existing | Background job execution | Worker already registered |
| `drizzle-orm` | existing | DB updates for progress tracking | Existing pattern in worker |
| `jsonrepair` | existing | JSON repair + parse of Claude output | Used in `parseClaudeResponse()` |

### No New Packages Needed
All required functionality is already present. This phase is a pure restructure of control flow and prompt design within the existing worker.

---

## Architecture Patterns

### Pass Execution Architecture

The cleanest restructure wraps the current extraction flow in a pass loop. Each pass is a data structure:

```typescript
interface ExtractionPass {
  passNumber: 1 | 2 | 3;
  label: string;                     // "Project data", "Architecture", "Teams & delivery"
  entityTypes: EntityType[];         // which types this pass handles
  systemPrompt: string;              // shared base + pass-specific type definitions
}
```

**Pass loop (text path):**
```
for each pass (1..3):
  update progress_pct to global_start_pct
  for each chunk:
    run Claude call with pass system prompt
    accumulate items
    update progress_pct (within-pass pct mapped to pass range)
merge all pass results
intra-batch dedup
isAlreadyIngested() sweep
stage merged results
```

**Pass loop (PDF path):**
```
for each pass (1..3):
  run Claude call with base64 block + pass system prompt
  accumulate items
  update progress_pct (pass 1=33%, pass 2=66%, pass 3=100%)
merge, dedup, stage
```

### Progress Encoding Without Schema Migration

The current `progress_pct` column is an `integer` (0–100). For the polling endpoint to communicate both pass number and within-pass progress without schema changes, two approaches work:

**Option A — Global progress scale (recommended):**
Pass 1 occupies 0–33%, pass 2 34–66%, pass 3 67–100%. The modal reads the raw `progress_pct` and maps it to a pass label:
- 0–33 → "Pass 1 of 3 — Project data (N%)"
- 34–66 → "Pass 2 of 3 — Architecture (N%)"
- 67–100 → "Pass 3 of 3 — Teams & delivery (N%)"

Downside: the modal needs to know the pass thresholds, coupling client and worker on the progress convention.

**Option B — Add `current_pass_label` to job row (cleanest for polling):**
Add a `text` column `current_pass_label` (nullable) to `extraction_jobs`. Worker writes "Pass 1 of 3 — Project data" into it on each pass transition. Polling endpoint returns this field. Modal replaces the constructed message with the verbatim label plus `(N%)`. Requires a DB migration but eliminates client-side math.

**Option C — Encode in `error_message` (hack, avoid):**
Repurposing an error field for progress labels is a maintenance trap. Not recommended.

**Recommendation: Option A** for the planner's first wave — zero schema migration needed, progress thresholds are simple math (divide pass number by 3), and can be upgraded to Option B later if needed.

### `runClaudeCall()` Signature Change

Currently `runClaudeCall` is a closure that captures `EXTRACTION_SYSTEM` as its system prompt. To support per-pass system prompts, the closure must accept a `systemPrompt` parameter:

```typescript
// Before:
const runClaudeCall = async (content: Anthropic.MessageParam['content']): Promise<string> => {
  ...
  system: EXTRACTION_SYSTEM,
  ...
}

// After:
const runClaudeCall = async (
  content: Anthropic.MessageParam['content'],
  systemPrompt: string,
): Promise<string> => {
  ...
  system: systemPrompt,
  ...
}
```

All existing call sites within the job must pass the appropriate pass system prompt.

### Prompt Architecture: Shared Base + Pass Injection

The current `EXTRACTION_SYSTEM` constant (57 lines) contains:
1. Output format rules and JSON shape definition (lines 1–6) — goes to shared base
2. EntityType guidance for all 21 types (lines 7–54) — split by pass group
3. Disambiguation rules (lines 56–72) — relevant subset per pass
4. General instructions (lines 74–79) — goes to shared base

**Restructured prompt approach:**

```typescript
const EXTRACTION_BASE = `...output format rules, JSON shape, general instructions...`

const PASS_PROMPTS: Record<1|2|3, string> = {
  1: `${EXTRACTION_BASE}\n\nEntity type guidance:\n- action: {...}\n- risk: {...}\n- ...(pass 1 types only)\n\nDisambiguation rules (pass 1 relevant subset):\n...`,
  2: `${EXTRACTION_BASE}\n\nEntity type guidance:\n- architecture: {...}\n- arch_node: {...}\n- ...(pass 2 types only)\n\nDisambiguation rules (pass 2 relevant subset):\n...`,
  3: `${EXTRACTION_BASE}\n\nEntity type guidance:\n- team: {...}\n- wbs_task: {...}\n- ...(pass 3 types only)\n\nDisambiguation rules (pass 3 relevant subset):\n...`,
}
```

**User message per pass (locked decision):**
```typescript
const passUserMessage = `Extract ONLY the following entity types: ${pass.entityTypes.join(', ')}.
Extract all structured project data from the document above. Output only the JSON array.`
```

### Intra-Batch Dedup

The intra-batch dedup runs after all 3 passes complete and before the `isAlreadyIngested()` DB sweep. It deduplicates within the merged `allRawItems` array using the same key fields used by `isAlreadyIngested()`.

**Key field map per entity type (derived from `isAlreadyIngested()` source):**
| Entity Type | Dedup Key Field |
|---|---|
| `action` | `description` (normalized, 120-char prefix) |
| `risk` | `description` (normalized) |
| `milestone` | `name` (normalized) |
| `decision` | `decision` (normalized) |
| `history`, `note` | `content ?? context` (normalized) |
| `stakeholder` | `email` if present, else `name` (normalized) |
| `task` | `title` (normalized) |
| `businessOutcome` | `title` (normalized) |
| `team` | `team_name` (normalized) |
| `architecture` | `tool_name` (normalized) |
| `workstream` | `name` (normalized) |
| `onboarding_step` | `step_name` (normalized) |
| `integration` | `tool_name` (normalized) |
| `wbs_task` | `title` + `track` (composite) |
| `arch_node` | `node_name` + `track` (composite) |
| `focus_area` | `title` (normalized) |
| `e2e_workflow` | `workflow_name` + `team_name` (composite) |
| `team_pathway` | `team_name` (normalized) |
| `before_state` | `aggregation_hub_name` (normalized) |
| `weekly_focus` | `bullets[0]` normalized, or skip dedup (singletons) |

**Intra-batch dedup algorithm:**
```typescript
function deduplicateWithinBatch(items: ExtractionItem[]): ExtractionItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = buildDedupeKey(item);  // entityType + normalized primary field(s)
    if (key === null) return true;      // unkeyed items always pass through
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

The key is `${entityType}::${normalizedPrimaryKey}` — ensures the same entity type's duplicate is caught but the same content under different entity types is preserved (e.g., a workstream name that is also a task title).

### Progress Reporting in IngestionModal

The modal's polling callback currently constructs the extraction message at lines 115–120 of `IngestionModal.tsx`:

```typescript
if (total_chunks > 0) {
  setExtractionMessage(
    `${progress_pct}% — Processing chunk ${current_chunk} of ${total_chunks}`
  )
} else {
  setExtractionMessage(`Extracting ${file.name}...`)
}
```

**With Option A (global progress scale), change to:**
```typescript
const passNum = progress_pct <= 33 ? 1 : progress_pct <= 66 ? 2 : 3
const passLabel = ['Project data', 'Architecture', 'Teams & delivery'][passNum - 1]
const withinPassPct = passNum === 1 ? Math.round(progress_pct * 3)
                    : passNum === 2 ? Math.round((progress_pct - 34) * 3)
                    : Math.round((progress_pct - 67) * 3)
setExtractionMessage(`Pass ${passNum} of 3 — ${passLabel} (${withinPassPct}%)`)
```

The stale heartbeat threshold at `/api/ingestion/jobs/[jobId]/route.ts` uses 10 minutes. With 3 passes (each potentially involving multiple Claude streaming calls), a long document could take several minutes per pass. The 10-minute threshold is already generous enough; no change needed.

### Recommended Text Document Chunking Strategy

Claude's Discretion item: "whether each pass re-sends all chunks or processes them in parallel."

**Recommendation: Sequential — all chunks per pass, then next pass.**

Rationale:
- Claude's context window for each chunk call is self-contained — it cannot carry context between chunks
- Running all chunks for pass 1 first, then all chunks for pass 2, then pass 3 gives the most predictable progress reporting (chunk N of M within each pass)
- Parallel chunk processing across passes would require restructuring the progress update logic significantly and risks rate-limit saturation on multiple concurrent streams per document
- This matches the current sequential chunk loop pattern exactly — just wrapped in an outer pass loop

Structure: `for pass in passes: for chunk in chunks: call Claude(pass_prompt, chunk)`

### Pass / Parallelism Decision

Claude's Discretion: "whether to parallelize passes 1/2/3 or run strictly sequentially."

**Recommendation: Sequential for Phase 52.**

Rationale:
- Sequential is trivially correct, easier to reason about, and produces clean pass-ordered progress messages
- The Anthropic API has per-account rate limits on concurrent streaming requests; 3 simultaneous streams per job multiplied by any concurrent jobs could hit limits
- Token cost per document triples either way — parallelism saves wall-clock time but not API cost
- Parallel pass implementation can be added in a future phase once sequential baseline is validated

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| JSON parsing of Claude output | Custom parser | `jsonrepair` + `JSON.parse` — already in `parseClaudeResponse()` |
| Streaming accumulation | Manual stream concat | `runClaudeCall()` pattern — already handles `stream.on('text')` + `finalMessage()` |
| Text chunking | Custom splitter | `splitIntoChunks()` — already paragraph-boundary-aware |
| DB dedup check | New query logic | `isAlreadyIngested()` — reuse the key field logic for intra-batch dedup key derivation |
| Prompt templating | String format library | Template literal string composition — already the pattern throughout |

---

## Common Pitfalls

### Pitfall 1: `runClaudeCall` system prompt capture
**What goes wrong:** The closure currently hard-codes `system: EXTRACTION_SYSTEM`. If the planner adds the system prompt as a parameter but forgets to thread it through the text-chunk inner loop, all 3 passes will use the same (last-set) prompt.
**How to avoid:** Pass `systemPrompt` explicitly into every `runClaudeCall(content, systemPrompt)` call. No global state for the active prompt.

### Pitfall 2: Progress pct boundary calculation
**What goes wrong:** Using integer arithmetic for pass-range mapping can produce 0% displays mid-extraction. E.g., if pass 2 starts at `progress_pct = 34` but within-pass formula divides by 0 or returns negative.
**How to avoid:** Clamp `withinPassPct` to 0–100 before setting the message. Test boundary values (pct=33, 34, 66, 67, 100).

### Pitfall 3: Stale heartbeat false positive with 3x more Claude calls
**What goes wrong:** Each pass involves one or more Claude streaming calls. On a large text document with many chunks, a 3-pass run could legitimately take longer than the stale detection window if Claude is slow. The stale threshold is 10 minutes — this is likely sufficient but needs monitoring.
**How to avoid:** Ensure `updated_at` is written after every chunk, not just after every pass. The existing per-chunk DB update (`db.update(extractionJobs).set({ progress_pct, current_chunk, updated_at: new Date() })`) already does this — preserve it in the multi-pass structure.

### Pitfall 4: Intra-batch dedup over-filters across entity types
**What goes wrong:** Using a dedup key without the `entityType` prefix could filter out legitimate data where the same text legitimately belongs to two entity types (e.g., a workstream name that equals a task title).
**How to avoid:** Always prefix the dedup key with `${item.entityType}::`. Only deduplicate when the same entityType+key pair appears more than once.

### Pitfall 5: `isAlreadyIngested()` divergence between worker copy and lib copy
**What goes wrong:** There are two copies of `isAlreadyIngested()`:
- `worker/jobs/document-extraction.ts` has a local copy (lines 141–342 of the worker)
- `lib/extraction-types.ts` has the canonical export used by the app layer

The worker's local copy does NOT have `wbs_task`, `arch_node`, `focus_area`, or `e2e_workflow` cases — it uses the default `return false` for those. The lib version has them.
**How to avoid:** For the intra-batch dedup key derivation, use the lib version's key field logic as the authoritative source. Phase 52 should also reconcile the worker's local `isAlreadyIngested()` with the lib canonical version (or replace the worker copy with an import from lib).

### Pitfall 6: Pass-specific EntityType union drift
**What goes wrong:** The worker's local `EntityType` union (lines 83–104 of the worker) is also divergent from `lib/extraction-types.ts` — the lib version has `team_engagement` (deprecated) and lacks `before_state`/`weekly_focus` entries. If the planner adds pass type lists based on the worker's local union, they may include types the lib doesn't cover.
**How to avoid:** Pass entity type lists should be defined from the worker's own `EntityType` union, which is more current (includes `before_state`, `weekly_focus`). The lib version's deprecated `team_engagement` should be excluded from all pass lists.

---

## Code Examples

### Existing `runClaudeCall` closure (from worker, line 406)
```typescript
// Source: worker/jobs/document-extraction.ts
const runClaudeCall = async (content: Anthropic.MessageParam['content']): Promise<string> => {
  let fullText = '';
  const claudeStream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    system: EXTRACTION_SYSTEM,
    messages: [{ role: 'user', content }],
  });
  claudeStream.on('text', (text: string) => { fullText += text; });
  await claudeStream.finalMessage();
  return fullText;
};
```

Must become:
```typescript
const runClaudeCall = async (
  content: Anthropic.MessageParam['content'],
  systemPrompt: string,
): Promise<string> => {
  let fullText = '';
  const claudeStream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    system: systemPrompt,   // pass-specific prompt
    messages: [{ role: 'user', content }],
  });
  claudeStream.on('text', (text: string) => { fullText += text; });
  await claudeStream.finalMessage();
  return fullText;
};
```

### Current progress update pattern (from worker, line 501)
```typescript
// Source: worker/jobs/document-extraction.ts (text path, per-chunk update)
const progressPct = Math.round(((i + 1) / totalChunks) * 100);
await db.update(extractionJobs)
  .set({
    progress_pct: progressPct,
    current_chunk: i + 1,
    updated_at: new Date()
  })
  .where(eq(extractionJobs.id, jobId));
```

Multi-pass version maps within-pass pct to global range:
```typescript
// passIndex = 0, 1, or 2
// passProgressPct = 0-100 within the current pass
const globalPct = Math.round((passIndex / 3) * 100 + (passProgressPct / 3));
await db.update(extractionJobs)
  .set({ progress_pct: globalPct, current_chunk: i + 1, updated_at: new Date() })
  .where(eq(extractionJobs.id, jobId));
```

### Current IngestionModal extraction message (from IngestionModal.tsx, line 115)
```typescript
// Source: components/IngestionModal.tsx
if (total_chunks > 0) {
  setExtractionMessage(
    `${progress_pct}% — Processing chunk ${current_chunk} of ${total_chunks}`
  )
} else {
  setExtractionMessage(`Extracting ${file.name}...`)
}
```

Updated pass-aware message:
```typescript
const PASS_LABELS = ['Project data', 'Architecture', 'Teams & delivery']
const passIdx = progress_pct <= 33 ? 0 : progress_pct <= 66 ? 1 : 2
const passLabel = PASS_LABELS[passIdx]
const passNum = passIdx + 1
const passStartPct = passIdx * 34  // 0, 34, 68 (approx boundaries)
const withinPassRaw = Math.round(Math.max(0, progress_pct - passStartPct) * 3)
const withinPassPct = Math.min(100, withinPassRaw)
setExtractionMessage(`Pass ${passNum} of 3 — ${passLabel} (${withinPassPct}%)`)
```

### DB schema for extraction_jobs (from db/schema.ts, line 750)
```typescript
// Source: db/schema.ts — no schema migration needed for Option A
export const extractionJobs = pgTable('extraction_jobs', {
  id:                serial('id').primaryKey(),
  artifact_id:       integer('artifact_id').notNull(),
  project_id:        integer('project_id').notNull(),
  batch_id:          text('batch_id').notNull(),
  status:            extractionJobStatusEnum('status').default('pending').notNull(),
  progress_pct:      integer('progress_pct').default(0).notNull(),  // 0-100 global
  current_chunk:     integer('current_chunk').default(0).notNull(),
  total_chunks:      integer('total_chunks').default(0).notNull(),
  staged_items_json: jsonb('staged_items_json'),
  filtered_count:    integer('filtered_count').default(0).notNull(),
  error_message:     text('error_message'),
  created_at:        timestamp('created_at').defaultNow().notNull(),
  updated_at:        timestamp('updated_at').defaultNow().notNull(),
});
```

---

## Key Divergences to Resolve

### Worker `isAlreadyIngested` vs lib `isAlreadyIngested`

The worker at `worker/jobs/document-extraction.ts` (lines 141–342) has a LOCAL copy of `isAlreadyIngested` that is out of sync with the canonical version at `lib/extraction-types.ts`. Divergences:

| Entity | Worker local | lib canonical |
|---|---|---|
| `team` | queries `focusAreas` (stale) | queries `teamOnboardingStatus` (correct) |
| `wbs_task` | not handled (falls to default `return false`) | handled with track composite key |
| `arch_node` | not handled | handled with track_id lookup |
| `focus_area` | not handled | handled |
| `e2e_workflow` | not handled | handled with workflow_name+team_name |

**Phase 52 should import `isAlreadyIngested` from `lib/extraction-types.ts` in the worker, removing the local copy.** This is a prerequisite for correct DB dedup of the new Pass 2 and Pass 3 entity types.

### EntityType Union Sync

- `worker/jobs/document-extraction.ts` `EntityType` union: includes `before_state`, `weekly_focus`, does NOT include `team_engagement`
- `lib/extraction-types.ts` `EntityType` union: includes `team_engagement` (deprecated), does NOT include `before_state` or `weekly_focus`

The lib version needs `before_state` and `weekly_focus` added (or the worker must define its own pass-specific arrays from its own union). The intra-batch dedup function will live in the worker, so it can use the worker's `EntityType` union directly.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (from package.json `"test": "vitest"`) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app" && npx vitest run --reporter=verbose 2>&1 | tail -30` |
| Full suite command | `cd "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app" && npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| Pass prompts contain only their entity types (no cross-pass types) | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts -t "pass prompts"` | Wave 0 |
| 3 Claude calls made per PDF document (one per pass) | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts -t "PDF 3 passes"` | Wave 0 |
| 3 Claude calls made per text chunk set (one set of chunk loops per pass) | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts -t "text 3 passes"` | Wave 0 |
| Items from all passes merged before staging | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts -t "merge"` | Wave 0 |
| Intra-batch dedup removes same entityType+key duplicates | unit | `npx vitest run worker/jobs/__tests__/document-extraction-dedup.test.ts -t "intra-batch"` | Wave 0 |
| Intra-batch dedup preserves same key under different entityTypes | unit | `npx vitest run worker/jobs/__tests__/document-extraction-dedup.test.ts -t "cross-type preserved"` | Wave 0 |
| progress_pct increments through global range during multi-pass run | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts -t "progress"` | Wave 0 |
| IngestionModal displays "Pass N of 3 — Label (pct%)" message | unit (source inspection) | `npx vitest run __tests__/ingestion-modal-pass-progress.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app" && npx vitest run worker/jobs/__tests__/ lib/__tests__/`
- **Per wave merge:** `cd "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app" && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `worker/jobs/__tests__/document-extraction-passes.test.ts` — unit tests for 3-pass structure, progress encoding, PDF + text paths
- [ ] `worker/jobs/__tests__/document-extraction-dedup.test.ts` — unit tests for `deduplicateWithinBatch()` function covering all entity types
- [ ] `__tests__/ingestion-modal-pass-progress.test.ts` — source inspection test that the `PASS_LABELS` constant and pass-index math exist in `IngestionModal.tsx`

---

## Open Questions

1. **Should Phase 52 fix the worker's stale local `isAlreadyIngested()` copy?**
   - What we know: The worker has an out-of-date local copy missing `wbs_task`, `arch_node`, `focus_area`, `e2e_workflow` cases. The canonical version is in `lib/extraction-types.ts`.
   - What's unclear: Whether replacing the local copy with an import was intentionally deferred or just missed.
   - Recommendation: Include this fix in Phase 52 (single line import change, removes ~200 LOC of duplicate code) since the new Pass 2 and Pass 3 entity types depend on correct DB dedup.

2. **Should the `lib/extraction-types.ts` EntityType union be updated to include `before_state` and `weekly_focus`?**
   - What we know: These types were added to the worker's union in Phase 51 but not propagated to the lib.
   - What's unclear: Whether any UI code imports `EntityType` from lib and would be affected.
   - Recommendation: Yes — synchronize the unions as part of Phase 52 since the review queue code in `IngestionModal` imports `ExtractionItem` from `lib/extraction-types.ts` and should handle these types in the review UI.

3. **Global progress scale thresholds: even thirds vs. estimated-duration weighting?**
   - What we know: Pass 3 has the most entity types (10 types) and thus likely produces the most items; Pass 1 has the most extraction activity for typical documents.
   - What's unclear: Whether users care enough about within-pass accuracy to justify unequal pass ranges.
   - Recommendation: Use even thirds (0–33/34–66/67–100) for Phase 52. Fine-tuning can come after observing real extraction durations.

---

## Sources

### Primary (HIGH confidence)
All findings are from direct codebase inspection:
- `worker/jobs/document-extraction.ts` — primary change file, full read
- `lib/extraction-types.ts` — canonical `isAlreadyIngested()`, full read
- `components/IngestionModal.tsx` — polling loop and progress display, full read
- `app/api/ingestion/jobs/[jobId]/route.ts` — polling endpoint shape, full read
- `app/api/projects/[projectId]/extraction-status/route.ts` — batch completion check, full read
- `db/schema.ts` lines 745–767 — `extractionJobs` table schema, direct read
- `vitest.config.ts` — test framework configuration, direct read
- `.planning/extraction-intelligence-gap.md` — root cause analysis, direct read
- `.planning/phases/52-multi-pass-targeted-extraction-for-full-tab-coverage/52-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — accumulated phase decisions and patterns
- `.planning/REQUIREMENTS.md` — project requirements context

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture patterns: HIGH — derived from direct code inspection of all integration points
- Pitfalls: HIGH — worker/lib divergences confirmed by direct read of both files
- Progress encoding: HIGH — `progress_pct` schema column confirmed integer 0-100, polling endpoint fields confirmed
- Schema impact: HIGH — no migration needed for Option A (global pct scale)

**Research date:** 2026-04-09
**Valid until:** Stable codebase — valid until Phase 52 implementation changes document-extraction.ts
