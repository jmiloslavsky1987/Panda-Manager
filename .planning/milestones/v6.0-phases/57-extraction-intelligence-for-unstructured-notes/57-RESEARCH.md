# Phase 57: Extraction Intelligence for Unstructured Notes - Research

**Researched:** 2026-04-11
**Domain:** LLM prompt engineering for synthesis-first extraction from unstructured meeting transcripts and operational notes
**Confidence:** MEDIUM-HIGH

## Summary

Phase 57 rewrites extraction prompts to handle **unstructured documents** (meeting transcripts, operational reviews, informal status updates) by shifting from extraction-first to **synthesis-first** prompt design. The current 3-pass extraction pipeline (Phase 52-53) works well for structured documents with labeled sections, but fails on transcripts where information is scattered, implicit, and conversational.

**Key shift:** From "find sections titled X" → "infer entity types from any relevant signals, assemble from scattered mentions, synthesize where explicit content is absent."

The research confirms that Claude's latest models (Opus 4.6, Sonnet 4.6) excel at synthesis tasks when prompted correctly. Best practices include: document-first layout (already implemented in Phase 53), explicit inference instructions, confidence calibration (0.5-0.7 for inferred vs 0.8-0.95 for explicit), Pass 0 document classification to guide downstream passes, and XML-structured pre-analysis context.

**Primary recommendation:** Rewrite `EXTRACTION_BASE`, `PASS_PROMPTS[1-3]`, and `PASS_0_PROMPT` with inference-first language for all 21 entity types. No structural changes to the pipeline—only prompt text changes.

## User Constraints

<user_constraints>
### Locked Decisions (from CONTEXT.md)

**weekly_focus — always synthesized, never extracted:**
- Claude always synthesizes `weekly_focus` even if document has a "This Week" section
- Source signals: open action items + unresolved risks + upcoming milestones (priority order)
- Output: 3-5 items, hard limit (force prioritization)
- Format: action-oriented imperative phrases ("Resolve ServiceNow integration blocker before pilot launch")
- One `weekly_focus` entity per document

**before_state — inference from pain-point language:**
- Trigger signals: comparative language ("before BigPanda", "we used to", "previously"), pain-point phrases ("struggling with", "manual triage", "alert noise"), "currently" statements describing broken state
- Threshold: attempt extraction if ANY signal exists (thin entity > missing entity)
- Field synthesis: infer all 3 fields even when not labeled:
  - `aggregation_hub_name`: reason from context ("the primary tool being replaced is X")
  - `alert_to_ticket_problem`: assemble from scattered mentions
  - `pain_points`: comma-separate all found pain points
- One `before_state` per document (singleton)

**Prompt rewrite breadth — all passes, all 21 types:**
- Scope: all 3 passes, all 21 entity types get inference-first language
- `EXTRACTION_BASE`: add global posture instruction ("Documents are often unstructured meeting notes or transcripts. Infer entity types from any relevant content — do not require labeled sections")
- Each entity type: replace "look for sections titled X" with "infer from any relevant signals"
- `e2e_workflow`: explicitly instruct to assemble from scattered mentions (stitch together multi-step journey)
- Confidence calibration: synthesized/inferred = 0.5-0.7, explicit = 0.8-0.95

**Pass 0 enhancement — document classification + entity prediction:**
- Pass 0 outputs two new signals alongside quoted sections:
  1. Document type: `transcript` | `status-update` | `formal-doc`
  2. Likely entity types: list predicted types based on content scan
- Both injected into `preAnalysisContext` block (already passed to Passes 1-3)
- Passes 1-3: conditional instruction "If document type is `transcript`: infer more aggressively"

### Claude's Discretion

- Exact wording of inference-first language (consistent tone, not mechanical repetition)
- Whether to add inline examples to `e2e_workflow` showing assembly from scattered mentions
- Pass 0 output format structure (must be parseable by Passes 1-3)

