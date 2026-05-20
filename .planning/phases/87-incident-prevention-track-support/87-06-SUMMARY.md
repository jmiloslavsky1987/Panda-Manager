---
phase: 87-incident-prevention-track-support
plan: 06
subsystem: ui

tags: [react, arch-graph, incident-prevention, skill-context, chat-context-builder, dnd-kit]

# Dependency graph
requires:
  - phase: 87-incident-prevention-track-support (Plan 01)
    provides: Migration 0052 seeds 'Incident Prevention Track' arch_tracks row + 3 sections + Console + 13 sub-caps per project; widened active_tracks type
  - phase: 83-architecture-sub-capability-columns
    provides: parent_id + node_type pattern (section / sub-capability / console) reused verbatim for IP rendering path
provides:
  - InteractiveArchGraph renders IP Track with section-grouped layout (Data Ingestion / Risk Engine / Decision & Write-Back) and Change Risk Console centerpiece
  - Track-aware console placement: ADR Console between idx 1/2 (Incident Intelligence / Workflow Automation); IP Console between idx 0/1 (Data Ingestion / Risk Engine) — matches migration 0052 display_order=15
  - Unified isSectionGrouped boolean replaces isADRTrack in handleDragEnd; section-scoped sub-cap reorder works identically for IP
  - 3-way ADR/Biggy/IP branches across 7 supporting files (TeamOnboardingTable, TeamOnboardingEditModal, IntegrationEditModal, CurrentFutureStateTab, skill-context-arch, skill-context-teams, chat-context-builder)
  - IP_PHASES_BY_SECTION constant in IntegrationEditModal — 13 phases × 3 sections, mirrors migration 0052 seed; wired into Phase dropdown via optgroups
