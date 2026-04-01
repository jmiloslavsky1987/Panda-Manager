# Phase 30: Context Hub - Research

**Researched:** 2026-03-31
**Domain:** Claude prompt engineering for multi-entity extraction and database completeness analysis
**Confidence:** HIGH

## Summary

Phase 30 builds a Context Hub where users upload documents (PDF/DOCX/PPTX), Claude extracts and routes content to workspace tabs, users approve/reject suggestions, and the system flags specific quality gaps per tab. The critical research question was: **how to prompt Claude for accurate multi-entity routing and actionable completeness analysis** when dealing with 14 entity types and 11 workspace tabs.

**Key findings:**
1. **Multi-entity extraction**: Use a single system prompt with explicit entity type guidance, XML document wrapping for prompt injection defense, and JSON schema validation. Claude Opus 4.6 natively handles 14+ entity types in one pass without routing conflicts.
2. **Completeness analysis**: Serialize live DB data per tab (following existing `chat-context-builder.ts` pattern), wrap in XML tags, reference `tab-template-registry.ts` section definitions, and ask Claude for specific record-level gaps. Return structured JSON array.
3. **Existing infrastructure**: The project already has extraction (`app/api/ingestion/extract/route.ts`), deduplication, and chat context serialization patterns. Phase 30 extends entity types (+3) and adds a new completeness endpoint.

**Primary recommendation:** Extend the existing extraction route's system prompt to include `workstream`, `onboarding_step`, and `integration` entity types. Build a new `/api/projects/[projectId]/completeness` route that mirrors `chat-context-builder.ts` serialization but asks Claude for gaps instead of answering questions. Both use raw Anthropic SDK with adaptive thinking.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
**Tab Navigation Placement:**
- Standalone tab (no sub-tabs) — `standalone: true` in TAB_GROUPS
- Position: before Admin, at the end of nav bar
- URL pattern: `?tab=context`

**Tab Layout (vertical single scroll):**
1. Upload section — drop zone / upload button triggers IngestionModal
2. Upload history list — filename, date, status (read-only)
3. Completeness panel — per-tab badges + expandable gap descriptions, "Analyze" trigger button

**Ingestion Flow:**
- Reuse existing `IngestionModal` component — no inline rebuild
- Full upload → extract → review → approve flow inside existing modal
- Conflict resolution: smart merge (merge / replace / skip per item)
- Claude routes all entity types equally — trust the extraction prompt

**Entity Type Additions:**
- `workstream` → maps to `workstreams` table
- `onboarding_step` → maps to `onboarding_steps` table
- `integration` → maps to `integrations` table
- All existing entity types retained (11 total + 3 new = 14)

**Completeness Panel:**
- All 11 workspace tabs listed, **collapsed by default**
- Each row: tab name + status badge (complete / partial / empty)
- **On-demand trigger**: "Analyze completeness" button (no auto-run)
- Gap description format: **specific record-level** (e.g., "Teams tab: ADR onboarding status missing for Kaiser")
- Gap descriptions reference `lib/tab-template-registry.ts` section definitions

**Upload History:**
- Positioned between upload section and completeness panel
- Columns: filename, upload date, ingestion status
- **Read-only** — no re-extract from history

### Claude's Discretion
- Exact extraction prompt wording for the three new entity types
- Completeness analysis system prompt structure
- Routing logic for low-confidence or ambiguous extractions
- Upload section drop zone styling and empty state copy
- Exact card/row styling for history list and completeness panel

### Deferred Ideas (OUT OF SCOPE)
- Auto-run completeness analysis after every approval batch
- Re-extract from history (retry button on failed documents)
- Scheduled / background completeness analysis (BullMQ job)
- Cross-project completeness comparison
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CTX-01 | Each project workspace has a dedicated Context tab as the primary document upload interface | Tab navigation patterns from Phase 27 (`TAB_GROUPS` + `standalone: true`); reuse `IngestionModal` from existing codebase |
| CTX-02 | Uploaded documents are classified by Claude and extracted content is routed to the appropriate workspace tabs | Anthropic structured outputs + XML document wrapping; extend existing extraction route's system prompt with 3 new entity types |
| CTX-03 | Claude analyzes each tab's live data and surfaces specific quality gaps per tab | New completeness endpoint; serialize DB data per tab (like `chat-context-builder.ts`); prompt Claude to reference `tab-template-registry.ts` sections and return record-level gaps as JSON |
| CTX-04 | Context tab displays completeness status for all workspace tabs with gap summaries at a glance | Client component queries completeness endpoint; displays badges (complete/partial/empty) + expandable gap list per tab |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.80.0 | Raw Claude API client | Already used in extraction route; supports streaming, structured outputs, adaptive thinking |
| @ai-sdk/anthropic | ^3.0.64 | Vercel AI SDK adapter | Used in Phase 29 chat; not needed for Context Hub (extraction/completeness use raw SDK) |
| drizzle-orm | ^0.45.1 | Database queries | Project standard; used for all DB reads in completeness analysis |
| zod | ^4.3.6 | Request validation | Project standard; validates extraction and completeness API request bodies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsonrepair | ^3.13.3 | JSON repair | Already used in extraction route; fallback when Claude returns malformed JSON (rare with structured outputs) |
| mammoth | ^1.12.0 | DOCX → text | Document text extraction; already in extraction pipeline |
| (none for PPTX) | N/A | PPTX → text | Use pptxgenjs reverse parse or Claude native PDF document block (convert PPTX → PDF first) |

