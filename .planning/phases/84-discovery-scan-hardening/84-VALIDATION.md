---
phase: 84
slug: discovery-scan-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 84 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose 2>&1 | tail -20` |
| **Full suite command** | `npx vitest run 2>&1 | tail -30` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose 2>&1 | tail -20`
- **After every plan wave:** Run `npx vitest run 2>&1 | tail -30`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 84-01-01 | 01 | 1 | Slack OAuth routes | unit | `npx vitest run --reporter=verbose 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 84-01-02 | 01 | 1 | SlackAdapter rewrite | unit | `npx vitest run --reporter=verbose 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 84-01-03 | 01 | 1 | resolveAdapter Slack branch | unit | `npx vitest run --reporter=verbose 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 84-02-01 | 02 | 1 | Timeframe selector UI | manual | — | N/A | ⬜ pending |
| 84-02-02 | 02 | 1 | scan-config persistence | unit | `npx vitest run --reporter=verbose 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 84-03-01 | 03 | 2 | Entity type expansion | unit | `npx vitest run --reporter=verbose 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 84-03-02 | 03 | 2 | FK resolution at approve | unit | `npx vitest run --reporter=verbose 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 84-03-03 | 03 | 2 | Context-aware enrichment | unit | `npx vitest run --reporter=verbose 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 84-04-01 | 04 | 3 | per-source SSE summary | manual | — | N/A | ⬜ pending |
| 84-04-02 | 04 | 3 | ReviewQueue expanded types | manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/discovery/slack-oauth.test.ts` — stubs for Slack OAuth route handlers
- [ ] `lib/__tests__/slack-adapter.test.ts` — stubs for Slack search.messages adapter logic
- [ ] `tests/discovery/scan-config.test.ts` — stubs for lookback field in scan-config GET/POST
- [ ] `tests/discovery/approve.test.ts` — extended stubs for FK resolution (arch_node, workflow_step) and new entity types
- [ ] `tests/discovery/scan.test.ts` — extended stubs for sourceSummary return + enrichment context assertion

*Existing vitest infrastructure assumed to be in place (vitest.config.ts exists).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slack OAuth consent screen appears and returns xoxp- token | Slack OAuth integration | Requires live Slack app + browser | Click "Authorize with Slack" in Settings, complete OAuth flow, verify token shown as connected |
| Gmail scan returns emails for project name | Gmail integration | Requires live Gmail OAuth credentials | Trigger scan, verify email results appear in Review Queue |
| Timeframe selector changes scan lookback period | UI wiring | Requires live scan run | Select "1 month", run scan, verify `since` param reflects ~30 days ago |
| Per-source summary shows in post-scan toast | SSE complete event | Requires live scan run | Run scan with Slack unconfigured, verify "slack: skipped (no credentials)" appears in result |
| arch_node and workflow_step items approve correctly | FK resolution | Requires live DB data | Approve discovery item of type arch_node with matching track, verify DB row created |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
