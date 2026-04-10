---
phase: 56
slug: teams-tab-alignment-and-orphan-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 56 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.8 |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npm test -- ExtractionPreview ExtractionItemRow ExtractionItemEditForm` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- {modified-component-name}`
- **After every plan wave:** Run `npm test tests/teams/ tests/extraction/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 56-01-01 | 01 | 1 | TEAM-01 | unit | `npm test tests/teams/team-engagement-map.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 56-01-02 | 01 | 1 | TEAM-01 | unit | `npm test tests/teams/team-engagement-map.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 56-01-03 | 01 | 1 | TEAM-01 | unit | `npm test tests/teams/` | ✅ existing (update/delete) | ⬜ pending |
| 56-02-01 | 02 | 1 | TEAM-02 | unit | `npm test -- ExtractionPreview` | ❌ Wave 0 | ⬜ pending |
| 56-02-02 | 02 | 1 | TEAM-02 | unit | `npm test -- ExtractionItemRow` | ❌ Wave 0 | ⬜ pending |
| 56-02-03 | 02 | 1 | TEAM-02 | unit | `npm test -- ExtractionItemEditForm` | ❌ Wave 0 | ⬜ pending |
| 56-03-01 | 03 | 2 | TEAM-01, TEAM-02 | unit | `npm test` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/teams/team-engagement-map.test.tsx` — verify 4 sections rendered, no Architecture section, no numbered badges (TEAM-01)
- [ ] `tests/extraction/extraction-preview-coverage.test.ts` — verify all 21 types in TAB_LABELS + ENTITY_ORDER (TEAM-02)
- [ ] `tests/extraction/extraction-item-row-fields.test.ts` — verify primaryFieldKeys has entries for all 21 entity types (TEAM-02)
- [ ] `tests/extraction/extraction-edit-form-fields.test.ts` — verify ENTITY_FIELDS has entries for all 21 entity types (TEAM-02)
- [ ] Update/delete `tests/teams/engagement-overview.test.tsx` — tests deleted component; delete or adapt to TeamEngagementMap
- [ ] Update/delete `tests/teams/warn-banner-trigger.test.tsx` — tests deleted component; delete or adapt to TeamEngagementMap

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drafts modal shows tabs for all extracted entity types end-to-end | TEAM-02 | Requires real document upload + extraction pipeline run | Upload test document, open Drafts modal, verify all 21 entity type tabs appear for extracted types |
| Teams tab renders 4 sections without Architecture section in browser | TEAM-01 | Visual rendering check | Navigate to Teams tab for any project, verify 4 sections appear with plain headings (no numbers, no Architecture) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
