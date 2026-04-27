---
phase: 79
slug: core-calendar-daily-prep
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Phase 79 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (node environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose tests/` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose tests/`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 79-01-01 | 01 | 1 | CAL-01 | unit | `npx vitest run --reporter=verbose tests/components/calendar-import-modal.test.ts` | ❌ W0 | ⬜ pending |
| 79-01-02 | 01 | 1 | CAL-02, CAL-03 | unit | `npx vitest run --reporter=verbose tests/api/calendar-import-global.test.ts` | ❌ W0 | ⬜ pending |
| 79-02-01 | 02 | 1 | NAV-01 | unit | `npx vitest run --reporter=verbose tests/components/sidebar-daily-prep.test.ts` | ❌ W0 | ⬜ pending |
| 79-03-01 | 03 | 2 | PREP-02, PREP-03 | unit | `npx vitest run --reporter=verbose tests/components/daily-prep-card.test.ts` | ❌ W0 | ⬜ pending |
| 79-03-02 | 03 | 2 | PREP-04, PREP-05, PREP-06, PREP-07 | unit | `npx vitest run --reporter=verbose tests/components/daily-prep-page.test.ts` | ❌ W0 | ⬜ pending |
| 79-04-01 | 04 | 2 | PREP-01 | smoke | manual | N/A | ⬜ pending |
| 79-05-01 | 05 | 3 | SKILL-01, SKILL-02 | unit | `npx vitest run --reporter=verbose lib/__tests__/meeting-prep-context.test.ts` | ✅ partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/components/calendar-import-modal.test.ts` — stubs for CAL-01 (global mode, no projectId)
- [ ] `tests/api/calendar-import-global.test.ts` — stubs for CAL-02, CAL-03 (extended interface + title matching)
- [ ] `tests/components/daily-prep-card.test.ts` — stubs for PREP-02, PREP-03
- [ ] `tests/components/daily-prep-page.test.ts` — stubs for PREP-04, PREP-05, PREP-06, PREP-07
- [ ] `tests/components/sidebar-daily-prep.test.ts` — stubs for NAV-01
- [ ] Extend `lib/__tests__/meeting-prep-context.test.ts` — add tests for `calendarMeta` parameter (SKILL-01, SKILL-02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/daily-prep` page route exists and loads in browser | PREP-01 | Next.js routing requires browser verification | Navigate to `/daily-prep`; verify page renders without 404 |
| Daily Prep sidebar link appears below Dashboard | NAV-01 | Visual layout assertion | Open app; confirm "Daily Prep" link is below Dashboard and above project list |
| CalendarImportModal opens from GlobalTimeView | CAL-01 | Integration with live Google OAuth | Click calendar icon in GlobalTimeView; verify modal opens |
| SSE streaming renders brief text progressively | PREP-05 | Streaming behavior requires live network | Select an event and click Generate Prep; verify text appears progressively |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
