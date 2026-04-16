---
phase: 66-overview-tracks-redesign
verified: 2026-04-16T06:20:52Z
status: human_needed
score: 7/8 must-haves verified
human_verification:
  - test: "Confirm 3 static phase cards render per track column in the browser (not 6)"
    expected: "ADR column shows Discovery & Kickoff, Platform Configuration, UAT (interleaved with Integrations live card and Teams live card); Biggy column shows Discovery & Kickoff, Platform Configuration, Validation (interleaved with IT Knowledge Graph live card and Teams live card). Exactly 3 static phase cards plus 2 live cards plus Go-Live card per column."
    why_human: "The plan specified data-testid='dynamic-track-summary' as a distinct section, but implementation uses interleaved renderIntegrationsCard/renderTeamsCard within the track columns. Cannot verify card count or layout purely from grep. Human-verified via Plan 03 gate but testid deviation noted."
---

# Phase 66: Overview Tracks Redesign Verification Report

**Phase Goal:** Overview displays hybrid static/dynamic onboarding tracks with auto-scheduled weekly focus
**Verified:** 2026-04-16T06:20:52Z
**Status:** human_needed (automated checks pass; one layout deviation requires human confirmation)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ADR track renders exactly 3 static phase cards (Discovery & Kickoff, Platform Configuration, UAT) from hardcoded config | ? UNCERTAIN | `STATIC_ADR_TRACKS` constant exists at line 83 with correct 3 entries. Rendered at lines 1041/1043/1045 via `renderPhaseCard`. Layout is interleaved (not a standalone static section). Static names match DB seeder names ("Platform Configuration" not "Platform Config" shorthand — consistent). Cannot count rendered cards without running app. |
| 2 | Biggy track renders exactly 3 static phase cards (Discovery & Kickoff, Platform Configuration, Validation) from hardcoded config | ? UNCERTAIN | `STATIC_BIGGY_TRACKS` constant exists at line 89 with correct 3 entries. Rendered at lines 1064/1066/1068. Same interleaved layout. |
| 3 | Dynamic track summary cards show live counts: ADR shows Integrations + Teams; Biggy shows IT Knowledge Graph + Teams | ✓ VERIFIED | `renderIntegrationsCard('ADR')` at line 1042, `renderTeamsCard('ADR')` at line 1044, `renderIntegrationsCard('Biggy')` at line 1065, `renderTeamsCard('Biggy')` at line 1067 — all wired inside the render block. `renderIntegrationsCard` labels ADR as "Integrations" and Biggy as "IT Knowledge Graph" (line 720). |
| 4 | Teams stats use raw DB phases (not static-filtered list) so counts reflect live data | ✓ VERIFIED | `rawAdrPhases`/`rawBiggyPhases` set at lines 292-293 before static filter at lines 300-308. `renderTeamsCard` at line 756 reads `rawPhases = track === 'ADR' ? rawAdrPhases : rawBiggyPhases` — correct source. |
| 5 | Weekly Focus "Generate Now" button is always visible as small outline button (not only in empty state) | ✓ VERIFIED | `WeeklyFocus.tsx` line 179-186: button with `data-testid="generate-now-btn"` is in the header row (not inside any conditional). Rendered unconditionally regardless of `bullets` state. Style: `border border-zinc-300` (outline). |
| 6 | Empty state for Weekly Focus shows quiet text "Weekly focus generates automatically every Monday at 6am." not a large CTA | ✓ VERIFIED | `WeeklyFocus.tsx` line 206-209: `<p className="text-xs text-zinc-400 italic">Weekly focus generates automatically every Monday at 6am.</p>` rendered when `!(bullets && bullets.length > 0)`. No large CTA button in empty state. |
| 7 | Trash icon on each integration row triggers DELETE with no confirmation | ✓ VERIFIED | `deleteIntegration` function at lines 506-519: optimistic remove + `fetch(..., { method: 'DELETE' })` with no confirm dialog. Button at lines 562-568 with `data-testid="delete-integration-btn"` and `onClick={() => deleteIntegration(integ.id)}`. |
| 8 | DELETE endpoint removes integration record and returns 200; POST /api/projects registers weekly-focus BullMQ job every Monday at 6am UTC | ✓ VERIFIED | `[integId]/route.ts` lines 83-116: DELETE handler with auth guard, RLS transaction, `tx.delete(integrations).where(...)`, returns `{ ok: true }`. `projects/route.ts` lines 253-284: `upsertJobScheduler` with cron `0 6 * * 1`, wrapped in try/catch (best-effort). |

