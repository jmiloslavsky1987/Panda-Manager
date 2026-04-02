---
phase: 32
slug: time-tracking-global-view
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (via `vitest.config.ts`) |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npx vitest run __tests__/time-tracking-global/ --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run __tests__/time-tracking-global/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 32-W0-01 | W0 | 0 | TIME-01 | unit | `npx vitest run __tests__/time-tracking-global/api-endpoint.test.ts -x` | ❌ W0 | ⬜ pending |
| 32-W0-02 | W0 | 0 | TIME-01, TIME-02 | unit | `npx vitest run __tests__/time-tracking-global/global-view.test.ts -x` | ❌ W0 | ⬜ pending |
| 32-W0-03 | W0 | 0 | TIME-03 | unit | `npx vitest run __tests__/time-tracking-global/workspace-tabs.test.ts -x` | ❌ W0 | ⬜ pending |
| 32-XX-01 | TBD | 1 | TIME-01 | unit | `npx vitest run __tests__/time-tracking-global/api-endpoint.test.ts -x` | ❌ W0 | ⬜ pending |
| 32-XX-02 | TBD | 1 | TIME-01 | unit | `npx vitest run __tests__/time-tracking-global/global-view.test.ts -x` | ❌ W0 | ⬜ pending |
| 32-XX-03 | TBD | 1 | TIME-02 | unit | `npx vitest run __tests__/time-tracking-global/global-view.test.ts -x` | ❌ W0 | ⬜ pending |
| 32-XX-04 | TBD | 1 | TIME-03 | unit | `npx vitest run __tests__/time-tracking-global/workspace-tabs.test.ts -x` | ❌ W0 | ⬜ pending |
| 32-XX-05 | TBD | 1 | TIME-03 | smoke | manual — verify redirect in browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/time-tracking-global/global-view.test.ts` — stubs for TIME-01 (cross-project fetch), TIME-02 (project dropdown pre-fill, optional projectId in modal)
- [ ] `__tests__/time-tracking-global/api-endpoint.test.ts` — stubs for TIME-01 (GET /api/time-entries shape, filter params, project_name in response)
- [ ] `__tests__/time-tracking-global/workspace-tabs.test.ts` — stubs for TIME-03 (TAB_GROUPS no longer contains 'time' subtab)

*Existing `tests/__mocks__/` stubs for `server-only` and `@xyflow/react` already present — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Old `/customer/[id]/time` route redirects to `/time-tracking?project=:id` | TIME-03 | Server-side Next.js redirect is hard to unit-test cleanly without a running server | Navigate to `/customer/1/time` in browser — should redirect to `/time-tracking?project=1` with project filter pre-filled |
| Sidebar clock icon link appears after Scheduler | TIME-01 | Visual placement in Sidebar requires visual verification | Check sidebar bottom section — `Time Tracking` link with clock icon visible after Scheduler |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