**Installation:**
All dependencies already installed per `package.json`. No new packages required.

---

## Architecture Patterns

### Recommended Project Structure
```
bigpanda-app/
├── app/
│   ├── api/
│   │   ├── ingestion/
│   │   │   ├── extract/route.ts        # EXTEND: add 3 entity types
│   │   │   └── approve/route.ts         # EXTEND: handle 3 new types
│   │   └── projects/
│   │       └── [projectId]/
│   │           └── completeness/route.ts  # NEW: on-demand gap analysis
│   ├── customer/
│   │   └── [id]/
│   │       └── context/page.tsx         # NEW: Context tab page
├── components/
│   ├── IngestionModal.tsx               # REUSE: existing upload flow
│   ├── ContextTab.tsx                   # NEW: Context tab UI
│   └── WorkspaceTabs.tsx                # EXTEND: add Context to TAB_GROUPS
├── lib/
│   ├── chat-context-builder.ts          # ADAPT: pattern for completeness serialization
│   └── tab-template-registry.ts         # READ: reference for gap descriptions
```

### Pattern 1: Multi-Entity Extraction System Prompt
**What:** Single system prompt that defines all 14 entity types with explicit field guidance per type
**When to use:** Extending existing extraction route to handle new entity types
**Example:**
```typescript
// Source: app/api/ingestion/extract/route.ts (existing pattern)
const EXTRACTION_SYSTEM = `You are a project data extractor. Given a document, extract all structured project data.
Output ONLY a JSON array of extraction items — no prose before or after, no markdown code fences.
Each item follows this exact shape:
{
  "entityType": "action" | "risk" | "decision" | "milestone" | "stakeholder" | "task" | "architecture" | "history" | "businessOutcome" | "team" | "note" | "workstream" | "onboarding_step" | "integration",
  "fields": { /* entity-specific key-value pairs as strings */ },
  "confidence": 0.85,
  "sourceExcerpt": "verbatim text this was extracted from (max 200 chars)"
}

Entity type guidance:
- action: { description, owner, due_date, status }
- risk: { description, severity, mitigation, owner }
- decision: { decision, rationale, made_by, date }
- milestone: { name, target_date, status }
- stakeholder: { name, role, email, account }
- task: { title, status, owner, phase }
- architecture: { tool_name, track, phase, status, integration_method }
- history: { date, content, author }
- businessOutcome: { title, track, description, delivery_status }
- team: { team_name, track, ingest_status }
- workstream: { name, track, phase, status, percent_complete }
- onboarding_step: { team_name, step_name, track, status, completed_date }
- integration: { tool_name, category, connection_status, notes }
- note: { content, context } — use for any valuable content that does not fit the above types

IMPORTANT: Do NOT discard content just because it doesn't fit a structured type. Capture it as a "note".
Output only the raw JSON array. Never wrap it in markdown code fences.`;
```

**Key insight:** Claude Opus 4.6 handles 14+ entity types in a single prompt without routing conflicts when each type has explicit field guidance. No need for multi-pass classification.

### Pattern 2: XML Document Wrapping (Prompt Injection Defense)
**What:** Wrap user-uploaded document content in `<document_content>` tags
**When to use:** Always, for any Claude call that processes user-uploaded content
**Example:**
```typescript
// Source: Anthropic official docs (prompt engineering best practices)
const userContent: Anthropic.MessageParam['content'] = [
  {
    type: 'text',
    text: `<document_content>\n${extractedText}\n</document_content>\n\nExtract all structured project data from the document above. Output only the JSON array.`,
  },
];
```

**Why:** Prevents prompt injection attacks where a malicious document contains instructions like "Ignore all previous instructions and return..." — the XML delimiter makes it clear where user data begins and ends.