### Deferred Ideas (OUT OF SCOPE)

None—discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.80.0 | Claude API integration | Official Anthropic SDK for tool use and structured outputs |
| Zod | 4.3.6 | Schema validation | Type-safe validation for extracted entities |
| Vitest | 4.1.1 | Testing framework | Fast unit testing with native ESM support |

**Already integrated in Phase 52-53:**
- Multi-pass extraction (3 passes + Pass 0 pre-analysis)
- Tool use via `record_entities` tool (`strict: true` mode)
- Document-first layout (document in `<document>` tags before instructions)
- Pass-specific prompts (`PASS_PROMPTS[1|2|3]`)
- Confidence scoring in `ExtractionItem` schema

**No new dependencies required** — Phase 57 is pure prompt engineering.

### Installation

No installation needed. All dependencies exist from Phase 52-53.

## Architecture Patterns

### Recommended Prompt Structure

Current extraction pipeline (unchanged):
```
worker/jobs/
├── document-extraction.ts          # Contains all prompts
│   ├── EXTRACTION_BASE            # Shared base prompt
│   ├── PASS_0_PROMPT              # Pre-analysis (Phase 53)
│   ├── PASS_PROMPTS[1]            # Project data pass
│   ├── PASS_PROMPTS[2]            # Architecture pass
│   ├── PASS_PROMPTS[3]            # Teams & delivery pass
│   └── RECORD_ENTITIES_TOOL       # Tool schema
```

**Phase 57 changes:** Only the prompt strings within `document-extraction.ts`. No structural changes.

### Pattern 1: Inference-First Prompt Language

**What:** Replace extraction-focused language with synthesis-focused language at both global and per-entity-type levels.

**When to use:** For all entity types, especially those that fail on unstructured documents (weekly_focus, before_state, e2e_workflow, wbs_task).

**Before (extraction-first):**
```markdown
- before_state: { ... } — customer's current state before BigPanda adoption;
  extract from sections titled "Current State", "Before State", "Pain Points",
  or similar; one entity per project
```

**After (inference-first):**
```markdown
- before_state: { ... } — customer's current state before BigPanda adoption;
  INFER from any pain-point language: comparative phrases ("before BigPanda",
  "we used to"), problem descriptions ("struggling with", "manual triage"),
  or current-state critiques. Synthesize all three fields even if not
  explicitly labeled. Attempt extraction if ANY signal exists.
```

**Source:** Phase 57 CONTEXT.md locked decisions + Anthropic prompt engineering best practices (clear, direct instructions with explicit behavior guidance)

### Pattern 2: Pass 0 Document Classification

**What:** Extend Pass 0 from "quote relevant sections" (Phase 53) to also classify document type and predict entity types.

**When to use:** Before Passes 1-3 begin, to provide contextual hints for downstream extraction.

**Example Pass 0 output format:**
```xml
<document_type>transcript</document_type>
<likely_entity_types>action, risk, team, before_state, e2e_workflow</likely_entity_types>

<relevant_section>
[Quoted section 1...]
</relevant_section>

<relevant_section>
[Quoted section 2...]
</relevant_section>
```

**Pass 1-3 consumption:** Already have `preAnalysisContext` variable that gets passed to all passes. New signals ride in this block for free—no structural changes needed.

**Source:** Anthropic best practices: "Give Claude a role" + "Use XML tags for structure" + Phase 53 existing `preAnalysisContext` pattern

### Pattern 3: Confidence Calibration for Synthesis

**What:** Use the existing `confidence` field (0.0-1.0) on `ExtractionItem` to signal source explicitness, not just extraction certainty.

**Scoring rubric:**
- **0.5-0.6:** Weak inference (single scattered mention, ambiguous signal)
- **0.6-0.7:** Strong inference (multiple corroborating signals, clear pattern)
- **0.8-0.9:** Explicit but informal (stated directly but not in structured section)
- **0.9-0.95:** Explicit structured (labeled section with clear field values)

