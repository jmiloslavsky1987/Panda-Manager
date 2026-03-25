---
phase: 9
slug: mcp-injection-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.1 |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | SKILL-01 | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | SKILL-03 | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | SKILL-04 | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-04 | 01 | 1 | SKILL-11 | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-05 | 01 | 1 | SKILL-12 | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 2 | SKILL-01,SKILL-03,SKILL-04,SKILL-11,SKILL-12 | unit | `cd bigpanda-app && npx vitest run worker/jobs/__tests__/mcp-injection.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/worker/jobs/__tests__/mcp-injection.test.ts` — stubs for SKILL-01, SKILL-03, SKILL-04, SKILL-11, SKILL-12 and non-MCP regression

*(Existing `skill-run-file.test.ts` covers FILE_SKILLS — no changes needed to that file)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MCP injection matches `customer-project-tracker.ts` reference pattern | SKILL-01 | Code inspection gate — verify import path and argument form match reference | Read all 4 fixed handlers; confirm `import { MCPClientPool } from '../../lib/mcp-config'` present and `mcpServers` passed to `orchestrator.run()` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