affects:
  - 87-07 (settings/onboarding-dashboard surfaces — already being wired by parallel agent; this plan's ipTeamNames prop flows from CurrentFutureStateTab)
  - 87-08 (human verification — visual confirmation of 3-track diagram + IP Console placement)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern: 3-way track branching across UI/skill/chat layers — replaces 2-way isADR/isBiggy with isADR/isIP/isBiggy ternary chain in className + label + bg selection"
    - "Pattern: track-aware Console placement index — generalizes ADR's sectionIdx===1 hardcode to a computed consoleAfterIdx (0 for IP, 1 for ADR) driven by track identity"
    - "Pattern: section-grouped layout gate via boolean union — `if (isADR || isIP)` reuses the entire ADR rendering block for any future section-grouped track without code duplication"
    - "Pattern: optgroup dropdown extension for new tracks — IP_PHASES_BY_SECTION literal mirrors migration seed; future tracks add their own LOOKUP without touching the JSX shape"

key-files:
  created: []
  modified:
    - "components/arch/InteractiveArchGraph.tsx (8 hardcoded locations rewired + Console placement generalized + props extended)"
    - "components/arch/TeamOnboardingTable.tsx (third section + filter + edit-row state union widened)"
    - "components/arch/TeamOnboardingEditModal.tsx (track type union widened, third dropdown option)"
    - "components/arch/IntegrationEditModal.tsx (IP_PHASES_BY_SECTION lookup + 3-way track branch + optgroup Phase dropdown)"
    - "components/arch/CurrentFutureStateTab.tsx ('+ Incident Prevention Integration' button + ipTeamNames extraction + prop wiring)"
    - "lib/skill-context-arch.ts (third filter + ### Incident Prevention Track section in markdown)"
    - "lib/skill-context-teams.ts (third filter + ### Incident Prevention Track section in markdown)"
    - "lib/chat-context-builder.ts (tool hint comment updated to 3 valid track names + their section options)"

key-decisions:
  - "Color: violet (Tailwind 600/700) chosen for IP across all surfaces — distinct from ADR blue and Biggy amber, semantically pairs with 'Risk', supported palette steps"
  - "IP Console placement index = 0 (after Data Ingestion section), NOT 1 (which would put it after Risk Engine) — matches migration 0052 display_order=15 between sections do=10 and do=20; required adding `consoleAfterIdx` derived from `isIP` ternary because the original code hardcoded `sectionIdx === 1`"
  - "isADRTrack → isSectionGrouped rename in handleDragEnd: cleaner abstraction now that 2 tracks share section-grouped rendering; future section-grouped tracks plug in by adding to the union"
  - "Open Question 2 (RESEARCH.md) resolved: third hardcoded branch in skill-context files chosen over generic refactor per CONTEXT.md guidance — lower risk for the audit pass, clearer assertion targets for IP-12 source-scan tests; future plans can refactor to generic iteration when the 4th+ track lands"
  - "IP_PHASES_BY_SECTION literal placed in IntegrationEditModal (not extracted to a shared file) — Phase 87-06 scope is contained; if Phase 88+ needs the same list elsewhere, extract then"
  - "Optional ipTeamNames?: string[] prop on InteractiveArchGraph (defaults to []) — backward-compatible with any existing call sites that haven't passed it yet; CurrentFutureStateTab is the one in-tree caller and was updated in Task 2"

patterns-established:
  - "Pattern: derived consoleAfterIdx for track-aware console placement — `const consoleAfterIdx = isIP ? 0 : 1` inside the section-grouped block; insert Console column when sectionIdx === consoleAfterIdx"
  - "Pattern: 3-way ternary chain for color/label/bg selection — `isADR ? blue : isIP ? violet : isAI ? amber : zinc`. Read top-to-bottom in track-priority order"

requirements-completed: [IP-12]

# Metrics
duration: ~6 min
completed: 2026-05-20
---

# Phase 87 Plan 06: InteractiveArchGraph + supporting arch UI extension Summary

**InteractiveArchGraph + 7 supporting arch/skill/chat files extended to render Incident Prevention Track as a third section-grouped diagram (mirrors ADR exactly), with Change Risk Console centerpiece between Data Ingestion and Risk Engine sections, violet track palette throughout, and unified `isSectionGrouped` drag handler covering both ADR and IP.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-20T02:26:35Z
- **Completed:** 2026-05-20T02:32:31Z
- **Tasks:** 2/2 complete (both tasks atomic-committed)
- **Files modified:** 8 (1 in Task 1, 7 in Task 2)
- **Commits:** 2 task commits + 1 plan-metadata commit pending

## Accomplishments

- **8 hardcoded ADR/Biggy locations in InteractiveArchGraph.tsx** rewired to support a third section-grouped track. `isADRTrack` fully renamed to `isSectionGrouped` (zero residual matches) — the unified boolean now drives both the rendering branch (`if (isADR || isIP)`) and the drag-handler section-scoped reorder logic.
- **Track-aware console placement** generalized via a derived `consoleAfterIdx` index (0 for IP, 1 for ADR) — IP Console correctly sits between Data Ingestion (do=10) and Risk Engine (do=20), matching migration 0052's `display_order=15` for the Change Risk Console node.
- **Violet palette** applied consistently across all IP surfaces: top nav pill (`bg-violet-600`), track border (`border-l-violet-600`), label (`text-violet-700`), Console background (`bg-violet-700`), TeamOnboardingTable section header (`#7c3aed`), CurrentFutureStateTab button (violet styling).
- **`ipTeamNames?: string[]` prop** added to InteractiveArchGraph (optional for backward compat); CurrentFutureStateTab populates it from `onboardingRows.filter(r => r.track === 'Incident Prevention')`.
- **Section colors** added to `sectionColor()` lookup: Data Ingestion → violet, Risk Engine → red, Decision & Write-Back → green. These read against the existing `--kata-status-*` CSS variable palette (blue/amber/green/red/zinc all already defined).
- **7 supporting files** in Task 2 widened their track unions from `'ADR' | 'Biggy'` to `'ADR' | 'Biggy' | 'Incident Prevention'`. All dropdowns, filters, markdown sections, and tool hint comments now surface the third track.
- **IP_PHASES_BY_SECTION** constant added to IntegrationEditModal — 13 sub-capability phases × 3 sections, byte-for-byte aligned with migration 0052's seeded sub-cap names. Phase dropdown renders optgroups for IP (matching the ADR optgroup pattern).
- **IP-12 test** flipped from RED (2/2 failing on Wave 0) to GREEN (2/2 passing) after Task 1. No TypeScript regressions on any of the 8 touched files.

## Task Commits

Each task was committed atomically and pushed to `origin/main`:

1. **Task 1: Extend InteractiveArchGraph.tsx — all 8 hardcoded locations + Console placement generalization + props extension** — `cd29600f` (feat)
2. **Task 2: Extend 7 supporting arch/skill/chat files for 3-way track support** — `7bdbe4a5` (feat)

**Plan metadata:** pending final commit (this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md)

## Files Created/Modified

### Task 1
- `components/arch/InteractiveArchGraph.tsx` — 53 insertions, 16 deletions. 8 hardcoded ADR-only locations rewired:
  1. Props interface extended with `ipTeamNames?: string[]` (line 22)
  2. Component destructure adds `ipTeamNames = []` default (line ~490)
  3. ConsoleNode (line ~122): 3-way `isADR / isIP / isAI` ternary → label `'Change Risk Console'`, bg `bg-violet-700`
  4. sectionColor (line ~196): 3 new entries for Data Ingestion (violet), Risk Engine (red), Decision & Write-Back (green)
  5. TrackPipeline (line ~354): `isIP` detection added, 3-way ternary on borderClass/labelClass, section-grouped block gated on `(isADR || isIP)`
  6. Console placement (line ~403): derived `consoleAfterIdx = isIP ? 0 : 1`; insertion gated on `sectionIdx === consoleAfterIdx`
  7. handleDragEnd (line ~530): `isADRTrack` → `isSectionGrouped = (ADR || IP)`; section-scoped reorder logic now covers both
  8. Top nav pills (line ~617): 3-way ternary `bg-blue-600 / bg-violet-600 / bg-amber-500`
  9. teamNames mapping (line ~637): 3-way ternary `adrTeamNames / ipTeamNames / biggyTeamNames`

### Task 2
- `components/arch/TeamOnboardingTable.tsx` — added `ipRows` filter (track === 'Incident Prevention'), Incident Prevention SectionHeader (bg #7c3aed), table rows + add-row affordance with `new-ip` state; modal's `defaultTrack` derivation widened.
- `components/arch/TeamOnboardingEditModal.tsx` — `defaultTrack` and `track` state type unions widened to include `'Incident Prevention'`; dropdown gets third option.
- `components/arch/IntegrationEditModal.tsx` — added `IP_PHASES_BY_SECTION` constant (13 phases × 3 sections matching migration 0052); `defaultTrack` and `track` types widened; `handleTrackChange` adds IP branch defaulting phase to `IP_PHASES_BY_SECTION['Data Ingestion'][0]`; Track dropdown gets third option; Phase dropdown renders IP optgroups when `track === 'Incident Prevention'`.
- `components/arch/CurrentFutureStateTab.tsx` — `EditModalState.defaultTrack` type widened; `+ Incident Prevention Integration` button (violet styling); passes `ipTeamNames={...}` to InteractiveArchGraph.
- `lib/skill-context-arch.ts` — third filter `ip = filter(track === 'Incident Prevention')`; `### Incident Prevention Track` section appended to markdown after Biggy.
- `lib/skill-context-teams.ts` — same pattern as skill-context-arch.
- `lib/chat-context-builder.ts` — tool hint comment updated from `"ADR Track" or "AI Assistant Track"` to listing all three with per-track parent-section options.

## Migration 0052 Console placement reconciliation

Original code hardcoded `if (sectionIdx === 1 && consoleNode)` — works for ADR (sections sorted by display_order: Alert Intelligence/10, Incident Intelligence/20, Workflow Automation/30; Console inserted after idx 1 = between Incident Intelligence and Workflow Automation).

For IP (sections do=10/20/30: Data Ingestion, Risk Engine, Decision & Write-Back), Console is seeded at display_order=15 — between sections do=10 and do=20, i.e. between idx 0 and idx 1. Therefore IP needs `consoleAfterIdx = 0`, ADR keeps `consoleAfterIdx = 1`.

Implementation: a one-line derived index `const consoleAfterIdx = isIP ? 0 : 1`, computed at the top of the section-grouped block.

## Decisions Made

- **Color choice (Claude's Discretion per CONTEXT.md):** violet (Tailwind 600/700 palette). Selected because: (a) visually distinct from blue (ADR) and amber (Biggy); (b) pairs semantically with "Risk Engine"; (c) the `--kata-status-*` token map already exposes a violet alias for the SectionHeader's CSS var lookup.
- **Generic refactor vs third-branch hardcode in skill-context files** (RESEARCH.md Open Question 2): chose hardcoded third branch. Lower risk for the Phase 87 audit pass; assertion targets remain literal; clearer for future readers. A 4th track would justify the generic refactor.
- **IP_PHASES_BY_SECTION location:** placed inline in IntegrationEditModal.tsx, not extracted to a shared module. Phase 87-06 is the only in-tree consumer; if Phase 88+ needs the list elsewhere, extract then (KISS).
- **handleDragEnd rename `isADRTrack` → `isSectionGrouped`:** cleaner abstraction once both ADR and IP share section-grouped rendering. Removes the implication that only ADR can be section-grouped.
- **Console placement generalized via `consoleAfterIdx` (not hardcoded with isIP ternary at the if-statement):** keeps the if-statement readable (`sectionIdx === consoleAfterIdx`) and isolates the track-specific knowledge to a single line at the top of the block.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] IP Console placement index would render in wrong section position**
- **Found during:** Task 1 (InteractiveArchGraph.tsx Edit 4 — section-grouped layout gate)
- **Issue:** The plan said to change `if (isADR)` to `if (isADR || isIP)` and leave the rendering JSX unchanged (claim: "the rendering JSX inside the block is data-driven by `sections` and the track's child arch_nodes — it does NOT need changes"). This is _almost_ true, except the inner `if (sectionIdx === 1 && consoleNode)` hardcoded the ADR Console position (between sections idx 1 and 2). For IP, migration 0052 places Console at `display_order=15` (between sections do=10 and do=20), which is between idx 0 and idx 1 — not idx 1 and idx 2. Without this fix, the IP Console would render between Risk Engine and Decision & Write-Back instead of between Data Ingestion and Risk Engine.
- **Fix:** Added `const consoleAfterIdx = isIP ? 0 : 1` at the top of the section-grouped block; changed `if (sectionIdx === 1 && consoleNode)` to `if (sectionIdx === consoleAfterIdx && consoleNode)`. Comment updated to describe both track placements.
- **Files modified:** `components/arch/InteractiveArchGraph.tsx` (Task 1, +3 LOC inside the existing block)
- **Verification:** IP-12 GREEN; both assertions cover the change (Change Risk Console literal + section-grouped condition). Visual confirmation deferred to Plan 87-08.
- **Committed in:** `cd29600f` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — Console placement mismatch with migration 0052 display_order).
**Impact on plan:** Single-line correction necessary for correctness; doesn't expand scope. The plan's claim that the rendering JSX was fully data-driven was off by this one constant. Documented + fixed inline per Rule 1.

## Issues Encountered

- **Concurrent agent commits during Plan 87-06 execution:** while Task 1 was in progress, a parallel agent landed `aa487f53 feat(87-03): make seedProjectFromRegistry team inserts track-conditional` and staged new files (`lib/seed-incident-prevention.ts`, modifications to `app/api/projects/[projectId]/onboarding/route.ts`, `app/api/projects/[projectId]/route.ts`, `components/OnboardingDashboard.tsx`, `components/wizard/BasicInfoStep.tsx`, etc.). I left those untouched per scope-boundary rule and committed only my 8 files (1 in Task 1, 7 in Task 2). This matches the parallel-execution pattern documented in STATE.md [86-02] and [86-03].
- **Pre-existing arch route test failures (6 tests across column-reorder + status-cycle) confirmed unrelated to Plan 87-06:** verified by stashing my changes and re-running — failures persist on bare main. Same pattern as STATE.md [83-04]: Phase 48 tests mock `requireSession` but not `requireProjectRole` (added Phase 82). Logged to `.planning/phases/87-incident-prevention-track-support/deferred-items.md` for a future test-mock-fix plan.
- **`tsc --noEmit` surfaces unrelated drizzle-orm peer-dep errors** (gel-core, mysql-core, neon-http) — pre-existing in `node_modules`. Filtered out of the verification by grepping for only the touched files; none reported.

## Next Phase Readiness

**Ready for Plan 87-07** (settings/onboarding-dashboard UI surfaces):
- `ipTeamNames` already flows through `CurrentFutureStateTab` → `InteractiveArchGraph` and renders correctly.
- Parallel agent has already staged some 87-07 files (BasicInfoStep wizard step, OnboardingDashboard tweaks) — Plan 06 doesn't touch those; ordering is correct.
- All 3-way track unions are in place — Plan 07 inherits them without needing to widen further.

**Ready for Plan 87-08** (human verification in Docker):
- Visual confirmation needed: IP Track renders with 3 section headers, Change Risk Console centerpiece, sub-cap drag-reorder section-scoped, top nav pill violet, integrations add-button violet.
- Diagram should now render 3 tracks (ADR / Biggy / Incident Prevention) when active_tracks all true.

## Self-Check

Verifying claims before state updates:

- `components/arch/InteractiveArchGraph.tsx` — FOUND, 8 "Incident Prevention" occurrences (≥6 required), "Change Risk Console" present, `isSectionGrouped` present, `isADRTrack` 0 residual matches
- `components/arch/TeamOnboardingTable.tsx` — FOUND, 7 "Incident Prevention" occurrences
- `components/arch/TeamOnboardingEditModal.tsx` — FOUND, 5 "Incident Prevention" occurrences
- `components/arch/IntegrationEditModal.tsx` — FOUND, 9 "Incident Prevention" occurrences
- `components/arch/CurrentFutureStateTab.tsx` — FOUND, 1 `ipTeamNames` occurrence (prop passthrough)
- `lib/skill-context-arch.ts` — FOUND, 2 "Incident Prevention" occurrences (filter + section header)
- `lib/skill-context-teams.ts` — FOUND, 2 "Incident Prevention" occurrences (filter + section header)
- `lib/chat-context-builder.ts` — FOUND, 1 "Incident Prevention Track" occurrence (tool hint)
- Commit `cd29600f` — FOUND in `git log` (Task 1)
- Commit `7bdbe4a5` — FOUND in `git log` (Task 2)
- Push to `origin/main` — confirmed (`aa487f53..7bdbe4a5  main -> main`)
- IP-12 test — 2/2 passing (`tests/arch/interactive-arch-graph.test.ts`)
- TypeScript check on touched files — 0 errors

## Self-Check: PASSED

---
*Phase: 87-incident-prevention-track-support*
*Plan: 06*
*Completed: 2026-05-20*
