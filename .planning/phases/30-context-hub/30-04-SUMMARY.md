---
phase: 30-context-hub
plan: "04"
subsystem: context-hub
tags: [completeness-analysis, claude-structured-outputs, quality-assessment]
one_liner: "Completeness analysis API with Claude structured outputs — serializes 11 workspace tabs, filters template records, returns specific record-level gaps per tab"

dependency_graph:
  requires:
    - 30-02 (tab-template-registry for completeness requirements)
    - 30-03 (Context tab UI infrastructure)
  provides:
    - POST /api/projects/[projectId]/completeness (detailed gap analysis)
    - completeness-context-builder.ts (serializes all tab data for Claude input)
  affects:
    - Context tab completeness panel (30-05 will consume this API)

tech_stack:
  added:
    - "@anthropic-ai/sdk output_config.format json_schema for guaranteed valid JSON responses"
  patterns:
    - "Claude structured outputs via output_config.format — no JSON.parse retry loops needed"
    - "Template record filtering: source='template' records excluded from completeness scoring"
    - "Context serialization: buildCompletenessContext() mirrors chat-context-builder.ts pattern"
    - "TDD: Wave 0 stubs → real mocked-SDK tests → GREEN"

key_files:
  created:
    - bigpanda-app/lib/completeness-context-builder.ts (216 lines, serializes all 11 tab data)
  modified:
    - bigpanda-app/app/api/projects/[projectId]/completeness/route.ts (+257 lines, POST handler)
    - bigpanda-app/tests/context/completeness.test.ts (+203 lines, 5 tests GREEN)

decisions:
  - "stakeholders table has no external_id field — serialize without ID brackets (name only)"
  - "Actions capped at 50 records to avoid token explosion — open actions prioritized"
  - "Onboarding status included in teams tab serialization — phase status per team"
  - "Business outcomes included in plan tab serialization — delivery status per outcome"
  - "Skills tab always assessed by presence of skill runs (no structured data to serialize)"

metrics:
  duration_seconds: 796
  tasks_completed: 2
  tests_added: 5
  tests_passing: 5
  files_created: 1
  files_modified: 2
  commits: 2
  completed_at: "2026-04-01T16:28:42Z"
---

# Phase 30 Plan 04: Completeness Analysis API Summary

## What Was Built

Built the completeness analysis intelligence core for the Context Hub — a POST endpoint that serializes all 11 workspace tab data, calls Claude with structured outputs, and returns specific record-level quality gaps per tab.

**Key capabilities:**
- **Serialization library:** `completeness-context-builder.ts` mirrors the chat-context-builder pattern — queries all tab data in a single transaction, filters source='template' records (zero credit), includes TAB_TEMPLATE_REGISTRY definitions so Claude knows what "complete" looks like
- **Structured outputs:** Uses Claude's `output_config.format json_schema` feature — guarantees valid JSON response with no retry loops or parsing errors
- **Specific gap descriptions:** System prompt instructs Claude to reference actual record IDs ([A-KAISER-003]), counts, and exact missing fields — no generic "tab is incomplete" messages
- **Session-guarded:** requireSession() at Route Handler level (CVE-2025-29927 defense-in-depth)

**API contract:**
```typescript
POST /api/projects/[projectId]/completeness
→ Returns: CompletenessEntry[] (11 entries, one per tab)

interface CompletenessEntry {
  tabId: string;                               // 'overview' | 'actions' | 'risks' | ...
  status: 'complete' | 'partial' | 'empty';
  gaps: string[];                              // Specific record-level descriptions
}
```

**Example gap output:**
```json
{
  "tabId": "actions",
  "status": "partial",
  "gaps": [
    "[A-KAISER-003] missing owner",
    "[A-KAISER-007] missing due date",
    "4 actions have TBD placeholders in due field"
  ]
}
```

## Task Breakdown

### Task 1: Build completeness-context-builder.ts (feat: a4606b4)

**Goal:** Create serialization library that adapts chat-context-builder.ts pattern for completeness analysis.

**Implemented:**
- `buildCompletenessContext(projectId)` — queries all 11 tab tables in single transaction
- Filters records where `source='template'` (placeholder content = zero credit)
- Serializes TAB_TEMPLATE_REGISTRY section definitions per tab so Claude knows required fields
- Includes record IDs in [external_id] format for gap citation (stakeholders lack external_id → name only)
- Actions capped at 50 open records (most recent first) to avoid token explosion
- Total serialized context stays under 30,000 characters (~8k tokens)

**Tables queried:**
- actions, risks, milestones, stakeholders (core tabs)
- workstreams, keyDecisions, engagementHistory (delivery tabs)
- tasks, businessOutcomes, architectureIntegrations, teamOnboardingStatus (plan/architecture tabs)

