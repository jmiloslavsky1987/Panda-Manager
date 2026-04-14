# Phase 51: Extraction Intelligence Overhaul — Full Tab Coverage - Research

**Researched:** 2026-04-09
**Domain:** Document extraction pipeline (LLM prompt engineering + approval handler routing)
**Confidence:** HIGH

## Summary

Phase 51 closes 10 extraction gaps (A–J) in the document extraction pipeline. All gaps are well-defined in CONTEXT.md with locked implementation decisions. Research confirms the current extraction architecture, validates all entity type handlers, and identifies the exact changes needed for each gap.

**Architecture:** Two-stage pipeline: (1) `document-extraction.ts` extracts entities via Claude 4.6 using `EXTRACTION_SYSTEM` prompt → (2) `approve/route.ts` `insertItem()` function routes approved entities to correct DB tables.

**Primary finding:** All 10 gaps are implementable with the existing architecture. No new tables needed (beforeState exists, weekly_focus uses Redis cache). Status coercer pattern is established (3 existing coercers). Entity feedback tracking requires API response restructure but follows existing audit log pattern.

**Primary recommendation:** Fix gaps in three waves: Wave 1 (prompt fixes + new entity types), Wave 2 (handler fixes + graceful degradation), Wave 3 (UI feedback).

## User Constraints

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Gap A: `before_state` entity type (LOCKED)**
- Add new entity type `before_state` to extraction prompt
- Fields: `aggregation_hub_name` (string), `alert_to_ticket_problem` (string), `pain_points` (string array)
- Add insert handler in `approve/route.ts` → writes to `beforeState` table (`pain_points_json` is jsonb)
- One row per project — use upsert (update if exists, insert if not)

**Gap B: `wbs_task` orphan fallback (LOCKED)**
- Current behavior: `parentId = null` when parent section name doesn't fuzzy-match seeded WBS items
- Fix: If parent not found, insert as Level 1 item (top-level) rather than orphaning with null parent
- Do NOT auto-create missing parent sections (too risky — could duplicate seeded sections)

**Gap C: `arch_node` graceful degradation (LOCKED)**
- Current behavior: throws `Error('Architecture track not found: ...')` → whole approve request fails
- Fix: graceful skip — log warning, skip the arch_node entity, continue processing remaining entities
- Do NOT create new tracks — only write to pre-seeded tracks ("ADR Track", "AI Assistant Track")

**Gap D: `team_engagement` dead-end (LOCKED)**
- Current behavior: writes to `teamEngagementSections` table which is NOT rendered in Teams tab
- Investigation result: Teams tab sections 1-5 use `businessOutcomes`, `architectureIntegrations`, `e2eWorkflows`, `teamOnboardingStatus`, `focusAreas` — NOT `teamEngagementSections`
- Fix: Remove `team_engagement` entity type from extraction prompt entirely — it routes to a dead-end table
- The 5 Teams tab sections are already covered by: `businessOutcome`, `architecture`, `e2e_workflow`, `team`, `focus_area`

**Gap E: Extraction prompt improvements (LOCKED)**
- Add disambiguation examples for commonly confused types:
  - `task` vs `wbs_task`: task = generic action item; wbs_task = hierarchical WBS breakdown item with track/level/parent context
  - `architecture` vs `arch_node` vs `integration`: architecture = tool in BigPanda workflow (has phase/status); arch_node = capability node within ADR/Biggy track; integration = connection between systems
  - `team` vs `stakeholder`: team = team-level onboarding status row; stakeholder = named individual
- Add status coercers for ALL enum fields (not just the ones fixed in Phase 50):
  - `wbs_task` status: `not_started`|`in_progress`|`complete`|`blocked` (normalize variants)
  - `arch_node` status: normalize to valid `arch_node_status` enum values
  - `onboarding_step` status: normalize free-text to enum
- Add valid track name guidance: "ADR Track" and "AI Assistant Track" are the only valid values for `arch_node.track`
- Add `before_state` entity type description and examples

**Gap F: Per-entity write feedback (LOCKED)**
- After `POST /api/ingestion/approve` completes, return structured result:
  ```json
  {
    "written": { "action": 3, "risk": 2, "milestone": 1, ... },
    "skipped": { "arch_node": 1 },
    "errors": []
  }
  ```
