# Phase 53: Extraction Prompt Intelligence & Pipeline Completion — Research

**Researched:** 2026-04-09
**Domain:** Anthropic prompt engineering + Next.js API route pipeline gaps
**Confidence:** HIGH

---

## Summary

Phase 53 has two orthogonal workstreams that share a single codebase entry point (`document-extraction.ts` for prompts, `approve/route.ts` for pipeline). The prompt engineering work (EXTR-02 through EXTR-11) is entirely contained in the extraction worker job. The pipeline gap work (EXTR-12 through EXTR-16) is split between the approve route and the IngestionModal UI.

**Critical finding — Gap status inventory:** Most Phase 51 pipeline gaps are ALREADY CLOSED in the current code. Specifically: Gap A (`before_state` upsert handler at line 760), Gap B (WBS orphan fallback at lines 731-733), Gap C (`arch_node` graceful skip via `skipEntity` at lines 870-875), Gap G (weekly_focus Redis handler at lines 983-1009). However, Gap D (team_engagement routing) and Gap F (per-entity response) appear to already have implementations from Phase 51 Plan 04. The planner MUST verify whether `before_state` isAlreadyIngested dedup remains `return false` (line 362 of extraction-types.ts) — this means every re-ingestion always creates a new `before_state` record rather than checking if one exists, which the Phase 53 upsert handler compensates for correctly.

**Primary recommendation:** Phase 53 is net-new prompt engineering work (10 improvements) plus verification/wire-up of pipeline gaps that may already be partially implemented. Plan must distinguish "implement from scratch" (EXTR-02 through EXTR-11 in document-extraction.ts) from "verify + fix gaps" (EXTR-12 through EXTR-16 in approve/route.ts).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXTR-02 | Document-first layout: `<document>` tags wrapping doc content placed before instructions | EXTRACTION_BASE currently places instructions before document; swap needed in both PDF (user content block) and text (passUserText) paths |
| EXTR-03 | Few-shot examples in `<example>` tags — 3 per pass, hardest disambiguation cases | PASS_PROMPTS[1/2/3] currently have no `<example>` blocks; disambiguation is narrative only |
| EXTR-04 | Field-level inference rules in field description strings co-located with fields | Rules exist in global INFERENCE RULES block only; not co-located with individual field descriptions |
| EXTR-05 | Status normalization as explicit lookup table in EXTRACTION_BASE | Narrative rules exist in field descriptions; no compact lookup table |
| EXTR-06 | Date inference requires active justification for null | INFERENCE RULES section says "use null only when there is genuinely no signal" — needs strengthening to require explicit justification |
| EXTR-07 | Section-by-section scanning instruction + end-of-prompt self-check in each pass | Neither scanning instruction nor self-check exists in any pass prompt |
| EXTR-08 | Replace raw JSON with `record_entities` tool call (`strict: true`), eliminate jsonrepair | `parseClaudeResponse` uses `jsonrepair` today; tool use API requires switching from `messages.stream` to tool-use API call |
| EXTR-09 | `splitIntoChunks` adds 2,000-char overlap | Current `splitIntoChunks` at line 211 has zero overlap — `start = end` with no overlap buffer |
| EXTR-10 | Coverage self-reporting: `COVERAGE: entity_type: N | GAPS: ...` line; parse + store | No coverage reporting in any pass; extraction_jobs table has no coverage column (would need new column or store in existing jsonb) |
| EXTR-11 | Pass 0 pre-analysis: Claude quotes relevant sections before extraction passes | Only 3 passes exist today; Pass 0 would be a new pre-analysis call prepended before pass 1 |
| EXTR-12 | `before_state` end-to-end handler in approve route | ALREADY IMPLEMENTED at line 760-816 of approve/route.ts. `isAlreadyIngested` returns `false` always (line 362 extraction-types.ts), so re-ingestion always attempts upsert — upsert handler compensates correctly |
| EXTR-13 | WBS orphan fallback when parent_section_name doesn't match | ALREADY IMPLEMENTED at lines 719-757 of approve/route.ts (fallbackToLevel1 pattern) |
| EXTR-14 | arch_node fuzzy/partial match + graceful skip on unknown track | ALREADY IMPLEMENTED — skip via skipEntity at lines 870-875; fuzzy match via ilike `%${f.track}%` |
| EXTR-15 | team_engagement routing fix — extracted data surfaces in Teams tab | INVESTIGATION NEEDED — Teams tab `getTeamsTabData` queries businessOutcomes, e2eWorkflows, focusAreas, architectureIntegrations, teamOnboardingStatus. The `team_engagement` entity type still has a handler in approve/route.ts (lines 818-856) routing to `teamEngagementSections` table, BUT `teamEngagementSections` is NOT queried by `getTeamsTabData`. However, `team_engagement` was removed from the extraction prompt in Phase 51 Plan 02, so it should no longer be extracted — VERIFY the Zod enum still allows it and whether any items actually land in this dead handler |
| EXTR-16 | Per-entity write counts in approve response; IngestionModal breakdown display | ALREADY IMPLEMENTED — IngestionModal has `approvalResult` state with `written/skipped/errors` (lines 81-85, 504-533). The `done` stage renders the breakdown. Need to verify approve route returns this structure |
</phase_requirements>