**Pattern:** Pure function — no HTTP calls, no streaming, just DB queries + string assembly.

**Verification:** TypeScript compilation clean — no errors.

**Files:** `bigpanda-app/lib/completeness-context-builder.ts` (216 lines)

### Task 2: Build completeness API route and wire tests to GREEN (feat: 8fdcb03)

**Goal:** Add POST handler to existing completeness route.ts, update Wave 0 test stubs to real tests.

**Implemented:**
- POST handler in `app/api/projects/[projectId]/completeness/route.ts`
- Calls `buildCompletenessContext(projectId)` to serialize all tab data
- Calls Claude opus-4-6 with `output_config.format json_schema` — guarantees valid JSON
- System prompt includes TAB_TEMPLATE_REGISTRY definitions + assessment guidelines
- Extracts text block from response (skips adaptive thinking blocks)
- Returns NextResponse.json(results)

**System prompt guidelines:**
- "complete" = all required fields present, no TBD/N/A placeholders, meaningful content
- "partial" = some data but missing fields or has placeholders
- "empty" = no records after template filtering OR only placeholder text
- Gaps MUST reference record IDs ([A-KAISER-003]) and exact missing fields
- Return exactly 11 entries (one per tab)

**Tests implemented (5 tests, all GREEN):**
1. Returns array with 11 entries (one per tab)
2. Each entry has tabId, status (enum), gaps array
3. Status is "empty" for tabs with only template records
4. Gaps array contains specific record-level descriptions (not generic)
5. Rejects unauthenticated requests with 401

**Mock pattern:** Export `__mockCreate` from Anthropic SDK mock factory to avoid hoisting errors.

**Verification:** All 5 tests pass GREEN. TypeScript compilation clean (no errors in completeness files).

**Files:**
- `bigpanda-app/app/api/projects/[projectId]/completeness/route.ts` (+257 lines)
- `bigpanda-app/tests/context/completeness.test.ts` (+203 lines, 5 tests GREEN)

## Deviations from Plan

None. Plan executed exactly as written.

## Verification Results

### Automated Tests
```bash
$ npm test tests/context/completeness.test.ts -- --run
✓ tests/context/completeness.test.ts (5 tests) — all GREEN
  ✓ returns an array with one entry per workspace tab (11 tabs)
  ✓ each entry has tabId, status (complete|partial|empty), and gaps array
  ✓ status is "empty" for tabs with only source=template records
  ✓ gaps array contains specific record-level descriptions (not generic)
  ✓ rejects unauthenticated requests with 401

Test Files  1 passed (1)
Tests       5 passed (5)
Duration    351ms
```

### TypeScript Compilation
```bash
$ npx tsc --noEmit 2>&1 | grep completeness
# (no output — no errors in completeness files)
```

## Requirements Verified

**CTX-03: Completeness Analysis API** — ✅ COMPLETE

**Must-haves verified:**
- ✅ POST /api/projects/[projectId]/completeness returns JSON array with one entry per tab (11 tabs)
- ✅ Each entry has tabId, status (complete|partial|empty), and gaps array with specific record-level descriptions
- ✅ source=template records receive zero credit (excluded from completeness scoring)
- ✅ Unauthenticated requests return 401
- ✅ Response is validated against strict JSON schema before being returned (output_config.format enforces schema)
- ✅ Tests in completeness.test.ts pass GREEN (5/5)

**Key links verified:**
- ✅ completeness route → completeness-context-builder → buildCompletenessContext()
- ✅ completeness-context-builder → queries.ts → getProjectById()
- ✅ completeness-context-builder → queries direct DB queries for all 11 tab tables
- ✅ completeness route → @anthropic-ai/sdk with output_config.format json_schema
- ✅ completeness route → tab-template-registry (serialized in COMPLETENESS_SYSTEM prompt)

## Technical Notes

### Claude Structured Outputs Pattern

**Why output_config.format instead of prompt engineering:**
- Guarantees valid JSON — no parsing errors, no retry loops
- Enforces exact schema — tabId, status enum, gaps array required
- Skips adaptive thinking blocks automatically — only text block extracted
- No anthropic-beta headers needed (native feature in Claude 4.6+)

**Schema definition:**
```typescript
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
}
```

### Template Record Filtering

**Why source='template' records are excluded:**
- Phase 27 (Plan 04) seeded placeholder rows for all tabs with source='template'
- Placeholder content is not real data — should not count toward completeness
- Completeness-context-builder filters before serialization: `records.filter(r => r.source !== 'template')`
- Claude system prompt notes: "Records with source='template' have already been excluded — treat absent data as empty"