- Surface this in the Review Queue UI — replace generic success toast with breakdown per entity type
- Silent failures (currently caught by outer try-catch) must be surfaced in `errors` array

**Gap G: `weekly_focus` bullets (LOCKED)**
- No extraction entity type exists for `/api/projects/[projectId]/weekly-focus`
- Add `weekly_focus` entity type to extraction prompt → extracts this-week focus bullets from documents
- Add insert handler → POST to weekly-focus API (replace existing bullets or append)
- Weekly focus is a simple `{ bullets: string[] }` structure

**Gap H: `team_pathway` verification (LOCKED)**
- Entity type `team_pathway` exists in approve route but status in extraction prompt is unclear
- Verify it is in the extraction prompt with correct field definitions
- If missing: add it. If present: ensure field names match handler expectations

**Gap I: `workstream` disambiguation (LOCKED)**
- `workstream` entity type exists but is easily confused with `task` and `wbs_task` in messy documents
- Add clear disambiguation rule to prompt: workstream = named delivery track/stream (e.g. "ADR Workstream", "Integration Workstream") with owner and percent_complete; not individual tasks
- Verify `percent_complete` coercion handles non-numeric strings (NaN fix from Phase 50 is in place)

**Gap J: `arch_node` track name guidance (LOCKED)**
- Extraction prompt must explicitly state valid track names: "ADR Track" and "AI Assistant Track"
- Claude must be told to skip arch_nodes if the track name doesn't match one of these values
- This prevents the Gap C throw scenario from ever occurring at extraction time

### Claude's Discretion
- Order of handler fixes in approve route (suggest: fix throws first, then add new handlers)
- Whether to use a single approval response accumulator or per-entity-type result tracking
- Test strategy for new entity types

### Deferred Ideas (OUT OF SCOPE)
- Multi-document batch context stitching across extractions before staging
- Re-extraction from existing artifact without re-upload
- Extraction quality score / confidence threshold filtering in UI
- WeeklyFocus auto-generation from project metrics (skill-based, not extraction)
- Time entries extraction (intentionally manual)
- Plan templates extraction (static DB seeds)
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Claude API | claude-sonnet-4-6 | Document extraction | Extended context window (200k tokens), native PDF support, structured JSON output |
| Drizzle ORM | (in use) | Database access | Type-safe schema, PostgreSQL enum support, transaction API |
| Zod | (in use) | Runtime validation | Request body validation, type coercion, error reporting |
| BullMQ | (in use) | Background extraction jobs | Browser-resilient, progress tracking, Redis-backed queue |
| Vitest | (in use) | Unit tests | Fast, mock-friendly, TypeScript-native |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsonrepair | (in use) | JSON cleanup | LLM sometimes returns malformed JSON (trailing commas, unquoted keys) |
| Redis | (in use) | Cache + queue | Weekly focus bullets cached in Redis (not DB) |

### Alternatives Considered
N/A — all decisions locked in CONTEXT.md

**Installation:**
No new dependencies required.

## Architecture Patterns

### Recommended Project Structure
```
bigpanda-app/
├── worker/jobs/
│   └── document-extraction.ts    # EXTRACTION_SYSTEM prompt (entity types, fields, examples)
├── app/api/ingestion/approve/
│   └── route.ts                  # insertItem() switch (all entity handlers)
├── app/api/projects/[projectId]/
│   ├── weekly-focus/route.ts     # GET/POST weekly focus bullets (Redis)
│   └── before-state/route.ts     # GET/PUT before state (DB upsert)
├── db/schema.ts                  # All table schemas + enums
└── components/ReviewQueue.tsx    # Approval UI (where feedback surfaces)
```

### Pattern 1: Two-Stage Extraction Pipeline
**What:** Document → Claude extraction → staged items → user approval → DB insert
**When to use:** All document uploads follow this pattern
**Flow:**
1. User uploads document → `POST /api/ingestion/upload` → BullMQ job
2. `document-extraction.ts` job: extract text → Claude API call with `EXTRACTION_SYSTEM` prompt → staged_items_json
3. User reviews staged items in ReviewQueue → clicks "Approve"
4. `POST /api/ingestion/approve` → `insertItem()` switch routes to correct table handlers
5. Success feedback to user (currently generic toast, will be per-entity breakdown per Gap F)

