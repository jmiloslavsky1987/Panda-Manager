# Phase 46: Context Upload Extraction Expansion - Research

**Researched:** 2026-04-08
**Domain:** AI document extraction, entity classification, multi-target routing, WBS auto-classification
**Confidence:** HIGH

## Summary

Phase 46 extends the existing BullMQ document extraction pipeline to support three new entity types (WBS tasks, Team Engagement sections, Architecture nodes) while maintaining 80%+ classification accuracy on existing 15 entity types. The core challenge is expanding the Claude extraction prompt to classify tasks into WBS hierarchies, engagement data into 5 structured sections, and architecture details into track-based nodes — all while preserving the existing deduplication and conflict resolution logic.

The existing extraction architecture is well-designed: `worker/jobs/document-extraction.ts` handles extraction via Claude API, `lib/extraction-types.ts` defines the entity type union and dedup logic, and `app/api/ingestion/approve/route.ts` writes approved items to DB. Phase 45 created all target tables (wbsItems, teamEngagementSections, archTracks, archNodes), so this phase focuses purely on classification logic and routing.

**Primary recommendation:** Add three new entity types to `EntityType` union: `wbs_task`, `team_engagement`, `arch_node`. Extend EXTRACTION_SYSTEM prompt with WBS hierarchy classification guidance (track + level + parent section), Team Engagement 5-section routing rules, and Architecture track mapping. Update `isAlreadyIngested()` and `insertItem()` to handle new types. Test with real PS delivery documents to validate 80%+ accuracy baseline.

## <phase_requirements>

| ID | Description | Research Support |
|----|-------------|------------------|
| WBS-03 | When context is uploaded, extracted tasks are auto-classified to the nearest WBS node via AI (with fallback to manual assignment) | Claude prompt engineering for hierarchical classification; WBS track + level + parent section extracted as structured fields; existing task entity type serves as source, new wbs_task type routes to wbsItems table via wbsTaskAssignments join |
| TEAM-02 | Context upload extracts and routes structured data to populate all Team Engagement Map sections automatically | New team_engagement entity type with section_name field ('Business Outcomes', 'Architecture', 'E2E Workflows', 'Teams & Engagement', 'Top Focus Areas'); content field holds markdown text; routes to teamEngagementSections table by matching section name |
| ARCH-04 | Context upload extracts and routes architecture data (tool names, integration statuses, team names, phase assignments) to populate both diagram tabs | New arch_node entity type with track ('ADR Track', 'AI Assistant Track'), node_name, status ('planned'|'in_progress'|'live'), notes fields; routes to archNodes table by matching track + creating/updating node |

</phase_requirements>

## Standard Stack

### Core (Already In Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.80.0 | Claude API client with streaming support | Official Anthropic SDK; existing extraction job uses streaming API with 16K token output limit |
| BullMQ | 5.71.0 | Background job queue for extraction | Already handles document-extraction jobs; supports progress tracking, chunking, and failure recovery |
| Drizzle ORM | 0.45.1 | Type-safe DB access | Existing pattern for all entity inserts; Phase 45 added wbsItems, teamEngagementSections, archNodes tables |
| Zod | Latest | Request validation and type coercion | Existing approve route uses Zod schemas; extend ApprovalItemSchema enum for new entity types |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsonrepair | 3.13.3 | Repair malformed JSON from Claude | Already used in document-extraction.ts; handles cases where Claude outputs invalid JSON despite prompt constraints |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Claude API structured extraction | OpenAI function calling | OpenAI function calling more rigid schema enforcement but requires function definitions; Claude native JSON output more flexible for open-ended document parsing where schema evolves |
| String-based entity type union | Numeric enum | String union type-safe at compile time and self-documenting in code; numeric enum would require separate mapping layer |
| Prompt-based WBS classification | Dedicated NER model | Dedicated model could improve accuracy but adds infrastructure complexity and training data burden; prompt-based classification sufficient for 80%+ accuracy requirement and faster to iterate |

**Installation:**
All dependencies already present in package.json from earlier phases.

## Architecture Patterns

### Recommended Project Structure
```
worker/jobs/
├── document-extraction.ts    # PRIMARY: Extend EXTRACTION_SYSTEM prompt + EntityType union
lib/
├── extraction-types.ts       # Extend EntityType union + isAlreadyIngested() for new types
app/api/ingestion/approve/
└── route.ts                  # Extend insertItem() + findConflict() for new types
db/
└── schema.ts                 # Already has wbsItems, teamEngagementSections, archNodes (Phase 45)
```

