---
phase: 7
slug: smart-data-flow-and-customer-onboarding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (server) |
| **Config file** | server/package.json — `"test": "node --test --test-reporter spec routes/*.test.js services/*.test.js"` |
| **Quick run command** | `cd server && node --test --test-reporter spec routes/*.test.js services/*.test.js 2>&1 \| tail -5` |
| **Full suite command** | `cd server && node --test --test-reporter spec routes/*.test.js services/*.test.js` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 0 | MGT-01 | unit stub | `cd server && node --test routes/customers.test.js 2>&1 \| tail -5` | ❌ W0 | ⬜ pending |
| 7-02-01 | 02 | 1 | MGT-01 | unit | `cd server && node --test routes/customers.test.js 2>&1 \| tail -10` | ❌ W0 | ⬜ pending |
| 7-03-01 | 03 | 1 | MGT-02 | manual | browse /customer/:id/artifacts | ✅ | ⬜ pending |
| 7-04-01 | 04 | 2 | MGT-03 | manual | browse /customer/:id/reports + Weekly Status flow | ✅ | ⬜ pending |
| 7-05-01 | 05 | 3 | MGT-04 | manual | generate ELT deck with timeline selector | ✅ | ⬜ pending |
| 7-06-01 | 06 | 4 | MGT-05 | manual | browse /customer/:id/setup | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/routes/customers.test.js` — POST /api/customers stub (new customer creation endpoint)

*Existing server test suite covers regression guard for all other server routes.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| New customer creation form with optional YAML upload | MGT-01 | File upload is a browser interaction | 1. Click "New Customer" in sidebar. 2. Enter name. 3. Optionally drop a YAML file. 4. Submit. 5. Verify customer appears in sidebar. |
| Extended artifact types display and grouping | MGT-02 | UI grouping/filtering is visual | 1. Open Artifact Manager for a customer. 2. Add artifacts of types workflow-decision, team-contact, backlog-item. 3. Verify type grouping/filtering works. |
| Weekly Status inline entry in Reports | MGT-03 | Multi-step UI flow | 1. Go to Reports. 2. Select Weekly Status. 3. Verify form renders pre-filled. 4. Edit, generate, optionally save. |
| ELT deck timeline selector + pre-population | MGT-04 | Visual slide content | 1. Generate Internal ELT deck. 2. Verify date picker present. 3. Change date, re-generate, verify different data. |
| Project Setup auto-fill from YAML | MGT-05 | UI pre-fill behavior | 1. Open Project Setup for customer with complete YAML. 2. Verify Customer Name, Project/Program Name, and Go-Live Date fields are all pre-populated from YAML values. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