**Example:**
```typescript
// document-extraction.ts — extraction stage
export const EXTRACTION_SYSTEM = `You are a project data extractor...
{
  "entityType": "action" | "risk" | "wbs_task" | ...,
  "fields": { /* entity-specific key-value pairs */ },
  "confidence": 0.85,
  "sourceExcerpt": "verbatim text..."
}`;

// approve/route.ts — approval stage
async function insertItem(item: ApprovalItem, ...) {
  switch (item.entityType) {
    case 'action': // insert into actions table
    case 'wbs_task': // insert into wbsItems table
    case 'before_state': // upsert into beforeState table (NEW in Phase 51)
    // ... 18 entity types total
  }
}
```

### Pattern 2: Status Coercer Functions
**What:** Map free-text Claude output to DB enum values
**When to use:** Any entity field that maps to a pgEnum type
**Example:**
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts:94-102
type TrackStatus = 'live' | 'in_progress' | 'pilot' | 'planned';
function coerceTrackStatus(raw: string | undefined | null): TrackStatus | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  if (['live', 'production', 'active', 'enabled'].includes(v)) return 'live';
  if (['in_progress', 'in progress', 'ongoing', 'running'].includes(v)) return 'in_progress';
  if (['pilot', 'testing', 'trial'].includes(v)) return 'pilot';
  if (['planned', 'scheduled', 'upcoming', 'not started', 'not_started'].includes(v)) return 'planned';
  return null;
}
```

**Existing coercers:**
- `coerceIntegrationStatus()` — 5 states
- `coerceSeverity()` — 4 levels
- `coerceTrackStatus()` — 4 states
- `coerceOnboardingStatus()` — 4 states

**Gap E adds:**
- `coerceWbsItemStatus()` — 3 states: not_started, in_progress, complete
- `coerceArchNodeStatus()` — 3 states: planned, in_progress, live

### Pattern 3: Upsert for Single-Row-Per-Project Tables
**What:** Insert if not exists, update if exists
**When to use:** Tables with single canonical row per project (beforeState, weekly focus)
**Example:**
```typescript
// Source: bigpanda-app/app/api/projects/[projectId]/before-state/route.ts:74-113
const existing = await tx.select().from(beforeState).where(eq(beforeState.project_id, numericId)).limit(1);
if (existing.length > 0) {
  // UPDATE
  await tx.update(beforeState).set(updateData).where(eq(beforeState.project_id, numericId));
} else {
  // INSERT
  await tx.insert(beforeState).values({ project_id: numericId, ... });
}
```

### Pattern 4: Graceful Degradation with Try-Catch Skip
**What:** Catch entity-specific errors, log, skip entity, continue processing remaining entities
**When to use:** Multi-entity approval requests where one bad entity shouldn't block all
**Gap C applies this to arch_node:**
```typescript
// approve/route.ts — NEW pattern for Gap C
try {
  await insertItem(item, projectId, artifactId);
  written[item.entityType] = (written[item.entityType] ?? 0) + 1;
} catch (err) {
  if (item.entityType === 'arch_node' && err.message.includes('track not found')) {
    console.warn(`[approve] Skipping arch_node: ${err.message}`);
    skipped.arch_node = (skipped.arch_node ?? 0) + 1;
    continue; // skip this entity, process next
  }
  throw err; // re-throw other errors
}
```

### Anti-Patterns to Avoid
- **Auto-creating missing parent sections:** Gap B explicitly forbids this — could duplicate seeded WBS sections. Instead, insert as Level 1 item.
- **Throwing in multi-entity loops:** Gap C shows the problem — one bad arch_node kills entire approval batch. Use graceful skip instead.
- **Generic success toasts:** Gap F requires per-entity feedback. "3 actions, 2 risks, 1 arch_node skipped (track not found)" is more actionable than "Approved 6 items".
- **Extraction prompt without disambiguation:** Gap E, I, J show that entity type confusion is common without clear rules and examples in the prompt.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON repair from LLM | Custom regex cleanup | `jsonrepair` | Handles trailing commas, unquoted keys, single quotes, dangling properties — 50+ edge cases |
| Status enum normalization | Hardcoded if-else chains | Coercer pattern with synonym arrays | Extensible, testable, documented pattern — 3 existing coercers to follow |
| Multi-entity approval feedback | Ad-hoc counters in loops | Structured accumulator object | Type-safe, testable, consistent API response shape |
| Weekly focus storage | DB table with timestamps | Redis cache | Read-heavy workload (dashboard displays every page load), 7-day TTL sufficient |

**Key insight:** Extraction pipeline handles messy real-world documents — don't assume clean input. Use battle-tested JSON repair, coercer synonyms, and graceful error handling.

## Common Pitfalls

### Pitfall 1: Extraction prompt entity type confusion
**What goes wrong:** Claude extracts `task` when document mentions "WBS item" or `integration` when document says "architecture tool"
**Why it happens:** Overlapping concepts without clear boundaries in prompt
**How to avoid:** Add IMPORTANT disambiguation section with concrete examples (Gap E)
**Warning signs:** Staged items in wrong tables, user confusion during review, frequent "skip" actions

### Pitfall 2: Throwing errors in multi-entity approval loops
**What goes wrong:** One bad entity (e.g., arch_node with unknown track) kills entire approval batch
**Why it happens:** Current insertItem() throws on validation errors; caller doesn't catch per-entity
**How to avoid:** Try-catch around insertItem(), accumulate skipped entities, log warnings (Gap C)
**Warning signs:** Users report "Approve All" failing with cryptic errors, batch approval UX frustration

### Pitfall 3: Orphaned WBS tasks with null parent_id
**What goes wrong:** Extracted WBS tasks don't fuzzy-match seeded parent sections → parent_id = null → orphaned in UI
**Why it happens:** Documents use abbreviated section names ("Soln Design" vs "Solution Design")
**How to avoid:** Fallback to Level 1 insert rather than null parent (Gap B)
**Warning signs:** WBS tree has unexpectedly flat structure, tasks appear at wrong hierarchy level

### Pitfall 4: Dead-end entity types
**What goes wrong:** `team_engagement` entity extracts successfully but writes to table NOT rendered in any UI tab
**Why it happens:** Phase 46 created `teamEngagementSections` table but Phase 48 used different tables for Teams tab
**How to avoid:** Verify entity type → table → UI rendering chain before adding new types (Gap D)
**Warning signs:** Users say "I approved this data but don't see it anywhere"

### Pitfall 5: Status enum mismatches
**What goes wrong:** Extraction prompt says `status: "complete"` but DB insert fails with enum constraint violation because schema expects `"complete"` but got `"completed"`
**Why it happens:** Prompt free-text guidance doesn't match DB enum values exactly
**How to avoid:** Use coercer functions, add synonym arrays, document exact enum values in prompt (Gap E)
**Warning signs:** Insertion errors in logs, staged items approved but not written, silent failures

### Pitfall 6: Missing per-entity write feedback
**What goes wrong:** User approves 10 entities, gets "Success!" toast, but 3 failed silently — no visibility
**Why it happens:** Current approve route returns `{ written: 10 }` with no breakdown or error details
**How to avoid:** Structured response with written/skipped/errors per entity type (Gap F)
**Warning signs:** Users report data "disappearing" after approval, support burden from invisible failures

## Code Examples

Verified patterns from official sources:

### Status Coercer Pattern
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts:94-102
type TrackStatus = 'live' | 'in_progress' | 'pilot' | 'planned';
function coerceTrackStatus(raw: string | undefined | null): TrackStatus | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  if (['live', 'production', 'active', 'enabled'].includes(v)) return 'live';
  if (['in_progress', 'in progress', 'ongoing', 'running'].includes(v)) return 'in_progress';
  if (['pilot', 'testing', 'trial'].includes(v)) return 'pilot';
  if (['planned', 'scheduled', 'upcoming', 'not started', 'not_started'].includes(v)) return 'planned';
  return null;
}
```

