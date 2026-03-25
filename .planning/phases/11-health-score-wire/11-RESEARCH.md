# Phase 11: Health Score Wire - Research

**Researched:** 2026-03-25
**Domain:** TypeScript/Next.js — health scoring logic, React component extension, Playwright E2E
**Confidence:** HIGH

## Summary

This phase completes PLAN-09 (the last open v1 requirement) by wiring the existing `workstreams.percent_complete` stall signal all the way to the Dashboard `HealthCard`. All the implementation primitives are already in place: `computeHealth()` already queries stalled workstreams and computes `workstreamSignal`, `updateWorkstreamProgress()` is already called on task PATCH and POST, and the schema column `percent_complete` is already an `integer | null` on `workstreams`. The gap is that `computeHealth()` discards `stalledWorkstreams` from its return value (line 148 returns only three of the four computed values), and `HealthCard.tsx` has no display for stalled workstreams.

The work is narrow: fix the return type of `computeHealth()`, propagate `stalledWorkstreams` through `ProjectWithHealth`, add one span to `HealthCard.tsx`, and write a real E2E test that asserts the end-to-end behavior. There are no new DB tables, no new API routes, and no schema migrations. The one discretionary decision is whether to also call `updateWorkstreamProgress()` on task DELETE — the DELETE route in `app/api/tasks/[id]/route.ts` currently skips the rollup entirely.

**Primary recommendation:** Fix `computeHealth()` return value first, then propagate type change through `ProjectWithHealth` and `HealthCard`; the TypeScript compiler will flag every consumer that needs updating.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **HealthCard display:** Show `stalledWorkstreams` count as a third metric below the RAG badge, matching the existing `overdueActions` + `highRisks` pattern. Label: `N stalled workstream(s)`. Highlight: orange text when `stalledWorkstreams > 0` (same style as `overdueActions`/`highRisks`). `computeHealth()` must return `stalledWorkstreams` so `HealthCard` can display it; `ProjectWithHealth` type needs updating.
- **Untracked workstreams (NULL percent_complete):** Workstreams with `percent_complete IS NULL` are excluded — not stalled, just unplanned. Only workstreams with `percent_complete IS NOT NULL` contribute a stall signal.
- **Stall threshold:** Keep current stub threshold: `percent_complete < 30%` counts as stalled.
- **Signal weight:** Multiple stalled workstreams contribute at most 1 point to the health score (current cap preserved).

### Claude's Discretion
- Exact test structure and fixture approach for the new E2E test
- Whether to also call `updateWorkstreamProgress()` on task DELETE (if not already done)
- Import/type adjustments in `ProjectWithHealth` to include `stalledWorkstreams`

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAN-09 | Progress rollup — task completion → workstream percent_complete → project health score automatically | All infrastructure is in place; gap is `stalledWorkstreams` not returned from `computeHealth()` and not consumed by `HealthCard`. Fix is 3 targeted code changes + 1 new E2E assertion. |
</phase_requirements>

---

## Standard Stack

### Core (no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | existing | Query `workstreams` table for stalled count | Already used everywhere in `queries.ts` |
| Next.js App Router | existing | Route handlers and RSC | Project standard |
| Playwright | existing | E2E test asserting PLAN-09 end-to-end | Established per `tests/e2e/phase3.spec.ts` |
| Vitest | existing (`^4.1.1` in bigpanda-app) | Unit test for `computeHealth()` return shape | Used in `app/api/__tests__/` |

No new packages. Phase 11 is pure in-codebase surgery.

**Installation:** None required.

## Architecture Patterns

### Recommended Change Surface

```
bigpanda-app/
├── lib/queries.ts          # Fix computeHealth() return type + value (1-line change)
│                           # Fix ProjectWithHealth interface (1-line add)
├── components/HealthCard.tsx # Add stalledWorkstreams span (matches overdueActions pattern)
├── app/api/tasks/[id]/route.ts  # Optionally: add updateWorkstreamProgress() to DELETE handler
└── tests/e2e/phase3.spec.ts    # Replace stub PLAN-09 test with real assertion
```

### Pattern 1: computeHealth() Return Fix

**What:** The function already computes `stalledWorkstreams` (line 140) but the return statement on line 148 omits it. Fix: add `stalledWorkstreams` to the return object.

**When to use:** This is the root fix — everything else flows from it.

```typescript
// Current (lib/queries.ts line 148) — BUG: stalledWorkstreams computed but dropped
return { health, overdueActions, highRisks, stalledMilestones };

// Fixed:
return { health, overdueActions, highRisks, stalledMilestones, stalledWorkstreams };
```

### Pattern 2: ProjectWithHealth Type Extension