### Pattern 1: Claude Structured Extraction via System Prompt
**What:** System prompt defines JSON output schema with per-entity-type field guidance; Claude returns JSON array of extraction items
**When to use:** Open-ended document parsing where schema may evolve; prefer over function calling when flexibility matters
**Example:**
```typescript
// Source: worker/jobs/document-extraction.ts lines 24-57
export const EXTRACTION_SYSTEM = `You are a project data extractor. Given a document, extract all structured project data.
Output ONLY a JSON array of extraction items — no prose before or after, no markdown code fences.
Each item follows this exact shape:
{
  "entityType": "action" | "risk" | "decision" | ...,
  "fields": { /* entity-specific key-value pairs as strings */ },
  "confidence": 0.85,
  "sourceExcerpt": "verbatim text this was extracted from (max 200 chars)"
}
Entity type guidance:
- action: { description, owner, due_date, status, notes, type }
- task: { title, status, owner, phase, description, start_date, due_date, priority, milestone_name, workstream_name }
...
Extract all names (owners, milestone names, workstream names) exactly as they appear in the document.`;
```

### Pattern 2: Hierarchical Entity Classification (NEW for Phase 46)
**What:** Extend extraction prompt to classify tasks into WBS hierarchy by extracting track ('ADR'|'Biggy'), level (1-3), and parent section name
**When to use:** When extracted entities need to map to pre-seeded hierarchical structures
**Example (to implement):**
```typescript
// Add to EXTRACTION_SYSTEM prompt:
- wbs_task: {
    title,
    track ("ADR" or "Biggy"),
    parent_section_name (exact match from WBS template),
    level (1, 2, or 3 — 1 for top-level sections, 2 for sub-items, 3 for leaf tasks),
    status ("not_started", "in_progress", or "complete"),
    description
  } — task that belongs in WBS structure; extract track and parent section verbatim as they appear
```

**Implementation note:** Match parent_section_name against seeded WBS items by querying `wbsItems` table filtered by project + track + level, using fuzzy matching (ilike) to find closest match. Insert new wbs_item if no good match found, or create wbsTaskAssignments link if parent exists.

### Pattern 3: Content Blob Routing to Named Sections (NEW for Phase 46)
**What:** Extract markdown content blobs and route to pre-seeded section rows by section name
**When to use:** When target schema uses text blob storage (not structured sub-fields) and sections are pre-defined
**Example (to implement):**
```typescript
// Add to EXTRACTION_SYSTEM prompt:
- team_engagement: {
    section_name ("Business Outcomes" | "Architecture" | "E2E Workflows" | "Teams & Engagement" | "Top Focus Areas"),
    content (markdown text for this section)
  } — content for Team Engagement Map sections; extract verbatim section names
```

**Implementation note:** Query `teamEngagementSections` by project + section name (exact match or fuzzy), append new content to existing content field (markdown concatenation with `\n\n---\n\n` separator to preserve multi-upload history).

### Pattern 4: Track-Based Node Routing (NEW for Phase 46)
**What:** Extract architecture nodes with track assignment, status, and notes; route to correct track by matching track name
**When to use:** When target schema uses track-based grouping (ADR Track vs AI Assistant Track)
**Example (to implement):**
```typescript
// Add to EXTRACTION_SYSTEM prompt:
- arch_node: {
    track ("ADR Track" | "AI Assistant Track"),
    node_name (tool or capability name),
    status ("planned" | "in_progress" | "live"),
    notes (integration details, status notes)
  } — architecture capability or tool node; extract track verbatim
```

**Implementation note:** Query `archTracks` by project + track name (fuzzy match), then insert/update `archNodes` by node_name within that track. Use upsert pattern (ON CONFLICT UPDATE) to merge status and notes if node already exists.