---

## Standard Stack

### Core (already in use — no new dependencies needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | current | Claude API client | Project standard |
| drizzle-orm | current | DB queries in approve route | Project standard |
| jsonrepair | current | JSON repair — BEING REPLACED by EXTR-08 | Being eliminated |
| zod | current | Request validation in approve route | Project standard |

### For EXTR-08 Tool Use Migration
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @anthropic-ai/sdk tools | current | Structured tool call API | Required for EXTR-08 — already installed |

**Installation:** No new packages required. `@anthropic-ai/sdk` already supports tool use.

---

## Architecture Patterns

### Current document-extraction.ts Structure
```
worker/jobs/document-extraction.ts
├── Constants (CHUNK_CHAR_LIMIT = 80,000)
├── EXTRACTION_BASE (shared system prompt — all disambiguation, inference rules)
├── PASS_PROMPTS[1|2|3] (pass-specific entity type guidance appended to BASE)
├── Types (ExtractionPass, EntityType, ExtractionItem)
├── PASSES[] (3 pass definitions with labels and entityTypes)
├── splitIntoChunks() — NO overlap currently
├── normalize() — lowercases, trims, truncates
├── parseClaudeResponse() — strips fences, jsonrepair, JSON.parse
├── buildDedupeKey() / deduplicateWithinBatch()
└── documentExtractionJob() — outer job handler
    ├── PDF path: 3 sequential Claude calls (one per pass)
    └── Text path: 3 pass loops × N chunk loops
```

### Pattern 1: Document-First Layout (EXTR-02)
**What:** Anthropic recommends placing document content BEFORE instructions for better grounding.
**When to use:** All extraction prompts (both PDF and text paths)
**Current state (PDF path):**
```typescript
// CURRENT — instructions after document (correct for PDF: doc is in user content block)
const userContent = [
  { type: 'document', source: { type: 'base64', ... } },
  { type: 'text', text: passUserText },  // instructions follow document
];
// PDF path is already document-first — document block precedes text instruction block
```
**Current state (text path):**
```typescript
// CURRENT — instructions before document text
const passUserText = `Extract ONLY the following entity types: ${pass.entityTypes.join(', ')}.\n\nDocument content:\n\n${chunks[i]}\n\nOutput only the JSON array.`;
// Document content is INLINE in a single text block — needs wrapping in <document> tags
```
**Fix for text path:**
```typescript
// FIXED — document in <document> tags, instructions after
const passUserText = `<document>\n${chunks[i]}\n</document>\n\nExtract ONLY the following entity types: ${pass.entityTypes.join(', ')}.\n\nOutput only the JSON array.`;
```
**Fix for system prompt (EXTRACTION_BASE):**
```typescript
// The system prompt itself should reference <document> tags so Claude knows to look there
// Add to EXTRACTION_BASE preamble: "The document to extract from is provided in <document> tags."
```

