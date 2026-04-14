---
phase: 57-extraction-intelligence-for-unstructured-notes
plan: "01"
subsystem: extraction-pipeline
tags: [extraction, prompts, synthesis, document-classification, unstructured, nlp]

dependency_graph:
  requires:
    - phase: 57-00
      provides: 10 RED test stubs for SYNTH-01 through SYNTH-05 behavioral contracts
  provides:
    - synthesis-first EXTRACTION_BASE with inference posture + confidence calibration rubric
    - PASS_0_PROMPT with document type classification and entity type prediction
    - transcript-mode conditional instructions in all three PASS_PROMPTS
    - SINGLETON enforcement for weekly_focus and before_state
    - assembly-from-scattered-mentions guidance for e2e_workflow
  affects: [extraction-pipeline, document-extraction, ingestion-pipeline]

tech_stack:
  added: []
  patterns:
    - "Synthesis-first extraction posture: infer from any relevant content, no labeled sections required"
    - "Document type classification (transcript/status-update/formal-doc) guiding extraction aggressiveness"
    - "Confidence calibration by source explicitness: 0.5-0.7 inferred, 0.8-0.95 explicit"
    - "SINGLETON enforcement pattern for one-per-document entity types"
    - "Entity assembly from scattered mentions (e2e_workflow steps, before_state pain points)"

key_files:
  created: []
  modified:
    - bigpanda-app/worker/jobs/document-extraction.ts
    - bigpanda-app/.planning/REQUIREMENTS.md

key_decisions:
  - "EXTRACTION_BASE opens with explicit 'unstructured documents' framing — sets inference posture globally for all passes"
  - "Per-pass entity type filter (c771969) was added then reverted (0f1a766) — filtering risked dropping valid data that spans multiple entity types"
  - "Confidence rubric tied to SOURCE EXPLICITNESS not extraction certainty — more predictable calibration behavior"
  - "weekly_focus instructs Claude to SYNTHESIZE from signals (open actions, risks, milestones) rather than extract verbatim"
  - "e2e_workflow ASSEMBLE pattern with inline conversational example teaches step-stitching from scattered mentions"

patterns_established:
  - "TRIGGER pattern for sparse entity types: specify the minimum signal needed to attempt extraction (before_state)"
  - "SINGLETON pattern: explicit one-per-document constraint prevents duplicates for singleton entity types"

requirements_completed: [SYNTH-01, SYNTH-02, SYNTH-03, SYNTH-04, SYNTH-05]

metrics:
  duration_seconds: 2400
  tasks_completed: 4
  tests_fixed: 10
  commits: 10
  completed_date: "2026-04-13"
---

# Phase 57 Plan 01: Synthesis-First Extraction Prompt Rewrite Summary

**All five extraction prompt constants rewritten for synthesis-first unstructured document behavior — EXTRACTION_BASE adds inference posture + confidence calibration rubric, PASS_0_PROMPT classifies document type and predicts entity types, PASS_PROMPTS[1-3] add transcript-mode conditional instructions, driving 10 RED SYNTH stubs to GREEN (22/22 extraction-prompts tests passing)**

## Performance

- **Duration:** ~40 min (10 commits across UAT iteration cycles)
- **Started:** 2026-04-13 (Phase 57 execution)
- **Completed:** 2026-04-13
- **Tasks:** 4
- **Files modified:** 2

## Accomplishments

- EXTRACTION_BASE opens with global synthesis-first inference posture: Claude no longer requires labeled sections for extraction from meeting notes or transcripts
- PASS_0_PROMPT now classifies document type (`transcript` | `status-update` | `formal-doc`) and predicts likely entity types before any extraction pass runs
- All three PASS_PROMPTS[1-3] include document-type-aware conditional instructions: transcript/status-update mode enables aggressive inference; formal-doc mode prefers explicit extraction
- Confidence calibration rubric (0.5–0.7 inferred, 0.8–0.95 explicit) replaces vague ">0.8 for clear entities" guidance
- SINGLETON enforcement added to `weekly_focus` and `before_state` entity descriptions
- `e2e_workflow` now instructs step assembly from scattered mentions with inline conversational example
- `before_state` now has TRIGGER pattern: extracts from any pain-point signal, not just sections titled "Before State"
- All 22 extraction-prompts tests GREEN (12 Phase 53 + 10 Phase 57 SYNTH contracts)

## Task Commits

Each task was committed atomically, with multiple UAT-driven fix iterations:

1. **Task 1: Rewrite EXTRACTION_BASE** - `744824e` (feat)
2. **Task 2: Rewrite PASS_0_PROMPT** - `ff4da96` (feat)
3. **Task 3: Add transcript-mode conditionals to PASS_PROMPTS** - `f223733` (feat)
4. **Task 4: Add SYNTH requirements to REQUIREMENTS.md** - `17593ec` (docs)
5. **UAT fix: Address before_state/e2e_workflow extraction gaps** - `354ebe3` (fix)
6. **UAT fix: Force e2e_workflow over team_pathway for process sequences** - `b5ba349` (fix)
7. **UAT fix: Add conversational few-shot examples for before_state and e2e_workflow** - `1375268` (fix)
8. **UAT fix: Enforce per-pass entity type filter** - `c771969` (fix)
9. **UAT revert: Remove per-pass entity type filter** - `0f1a766` (revert)
10. **UAT fix: Remove passSystemPrompt duplication in text extraction** - `2e91653` (fix)

## Files Created/Modified

