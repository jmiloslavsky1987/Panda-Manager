# Phase 9: MCP Injection Fix - Research

**Researched:** 2026-03-24
**Domain:** BullMQ job handler wiring — MCPClientPool injection into SkillOrchestrator
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKILL-01 | SkillOrchestrator cleanly separated from HTTP handlers — same code path for manual (SSE) and scheduled invocations | Confirmed: orchestrator.run() is already the shared entrypoint; gap is only the missing mcpServers argument in 3 job handlers and skill-run.ts |
| SKILL-03 | Weekly Customer Status generates from DB context with optional Gmail draft | weekly-customer-status.ts handler is wired for output + drafts; MCP injection missing before orchestrator.run() call |
| SKILL-04 | Meeting Summary — paste notes/transcript + select account → generate .docx + optional .mermaid diagram | context-updater.ts handles the transcript-paste flow; MCP injection (Gmail/Glean sweep) missing |
| SKILL-11 | Morning Briefing — Glean calendar fetch, per-meeting context, store in DB, display in Dashboard panel | morning-briefing.ts fully structured; MCPClientPool call absent entirely |
| SKILL-12 | Context Updater — apply 14 update steps → write to DB → export context doc | context-updater.ts runs; MCP context (Gmail/Glean sweep) never injected |
</phase_requirements>

---

## Summary

Phase 9 is a targeted bug-fix phase. The infrastructure is complete — `MCPClientPool`, `SKILL_MCP_MAP`, and `SkillOrchestrator.run()` all work correctly. The reference implementation (`customer-project-tracker.ts`) demonstrates the correct pattern. The gap is that three scheduled job handlers (`morning-briefing.ts`, `context-updater.ts`, `weekly-customer-status.ts`) and the generic `skill-run.ts` handler never call `MCPClientPool.getInstance().getServersForSkill(skillName)` before invoking `orchestrator.run()`. The orchestrator accepts `mcpServers?: MCPServerConfig[]` — when omitted or empty, it silently uses the non-MCP Claude path. No crashes occur, but Glean/Gmail context is never injected for these skills.

The fix is a surgical two-line addition per handler: one `import` statement and one `await MCPClientPool.getInstance().getServersForSkill(skillName)` call placed immediately before `orchestrator.run()`. The `skill-run.ts` generic handler also needs this, but requires a `SKILL_MCP_MAP` lookup (or reuse of `MCPClientPool.getServersForSkill`) since it serves multiple skills dynamically. Skills without MCP mappings will receive `[]` from `getServersForSkill` — the orchestrator already handles `[]` correctly (non-MCP path) — so there is zero regression risk on non-MCP skills.

The testing approach already established in the project is Vitest unit tests with mocked `db`, `SkillOrchestrator`, and `MCPClientPool` dependencies (see `worker/jobs/__tests__/skill-run-file.test.ts`). New tests should verify that `getServersForSkill` is called with the correct skill name and that the returned value is passed as `mcpServers` to `orchestrator.run()`.

**Primary recommendation:** Add `MCPClientPool.getInstance().getServersForSkill(skillName)` before each `orchestrator.run()` call in the four affected files. This is a 4-file change with no schema migration, no new dependencies, and no UI changes required.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `MCPClientPool` (local) | — | Resolves live MCP server configs per skill from settings.json | Already the singleton used by customer-project-tracker.ts |
| `SkillOrchestrator` (local) | — | Executes skill against Claude API with optional MCP servers | Already the shared engine for all skill runs |
| `vitest` | ^4.1.1 | Unit test runner for worker job handlers | Already installed in bigpanda-app per Phase 07-01 decision |

### No New Installations Required

All infrastructure exists. No `npm install` step needed for this phase.

---

## Architecture Patterns

### The Correct Pattern (from customer-project-tracker.ts)

```typescript
// Source: bigpanda-app/worker/jobs/customer-project-tracker.ts (lines 33-44)
// Step 1: Resolve MCP servers at runtime — reads live settings, no restart required.
// Returns [] if no servers configured — orchestrator takes non-MCP path gracefully.
const mcpServers = await MCPClientPool.getInstance().getServersForSkill('customer-project-tracker');

await orchestrator.run({
  skillName: 'customer-project-tracker',
  projectId: project.id,
  runId: runRow.id,
  skillsDir: SKILLS_DIR,
  mcpServers,  // <-- this is the only difference vs. the broken handlers
});
```

### The Broken Pattern (current state of morning-briefing.ts, context-updater.ts, weekly-customer-status.ts)

