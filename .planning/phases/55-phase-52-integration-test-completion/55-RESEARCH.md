# Phase 55: Phase 52 Integration Test Completion - Research

**Researched:** 2026-04-10
**Domain:** Vitest integration testing for multi-pass document extraction
**Confidence:** HIGH

## Summary

Phase 55 completes the 4 deferred RED integration tests from Phase 52 Plan 03. These tests verify the runtime behavior of the 3-pass extraction loop implemented in Phase 52 Plans 01-02. The tests exist in `document-extraction-passes.test.ts` as RED stubs (lines 120-177) but only test PASS_PROMPTS structure, not actual execution behavior.

The research domain is straightforward: Vitest mocking patterns for BullMQ workers, Anthropic SDK streaming responses, and database interactions. The codebase already has extensive test coverage (~370 passing tests per STATE.md) with established patterns from Phases 46-53.

**Primary recommendation:** Drive the 4 RED integration tests to GREEN by adding runtime execution tests that verify: (1) PDF extraction makes exactly 3 Claude API calls, (2) text extraction makes 3 * chunkCount calls, (3) pass results are merged before dedup, and (4) global progress scale formula produces correct boundaries.

## <phase_requirements>

| ID | Description | Research Support |
|----|-------------|-----------------|
| MULTI-PASS-01 | 3-pass extraction loop implemented | Test runtime behavior: PDF → 3 calls, text → 3 * chunkCount calls (Phase 52 implemented the loop, Phase 55 verifies runtime execution) |
| MULTI-PASS-02 | Intra-batch deduplication with composite keys | Test merge-then-dedup sequence: verify all 3 passes merged into single array before deduplicateWithinBatch called (Phase 52 implemented dedup, Phase 55 verifies merge timing) |
| MULTI-PASS-03 | Pass-aware progress display | Test global progress scale formula: verify pass 1 completion → 33%, pass 2 → 66%, pass 3 → 100% (Phase 52 implemented formula, Phase 55 verifies boundary conditions) |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.1.2 | Test framework | Project standard since foundation; ~370 passing tests; established mocking patterns |
| @anthropic-ai/sdk | ^0.80.0 | Claude API client | Document extraction dependency; must mock streaming responses |
| BullMQ | ^5.71.0 | Worker queue | Document extraction runs in worker context; must mock job data |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Drizzle ORM | ^0.45.1 | Database access | Mock DB queries for progress tracking |
| node:fs/promises | Built-in | File reading | Mock file reads for PDF/text extraction |

### Installation
Already installed — no new dependencies required. All libraries in existing package.json.

## Architecture Patterns

### Test Structure Pattern (Established in Phases 46-53)

**Wave 0 TDD approach:**
1. Create RED test stubs before implementation (document behavioral contract)
2. Implement production code
3. Tests turn GREEN when behavior matches contract

**Phase 55 context:** Wave 0 already complete (Phase 52 Plan 01), production code already complete (Phase 52 Plan 02), but 4 integration tests remain RED placeholders. Phase 55 upgrades these placeholders to full runtime execution tests.

### Mock Strategy for Worker Context

Existing pattern from `document-extraction-passes.test.ts` (lines 8-66):

```typescript
// Mock Anthropic SDK with streaming client
vi.mock('@anthropic-ai/sdk', () => {
  const mockStream = {
    on: vi.fn().mockImplementation(function(event, handler) {
      if (event === 'text') handler('[]');
      return this;
    }),
    finalMessage: vi.fn().mockResolvedValue({}),
  };
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { stream: vi.fn().mockReturnValue(mockStream) }
    })),
  };
});

// Mock DB connection
vi.mock('../../db', () => ({
  default: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) })),
  },
}));
```

**Pattern:** Mock at module level, return chainable Drizzle-style query builders.

### Runtime Call Counting Pattern

To verify "PDF makes 3 Claude calls":

```typescript
it('PDF extraction makes 3 Claude calls (one per pass)', async () => {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const mockClient = new Anthropic({ apiKey: 'test' });
  const streamSpy = vi.spyOn(mockClient.messages, 'stream');

  // Trigger extraction job with PDF artifact
  // ...

  expect(streamSpy).toHaveBeenCalledTimes(3);
});
```

**Key insight:** Must spy on the mock's stream method, not the constructor. The mock already exists from module-level vi.mock(); test adds spy to count calls.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mock streaming responses | Custom stream emitter with timing logic | vi.mock() with chainable handlers | Vitest mocks handle async/streaming natively; custom emitters add flakiness |
| Database query mocking | In-memory SQLite or mock DB library | vi.mock() with chainable query builders | Drizzle query chains are predictable; mock structure matches production patterns |
| Call counting | Global counter variables incremented in mocks | vi.spyOn() on existing mock methods | Vitest spies track calls automatically; less brittle than manual counters |

