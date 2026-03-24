---
phase: 06
slug: mcp-integrations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (`@playwright/test`) |
| **Config file** | `playwright.config.ts` (project root) |
| **Quick run command** | `npx playwright test tests/e2e/phase6.spec.ts --grep "DASH-04"` |
| **Full suite command** | `npx playwright test tests/e2e/phase6.spec.ts` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted `--grep` for the requirement just implemented
- **After every wave:** Run full `npx playwright test tests/e2e/phase6.spec.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Requirement Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| DASH-04 | Risk Heat Map visible on Dashboard | E2E structural | `--grep "DASH-04"` | DB query only — fully automatable |
| DASH-05 | Cross-Account Watch List visible | E2E structural | `--grep "DASH-05"` | DB query only — fully automatable |
| SKILL-10 | Customer Project Tracker skill exists + runs | E2E assert-if-present | `--grep "SKILL-10"` | Live MCP calls not testable in CI; structural + settings UI verified |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual |
|----------|-------------|------------|
| MCP Test Connection button authenticates successfully | SKILL-10 | Requires live Glean/Slack tokens |
| Customer Project Tracker fetches real Gmail/Slack data | SKILL-10 | Requires live MCP servers with real tokens |
| Structured report contains new actions written to DB | SKILL-10 | Requires live data + manual review of output quality |

---

## Wave 0 Requirements

- [ ] `tests/e2e/phase6.spec.ts` — 3 stub tests (DASH-04, DASH-05, SKILL-10)

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