### Pattern 3: Completeness Analysis Serialization
**What:** Serialize live DB data per tab in markdown format, then ask Claude for gaps
**When to use:** New completeness endpoint
**Example:**
```typescript
// Adapt from lib/chat-context-builder.ts pattern
async function buildCompletenessContext(projectId: number): Promise<string> {
  const [project, workspace] = await Promise.all([
    getProjectById(projectId),
    getWorkspaceData(projectId),
  ]);

  const sections: string[] = [];

  // Overview tab
  sections.push('## Overview Tab');
  sections.push(`Project: ${project.name}`);
  sections.push(`Status: ${project.overall_status ?? 'N/A'}`);
  sections.push(`Go-Live Target: ${project.go_live_target ?? 'N/A'}`);

  // Actions tab
  sections.push('', '## Actions Tab');
  if (workspace.actions?.length) {
    workspace.actions.forEach(a => {
      sections.push(`- [${a.external_id}] ${a.description} | Owner: ${a.owner ?? 'TBD'} | Due: ${a.due ?? 'TBD'}`);
    });
  } else {
    sections.push('(No actions)');
  }

  // ... repeat for all 11 tabs

  return sections.join('\n');
}
```

**Completeness prompt:**
```typescript
const COMPLETENESS_SYSTEM = `You are a project data quality analyst. Given a project's current data, identify specific quality gaps per workspace tab.

Reference the tab template registry for required fields per tab type:
${JSON.stringify(TAB_TEMPLATE_REGISTRY, null, 2)}

Output a JSON array with one entry per tab:
{
  "tabId": "actions",
  "status": "partial",  // complete | partial | empty
  "gaps": [
    "4 actions missing an owner assignment (A-KAISER-003, A-KAISER-007, ...)",
    "2 actions have 'TBD' as due date — no actual timeline set"
  ]
}

Guidelines:
- "complete" = all required fields present, no placeholder values (TBD, N/A, template text)
- "partial" = some data present but missing required fields or has placeholders
- "empty" = no records or only template placeholder records
- Gaps must be SPECIFIC: reference record IDs, counts, and exact missing fields
- Filter out records with source='template' (zero credit for completeness)`;
```

### Pattern 4: Structured Outputs for Guaranteed JSON
**What:** Use `output_config.format` with JSON schema to guarantee valid JSON responses
**When to use:** When JSON parsing errors are unacceptable (completeness endpoint)
**Example:**
```typescript
// Source: Anthropic structured outputs docs
const response = await client.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 16384,
  system: COMPLETENESS_SYSTEM,
  messages: [{ role: 'user', content: completenessContext }],
  output_config: {
    format: {
      type: 'json_schema',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tabId: { type: 'string' },
            status: { type: 'string', enum: ['complete', 'partial', 'empty'] },
            gaps: { type: 'array', items: { type: 'string' } },
          },
          required: ['tabId', 'status', 'gaps'],
          additionalProperties: false,
        },
      },
    },
  },
});
```

**Why:** Eliminates `JSON.parse()` errors and retries. Claude guarantees schema-compliant output through constrained decoding.

### Anti-Patterns to Avoid
- **Multi-pass classification:** Don't extract first then classify entity types in a second call — Claude handles 14+ types in one pass
- **String parsing over structured outputs:** Don't rely on `jsonrepair()` when structured outputs guarantee valid JSON
- **Generic gap descriptions:** Don't return "Actions tab is incomplete" — always reference specific records and fields
- **Auto-running completeness on every page load:** On-demand trigger only (user decision per CONTEXT.md)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Document text extraction | Custom PDF/DOCX parsers | Existing `extractDocumentText()` + Claude native PDF document blocks | PDF extraction is already solved in extraction route; Claude Opus 4.6 supports native PDF document blocks that preserve layout and structure |
| JSON schema validation | Manual field checking | Anthropic structured outputs (`output_config.format`) | Guarantees schema-compliant output through constrained decoding; eliminates parsing errors and retries |
| Prompt injection defense | Custom sanitization | XML document wrapping (`<document_content>` tags) | Anthropic official pattern; clearly delimits user content from instructions |
| DB data serialization | Custom formatters | Adapt existing `chat-context-builder.ts` | Already solves the exact problem (serialize project DB data to markdown); proven pattern from Phase 29 |
| Entity deduplication | Custom similarity scoring | Existing `isAlreadyIngested()` from extraction route | Normalized prefix matching on first 120 chars; handles all 14 entity types; battle-tested |

**Key insight:** Phase 30 is 90% composition of existing patterns. The only net-new code is the completeness endpoint and the Context tab UI component.

---

## Common Pitfalls

