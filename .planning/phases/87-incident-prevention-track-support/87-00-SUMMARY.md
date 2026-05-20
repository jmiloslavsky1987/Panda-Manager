---
phase: 87-incident-prevention-track-support
plan: 00
subsystem: testing
tags: [vitest, source-scan, red-tests, nyquist, incident-prevention]

requires:
  - phase: 79-calendar-integration
    provides: tests/-gitignored convention + source-scan pattern with fs.readFileSync try/catch ENOENT
  - phase: 85.2-daily-briefing-tab
    provides: source-scan ENOENT-safe stub pattern (no import crashes in RED state)
  - phase: 86-multi-user-sso-aws-readiness
    provides: vitest mock contract conventions + RBAC source-scan baseline

provides:
  - Wave 0 RED test scaffolds for every automated Phase 87 requirement (IP-03..IP-14)
  - 6 new test files + 1 extended test file (seed-project.test.ts)
  - 12 named failing test cases covering IP-06, IP-07, IP-08, IP-09, IP-10, IP-12 (RED)
  - Validation contract referenced by every downstream Phase 87 plan's <verify><automated>

affects:
  - 87-02 (extraction prompt — IP-14 gate, partially GREEN already)
  - 87-03 (Team Gamma in seed-project — IP-10/IP-11 gate)
  - 87-04 (POST /api/projects + new-project wizard — IP-06/IP-07 gate)
  - 87-05 (settings PATCH + retroactive seeding — IP-08/IP-09 gate)
  - 87-06 (InteractiveArchGraph + Change Risk Console — IP-12 gate)

tech-stack:
  added: []
  patterns:
    - "Source-scan pattern (fs.readFileSync + try/catch '' on ENOENT) prevents vitest crashes when target files are missing in RED state"
    - "Synchronous require() with try/catch fallback to empty constants — for direct-import tests against modules that may not yet export the target symbol"
    - "Mock-introspection pattern in seed-project.test.ts — flatten every mockInsert.mock.results[*].value.values.mock.calls payload into a single array, then .find() the gated row"
    - "Wave 0 acceptable-pass: tests that pre-pass on existing artifacts are documented per [80-00] precedent — key gating tests remain RED"

key-files:
  created:
    - /Users/jmiloslavsky/Documents/Panda-Manager/tests/schema/active-tracks-type.test.ts
    - /Users/jmiloslavsky/Documents/Panda-Manager/tests/arch/interactive-arch-graph.test.ts
    - /Users/jmiloslavsky/Documents/Panda-Manager/tests/extraction/ip-track-cues.test.ts
    - /Users/jmiloslavsky/Documents/Panda-Manager/tests/api/projects.test.ts
    - /Users/jmiloslavsky/Documents/Panda-Manager/tests/api/project-settings.test.ts
    # tests/ui/onboarding-config.test.ts was created by a parallel Plan 87-02 agent before this plan ran;
    # left in place (covers IP-04/IP-05 more thoroughly than the original plan stub draft).
  modified:
    - /Users/jmiloslavsky/Documents/Panda-Manager/tests/ui/seed-project.test.ts

key-decisions:
  - "[87-00] All Wave 0 test files live under tests/ (gitignored per [79-00] convention) — no git commit needed for test code; downstream plans' verify-automated commands point at these paths"
  - "[87-00] Source-scan pattern (fs.readFileSync + try/catch returning '' on ENOENT) chosen over direct-import for every test that targets a Next route or worker — prevents DB/middleware module-resolution crashes in RED state"
  - "[87-00] onboarding-config.test.ts uses synchronous require() + fallback to empty constants — pure config module has no runtime, so direct import is safe and gives clearer assertion errors than source-scan would"
  - "[87-00] seed-project IP-10/IP-11 use mock-introspection via mockInsert.mock.results[*].value.values.mock.calls — surfaces the actual row payloads driven through .values(...) so tests can find/.find() Team Gamma by team_name + track"
  - "[87-00] IP-03/IP-04/IP-05/IP-13/IP-14 pre-pass on parallel-agent prep (Plans 87-01 and 87-02 already shipped lib/onboarding-config.ts + db/schema.ts + db/migrations/0052 + worker/jobs/document-extraction.ts) — acceptable per [80-00] precedent because key gating tests (IP-06, IP-07, IP-08, IP-09, IP-10, IP-12) remain RED"

