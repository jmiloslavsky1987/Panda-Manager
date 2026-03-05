---
phase: 3
slug: project-setup-action-manager
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) + assert/strict |
| **Config file** | none — test files run directly |
| **Quick run command** | `cd server && node --test routes/actions.test.js routes/workstreams.test.js` |
| **Full suite command** | `cd server && node --test routes/ && cd ../client && node --test src/lib/deriveCustomer.test.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | ACT-01..12 | unit stub | `cd server && node --test routes/actions.test.js` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | SETUP-3 | unit stub | `cd server && node --test routes/workstreams.test.js` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 0 | fixture | fixture update | `cd server && node --test tests/actions.test.js` | ✅ exists | ⬜ pending |
| 3-02-01 | 02 | 1 | ACT-09 (POST) | unit | `cd server && node --test tests/actions.test.js` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | ACT-02,04,05,06,07,11 (PATCH) | unit | `cd server && node --test tests/actions.test.js` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 1 | SETUP-3 (PATCH workstreams) | unit | `cd server && node --test tests/workstreams.test.js` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 1 | SETUP-1,2,3 | struct check | `node -e "require('./client/src/views/ProjectSetup.jsx')"` | ❌ new | ⬜ pending |
| 3-04-01 | 04 | 2 | ACT-01..12 | struct check | `node -e "require('./client/src/views/ActionManager.jsx')"` | ❌ new | ⬜ pending |
| 3-04-02 | 04 | 2 | ACT-08 sort/filter | unit | `cd client && node --test src/lib/deriveCustomer.test.js` | ✅ exists | ⬜ pending |
| 3-05-01 | 05 | 2 | routing | struct check | `node -e "const fs=require('fs'); const m=fs.readFileSync('client/src/main.jsx','utf8'); if(!m.includes('ProjectSetup')) throw new Error('Missing')"` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/actions.test.js` — stubs for ACT-01 through ACT-12 (GET list, POST add, PATCH edit/complete/reopen)
- [ ] `server/tests/workstreams.test.js` — stubs for SETUP-3 (PATCH /api/customers/:id/workstreams)
- [ ] `server/fixtures/sample.yaml` — update workstreams from old 4+2 structure to new 11-subworkstream nested structure matching WORKSTREAM_CONFIG

*All three are new/modified files. No new framework install needed — node:test is built-in.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tag-input adds/removes scope items | SETUP-2 | DOM interaction — tag add/remove in browser | Open /customer/:id/setup, type a tool name in a scope sub-workstream, press Enter, verify tag appears; click × to remove |
| Checkbox moves action to completed table | ACT-02 | DOM/visual interaction | Open /customer/:id/actions, click checkbox on open action, verify it disappears from open table and appears in completed table |
| Overdue date renders red | ACT-05 | CSS visual check | Confirm an action with past due date shows red text in the due column |
| Completed table collapses by default | ACT-10 | Visual/DOM | Page load with completed actions — confirm collapsed state; click to expand |
| Saving... indicator on checkbox | ACT-03 | Timing-dependent | Watch for Saving... badge during checkbox mutation (may be too fast if Drive is quick) |
| Sort by column header | ACT-08 | DOM interaction | Click each column header, verify sort indicator appears and rows reorder |
| CustomerOverview scope tags update after Save | SETUP-2 → CUST-03 | Cross-view | Save Project Setup with scope, navigate to CustomerOverview, verify scope tags appear on sub-workstream rows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
