---
phase: 53
slug: extraction-prompt-intelligence-and-pipeline-completion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 53 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 29.x |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/ingestion/ --reporter=verbose` |
| **Full suite command** | `cd bigpanda-app && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds (quick) / ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/ingestion/ --reporter=verbose`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 53-01-01 | 01 | 0 | EXTR-02 to EXTR-11 | unit stub | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-prompts.test.ts --reporter=verbose` | ❌ Wave 0 | ⬜ pending |
| 53-01-02 | 01 | 0 | EXTR-08, EXTR-09 | unit stub | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-job.test.ts --reporter=verbose` | ❌ Wave 0 | ⬜ pending |
| 53-01-03 | 01 | 0 | EXTR-10 | schema | migration verification | ❌ Wave 0 | ⬜ pending |
| 53-02-01 | 02 | 1 | EXTR-02 | unit | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-prompts.test.ts -t "document-first"` | ❌ Wave 0 | ⬜ pending |
| 53-02-02 | 02 | 1 | EXTR-03 | unit | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-prompts.test.ts -t "few-shot"` | ❌ Wave 0 | ⬜ pending |
| 53-02-03 | 02 | 1 | EXTR-04 | unit | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-prompts.test.ts -t "field-level"` | ❌ Wave 0 | ⬜ pending |
| 53-02-04 | 02 | 1 | EXTR-05 | unit | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-prompts.test.ts -t "status-table"` | ❌ Wave 0 | ⬜ pending |
| 53-02-05 | 02 | 1 | EXTR-06 | unit | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-prompts.test.ts -t "date-null"` | ❌ Wave 0 | ⬜ pending |
| 53-02-06 | 02 | 1 | EXTR-07 | unit | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-prompts.test.ts -t "self-check"` | ❌ Wave 0 | ⬜ pending |
| 53-03-01 | 03 | 1 | EXTR-08 | unit | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-job.test.ts -t "tool-use"` | ❌ Wave 0 | ⬜ pending |
| 53-03-02 | 03 | 1 | EXTR-09 | unit | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-job.test.ts -t "chunk-overlap"` | ❌ Wave 0 | ⬜ pending |
| 53-03-03 | 03 | 1 | EXTR-10 | unit | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-job.test.ts -t "coverage"` | ❌ Wave 0 | ⬜ pending |
| 53-04-01 | 04 | 2 | EXTR-11 | unit | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-job.test.ts -t "pass-0"` | ❌ Wave 0 | ⬜ pending |
| 53-05-01 | 05 | 2 | EXTR-12 to EXTR-16 | unit verify | `cd bigpanda-app && npx vitest run tests/ingestion/write.test.ts --reporter=verbose` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/ingestion/extraction-prompts.test.ts` — RED stubs for EXTR-02 through EXTR-07 (source inspection tests verifying prompt content)
- [ ] `bigpanda-app/tests/ingestion/extraction-job.test.ts` — RED stubs for EXTR-08 (tool use), EXTR-09 (chunk overlap), EXTR-10 (coverage), EXTR-11 (pass 0)
- [ ] DB migration for `coverage_json` jsonb column on `extraction_jobs` table (EXTR-10 storage)

*(Existing `tests/ingestion/write.test.ts` covers EXTR-12/13/14/16 verify — check before adding stubs)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Extraction quality improved after prompt changes | EXTR-02 to EXTR-07 | Claude output is non-deterministic | Upload test doc after changes, verify more entities extracted vs. baseline |
| Pass 0 pre-analysis surfaces in extraction | EXTR-11 | Live Claude call required | Upload dense document, verify Pass 0 runs, check that later passes have richer output |
| team_engagement data surfaces in Teams tab | EXTR-15 | UI component investigation needed | Check TeamEngagementMap internals; verify teams tab shows teamEngagementSections data |
| Tool use returns valid structured entities | EXTR-08 | Live Claude call required | Upload test doc, verify extraction job completes with tool use response (no jsonrepair errors) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