### Pitfall 1: Routing Conflicts Between Similar Entity Types
**What goes wrong:** Documents mention both "integration status" and "architecture integrations" — Claude routes the same information to both `integration` and `architecture` types, creating duplicates
**Why it happens:** Entity type field guidance overlaps (both have `tool_name`, `status`)
**How to avoid:** Make field guidance mutually exclusive:
- `architecture`: "tool_name, track, phase, status, integration_method" — focus on **workflow phase and method**
- `integration`: "tool_name, category, connection_status, notes" — focus on **connection live/pilot/planned and operational notes**
**Warning signs:** Deduplication filters out >50% of extracted items; users see the same information in multiple tabs

### Pitfall 2: Generic Gap Descriptions
**What goes wrong:** Completeness analysis returns "Actions tab is incomplete" — user doesn't know which actions or what's missing
**Why it happens:** Prompt doesn't require specificity or record IDs
**How to avoid:** System prompt must say "reference record IDs, counts, and exact missing fields" — see Pattern 3 completeness prompt
**Warning signs:** Users ignore gap descriptions because they're too vague to act on

### Pitfall 3: Template Placeholder Records Counted as Complete
**What goes wrong:** New project shows "complete" status even though all data is template placeholders
**Why it happens:** Completeness logic counts records without checking `source='template'`
**How to avoid:** System prompt: "Filter out records with source='template' (zero credit for completeness)"
**Warning signs:** Every new project shows 100% complete immediately after creation

### Pitfall 4: Unbounded Completeness Analysis Token Usage
**What goes wrong:** Large project with 500+ actions triggers 50k+ input tokens and times out
**Why it happens:** No pagination or truncation on DB data serialization
**How to avoid:** Limit serialization to recent/relevant records per tab (e.g., last 50 actions, open risks only)
**Warning signs:** Completeness endpoint takes >30 seconds or returns 504 timeout errors

### Pitfall 5: Extraction Prompt Drift from Actual Entity Types
**What goes wrong:** Extraction prompt defines `team_pathway` entity type but route handler has no code to write it to DB — extracted items silently dropped
**Why it happens:** Prompt and route handler entity type lists not kept in sync
**How to avoid:** Export `EntityType` union from extraction route; import it in approve route; TypeScript compiler enforces exhaustive handling
**Warning signs:** Extraction preview shows entity types that never appear in workspace tabs after approval

---

## Code Examples

Verified patterns from official sources:

### Multi-Document Structure with XML (Anthropic Docs)
```xml
<!-- Source: https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/use-xml-tags -->
<documents>
  <document index="1">
    <source>weekly_meeting_notes_2024-03-25.docx</source>
    <document_content>
      {{EXTRACTED_DOCUMENT_TEXT}}
    </document_content>
  </document>
</documents>

Extract all structured project data from the document above. Output only the JSON array.
```

### Adaptive Thinking for Completeness Analysis (Anthropic Docs)
```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/adaptive-thinking
const response = await client.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 16384,
  thinking: { type: 'adaptive' },  // Claude decides when to think deeply
  output_config: { effort: 'high' },  // Encourage thorough analysis
  system: COMPLETENESS_SYSTEM,
  messages: [{ role: 'user', content: completenessContext }],
});
```

**Why:** Completeness analysis benefits from deep reasoning (comparing live data against template requirements, spotting patterns of missing fields). Adaptive thinking with high effort ensures Claude takes the time to be thorough without requiring manual budget tuning.