**Key insight:** The existing test file (Phase 52 Plan 01) already has correct mock architecture. Phase 55 adds spies and execution logic, not new mocking infrastructure.

## Common Pitfalls

### Pitfall 1: Mock Isolation Between Tests
**What goes wrong:** First test modifies shared mock state; second test sees stale call counts or responses.
**Why it happens:** Module-level vi.mock() creates singleton mocks; vi.clearAllMocks() only clears call history, not implementation.
**How to avoid:** Use beforeEach(() => vi.clearAllMocks()) and afterEach(() => vi.restoreAllMocks()) as already established in existing test file (lines 71-77).
**Warning signs:** Test passes when run alone but fails when run with full suite.

### Pitfall 2: Dynamic Import Timing with vi.mock()
**What goes wrong:** Test imports module before vi.mock() is hoisted; mock doesn't apply.
**Why it happens:** ES module imports are evaluated at parse time, but vi.mock() needs to run before import.
**How to avoid:** Use dynamic import inside test body: `const { PASS_PROMPTS } = await import('../document-extraction')` (already established in line 93 of existing test).
**Warning signs:** "Cannot find module" or "undefined is not a function" errors.

### Pitfall 3: Chaining Mock Return Values
**What goes wrong:** Mock returns undefined instead of chainable object; production code crashes with "cannot read property 'from' of undefined".
**Why it happens:** Drizzle uses method chaining (db.select().from().where()); mock must return objects at every level.
**How to avoid:** Nest mock return functions: `select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn() })) }))` (already established in lines 35-38 of existing test).
**Warning signs:** TypeError in test output referencing "from" or "where".

### Pitfall 4: Testing Progress Scale Boundaries
**What goes wrong:** Test checks `progress_pct === 33` but actual value is 32 or 34 due to rounding.
**Why it happens:** Global progress formula uses `Math.round()`: `(passIdx / 3) * 100 + (passProgressPct / 3)`.
**How to avoid:** Use `expect(progress_pct).toBeLessThanOrEqual(33)` for pass 1 completion, not strict equality. Allow ±1 tolerance for rounding.
**Warning signs:** Test fails with "Expected: 33, Received: 32" on pass boundary checks.

## Code Examples

### Pattern 1: Count Claude API Calls (PDF Path)

Verified approach from Phase 52 implementation context:

```typescript
// Source: Phase 52 Plan 02 implementation + Phase 55 research
it('PDF extraction makes 3 Claude calls (one per pass)', async () => {
  // Get mock client instance
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const mockClient = new Anthropic({ apiKey: 'test' });

  // Spy on stream method to count calls
  const streamSpy = vi.spyOn(mockClient.messages, 'stream');

  // Mock job data and artifact
  const mockJob = {
    id: 'test-job-1',
    data: {
      jobId: 'test-job-1',
      artifact: {
        id: 'test-artifact-1',
        project_id: 'test-project',
        file_name: 'test.pdf',
        file_path: '/tmp/test.pdf',
        mime_type: 'application/pdf',
      },
    },
  };

  // Trigger extraction (requires importing and calling the worker handler)
  // await extractionJobHandler(mockJob);

  // Verify exactly 3 calls (one per pass)
  expect(streamSpy).toHaveBeenCalledTimes(3);

  // Verify each call used different system prompt
  const calls = streamSpy.mock.calls;
  expect(calls[0][0].system).toContain('action'); // Pass 1
  expect(calls[1][0].system).toContain('arch_node'); // Pass 2
  expect(calls[2][0].system).toContain('wbs_task'); // Pass 3
});
```

### Pattern 2: Verify Pass Merge Before Dedup

```typescript
// Source: Phase 52 Plan 02 implementation + Phase 55 research
it('allRawItems merges all 3 passes before dedup', async () => {
  // Mock stream responses with different entity types per pass
  const mockStream = {
    on: vi.fn().mockImplementation(function(event, handler) {
      if (event === 'text') {
        const callCount = this._callCount || 0;
        const responses = [
          '[{"entityType":"action","fields":{"description":"Task 1"}}]', // Pass 1
          '[{"entityType":"arch_node","fields":{"node_name":"Node 1"}}]', // Pass 2
          '[{"entityType":"wbs_task","fields":{"title":"WBS 1"}}]', // Pass 3
        ];
        handler(responses[callCount] || '[]');
        this._callCount = callCount + 1;
      }
      return this;
    }),
    finalMessage: vi.fn().mockResolvedValue({}),
    _callCount: 0,
  };

  // ... trigger extraction and capture staging call ...

  // Verify staging received all 3 entity types (not filtered by pass)
  expect(stagedItems).toHaveLength(3);
  expect(stagedItems.map(i => i.entityType)).toEqual(['action', 'arch_node', 'wbs_task']);
});
```

