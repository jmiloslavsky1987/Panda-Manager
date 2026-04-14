---
phase: 48
slug: architecture-team-engagement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 48 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test tests/arch/ tests/teams/ -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test tests/arch/ tests/teams/ -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 48-01-01 | 01 | 0 | ARCH-01 | integration | `npm test tests/arch/arch-nodes-wiring.test.ts -- --run` | ❌ W0 | ⬜ pending |
| 48-01-02 | 01 | 0 | ARCH-02 | integration | `npm test tests/arch/status-cycle.test.ts -- --run` | ❌ W0 | ⬜ pending |
| 48-02-01 | 02 | 0 | TEAM-01 | integration | `npm test tests/teams/engagement-overview.test.ts -- --run` | ❌ W0 | ⬜ pending |
| 48-02-02 | 02 | 0 | TEAM-03 | unit | `npm test tests/teams/warn-banner-trigger.test.ts -- --run` | ❌ W0 | ⬜ pending |
| 48-02-03 | 02 | 1 | TEAM-04 | manual-only | Visual inspection: no edit controls in Overview sub-tab | Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/arch/arch-nodes-wiring.test.ts` — stubs for ARCH-01 (getArchNodes query integration)
- [ ] `tests/arch/status-cycle.test.ts` — stubs for ARCH-02 (PATCH /arch-nodes/[nodeId] status update)
- [ ] `tests/arch/column-reorder.test.ts` — stubs for drag API (PATCH /arch-nodes/reorder)
- [ ] `tests/teams/engagement-overview.test.ts` — stubs for TEAM-01 (4-section render with getTeamsTabData)
- [ ] `tests/teams/warn-banner-trigger.test.ts` — stubs for TEAM-03 (zero-length array detection)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Read-only snapshot has no edit controls | TEAM-04 | DOM-level absence of interactive elements best verified visually | Navigate to Team Engagement Overview sub-tab → confirm no buttons/inputs/edit icons present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
