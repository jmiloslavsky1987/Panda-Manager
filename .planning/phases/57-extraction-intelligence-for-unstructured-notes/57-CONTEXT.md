# Phase 57: Extraction Intelligence for Unstructured Notes - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewrite the extraction prompts in `worker/jobs/document-extraction.ts` to be synthesis-first — so operational review transcripts and meeting notes produce the same quality output as structured documents. The 3-pass structure, tool-use pattern (`record_entities`), DB pipeline, approval handlers, and UI are all unchanged. Only prompts change: `EXTRACTION_BASE`, `PASS_PROMPTS[1-3]`, and `PASS_0_PROMPT`.

Primary input type: operational review transcripts, call notes, and informal status updates — unstructured, no labeled sections.

</domain>

<decisions>
## Implementation Decisions

### weekly_focus — always synthesized, never extracted
- Claude always synthesizes `weekly_focus` — even if the document has a "This Week" section, do not extract verbatim; generate from the actual project signals
- Source signals: open action items + unresolved risks + upcoming milestones (in that priority order)
- Output: 3–5 items, hard limit. Force Claude to prioritize rather than dump everything
- Format: action-oriented imperative phrases — "Resolve ServiceNow integration blocker before pilot launch" — not status summaries
- One `weekly_focus` entity per document

### before_state — inference from pain-point language
- Trigger signals: comparative language ("before BigPanda", "we used to", "previously"), pain-point phrases ("struggling with", "manual triage", "alert noise", "the problem is"), "currently" statements describing a broken state
- Threshold: attempt extraction if ANY signal exists — a thin entity is more useful than a missing one; users can edit or dismiss
- Field synthesis: infer and synthesize all 3 fields even when not explicitly labeled:
  - `aggregation_hub_name`: reason from context — "the primary tool being replaced or supplemented is X"
  - `alert_to_ticket_problem`: assemble description of the alert workflow pain from scattered mentions
  - `pain_points`: comma-separate all pain points found anywhere in the document
- One `before_state` per document (singleton — matches existing dedup behavior)

### Prompt rewrite breadth — all passes, all 21 types
- Scope: all 3 passes, all 21 entity types get inference-first language — not just the 3 known problem types
- `EXTRACTION_BASE` (shared base): add a global posture instruction — "Documents are often unstructured meeting notes or transcripts. Infer entity types from any relevant content — do not require labeled sections or explicit headings"
- Each entity type description: replace "look for sections titled X" language with "infer from any relevant signals, including scattered mentions, comparative language, and implicit context"
- `e2e_workflow`: explicitly instruct Claude to assemble from scattered mentions — stitch together a team's end-to-end journey from multiple mentions across the transcript; steps need not be described in a single place
- Confidence calibration: synthesized/inferred entities score 0.5–0.7; explicitly stated entities score 0.8–0.95. The `confidence` field on `ExtractionItem` already exists — use it to reflect source explicitness, not just extraction certainty

### Pass 0 enhancement — document type classification + entity prediction
- Pass 0 output extends to include two new signals alongside the quoted sections:
  1. **Document type classification** — one of: `transcript`, `status-update`, `formal-doc`
     - `transcript`: meeting/call notes with dialogue or first-person conversation
     - `status-update`: periodic written update (email format, weekly update doc)
     - `formal-doc`: structured report, SOW, architecture document with explicit sections
  2. **Likely entity types** — list the entity types likely present based on a scan of the content (e.g., "action, risk, team, before_state")
- Both signals injected into `preAnalysisContext` block already passed to Passes 1–3
- Passes 1–3 prompts add a conditional instruction: "If document type is `transcript`: infer more aggressively, assemble entities from scattered mentions, synthesize where explicit content is absent"

### Claude's Discretion
- Exact wording of inference-first language in each entity type description (consistent tone, not mechanical repetition)
- Whether to add inline examples to the `e2e_workflow` description showing assembly from scattered mentions
- How to structure the Pass 0 output format so Passes 1–3 can reliably parse the classification and entity list

</decisions>

<specifics>
## Specific Ideas

- "notes will be unstructured, and the system must be able to extract and structure it appropriately using AI intelligence" — the core mandate for this phase
- `before_state` won't appear in documents as a labeled section — it comes from operational reviews and is embedded in pain-point language
- `e2e_workflow` is assembled piecemeal — the AI must synthesize a coherent flow from scattered mentions
- `weekly_focus` should be AI-generated from what it has — there will never be a "This Week's Focus" section to extract

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EXTRACTION_BASE` constant in `document-extraction.ts`: shared base prompt — this is where the global inference-first posture instruction goes
- `PASS_PROMPTS[1]`, `PASS_PROMPTS[2]`, `PASS_PROMPTS[3]`: per-pass entity definitions — each gets inference-first language added to relevant entity descriptions
- `PASS_0_PROMPT` constant: extend to output doc type classification + likely entity types alongside existing section quotes
- `preAnalysisContext` variable in `documentExtractionJob`: already passed to Passes 1–3 in the `<pre_analysis>` block — new Pass 0 signals ride in this block for free
- `confidence` field on `ExtractionItem`: already in the schema — use it for inference strength signaling (0.5–0.7 vs 0.8–0.95)

### Established Patterns
- Pass 0 output flows into Passes 1–3 via `preAnalysisContext` string — no structural change to the pipeline needed; only the Pass 0 prompt and the pass system prompts change
- Tool use (`record_entities`) is the extraction mechanism — all passes continue using `runClaudeToolUseCall()`
- 3-pass structure locked from Phase 52: Pass 1 = project narrative, Pass 2 = architecture, Pass 3 = teams & delivery

### Integration Points
- `worker/jobs/document-extraction.ts` — only file that changes: `EXTRACTION_BASE`, `PASS_PROMPTS[1-3]`, `PASS_0_PROMPT`
- No changes to `approve/route.ts`, DB schema, UI, or `IngestionModal`
- No new entity types, no new DB tables, no new API routes

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 57-extraction-intelligence-for-unstructured-notes*
*Context gathered: 2026-04-11*