**Example:** Project has 10 actions total — 7 template placeholders + 3 real actions.
- Serialized context shows: "3 real action(s) (7 template placeholders excluded)"
- Claude only assesses the 3 real actions for completeness

### Serialization Decisions

**Actions capped at 50 records:**
- Largest table risk — projects can have 100+ actions
- Cap at 50 open actions (most recent first) to avoid token explosion
- Closed/cancelled actions excluded (not relevant for completeness assessment)

**Stakeholders lack external_id:**
- Schema has no external_id column for stakeholders table
- Serialize as: `- Alice Smith | Role: PM | Email: alice@example.com` (no [ID] prefix)
- Gap descriptions reference stakeholder by name: "Alice Smith missing email"

**Onboarding status included in teams tab:**
- teamOnboardingStatus table tracks phase status per team (ADR/Biggy track)
- Serialized as: `- Platform Engineering | Track: ADR | Ingest: in_progress | Correlation: planned`
- Claude can identify gaps like "Kaiser team missing correlation status"

**Business outcomes included in plan tab:**
- businessOutcomes table tracks delivery goals per track
- Serialized as: `- Reduce MTTR by 30% | Track: Operations | Status: planned`
- Claude can identify gaps like "No business outcomes defined for plan tab"

### Token Budget Awareness

**Serialized context size:** ~8,000 tokens (under 30,000 character limit)
- Project info: ~200 chars
- 11 tab sections: ~6,000 chars (actions largest at ~2,000 chars for 50 records)
- TAB_TEMPLATE_REGISTRY: ~1,500 chars (serialized in system prompt, not user message)

**Claude call budget:**
- System prompt: ~2,000 tokens (includes full TAB_TEMPLATE_REGISTRY JSON)
- User message: ~8,000 tokens (serialized context)
- Response: ~2,000 tokens (11 entries × ~180 tokens/entry)
- Total: ~12,000 tokens per completeness analysis

**Max tokens:** 16,384 (sufficient headroom for dense responses)

## Integration Points

**Upstream dependencies (required before this plan):**
- 30-02: TAB_TEMPLATE_REGISTRY defines what "complete" looks like per tab
- 30-03: Context tab UI infrastructure (completeness panel exists but lacks API call)

**Downstream consumers (will use this API):**
- 30-05: Context tab completeness panel wiring (frontend call to POST completeness endpoint)
- 30-06: Context Hub integration tests (end-to-end completeness flow)

**Database schema:**
- No new tables or columns required
- Reads from all 11 existing tab tables (actions, risks, milestones, stakeholders, workstreams, keyDecisions, engagementHistory, tasks, businessOutcomes, architectureIntegrations, teamOnboardingStatus)

## Lessons Learned

**Vitest mock hoisting:**
- Cannot reference let/const variables declared before vi.mock() — hoisting causes "Cannot access before initialization"
- Solution: Create mock function inside vi.mock() factory, export via `__mockCreate` property
- Pattern: `const mockFn = vi.fn(); return { default: Class, __mockCreate: mockFn };`

**Anthropic SDK adaptive thinking:**
- When `thinking: { type: 'adaptive' }` is set, response.content can include thinking blocks
- Must filter for text block: `message.content.find(b => b.type === 'text')`
- Structured outputs always return text block with JSON (thinking blocks separate)

**Template filtering transparency:**
- Claude system prompt explicitly states: "Records with source='template' have already been excluded"
- Serialized context shows count: "3 real action(s) (7 template placeholders excluded)"
- Avoids Claude misinterpreting empty serialization as incomplete data vs. actually missing data

## Self-Check

**Created files exist:**
```bash
$ [ -f "bigpanda-app/lib/completeness-context-builder.ts" ] && echo "FOUND"
FOUND
```

**Modified files exist:**
```bash
$ [ -f "bigpanda-app/app/api/projects/[projectId]/completeness/route.ts" ] && echo "FOUND"
FOUND
$ [ -f "bigpanda-app/tests/context/completeness.test.ts" ] && echo "FOUND"
FOUND
```

**Commits exist:**
```bash
$ git log --oneline --all | grep "a4606b4"
a4606b4 feat(30-04): build completeness-context-builder.ts
$ git log --oneline --all | grep "8fdcb03"
8fdcb03 feat(30-04): add POST completeness analysis endpoint with tests
```

**Tests pass:**
```bash
$ npm test tests/context/completeness.test.ts -- --run
Test Files  1 passed (1)
Tests       5 passed (5)
```

## Self-Check: PASSED

All files created, all commits exist, all tests GREEN, TypeScript compilation clean.

---

**Status:** Plan 30-04 COMPLETE — CTX-03 requirement fully implemented and verified.
**Next:** Plan 30-05 — wire Context tab completeness panel UI to call this API and display results.