### Upsert Pattern for beforeState (Gap A)
```typescript
// Source: bigpanda-app/app/api/projects/[projectId]/before-state/route.ts:74-113
const existing = await tx.select().from(beforeState).where(eq(beforeState.project_id, numericId)).limit(1);
if (existing.length > 0) {
  // UPDATE
  const updateData: Partial<typeof beforeState.$inferInsert> = {};
  if (aggregation_hub_name !== undefined) updateData.aggregation_hub_name = aggregation_hub_name;
  if (alert_to_ticket_problem !== undefined) updateData.alert_to_ticket_problem = alert_to_ticket_problem;
  if (pain_points_json !== undefined) updateData.pain_points_json = pain_points_json;
  await tx.update(beforeState).set(updateData).where(eq(beforeState.project_id, numericId)).returning();
} else {
  // INSERT
  await tx.insert(beforeState).values({
    project_id: numericId,
    aggregation_hub_name: aggregation_hub_name ?? null,
    alert_to_ticket_problem: alert_to_ticket_problem ?? null,
    pain_points_json: pain_points_json ?? [],
    source: 'manual',
  }).returning();
}
```

### WBS Parent Matching with Fallback (Gap B)
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts:711-722
const parentRows = await db.select({ id: wbsItems.id, name: wbsItems.name })
  .from(wbsItems)
  .where(and(
    eq(wbsItems.project_id, projectId),
    eq(wbsItems.track, f.track ?? 'ADR'),
    ilike(wbsItems.name, `%${f.parent_section_name ?? ''}%`),
  ));

