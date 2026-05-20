---
phase: 87-incident-prevention-track-support
plan: 02
subsystem: ingestion
tags: [onboarding-config, document-extraction, discovery-scanner, incident-prevention, claude-prompt-engineering, vitest]

# Dependency graph
requires: []  # Plan 02 is fully independent of Plan 01 — touches config + prompts only, not DB
provides:
  - "INCIDENT_PREVENTION_ONBOARDING_CONFIG export (4 phases, 13 steps) + step name registry deduplication"
  - "Pass 0/2/3 extraction prompts route arch_node + wbs_task to Incident Prevention track when IP cues are present"
  - "Discovery scan template knows about all three tracks and IP cue vocabulary at the prompt-system level"
affects:
  - "87-03 (project-create WBS seeding) — IP step name registry is now available"
  - "87-05 (retroactive seeding) — can match IP phase/step names against existing documents"
  - "Future extraction runs against change-management documents — arch_node entities for IP track will no longer be silently dropped"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Third-track registry pattern: ADR_ONBOARDING_CONFIG + BIGGY_ONBOARDING_CONFIG + INCIDENT_PREVENTION_ONBOARDING_CONFIG, with ALL_STANDARD_STEP_NAMES spreading + deduplicating across all three"
    - "Prompt-level IP awareness: Pass 0 cue block, Pass 2/3 allowlist widening, wbs_task INFER rule extension — surgical edits inside existing template literals"
    - "Source-scan test pattern (fs.readFileSync against worker/jobs/document-extraction.ts) for prompt-content assertions without importing the postgres-loading worker module"

key-files:
  created:
    - "/Users/jmiloslavsky/Documents/Panda-Manager/tests/ui/onboarding-config.test.ts (gitignored — exists on disk only; 15/15 GREEN)"
    - "/Users/jmiloslavsky/Documents/Panda-Manager/tests/extraction/ip-track-cues.test.ts (gitignored — exists on disk only; 8/8 GREEN)"
    - "/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/phases/87-incident-prevention-track-support/deferred-items.md"
  modified:
    - "/Users/jmiloslavsky/Documents/Panda-Manager/lib/onboarding-config.ts (+25 lines: IP config + step registry extension)"
    - "/Users/jmiloslavsky/Documents/Panda-Manager/worker/jobs/document-extraction.ts (+16/-11 lines: Pass 0 cue block + arch_node allowlist + wbs_task INFER rule)"
    - "/Users/jmiloslavsky/Documents/Panda-Manager/lib/discovery-scanner.ts (+2 lines: three-track preamble + IP cue list)"

key-decisions:
  - "Used .filter dedup intentionally for ALL_STANDARD_STEP_NAMES: Kickoff / Single Sign-On / Go Live overlap with ADR/Biggy → IP track shows 3 fewer unique entries (10 unique additions, 3 deduped), but all 13 IP step names are present in the array as required by IP-05"
  - "Phase display_orders [1, 3, 5, 6] mirror ADR/Biggy cadence — leaves gaps for future inserted phases without renumbering downstream consumers"
  - "Case A applied to discovery-scanner.ts: builder is generic (iterates existingStructure.tracks with no hardcoded literals); only the DISCOVERY_SYSTEM_TEMPLATE preamble needed an IP-aware comment — no builder code change"
  - "Pass 0 cue block placed between STEP 2 and STEP 3 (not appended after STEP 3) so track classification guidance lives adjacent to entity-type prediction — natural read order"
  - "wbs_task INFER rule kept 'Default to ADR if unclear' fallback unchanged — IP track requires affirmative cue evidence (change-ticket/CAB/risk-score etc); silent IP routing without cues would over-fire"
  - "Three product tracks named explicitly in discovery-scanner template comment so Claude is IP-aware even before existingStructureBlock substitution (which only surfaces tracks that already exist for the project)"

patterns-established:
  - "Three-track config-export contract: third PhaseConfig follows the ADR/Biggy shape exactly — phase names match ADR/Biggy where overlapping (Discovery & Kickoff, Platform Configuration, Validation, Go-Live)"
  - "Prompt edit safety: each 'AI Assistant Track' occurrence audited individually; final count is 7 (ADR/AI Assistant) and 8 (Incident Prevention) — IP appears once extra in the Pass 0 cue block. Verified backticks remain even (122 → 122) — no template-literal corruption"

requirements-completed: [IP-04, IP-05, IP-14]

# Metrics
duration: 4 min
completed: 2026-05-20
---

# Phase 87 Plan 02: Configuration & Extraction Layer for Incident Prevention Track Summary