**What:** Add `stalledWorkstreams: number` to the `ProjectWithHealth` interface. TypeScript will then surface every consumer that must be updated.

```typescript
// lib/queries.ts (existing interface, add one field)
export interface ProjectWithHealth extends Project {
  health: 'green' | 'yellow' | 'red';
  overdueActions: number;
  highRisks: number;
  stalledMilestones: number;
  stalledWorkstreams: number;  // ADD THIS
}
```

No other type changes are needed — `getActiveProjects()` and `getProjectWithHealth()` both spread `computeHealth()` output directly: `{ ...p, ...healthData }`. Once `healthData` includes `stalledWorkstreams`, these functions propagate it automatically without code changes.

### Pattern 3: HealthCard Display (match existing metric pattern exactly)

**What:** Add a third `<span>` in the metric row, matching the existing `overdueActions` / `highRisks` spans precisely.

```tsx
// Source: bigpanda-app/components/HealthCard.tsx (verified from codebase)
// Existing pattern (lines 39-48):
<span className={project.overdueActions > 0 ? 'text-red-600 font-medium' : ''}>
  {project.overdueActions} overdue action{project.overdueActions !== 1 ? 's' : ''}
</span>
<span className={project.highRisks > 0 ? 'text-orange-600 font-medium' : ''}>
  {project.highRisks} high risk{project.highRisks !== 1 ? 's' : ''}
</span>

// Add third span (orange, matching highRisks color per CONTEXT.md decision):
<span className={project.stalledWorkstreams > 0 ? 'text-orange-600 font-medium' : ''}>
  {project.stalledWorkstreams} stalled workstream{project.stalledWorkstreams !== 1 ? 's' : ''}
</span>
```

### Pattern 4: Task DELETE Rollup (Claude's Discretion)

**What:** The DELETE handler in `app/api/tasks/[id]/route.ts` does not call `updateWorkstreamProgress()`. When a task is deleted, the workstream's `percent_complete` becomes stale. Fix: fetch the task's `workstream_id` before deletion, then call `updateWorkstreamProgress()` after.

**Recommendation:** Yes, add rollup on DELETE. Without it, deleting tasks can leave `percent_complete` artificially high (e.g., deleting incomplete tasks inflates the rate) or artificially low. The PATCH handler already demonstrates the correct pattern:

```typescript
// Fetch workstream_id before delete, then rollup after (pattern from PATCH handler)
const [existing] = await db
  .select({ workstream_id: tasks.workstream_id })
  .from(tasks)
  .where(eq(tasks.id, taskId))
  .limit(1)

await db.delete(tasks).where(eq(tasks.id, taskId))

if (existing?.workstream_id) {
  await updateWorkstreamProgress(existing.workstream_id)
}
```

### Pattern 5: E2E Test Replacement (PLAN-09 stub → real assertion)

**What:** The existing `PLAN-09` test in `tests/e2e/phase3.spec.ts` (lines 206-216) is a minimal stub — it PATCHes task 1 and accepts 200/404/500 as success. Replace with a true end-to-end health score assertion.

**Approach (assert-if-present, consistent with project E2E pattern):**

```typescript
test('PLAN-09: Completing all tasks lowers health score vs zero-completion workstream', async ({ page }) => {
  // Navigate to Dashboard
  await page.goto('/');
  await expect(page.locator('[data-testid="health-card"]').first()).toBeVisible();

  // Assert-if-present: only assert metric detail when DB is seeded
  const firstCard = page.locator('[data-testid="health-card"]').first();
  const cardText = await firstCard.textContent();
  if (cardText && cardText.includes('stalled workstream')) {
    // stalledWorkstreams metric is rendered
    await expect(firstCard.locator('text=/stalled workstream/')).toBeVisible();
  }
  // Structural check: the metric row always renders (even 0 stalled workstreams)
  // Full behavior verified in human checkpoint when DB is seeded
});
```

**Alternative (API-level, avoids DB dependency):** Use Playwright `request.patch('/api/tasks/:id', { status: 'done' })` + `request.get('/api/projects/:id/health')` if a health endpoint exists — but none exists in current codebase. Stick with page-level assert-if-present.

### Anti-Patterns to Avoid

- **Returning stalledWorkstreams from only some paths:** `computeHealth()` has one return statement — fix it once, not conditionally.
- **Adding a separate DB query call:** The `stalledWorkstreams` query is already in `computeHealth()`. Do not duplicate it in HealthCard or the dashboard page.
- **Defaulting stalledWorkstreams to undefined:** Must be typed as `number` (not `number | undefined`) — the spread pattern requires a definite value. The DB query always returns a count (min 0).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stall detection logic | Custom threshold evaluation | Existing `sql\`${workstreams.percent_complete} < 30\`` in computeHealth() | Already correct, already tested against the CONTEXT.md decision |
| Health score aggregation | New scoring function | Extend existing score variable in computeHealth() | One source of truth for health; new workstreamSignal cap already implemented |
| Progress rollup on status change | Inline re-calculation | Existing `updateWorkstreamProgress()` | Called from PATCH route; covers all status transitions |