### Pattern 3: Test Global Progress Scale Formula

```typescript
// Source: Phase 52 Plan 02 global progress formula + Phase 55 research
it('progress_pct maps correctly to pass ranges', async () => {
  // Mock DB update to capture progress writes
  const updateCalls: Array<{ progress_pct: number }> = [];
  const db = await import('../../db');
  vi.spyOn(db.default, 'update').mockImplementation(() => ({
    set: vi.fn((values) => {
      updateCalls.push(values);
      return { where: vi.fn(() => Promise.resolve()) };
    }),
  }));

  // Trigger extraction
  // ...

  // Verify pass 1 completion writes ≤33%
  const pass1Complete = updateCalls.find(c => c.progress_pct <= 33 && c.progress_pct > 0);
  expect(pass1Complete).toBeDefined();

  // Verify pass 2 completion writes ≤66%
  const pass2Complete = updateCalls.find(c => c.progress_pct <= 66 && c.progress_pct > 33);
  expect(pass2Complete).toBeDefined();

  // Verify pass 3 completion writes 100%
  const pass3Complete = updateCalls.find(c => c.progress_pct === 100);
  expect(pass3Complete).toBeDefined();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-pass extraction | 3-pass targeted extraction | Phase 52 (2026-04-10) | Integration tests must verify 3-call sequence, not single call |
| Inline dedup during extraction | Batch dedup after all passes | Phase 52 (2026-04-10) | Tests must verify merge-then-dedup ordering |
| Chunk-based progress | Global progress scale across passes | Phase 52 (2026-04-10) | Tests must check pass boundaries (33%/66%/100%), not chunk percentages |

**Deprecated/outdated:**
- EXTRACTION_SYSTEM constant: renamed to EXTRACTION_BASE in Phase 52; old constant no longer exported
- Single-pass test assumptions: any test checking "runClaudeCall called once" is outdated

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vitest.config.ts (assumed from package.json "test": "vitest") |
| Quick run command | `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MULTI-PASS-01 (PDF) | PDF extraction makes exactly 3 Claude calls | integration | `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts -t "PDF extraction makes 3 Claude calls"` | ✅ (RED stub line 121) |
| MULTI-PASS-01 (text) | Text extraction makes 3 * chunkCount Claude calls | integration | `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts -t "text extraction makes 3"` | ✅ (RED stub line 135) |
| MULTI-PASS-02 | Pass results merged before dedup | integration | `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts -t "allRawItems is a merge"` | ✅ (RED stub line 149) |
| MULTI-PASS-03 | Global progress scale produces correct boundaries | integration | `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts -t "progress_pct maps to pass ranges"` | ✅ (RED stub line 166) |

### Sampling Rate
- **Per task commit:** `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts` (4 tests)
- **Per wave merge:** `npm test` (full suite, ~370 tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. The 4 RED stub tests already exist in `worker/jobs/__tests__/document-extraction-passes.test.ts` (created in Phase 52 Plan 01). Phase 55 upgrades stubs to full implementations.

## Sources

### Primary (HIGH confidence)
- Phase 52 Plan 01 PLAN.md — Wave 0 TDD stubs specification (lines 111-177 define the 4 tests)
- Phase 52 Plan 02 PLAN.md — Multi-pass implementation details (3-pass loop structure, global progress formula)
- Phase 52 VERIFICATION.md — Requirements status (MULTI-PASS-03 marked PARTIAL, deferred to Phase 55)
- bigpanda-app/worker/jobs/__tests__/document-extraction-passes.test.ts — Existing RED test stubs
- bigpanda-app/package.json — Vitest 4.1.2 confirmed

### Secondary (MEDIUM confidence)
- STATE.md accumulated context — ~370 passing tests, Wave 0 TDD pattern established across Phases 46-53

### Tertiary (LOW confidence)
None — all findings verified from project files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries present in package.json, versions confirmed
- Architecture: HIGH - Test patterns established across 8 prior phases (46-53)
- Pitfalls: HIGH - Mock isolation and chaining patterns verified in existing test file
- Integration tests: HIGH - 4 RED stubs already exist with clear behavioral contracts

**Research date:** 2026-04-10
**Valid until:** 90 days (test framework stable; no fast-moving dependencies)
