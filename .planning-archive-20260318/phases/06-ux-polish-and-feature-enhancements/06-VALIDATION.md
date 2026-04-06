---
phase: 6
slug: ux-polish-and-feature-enhancements
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, no install needed) |
| **Config file** | none — run directly via `node --test` |
| **Quick run command** | `cd server && node --test --test-reporter spec routes/*.test.js services/*.test.js` |
| **Full suite command** | `cd server && node --test --test-reporter spec routes/*.test.js services/*.test.js` |
| **Estimated runtime** | ~3 seconds |

Note: Client-side UX changes are verified manually. Automated tests apply to new server endpoints and logic bug fixes only.

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-W0-01 | Wave 0 | 0 | UX-08 | unit | `cd server && node --test routes/risks.test.js` | ✅ (needs new POST cases) | ⬜ pending |
| 6-W0-02 | Wave 0 | 0 | UX-08 | unit | `cd server && node --test routes/milestones.test.js` | ✅ (needs new POST cases) | ⬜ pending |
| 6-W0-03 | Wave 0 | 0 | UX-07 | unit | create client/src/lib/reportGenerator.test.js | ❌ needs stub | ⬜ pending |
| 6-01 | TBD | 1 | UX-01 | manual | browser inspection | N/A | ⬜ pending |
| 6-02 | TBD | 1 | UX-02 | manual | browser inspection | N/A | ⬜ pending |
| 6-03 | TBD | 1 | UX-03 | manual | browser inspection | N/A | ⬜ pending |
| 6-04 | TBD | 1 | UX-04 | manual | browser — navigate away with unsaved changes | N/A | ⬜ pending |
| 6-05 | TBD | 1 | UX-05 | manual | browser — amber banner visible in YAML Editor | N/A | ⬜ pending |
| 6-06 | TBD | 1 | UX-06 | manual | browser — .txt download triggers save dialog | N/A | ⬜ pending |
| 6-07 | TBD | 2 | UX-07 | manual | dashboard shows overdue roll-up count | N/A | ⬜ pending |
| 6-08 | TBD | 2 | UX-08 | integration | `cd server && node --test routes/risks.test.js routes/milestones.test.js` | ✅ | ⬜ pending |
| 6-09 | TBD | 2 | UX-09 | manual | browser — history timeline at /customer/:id/history | N/A | ⬜ pending |
| 6-10 | TBD | 2 | UX-10 | manual | visual comparison across all 7 views | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/routes/risks.test.js` — add test cases for `POST /api/customers/:id/risks` (create with R-### ID)
- [ ] `server/routes/milestones.test.js` — add test cases for `POST /api/customers/:id/milestones` (create with M-### ID)
- [ ] `client/src/lib/reportGenerator.test.js` — create stub; test that `buildPanel()` matches actions to correct workstream group (regression guard for buildPanel bug fix)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Loading skeletons render on slow connections | UX-01 | Visual, requires simulated slow network | DevTools → Network → Slow 3G → reload any view |
| Empty states render for customers with no actions/artifacts | UX-02 | Requires data setup | Use a customer YAML with empty arrays |
| Back-navigation / breadcrumbs work | UX-03 | Interaction flow | Navigate deeply, use browser back button |
| YAML Editor navigate-away warning fires | UX-04 | Browser dialog, not automatable | Make a change, click another nav link |
| YAML Editor strips-comments banner visible | UX-05 | Visual render check | Open YAML Editor, look for amber banner |
| Weekly Status .txt download triggers | UX-06 | Browser file API | Generate Weekly Status, click Download .txt |
| Dashboard overdue roll-up panel shows correct data | UX-07 | Data accuracy | Add overdue actions in ActionManager, check Dashboard |
| History Timeline shows entries in order | UX-09 | Visual render | Navigate to /customer/:id/history |
| Visual consistency across all views | UX-10 | Cross-view comparison | Walk through all 7 views |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