### Pattern 2: Few-Shot Examples (EXTR-03)
**What:** 3 `<example>` blocks per pass in the pass-specific prompt section
**Focus areas per pass:**
- Pass 1: task vs wbs_task disambiguation (flat list vs hierarchical)
- Pass 2: architecture vs arch_node vs integration disambiguation
- Pass 3: team vs stakeholder, wbs_task level inference from indentation

```typescript
// Example structure (to be added to each PASS_PROMPTS entry)
`<example>
Input: "Phase 1 tasks: 1. Solution Design - Complete solution architecture"
Output: [{"entityType": "wbs_task", "fields": {"title": "Solution Architecture", "parent_section_name": "Solution Design", "level": "3", "status": "not_started"}, "confidence": 0.9, "sourceExcerpt": "Complete solution architecture"}]
</example>`
```

### Pattern 3: Tool Use Migration (EXTR-08)
**What:** Replace raw JSON streaming with Anthropic tool use (`record_entities` tool, `strict: true`)
**Current flow:** `client.messages.stream()` → streaming text → `parseClaudeResponse()` → `jsonrepair()` → JSON.parse
**New flow:** `client.messages.create()` with `tools` array → tool_use block → `input` field (already valid JSON)

**Tool definition:**
```typescript
const RECORD_ENTITIES_TOOL: Anthropic.Tool = {
  name: 'record_entities',
  description: 'Record all extracted project entities from the document.',
  input_schema: {
    type: 'object' as const,
    properties: {
      entities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            entityType: { type: 'string' },
            fields: { type: 'object' },
            confidence: { type: 'number' },
            sourceExcerpt: { type: 'string' },
          },
          required: ['entityType', 'fields', 'confidence', 'sourceExcerpt'],
          additionalProperties: false,
        },
      },
    },
    required: ['entities'],
  },
};
```

**New API call pattern (replaces `runClaudeCall` streaming pattern):**
```typescript
// Source: Anthropic SDK tool use API
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 16384,
  system: systemPrompt,
  messages: [{ role: 'user', content }],
  tools: [RECORD_ENTITIES_TOOL],
  tool_choice: { type: 'tool', name: 'record_entities' },
});
// Extract entities from tool_use block
const toolUseBlock = response.content.find(b => b.type === 'tool_use');
const items = toolUseBlock ? (toolUseBlock.input as { entities: ExtractionItem[] }).entities : [];
```

**CRITICAL — Streaming vs. non-streaming:** The current `runClaudeCall` uses `client.messages.stream()`. Tool use calls must use `client.messages.create()` (non-streaming). The `runClaudeCall` helper will need to either be replaced or overloaded. Progress reporting for text chunked extraction currently uses streaming progress_pct updates — this will still work since progress is per-chunk, not per-token.

**CRITICAL — `jsonrepair` import removal:** After tool use migration, `import { jsonrepair } from 'jsonrepair'` can be removed. `parseClaudeResponse()` function becomes obsolete (or kept only as fallback during transition).

### Pattern 4: Chunk Overlap (EXTR-09)
**What:** Add 2,000-char overlap when advancing chunk start position
**Current `splitIntoChunks` (line 211-226):**
```typescript
// CURRENT — zero overlap
start = end;
```
**Fixed:**
```typescript
// FIXED — 2000-char overlap, start walks forward by (end - start - overlap)
const CHUNK_OVERLAP = 2_000;
// ...
start = Math.max(start + 1, end - CHUNK_OVERLAP);
```
**Risk:** Overlap increases total characters processed per document — at 80k limit with 2k overlap on a 160k doc, this means 4 chunks instead of 2. Acceptable for extraction quality improvement.

