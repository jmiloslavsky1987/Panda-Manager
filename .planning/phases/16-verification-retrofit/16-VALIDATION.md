---
phase: 16
slug: verification-retrofit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — documentation/audit only phase |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `ls .planning/phases/*/??-VERIFICATION.md` |
| **Full suite command** | `ls .planning/phases/*/??-VERIFICATION.md` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `ls .planning/phases/*/??-VERIFICATION.md`
- **After every plan wave:** Run `ls .planning/phases/*/??-VERIFICATION.md`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 1 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | DATA-01..08, SET-01/03/04 | file_exists | `ls .planning/phases/01-data-foundation/01-VERIFICATION.md` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | SCHED-01..08 | file_exists | `ls .planning/phases/04-job-infrastructure/04-VERIFICATION.md` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 1 | SKILL-02/14, OUT-01..04 | file_exists | `ls .planning/phases/05-skill-engine/05-VERIFICATION.md` | ❌ W0 | ⬜ pending |
| 16-04-01 | 04 | 1 | TIME-01..03 | file_exists | `ls .planning/phases/05.2-time-tracking/05.2-VERIFICATION.md` | ❌ W0 | ⬜ pending |
| 16-05-01 | 05 | 1 | SKILL-10, DASH-04/05 | file_exists | `ls .planning/phases/06-mcp-integrations/06-VERIFICATION.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. This is a documentation-only phase — no test scaffolding needed. Each plan task creates a VERIFICATION.md file, and the verification is the file existence check.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| VERIFICATION.md content accuracy | All phase reqs | gsd-verifier output must be reviewed for correctness | Read each VERIFICATION.md and confirm requirements are addressed with correct status |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 1s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
