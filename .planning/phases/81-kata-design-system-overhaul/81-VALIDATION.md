---
phase: 81
slug: kata-design-system-overhaul
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 81 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (vitest.config.ts at `/Users/jmiloslavsky/Documents/Panda-Manager/vitest.config.ts`) |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npx vitest run --reporter=verbose tests/kds/ tests/components/sidebar-daily-prep.test.ts` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose tests/kds/ tests/components/sidebar-daily-prep.test.ts`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 81-00-01 | 00 | 0 | KDS-01 | unit (source scan) | `npx vitest run tests/kds/token-import.test.ts` | ❌ W0 | ⬜ pending |
| 81-01-01 | 01 | 0 | KDS-02 | unit (source scan) | `npx vitest run tests/kds/icon-migration.test.ts` | ❌ W0 | ⬜ pending |
| 81-02-01 | 02 | 1 | KDS-03 | unit (source scan) | `npx vitest run tests/components/sidebar-daily-prep.test.ts` | ✅ EXISTS | ⬜ pending |
| 81-02-02 | 02 | 1 | KDS-03 | unit (source scan) | `npx vitest run tests/kds/command-rail.test.ts` | ❌ W0 | ⬜ pending |
| 81-02-03 | 02 | 1 | KDS-04 | unit (source scan) | `npx vitest run tests/kds/page-bar.test.ts` | ❌ W0 | ⬜ pending |
| 81-03-01 | 03 | 2 | KDS-05 | unit (source scan) | `npx vitest run tests/kds/portfolio-layout.test.ts` | ❌ W0 | ⬜ pending |
| 81-04-01 | 04 | 2 | KDS-06 | unit (source scan) | `npx vitest run tests/kds/workspace-kpi.test.ts` | ❌ W0 | ⬜ pending |
| 81-05-01 | 05 | 3 | KDS-07 | unit (source scan) | `npx vitest run tests/kds/icon-migration.test.ts` | ❌ W0 | ⬜ pending |
| 81-05-02 | 05 | 3 | KDS-08 | unit (source scan) | `npx vitest run tests/kds/theme-persistence.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/kds/token-import.test.ts` — KDS-01: verifies `@import` of kata-tokens.css in globals.css and presence of `@theme inline` aliases
- [ ] `tests/kds/icon-migration.test.ts` — KDS-02 + KDS-07: scans all 22 lucide-react import files for removal; verifies Icon.tsx exists; verifies no lucide-react imports remain in non-Architecture components
- [ ] `tests/kds/command-rail.test.ts` — KDS-03: verifies Sidebar.tsx contains `data-theme="dark"`, ⌘K search pill markup, and top nav links (Portfolio/Today/Daily Prep)
- [ ] `tests/kds/page-bar.test.ts` — KDS-04: verifies PageBarContext.tsx exists; verifies PageBar.tsx contains theme toggle button and ctaSlot render
- [ ] `tests/kds/portfolio-layout.test.ts` — KDS-05: scans app/page.tsx source for hero stat band, briefing strip, and project grid component imports
- [ ] `tests/kds/workspace-kpi.test.ts` — KDS-06: verifies WorkspaceKpiStrip.tsx exists with 5-column grid structure
- [ ] `tests/kds/theme-persistence.test.ts` — KDS-08: verifies ThemeProvider.tsx uses `'kata-theme'` localStorage key; verifies inline flash-prevention script in layout.tsx

*Note: `tests/components/sidebar-daily-prep.test.ts` already exists (KDS-03 partial) — verify it still passes after Command Rail rebuild.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All 11 workspace tabs functional after rebuild | KDS-07 | Browser rendering required; Next.js Server Components can't render in vitest node env | Open each workspace tab (Overview, Plan, Gantt, Stakeholders, Risks, Decisions, Artifacts, Skills, Time, Daily Prep, Settings) and confirm data loads, forms submit, navigation works |
| Command Rail always dark in light mode | KDS-03 | Visual rendering check | Toggle to light mode; verify rail stays dark gray-950 while main canvas inverts |
| JBM numerals rendered correctly | KDS-02 | Font rendering check | Inspect KPI numbers in workspace (should be JetBrains Mono) and project list go-live dates in rail |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