patterns-established:
  - "Wave 0 RED-test scaffolding (Phase 87): every automated requirement gets a named failing test BEFORE implementation lands, so downstream plans have a green-light contract"
  - "Test-file location convention: tests/<domain>/<feature>.test.ts where <domain> matches the source tree root (schema/arch/extraction/api/ui)"
  - "Mock-introspection helper inline (per-test): flatten mockInsert.mock.results[*].value.values.mock.calls — no extra harness needed"

requirements-completed: [IP-03, IP-04, IP-05, IP-06, IP-07, IP-08, IP-09, IP-10, IP-11, IP-12, IP-13, IP-14]

duration: 4 min
completed: 2026-05-20
---

# Phase 87 Plan 00: Wave 0 RED Test Scaffolds Summary

**Source-scan RED test scaffolds for IP-03..IP-14 — 6 new test files + 1 extended file, 44 tests total, 12 named failing assertions covering the unshipped IP wiring (IP-06/07/08/09/10/12), zero import crashes via ENOENT-safe `fs.readFileSync` pattern.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-20T02:15:25Z
- **Completed:** 2026-05-20T02:19:20Z
- **Tasks:** 2 (both `type="auto"`)
- **Files created:** 5 new + 1 extended (1 additional onboarding-config test file pre-existed from parallel agent and was left in place)

## Accomplishments

- Wave 0 RED scaffolds in place for every automated Phase 87 requirement (IP-03 through IP-14)
- Combined vitest run produces a clean test summary — 44 tests, 12 named failing tests, 0 crashes on missing files/modules
- Established the source-scan pattern (fs.readFileSync + try/catch `''` on ENOENT) for every route/worker test that would otherwise pull the full DB + Next middleware stack
- Mock-introspection helper inline for IP-10/IP-11 — finds gated `Team Gamma` insertion via flattened `mockInsert.mock.results[*].value.values.mock.calls`
- Pre-passing tests on parallel-agent prep (IP-03/IP-04/IP-05/IP-13/IP-14) documented as acceptable — key gating tests remain RED

## Task Commits

This plan creates only files under `tests/` which is gitignored at the Panda-Manager repo (per [79-00] decision 166d7604), so no per-task code commit. The plan metadata commit captures the SUMMARY + STATE + ROADMAP updates.

1. **Task 1: Source-scan stubs (schema, arch graph, extraction)** — no code commit (gitignored). Files: tests/schema/active-tracks-type.test.ts, tests/arch/interactive-arch-graph.test.ts, tests/extraction/ip-track-cues.test.ts.
2. **Task 2: Route + config stubs (onboarding, project create, settings) + seed-project extension** — no code commit (gitignored). Files: tests/api/projects.test.ts, tests/api/project-settings.test.ts, tests/ui/seed-project.test.ts (extended).

**Plan metadata commit:** _filed after this Summary is written, in the planning repo (`Project Assistant Code/.planning/`)._

## Files Created/Modified

### New test files (Panda-Manager, gitignored under `/tests/`)

- `tests/schema/active-tracks-type.test.ts` — IP-13 (active_tracks type + default JSON) + IP-03 (migration 0052 additive `||` operator + idempotency guard).
- `tests/arch/interactive-arch-graph.test.ts` — IP-12 (InteractiveArchGraph section-grouped path + Change Risk Console label).
- `tests/extraction/ip-track-cues.test.ts` — IP-14 (extraction prompt knows about Incident Prevention Track + change ticket / CAB / change advisory board / risk score / change risk cues + ALLOWLIST/INFER prompt lines + PASS_0_PROMPT classification cues + ADR/AI Assistant regression).
- `tests/api/projects.test.ts` — IP-06 (POST /api/projects accepts + gates active_tracks for adr/biggy/incident_prevention WBS seeding) + IP-07 (wizard form has Incident Prevention checkbox + disabled-until-track-selected gate).
- `tests/api/project-settings.test.ts` — IP-08 (settings PATCH accepts incident_prevention + retroactive seeding on false→true + db.transaction wrap) + IP-09 (dedicated IP seeding helper uses idempotency guards: WHERE NOT EXISTS / onConflictDoNothing).
- `tests/ui/onboarding-config.test.ts` (pre-existed from parallel Plan 87-02 agent) — IP-04 (INCIDENT_PREVENTION_ONBOARDING_CONFIG: 4 phases, 13 steps, display_orders [1,3,5,6], per-phase step contents) + IP-05 (ALL_STANDARD_STEP_NAMES contains all 13 IP step names + dedup invariants + ADR/Biggy regression).

### Extended test file

