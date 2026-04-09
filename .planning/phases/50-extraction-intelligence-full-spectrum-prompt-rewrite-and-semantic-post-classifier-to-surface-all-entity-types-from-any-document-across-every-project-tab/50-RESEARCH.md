# Phase 50: Extraction Intelligence - Research

**Researched:** 2026-04-08
**Domain:** Entity extraction pipeline gap closure — prompt-to-database routing
**Confidence:** HIGH

## Summary

Phase 50 closes 6 specific entity extraction pipeline gaps introduced during phases 45-48.1. The extraction pipeline has three stages: (1) AI extraction with prompt guidance in `worker/jobs/document-extraction.ts`, (2) deduplication checks in `lib/extraction-types.ts`, and (3) user approval commit to database in `app/api/ingestion/approve/route.ts`. The gaps are misalignments between these three stages — entity types exist in one stage but not another, or fields extracted in the prompt are not written to the database.

This is a pure gap-closure phase — no new entity types, no new UI, no broad refactoring. Fix 6 specific routing bugs using established patterns from 19 existing entity handlers.

**Primary recommendation:** Apply established transaction + audit log + attribution patterns from existing entity handlers. All fixes follow existing code structure; no new patterns needed.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Fix `insertItem` case `'team'` in `approve/route.ts`: write to `teamOnboardingStatus`, not `focusAreas`
- Fields to write: `team_name`, `track`, `ingest_status`, `correlation_status`, `incident_intelligence_status`, `sn_automation_status`, `biggy_ai_status`
- `teamOnboardingStatus` has only `source` attribution (no `source_artifact_id` / `ingested_at`) — write `source: 'ingestion'` only
- Also fix `findConflict` case `'team'`: currently queries `focusAreas` (wrong) → query `teamOnboardingStatus` by `team_name`
- The extraction prompt for `team` in `document-extraction.ts` likely lacks the 5 status fields — update the prompt to extract them; coerce values through the existing `integrationTrackStatusEnum` coercer pattern
- Fix `insertItem` case `'architecture'`: add `integration_group: f.integration_group ?? null` to the `architectureIntegrations` insert
- Add `case 'focus_area'` to `insertItem` in `approve/route.ts`
- Target table: `focusAreas`
- Fields: `title`, `tracks`, `why_it_matters`, `current_status`, `next_step`, `bp_owner`, `customer_owner`
- Attribution: full (`source`, `source_artifact_id`, `ingested_at`) — `focusAreas` schema has all three
- Add to Zod enum in `ApprovalItemSchema` in `approve/route.ts`
- Add to `EntityType` union in `lib/extraction-types.ts` (it's already in `worker/jobs/document-extraction.ts`)
- Add `case 'e2e_workflow'` to `insertItem` in `approve/route.ts`
- Two-table write: insert parent row to `e2eWorkflows`, then insert child rows to `workflowSteps`
- Fields from extraction: `team_name`, `workflow_name`, `steps` (JSON string)
- Parse `fields.steps` with `JSON.parse` — expect array of `{ label, track, status, position }`; fall back to empty array if parse fails or field missing
- `e2eWorkflows` has full attribution (`source`, `source_artifact_id`, `ingested_at`)
- `workflowSteps` has no attribution columns — insert with `workflow_id`, `label`, `track`, `status`, `position` only
- Wrap parent insert + all step inserts in a single `db.transaction`
- Add to Zod enum in `approve/route.ts` and to `EntityType` union in `lib/extraction-types.ts`
- In `lib/extraction-types.ts`, add two cases to `isAlreadyIngested`:
  - `case 'focus_area'`: check `focusAreas.title` with `ilike` — same normalize + ilike pattern as other entity types
  - `case 'e2e_workflow'`: check `e2eWorkflows` by `workflow_name + team_name` (both must match for a duplicate)
- Both currently fall through to `default: return false` — every document re-surfaces them as net-new
- Code verification only: trace each entity type through `document-extraction.ts` prompt → `approve/route.ts` commit handler → DB schema to confirm fields align
- If a field is in the prompt but missing in the insert, add it (same pattern as Gap 2 fix)
- No speculative rewrites — only fix confirmed mismatches

### Claude's Discretion
- Whether to update the `team` extraction prompt in `document-extraction.ts` to add the 5 status field definitions, or rely on the existing track/status pattern (the planner should verify the current prompt vs. teamOnboardingStatus schema)
- Exact coercion logic for the 5 team status fields (same `integrationTrackStatusEnum` coercer already exists — reuse it)
- Whether gap #6 review surfaces additional field mismatches beyond what's already known

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

## Standard Stack

### Core Dependencies (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | Type-safe PostgreSQL ORM | Project standard for all DB access; established patterns across 42 phases |
| zod | 4.3.6 | Runtime schema validation | Type-safe API payload validation + transformation |
| next | 16.2.0 | API Route handlers | Server-side API endpoints with requireSession() auth pattern |
| vitest | 4.1.1 | Test framework | Existing test infrastructure (370+ passing tests, 6 deferred failures) |

### Supporting Tools
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @anthropic-ai/sdk | 0.80.0 | Claude API client | Already used in document-extraction.ts for AI prompts |
| jsonrepair | 3.13.3 | Repair malformed JSON | Already used in extraction worker for Claude JSON output cleanup |
| postgres | 3.4.8 | PostgreSQL driver | Underlying driver for Drizzle ORM |

### Installation
No new dependencies required — all libraries already in package.json.

## Architecture Patterns

### Recommended Project Structure
```
app/api/ingestion/approve/
├── route.ts                # POST handler: approve extracted items → insert to DB
lib/
├── extraction-types.ts     # Shared types + isAlreadyIngested dedup logic
worker/jobs/
├── document-extraction.ts  # BullMQ job: extract entities from uploaded documents
db/
├── schema.ts               # Drizzle table definitions + enums
```

### Pattern 1: Three-Stage Extraction Pipeline
**What:** Document ingestion flows through three independent stages with different concerns

**Stage 1: AI Extraction (worker/jobs/document-extraction.ts)**
- BullMQ background job
- Calls Claude API with EXTRACTION_SYSTEM prompt (330 lines)
- Prompt defines entity types, field schemas, and disambiguation rules
- Returns JSON array of ExtractionItem: `{ entityType, fields, confidence, sourceExcerpt }`
- Local EntityType union includes all entity types (including focus_area, e2e_workflow)

**Stage 2: Deduplication (lib/extraction-types.ts)**
- `isAlreadyIngested()` function checks if entity already exists in DB
- Switch statement with case per entity type
- Uses `ilike()` prefix matching on normalized key field (first 120 chars lowercase)
- Returns true = filter out, false = surface to user
- **Gap:** Missing cases for `focus_area` and `e2e_workflow` (fall through to `default: return false`)

**Stage 3: User Approval & DB Commit (app/api/ingestion/approve/route.ts)**
- POST endpoint receives approved items from frontend
- Zod validation: `ApprovalItemSchema` with enum of valid entity types
- `insertItem()` switch with case per entity type
- Each case: transaction, insert, audit log, return unresolved counts
- **Gap:** Missing cases for `focus_area` and `e2e_workflow`
- **Gap:** `team` case writes to wrong table
- **Gap:** `architecture` case missing `integration_group` field

**Key insight:** The three stages are independent — prompt can define entity types that have no dedup logic or no commit handler. This phase aligns all three.

**Example:**
```typescript
// Stage 1: Prompt definition (document-extraction.ts line 28)
"focus_area" | "e2e_workflow"  // ✓ Already in local EntityType union

// Stage 2: Dedup (lib/extraction-types.ts line 34)
export type EntityType = ... | 'wbs_task' | 'team_engagement' | 'arch_node';
// ❌ Missing 'focus_area' and 'e2e_workflow'

// Stage 3: Commit (approve/route.ts line 35)
z.enum(['action', 'risk', ..., 'arch_node'])
// ❌ Missing 'focus_area' and 'e2e_workflow'
```

### Pattern 2: Transaction + Audit Log Wrapper
**What:** Every DB insert wrapped in transaction with audit log entry

**When to use:** All entity inserts (already established in 19 entity handlers)

**Example:**
```typescript
// Source: app/api/ingestion/approve/route.ts line 289
case 'action':
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(actions).values({
      project_id: projectId,
      external_id: syntheticExternalId('action', artifactId),
      description: f.description ?? '',
      ...attribution,
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
  return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
```

**Pattern components:**
1. `db.transaction()` wraps all writes
2. Primary table insert with `.returning()` to get inserted.id
3. Audit log insert references inserted.id
4. Return object with unresolved counts (milestone/workstream FK resolution tracking)

### Pattern 3: Attribution by Table Schema
**What:** Different tables have different attribution columns — check schema before writing

**Attribution levels:**
1. **Full attribution** (source + source_artifact_id + ingested_at): `actions`, `risks`, `milestones`, `focusAreas`, `e2eWorkflows`, `architectureIntegrations`
2. **Source-only** (source only): `workstreams`, `teamOnboardingStatus`
3. **No attribution**: `onboardingSteps`, `integrations`, `workflowSteps`

**Example:**
```typescript
// Full attribution (line 281)
const attribution = {
  source: 'ingestion' as const,
  source_artifact_id: artifactId,
  ingested_at: new Date(),
};

// Source-only (line 594)
await tx.insert(workstreams).values({
  ...fields,
  source: 'ingestion',
});

// No attribution (line 611)
await tx.insert(onboardingSteps).values({
  ...fields, // no source columns at all
});
```

**Critical for Gap 1 fix:** `teamOnboardingStatus` has source-only attribution (line 629 of schema.ts).

### Pattern 4: Two-Table Writes with Cascade
**What:** Parent-child relationships require parent insert first, then children with FK

**When to use:** Entity types with one-to-many relationships (team_pathway → route_steps, e2e_workflow → workflow_steps)

**Example:**
```typescript
// Source: approve/route.ts line 555 (team_pathway handler)
case 'team_pathway': {
  const stepLabels = rawSteps.split(/ → |, /).map(s => s.trim()).filter(Boolean);
  const routeSteps = stepLabels.map(label => ({ label }));
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(teamPathways).values({
      project_id: projectId,
      team_name: f.team_name ?? '',
      route_steps: routeSteps as unknown as typeof teamPathways.$inferInsert['route_steps'],
      status: (f.status as 'live' | 'in_progress' | 'pilot' | 'planned' | undefined) ?? 'planned',
      ...attribution,
    }).returning();
    // No child table insert — route_steps stored as JSONB in parent row
    await tx.insert(auditLog).values({...});
  });
}
```

**For e2e_workflow (Gap 4):** Must insert parent to `e2eWorkflows`, get returned ID, then insert multiple rows to `workflowSteps` with `workflow_id: inserted.id`. Schema shows cascade delete (line 566: `onDelete: 'cascade'`).

### Pattern 5: Enum Coercion for LLM Output
**What:** LLM returns free-text values; map to valid DB enum values

**Example:**
```typescript
// Source: approve/route.ts line 70
type IntegrationStatus = 'not-connected' | 'configured' | 'validated' | 'production' | 'blocked';
function coerceIntegrationStatus(raw: string | undefined | null): IntegrationStatus {
  const v = (raw ?? '').toLowerCase().trim();
  if (['production', 'prod', 'live', 'active', 'enabled', 'running'].includes(v)) return 'production';
  if (['configured', 'setup', 'installed', 'connected'].includes(v)) return 'configured';
  if (['validated', 'tested', 'verified', 'working'].includes(v)) return 'validated';
  if (['blocked', 'failed', 'error', 'broken', 'disabled'].includes(v)) return 'blocked';
  return 'not-connected';
}
```

**For Gap 1:** Need similar coercer for `integrationTrackStatusEnum` values: `'live' | 'in_progress' | 'pilot' | 'planned'` (schema.ts line 74-76). The prompt extraction for `team` entity must be enhanced to extract all 5 status fields; then each status field must be coerced through this pattern.

### Pattern 6: Dedup with Normalize + ilike
**What:** Case-insensitive prefix matching on first 120 chars of key field

**Example:**
```typescript
// Source: extraction-types.ts line 79
case 'action': {
  const key = normalize(f.description);  // lowercase + trim + slice(0, 120)
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
```

**For Gap 5:** Apply same pattern to `focus_area` (match on `focusAreas.title`) and `e2e_workflow` (match on `e2eWorkflows.workflow_name + team_name` composite).

### Anti-Patterns to Avoid
- **Don't add entity types to only one stage** — must be in all three: prompt EntityType, extraction-types.ts EntityType, approve route Zod enum
- **Don't skip audit log** — every insert must log to auditLog table (established in Phase 2)
- **Don't guess attribution schema** — read the table definition in schema.ts; tables vary
- **Don't write to wrong table** — `team` entity currently writes to `focusAreas` (Gap 1); should write to `teamOnboardingStatus`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Enum value mapping from LLM | String comparison switch | Established coercer pattern | Already proven with IntegrationStatus, RiskSeverity; handles typos, synonyms, mixed case |
| Deduplication logic | Custom fuzzy matching | normalize() + ilike() pattern | Established in Phase 17 (ING-12); handles case sensitivity, whitespace, partial matches |
| Transaction error handling | Manual try/catch | db.transaction() | Drizzle ORM handles rollback automatically; already used in all 19 entity handlers |
| Audit trail | Custom logging | auditLog table insert | Established schema with entity_type + entity_id + before/after JSON |

**Key insight:** All 6 gaps can be closed with existing patterns. No new infrastructure needed.

## Common Pitfalls

### Pitfall 1: Entity Type Union Drift
**What goes wrong:** Entity types defined in worker prompt but missing from lib/extraction-types.ts or approve route Zod enum. Items extract successfully but dedup returns false (always surfaces as new) or approval fails Zod validation.

**Why it happens:** Three independent type definitions in three files. No type-level enforcement of alignment.

**How to avoid:** When adding entity type, update all three in same commit:
1. `worker/jobs/document-extraction.ts` — EntityType union (line 68-88) + prompt guidance (line 28)
2. `lib/extraction-types.ts` — EntityType union (line 34-52) + isAlreadyIngested case
3. `app/api/ingestion/approve/route.ts` — Zod enum (line 35-40) + insertItem case + findConflict case

**Warning signs:** Zod validation error "Invalid enum value" at approval time; items always surface as new even after approval.

### Pitfall 2: Wrong Table for Entity Type
**What goes wrong:** `team` entity currently writes to `focusAreas` table (line 495) instead of `teamOnboardingStatus`. `findConflict` also queries wrong table (line 212).

**Why it happens:** Historical: `team` entity was initially mapped to focus_areas before teamOnboardingStatus table was added in Phase 45 schema expansion.

**How to avoid:** Read CONTEXT.md locked decisions carefully. When entity name doesn't match table name, document the mapping explicitly.

**Warning signs:** Data appears in wrong UI tab; foreign key references fail; schema constraints violated.

### Pitfall 3: Incomplete Field Mapping
**What goes wrong:** Prompt defines fields, DB schema has columns, but insertItem handler omits fields. Example: `integration_group` defined in architecture prompt (line 40 of extraction prompt) and in schema (line 598), but missing from insert (line 514-522).

**Why it happens:** Multi-phase evolution: prompt updated in Phase 46, schema updated in Phase 48.1, but approve handler not updated.

**How to avoid:** Gap 6 review pattern — trace each entity type through three stages: prompt field definitions → schema columns → insertItem field writes. Match field names exactly.

**Warning signs:** Data loss on approval; schema columns remain NULL despite extraction prompt asking for values.

### Pitfall 4: Attribution Schema Mismatch
**What goes wrong:** Apply full attribution (`source`, `source_artifact_id`, `ingested_at`) to table that only has `source` column. Insert fails with "column does not exist".

**Why it happens:** Tables added at different phases have different attribution schemas based on phase requirements.

**How to avoid:** Always check schema.ts before writing attribution. Pattern 3 documents three attribution levels.

**Warning signs:** Runtime error "column 'source_artifact_id' does not exist"; transaction rollback.

### Pitfall 5: JSON Parse Without Fallback
**What goes wrong:** `e2e_workflow` entity has `steps` field as JSON string. If parse fails or field is malformed, handler throws error and entire transaction rolls back.

**Why it happens:** LLM may return invalid JSON, stringified JSON, or null.

**How to avoid:** Always wrap JSON.parse in try/catch with fallback to empty array or default value.

**Example:**
```typescript
// Good pattern
let stepsArray: Array<{label: string; track: string; status: string; position: number}> = [];
try {
  if (f.steps) {
    const parsed = JSON.parse(f.steps);
    stepsArray = Array.isArray(parsed) ? parsed : [];
  }
} catch {
  stepsArray = []; // fallback to empty array
}
```

**Warning signs:** Intermittent approval failures; transaction rollback on valid-looking data.

### Pitfall 6: Two-Table Write Without Transaction
**What goes wrong:** Insert parent row to `e2eWorkflows`, then insert child rows to `workflowSteps`. If child insert fails, parent row orphaned in DB.

**Why it happens:** Forgetting to wrap multi-table writes in single transaction.

**How to avoid:** Always use `db.transaction()` wrapper for parent-child inserts. Pattern 4 shows team_pathway example.

**Warning signs:** Orphaned parent rows with no child records; inconsistent UI rendering.

## Code Examples

Verified patterns from existing codebase:

### Transaction + Audit Log Pattern
```typescript
// Source: app/api/ingestion/approve/route.ts line 289-310
case 'action':
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(actions).values({
      project_id: projectId,
      external_id: syntheticExternalId('action', artifactId),
      description: f.description ?? '',
      owner: f.owner ?? null,
      due: f.due_date ?? null,
      status: 'open',
      notes: f.notes ?? null,
      type: f.type ?? 'action',
      ...attribution,
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
  return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
```

### Enum Coercion Pattern
```typescript
// Source: app/api/ingestion/approve/route.ts line 70-77
type IntegrationStatus = 'not-connected' | 'configured' | 'validated' | 'production' | 'blocked';
function coerceIntegrationStatus(raw: string | undefined | null): IntegrationStatus {
  const v = (raw ?? '').toLowerCase().trim();
  if (['production', 'prod', 'live', 'active', 'enabled', 'running'].includes(v)) return 'production';
  if (['configured', 'setup', 'installed', 'connected'].includes(v)) return 'configured';
  if (['validated', 'tested', 'verified', 'working'].includes(v)) return 'validated';
  if (['blocked', 'failed', 'error', 'broken', 'disabled'].includes(v)) return 'blocked';
  return 'not-connected';
}

// Apply to field value
status: coerceIntegrationStatus(f.connection_status),
```

### Dedup with Normalize + ilike
```typescript
// Source: lib/extraction-types.ts line 79-96
case 'action': {
  const key = normalize(f.description);
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

function normalize(value: string | undefined | null): string {
  if (!value) return '';
  return value.toLowerCase().trim().slice(0, 120);
}
```

### Two-Table Write with Parent-Child FK
```typescript
// Source: app/api/ingestion/approve/route.ts line 555-581 (team_pathway)
case 'team_pathway': {
  const rawSteps = f.route_description ?? '';
  const stepLabels = rawSteps.split(/ → |, /).map(s => s.trim()).filter(Boolean);
  const routeSteps = stepLabels.map(label => ({ label }));
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(teamPathways).values({
      project_id: projectId,
      team_name: f.team_name ?? '',
      route_steps: routeSteps as unknown as typeof teamPathways.$inferInsert['route_steps'],
      status: (f.status as 'live' | 'in_progress' | 'pilot' | 'planned' | undefined) ?? 'planned',
      notes: f.notes ?? null,
      source: 'ingestion',
      source_artifact_id: artifactId,
      ingested_at: new Date(),
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
  return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
}
```

### Composite Key Dedup (for e2e_workflow)
```typescript
// Pattern: Check multiple fields for duplicate
// For e2e_workflow: workflow_name + team_name must both match
const workflowKey = normalize(f.workflow_name);
const teamKey = normalize(f.team_name);
if (!workflowKey || !teamKey) return false;
const rows = await db
  .select({ id: e2eWorkflows.id })
  .from(e2eWorkflows)
  .where(
    and(
      eq(e2eWorkflows.project_id, projectId),
      ilike(e2eWorkflows.workflow_name, `${workflowKey}%`),
      ilike(e2eWorkflows.team_name, `${teamKey}%`),
    ),
  );
return rows.length > 0;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-file extraction (route.ts) | Three-stage pipeline (worker + lib + route) | Phase 31 | Background processing + dedup + user approval |
| Hardcoded entity routing | Dynamic prompt + switch handlers | Phase 17 | New entity types without UI changes |
| Team → focusAreas table | Team → teamOnboardingStatus table | Phase 45 schema expansion | Breaking change (Gap 1) |
| Architecture without integration_group | Architecture with integration_group | Phase 48.1 | Richer phase-aware grouping |
| 17 entity types | 19 entity types (+ focus_area, e2e_workflow) | Phase 48.1 | Full team engagement coverage |

**Deprecated/outdated:**
- `team` entity writing to `focusAreas`: replaced by `teamOnboardingStatus` table in Phase 45 — commit handler must be updated (Gap 1)
- Prompt-only entity types (`focus_area`, `e2e_workflow`): defined in worker EntityType union but missing from lib and approve route — must be added to all three stages (Gaps 3-5)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
Phase 50 has no formal requirement IDs (Requirements column is "TBD" in REQUIREMENTS.md). Testing strategy is verification-based rather than TDD.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| Gap 1 | `team` entity writes to teamOnboardingStatus with 5 status fields | integration | `npm test -- app/api/__tests__/ingestion-approve.test.ts -t "team entity"` | ❌ Wave 0 |
| Gap 2 | `architecture` entity includes integration_group field | integration | `npm test -- app/api/__tests__/ingestion-approve.test.ts -t "architecture entity"` | ❌ Wave 0 |
| Gap 3 | `focus_area` entity commits to focusAreas table | integration | `npm test -- app/api/__tests__/ingestion-approve.test.ts -t "focus_area entity"` | ❌ Wave 0 |
| Gap 4 | `e2e_workflow` entity commits to e2eWorkflows + workflowSteps tables | integration | `npm test -- app/api/__tests__/ingestion-approve.test.ts -t "e2e_workflow entity"` | ❌ Wave 0 |
| Gap 5a | `focus_area` dedup checks focusAreas.title | unit | `npm test -- lib/__tests__/extraction-types.test.ts -t "focus_area dedup"` | ❌ Wave 0 |
| Gap 5b | `e2e_workflow` dedup checks workflow_name + team_name | unit | `npm test -- lib/__tests__/extraction-types.test.ts -t "e2e_workflow dedup"` | ❌ Wave 0 |
| Gap 6 | All entity types have complete field mappings | manual-only | Code review: prompt fields → schema columns → insertItem writes | N/A |

### Sampling Rate
- **Per task commit:** `npm test -- --run` (full suite, <30s)
- **Per wave merge:** `npm test` (watch mode for development)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `app/api/__tests__/ingestion-approve.test.ts` — covers Gaps 1-4 (entity commit handlers)
- [ ] `lib/__tests__/extraction-types.test.ts` — covers Gap 5 (dedup logic)
- [ ] Framework already installed (vitest.config.ts exists with 370+ passing tests)

## Sources

### Primary (HIGH confidence)
- `bigpanda-app/app/api/ingestion/approve/route.ts` (lines 1-1150) — 19 existing entity handlers, transaction patterns, enum coercers
- `bigpanda-app/lib/extraction-types.ts` (lines 1-344) — EntityType union, isAlreadyIngested dedup logic
- `bigpanda-app/worker/jobs/document-extraction.ts` (lines 1-350) — EXTRACTION_SYSTEM prompt, local EntityType union
- `bigpanda-app/db/schema.ts` (lines 552-631) — Table definitions for e2eWorkflows, workflowSteps, focusAreas, teamOnboardingStatus, architectureIntegrations
- `.planning/phases/50-.../50-CONTEXT.md` — User decisions from /gsd:discuss-phase (6 locked gaps)
- `.planning/STATE.md` — Phase 48.1 context on integration_group rename, E2E workflow map/reduce pattern
- `bigpanda-app/package.json` — Dependency versions: drizzle-orm 0.45.1, zod 4.3.6, vitest 4.1.1, next 16.2.0

### Secondary (MEDIUM confidence)
- Drizzle ORM documentation (inferred from existing transaction patterns, .returning(), onConflictDoUpdate usage)
- Zod enum transformation patterns (inferred from existing ApprovalItemSchema in approve/route.ts)

### Tertiary (LOW confidence)
None — all research findings verified against existing codebase implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed; no new libraries required
- Architecture: HIGH — 19 existing entity handlers provide clear patterns for 6 gaps
- Pitfalls: HIGH — gaps identified in CONTEXT.md with specific file/line references; verified against codebase
- Code examples: HIGH — all examples copied directly from production code with file:line citations

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — stable domain with no external API dependencies)
