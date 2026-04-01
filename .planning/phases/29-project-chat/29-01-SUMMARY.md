---
phase: 29-project-chat
plan: "01"
subsystem: chat-backend
tags: [ai-sdk, streaming, anti-hallucination, tdd, backend-api]
completed: 2026-04-01T03:22:00Z
duration_minutes: 5
requirements:
  - CHAT-01
  - CHAT-02
dependency_graph:
  requires:
    - 29-00-wave-0-infrastructure (handled as Rule 3 blocking issue)
  provides:
    - chat-backend-streaming-api
    - chat-context-serialization
    - anti-hallucination-system-prompt
  affects:
    - future: 29-02 (ChatPanel will consume this API)
tech_stack:
  added:
    - vercel-ai-sdk: streamText + convertToModelMessages + toUIMessageStreamResponse
    - "@ai-sdk/anthropic": claude-sonnet-4-6 provider
  patterns:
    - db-context-serialization: buildChatContext adapted from skill-context.ts
    - anti-hallucination-prompt: 5-constraint system prompt with XML-wrapped data
    - project-scoped-queries: all DB calls filter by projectId (no cross-project leakage)
key_files:
  created:
    - bigpanda-app/lib/chat-context-builder.ts: DB snapshot serializer
    - bigpanda-app/app/api/projects/[projectId]/chat/route.ts: POST streaming handler
    - bigpanda-app/tests/chat/chat-context-builder.test.ts: 5 TDD tests GREEN
    - bigpanda-app/tests/chat/chat-route.test.ts: 6 TDD tests GREEN
  modified: []
decisions:
  - use-vercel-ai-sdk: Chose Vercel AI SDK over raw Anthropic SDK for chat — cleaner streaming integration with useChat hook; toUIMessageStreamResponse() handles SSE formatting automatically
  - temperature-0.3: Set temperature to 0.3 (not default 0.7) to reduce hallucination risk per CHAT-02 research
  - xml-wrapped-context: Wrapped project data in <project_data> XML tags as prompt injection defense (prevents malicious user messages from mimicking system instructions)
  - inline-record-id-citations: System prompt explicitly requires inline [EXT-ID] citations for all record references — enables user verification of AI responses
metrics:
  tasks_completed: 1
  tasks_total: 1
  tests_added: 11
  tests_passing: 11
  commits: 2
  files_created: 4
---

# Phase 29 Plan 01: Backend Chat Infrastructure Summary

**One-liner:** Implemented streaming chat API with DB context serialization and 5-constraint anti-hallucination system prompt using Vercel AI SDK and Anthropic Claude Sonnet 4.6

## What Was Built

### Core Deliverables

**1. Chat Context Builder (`lib/chat-context-builder.ts`)**
- Adapted from `lib/skill-context.ts` pattern
- Serializes project data to structured markdown with inline record IDs
- Filters: open actions (excludes completed/cancelled), open risks (excludes closed)
- Sections: Project Info, Workstreams, Open Actions, Open Risks, Milestones, Stakeholders, Recent History (last 20), Key Decisions (last 15)
- All queries project-scoped via `projectId` parameter (CHAT-02 no-leakage requirement)

**2. Streaming POST Route (`app/api/projects/[projectId]/chat/route.ts`)**
- Auth gate: `requireSession()` at handler level (CVE-2025-29927 defense-in-depth)
- Validation: Returns 400 on NaN projectId
- Streaming: Vercel AI SDK `streamText()` + `toUIMessageStreamResponse()`
- Model: Anthropic claude-sonnet-4-6 with temperature 0.3
- System prompt: All 5 CHAT-02 anti-hallucination constraints embedded

**3. Anti-Hallucination System Prompt**
All 5 constraints per CHAT-02:
1. ONLY use information present in project data
2. NEVER invent facts, numbers, dates, or names
3. ALWAYS cite record IDs inline (e.g., "Action A-12345-001")
4. Explicit "I don't see that information" response pattern
5. No general knowledge — stick to THIS project's data

Context wrapped in `<project_data>` XML tags for prompt injection defense.

### Test Coverage

**11/11 tests GREEN** (100% pass rate):
- `chat-context-builder.test.ts`: 5 tests for CHAT-01 (basic generation) and CHAT-02 (grounding)
- `chat-route.test.ts`: 6 tests for CHAT-01 (auth/streaming) and CHAT-02 (system prompt constraints)

All tests follow TDD GREEN cycle — production code written after tests defined.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Missing Wave 0 Test Infrastructure**
- **Found during:** Plan initialization
- **Issue:** Plan 29-01 depends on 29-00 (Wave 0 test stubs), but 29-00 had not been executed. Tests directory `tests/chat/` did not exist.
- **Fix:** Created Wave 0 test stubs inline as part of 29-01 execution:
  - `tests/chat/chat-context-builder.test.ts` (Wave 0 stubs)
  - `tests/chat/chat-route.test.ts` (Wave 0 stubs)
  - `tests/chat/chat-panel.test.tsx` (Wave 0 stubs, not used in this plan)