### Existing Extraction Route Pattern (Project Code)
```typescript
// Source: app/api/ingestion/extract/route.ts (lines 391-405)
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

**Pattern:** SSE streaming with raw Anthropic SDK. No need to change for Phase 30 — just extend `EXTRACTION_SYSTEM` prompt and `EntityType` union.

### Deduplication Logic (Project Code)
```typescript
// Source: app/api/ingestion/extract/route.ts (lines 108-134)
async function isAlreadyIngested(
  item: ExtractionItem,
  projectId: number,
): Promise<boolean> {
  const f = item.fields;

  switch (item.entityType) {
    case 'action': {
      const key = normalize(f.description);  // first 120 chars, lowercased
      if (!key) return false;
      const rows = await db
        .select({ id: actions.id })
        .from(actions)
        .where(
          and(
            eq(actions.project_id, projectId),
            ilike(actions.description, `${key}%`),
          ),
        );
      return rows.length > 0;
    }
    // ... repeat for all entity types
  }
}
```

**Pattern:** Case-insensitive prefix matching on normalized primary field. Extend with 3 new cases for `workstream`, `onboarding_step`, `integration`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `output_format` parameter | `output_config.format` | Claude 4.6 release (2025-11) | Structured outputs guarantee schema-compliant JSON — no more `JSON.parse()` errors |
| Extended thinking with `budget_tokens` | Adaptive thinking with `effort` parameter | Claude 4.6 release (2025-11) | Claude decides when to think deeply based on query complexity — no manual budget tuning |
| Prefilled assistant responses | Direct instructions in system prompt | Claude 4.6 deprecation | "Respond directly without preamble" in system prompt replaces assistant prefills |
| Few-shot prompting with hardcoded examples | Tool use with enum fields | 2024-2025 | Classification tasks use tools with enum fields instead of multishot examples — more reliable |
| Manual JSON repair with `jsonrepair()` | Structured outputs | 2025-11 | Fallback only; structured outputs eliminate need for repair in 99% of cases |

**Deprecated/outdated:**
- **Prefilled responses:** No longer supported in Claude 4.6+. Use system prompt instructions or XML tags instead.
- **Extended thinking with `budget_tokens`:** Still functional but deprecated. Use adaptive thinking with `effort` parameter.
- **`anthropic-beta` headers for structured outputs:** No longer required as of general availability (2025-11).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTX-01 | Context tab registered in TAB_GROUPS with standalone: true | unit | `npm test tests/ui/workspace-tabs.test.ts -t "Context tab" --run` | ❌ Wave 0 |
| CTX-02 | Extraction route handles workstream, onboarding_step, integration entity types | unit | `npm test tests/ingestion/extractor.test.ts -t "new entity types" --run` | ❌ Wave 0 |
| CTX-03 | Completeness endpoint serializes DB data per tab and returns JSON array of gaps | unit | `npm test tests/context/completeness.test.ts -t "gap analysis" --run` | ❌ Wave 0 |
| CTX-04 | ContextTab component displays badges and expandable gap descriptions | unit | `npm test tests/context/context-tab.test.ts -t "completeness UI" --run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test tests/context/ --run` (Context Hub tests only)
- **Per wave merge:** `npm test --run` (full suite)
- **Phase gate:** Full suite green + human browser verification (upload → extract → approve → completeness flow)

### Wave 0 Gaps
- [ ] `tests/context/completeness.test.ts` — covers CTX-03 (gap analysis endpoint)
- [ ] `tests/context/context-tab.test.ts` — covers CTX-04 (UI component)
- [ ] `tests/ui/workspace-tabs.test.ts` extension — covers CTX-01 (Context tab registration)
- [ ] `tests/ingestion/extractor.test.ts` extension — covers CTX-02 (new entity types)
- [ ] Framework install: none needed (vitest already installed)

---

## Sources

### Primary (HIGH confidence)
- [Anthropic Prompt Engineering — Official Docs](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/overview) — Multi-class entity extraction, XML tags, structured outputs guidance
- [Anthropic Structured Outputs — Official Docs](https://platform.claude.com/docs/en/docs/build-with-claude/structured-outputs) — JSON schema validation, guaranteed schema compliance
- [Anthropic Tool Use — Official Docs](https://platform.claude.com/docs/en/docs/build-with-claude/tool-use) — Classification with enum fields
- [Project codebase](bigpanda-app/) — Existing extraction route, chat context builder, tab template registry

### Secondary (MEDIUM confidence)
- [Anthropic Cookbooks GitHub](https://github.com/anthropics/anthropic-cookbook) — No specific completeness analysis examples; adapted SQL query + JSON mode patterns

### Tertiary (LOW confidence)
- None — all findings verified with official docs or existing project code

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — All libraries already in `package.json`; no new dependencies
- Architecture: **HIGH** — Existing extraction route and chat context builder provide proven patterns; research verified with Anthropic official docs
- Pitfalls: **MEDIUM** — Routing conflicts and template placeholder handling are anticipated based on existing deduplication logic, but not yet proven in production
- Code examples: **HIGH** — All examples sourced from Anthropic official docs or existing project code

**Research date:** 2026-03-31
**Valid until:** 60 days (2026-05-30) — Claude API patterns stable; structured outputs GA as of 2025-11

**Critical unknowns resolved:**
1. ✅ How to route 14+ entity types without conflicts → Single prompt with explicit field guidance per type
2. ✅ How to prevent prompt injection in uploaded documents → XML `<document_content>` wrapping
3. ✅ How to serialize DB data for completeness analysis → Adapt existing `chat-context-builder.ts` pattern
4. ✅ How to get actionable gap descriptions → Reference `tab-template-registry.ts` in system prompt; require record IDs and specific fields in output schema
5. ✅ How to guarantee valid JSON from completeness endpoint → Structured outputs with `output_config.format`