### Anti-Patterns to Avoid
- **Overloading existing entity types:** Don't route WBS tasks through existing `task` entity type — creates routing ambiguity and breaks dedup logic
- **Hardcoded section/track names in code:** Extract verbatim from document and use fuzzy matching; avoid brittle exact-match logic
- **JSON schema validation inside Claude prompt:** Claude output already brittle; keep prompt focused on extraction, use jsonrepair + lenient parsing in code
- **Synchronous multi-entity resolution:** Cross-entity resolution (e.g., task → milestone FK) already handled asynchronously in approve route; don't block extraction job on FK lookups

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hierarchical text classification | Custom ML model, tree-based classifier | Claude prompt with parent section extraction + fuzzy matching | Training data burden high; prompt-based classification already proven 80%+ accurate on 15 entity types; faster to iterate on prompt than retrain model |
| JSON repair from LLM output | Regex-based JSON fixing, manual bracket counting | jsonrepair library (already in use) | Handles edge cases like trailing commas, unquoted keys, escaped quotes; battle-tested across many LLM output formats |
| Entity deduplication | Custom fuzzy matching, Levenshtein distance | Existing normalize() + ilike prefix matching (lines 103-313 extraction-types.ts) | Already proven in production; prefix matching on first 120 chars catches typos and rewording; ilike case-insensitive |
| Background job progress tracking | Custom polling endpoint, WebSocket updates | BullMQ job.updateProgress + extractionJobs table progress_pct/current_chunk (lines 395-481 document-extraction.ts) | Already implemented; supports chunk-by-chunk progress for large documents; UI polls extractionJobs table |

**Key insight:** Extraction accuracy depends more on prompt quality than infrastructure complexity. Existing extraction pipeline already handles chunking, streaming, dedup, conflict resolution, and progress tracking — Phase 46 purely extends prompt and routing logic.

## Common Pitfalls

### Pitfall 1: Prompt Expansion Degrades Existing Classification Accuracy
**What goes wrong:** Adding three new entity types with complex field guidance increases prompt token count, potentially confusing Claude and degrading accuracy on existing 15 entity types
**Why it happens:** Claude prompt already 57 lines (24-57 in document-extraction.ts); adding WBS hierarchy, Team Engagement sections, and Architecture track guidance could push beyond working memory limits
**How to avoid:**
1. Baseline existing accuracy: run extraction on known-good test documents BEFORE prompt changes, record precision/recall per entity type
2. Incremental prompt expansion: add one new entity type at a time, test accuracy after each addition
3. Hierarchical guidance structure: use consistent formatting (indented sub-bullets for field descriptions) to help Claude parse complex schemas
4. Monitor filtered_count ratio: if filtered_count (deduped items) drops significantly after prompt change, suggests over-extraction or misclassification
**Warning signs:** `staged_items_json` contains items with wrong entity types (e.g., tasks classified as actions), confidence scores drop below 0.7, user reports many false positives in preview UI

### Pitfall 2: WBS Parent Section Matching Ambiguity
**What goes wrong:** Extracted parent_section_name doesn't match seeded WBS structure because document uses abbreviated or reworded section names (e.g., "Discovery" vs "Discovery & Kickoff")
**Why it happens:** ADR WBS template has 10 top-level sections, Biggy has 5; documents may use shorthand or customer-specific naming
**How to avoid:**
1. Fuzzy matching with ilike: use `ilike(wbsItems.name, `%${key}%`)` to match partial names
2. Fallback hierarchy: if no match at specified level, create orphan wbs_item with parent_id=null and flag with source_trace='extraction-orphan'
3. Manual reconciliation UI: Phase 47 provides drag-drop to reassign orphaned items to correct parent
4. Prompt guidance: instruct Claude to extract FULL section names verbatim, not abbreviations
**Warning signs:** Many wbs_items with parent_id=null after extraction, user reports tasks appearing in wrong WBS sections, wbsTaskAssignments join table has many dangling references

### Pitfall 3: Team Engagement Content Overwriting vs Appending
**What goes wrong:** Multiple document uploads with Team Engagement content overwrite previous extractions instead of appending, losing data
**Why it happens:** Initial implementation uses simple UPDATE SET content=new_value instead of concat pattern
**How to avoid:**
1. Append pattern: `UPDATE teamEngagementSections SET content = CONCAT(content, '\n\n---\n\n', new_content)` where content is not empty
2. Conflict resolution: in approve route, check if section already has content; if yes, offer merge (append) or replace options in UI
3. Source tracing: append source_artifact_id to content as markdown comment `<!-- Source: artifact_123 -->` for provenance
**Warning signs:** User reports missing previously extracted engagement data after new upload, content field shorter than expected, complaints about "lost context"

### Pitfall 4: Architecture Track Mismatch Between Prompt and Schema
**What goes wrong:** Claude extracts track names like "Alert Intelligence Track" but schema expects exact values "ADR Track" | "AI Assistant Track"
**Why it happens:** Disconnect between prompt guidance and seeded archTracks values
**How to avoid:**
1. Seed archTracks before first use: Phase 45 already seeds two tracks per project ("ADR Track", "AI Assistant Track") in project creation transaction
2. Exact track name prompt: explicitly list two valid track names in prompt, instruct Claude to extract verbatim
3. Fuzzy matching with fallback: if extracted track doesn't match seeded tracks, use ilike to find closest, log warning if no match
4. Pre-population verification: add test that verifies archTracks seeded correctly on project creation before extraction runs
**Warning signs:** archNodes inserted with null track_id or dangling FK errors, user reports architecture nodes not appearing in correct track, extraction job fails with FK constraint violation