**Incident Prevention onboarding registry (4 phases, 13 steps) added to lib/onboarding-config.ts; document-extraction prompts (Pass 0/2/3) now classify and route arch_node + wbs_task entities to the Incident Prevention track; discovery-scanner template surfaces all three tracks to Claude.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-20T02:15:40Z
- **Completed:** 2026-05-20T02:20:18Z
- **Tasks:** 3 / 3
- **Files modified:** 3 source files + 2 test files (gitignored) + 1 deferred-items.md

## Accomplishments

- **IP-04:** `INCIDENT_PREVENTION_ONBOARDING_CONFIG` exported as a `PhaseConfig[]` with exactly 4 phases (Discovery & Kickoff, Platform Configuration, Validation, Go-Live) and 13 steps; mirrors ADR/Biggy `display_order` cadence `[1, 3, 5, 6]`.
- **IP-05:** `ALL_STANDARD_STEP_NAMES` spreads all three configs and deduplicates via `.filter`; all 13 IP step names are present in the resulting array (10 unique additions; `Kickoff`, `Single Sign-On`, `Go Live` overlap with ADR/Biggy and dedup correctly).
- **IP-14:** Document-extraction prompts now route Incident Prevention content:
  - Pass 0 PASS_0_PROMPT gains a TRACK CLASSIFICATION CUES block listing strong cues (change ticket, change request, ServiceNow change, JSM change, risk score, change risk, CAB, change advisory board) and supporting cues (blast radius, CI, freeze window, blackout window, 5-category, weighted risk, risk engine, approval workflow, change approval) for Incident Prevention routing.
  - Pass 2 + Pass 3 arch_node `ONLY valid values` allowlist widened from 2 → 3 tracks.
  - arch_node entity-type schema lines (2 occurrences) updated to `"ADR Track" | "AI Assistant Track" | "Incident Prevention Track"` with `Change Risk Console` example added.
  - wbs_task INFER-from-context rule (4 occurrences) now routes `"Incident Prevention"` when document contains change-management cues; `"ADR" default if unclear` preserved.
- **Discovery scanner (Case A):** existing-structure builder is already generic — only the DISCOVERY_SYSTEM_TEMPLATE preamble received a three-track-aware comment plus IP cue list. No builder change needed.

## Task Commits

1. **Task 1: Extend lib/onboarding-config.ts with INCIDENT_PREVENTION_ONBOARDING_CONFIG** — `ab0180eb` (feat)
2. **Task 2: Add IP cues to worker/jobs/document-extraction.ts prompts** — `c65b2797` (feat)
3. **Task 3: Update lib/discovery-scanner.ts DISCOVERY_SYSTEM_TEMPLATE existing-structure block** — `51a73da3` (feat)

_Note: test files are gitignored per [79-00] project convention — they exist on-disk only at `tests/ui/onboarding-config.test.ts` and `tests/extraction/ip-track-cues.test.ts`._

## Files Created/Modified

- `/Users/jmiloslavsky/Documents/Panda-Manager/lib/onboarding-config.ts` — Adds `INCIDENT_PREVENTION_ONBOARDING_CONFIG` export and extends `ALL_STANDARD_STEP_NAMES` with the new IP step list.
- `/Users/jmiloslavsky/Documents/Panda-Manager/worker/jobs/document-extraction.ts` — Pass 0 cue block, arch_node allowlist widening (4 places), wbs_task INFER rule extension (4 places), Pass 3 reference line, arch_node disambiguation lines.
- `/Users/jmiloslavsky/Documents/Panda-Manager/lib/discovery-scanner.ts` — Three-track preamble + IP cue list inside `DISCOVERY_SYSTEM_TEMPLATE`.
- `/Users/jmiloslavsky/Documents/Panda-Manager/tests/ui/onboarding-config.test.ts` — 15 tests for IP-04 + IP-05 (gitignored).
- `/Users/jmiloslavsky/Documents/Panda-Manager/tests/extraction/ip-track-cues.test.ts` — 8 tests for IP-14 (gitignored).
- `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/phases/87-incident-prevention-track-support/deferred-items.md` — Logs out-of-scope discovery test failures.

## IP Step Names + Overlap Analysis (per `<output>` request)

| # | Step Name | Phase | Overlap with ADR/Biggy? |
|---|-----------|-------|------------------------|
| 1 | Kickoff | Discovery & Kickoff | YES — ADR + Biggy both have Kickoff |
| 2 | Change Process Discovery | Discovery & Kickoff | No (IP unique) |
| 3 | ITSM Audit | Discovery & Kickoff | No (IP unique) |
| 4 | Single Sign-On | Discovery & Kickoff | YES — ADR + Biggy both have Single Sign-On |
| 5 | ITSM Integration | Platform Configuration | No (IP unique) |
| 6 | Data Source Connectors | Platform Configuration | No (IP unique) |
| 7 | Risk Categories & Weights | Platform Configuration | No (IP unique) |
| 8 | Write-Back Setup | Platform Configuration | No (IP unique) |
| 9 | Historical Backtest | Validation | No (IP unique) |
| 10 | Live Scoring UAT | Validation | No (IP unique) |
| 11 | Threshold Tuning | Validation | No (IP unique) |
| 12 | Go Live | Go-Live | YES — ADR + Biggy both have Go Live |
| 13 | CAB Enablement | Go-Live | No (IP unique) |