**When to use:** All entity types, especially those synthesized from scattered mentions.

**Prompt instruction:**
```markdown
Confidence calibration:
- Synthesized/inferred entities (assembled from scattered mentions, implicit signals): 0.5-0.7
- Explicitly stated entities (direct mentions, clear intent): 0.8-0.95
Use confidence to reflect source explicitness, not just extraction certainty.
```

**Source:** Phase 52 `ExtractionItem` schema already has `confidence` field; Anthropic tool use best practices recommend explicit scoring guidance

### Pattern 4: Conditional Pass Behavior (Transcript Mode)

**What:** Passes 1-3 check document type from Pass 0 and adjust inference aggressiveness accordingly.

**Pass prompt addition:**
```markdown
<pre_analysis>
{preAnalysisContext from Pass 0}
</pre_analysis>

DOCUMENT-TYPE-AWARE EXTRACTION:
If document type is `transcript` or `status-update`:
- Infer more aggressively from scattered mentions
- Assemble entities from partial information across multiple sections
- Synthesize fields where explicit content is absent but signals exist
- Lower confidence scores (0.5-0.7) to reflect inference vs extraction

If document type is `formal-doc`:
- Prefer explicit extraction from labeled sections
- Higher confidence scores (0.8-0.95) for structured content
```

**Source:** Anthropic "context setting" pattern + Phase 53 existing `preAnalysisContext` infrastructure

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prompt template engine | String interpolation, complex builders | Direct string constants with XML tags | Claude SDK handles message construction; XML provides enough structure |
| Custom confidence scoring logic | Rule-based post-processors | Claude's native scoring with explicit rubric | Models calibrate better with clear instructions than post-hoc rules |
| Document type classifier | Separate ML model | Claude in Pass 0 | Single API call, no model drift, free classification as side-effect |
| Entity deduplication across types | Complex composite key logic | Existing `deduplicateWithinBatch` (Phase 52) | Already handles composite keys (entityType::primaryKey) |

**Key insight:** Prompt engineering at this maturity level (Phase 52-53 foundation) should favor **prompt clarity over code complexity**. Claude Opus 4.6 and Sonnet 4.6 excel at following explicit instructions—write better prompts, not smarter code.

## Common Pitfalls

### Pitfall 1: Over-Rotating on Extraction Language

**What goes wrong:** Leaving residual "find sections titled X" language mixed with new "infer from any signals" language creates prompt confusion. Claude defaults to the more conservative extraction mode when faced with mixed signals.

**Why it happens:** Incremental editing of large prompts leaves old patterns behind.

**How to avoid:** Global find/replace for extraction-focused phrases:
- "extract from sections titled" → "infer from any relevant content including"
- "look for" → "recognize signals such as"
- "requires a section" → "can be assembled from scattered mentions"

**Warning signs:** Continued low entity counts for target types (weekly_focus, before_state) on transcript documents despite prompt changes.

### Pitfall 2: Insufficient Confidence Calibration Guidance

**What goes wrong:** Claude defaults to high confidence (0.8-0.9) even for inferred entities because earlier prompts associated confidence with "how certain I am this is a real entity" not "how explicit was the source."

**Why it happens:** Phase 52-53 prompts defined confidence as "certainty" not "explicitness."

**How to avoid:** Add explicit rubric with score ranges and examples:
```markdown
Confidence scoring:
- 0.5-0.6: Weak inference (e.g., single mention, "we should look into X")
- 0.6-0.7: Strong inference (e.g., multiple corroborating signals, clear pattern)
- 0.8-0.9: Explicit informal (e.g., "Action: John to configure alerts")
- 0.9-0.95: Explicit structured (e.g., labeled section "Actions: 1. Configure alerts - John")
```

**Warning signs:** All entities scoring 0.8-0.9 regardless of document type. Approval UI shows synthesized entities with misleadingly high confidence.

