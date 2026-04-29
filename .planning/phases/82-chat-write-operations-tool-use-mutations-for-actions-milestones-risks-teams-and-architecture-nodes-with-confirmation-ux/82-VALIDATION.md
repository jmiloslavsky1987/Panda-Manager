---
phase: 82
slug: chat-write-operations-tool-use-mutations-for-actions-milestones-risks-teams-and-architecture-nodes-with-confirmation-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 82 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 82-01-01 | 01 | 0 | arch-node POST | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 82-02-01 | 02 | 1 | tool definitions | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 82-03-01 | 03 | 1 | chat route tools | integration | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 82-04-01 | 04 | 2 | confirmation card render | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 82-05-01 | 05 | 2 | approval UX flow | manual | n/a | n/a | ⬜ pending |
| 82-06-01 | 06 | 3 | delete friction UX | manual | n/a | n/a | ⬜ pending |
| 82-07-01 | 07 | 4 | active tab context | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/api/arch-nodes.test.ts` — stubs for POST arch-node route
- [ ] `__tests__/chat/tool-definitions.test.ts` — stubs for all write tool schemas
- [ ] `__tests__/chat/chat-route-tools.test.ts` — stubs for streamText tool integration
- [ ] `__tests__/chat/confirmation-card.test.tsx` — stubs for ConfirmationCard component

*Existing vitest infrastructure covers the framework; only test stubs need creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inline confirmation card approval flow | Confirmation UX | Requires live AI streaming + user interaction | Open chat, request create action, confirm card, verify record created |
| Delete type-to-confirm friction | Delete UX | Requires live streaming + keyboard input | Open chat, request delete, type confirm phrase, verify deletion |
| Batch operation cards (multiple mutations) | Batch operations | Requires live AI streaming multiple tool calls | Open chat, request bulk update, verify one card per record |
| Ambiguous intent clarification question | Intent detection | Requires live AI model judgment | Switch to Risks tab, type "add a new item", verify Claude asks for risk specifics |
| Active tab defaulting | Tab context | Requires live AI model + tab state | Switch to Milestones tab, type "add a new item", verify Claude proposes milestone |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
