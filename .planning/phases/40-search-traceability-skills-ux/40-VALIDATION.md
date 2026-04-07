---
phase: 40
slug: search-traceability-skills-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x / vitest |
| **Config file** | bigpanda-app/jest.config.js or vitest.config.ts |
| **Quick run command** | `npm run test -- --testPathPattern=phase-40` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --testPathPattern=phase-40`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 1 | SRCH-01 | integration | `npm run test -- --testPathPattern=search` | ❌ W0 | ⬜ pending |
| 40-01-02 | 01 | 1 | SRCH-01 | manual | browser test | N/A | ⬜ pending |
| 40-02-01 | 02 | 1 | SRCH-02 | unit | `npm run test -- --testPathPattern=decisions` | ❌ W0 | ⬜ pending |
| 40-03-01 | 03 | 2 | ARTF-01 | integration | `npm run test -- --testPathPattern=artifact` | ❌ W0 | ⬜ pending |
| 40-04-01 | 04 | 2 | HIST-01 | integration | `npm run test -- --testPathPattern=engagement` | ❌ W0 | ⬜ pending |
| 40-05-01 | 05 | 2 | SKLS-01 | unit | `npm run test -- --testPathPattern=skills` | ❌ W0 | ⬜ pending |
| 40-05-02 | 05 | 2 | SKLS-02 | manual | browser cancel test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/__tests__/search.test.ts` — stubs for SRCH-01
- [ ] `bigpanda-app/__tests__/decisions-filter.test.ts` — stubs for SRCH-02
- [ ] `bigpanda-app/__tests__/artifact-traceability.test.ts` — stubs for ARTF-01
- [ ] `bigpanda-app/__tests__/engagement-history.test.ts` — stubs for HIST-01
- [ ] `bigpanda-app/__tests__/skills-job-monitor.test.ts` — stubs for SKLS-01, SKLS-02

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Search results appear on keystroke after debounce | SRCH-01 | Browser interaction timing | Type ≥2 chars in header search, verify dropdown appears within 400ms |
| Decisions filter updates table on input change | SRCH-02 | Client-side filter UX | Enter text in Decisions search, verify table narrows; set date range, verify filter applies |
| Artifact extracted entities are clickable links | ARTF-01 | Navigation behavior | Open artifact detail, click linked entity, verify navigation to correct record |
| Cancel button stops running skill job | SKLS-02 | BullMQ async side-effects | Trigger skill job, click cancel within 2s, verify job status changes to cancelled |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