### Pattern 5: Coverage Self-Reporting (EXTR-10)
**What:** Append `COVERAGE: entity_type: N | GAPS: ...` after JSON in each pass response, then parse + store.
**Storage decision:** The `extractionJobs` table has `staged_items_json` (jsonb) and `filtered_count` but no coverage column. Options:
1. Add new `coverage_json` column to `extractionJobs` (requires migration)
2. Store coverage in `staged_items_json` as a side-channel object alongside entities array (hacky)
3. Log coverage to console/job metadata only (no DB persistence)

**Recommendation:** Store coverage in `extractionJobs` via new `coverage_json` jsonb column. This enables debugging without breaking staged_items_json structure. The planner should scope whether DB migration is in-phase or deferred.

**Prompt addition (per pass):**
```
After the JSON array, append a COVERAGE line:
COVERAGE: action: N, risk: N, wbs_task: N | GAPS: <describe any sections you could not extract from>
```

**Parsing in worker:**
```typescript
// After tool use call (if keeping text format) or as separate extraction
const coverageMatch = fullText.match(/^COVERAGE:\s*(.+)$/m);
if (coverageMatch) {
  // Parse and store to extractionJobs.coverage_json
}
```

**Note:** With tool use migration (EXTR-08), Claude won't be appending free text after the tool call. EXTR-10 must either use a separate text field in the tool schema OR be done via a brief text response alongside the tool call. The Anthropic API allows `tool_choice: { type: 'auto' }` + a coverage text message in the same response. Alternatively, add a `coverage` field directly to the `record_entities` tool schema.

### Pattern 6: Pass 0 Pre-Analysis (EXTR-11)
**What:** New Claude call before Pass 1 where Claude quotes relevant document sections.
**Purpose:** Improves recall on dense/complex documents by grounding subsequent passes.
**Implementation:**
```typescript
// New PASS_PROMPTS[0] — pre-analysis prompt
const PASS_0_PROMPT = `${EXTRACTION_BASE}
PRE-ANALYSIS: Before extracting entities, scan the entire document and quote the 5-10 most information-dense sections related to project status, tasks, architecture, and team data. Format each as:
<relevant_section>
[quoted text]
</relevant_section>
These quotes will inform the extraction passes that follow. Do not extract entities yet.`;

// Pass 0 result is stored as context, prepended to Passes 1-3 as additional user context
```

**Critical consideration:** Pass 0 adds a full Claude call per document. For PDFs, this is 1 additional API call. For text documents with N chunks, this may be 1 call on the full document or 1 per chunk. Recommend: Pass 0 runs once on the full document (or first chunk if >80k chars), its output is prepended to ALL subsequent pass prompts as `<pre_analysis>` context.

**PASSES array change:** Current `PASSES.length === 3`. With Pass 0, it would be 4 passes. Progress math and `total_chunks` DB update need adjustment.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema enforcement | Custom validation in parseClaudeResponse | Anthropic tool use with `strict` schema | Tool use guarantees valid JSON, eliminates jsonrepair |
| Status normalization | Inline string comparisons scattered in prompts | Explicit lookup table in EXTRACTION_BASE | Easier to audit, Claude follows tables better than prose |
| Dedup across passes | New dedup logic | Existing `deduplicateWithinBatch()` | Already handles all entity types with composite keys |

---

## Common Pitfalls

### Pitfall 1: Tool Use Breaks Streaming Progress
**What goes wrong:** `client.messages.create()` (required for tool use) is non-streaming. The current worker updates `progress_pct` using per-pass updates. Without streaming, progress granularity drops but the per-pass updates still work.
**How to avoid:** Keep per-pass progress DB updates (33/66/100 for PDF; pass-weighted formula for text). Just remove per-token streaming — progress will be coarser but functional.
**Warning signs:** Progress stuck at 0% until end of each pass.

