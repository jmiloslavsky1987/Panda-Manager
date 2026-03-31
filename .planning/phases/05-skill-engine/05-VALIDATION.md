---
phase: 5
slug: skill-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (@playwright/test — already installed at project root) |
| **Config file** | `playwright.config.ts` at project root |
| **Quick run command** | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-01"` |
| **Full suite command** | `npx playwright test tests/e2e/phase5.spec.ts` |
| **Estimated runtime** | ~60 seconds (13 E2E tests; skills require live Anthropic API) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/e2e/phase5.spec.ts --grep "<REQ-ID>"`
- **After every plan wave:** Run `npx playwright test tests/e2e/phase5.spec.ts`
- **Before `/gsd:verify-work`:** Full suite must be green + human live verification of SSE stream in browser
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 0 | SKILL-01..SKILL-14, DASH-09, OUT-01..04 | E2E stub | `npx playwright test tests/e2e/phase5.spec.ts` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | SKILL-01 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-01"` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 1 | SKILL-02 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-02"` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 2 | SKILL-03 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-03"` | ❌ W0 | ⬜ pending |
| 5-03-02 | 03 | 2 | SKILL-04 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-04"` | ❌ W0 | ⬜ pending |
| 5-03-03 | 03 | 2 | SKILL-11 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-11"` | ❌ W0 | ⬜ pending |
| 5-03-04 | 03 | 2 | SKILL-12 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-12"` | ❌ W0 | ⬜ pending |
| 5-03-05 | 03 | 2 | SKILL-13 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-13"` | ❌ W0 | ⬜ pending |
| 5-03-06 | 03 | 2 | SKILL-14 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "SKILL-14"` | ❌ W0 | ⬜ pending |
| 5-04-01 | 04 | 2 | DASH-09 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "DASH-09"` | ❌ W0 | ⬜ pending |
| 5-05-01 | 05 | 3 | OUT-01 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "OUT-01"` | ❌ W0 | ⬜ pending |
| 5-05-02 | 05 | 3 | OUT-02 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "OUT-02"` | ❌ W0 | ⬜ pending |
| 5-05-03 | 05 | 3 | OUT-03 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "OUT-03"` | ❌ W0 | ⬜ pending |
| 5-05-04 | 05 | 3 | OUT-04 | E2E | `npx playwright test tests/e2e/phase5.spec.ts --grep "OUT-04"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/phase5.spec.ts` — RED stubs for all 13 requirements using `expect(false, 'stub').toBe(true)` pattern (established in phases 2–4)
- [ ] `bigpanda-app/skills/` directory — 5 SKILL.md stub files (weekly-status.md, meeting-summary.md, morning-briefing.md, context-updater.md, handoff-doc.md)
- [ ] `bigpanda-app/package.json` — `@anthropic-ai/sdk` dependency installed (blocks all skill execution)
- [ ] DB migration SQL — `skill_runs`, `skill_run_chunks`, `drafts` tables
- [ ] `bigpanda-app/db/schema.ts` — Drizzle schema for new tables

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE stream renders tokens in real-time in browser | SKILL-01 | Playwright EventSource support is limited; visual streaming verification requires human eye | Navigate to `/customer/1/skills`, click Run on Weekly Status, watch tokens appear one by one |
| Navigate away mid-stream and return to see completed output | SKILL-01 | Multi-tab navigation with timing is fragile in E2E | Start skill run, navigate to Dashboard immediately, return to run URL, verify output present |
| SKILL.md hot-reload | SKILL-14 | File system event timing non-deterministic in E2E | Edit `bigpanda-app/skills/weekly-status.md`, trigger run, verify new content used |
| Open file via system `open` command for .docx output | OUT-03 | Requires macOS system app to open — can't assert in E2E | Trigger a skill that produces .docx, click "Open" button, verify system app launches |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
