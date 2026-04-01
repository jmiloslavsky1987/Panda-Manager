---
phase: 29
slug: project-chat
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-31
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `bigpanda-app/vitest.config.ts` (already exists) |
| **Quick run command** | `npm test -- --run tests/chat/` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds (full suite) |
| **jsdom tests** | Add `// @vitest-environment jsdom` at top of chat-panel.test.tsx |
| **Alias needed** | None new — existing `server-only` and `@xyflow/react` mocks sufficient |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run tests/chat/`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual hallucination audit (5 sample responses)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-00-01 | 00 | 0 | CHAT-01 | infra | `node -e "require('./node_modules/ai/package.json')"` | ❌ W0 | ⬜ pending |
| 29-00-02 | 00 | 0 | CHAT-01, CHAT-02 | unit (RED stubs) | `npm test -- --run tests/chat/` | ❌ W0 | ⬜ pending |
| 29-01 | 01 | 1 | CHAT-01, CHAT-02 | unit + integration | `npm test -- --run tests/chat/chat-context-builder.test.ts tests/chat/chat-route.test.ts` | ❌ W0 | ⬜ pending |
| 29-02 | 02 | 1 | CHAT-01, CHAT-02 | unit (jsdom) | `npm test -- --run tests/chat/chat-panel.test.tsx tests/ui/workspace-tabs.test.tsx` | ❌ W0 | ⬜ pending |
| 29-03-01 | 03 | 2 | CHAT-01, CHAT-02 | full suite + build | `npm test -- --run && npm run build` | ✅ (existing) | ⬜ pending |
| 29-03-02 | 03 | 2 | CHAT-01, CHAT-02 | manual | See manual verification section below | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/chat/chat-context-builder.test.ts` — RED stubs for CHAT-01 (context serialization) and CHAT-02 (record ID format, project scoping)
- [ ] `bigpanda-app/tests/chat/chat-route.test.ts` — RED stubs for CHAT-01 (401/400/200 routing) and CHAT-02 (system prompt constraint assertions)
- [ ] `bigpanda-app/tests/chat/chat-panel.test.tsx` — RED stubs for CHAT-01 (render, typing indicator, empty state, streaming status) and CHAT-02 (grounding label)

No new test framework installation needed — Vitest 4.1.1 already installed.
No new vitest.config.ts aliases needed — existing `server-only` stub covers all chat module imports.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chat responses stream progressively (words appear before response is complete) | CHAT-01 | Network behavior; automated tests mock the transport — cannot verify actual streaming timing | Open chat tab in browser; ask any question; observe words appearing word-by-word during streaming |
| Typing indicator appears before first word, disappears when done | CHAT-01 | Timing-dependent UI state transition — automated tests can assert indicator renders, not timing | Ask a question; observe pulsing indicator appears immediately, disappears when streaming finishes |
| Multi-turn follow-up correctly references prior conversation | CHAT-01 | LLM conversation quality — requires real Anthropic API call; cannot be mocked effectively | Ask 3-turn conversation in browser; verify 3rd response contextually references prior turns |
| Response count matches DB count exactly (no hallucinations) | CHAT-02 | LLM behavior — automated tests assert system prompt constraints exist, not that Claude complies | Run `SELECT COUNT(*) FROM actions WHERE project_id = N AND status NOT IN ('completed','cancelled')`. Ask chat "How many open actions?". Verify numbers match. |
| Responses include inline record IDs for all project-specific claims | CHAT-02 | LLM output quality — automated tests cannot verify what Claude generates | Ask "What are the open actions?" — verify every action mentioned includes its ID like [A-XXX-NNN] |
| Unknown queries return "I don't see that information" — not fabricated answers | CHAT-02 | LLM compliance with instructions — automated tests assert prompt contains the instruction, not that Claude follows it | Ask about something that doesn't exist in project data; verify refusal response, not invented answer |

**CHAT-02 Hallucination Audit Protocol (required before phase gate):**
1. Pick a project with known data in at least 3 categories (actions, risks, milestones)
2. Run DB queries to get exact counts for each category
3. Ask chat 5 questions that reference specific counts or records
4. Compare every number, date, and record ID in responses against DB queries
5. All 5 responses must cite only data present in the DB — zero invented facts
6. Document in 29-03-SUMMARY.md: "5/5 sample responses grounded in DB data"

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (3 new test files required)
- [x] No watch-mode flags (all commands use `--run`)
- [x] Feedback latency < 15s (npm test -- --run tests/chat/ is fast)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready 2026-03-31