- `bigpanda-app/worker/jobs/document-extraction.ts` — All 5 prompt constants rewritten (EXTRACTION_BASE, PASS_0_PROMPT, PASS_PROMPTS[1], PASS_PROMPTS[2], PASS_PROMPTS[3])
- `bigpanda-app/.planning/REQUIREMENTS.md` — SYNTH-01 through SYNTH-05 added with [x] checkboxes and traceability table entries

## Decisions Made

- **No per-pass entity type filter:** Added in c771969, then reverted in 0f1a766. Filtering `note` fallback from Pass 1 was too aggressive — risked suppressing valid multi-type entities and was not worth the extraction noise reduction.
- **weekly_focus as synthesis, not extraction:** Instruction changed from "extract from This Week section" to "SYNTHESIZE from open actions, risks, and milestones" — produces more useful output even when no focus section exists.
- **TRIGGER pattern for before_state:** Lowered extraction threshold to any pain-point signal anywhere in the document, not just labeled sections. A thin entity (user can dismiss) is more useful than a missing one.
- **Confidence rubric tied to source explicitness, not just certainty:** The prior "certainty 0.0-1.0" framing was ambiguous. Reframed as 4 tiers by how explicit the source text is.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Per-pass entity type filter reverted**
- **Found during:** UAT (human verification on real transcript)
- **Issue:** Enforcing per-pass entity type filter blocked valid `note` entities from Pass 1 and caused edge-case data loss across entity types that straddle pass boundaries
- **Fix:** Reverted `c771969` with `0f1a766` — filter removed, natural entity type guidance in prompts is sufficient
- **Files modified:** `bigpanda-app/worker/jobs/document-extraction.ts`
- **Verification:** 22/22 extraction-prompts tests still GREEN; UAT extraction behavior improved
- **Committed in:** `0f1a766` (revert)

**2. [Rule 1 - Bug] passSystemPrompt duplication in text extraction**
- **Found during:** UAT (terminal logs showed doubled system prompt in text document extraction)
- **Issue:** `passSystemPrompt` was being included in both the system role and the user message for text (non-PDF) extraction, doubling token cost and causing extraction noise
- **Fix:** Removed `passSystemPrompt` from user message construction in text extraction path
- **Files modified:** `bigpanda-app/worker/jobs/document-extraction.ts`
- **Verification:** Extraction logs show single system prompt per pass; no test regressions
- **Committed in:** `2e91653` (fix)

---

**Total deviations:** 2 auto-fixed (1 revert + 1 bug fix)
**Impact on plan:** Revert necessary to prevent data loss; duplication fix improves correctness and reduces token waste. No scope creep.

## Issues Encountered

- **before_state and e2e_workflow near-zero on transcript UAT:** Initial extraction pass produced no `before_state` or `e2e_workflow` entities from the test transcript. Root cause: entity descriptions still required explicit section headings. Fixed with inference-first rewrites of those two entity descriptions and addition of conversational few-shot examples.
- **e2e_workflow vs team_pathway classification:** Claude was classifying team process sequences as `team_pathway` instead of `e2e_workflow`. Fixed by adding explicit disambiguation language and priority guidance in the entity descriptions.

## User Setup Required

None — no external service configuration required. All changes are to prompt string constants in `document-extraction.ts`.

## Next Phase Readiness

- All SYNTH requirements satisfied and tested
- Prompt constants ready for Phase 57 UAT human verification (57-UAT.md)
- Phase 57-02 (architecture extraction → arch_node bridge) is the only remaining gap closure plan
- 22/22 extraction-prompts tests GREEN; no regressions in full test suite

## Verification

```bash
# All 22 extraction-prompts tests GREEN
cd bigpanda-app && npm test -- extraction-prompts --run
# Expected: 22 passed (22)

# Key patterns present in document-extraction.ts
grep -c "unstructured" worker/jobs/document-extraction.ts     # >= 1
grep -c "SINGLETON" worker/jobs/document-extraction.ts        # >= 2 (weekly_focus + before_state)
grep -c "document_type" worker/jobs/document-extraction.ts    # >= 1 (PASS_0_PROMPT output)
grep -c "transcript" worker/jobs/document-extraction.ts       # >= 4 (PASS_0_PROMPT + 3 pass conditionals)
grep -c "0.5" worker/jobs/document-extraction.ts              # >= 1 (confidence rubric)
```

## Requirements Satisfied

- **SYNTH-01**: ✓ EXTRACTION_BASE synthesis-first posture — "Documents are often unstructured meeting notes, call transcripts... Infer entity types from any relevant content"
- **SYNTH-02**: ✓ PASS_0_PROMPT document type classification with `<document_type>` XML tag
- **SYNTH-03**: ✓ PASS_0_PROMPT entity type prediction with `<likely_entity_types>` XML tag
- **SYNTH-04**: ✓ All three PASS_PROMPTS[1-3] include transcript-mode conditional instructions
- **SYNTH-05**: ✓ Confidence calibration rubric (0.5–0.7 inferred, 0.8–0.95 explicit), SINGLETON markers, e2e_workflow assembly guidance

---
*Phase: 57-extraction-intelligence-for-unstructured-notes*
*Completed: 2026-04-13*

## Self-Check: PASSED

✓ File exists: `bigpanda-app/worker/jobs/document-extraction.ts` (5 prompt constants rewritten)
✓ REQUIREMENTS.md: SYNTH-01 through SYNTH-05 all marked [x]
✓ Traceability entries: 5 Phase 57 rows added
✓ Key commits: 744824e, ff4da96, f223733 (core rewrites) + 4 fix commits + 1 revert
✓ Tests: 22/22 extraction-prompts tests GREEN
✓ Verification doc (57-VERIFICATION.md): Truth 1-7 all verified against this plan's deliverables