- `tests/ui/seed-project.test.ts` — original 5 UI-04 tests preserved (no regressions). Appended new `describe('Incident Prevention — seedProjectFromRegistry Team Gamma gating')` block with IP-10 (Team Gamma inserted when incident_prevention=true) and IP-11 (Team Gamma NOT inserted when incident_prevention=false).

### Mapping table — IP-XX → test file → test name(s)

| Requirement | Test File | Test Name(s) | Wave 0 State |
| --- | --- | --- | --- |
| IP-03 | tests/schema/active-tracks-type.test.ts | "IP-03: migration 0052 preserves adr/biggy keys via additive `\|\|` operator" | **GREEN** (pre-shipped by Plan 87-01 commit `bf411050`) |
| IP-04 | tests/ui/onboarding-config.test.ts | 8 tests covering 4 phases / phase names / display_orders / 13 steps / per-phase step contents | **GREEN** (pre-shipped by Plan 87-02 commit `ab0180eb`) |
| IP-05 | tests/ui/onboarding-config.test.ts | 5 tests covering IP-unique step inclusion / overlapping step inclusion / 13-step coverage / dedup / ADR-Biggy regression | **GREEN** (pre-shipped by Plan 87-02 commit `ab0180eb`) |
| IP-06 | tests/api/projects.test.ts | 3 tests covering active_tracks param / IP gating / ADR-Biggy gating | **RED** — Plan 87-04 will GREEN |
| IP-07 | tests/api/projects.test.ts | 2 tests covering Incident Prevention checkbox label / disabled-until-track-selected gate | **RED** — Plan 87-04 will GREEN |
| IP-08 | tests/api/project-settings.test.ts | 3 tests covering Zod schema / retroactive seeding diff / db.transaction wrap | **RED** — Plan 87-05 will GREEN |
| IP-09 | tests/api/project-settings.test.ts | 1 test covering idempotency guards in the dedicated IP seeding helper | **RED** — Plan 87-05 will GREEN |
| IP-10 | tests/ui/seed-project.test.ts | "IP-10: inserts Team Gamma when active_tracks.incident_prevention is true" | **RED** — Plan 87-03 will GREEN |
| IP-11 | tests/ui/seed-project.test.ts | "IP-11: does NOT insert Team Gamma when active_tracks.incident_prevention is false" | **PASS** (no-op pass — Plan 87-03 will preserve the no-insert behavior when false; remains GREEN) |
| IP-12 | tests/arch/interactive-arch-graph.test.ts | 2 tests covering section-grouped path + Change Risk Console label | **RED** — Plan 87-06 will GREEN |
| IP-13 | tests/schema/active-tracks-type.test.ts | 2 tests covering `incident_prevention: boolean` + default JSON | **GREEN** (pre-shipped by Plan 87-01 commit `8f1ad518`) |
| IP-14 | tests/extraction/ip-track-cues.test.ts | 7 tests covering Incident Prevention Track / change ticket / CAB / change advisory board / ONLY-valid-values allowlist / INFER rule / PASS_0_PROMPT cues / risk-score regression | **GREEN** (pre-shipped by Plan 87-02 commit `c65b2797`) |

**Combined Wave 0 run:** 7 test files (4 with named failures, 3 fully GREEN on pre-shipped artifacts), 44 tests, 32 passed, 12 failed with named IP-XX assertions, 253ms duration (well under the 60s target).

## Decisions Made

See `key-decisions` frontmatter — 5 decisions captured. Brief summary:

- **Source-scan over direct-import for routes/workers** — prevents DB/middleware crashes; direct-import reserved for pure config modules where the assertion message is clearer.
- **Inline mock-introspection** in seed-project.test.ts — flattens `mockInsert.mock.results[*].value.values.mock.calls` so IP-10/IP-11 can find Team Gamma without a custom harness.
- **Pre-passing on parallel-agent prep is acceptable** — IP-03/IP-04/IP-05/IP-13/IP-14 already GREEN because Plans 87-01 and 87-02 commits landed before this plan ran. Key gating tests (IP-06/07/08/09/10/12) remain RED, which is what every downstream plan's `<verify><automated>` will gate on.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 - Blocking] `tests/ui/onboarding-config.test.ts` already existed when Task 2 started**
- **Found during:** Task 2 (Write onboarding-config.test.ts)
- **Issue:** A parallel agent working on Plan 87-02 had already created `tests/ui/onboarding-config.test.ts` with more comprehensive IP-04/IP-05 coverage than this plan's draft. Writing my draft would either overwrite it (loss of coverage) or fail (file exists).
- **Fix:** Read the existing file, confirmed it covers IP-04 (8 tests) + IP-05 (5 tests) + structural-consistency invariants — strictly more than this plan's spec required — and left it in place. Documented the override in `key-files.created` frontmatter comment.
- **Files modified:** None (file left untouched).
- **Verification:** vitest run shows tests/ui/onboarding-config.test.ts: 14/14 GREEN against the already-shipped lib/onboarding-config.ts.