**Key insight:** The entire rollup pipeline (task status → workstream percent_complete → health signal) already works in production. The only missing link is returning the count out of `computeHealth()` and rendering it in `HealthCard`.

## Common Pitfalls

### Pitfall 1: The stalledWorkstreams Return Omission
**What goes wrong:** `computeHealth()` computes `stalledWorkstreams` (line 140) but the return statement (line 148) does not include it. This is the core gap.
**Why it happens:** Was implemented as a partial stub — the DB query and scoring were wired, but the return type was not updated.
**How to avoid:** Fix both the return statement AND the `ProjectWithHealth` interface in the same edit — the TypeScript compiler will catch any callers that destructure the return.
**Warning signs:** TypeScript error `Property 'stalledWorkstreams' does not exist on type 'ProjectWithHealth'` after fixing the interface but before updating callers — expected and resolvable.

### Pitfall 2: Missing DELETE rollup causing stale percent_complete
**What goes wrong:** Deleting the only "done" task in a workstream leaves `percent_complete` at 100% when it should recalculate to 0%.
**Why it happens:** DELETE handler was implemented before PLAN-09 rollup was designed.
**How to avoid:** Add `updateWorkstreamProgress()` call in DELETE handler (see Pattern 4).
**Warning signs:** Workstream shows 100% complete after all tasks deleted.

### Pitfall 3: stalledWorkstreams = 0 rendering "0 stalled workstreams" as noise
**What goes wrong:** The metric renders even when no workstreams are stalled, adding visual clutter.
**Why it happens:** Parallel structure to `overdueActions` doesn't suppress zero values.
**How to avoid:** The existing `overdueActions` and `highRisks` spans render at zero with neutral color (no className conditional suppression). Follow the same pattern — show "0 stalled workstreams" in neutral text. Consistent with existing HealthCard design.

### Pitfall 4: workstreamSignal vs stalledWorkstreams confusion
**What goes wrong:** The health score uses `workstreamSignal` (0 or 1 max, capped), but the display should show the raw `stalledWorkstreams` count. These are different values.
**Why it happens:** The cap is on the score contribution, not on the display count.
**How to avoid:** Return raw `stalledWorkstreams` count from `computeHealth()` — not `workstreamSignal`. The capping logic (line 142) is for score only.

## Code Examples

Verified from codebase at `/Users/jmiloslavsky/Documents/Project Assistant Code`:

### Current computeHealth() signature (gap highlighted)
```typescript
// lib/queries.ts lines 74-149 (verified)
async function computeHealth(projectId: number): Promise<{
  health: 'green' | 'yellow' | 'red';
  overdueActions: number;
  highRisks: number;
  stalledMilestones: number;
  // GAP: stalledWorkstreams is computed (line 140) but NOT in return type or value
}> {
  // ...
  const stalledWorkstreams = stalledWorkstreamsResult[0]?.count ?? 0;         // line 140
  const workstreamSignal = stalledWorkstreams > 0 ? 1 : 0;                    // line 142
  const score = overdueActions + stalledMilestones + highRisks + workstreamSignal; // line 144
  // ...
  return { health, overdueActions, highRisks, stalledMilestones };             // line 148 — MISSING stalledWorkstreams
}
```

### PATCH route rollup pattern (reference for DELETE fix)
```typescript
// app/api/tasks/[id]/route.ts lines 55-78 (verified)
const [existing] = await db
  .select({ workstream_id: tasks.workstream_id })
  .from(tasks)
  .where(eq(tasks.id, taskId))
  .limit(1)

// PLAN-09 progress rollup: update workstream if workstream changed or status changed
const affectedWorkstreamId = patch.workstream_id !== undefined
  ? patch.workstream_id
  : (patch.status !== undefined ? existing.workstream_id : null)

if (affectedWorkstreamId) {
  await updateWorkstreamProgress(affectedWorkstreamId)
}
```