```typescript
// Current broken pattern — mcpServers never passed:
await orchestrator.run({
  skillName: 'morning-briefing',
  projectId: project.id,
  runId: runRow.id,
  skillsDir: SKILLS_DIR,
  // mcpServers absent → orchestrator.run() defaults to non-MCP Claude path
});
```

### The skill-run.ts Generic Handler Pattern

`skill-run.ts` serves all skills dynamically — `skillName` comes from `job.data`. The fix must call `getServersForSkill(skillName)` using the dynamic `skillName` variable:

```typescript
// In skill-run.ts, BEFORE orchestrator.run():
const mcpServers = await MCPClientPool.getInstance().getServersForSkill(skillName);

await orchestrator.run({ skillName, projectId, runId, input, skillsDir: SKILLS_DIR, mcpServers });
```

For skills not in `SKILL_MCP_MAP`, `getServersForSkill` returns `[]`. The orchestrator already handles empty arrays identically to `undefined` — see `skill-orchestrator.ts` line 84: `const useMCP = (params.mcpServers?.length ?? 0) > 0`.

### Import Statement Required

Each of the three job handlers currently lacks the `MCPClientPool` import. Add:

```typescript
import { MCPClientPool } from '../../lib/mcp-config';
```

`skill-run.ts` is one directory deeper but same relative path applies: `'../../lib/mcp-config'`.

### Recommended Project Structure (no changes needed)

```
bigpanda-app/
├── lib/
│   ├── mcp-config.ts          # MCPClientPool + SKILL_MCP_MAP — unchanged
│   └── skill-orchestrator.ts  # SkillRunParams already accepts mcpServers — unchanged
└── worker/
    └── jobs/
        ├── customer-project-tracker.ts  # REFERENCE — already correct
        ├── morning-briefing.ts          # FIX: add import + getServersForSkill call
        ├── context-updater.ts           # FIX: add import + getServersForSkill call
        ├── weekly-customer-status.ts    # FIX: add import + getServersForSkill call
        ├── skill-run.ts                 # FIX: add import + getServersForSkill call
        └── __tests__/
            ├── skill-run-file.test.ts   # EXISTING — add MCP injection assertions
            └── mcp-injection.test.ts    # NEW — covers all 4 handlers
```

### Anti-Patterns to Avoid

- **Hardcoding skill names in SKILL_MCP_MAP lookups:** Always pass the variable `skillName`, never a string literal, in `skill-run.ts` — the generic handler must remain generic.
- **Catching errors from getServersForSkill:** `getServersForSkill` returns `[]` for unknown skills and when settings.json is missing — it is already safe to call without a try/catch. Adding a catch that swallows the error would silently suppress settings read errors.
- **Placing getServersForSkill call after orchestrator.run():** It must be called before `orchestrator.run()` so the `mcpServers` value is available in the call.
- **Passing `undefined` explicitly:** Pass the resolved array directly — `mcpServers: mcpServers` (or shorthand `mcpServers`). Never pass `mcpServers: undefined` intentionally; let the `[]` result handle the no-MCP case.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP server resolution | Custom settings read + filter logic | `MCPClientPool.getInstance().getServersForSkill()` | Already handles enabled-filter, allowedNames lookup, and testability via settingsPath param |
| MCP capability check in skill-run.ts | `if (SKILL_MCP_MAP[skillName])` guard | Just call `getServersForSkill` directly | Returns `[]` safely for unknown skills; adding a guard duplicates logic already inside the method |
| New singleton | `new MCPClientPool()` | `MCPClientPool.getInstance()` | Constructor is private; must use getInstance() |

---

## Common Pitfalls

### Pitfall 1: Forgetting the Import Statement
**What goes wrong:** TypeScript compile error `Cannot find name 'MCPClientPool'`.
**Why it happens:** The three broken handlers never imported `MCPClientPool`. Adding the `getServersForSkill` call without the import will fail at build time.
**How to avoid:** Add `import { MCPClientPool } from '../../lib/mcp-config';` at the top of each handler.
**Warning signs:** `tsc` errors on `MCPClientPool`.

### Pitfall 2: Wrong Import Path in skill-run.ts
**What goes wrong:** Module not found at runtime.
**Why it happens:** `skill-run.ts` is at `worker/jobs/skill-run.ts` — same depth as the other handlers. Import path is identical: `'../../lib/mcp-config'`.
**How to avoid:** Verify relative depth matches the other imports in the same file (e.g., `'../../db'` already used on line 10).

