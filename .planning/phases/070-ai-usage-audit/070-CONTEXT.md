# Phase 70: AI Usage Audit - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce a written audit report that catalogs every Claude API call site in the codebase, classifies each one, and states a recommendation. No code changes in this phase — the deliverable is the report. Phase 71 acts on it.

</domain>

<decisions>
## Implementation Decisions

### Classification ownership
- Claude (the auditor) makes the classification call for every call site — no human pre-classification needed
- The governing question: "Could this call be replaced with deterministic logic (if/else, lookup, rule-based) and still produce correct, consistent results?" If yes → deterministic. If it genuinely requires reading between the lines, synthesizing unstructured content, or exercising judgment that varies by context → AI belongs there

### Report purpose
- Diagnostic, not prescriptive — "everything is already correct" is a perfectly valid outcome
- The user's goal is confidence: know what the system is doing with AI and why, before planning any changes
- The report must make the deterministic vs genuine-AI distinction **visible at a glance**, not buried in prose

### Recommendations
- Every call site gets a recommendation: Keep as AI / Replace with hardcoded logic / Borderline — see note
- For borderline calls, include a brief rationale and a directional recommendation (not just a flag)
- Tone: direct and actionable — "this call formats a status string, hardcode it" not "this may potentially be considered..."

### Skill prompt scope
- The 15 skill `.md` files (weekly-status, risk-assessment, meeting-summary, etc.) are meaningful call sites — each skill is effectively a distinct AI invocation with its own purpose
- Each skill should be audited individually alongside the infrastructure call sites (skill-orchestrator, document-extraction, etc.)
- Claude's discretion on whether to group skills into a summary section or list them individually

### Report format
- Claude's discretion — choose whatever structure makes the deterministic vs AI distinction clearest to a reader doing a single pass review
- Markdown output, human-readable

### Claude's Discretion
- Exact table vs narrative format
- Whether to group call sites by feature area or by classification
- How deeply to describe each call site (function name + one line is sufficient)
- Whether infrastructure wiring (model config, API key setup) counts as a "call site" or is excluded from classification

</decisions>

<specifics>
## Specific Ideas

- The user explicitly noted: "there is a chance the way everything is currently architected is already correct" — the audit should confirm correctness where it exists, not manufacture findings
- Primary concern is consistency: AI where judgment is needed, logic where it isn't

</specifics>

<code_context>
## Existing Code Insights

### Known call sites (production, non-test)
- `app/api/projects/[projectId]/chat/route.ts` — Vercel AI SDK `streamText`, project chat grounded in live DB context
- `app/api/projects/[projectId]/completeness/route.ts` — `client.messages.create`, per-field completeness scoring (0–100%)
- `components/MilestonesTableClient.tsx` — Anthropic usage in a UI component (unusual — needs investigation)
- `lib/skill-orchestrator.ts` — dispatches all 15 skills to Claude
- `lib/discovery-scanner.ts` — `anthropic.messages.stream`, external discovery/scan sweep
- `lib/source-adapters/mcp-adapter.ts` — Anthropic usage in MCP context
- `worker/jobs/document-extraction.ts` — two calls: Pass 0 pre-analysis + multi-pass entity extraction
- `worker/jobs/wbs-generate-plan.ts` — `anthropic.messages.create`, WBS plan generation
- `worker/jobs/weekly-focus.ts` — `client.messages.create`, weekly priorities generation

### Skill files (dispatched via skill-orchestrator)
- 15 skill `.md` files in `bigpanda-app/skills/` — each is a distinct AI prompt (weekly-status, risk-assessment, meeting-summary, sprint-summary, etc.)

### Integration Points
- Report is consumed by the user (not by code) — written to a file in the phase directory
- Phase 71 (RFCTR-02) will act on the deterministic call sites identified here

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 070-ai-usage-audit*
*Context gathered: 2026-04-19*