const parentId = parentRows.length > 0 ? parentRows[0].id : null;

// Gap B fix (NEW): If parent not found, insert as Level 1 (not orphan with null parent)
await tx.insert(wbsItems).values({
  project_id: projectId,
  parent_id: parentId, // null if no match → becomes Level 1 in UI
  level: parentId ? (parseInt(f.level, 10) || 2) : 1, // Force Level 1 if orphaned
  // ... other fields
});
```

### Graceful Degradation for arch_node (Gap C)
```typescript
// NEW pattern for Gap C — approve/route.ts outer loop
const written: Record<string, number> = {};
const skipped: Record<string, number> = {};
const errors: Array<{ entityType: string; error: string }> = {};

for (const item of approvedItems) {
  if (!item.approved) continue;

  try {
    await insertItem(item, projectId, artifactId);
    written[item.entityType] = (written[item.entityType] ?? 0) + 1;
  } catch (err) {
    // Gap C: gracefully skip arch_node if track not found
    if (item.entityType === 'arch_node' && err.message.includes('track not found')) {
      console.warn(`[approve] Skipping arch_node: ${err.message}`);
      skipped.arch_node = (skipped.arch_node ?? 0) + 1;
      continue;
    }
    // All other errors: log and accumulate (don't throw)
    console.error(`[approve] Failed to insert ${item.entityType}:`, err);
    errors.push({ entityType: item.entityType, error: err.message });
  }
}

