---
phase: 55
slug: phase-52-integration-test-completion
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
---

# Phase 55 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds (quick), ~120 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 55-01-01 | 01 | 1 | MULTI-PASS-01 | integration | `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts -t "PDF extraction makes 3 Claude calls"` | ✅ (RED stub line 121) | ⬜ pending |
| 55-01-02 | 01 | 1 | MULTI-PASS-01 | integration | `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts -t "text extraction makes 3"` | ✅ (RED stub line 135) | ⬜ pending |
| 55-01-03 | 01 | 1 | MULTI-PASS-02 | integration | `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts -t "allRawItems is a merge"` | ✅ (RED stub line 149) | ⬜ pending |
| 55-01-04 | 01 | 1 | MULTI-PASS-03 | integration | `npm test -- worker/jobs/__tests__/document-extraction-passes.test.ts -t "progress_pct maps to pass ranges"` | ✅ (RED stub line 166) | ⬜ pending |
| 55-02-01 | 02 | 2 | MULTI-PASS-03 | manual | See Manual-Only Verifications table | N/A | ⬜ pending |
| 55-02-02 | 02 | 2 | MULTI-PASS-03 | manual | See Manual-Only Verifications table | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The 4 RED stub tests already exist in `worker/jobs/__tests__/document-extraction-passes.test.ts` (created in Phase 52 Plan 01). Phase 55 upgrades stubs to full implementations — no new test files needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Phase 52 VERIFICATION.md updated to reflect MULTI-PASS-03 SATISFIED | MULTI-PASS-03 | Documentation review, not executable code | Read Phase 52 VERIFICATION.md and verify MULTI-PASS-03 status changed from PARTIAL to SATISFIED |
| 52-03-SUMMARY.md file exists with PASS_LABELS and MULTI-PASS-03 references | MULTI-PASS-03 | Documentation artifact — no runtime behavior to assert | Confirm file exists at `.planning/phases/52-multi-pass-targeted-extraction-for-full-tab-coverage/52-03-SUMMARY.md` and contains the expected sections |
| 52-VERIFICATION.md Gaps Summary updated to "no outstanding gaps" | MULTI-PASS-03 | Prose documentation check, not executable behavior | Read the Gaps Summary section of 52-VERIFICATION.md and confirm it no longer references deferred tests |

> **Note on Plan 02 Nyquist compliance:** Plan 02 tasks are pure documentation work (writing SUMMARY.md and updating VERIFICATION.md). They produce no executable behavior. Nyquist automated verification does not apply to documentation-only tasks. These tasks are covered by the Manual-Only Verifications table above.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are declared manual-only in this table
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (Plan 02 tasks are documentation, explicitly manual)
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
