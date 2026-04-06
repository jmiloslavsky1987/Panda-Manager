---
phase: 4
slug: structured-write-views
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node 24.14.0) + supertest 7.2.2 |
| **Config file** | none — invoked directly |
| **Quick run command** | `cd server && node --test routes/artifacts.test.js routes/history.test.js` |
| **Full suite command** | `cd server && node --test routes/*.test.js` |
| **Estimated runtime** | ~300ms |

---

## Sampling Rate

- **After every task commit:** Run `cd server && node --test routes/artifacts.test.js routes/history.test.js`
- **After every plan wave:** Run `cd server && node --test routes/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~300ms

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | ART-02, ART-03, ART-04 | stub | `cd server && node --test routes/artifacts.test.js` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 0 | UPD-04 | stub | `cd server && node --test routes/history.test.js` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | ART-02 | integration | `cd server && node --test routes/artifacts.test.js` | W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | ART-03, ART-04, ART-05 | integration | `cd server && node --test routes/artifacts.test.js` | W0 | ⬜ pending |
| 4-03-01 | 03 | 1 | UPD-04 | integration | `cd server && node --test routes/history.test.js` | W0 | ⬜ pending |
| 4-04-01 | 04 | 2 | UPD-01, UPD-02, UPD-03, UPD-05 | manual | visual checkpoint | N/A | ⬜ pending |
| 4-05-01 | 05 | 2 | ART-01, ART-03, ART-05 | manual | visual checkpoint | N/A | ⬜ pending |
| 4-06-01 | 06 | 3 | ALL | full-suite + manual | `cd server && node --test routes/*.test.js` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/routes/artifacts.test.js` — stubs for ART-02, ART-03, ART-04, ART-05
- [ ] `server/routes/history.test.js` — stubs for UPD-04

*Existing infrastructure covers all other phase requirements (node:test, supertest already installed).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Weekly Update Form renders 11 workstream sections | UPD-01, UPD-02 | No jsdom in project | Navigate to `/customer/:id/update`, verify ADR (6) + Biggy (5) sections visible with date pre-filled |
| Form submit prepends history entry + redirect | UPD-04, UPD-05 | Navigation behavior requires browser | Submit form → confirm CustomerOverview "Last Updated" reflects new entry |
| "Progress summary" textarea present in form | UPD-03 | UI render only | Verify decisions + outcomes textarea fields visible in form |
| ArtifactManager table lists all artifacts | ART-01 | Browser render | Navigate to `/customer/:id/artifacts`, confirm table with id/type/title/status/owner/last_updated |
| Inline editing in ArtifactManager | ART-03 | Optimistic UI timing | Click title cell → edit → blur → confirm Saving... → value persists |
| Add Artifact → X-### ID assigned | ART-02 | Requires real Drive round-trip | Add row → Save → confirm X-### ID in table |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (artifacts.test.js, history.test.js)
- [ ] No watch-mode flags
- [ ] Feedback latency < 400ms
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
