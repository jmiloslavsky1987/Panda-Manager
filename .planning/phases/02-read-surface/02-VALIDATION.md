---
phase: 2
slug: read-surface
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node 18+) for server; browser DevTools for client |
| **Config file** | none — node:test built-in |
| **Quick run command** | `node --test server/services/yamlService.test.js` |
| **Full suite command** | `node --test server/services/yamlService.test.js && node --test server/__tests__/routes.test.js` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test server/services/yamlService.test.js`
- **After every plan wave:** Run full suite (yamlService + routes tests)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 02-01-T1 | 01 | 1 | DASH-01..08 | integration | `node --test server/services/yamlService.test.js` | ⬜ pending |
| 02-01-T2 | 01 | 1 | DASH-01..08 | manual | Browser: http://localhost:3000 shows grid of customer cards | ⬜ pending |
| 02-02-T1 | 02 | 1 | CUST-01 | manual | Browser: sidebar shows customer list, active highlighted | ⬜ pending |
| 02-02-T2 | 02 | 1 | CUST-02..05 | manual | Browser: CustomerOverview shows workstream health cards | ⬜ pending |
| 02-02-T3 | 02 | 1 | CUST-06 | manual | Browser: open actions summary section visible | ⬜ pending |
| 02-03-T1 | 03 | 2 | CUST-07 | integration | `node --test server/__tests__/routes.test.js` (risks PATCH) | ⬜ pending |
| 02-03-T2 | 03 | 2 | CUST-08 | integration | `node --test server/__tests__/routes.test.js` (milestones PATCH) | ⬜ pending |
| 02-03-T3 | 03 | 2 | CUST-09..10 | manual | Browser: edit risk field → Saving... → confirmed | ⬜ pending |
| 02-04-T1 | 04 | 2 | UI-01..03 | manual | Browser: responsive layout, Tailwind classes applied | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/__tests__/routes.test.js` — stubs for PATCH /api/customers/:id/risks/:riskId and PATCH /api/customers/:id/milestones/:milestoneId
- [ ] Wave 0 tests must exit 0 before Wave 1 implementation begins

*Note: yamlService.test.js already exists from Phase 1 — no new Wave 0 for existing tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard card grid renders with real Drive data | DASH-01..08 | Requires Drive credentials + real YAML files | Run npm run dev, open localhost:3000, confirm cards appear with correct name/status/counts |
| Customer Overview workstream cards | CUST-03..05 | Requires real history[] data from Drive | Navigate to a real customer overview, confirm ADR/Biggy workstream cards with sub-rows |
| Inline edit "Saving..." indicator | CUST-09 | TanStack Query mutation state is visual/timing | Edit a risk field, confirm "Saving..." appears, confirm Drive write succeeds |
| Sidebar customer navigation | CUST-01..02 | Requires Drive data + React Router active state | Click customer in sidebar, confirm URL changes and active state highlights |
| Sort order: At Risk first | DASH-03 | Requires 2+ customers with different statuses | Needs real Drive data with mixed statuses or sample.yaml fixture |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