- **Verification:** AI SDK packages (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`) were already installed
- **Files modified:** All three test files created
- **Commit:** Included in commit 57e42e3 (first commit)

No architectural changes required — all deviations were auto-fixable blocking issues.

## Key Technical Decisions

### Vercel AI SDK vs Raw Anthropic SDK
**Decision:** Use Vercel AI SDK for chat streaming (not raw `@anthropic-ai/sdk` as used in existing ingestion routes)

**Rationale:**
- Cleaner integration with browser `useChat` hook (Plan 29-02)
- `toUIMessageStreamResponse()` handles SSE formatting automatically (no manual ReadableStream assembly)
- `convertToModelMessages()` normalizes UIMessage[] to Anthropic format
- Temperature and system prompt still fully controllable
- Raw Anthropic SDK remains for non-chat use cases (ingestion, skill execution)

### Temperature 0.3 for Hallucination Reduction
**Decision:** Set `temperature: 0.3` (not default 0.7 or 0)

**Rationale:**
- 0.3 reduces hallucination risk while maintaining conversational fluency
- 0 would be overly rigid and repetitive for natural dialogue
- Combined with system prompt constraints, achieves CHAT-02 goals

### XML-Wrapped Project Context
**Decision:** Wrap serialized project data in `<project_data>...</project_data>` XML tags

**Rationale:**
- Prompt injection defense — prevents malicious user messages from mimicking system instructions
- Clear delimiter makes it obvious to the model where data begins/ends
- Standard security pattern from 29-RESEARCH.md findings

## Verification Results

### Automated Tests
```bash
npm test -- --run tests/chat/chat-context-builder.test.ts tests/chat/chat-route.test.ts
```

**Result:** ✅ 11/11 tests PASSED (2 files, 169ms duration)

- `chat-context-builder.test.ts`: 5/5 GREEN
- `chat-route.test.ts`: 6/6 GREEN

### Manual Verification
Not applicable — Plan 29-01 is backend-only with no UI to verify in browser. Browser verification will occur in Plan 29-02 (ChatPanel component) after human-verify checkpoint.

## Dependencies & Integration

**Requires (from previous phases):**
- Phase 26: `requireSession()` auth infrastructure
- Phase 27: N/A (no UI dependencies)
- Existing: `lib/queries.ts` (getProjectById, getWorkspaceData)

**Provides (for future phases):**
- Plan 29-02: POST `/api/projects/[projectId]/chat` endpoint for ChatPanel
- Plan 29-03: N/A (Tab integration, not API)

**Affects:**
- No changes to existing code required (new files only)
- AI SDK coexists with raw Anthropic SDK (no conflicts)

## Commit History

| Commit  | Type | Description                                  | Files                                      |
| ------- | ---- | -------------------------------------------- | ------------------------------------------ |
| 57e42e3 | feat | Chat context builder with anti-hallucination grounding | lib/chat-context-builder.ts + tests       |
| d9175ff | feat | Streaming POST chat route with system prompt | app/api/.../chat/route.ts + route tests    |

## Performance & Quality Metrics

- **Duration:** 5 minutes (358 seconds)
- **Tests Added:** 11
- **Tests Passing:** 11 (100%)
- **Files Created:** 4
- **Commits:** 2
- **Code Quality:** All tests GREEN, no lint errors, follows existing patterns

## Next Steps

**Plan 29-02:** ChatPanel Component (Wave 1)
- Create `components/chat/ChatPanel.tsx` using `useChat` hook
- Integrate with POST `/api/projects/[projectId]/chat` endpoint
- Implement: empty state with starter questions, typing indicator, clear button
- Add: "Answers are based on this project's live data" trust label
- 6+ component tests GREEN

**Plan 29-03:** Tab Integration (Wave 1)
- Add Chat to `TAB_GROUPS` in WorkspaceTabs.tsx
- Create `app/customer/[id]/chat/page.tsx` tab page
- Wire ChatPanel to route
- Browser verification checkpoint

## Self-Check

### File Existence
```bash
[ -f "bigpanda-app/lib/chat-context-builder.ts" ] && echo "✅ FOUND"
[ -f "bigpanda-app/app/api/projects/[projectId]/chat/route.ts" ] && echo "✅ FOUND"
```

**Result:** ✅ FOUND (both files)

### Commit Existence
```bash
git log --oneline --all | grep -E "(57e42e3|d9175ff)"
```

**Result:** ✅ FOUND (both commits)

### Test Verification
```bash
npm test -- --run tests/chat/chat-context-builder.test.ts tests/chat/chat-route.test.ts
```

**Result:** ✅ 11/11 PASSED

## Self-Check: PASSED

All deliverables verified present and functional. No missing files or commits.

---

*Plan completed: 2026-04-01T03:22:00Z*
*TDD cycle: RED → GREEN → (no refactor needed)*
*Next: Plan 29-02 (ChatPanel Component)*