**2. [Rule 3 - Blocking] Parallel-agent prep landed Plans 87-01 and 87-02 commits before this Plan 87-00 ran**
- **Found during:** Task 1 verification + Task 2 verification
- **Issue:** Plan 87-01 (migration 0052 + schema active_tracks widening) and Plan 87-02 (extraction prompt + INCIDENT_PREVENTION_ONBOARDING_CONFIG) shipped before Plan 87-00 — so my "RED" assertions for IP-03/IP-04/IP-05/IP-13/IP-14 came back GREEN.
- **Fix:** No change to the tests — the assertions are still correct gates. Documented the pre-pass in SUMMARY mapping table and `key-decisions`. Per [80-00] precedent, this is acceptable when the key gating assertions (IP-06/07/08/09/10/12) remain RED, which they do.
- **Files modified:** None.
- **Verification:** Combined vitest run shows 12 RED tests with named IP-XX assertions across IP-06/07/08/09/10/12 — gate is intact.

**3. [Rule 1 - Bug] Extension to tests/extraction/ip-track-cues.test.ts after initial write**
- **Found during:** Task 2 (after Task 1 was already verified)
- **Issue:** A linter/parallel-agent appended five additional IP-14 tests (ONLY-valid-values allowlist line, INFER rule line, PASS_0_PROMPT classification cues, risk-score cue, ADR/AI Assistant regression). The plan's `min_lines: 25` was already met by my initial 3 tests; the extension strengthens the IP-14 contract.
- **Fix:** Accepted the extension (per system-reminder instruction). All 7 IP-14 tests pass against the already-shipped worker/jobs/document-extraction.ts.
- **Files modified:** `tests/extraction/ip-track-cues.test.ts` (additive only).
- **Verification:** All 7 IP-14 tests GREEN in the combined run.

---

**Total deviations:** 3 auto-fixed (all Rule 3 - Blocking or Rule 1 - Bug accepting parallel-agent or linter changes).
**Impact on plan:** Zero — all plan success criteria still satisfied (6 new + 1 extended test file written, ≥12 failing test cases with named IP-IDs, no import crashes, runs well under 60s).

## Issues Encountered

None — execution proceeded smoothly. Pre-passing tests on parallel-agent prep is a documented `Wave 0 acceptable-pass` pattern per [80-00].

## Authentication Gates

None — vitest runs locally, no external services touched.

## User Setup Required

None — no external service configuration required.

## Self-Check

Verified the following before filing the metadata commit:

```
FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/tests/schema/active-tracks-type.test.ts
FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/tests/arch/interactive-arch-graph.test.ts
FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/tests/extraction/ip-track-cues.test.ts
FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/tests/api/projects.test.ts
FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/tests/api/project-settings.test.ts
FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/tests/ui/onboarding-config.test.ts (parallel-agent created; left in place)
FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/tests/ui/seed-project.test.ts (extended)
```

Test code is intentionally NOT in git (tests/ is gitignored per [79-00] convention). No per-task commit hash to verify — plan metadata commit is the only commit produced.

## Self-Check: PASSED

## Next Phase Readiness

- Wave 0 RED test scaffolds in place; every downstream Phase 87 plan can wire `<verify><automated>` to one of these files.
- Plan 87-02 (extraction prompt) effectively complete — IP-14 tests all GREEN. Filing 87-02 SUMMARY is the next step (planning-side bookkeeping; code already in git as `c65b2797`).
- Plan 87-03 (Team Gamma seed) has a fresh RED gate (IP-10) ready to drive GREEN.
- Plan 87-04 (POST /api/projects + wizard checkbox) has IP-06 (3 tests) + IP-07 (2 tests) RED gates ready.
- Plan 87-05 (settings PATCH + retroactive seeding helper) has IP-08 (3 tests) + IP-09 (1 test) RED gates ready.
- Plan 87-06 (InteractiveArchGraph + Change Risk Console) has IP-12 (2 tests) RED gates ready.

No blockers. No concerns.

---
*Phase: 87-incident-prevention-track-support*
*Completed: 2026-05-20*