### Pitfall 2: Pass 0 Doubles Total API Calls
**What goes wrong:** If Pass 0 runs per-chunk (not per-document), a 3-chunk document goes from 9 API calls to 12.
**How to avoid:** Pass 0 must run once per document on the full text (truncated to 80k if needed), not per chunk.

### Pitfall 3: Coverage Self-Reporting Conflicts with Tool Use
**What goes wrong:** With tool use (`tool_choice: { type: 'tool' }`), Claude ONLY returns the tool call — no free text. A `COVERAGE: ...` line in the response will never appear.
**How to avoid:** Add `coverage` as a field in the `record_entities` tool schema. OR use `tool_choice: 'auto'` and parse both the tool_use block AND any text blocks.
**Recommended:** Add `coverage` field to tool schema. Simple and structured.

### Pitfall 4: `before_state` isAlreadyIngested Always Returns False
**What goes wrong:** `isAlreadyIngested` for `before_state` returns `false` unconditionally (extraction-types.ts line 362). Every re-ingestion of a document with before_state content will surface the item in the review queue.
**Why it happens:** The comment says "treat as always-new" but the upsert handler in approve/route.ts handles multiple invocations correctly via upsert.
**How to avoid:** EXTR-12 is satisfied by the current upsert handler. The planner may want to update `isAlreadyIngested` to query `beforeState` table — this would prevent before_state from showing in the review queue on re-ingestion. Add it to EXTR-12 scope if desired.

### Pitfall 5: WBS Orphan Fallback Already Implemented
**What goes wrong:** Planning new code for Gap B when it already exists.
**Current state:** Lines 731-757 of approve/route.ts implement `fallbackToLevel1` correctly.
**How to avoid:** EXTR-13 should be a VERIFY task (confirm behavior, add/update tests) not a BUILD task.

### Pitfall 6: arch_node Graceful Skip Already Implemented
**What goes wrong:** Planning new code for Gap C when it already exists.
**Current state:** Lines 870-875 use `skipEntity = true` error pattern; the POST loop must handle this — verify the loop catches this correctly.
**How to avoid:** EXTR-14 should verify the `skipEntity` catch in the main POST handler loop.

