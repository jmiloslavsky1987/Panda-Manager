---
phase: 57
slug: extraction-intelligence-for-unstructured-notes
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-11
---

# Phase 57 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `bigpanda-app/vitest.config.ts` (existing) |
| **Quick run command** | `cd bigpanda-app && npm test -- extraction-prompts --run` |
| **Full suite command** | `cd bigpanda-app && npm test --run` |
| **Estimated runtime** | ~5s (quick), ~45s (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npm test -- extraction-prompts --run`
- **After every plan wave:** Run `cd bigpanda-app && npm test --run`
- **Before `/gsd:verify-work`:** Full suite must be green (6 pre-existing failures allowed)
- **Max feedback latency:** 5 seconds (quick), 45 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 57-00-01 | 00 | 1 | SYNTH-01–05 | unit (RED stubs) | `npm test -- extraction-prompts --run` | ✅ | ⬜ pending |
| 57-01-01 | 01 | 2 | SYNTH-01, SYNTH-05 | unit | `npm test -- extraction-prompts --run` | ✅ | ⬜ pending |
| 57-01-02 | 01 | 2 | SYNTH-02, SYNTH-03 | unit | `npm test -- extraction-prompts --run` | ✅ | ⬜ pending |
| 57-01-03 | 01 | 2 | SYNTH-04 | unit | `npm test -- extraction-prompts --run` | ✅ | ⬜ pending |
| 57-01-04 | 01 | 2 | SYNTH-01–05 | unit (full) | `npm test --run` | ✅ | ⬜ pending |
| 57-01-05 | 01 | 2 | SYNTH-01–05 | manual | Upload transcript doc, check Drafts modal | N/A — checkpoint | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/ingestion/extraction-prompts.test.ts` — 8 new RED stubs for SYNTH-01 through SYNTH-05
  - SYNTH-01: EXTRACTION_BASE inference posture
  - SYNTH-02: PASS_0_PROMPT document_type XML tag
  - SYNTH-03: PASS_0_PROMPT likely_entity_types XML tag
  - SYNTH-04: transcript-mode instructions in PASS_PROMPTS[1], [2], [3] (3 tests)
  - SYNTH-05: confidence calibration range, weekly_focus SINGLETON, before_state SINGLETON, e2e_workflow scattered assembly (4 tests)

*PASS_0_PROMPT is already exported from document-extraction.ts (line 312) — no export change needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Weekly focus synthesized from project signals (not verbatim) | SYNTH-05 | Requires live Claude API call + real document | Upload transcript doc via Context Upload; verify weekly_focus bullets are action-oriented synthesized phrases, not copied text |
| Before_state inferred from pain-point language | SYNTH-01 | Requires live Claude API call + real document | Upload transcript with "before BigPanda" or pain-point language; verify before_state entity appears with inferred fields |
| Confidence 0.5-0.7 for inferred entities | SYNTH-05 | Requires live extraction output inspection | After upload, check entity confidence scores in Drafts modal — synthesized entities should show below 0.8 |
| Document type correctly classified by Pass 0 | SYNTH-02 | Requires live Claude API call | Inspect terminal logs during extraction — Pass 0 output should contain `<document_type>transcript</document_type>` for a meeting note file |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (no MISSING stubs — test file exists)
- [x] No watch-mode flags
- [x] Feedback latency < 5s (quick) / 45s (full)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — set to approved after Wave 0 RED stubs confirmed (Plan 57-00 complete)