### Pitfall 3: Test Mocking MCPClientPool Incorrectly
**What goes wrong:** Test throws "MCPClientPool.getInstance is not a function" or the mock is not called.
**Why it happens:** `MCPClientPool` uses a static singleton pattern. `vi.mock` must intercept the module and mock the static `getInstance()` method returning an object with a mocked `getServersForSkill`.
**How to avoid:** Follow the established pattern in `skill-run-file.test.ts` — mock the entire module:
```typescript
vi.mock('../../../lib/mcp-config', () => ({
  MCPClientPool: {
    getInstance: vi.fn().mockReturnValue({
      getServersForSkill: vi.fn().mockResolvedValue([]),
    }),
  },
}));
```

### Pitfall 4: Test Verifying mcpServers Is Passed
**What goes wrong:** Test passes even when MCP injection is missing (false positive).
**Why it happens:** If the orchestrator mock doesn't capture call arguments, the test can't assert that `mcpServers` was included.
**How to avoid:** Use `expect(mockOrchestrator.run).toHaveBeenCalledWith(expect.objectContaining({ mcpServers: expect.any(Array) }))`.

### Pitfall 5: Regression on Non-MCP Skills
**What goes wrong:** A non-MCP skill (e.g., `handoff-doc-generator`) breaks after changes to `skill-run.ts`.
**Why it happens:** If a guard condition accidentally excludes non-MCP skills from calling `orchestrator.run()`.
**How to avoid:** The fix only adds a `getServersForSkill` call (which returns `[]` for non-MCP skills) and passes the result to `orchestrator.run()`. No branching or guards are needed. The orchestrator already handles `mcpServers: []` as the non-MCP path.

---

## Code Examples

### Correct Handler After Fix (morning-briefing.ts — annotated diff)

```typescript
// Source: bigpanda-app/worker/jobs/customer-project-tracker.ts — reference implementation

// ADD THIS IMPORT (line 13 area):
import { MCPClientPool } from '../../lib/mcp-config';

// INSIDE the try block, BEFORE orchestrator.run():
const mcpServers = await MCPClientPool.getInstance().getServersForSkill('morning-briefing');

await orchestrator.run({
  skillName: 'morning-briefing',
  projectId: project.id,
  runId: runRow.id,
  skillsDir: SKILLS_DIR,
  mcpServers,                     // <-- add this argument
});
```

### skill-run.ts Generic Handler Fix

```typescript
// Source: bigpanda-app/worker/jobs/skill-run.ts

// ADD THIS IMPORT:
import { MCPClientPool } from '../../lib/mcp-config';

// Inside skillRunJob(), replace the existing orchestrator.run() call:
const mcpServers = await MCPClientPool.getInstance().getServersForSkill(skillName);
await orchestrator.run({ skillName, projectId, runId, input, skillsDir: SKILLS_DIR, mcpServers });
```

### Vitest Test Pattern for MCP Injection Assertion