**Summary:** 10 unique IP step names, 3 overlap with ADR/Biggy. Dedup via `.filter` is intentional — IP-05 only requires all 13 IP names ARE PRESENT in `ALL_STANDARD_STEP_NAMES`, not that all 13 produce unique entries.

## Insertion Counts in document-extraction.ts (per `<output>` request)

- `grep -c 'Incident Prevention Track' worker/jobs/document-extraction.ts` → **8** matches
- `grep -c 'AI Assistant Track' worker/jobs/document-extraction.ts` → **7** matches (preserved; every occurrence now has an IP sibling within ~50 chars except the Pass 0 cue block which lists IP without re-mentioning AI Assistant — by design, separate guidance section)

Total IP-aware lines added across the file: 7 distinct semantic locations (Pass 0 cue block, line 153 allowlist, line 271 allowlist, line 115 arch_node schema, line 262 arch_node schema, line 141 disambig, line 269 disambig, line 341 reference, lines 114/145/329/338 wbs_task INFER).

## Discovery-Scanner Case Analysis (per `<output>` request)

**Case A applied.** The existing-structure builder in `runDiscoveryScan()` (lib/discovery-scanner.ts:140–) is fully generic — it iterates `existingStructure.tracks`, `existingStructure.workflows`, `existingStructure.sections` with no hardcoded `'ADR'` / `'Biggy'` / `'AI Assistant'` literals. Verified via `grep` against the function body. No builder code change required.

What was added: a single-sentence three-track preamble comment inside `DISCOVERY_SYSTEM_TEMPLATE` (immediately before the `{existingStructureBlock}` placeholder) that names all three product tracks and lists IP-routing cues. This ensures Claude is aware of the Incident Prevention track at the prompt level even when a particular project's `existingStructure` payload hasn't yet been seeded with IP arch_tracks (i.e. Plan 01 backfill hasn't run on that project yet).

## Decisions Made

See `key-decisions` in frontmatter.

## Deviations from Plan

None — plan executed exactly as written. Each task verification command passed on first attempt:
- Task 1 verify: 3/3 grep checks passed; 15/15 vitest GREEN.
- Task 2 verify: 5/5 grep checks passed; 8/8 vitest GREEN; full extraction suite 28/28 GREEN (no regressions).
- Task 3 verify: 1/1 grep check passed; Case A confirmed.

## Issues Encountered

Pre-existing discovery test failures (`tests/discovery/dismiss.test.ts` 3 failures, `tests/discovery/queue.test.ts` 5 failures) surfaced during Task 3 verification but are unrelated to my changes. Confirmed via `git stash` repro — failures reproduce identically without Plan 87-02 edits. Root cause: `lib/auth-server.ts:39` `h.forEach()` called on undefined `Headers` because `vi.mocked(nextHeaders).mockResolvedValue(new Headers())` is missing from these specific test files. Logged in `deferred-items.md` for a future test-mock-fix plan; not in scope for Plan 87-02 (which touches only lib/onboarding-config.ts, worker/jobs/document-extraction.ts, lib/discovery-scanner.ts).

## User Setup Required

None — no external service configuration required. All three changes are code-only and surface their effect via the next document-extraction run + the next discovery scan.

## Next Phase Readiness

- Plan 03 (project-create WBS seeding for IP) can now reference `INCIDENT_PREVENTION_ONBOARDING_CONFIG` directly from `lib/onboarding-config.ts` for its 11 L1 / ~39 L2 task seed.
- Plan 05 (retroactive seeding) can now match IP phase/step names against existing documents using the registry.
- Future document-extraction runs against change-management documents will route arch_node entities to "Incident Prevention Track" instead of silently dropping them.
- Plan 01 (DB migration) lands independently — when both Plan 01 and Plan 02 are in place, IP projects will show end-to-end IP track support across config + extraction + discovery surfaces.

## Self-Check: PASSED

- All 3 source files exist on disk and were modified as documented.
- All 2 test files exist on disk (gitignored; verified via `[ -f ]`).
- SUMMARY.md and deferred-items.md exist on disk.
- All 3 task commits (`ab0180eb`, `c65b2797`, `51a73da3`) exist in git log.

---
*Phase: 87-incident-prevention-track-support*
*Completed: 2026-05-20*