### Pitfall 7: team_engagement Handler Routes to Dead Table
**What goes wrong:** The `team_engagement` entity type still has a Zod enum entry and an `insertItem` case routing to `teamEngagementSections`, but `getTeamsTabData` doesn't query `teamEngagementSections`. The Teams tab will never show this data.
**Current state:** Phase 51 Plan 02 removed `team_engagement` from the extraction prompt — so Claude should never extract it. However, the Zod enum in approve/route.ts still allows it (line 45: `'team_engagement'`).
**EXTR-15 scope:** Confirm `team_engagement` is not being extracted (it shouldn't be since it was removed from prompts). The question is whether `teamEngagementSections` data surfaces anywhere. Looking at the Teams tab query (`getTeamsTabData`), it queries `teamOnboardingStatus`, `businessOutcomes`, `e2eWorkflows`, `focusAreas` — NOT `teamEngagementSections`. The `teamEngagementSections` table is used only by `getTeamEngagementSections()` which is called by... (check TeamEngagementMap usage).
**How to avoid:** EXTR-15 may require either: (a) wiring `getTeamEngagementSections` into the Teams tab data, or (b) confirming the correct entity types already cover Teams tab needs and the teamEngagementSections table is functionally superseded. This is the most uncertain gap — needs investigation during planning.

### Pitfall 8: Per-Entity Feedback Already Implemented in IngestionModal
**What goes wrong:** Planning new UI work for Gap F when it already exists.
**Current state:** IngestionModal lines 81-85 define `approvalResult` state; lines 504-533 render the written/skipped/errors breakdown in `done` stage. The `handleApprove` function captures `data.written/skipped/errors` from approve response (lines 367-371).
**EXTR-16 scope:** Verify the approve route response actually returns `written`, `skipped`, `errors` in the expected shape. Read the POST handler return in approve/route.ts (not yet read in detail — planner must verify).

---

## Code Examples

### Existing approve route response structure (to verify for EXTR-16)

Need to confirm: does approve/route.ts POST return `{ written: Record<string, number>, skipped: Record<string, number>, errors: [] }`? The IngestionModal reads these fields at lines 367-371. If approve already returns this structure, EXTR-16 is a verify task. The STATE.md mentions "Phase 51 Plan 04: Per-entity response structure uses Record<string, number> for written/skipped counts" — this strongly suggests it IS already implemented.

### Existing splitIntoChunks (no overlap — for EXTR-09 reference)
```typescript
// Source: bigpanda-app/worker/jobs/document-extraction.ts lines 211-226
function splitIntoChunks(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + limit;
    if (end < text.length) {
      const boundary = text.lastIndexOf('\n\n', end);
      if (boundary > start) end = boundary;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;  // <-- NO OVERLAP: fix by subtracting CHUNK_OVERLAP here
  }
  return chunks.filter(c => c.length > 0);
}
```

### Existing PASSES definition (for EXTR-11 Pass 0 addition)
```typescript
// Source: bigpanda-app/worker/jobs/document-extraction.ts lines 158-177
export const PASSES: ExtractionPass[] = [
  { passNumber: 1, label: 'Project data', entityTypes: ['action', 'risk', 'task', 'milestone', 'decision', 'note', 'history'] },
  { passNumber: 2, label: 'Architecture', entityTypes: ['architecture', 'arch_node', 'integration', 'before_state'] },
  { passNumber: 3, label: 'Teams & delivery', entityTypes: ['team', 'wbs_task', ...] },
];
// Pass 0 would be prepended: { passNumber: 0, label: 'Pre-analysis', entityTypes: [] }
```

### Existing `before_state` schema (for EXTR-12 verification)
```typescript
// Source: bigpanda-app/db/schema.ts lines 610-618
export const beforeState = pgTable('before_state', {
  id:                      serial('id').primaryKey(),
  project_id:              integer('project_id').notNull().references(() => projects.id),
  aggregation_hub_name:    text('aggregation_hub_name'),
  alert_to_ticket_problem: text('alert_to_ticket_problem'),
  pain_points_json:        jsonb('pain_points_json').default([]).notNull(),
  source:                  text('source').notNull().default('manual'),
  created_at:              timestamp('created_at').defaultNow().notNull(),
});
// Note: NO updated_at column — approve/route.ts upsert only updates specific fields
// Note: NO source_artifact_id — can't track which ingestion populated it
```

### arch_node skipEntity pattern (for EXTR-14 verification)
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts lines 870-875
if (trackRows.length === 0) {
  const skipErr = new Error(`arch_node:track_not_found:${f.track ?? 'unknown'}`);
  (skipErr as any).skipEntity = true;
  throw skipErr;
}
// The POST handler must catch errors with skipEntity=true and route to skipped count
// NOT to error count — planner must verify this catch exists in the POST handler
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-pass extraction | 3-pass extraction loop | Phase 52 | Better recall per entity group |
| Streaming JSON text | (migrating to) Tool use | Phase 53 (EXTR-08) | Eliminates jsonrepair, schema enforcement |
| Zero chunk overlap | 2,000-char overlap | Phase 53 (EXTR-09) | Prevents cross-boundary entity miss |
| No pass 0 | Pass 0 pre-analysis | Phase 53 (EXTR-11) | Improved recall on dense docs |
| team_engagement entity | Removed from prompt | Phase 51 Plan 02 | Dead code path remains in Zod/handler |

**Deprecated/outdated:**
- `jsonrepair` import: will be removed after EXTR-08 tool use migration
- `parseClaudeResponse()` function: will be removed after EXTR-08
- `team_engagement` in Zod enum: leftover dead path, should be cleaned up (EXTR-15 scope)

---

## Open Questions

1. **Does approve/route.ts POST return per-entity written/skipped counts? (EXTR-16)**
   - What we know: IngestionModal reads `data.written`, `data.skipped`, `data.errors` and STATE.md says Phase 51 Plan 04 implemented per-entity response structure
   - What's unclear: The end of the approve route POST handler was not fully read in this research pass
   - Recommendation: Planner reads the POST handler return value (lines ~1400-1500 of route.ts) before planning EXTR-16

2. **Does the skipEntity catch in the POST handler route to skipped or errors? (EXTR-14)**
   - What we know: `insertItem` throws `skipErr` with `skipEntity=true` for unknown arch_node tracks
   - What's unclear: Whether the outer POST loop catches this and increments `skipped[entityType]` vs `errors`
   - Recommendation: Planner reads the main POST loop in approve/route.ts to verify catch logic

3. **Does TeamEngagementMap display teamEngagementSections data anywhere? (EXTR-15)**
   - What we know: `getTeamsTabData` does NOT query `teamEngagementSections`; `getTeamEngagementSections` exists in queries.ts
   - What's unclear: Whether TeamEngagementMap or any sub-component calls `getTeamEngagementSections` separately
   - Recommendation: Planner reads `components/teams/TeamEngagementMap.tsx` to check if teamEngagementSections appears

4. **Should EXTR-10 coverage data be stored in a new DB column or inline?**
   - What we know: No coverage column exists in extractionJobs schema
   - What's unclear: Whether a schema migration is acceptable in this phase
   - Recommendation: Add `coverage_json` jsonb column to extractionJobs; include migration in Wave 0 plan

5. **EXTR-08 tool use + EXTR-10 coverage — are they compatible?**
   - What we know: `tool_choice: { type: 'tool' }` forces tool-only output (no text)
   - Resolution: Add `coverage` as a field in the `record_entities` tool schema (entities array + coverage string). This satisfies both requirements simultaneously.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (confirmed from vitest.config.ts) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run tests/ingestion/ --reporter=verbose` |
| Full suite command | `cd bigpanda-app && npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXTR-02 | document-first layout in text path prompt | unit | `npx vitest run tests/ingestion/extraction-job.test.ts -t "document-first"` | ❌ Wave 0 |
| EXTR-03 | few-shot examples appear in PASS_PROMPTS | unit (source inspection) | `npx vitest run tests/ingestion/extraction-job.test.ts -t "few-shot"` | ❌ Wave 0 |
| EXTR-04 | field-level inference rules co-located | unit (source inspection) | `npx vitest run tests/ingestion/extraction-job.test.ts -t "field-level"` | ❌ Wave 0 |
| EXTR-05 | status lookup table in EXTRACTION_BASE | unit (source inspection) | `npx vitest run tests/ingestion/extraction-job.test.ts -t "status-table"` | ❌ Wave 0 |
| EXTR-06 | date null flip instruction present | unit (source inspection) | `npx vitest run tests/ingestion/extraction-job.test.ts -t "date-null"` | ❌ Wave 0 |
| EXTR-07 | section scan + self-check in each pass | unit (source inspection) | `npx vitest run tests/ingestion/extraction-job.test.ts -t "self-check"` | ❌ Wave 0 |
| EXTR-08 | tool use replaces raw JSON | unit | `npx vitest run tests/ingestion/extraction-job.test.ts -t "tool-use"` | ❌ Wave 0 |
| EXTR-09 | splitIntoChunks has 2000-char overlap | unit | `npx vitest run tests/ingestion/extraction-job.test.ts -t "chunk-overlap"` | ❌ Wave 0 |
| EXTR-10 | coverage line parsed and stored | unit | `npx vitest run tests/ingestion/extraction-job.test.ts -t "coverage"` | ❌ Wave 0 |
| EXTR-11 | Pass 0 pre-analysis runs before Pass 1 | unit | `npx vitest run tests/ingestion/extraction-job.test.ts -t "pass-0"` | ❌ Wave 0 |
| EXTR-12 | before_state upsert in approve route | unit | `npx vitest run tests/ingestion/write.test.ts -t "before_state"` | ✅ (verify) |
| EXTR-13 | WBS orphan fallback | unit | `npx vitest run tests/ingestion/write.test.ts -t "wbs.*orphan"` | ✅ (verify) |
| EXTR-14 | arch_node skip on unknown track | unit | `npx vitest run tests/ingestion/write.test.ts -t "arch_node.*skip"` | ✅ (verify) |
| EXTR-15 | team_engagement surfacing | integration | manual verification | ❌ Wave 0 |
| EXTR-16 | per-entity counts in approve response | unit | `npx vitest run tests/ingestion/write.test.ts -t "per-entity"` | ✅ (verify) |

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run tests/ingestion/ --reporter=verbose`
- **Per wave merge:** `cd bigpanda-app && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/ingestion/extraction-prompts.test.ts` — source inspection tests for EXTR-02 through EXTR-11 (prompt content verification)
- [ ] `tests/ingestion/extraction-job.test.ts` — extend with tool use, chunk overlap, pass 0 tests
- [ ] DB migration for `coverage_json` column on `extractionJobs` (if EXTR-10 stores to DB)

*(Existing `tests/ingestion/write.test.ts` likely covers EXTR-12/13/14/16 — verify before adding stubs)*

---

## Pipeline Gap Status Summary

| Gap | EXTR Req | Status | Action Needed |
|-----|----------|--------|---------------|
| A: before_state upsert | EXTR-12 | IMPLEMENTED in Phase 51 Plan 03/04 | Verify + test coverage |
| B: WBS orphan fallback | EXTR-13 | IMPLEMENTED in Phase 51 Plan 03 | Verify + test coverage |
| C: arch_node graceful skip | EXTR-14 | IMPLEMENTED in Phase 51 Plan 03 | Verify POST loop catch logic |
| D: team_engagement dead-end | EXTR-15 | PARTIALLY ADDRESSED (removed from prompt) | Verify Teams tab data flow; may need teamEngagementSections wiring |
| F: per-entity feedback | EXTR-16 | IMPLEMENTED in Phase 51 Plan 04 | Verify approve response shape matches IngestionModal expectations |

---

## Sources

### Primary (HIGH confidence)
- Direct file read: `bigpanda-app/worker/jobs/document-extraction.ts` — full source of EXTRACTION_BASE, PASS_PROMPTS, splitIntoChunks, parseClaudeResponse
- Direct file read: `bigpanda-app/app/api/ingestion/approve/route.ts` — full insertItem() handlers for all entity types
- Direct file read: `bigpanda-app/db/schema.ts` — before_state table structure, archNodes unique index
- Direct file read: `bigpanda-app/components/IngestionModal.tsx` — approvalResult state, done stage rendering
- Direct file read: `bigpanda-app/lib/extraction-types.ts` — isAlreadyIngested logic for before_state/weekly_focus
- Direct file read: `.planning/STATE.md` — Phase 51/52 decision history

### Secondary (MEDIUM confidence)
- Direct file read: `bigpanda-app/app/customer/[id]/teams/page.tsx` + `lib/queries.ts getTeamsTabData` — Teams tab data sources (HIGH confidence that teamEngagementSections is NOT queried)
- Direct file read: `bigpanda-app/vitest.config.ts` — confirmed Vitest as test framework

### Tertiary (LOW confidence)
- Anthropic tool use API structure: based on SDK knowledge and @anthropic-ai/sdk patterns; not verified against live Context7 for this session — but well-established pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json patterns
- Architecture (prompt improvements): HIGH — source files fully read
- Pipeline gap status: HIGH — approve/route.ts fully read for all gap handlers
- Teams tab EXTR-15 gap: MEDIUM — getTeamsTabData confirmed, but TeamEngagementMap internals not read
- Tool use API shape: MEDIUM — based on SDK knowledge, not Context7-verified for this session

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable libraries; prompt patterns don't change frequently)