```typescript
// Source: bigpanda-app/worker/jobs/__tests__/skill-run-file.test.ts (established pattern)

vi.mock('../../../lib/mcp-config', () => ({
  MCPClientPool: {
    getInstance: vi.fn().mockReturnValue({
      getServersForSkill: vi.fn().mockResolvedValue([
        { name: 'glean', url: 'https://glean.example.com', apiKey: 'test', enabled: true },
      ]),
    }),
  },
}));

it('SKILL-11: morning-briefing injects mcpServers from MCPClientPool', async () => {
  const { MCPClientPool } = await import('../../../lib/mcp-config');
  const mockGetServers = MCPClientPool.getInstance().getServersForSkill as ReturnType<typeof vi.fn>;

  const morningBriefingJob = (await import('../morning-briefing')).default;
  await morningBriefingJob({ data: { projectId: 1 } } as any);

  expect(mockGetServers).toHaveBeenCalledWith('morning-briefing');
  // Verify mcpServers was forwarded to orchestrator.run()
  const mockOrchestrator = ... // captured from SkillOrchestrator mock
  expect(mockOrchestrator.run).toHaveBeenCalledWith(
    expect.objectContaining({ mcpServers: expect.any(Array) })
  );
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MCP as separate process | Anthropic SDK `mcp_servers` array in API call | Phase 6 (2026-03) | No separate MCP server processes needed — see REQUIREMENTS.md Out of Scope |
| Static tool definitions | Dynamic `mcp_toolset` type with `allowedTools` filter | Phase 6 | Tool exposure scoped per skill |

**The existing skill-orchestrator.ts already implements the correct MCP path.** This phase does not modify `skill-orchestrator.ts` at all.

---

## Open Questions

1. **context-updater.ts and SKILL-04 (Meeting Summary) alignment**
   - What we know: SKILL-04 is "Meeting Summary — paste notes/transcript + select account → generate .docx + optional .mermaid diagram". `context-updater.ts` handles the transcript-paste flow. REQUIREMENTS.md maps SKILL-04 to Phase 9.
   - What's unclear: SKILL-04 description mentions `.docx` + `.mermaid` diagram output, which implies file generation (similar to `FILE_SKILLS` in `skill-run.ts`). The current `context-updater.ts` only does text output. However, the audit's evidence for SKILL-04 says "MCP enrichment gap (same as SKILL-04)" — the MCP injection is the only confirmed gap.
   - Recommendation: For Phase 9 scope, treat SKILL-04 as MCP injection fix only (matching the audit finding). The `.docx`/`.mermaid` output gap, if any, should be treated as a separate concern outside this phase's success criteria.

2. **Scheduled vs. UI-triggered invocation for context-updater**
   - What we know: `context-updater.ts` acquires an advisory lock (unique among the three handlers). The lock is at transaction level and auto-releases.
   - What's unclear: Whether the UI-triggered path (via `skill-run.ts`) should also acquire this lock.
   - Recommendation: Do not change lock behavior — fix only the MCP injection gap. Lock logic is orthogonal and already tested.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.1 |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-01 | `skill-run.ts` calls `getServersForSkill(skillName)` and passes result to `orchestrator.run()` | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ Wave 0 |
| SKILL-03 | `weekly-customer-status.ts` calls `getServersForSkill('weekly-customer-status')` before `orchestrator.run()` | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ Wave 0 |
| SKILL-04 | `context-updater.ts` calls `getServersForSkill('context-updater')` before `orchestrator.run()` | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ Wave 0 |
| SKILL-11 | `morning-briefing.ts` calls `getServersForSkill('morning-briefing')` before `orchestrator.run()` | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ Wave 0 |
| SKILL-12 | `context-updater.ts` calls `getServersForSkill('context-updater')` and injects result | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ Wave 0 |

Note: SKILL-11 and SKILL-12 share a single handler (`morning-briefing.ts` and `context-updater.ts` respectively) and map to the same test file. SKILL-11 relates to morning-briefing, SKILL-12 to context-updater.

Non-MCP regression test:

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `handoff-doc-generator` runs without MCP (no regression) | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `bigpanda-app/worker/jobs/__tests__/mcp-injection.test.ts` — covers SKILL-01, SKILL-03, SKILL-04, SKILL-11, SKILL-12 and non-MCP regression

*(Existing `skill-run-file.test.ts` covers FILE_SKILLS — no changes needed to that file)*

---

## Sources

### Primary (HIGH confidence)

- `bigpanda-app/worker/jobs/customer-project-tracker.ts` — authoritative reference: the one handler that already correctly injects MCP
- `bigpanda-app/lib/mcp-config.ts` — `MCPClientPool` and `SKILL_MCP_MAP` — inspected directly
- `bigpanda-app/lib/skill-orchestrator.ts` — `SkillRunParams` interface with `mcpServers?: MCPServerConfig[]` — inspected directly
- `bigpanda-app/worker/jobs/morning-briefing.ts` — confirmed: no `MCPClientPool` import, no `mcpServers` arg
- `bigpanda-app/worker/jobs/context-updater.ts` — confirmed: no `MCPClientPool` import, no `mcpServers` arg
- `bigpanda-app/worker/jobs/weekly-customer-status.ts` — confirmed: no `MCPClientPool` import, no `mcpServers` arg
- `bigpanda-app/worker/jobs/skill-run.ts` — confirmed: no `MCPClientPool` import, no `mcpServers` arg
- `.planning/v1.0-MILESTONE-AUDIT.md` — `INT-MCP-01`, `FLOW-MCP-01`, `FLOW-MCP-02` findings
- `bigpanda-app/worker/jobs/__tests__/skill-run-file.test.ts` — established vitest mock pattern for worker handlers

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` decisions block — confirms `mcp-config.ts` imports from `settings-core` (not `settings.ts`) for worker-process compatibility (Phase 06 decision)
- `.planning/REQUIREMENTS.md` — SKILL-01, SKILL-03, SKILL-04, SKILL-11, SKILL-12 all marked Pending, Phase 9

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all code inspected directly; no external libraries involved
- Architecture: HIGH — reference implementation (`customer-project-tracker.ts`) is the exact pattern; no ambiguity
- Pitfalls: HIGH — all pitfalls derived from direct code inspection and established project patterns
- Test approach: HIGH — vitest already installed and used; mock pattern already demonstrated in `skill-run-file.test.ts`

**Research date:** 2026-03-24
**Valid until:** This research covers static code only — no external API versioning concern. Valid indefinitely for this codebase state.