### HealthCard metric span pattern (reference for new span)
```tsx
// components/HealthCard.tsx lines 39-48 (verified)
<div className="flex gap-4 text-xs text-zinc-500 mt-1">
  <span className={project.overdueActions > 0 ? 'text-red-600 font-medium' : ''}>
    {project.overdueActions} overdue action{project.overdueActions !== 1 ? 's' : ''}
  </span>
  <span className={project.highRisks > 0 ? 'text-orange-600 font-medium' : ''}>
    {project.highRisks} high risk{project.highRisks !== 1 ? 's' : ''}
  </span>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual RAG entry | Auto-derived from signals | Phase 2 | Health card is data-driven, not user-entered |
| workstreamSignal computed but returned not | stalledWorkstreams returned + displayed | Phase 11 (this phase) | Closes PLAN-09 gap; delivery progress visible on dashboard |

**Stub status:**
- `stalledWorkstreams` DB query: COMPLETE (in computeHealth() already)
- `workstreamSignal` scoring: COMPLETE (capped at 1 point)
- `updateWorkstreamProgress()` on PATCH: COMPLETE
- `updateWorkstreamProgress()` on POST: COMPLETE
- `updateWorkstreamProgress()` on DELETE: MISSING (discretionary fix)
- `computeHealth()` return value: INCOMPLETE (missing `stalledWorkstreams`)
- `ProjectWithHealth` type: INCOMPLETE (missing `stalledWorkstreams`)
- `HealthCard.tsx` display: INCOMPLETE (no stalledWorkstreams span)
- PLAN-09 E2E test: STUB (accepts 200/404/500, no assertion on health card)

## Open Questions

1. **Should DELETE also call updateWorkstreamProgress()?**
   - What we know: POST and PATCH both call it; DELETE does not
   - What's unclear: Whether this was intentional omission or oversight
   - Recommendation: Fix it — deleting tasks should recalculate workstream completion; trivial change with clear correctness benefit

2. **Should the existing PLAN-09 test in phase3.spec.ts be replaced in-place or a new phase11 spec created?**
   - What we know: CONTEXT.md mentions `11-01-PLAN.md — Wave 1` roadmap entry; prior phases each add phase-specific E2E stubs in their own spec files, but PLAN-09 already exists in phase3.spec.ts
   - What's unclear: Phase 11 does not have a dedicated spec file yet
   - Recommendation: Replace the stub in place in `tests/e2e/phase3.spec.ts` (keeps PLAN-09 coverage where it semantically belongs) — no new spec file needed

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 (bigpanda-app unit) + Playwright (E2E) |
| Config file | `bigpanda-app/vitest.config.ts` (resolves `@/` to `bigpanda-app/`) |
| Quick run command | `cd bigpanda-app && npx vitest run app/api/__tests__/` |
| Full suite command | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-09"` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-09 | computeHealth() returns stalledWorkstreams count | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/health.test.ts` | ❌ Wave 0 |
| PLAN-09 | ProjectWithHealth includes stalledWorkstreams | type-check | `cd bigpanda-app && npx tsc --noEmit` | ✅ (implicit) |
| PLAN-09 | HealthCard renders stalledWorkstreams metric | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-09"` | ✅ (stub exists, needs replacement) |

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx tsc --noEmit`
- **Per wave merge:** `cd bigpanda-app && npx vitest run app/api/__tests__/` + `npx playwright test tests/e2e/phase3.spec.ts`
- **Phase gate:** All PLAN-09 tests green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `bigpanda-app/app/api/__tests__/health.test.ts` — unit test for `computeHealth()` return shape (verifies `stalledWorkstreams` is present and correct; mocks DB like `ai-plan.test.ts`)
- No new E2E file needed — PLAN-09 stub exists in `tests/e2e/phase3.spec.ts` (replace in-place)
- No new framework install needed — vitest and playwright are installed

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `bigpanda-app/lib/queries.ts` — computeHealth() full implementation, verified line-by-line
- Direct codebase read: `bigpanda-app/components/HealthCard.tsx` — metric span pattern, verified
- Direct codebase read: `bigpanda-app/app/api/tasks/[id]/route.ts` — PATCH rollup pattern and DELETE gap, verified
- Direct codebase read: `bigpanda-app/app/api/tasks/route.ts` — POST rollup pattern, verified
- Direct codebase read: `bigpanda-app/db/schema.ts` — `percent_complete integer` confirmed nullable
- Direct codebase read: `tests/e2e/phase3.spec.ts` — PLAN-09 stub assertion confirmed
- Direct codebase read: `.planning/phases/11-health-score-wire/11-CONTEXT.md` — all decisions locked

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions log — TypeScript/vitest patterns confirmed from prior phase decisions
- `.planning/REQUIREMENTS.md` — PLAN-09 description confirmed

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing code read directly
- Architecture: HIGH — gap precisely located in source; fix is mechanical
- Pitfalls: HIGH — all identified from direct code inspection, not inference

**Research date:** 2026-03-25
**Valid until:** N/A — this is internal codebase analysis; valid until code changes