### Pitfall 5: Entity Type Explosion Breaking Dedup Logic
**What goes wrong:** Adding wbs_task, team_engagement, arch_node to EntityType union causes switch statement exhaustion in isAlreadyIngested() and insertItem(), missing case arms
**Why it happens:** TypeScript union exhaustiveness check only at compile time; runtime switch needs explicit default case
**How to avoid:**
1. Exhaustive switch pattern: use TypeScript `switch(item.entityType) { case 'wbs_task': ... default: const _exhaustive: never = item.entityType; }` to force compile-time checks
2. Test coverage: add unit tests for each new entity type routing through isAlreadyIngested() and insertItem()
3. Runtime logging: log unhandled entity types to Sentry/console in default case before throwing error
**Warning signs:** TypeScript compiler warnings about non-exhaustive switch, runtime errors "Cannot insert item of type wbs_task", items stuck in preview stage without error messages

## Code Examples

Verified patterns from existing implementation:

### Existing Extraction Prompt Pattern
```typescript
// Source: worker/jobs/document-extraction.ts lines 24-57
export const EXTRACTION_SYSTEM = `You are a project data extractor. Given a document, extract all structured project data.
Output ONLY a JSON array of extraction items — no prose before or after, no markdown code fences.
Each item follows this exact shape:
{
  "entityType": "action" | "risk" | "decision" | "milestone" | "stakeholder" | "task" | "architecture" | "history" | "businessOutcome" | "team" | "note" | "workstream" | "onboarding_step" | "integration",
  "fields": { /* entity-specific key-value pairs as strings */ },
  "confidence": 0.85,
  "sourceExcerpt": "verbatim text this was extracted from (max 200 chars)"
}
Entity type guidance:
- task: { title, status, owner, phase, description, start_date, due_date, priority, milestone_name, workstream_name }
...
IMPORTANT: Do NOT discard content just because it doesn't fit a structured type. Capture it as a "note".
Extract all names (owners, milestone names, workstream names) exactly as they appear in the document. Do not abbreviate, normalize, or infer names.`;
```

### Existing Dedup Pattern (Prefix Matching)
```typescript
// Source: lib/extraction-types.ts lines 180-192
case 'task': {
  const key = normalize(f.title);
  if (!key) return false;
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.project_id, projectId),
        ilike(tasks.title, `${key}%`),
      ),
    );
  return rows.length > 0;
}
```

