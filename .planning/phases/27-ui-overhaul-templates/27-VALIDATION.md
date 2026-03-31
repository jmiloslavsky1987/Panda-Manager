---
phase: 27
slug: ui-overhaul-templates
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test tests/ui/ -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~10s (quick) / ~30s (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm test tests/ui/ -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | UI-01 | unit | `npm test tests/ui/workspace-tabs.test.tsx -- --run` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | UI-01 | unit | `npm test tests/ui/workspace-tabs.test.tsx -- --run` | ❌ W0 | ⬜ pending |
| 27-01-03 | 01 | 1 | UI-01 | unit | `npm test tests/ui/workspace-tabs.test.tsx -- --run` | ❌ W0 | ⬜ pending |
| 27-02-01 | 02 | 2 | UI-03 | unit | `npm test tests/ui/tab-registry.test.ts -- --run` | ❌ W0 | ⬜ pending |
| 27-02-02 | 02 | 2 | UI-03 | type-check | `npx tsc --noEmit` | ✅ existing | ⬜ pending |
| 27-03-01 | 03 | 3 | UI-04 | unit | `npm test tests/ui/seed-project.test.ts -- --run` | ❌ W0 | ⬜ pending |
| 27-03-02 | 03 | 3 | UI-04 | integration | `npm test tests/api/projects-patch.test.ts -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/__mocks__/next-navigation.ts` — shared mock for `useSearchParams`, `useRouter`, `usePathname`
- [ ] `tests/ui/workspace-tabs.test.tsx` — covers UI-01 (grouped nav, searchParams URL state, sub-tab bar)
- [ ] `tests/ui/tab-registry.test.ts` — covers UI-03 (registry completeness, 11 tab types)
- [ ] `tests/ui/seed-project.test.ts` — covers UI-04 (seeding logic, placeholder rows, idempotency)
- [ ] `tests/api/projects-patch.test.ts` — covers UI-04 (PATCH handler triggers seeding on status='active')

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sub-tab bar is sticky alongside primary bar during scroll | UI-01 | CSS sticky behavior requires real browser scroll | Load `/customer/[id]?tab=delivery`, scroll down, verify both bars remain visible |
| Browser back/forward preserves active tab state | UI-01 | Navigation history requires real browser | Navigate between tabs, use back button, verify URL and active tab match |
| TypeScript compiler error when registry key missing | UI-03 | Build-time check, not runtime | Temporarily remove one TabType from registry, run `npx tsc --noEmit`, verify error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