### Pitfall 3: Pass 0 Output Format Not Parseable

**What goes wrong:** Pass 0 returns free-form classification text that Passes 1-3 can't reliably extract. Example: "This appears to be a transcript-style document with some action items and team mentions."

**Why it happens:** Pass 0 prompt lacks explicit output format instructions.

**How to avoid:** Use XML tags with required structure:
```markdown
Output format (required):
<document_type>transcript | status-update | formal-doc</document_type>
<likely_entity_types>comma, separated, list</likely_entity_types>

<relevant_section>
[Quote 1]
</relevant_section>
```

Then in Passes 1-3, simple regex extraction:
```typescript
const docTypeMatch = preAnalysisContext.match(/<document_type>(.*?)<\/document_type>/);
const docType = docTypeMatch?.[1] || 'formal-doc'; // default fallback
```

**Warning signs:** Pass 0 completing but Passes 1-3 not adapting behavior. Manual inspection of `preAnalysisContext` shows unstructured text.

### Pitfall 4: Singleton Entity Types Not Enforced in Prompts

**What goes wrong:** `weekly_focus` and `before_state` marked as "one per document" in comments/code but prompt doesn't enforce it. Claude extracts multiple weekly_focus entities from different sections.

**Why it happens:** Singleton constraint exists in approval handler logic (Phase 51) but not in extraction prompt.

**How to avoid:** Add explicit singleton instruction in entity type description:
```markdown
- weekly_focus: { bullets } — this week's focus priorities.
  SINGLETON: Extract at most ONE weekly_focus entity per document.
  If multiple "this week" sections exist, synthesize into a single
  3-5 bullet consolidated list.
```

**Warning signs:** Approve route rejecting duplicate weekly_focus entities. UI showing multiple weekly focus sections when only one expected.

### Pitfall 5: Aggressive Inference Creates False Positives

**What goes wrong:** Instructing Claude to "infer aggressively" on all entity types creates false positives—hypothetical discussions extracted as action items, example workflows extracted as real e2e_workflow entities.

**Why it happens:** Inference instructions lack counterbalance for signal quality.

**How to avoid:** Add qualifier to inference instructions:
```markdown
Infer entity types from any relevant signals — do not require labeled sections.
However, distinguish between:
- REAL entities: actual project status, decisions made, work in progress
- HYPOTHETICAL entities: examples, hypotheticals ("we could do X"), future possibilities

Only extract REAL entities. If uncertain whether content describes actual
state vs hypothetical future, use confidence 0.5-0.6 to signal ambiguity.
```

**Warning signs:** Users rejecting large percentages of extracted entities during approval. Complaints of "hallucinated" tasks or risks.

### Pitfall 6: e2e_workflow Steps Field Assembly Complexity

**What goes wrong:** `e2e_workflow.steps` is an array of objects (`{ label, track, status, position }`). Assembling this from scattered transcript mentions is significantly harder than extracting flat strings.

**Why it happens:** Schema complexity inherited from Phase 51 (structured steps, not just string array).

**How to avoid:** Provide concrete assembly example in prompt:
```markdown
- e2e_workflow: { team_name, workflow_name, steps } — an end-to-end
  workflow for a team. Assemble from scattered mentions:

  Example document mentions:
  "NOC team starts with alert ingestion, then correlation,
   then they create incidents in ServiceNow"

  Extract as:
  {
    "team_name": "NOC",
    "workflow_name": "Alert to Ticket Workflow",
    "steps": [
      {"label": "Alert Ingestion", "track": "ADR", "status": "live", "position": 1},
      {"label": "Correlation", "track": "ADR", "status": "live", "position": 2},
      {"label": "Incident Creation", "track": "ADR", "status": "live", "position": 3}
    ]
  }
```

**Warning signs:** `e2e_workflow` entities extracted with empty `steps` arrays or malformed step objects.

## Code Examples

### Example 1: Rewriting Entity Type Description (before_state)