**Score:** 7/8 truths verified (1 uncertain — layout/card-count requires human eye confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bigpanda-app/app/api/projects/[projectId]/integrations/[integId]/route.ts` | DELETE handler for integration removal | ✓ VERIFIED | 117 lines. DELETE export function exists at line 83. Uses `requireProjectRole`, RLS transaction pattern, `tx.delete(integrations).where(eq(integrations.id, numericIntegId))`, returns `{ ok: true }`. |
| `bigpanda-app/app/api/projects/route.ts` | Project creation with auto-registered weekly-focus job | ✓ VERIFIED | 287 lines. Weekly-focus BullMQ block at lines 253-284. Contains `upsertJobScheduler`, cron `0 6 * * 1`, `weekly-focus` job name, best-effort try/catch. |
| `bigpanda-app/components/OnboardingDashboard.tsx` | Hybrid static/dynamic track rendering + integration delete | ✓ VERIFIED | 1232 lines. `STATIC_ADR_TRACKS`/`STATIC_BIGGY_TRACKS` at lines 83-93. `rawAdrPhases`/`rawBiggyPhases` state at lines 236-237. `deleteIntegration` at line 506. `data-testid="delete-integration-btn"` at line 563. |
| `bigpanda-app/components/WeeklyFocus.tsx` | Always-visible Generate Now button, quiet empty state | ✓ VERIFIED | 219 lines. `data-testid="generate-now-btn"` at line 180, unconditional in header. Empty state text at line 207. `data-testid="weekly-focus-section"` at line 171 preserved. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DELETE /api/projects/[projectId]/integrations/[integId]` | integrations table | `tx.delete(integrations).where(eq(integrations.id, numericIntegId))` | ✓ WIRED | route.ts line 107: `.delete(integrations)` followed by `.where(eq(integrations.id, numericIntegId))` inside RLS transaction. |
| `POST /api/projects` | BullMQ queue | `queue.upsertJobScheduler` with cron `0 6 * * 1` | ✓ WIRED | projects/route.ts lines 272-280: `upsertJobScheduler('db-job-${jobRow.id}', { pattern: '0 6 * * 1' }, ...)` after transaction commits. |
| `OnboardingDashboard ADR column` | STATIC_ADR_TRACKS config | `renderPhaseCard` called with phases from static config | ✓ WIRED | Lines 1041/1043/1045 use `adrPhases.find(p => p.name === ...)` which is set from `staticAdrPhases` (mapped from `STATIC_ADR_TRACKS`) at line 308. |
| `Teams dynamic card` | rawAdrPhases / rawBiggyPhases state | `rawPhases.filter(p => p.name.toLowerCase().includes('team'))` | ✓ WIRED | `renderTeamsCard` line 756 uses `rawPhases = track === 'ADR' ? rawAdrPhases : rawBiggyPhases`. `rawAdrPhases` set at line 292 before static filter. |
| `trash icon onClick` | `DELETE /api/projects/[projectId]/integrations/[integId]` | `deleteIntegration` function + `fetch(..., { method: 'DELETE' })` | ✓ WIRED | Button `onClick={() => deleteIntegration(integ.id)}` at line 564. `deleteIntegration` calls `fetch(..., { method: 'DELETE' })` at line 510. |
| `WeeklyFocus` | Generate Now button (always visible) | Unconditional placement in header row | ✓ WIRED | Button at lines 179-186 is outside any conditional block. `data-testid="generate-now-btn"` preserved. |
| `WeeklyFocus empty state` | Quiet auto-schedule message | Conditional render when bullets empty | ✓ WIRED | Lines 192-209: conditional renders bullet list OR quiet text `<p>` — no large CTA in empty state. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| OVRVW-01 | 66-01-PLAN (OVRVW-03,05), 66-02-PLAN, 66-03-PLAN | Overview displays static onboarding tracks (Discovery & Kickoff, Platform Config, UAT/Validation) from hardcoded config | ✓ SATISFIED | `STATIC_ADR_TRACKS` and `STATIC_BIGGY_TRACKS` constants with 3 entries each. Phase cards rendered from static config with DB step status overlay. Note: implementation uses full name "Platform Configuration" not shorthand "Platform Config" — consistent with DB seeder. |
| OVRVW-02 | 66-02-PLAN, 66-03-PLAN | Overview displays dynamic tracks (Integrations, Teams, IT Knowledge Graph) populated from live data | ✓ SATISFIED | `renderIntegrationsCard` (Integrations/IT Knowledge Graph) and `renderTeamsCard` (Teams) are interleaved live cards within track columns. Teams data sourced from `rawAdrPhases`/`rawBiggyPhases`. Integration counts sourced from `integrations` state. |
| OVRVW-03 | 66-01-PLAN, 66-03-PLAN | Weekly Focus generates automatically every Monday morning via scheduled job | ✓ SATISFIED | `projects/route.ts`: `upsertJobScheduler` registers `weekly-focus` job with cron `0 6 * * 1` on project creation. Best-effort (try/catch). DB row also inserted into `scheduledJobs` table. |
| OVRVW-04 | 66-02-PLAN, 66-03-PLAN | Weekly Focus "Generate Now" button is labeled as manual override (not default action) | ✓ SATISFIED | Button always visible in header (not empty-state-only), small outline style (`border border-zinc-300`), labeled "Generate Now". Empty state shows quiet italic text, not a blue CTA. |
| OVRVW-05 | 66-01-PLAN, 66-02-PLAN, 66-03-PLAN | User can delete integrations from the Integration Tracker | ✓ SATISFIED | DELETE endpoint: `[integId]/route.ts` line 83-116. UI: `deleteIntegration` function at line 506 with optimistic update + `data-testid="delete-integration-btn"` on each integration card. No confirmation dialog. |

All 5 OVRVW requirements are covered across plans. No orphaned requirements found — REQUIREMENTS.md maps exactly OVRVW-01 through OVRVW-05 to Phase 66, all accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `OnboardingDashboard.tsx` | 1043 | Phase name "Platform Config" in REQUIREMENTS/plan spec vs. "Platform Configuration" in implementation | ℹ️ Info | No impact — implementation consistently uses "Platform Configuration" matching DB seeder. The REQUIREMENTS shorthand "Platform Config" does not cause a mismatch. |
| `app/api/projects/route.ts` | 253-284 | Weekly-focus job registered as best-effort (try/catch swallows Redis errors) | ℹ️ Info | By design per OVRVW-03 requirement — project creation must not fail if Redis is down. Non-fatal is the correct behavior. |

No STUB, empty implementation, or TODO patterns found in any of the 4 files. No console.log-only handlers. No return null / return {} stubs.

### Implementation Deviation: Layout Approach

**Plan 66-02 specified** a `data-testid="dynamic-track-summary"` as a separate grid section between the onboarding phases and the `<hr>` divider, showing ADR and Biggy dynamic summary cards in a standalone block.

**Actual implementation** uses an interleaved layout: `renderIntegrationsCard` and `renderTeamsCard` are inserted between the static phase cards within the ADR and Biggy track columns (inside `data-testid="adr-track"` and `data-testid="biggy-track"`). The `data-testid="dynamic-track-summary"` testid does NOT exist in the codebase.

**Assessment:** The functional requirement (OVRVW-02) is fully satisfied — dynamic cards with live counts exist for all four tracks (Integrations/Teams for ADR; IT Knowledge Graph/Teams for Biggy). The layout deviation is a design choice made during implementation that produces a superior UX (integrated track view) vs. a separate summary section. Plan 03's human verification gate was approved by the user. This is a testid/API contract gap, not a goal gap.

### Human Verification Required

#### 1. Static Track Card Count in Browser

**Test:** Start the dev server (`npm run next-only`), navigate to any project's Overview tab, count the phase cards in each column.
**Expected:** ADR column shows exactly 3 static phase cards: "Discovery & Kickoff", "Platform Configuration", "UAT" — interleaved with 2 live cards (Integrations, Teams) and a Go-Live card. Biggy column shows exactly 3 static phase cards: "Discovery & Kickoff", "Platform Configuration", "Validation" — interleaved with 2 live cards (IT Knowledge Graph, Teams) and a Go-Live card.
**Why human:** The implementation uses an interleaved render function that cannot be card-counted from static analysis. Also confirms there are no leftover DB-driven phase cards appearing beyond the static 3 per track.

---

_Verified: 2026-04-16T06:20:52Z_
_Verifier: Claude (gsd-verifier)_
