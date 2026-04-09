# Phase 52: Multi-pass targeted extraction for full tab coverage - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve extraction *recall* by replacing the current single-pass Claude call with 3 focused entity-group passes per document. Every new document upload runs all 3 passes; items from all passes are merged, deduped, and presented as a single review queue. This phase does NOT touch approval handlers, DB schema, or UI tab structure — only the extraction worker (`document-extraction.ts`) and the extraction progress display in `IngestionModal`.

**In scope:**
- Restructure `documentExtractionJob` to run 3 sequential targeted passes per document (PDF and text)
- New pass-specific system prompts (shared base + injected entity type list per pass)
- Pass-aware progress reporting: "Pass 1 of 3 — Project data (45%)..."
- Intra-batch dedup before staging (merge pass results, deduplicate within batch)
- Existing `isAlreadyIngested()` DB dedup continues to apply after merge

**Out of scope:**
- Re-extraction from existing/already-processed artifacts
- Tab coverage summary UI
- Approval handler changes
- New entity types
- Modal cancellation during extraction

</domain>

<decisions>
## Implementation Decisions

### Pass structure
- Always run all 3 passes unconditionally — no heuristic to skip passes
- **Pass 1 — Project narrative:** `action`, `risk`, `task`, `milestone`, `decision`, `note`, `history`
- **Pass 2 — Architecture:** `architecture`, `arch_node`, `integration`, `before_state`
- **Pass 3 — Teams and delivery:** `team`, `wbs_task`, `workstream`, `focus_area`, `e2e_workflow`, `team_pathway`, `weekly_focus`, `stakeholder`, `businessOutcome`, `onboarding_step`
- Same 3-pass structure applies to both PDF and text documents (PDF: same base64 block sent 3 times with different system prompts)

### Prompt design
- Shared base prompt with output format rules, disambiguation rules, and field extraction guidance
- Each pass injects only its entity type definitions (fields, examples, disambiguation for that group)
- Pass prompt does NOT include entity type definitions from other passes — reduces cross-type confusion
- The pass-specific user message states explicitly: "Extract ONLY the following entity types: [list]"

### Progress display
- Pass-aware progress in IngestionModal: "Pass 1 of 3 — Project data (45%)"
- Progress percentage reflects progress within the current pass
- After all passes complete, transition to review as normal

### Review queue and staging
- All 3 passes complete before any items are staged for review
- Items from all passes are merged into a single array
- Intra-batch dedup applied: deduplicate within merged results by `entityType` + primary key field (same logic as `isAlreadyIngested()` but applied within the batch before DB check)
- Existing `isAlreadyIngested()` DB check then filters out items already present in the project
- User reviews a single merged review queue — same UX as today, just more complete

### Modal behavior
- Closing modal during multi-pass extraction: same as today — job continues in background via BullMQ
- No cancellation behavior change
- No coverage feedback after extraction — items appear in review queue silently

### Claude's Discretion
- Exact chunking strategy for Pass 1/2/3 on text documents (whether each pass re-sends all chunks or processes them in parallel)
- Intra-batch dedup key field selection per entity type
- Whether to parallelize passes 1/2/3 or run strictly sequentially (consider API rate limits)

</decisions>

<specifics>
## Specific Ideas

- "ensure we are analyzing all the information in an uploaded document and correctly delegating it to the relevant tabs across everything" — this is the core intent; full coverage + correct routing is the success metric
- Dedup should operate at two levels: within the merged batch AND against what's already in the project DB (nothing redundant should ever reach the review queue)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `runClaudeCall()` in `document-extraction.ts`: already handles streaming + text accumulation — reuse for all 3 passes
- `parseClaudeResponse()` in `document-extraction.ts`: JSON repair + parse — reuse unchanged per pass
- `EXTRACTION_SYSTEM` constant: becomes the shared base prompt; entity type sections are extracted and organized per pass group
- `isAlreadyIngested()` in `lib/extraction-types.ts`: existing DB dedup — runs after intra-batch dedup
- `splitIntoChunks()` in `document-extraction.ts`: text chunking — reuse for text documents across all passes

### Established Patterns
- PDF path: single Claude call with `DocumentBlockParam` — extend to 3 calls, same block each time
- Text path: sequential chunk loop — extend to run 3 pass loops (or restructure as 3 sequential passes over full text)
- Progress tracking: `total_chunks` / `current_chunk` / `progress_pct` columns on `extraction_jobs` — extend to track pass number
- `extractionMessage` state in `IngestionModal`: drives the progress string shown to user — update format to "Pass N of 3 — [group name] (X%)"

### Integration Points
- `worker/jobs/document-extraction.ts` — primary change file: restructure extraction flow around 3 passes
- `components/IngestionModal.tsx` — update `setExtractionMessage` format to be pass-aware
- `app/api/projects/[projectId]/extraction-jobs/route.ts` (or similar polling endpoint) — may need to expose `current_pass` / `total_passes` fields if progress display requires it
- No changes to `app/api/ingestion/approve/route.ts`, DB schema, or UI tabs

</code_context>

<deferred>
## Deferred Ideas

- Re-extraction from existing artifacts without re-upload — future phase
- Tab coverage summary UI showing which tabs will have new data after extraction — future phase
- Extraction quality score / confidence threshold filtering — future phase
- Parallel pass execution (run all 3 passes concurrently) — could be a quick win but needs rate-limit analysis; defer to planner to decide
- Per-pass review queues (review pass 1 before pass 2 starts) — deferred, adds workflow complexity

</deferred>

---

*Phase: 52-multi-pass-targeted-extraction-for-full-tab-coverage*
*Context gathered: 2026-04-09*