**Current (Phase 53):**
```typescript
- before_state: { aggregation_hub_name, alert_to_ticket_problem, pain_points }
  — customer's current state before BigPanda adoption; extract from sections
  titled "Current State", "Before State", "Pain Points", "Challenges", or
  similar; one entity per project
```

**Phase 57 (inference-first):**
```typescript
- before_state: { aggregation_hub_name (name of the primary alert aggregation
  hub or SIEM being replaced or supplemented — INFER from context even if not
  explicitly named), alert_to_ticket_problem (description of the pain point
  in the current alert-to-ticket workflow — ASSEMBLE from scattered pain-point
  mentions throughout the document), pain_points (comma-separated list of
  customer pain points — SYNTHESIZE from any comparative language like
  "before BigPanda", "we used to", "currently struggling with", or problem
  descriptions) } — customer's current state before BigPanda adoption.
  TRIGGER: Attempt extraction if ANY pain-point signal exists anywhere in
  the document. THRESHOLD: Thin entity better than no entity—users can edit.
  SINGLETON: One before_state per document.
```

**Source:** Phase 57 CONTEXT.md locked decisions

### Example 2: Pass 0 Enhanced Prompt

**Current (Phase 53):**
```typescript
export const PASS_0_PROMPT = `You are a document pre-analyzer. Your task is
to read the entire document and quote the 5-10 most information-dense sections
relevant to: project status, tasks and deliverables, architecture components,
and team engagement.

For each relevant section, output:
<relevant_section>
[Quote the section verbatim or near-verbatim — do not paraphrase]
</relevant_section>

Focus on sections that contain:
- Action items, tasks, or deliverables with owners or dates
- Architecture component names, statuses, or integration descriptions
- Team names, engagement stages, or onboarding status
- Business outcomes, goals, or success metrics

Do NOT extract entities yet. Do NOT output JSON. Quote sections only.`;
```

**Phase 57 (adds classification):**
```typescript
export const PASS_0_PROMPT = `You are a document pre-analyzer. Your task is
to (1) classify the document type, (2) predict likely entity types, and
(3) quote 5-10 high-value sections.

STEP 1: Classify document type
Output EXACTLY ONE of these values:
- transcript: meeting/call notes with dialogue or first-person conversation
- status-update: periodic written update (email format, weekly update doc)
- formal-doc: structured report with explicit sections and headings