### Existing Insert Pattern with Audit Trail
```typescript
// Source: app/api/ingestion/approve/route.ts lines 407-460
case 'task': {
  // Cross-entity resolution BEFORE transaction
  const milestoneId = f.milestone_name
    ? await resolveEntityRef('milestones', f.milestone_name, projectId)
    : null;
  const workstreamId = f.workstream_name
    ? await resolveEntityRef('workstreams', f.workstream_name, projectId)
    : null;

  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(tasks).values({
      project_id: projectId,
      title: f.title ?? '',
      owner: f.owner ?? null,
      phase: f.phase ?? null,
      status: f.status ?? 'todo',
      description: taskDescription,
      milestone_id: milestoneId,
      workstream_id: workstreamId,
      ...attribution, // source, source_artifact_id, ingested_at
    }).returning();
    await tx.insert(auditLog).values({
      entity_type: item.entityType,
      entity_id: inserted.id,
      action: 'create',
      actor_id: 'default',
      before_json: null,
      after_json: inserted as Record<string, unknown>,
    });
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Regex-based entity extraction | LLM-based structured extraction | Phase 17 (2026-03-29) | Precision improved from ~60% to 80%+; handles unstructured documents (emails, meeting notes) that regex couldn't parse |
| Single-pass full document extraction | Chunked extraction with progress tracking | Phase 31 (2026-04-02) | Supports large documents (100+ page PDFs); user sees progress bar instead of black box |
| Manual entity type routing | Prompt-based classification | Phase 17 (2026-03-29) | Reduced developer maintenance burden; adding new entity types requires only prompt changes, not code logic |
| Overwrite-on-conflict | User-driven conflict resolution (merge/replace/skip) | Phase 24 (2026-03-30) | Prevents accidental data loss; users control how duplicates are handled |

**Deprecated/outdated:**
- Direct Claude API calls without streaming: Phase 31 migrated to streaming API for progress tracking and lower latency
- Synchronous extraction in route handler: Moved to BullMQ background jobs to prevent API timeouts on large documents

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | vitest.config.ts (existing) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WBS-03 | WBS task extraction routes to wbsItems table via correct track + parent section | unit | `npm test tests/ingestion/wbs-extraction.test.ts` | ❌ Wave 0 |
| WBS-03 | WBS parent section fuzzy matching finds correct parent despite abbreviated names | unit | `npm test tests/ingestion/wbs-parent-matching.test.ts` | ❌ Wave 0 |
| TEAM-02 | Team Engagement extraction routes to correct section by name | unit | `npm test tests/ingestion/team-engagement-extraction.test.ts` | ❌ Wave 0 |
| TEAM-02 | Multiple uploads append to existing Team Engagement content (not overwrite) | integration | `npm test tests/ingestion/team-engagement-append.test.ts` | ❌ Wave 0 |
| ARCH-04 | Architecture node extraction routes to correct track | unit | `npm test tests/ingestion/arch-node-extraction.test.ts` | ❌ Wave 0 |
| ARCH-04 | Architecture node status updates merge with existing nodes (not duplicate) | integration | `npm test tests/ingestion/arch-node-upsert.test.ts` | ❌ Wave 0 |
| ALL | Existing entity type accuracy remains ≥80% after prompt expansion | integration | `npm test tests/ingestion/extraction-accuracy-baseline.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test tests/ingestion/ --run` (ingestion tests only, ~5-10s)
- **Per wave merge:** `npm test --run` (full suite, ~30s)
- **Phase gate:** Full suite green + manual smoke test with real PS delivery document before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/ingestion/wbs-extraction.test.ts` — covers WBS-03 (task routing to wbsItems)
- [ ] `tests/ingestion/wbs-parent-matching.test.ts` — covers WBS-03 (fuzzy parent matching)
- [ ] `tests/ingestion/team-engagement-extraction.test.ts` — covers TEAM-02 (section routing)
- [ ] `tests/ingestion/team-engagement-append.test.ts` — covers TEAM-02 (content append logic)
- [ ] `tests/ingestion/arch-node-extraction.test.ts` — covers ARCH-04 (track-based routing)
- [ ] `tests/ingestion/arch-node-upsert.test.ts` — covers ARCH-04 (merge/update existing nodes)
- [ ] `tests/ingestion/extraction-accuracy-baseline.test.ts` — covers accuracy requirement (80%+ after changes)
- [ ] Mock fixtures: `tests/fixtures/wbs-document.txt`, `tests/fixtures/team-engagement-document.txt`, `tests/fixtures/architecture-document.txt`

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `worker/jobs/document-extraction.ts` — current extraction system implementation
  - `lib/extraction-types.ts` — EntityType union + dedup logic
  - `app/api/ingestion/approve/route.ts` — entity routing and DB writes
  - `db/schema.ts` lines 771-848 — Phase 45 v6.0 tables (wbsItems, teamEngagementSections, archNodes)
  - `.planning/phases/45-database-schema-foundation/45-CONTEXT.md` — WBS structure, Team Engagement sections, Architecture tracks
- Test patterns:
  - `tests/ingestion/extraction-job.test.ts` — existing extraction test patterns
  - `vitest.config.ts` — test framework configuration

### Secondary (MEDIUM confidence)
- Project domain knowledge:
  - `.planning/REQUIREMENTS.md` — WBS-03, TEAM-02, ARCH-04 requirements
  - `.planning/STATE.md` — existing extraction accuracy baseline (80%+), v6.0 phase structure
  - `CLAUDE.md` — project-specific patterns (requireSession, CustomEvent, BullMQ patterns)

### Tertiary (LOW confidence)
- General prompt engineering: Claude training data (pre-Jan 2025) suggests structured JSON output via system prompt effective for document extraction; not verified against Anthropic official docs (requires Context7 or WebFetch)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies already in package.json and proven in production
- Architecture patterns: HIGH - existing extraction pipeline documented in code, new patterns extend established patterns
- Pitfalls: MEDIUM-HIGH - based on code analysis and common LLM extraction issues, not yet validated in production with Phase 46 changes
- Validation architecture: HIGH - Vitest already configured, test patterns established, gaps clearly identified

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — extraction patterns stable, Claude API stable)