return NextResponse.json({ written, skipped, errors });
```

### Weekly Focus Handler (Gap G)
```typescript
// NEW handler for Gap G — approve/route.ts insertItem() switch
case 'weekly_focus': {
  // Parse bullets from comma-separated string or JSON array
  let bullets: string[] = [];
  try {
    bullets = JSON.parse(f.bullets);
  } catch {
    bullets = (f.bullets ?? '').split(',').map(s => s.trim()).filter(Boolean);
  }

  // Write to Redis cache (not DB)
  const redis = createApiRedisConnection();
  await redis.connect();
  await redis.set(`weekly_focus:${projectId}`, JSON.stringify(bullets), 'EX', 7 * 24 * 60 * 60); // 7-day TTL
  await redis.quit();

  // No audit log for Redis cache writes
  return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic "Approved 10 items" toast | Per-entity feedback (Gap F) | Phase 51 | Users see "3 actions, 2 risks written; 1 arch_node skipped (track not found)" |
| Throw on validation error | Graceful skip pattern (Gap C) | Phase 51 | One bad entity doesn't kill entire batch approval |
| team_engagement writes to unused table | Remove entity type (Gap D) | Phase 51 | Eliminates dead-end extraction path |
| Orphaned WBS tasks with null parent | Level 1 fallback (Gap B) | Phase 51 | WBS tree structure preserved even with fuzzy match failures |
| No before_state extraction | before_state entity type (Gap A) | Phase 51 | Architecture tab Before State fully extractable |
| No weekly_focus extraction | weekly_focus entity type (Gap G) | Phase 51 | Overview tab Weekly Focus fully extractable |

**Deprecated/outdated:**
- `team_engagement` entity type: Removed in Phase 51 (Gap D) — writes to dead-end table not rendered in any UI tab

## Open Questions

None. All gaps have locked implementation decisions in CONTEXT.md.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (in use) |
| Config file | vitest.config.ts (standard config) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
No formal requirement IDs defined for this phase. Scope is fully captured in CONTEXT.md Gaps A–J.

Suggested test strategy:

| Gap | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| Gap A | before_state entity writes to beforeState table | unit | `npm test app/api/__tests__/ingestion-approve.test.ts` | ✅ (extend existing) |
| Gap B | wbs_task with unfound parent inserts as Level 1 | unit | `npm test app/api/__tests__/ingestion-approve.test.ts` | ✅ (extend existing) |
| Gap C | arch_node with unknown track skips gracefully | unit | `npm test app/api/__tests__/ingestion-approve.test.ts` | ✅ (extend existing) |
| Gap D | team_engagement removed from prompt | code inspection | Manual verification of EXTRACTION_SYSTEM string | N/A |
| Gap E | Status coercers normalize variants | unit | `npm test app/api/__tests__/status-coercers.test.ts` | ❌ Wave 0 |
| Gap F | Approve API returns structured feedback | integration | `npm test app/api/__tests__/ingestion-approve.test.ts` | ✅ (extend existing) |
| Gap G | weekly_focus writes to Redis cache | unit | `npm test app/api/__tests__/weekly-focus.test.ts` | ❌ Wave 0 |
| Gap H | team_pathway in prompt with correct fields | code inspection | Manual verification of EXTRACTION_SYSTEM string | N/A |
| Gap I | workstream disambiguation in prompt | code inspection | Manual verification of EXTRACTION_SYSTEM string | N/A |
| Gap J | arch_node track name guidance in prompt | code inspection | Manual verification of EXTRACTION_SYSTEM string | N/A |

### Sampling Rate
- **Per task commit:** `npm test` (full suite — fast with Vitest)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `app/api/__tests__/status-coercers.test.ts` — covers Gap E (wbs/arch_node status coercers)
- [ ] `app/api/__tests__/weekly-focus.test.ts` — covers Gap G (Redis cache writes)

**Note:** Existing test file `app/api/__tests__/ingestion-approve.test.ts` already has Gap 1-4 tests from Phase 50. Extend this file for Gaps A, B, C, F.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection (2026-04-09):**
  - `bigpanda-app/worker/jobs/document-extraction.ts:24-64` — EXTRACTION_SYSTEM prompt (entity types, fields, examples)
  - `bigpanda-app/app/api/ingestion/approve/route.ts` — insertItem() switch statement (all 18 entity handlers)
  - `bigpanda-app/db/schema.ts:609-617` — beforeState table schema
  - `bigpanda-app/db/schema.ts:772-783` — wbsItems table schema
  - `bigpanda-app/db/schema.ts:826-838` — archNodes table schema
  - `bigpanda-app/db/schema.ts:799-810` — teamEngagementSections table schema
  - `bigpanda-app/db/schema.ts:80-81` — Status enum definitions
  - `bigpanda-app/app/api/projects/[projectId]/weekly-focus/route.ts` — Weekly focus API shape (Redis)
  - `bigpanda-app/app/api/projects/[projectId]/before-state/route.ts` — Before state API shape (upsert)
  - `bigpanda-app/app/api/ingestion/approve/route.ts:74-111` — Existing status coercer functions
  - `bigpanda-app/components/ReviewQueue.tsx:61-106` — Approval UI flow
  - `bigpanda-app/app/api/__tests__/ingestion-approve.test.ts` — Existing test patterns (Gaps 1-4)
  - `.planning/phases/51-extraction-intelligence-overhaul-full-tab-coverage/51-CONTEXT.md` — All gap definitions and locked decisions

### Secondary (MEDIUM confidence)
None required — all findings from direct codebase inspection.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all decisions locked in CONTEXT.md, existing architecture well-documented
- Architecture: HIGH — two-stage pipeline pattern verified in codebase, all handlers exist
- Pitfalls: HIGH — derived from Gap analysis and existing Phase 50 gap fixes
- Code examples: HIGH — extracted verbatim from current codebase files
- Test strategy: HIGH — Vitest confirmed in package.json, existing test files provide pattern

**Research date:** 2026-04-09
**Valid until:** 30 days (stable extraction architecture)

---

## Current State Findings

### Extraction Prompt Entity Types (document-extraction.ts:24-64)
Currently defined: 18 entity types
- Core: action, risk, decision, milestone, stakeholder, task, note, history
- Architecture: architecture, arch_node, integration
- WBS: wbs_task
- Teams: team, team_engagement, team_pathway, onboarding_step
- Focus: businessOutcome, focus_area, e2e_workflow, workstream

**Gap H Finding:** `team_pathway` is NOT in EXTRACTION_SYSTEM prompt (line 28). EntityType enum includes it (line 80) and handler exists (line 605), but extraction prompt does NOT describe it. Must add.

**Gap D Finding:** `team_engagement` IS in prompt (line 28, lines 48-49) but should be REMOVED per CONTEXT.md.

### Approval Route Handlers (approve/route.ts)
All 18 handlers confirmed in insertItem() switch:
- ✅ action, risk, decision, milestone, stakeholder, task, note, history
- ✅ architecture, arch_node, integration
- ✅ wbs_task (line 707)
- ✅ team (writes to teamOnboardingStatus per Gap 1 fix)
- ✅ team_engagement (line 749, writes to teamEngagementSections — dead-end per Gap D)
- ✅ team_pathway (line 605)
- ✅ onboarding_step (line 660)
- ✅ businessOutcome, focus_area (line 841), e2e_workflow (line 865), workstream

**Missing handlers:** before_state, weekly_focus (Gap A, Gap G)

### Status Enum Values (schema.ts)
- `wbsItemStatusEnum` (line 80): not_started, in_progress, complete
- `archNodeStatusEnum` (line 81): planned, in_progress, live
- `onboardingStepStatusEnum` (line 399): not-started, in-progress, complete, blocked

**Note:** Hyphenated vs underscored — onboardingStep uses hyphens, wbsItem uses underscores. Coercers must handle both.

### Existing Status Coercers (approve/route.ts:74-111)
- `coerceIntegrationStatus()` — 5 states
- `coerceSeverity()` — 4 levels
- `coerceTrackStatus()` — 4 states (live, in_progress, pilot, planned)
- `coerceOnboardingStatus()` — 4 states (not-started, in-progress, complete, blocked)

**Gap E requires:** `coerceWbsItemStatus()`, `coerceArchNodeStatus()`

### Review Queue Feedback (ReviewQueue.tsx:61-106)
Current approval flow:
1. User clicks "Approve" → `POST /api/ingestion/approve`
2. Response shape: `{ written: number }` (single count, no breakdown)
3. Success: generic toast "Approved" (no per-entity feedback)
4. Failure: silent catch block (lines 68-70, 100-102)

**Gap F requires:** Structured response `{ written: { action: 3, ... }, skipped: { arch_node: 1 }, errors: [] }` + UI display

### DB Schema Validation

**beforeState table (schema.ts:609-617):**
```typescript
{
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  aggregation_hub_name: text('aggregation_hub_name'),
  alert_to_ticket_problem: text('alert_to_ticket_problem'),
  pain_points_json: jsonb('pain_points_json').default([]).notNull(),
  source: text('source').notNull().default('manual'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}
```
✅ Matches Gap A field requirements. Upsert pattern confirmed in before-state/route.ts:74-113.

**Weekly focus:** No DB table. Uses Redis cache (weekly-focus/route.ts:26, key format: `weekly_focus:${projectId}`). ✅ Matches Gap G requirement.

**teamEngagementSections table (schema.ts:799-810):**
```typescript
{
  id, project_id, name, content, display_order, source_trace, created_at, updated_at
}
```
✅ Exists. Handler writes here (approve/route.ts:749). **But:** CONTEXT.md confirms NOT rendered in Teams tab → Gap D removal is correct.

## Research Complete

All 10 gaps (A–J) researched and validated. Implementation is straightforward with existing architecture. No blockers identified.

**Key findings:**
1. Gap H confirmed: team_pathway handler exists but NOT in extraction prompt — must add
2. Gap D confirmed: team_engagement IS in prompt and handler, writes to dead-end table — must remove
3. All other gaps are prompt additions, handler additions, or graceful error handling — low risk
4. Test infrastructure (Vitest) confirmed, existing test patterns reusable
5. beforeState table and weekly-focus Redis cache both exist and functional

Ready for planning.