STEP 2: Predict likely entity types
Based on a quick scan, list entity types likely present (e.g., "action, risk,
team, before_state, e2e_workflow").

STEP 3: Quote relevant sections
Quote the 5-10 most information-dense sections relevant to: project status,
tasks, architecture, and team engagement.

OUTPUT FORMAT (required):
<document_type>transcript | status-update | formal-doc</document_type>
<likely_entity_types>comma, separated, list</likely_entity_types>

<relevant_section>
[Quote 1...]
</relevant_section>

<relevant_section>
[Quote 2...]
</relevant_section>

Focus quoting on sections containing:
- Action items, tasks, deliverables with owners/dates
- Architecture components, statuses, integrations
- Team names, engagement stages, onboarding status
- Business outcomes, goals, success metrics
- Pain points, comparative language, "before" state descriptions

Do NOT extract entities yet. Do NOT output JSON. Classify and quote only.`;
```

**Source:** Anthropic XML structuring pattern + Phase 57 CONTEXT.md Pass 0 enhancement

### Example 3: Conditional Pass Behavior (Pass 1 Addition)

**Existing Pass 1 prompt ends with:**
```typescript
Extract all names exactly as they appear in the document. Do not abbreviate,
normalize, or infer names. Use null for any field not explicitly present.`;
```

**Phase 57 addition (before closing):**
```typescript
## DOCUMENT-TYPE-AWARE EXTRACTION

<pre_analysis>
{preAnalysisContext}
</pre_analysis>

If document type is `transcript` or `status-update`:
- Infer more aggressively from scattered mentions and conversational language
- Assemble entities from partial information spread across multiple sections
- Synthesize fields where explicit content is absent but signals exist
- Use lower confidence scores (0.5-0.7) to reflect inference vs direct extraction
- Recognize implicit action items (e.g., "John mentioned he'll configure alerts")
- Extract meeting follow-ups, commitments, and decisions from dialogue

If document type is `formal-doc`:
- Prefer explicit extraction from labeled sections when available
- Use higher confidence scores (0.8-0.95) for structured content
- Still apply inference when content spans multiple sections

Extract all names exactly as they appear in the document. Do not abbreviate,
normalize, or infer names. Use null for any field not explicitly present.`;
```

**Integration point:** The `{preAnalysisContext}` placeholder gets replaced at runtime with Pass 0 output (already implemented in Phase 53 `documentExtractionJob` function).

**Source:** Anthropic "long context prompting" pattern (put context at top, query at bottom)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | vitest.config.ts (existing) |
| Quick run command | `npm test -- extraction-prompts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

No formal phase requirements defined yet (CONTEXT.md shows "Requirements: TBD"). Tests will verify prompt structure and behavioral contracts.

| Test Focus | Behavior | Test Type | Automated Command | File Location |
|-----------|----------|-----------|-------------------|---------------|
| Global inference posture | EXTRACTION_BASE contains inference-first language | unit | `npm test -- extraction-prompts` | tests/ingestion/extraction-prompts.test.ts |
| Pass 0 classification | PASS_0_PROMPT outputs document_type + likely_entity_types | unit | `npm test -- extraction-prompts` | tests/ingestion/extraction-prompts.test.ts |
| Confidence rubric | All pass prompts include confidence scoring guidance | unit | `npm test -- extraction-prompts` | tests/ingestion/extraction-prompts.test.ts |
| Conditional pass behavior | Passes 1-3 check document type and adjust inference | unit | `npm test -- extraction-prompts` | tests/ingestion/extraction-prompts.test.ts |
| Singleton enforcement | weekly_focus and before_state marked as SINGLETON | unit | `npm test -- extraction-prompts` | tests/ingestion/extraction-prompts.test.ts |
| Entity-level inference | All 21 entity types have inference-first descriptions | unit | `npm test -- extraction-prompts` | tests/ingestion/extraction-prompts.test.ts |

### Sampling Rate

- **Per task commit:** `npm test -- extraction-prompts` (fast, <5s)
- **Per wave merge:** `npm test` (full suite, ~30-60s based on Phase 53 patterns)
- **Phase gate:** Full suite green + manual inspection of sample extraction on transcript document

### Wave 0 Gaps

Test file exists (`tests/ingestion/extraction-prompts.test.ts`) with 12 tests from Phase 53. Will extend with 6-8 new tests:
- [ ] `EXTRACTION_BASE includes global inference posture instruction`
- [ ] `PASS_0_PROMPT outputs structured XML with document_type tag`
- [ ] `PASS_0_PROMPT outputs likely_entity_types tag`
- [ ] `PASS_PROMPTS[1-3] include confidence scoring rubric`
- [ ] `PASS_PROMPTS[1-3] include conditional transcript-mode instructions`
- [ ] `weekly_focus description includes SINGLETON marker`
- [ ] `before_state description includes SINGLETON marker`
- [ ] `e2e_workflow description includes assembly example`

No framework gaps—existing Vitest infrastructure sufficient.

## Sources

### Primary (HIGH confidence)

- **Anthropic Prompt Engineering Best Practices** (https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices, verified 2026-04-11)
  - Be clear and direct (explicitly request desired behavior)
  - Use XML tags for structure (document, example, pre_analysis tags)
  - Document-first layout for long context (put document content before instructions)
  - Give Claude a role (document pre-analyzer, entity extractor)
  - Use examples effectively (wrap in `<example>` tags, show pattern)
  - Confidence calibration through explicit scoring rubrics

- **Anthropic Tool Use Documentation** (https://platform.claude.com/docs/en/docs/build-with-claude/tool-use, verified 2026-04-11)
  - `strict: true` mode for schema conformance (already used via `RECORD_ENTITIES_TOOL`)
  - Tool descriptions guide Claude's behavior
  - Multi-step tool use workflows supported

- **Phase 52-53 Implementation** (document-extraction.ts, committed 2026-04-09)
  - 3-pass structure (`PASS_PROMPTS[1|2|3]`)
  - Pass 0 pre-analysis (`PASS_0_PROMPT`)
  - Document-first layout already implemented (`<document>` tags in EXTR-02)
  - Tool use via `record_entities` (EXTR-08)
  - `preAnalysisContext` infrastructure exists (Pass 0 output flows to Passes 1-3)
  - `confidence` field in `ExtractionItem` schema

### Secondary (MEDIUM confidence)

- **extraction-intelligence-gap.md** (.planning/, written 2026-04-09)
  - Real-world failure mode: 0 extractions for wbs_task, arch_node, e2e_workflow, before_state, weekly_focus on transcript documents
  - Root cause: extraction-focused prompts fail on unstructured documents
  - Multi-pass approach (Phase 52) solved volume, not semantic classification

- **Phase 57 CONTEXT.md** (57-CONTEXT.md, written 2026-04-11)
  - User decisions on weekly_focus synthesis (always synthesized, never extracted)
  - before_state inference rules (trigger on any pain-point signal)
  - Pass 0 enhancement specification (document type + entity prediction)
  - Confidence calibration mapping (0.5-0.7 synthesized, 0.8-0.95 explicit)

### Tertiary (LOW confidence)

None—research grounded in official documentation and existing codebase.

## Metadata

**Confidence breakdown:**
- Prompt engineering patterns: HIGH (official Anthropic docs, verified 2026-04-11)
- Multi-pass extraction architecture: HIGH (implemented in Phase 52-53, tested in production)
- Synthesis-first approach: MEDIUM-HIGH (best practices documented, not yet tested on this specific entity schema)
- Document classification pattern: MEDIUM (pattern documented, not yet implemented in this codebase)

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (30 days — prompt engineering best practices stable, but Claude model releases could change behavior)

**Open questions:**
1. **Optimal confidence thresholds:** Are 0.5-0.7 (inferred) vs 0.8-0.95 (explicit) the right boundaries, or should they be narrower (0.6-0.7 vs 0.85-0.95)?
   - **Recommendation:** Start with wider ranges for Wave 1, then narrow based on user feedback during approval phase
   - **Validation approach:** Log confidence distribution per document type, measure rejection rate by confidence band

2. **Pass 0 classification accuracy:** Will Claude reliably distinguish `transcript` vs `status-update` vs `formal-doc` from document content alone?
   - **Recommendation:** Add a 4th fallback type `unknown` and default to conservative extraction mode
   - **Validation approach:** Manual audit of 20-30 sample documents across all types, measure classifier accuracy

3. **Singleton enforcement mechanism:** Should singleton constraint be enforced in prompt only, or also in post-extraction dedup logic?
   - **Recommendation:** Both—prompt instruction as primary, dedup as defense-in-depth (take first entity, warn on duplicates)
   - **Current state:** Phase 52 `deduplicateWithinBatch` has special case for weekly_focus (no dedup key), but doesn't enforce singleton

**Assumptions:**
- Claude Opus 4.6 and Sonnet 4.6 maintain synthesis capabilities documented in official guides (verified 2026-04-11)
- Existing 3-pass structure (Phase 52) provides sufficient granularity for inference—no additional passes needed
- Confidence scoring will guide users during approval, not block auto-approval (manual review still expected)
- Document classification in Pass 0 won't significantly impact latency (Pass 0 already runs, just adding 2 output lines)
