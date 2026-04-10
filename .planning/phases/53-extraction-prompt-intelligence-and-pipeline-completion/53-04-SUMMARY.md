---
phase: 53-extraction-prompt-intelligence-and-pipeline-completion
plan: 04
subsystem: ingestion-extraction
tags: [extraction, prompt-engineering, pre-analysis, multi-pass]
dependency_graph:
  requires: [53-02, 53-03]
  provides: [pass-0-pre-analysis, context-grounding]
  affects: [document-extraction-job, extraction-accuracy]
tech_stack:
  added: [pass-0-pre-analysis-prompt]
  patterns: [pre-analysis-grounding, xml-context-block]
key_files:
  created: []
  modified:
    - bigpanda-app/worker/jobs/document-extraction.ts
decisions:
  - Pass 0 runs once per document before Passes 1-3 (not per chunk)
  - Pass 0 uses plain text response (no tool use) since it quotes sections, not entities
  - Pass 0 failure is non-fatal (try/catch, log warning, continue without context)
  - Progress scale updated to 4 passes: Pass 0 = 10%, Pass 1 = 40%, Pass 2 = 70%, Pass 3 = 100%
  - Pre-analysis context prepended as XML block to all subsequent pass prompts
metrics:
  duration_minutes: 2
  tasks_completed: 1
  tests_added: 0
  tests_fixed: 1
  files_modified: 1
  commit_count: 1
completed_date: 2026-04-10
---

# Phase 53 Plan 04: Pass 0 Pre-Analysis Summary

**One-liner:** Pass 0 pre-analysis quotes 5-10 high-value document sections before Passes 1-3, grounding extraction in dense/complex documents for improved recall.

## Overview

Implemented Pass 0 pre-analysis in the document extraction pipeline — a new Claude call that runs once per document (before Passes 1-3) to identify and quote the most information-dense sections. This grounding context is prepended to all subsequent extraction passes, improving entity recall on dense or poorly structured documents.

**Purpose:** Pass 0 addresses the "missed entities in dense documents" problem by providing Claude with explicit context about where high-value content lives in the document before attempting entity extraction.

## What Was Built

### 1. Pass 0 Pre-Analysis Prompt (PASS_0_PROMPT)

Created a dedicated text prompt for Pass 0 that instructs Claude to:
- Quote 5-10 most information-dense sections verbatim
- Focus on sections containing: action items, architecture components, team engagement, business outcomes
- Output sections as XML `<relevant_section>` blocks
- NOT extract entities (that happens in Passes 1-3)

### 2. PASSES Array Extension

Prepended Pass 0 to the PASSES array:
```typescript
export const PASSES: ExtractionPass[] = [
  { passNumber: 0, label: 'Pre-analysis', entityTypes: [] },
  { passNumber: 1, label: 'Project data', entityTypes: [...] },
  { passNumber: 2, label: 'Architecture', entityTypes: [...] },
  { passNumber: 3, label: 'Teams & delivery', entityTypes: [...] },
];
```

Updated `ExtractionPass` interface to include `passNumber: 0`.

### 3. Pass 0 Execution Logic

Implemented Pass 0 call in `documentExtractionJob`:

**PDF path:** Runs Pass 0 on the PDF document block directly
**Text path:** Runs Pass 0 on first 80k chars (not per chunk)

Pass 0 uses plain text response (no tool use) since it's quoting sections, not extracting entities.

Captured Pass 0 output as `<pre_analysis>` XML block.

### 4. Context Propagation

Prepended `preAnalysisContext` to all subsequent pass prompts:
- PDF path: Added as text block after document block
- Text path: Prepended to each chunk's user message

This ensures Passes 1-3 have explicit grounding in the document's high-value sections.

### 5. Progress Math Update

Updated progress calculations for 4 passes:
- Pass 0 complete: 10%
- Pass 1 complete: 40%
- Pass 2 complete: 70%
- Pass 3 complete: 100%

For text path with multiple chunks:
- Pass 0: 10%
- Pass 1: 10% + (chunk progress × 30%)
- Pass 2: 40% + (chunk progress × 30%)
- Pass 3: 70% + (chunk progress × 30%)

### 6. Error Handling

Pass 0 failure is non-fatal — wrapped in try/catch:
- Logs warning to console
- Sets `preAnalysisContext = ''`
- Continues to Passes 1-3 without context
- Does NOT fail the entire extraction job

### 7. Helper Function

Added `runClaudeToolUseCall` helper for tool use pattern (used by Passes 1-3):
```typescript
async function runClaudeToolUseCall(
  client: Anthropic,
  content: Anthropic.MessageParam['content'],
  systemPrompt: string,
): Promise<{ items: ExtractionItem[]; coverage: string }>
```

## Test Results

**EXTR-11 stub turned GREEN:**
```
✓ EXTR-11: Pass 0 pre-analysis exists in PASSES array
  ✓ PASSES[0] has passNumber 0 and label Pre-analysis
```

**Full ingestion test suite status:**
- 17/17 tests passing in extraction-job.test.ts
- 108/113 tests passing overall (5 pre-existing failures, documented in STATE.md)
- No regressions introduced

## Deviations from Plan

None — plan executed exactly as written.

## Performance Impact

**Pass 0 overhead:**
- PDF path: +1 Claude API call per document (~2-4s)
- Text path: +1 Claude API call per document (first 80k chars only, ~2-4s)

**Expected benefit:**
- Improved recall on dense/complex documents (fewer missed entities)
- Better entity attribution (sourceExcerpt quality improves when Claude knows where to look)

## Integration Points

**Upstream dependencies:**
- Plan 53-02: EXTRACTION_BASE prompt structure
- Plan 53-03: RECORD_ENTITIES_TOOL and tool use pattern

**Downstream impact:**
- Pass 0 context flows to all Passes 1-3
- IngestionModal progress bar now accounts for 4 passes (10/40/70/100)
- `extraction_jobs.progress_pct` reflects Pass 0 completion

## Future Considerations

**Potential enhancements:**
- Adaptive Pass 0: Skip if document is small (<10k chars)
- Pass 0 caching: Store pre-analysis results for re-extraction scenarios
- Pass 0 feedback loop: Use coverage_json to identify sections Pass 0 missed

**Known limitations:**
- Pass 0 only sees first 80k chars for text documents (large docs may have relevant content beyond that)
- Pass 0 quotes are not persisted — only used during extraction (no artifact)

## Self-Check: PASSED

**Created files verified:**
None (modifications only)

**Modified files verified:**
```
✓ FOUND: bigpanda-app/worker/jobs/document-extraction.ts
```

**Commits verified:**
```
✓ FOUND: 3747d72 (feat(53-04): implement Pass 0 pre-analysis for document extraction)
```

**Tests verified:**
```
✓ EXTR-11: PASSES[0] exists with passNumber 0 and label Pre-analysis
✓ No regressions in extraction-job.test.ts (17/17 passing)
```

All claims verified successfully.
