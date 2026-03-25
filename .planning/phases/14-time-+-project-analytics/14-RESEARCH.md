# Phase 14: Time + Project Analytics - Research

**Researched:** 2026-03-25
**Domain:** Analytics layer — SQL aggregation, CSS bar charts, inline editable fields, DB migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Action Velocity Chart (Dashboard HealthCard)**
- Visual form: CSS bar columns — 4 vertical bars, one per week, heights proportional to completed actions. Pure Tailwind, no chart library dependency (consistent with RiskHeatMap and GanttChart).
- Placement: Inline on each HealthCard — action velocity lives alongside the existing health signals (RAG, open actions count) on the per-project card. No new dashboard section.
- Trend direction: Compare latest week vs prior week. Up = this week > last week. Flat = within ~10% (1–2 action) difference. Down = this week < last week.
- Completion filter: `status = 'completed'` only — matches the terminal state used throughout the app.

**Risk Trend Indicator (Dashboard HealthCard)**
- Placement: Inline on each HealthCard alongside the velocity chart — both analytics live on the HealthCard together.
- Display: Number + directional arrow — e.g. "5 open risks ↑". Arrow indicates whether open risk count is growing (↑), shrinking (↓), or flat (→) vs prior week.
- "Open" definition: `status NOT IN ('resolved', 'closed', 'accepted')` — captures active, monitoring, and escalated risks.

**Weekly Rollup Table Layout (Time Tab)**
- Structure: Collapsible "Weekly Summary" section above the existing entry log. The flat log table below stays exactly as-is (Phase 5.2 implementation untouched). Two panels: summary above, log below.
- Weekly summary table columns: Week (date range e.g. "Mar 17–23") | Hours (sum). Two columns only — no variance column in the summary table.
- Covers last 8 weeks as per success criteria.

**Capacity Planning (Time Tab Header)**
- Location: Inline in the Time tab header — an editable field: "Weekly Target: [ ] hrs". Click to edit, stored per-project in the DB.
- Storage: New column on the `projects` table (e.g. `weekly_hour_target numeric(5,2)`) or a project-settings row. Per-project, not global.
- Capacity view: The per-week capacity planning is displayed in the Time tab header row alongside the existing "X.X hrs total" summary — shows "Target: X hrs / Actual: Y hrs (this week)" as a simple stat row, separate from the weekly summary table.
- Over/under per week is shown in the weekly summary table as a separate capacity row below the 8-week table, or as an inline ±variance per week — Claude's discretion on exact layout.

### Claude's Discretion
- Exact HealthCard layout for the two new analytics rows (bar chart + risk indicator)
- Whether the weekly summary section is collapsed by default or expanded
- DB migration approach for `weekly_hour_target` column
- Exact capacity planning row styling within the Time tab

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 14 adds an analytics layer on top of existing data — no new data capture, only aggregation and display. Three distinct work areas: (1) the Time tab gains a weekly rollup table and capacity planning header, (2) Dashboard HealthCards gain an action velocity CSS bar chart and a risk trend indicator, and (3) a new `weekly_hour_target` column is added to the `projects` table.

The entire implementation is consistent with established project patterns: hand-rolled CSS visualization (no chart library), PostgreSQL SQL aggregation in `lib/queries.ts`, plain `fetch() + useState + useEffect` in `TimeTab.tsx` (not TanStack Query), and RSC for the Dashboard passing enriched data down to `HealthCard.tsx`. The only novel pattern is the inline-editable target field — a click-to-edit input that saves via PATCH to the existing project API.

The biggest design decision is the HealthCard data flow. The Dashboard page is an RSC that calls `getDashboardData()` synchronously at render time. Adding analytics to HealthCard means either (a) extending `getDashboardData()` to include weekly action and risk counts per project, or (b) converting HealthCard to a client component with its own fetch. Option (a) is the correct pattern for this codebase: keep HealthCard as a pure server component, extend the `ProjectWithHealth` type, add analytics queries inside `getDashboardData()`.

**Primary recommendation:** Extend `getDashboardData()` + `ProjectWithHealth` to carry analytics data; keep HealthCard as RSC; add a new `analytics` API endpoint only for the Time tab's weekly rollup (since TimeTab is already a client component with its own fetch lifecycle).

---

## Standard Stack

### Core (existing — no new installs required)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | existing | DB queries + schema | Already used throughout |
| Drizzle `sql` tagged template | existing | Raw SQL for date aggregations | `sql<T>` used in computeHealth() already |
| PostgreSQL `date_trunc` | DB built-in | ISO week grouping | Standard PG date function |
| Tailwind CSS v4 | existing | CSS bar heights + arrows | Consistent with RiskHeatMap pattern |
| shadcn/ui | existing | Card layout for HealthCard | Already used in HealthCard.tsx |

### No New Dependencies
This phase requires zero new npm packages. All visualization is hand-rolled Tailwind (confirmed pattern: RiskHeatMap.tsx uses no chart library). All DB access uses existing Drizzle setup.

---

## Architecture Patterns

### Pattern 1: Extending getDashboardData() for HealthCard Analytics

**What:** Add two new sub-queries to `getDashboardData()` in `lib/queries.ts` — one for weekly action completions (last 4 weeks, per project), one for open risk counts (this week vs last week, per project). Attach results to the `ProjectWithHealth` type.

**Why this pattern:** Dashboard page (`app/page.tsx`) is an RSC that calls `getDashboardData()`. HealthCard receives `project: ProjectWithHealth` as a prop. Keeping HealthCard as a pure RSC (no `'use client'`) is optimal — no hydration cost, consistent with current implementation.

**Extend the type:**
```typescript
// lib/queries.ts
export interface ProjectWithHealth extends Project {
  health: 'green' | 'yellow' | 'red';
  overdueActions: number;
  highRisks: number;
  stalledMilestones: number;
  stalledWorkstreams: number;
  // NEW for Phase 14:
  velocityWeeks: number[];       // [week-3-count, week-2-count, week-1-count, this-week-count] oldest→newest
  actionTrend: 'up' | 'flat' | 'down';
  openRiskCount: number;
  riskTrend: 'up' | 'flat' | 'down';
}
```

### Pattern 2: Weekly Action Completion Query

**What:** SQL aggregation grouping completed actions by ISO week for last 4 weeks. Uses `date_trunc('week', date::date)` on the actions table. Actions have `due` field (TEXT) — but completion timestamp isn't tracked. The correct signal is `updated_at` (when the status changed to 'completed').

**Critical insight:** The actions table has `status = 'completed'` and `updated_at TIMESTAMP`. Use `updated_at` as the completion timestamp, not `due`. This is the only date that accurately reflects when work finished.

```sql
-- Weekly completed action counts for a project, last 4 weeks
SELECT
  date_trunc('week', updated_at) AS week_start,
  COUNT(*)::int AS count
FROM actions
WHERE project_id = $projectId
  AND status = 'completed'
  AND updated_at >= NOW() - INTERVAL '4 weeks'
GROUP BY week_start
ORDER BY week_start ASC
```

In Drizzle:
```typescript
// Source: Drizzle ORM sql tagged template, existing pattern from queries.ts
const rows = await tx
  .select({
    week_start: sql<string>`date_trunc('week', ${actions.updated_at})::text`,
    count: sql<number>`count(*)::int`,
  })
  .from(actions)
  .where(
    and(
      eq(actions.project_id, projectId),
      eq(actions.status, 'completed'),
      sql`${actions.updated_at} >= now() - interval '4 weeks'`
    )
  )
  .groupBy(sql`date_trunc('week', ${actions.updated_at})`)
  .orderBy(sql`date_trunc('week', ${actions.updated_at}) ASC`);
```

After fetching, fill sparse results into a fixed 4-element array. Weeks with no completions must appear as 0 — SQL GROUP BY omits empty weeks.

### Pattern 3: Open Risk Count Trend Query

**What:** Count open risks (status NOT IN ('resolved', 'closed', 'accepted')) this week and last week. The risk.status column is plain `text` (not an enum — confirmed in schema.ts line 122), so use `NOT IN` with string values.

```typescript
// This week: updated_at in current ISO week
// Last week: updated_at in prior ISO week — OR snapshot-based: count open today vs count open 7 days ago
// CORRECT APPROACH: Count currently-open risks, and count risks that were open 7 days ago
// (i.e., status != terminal AND created_at <= 7-days-ago)
// Simplification: compare open risk count now vs open risk count excluding items opened in last 7 days

const openNow = await tx
  .select({ count: sql<number>`count(*)::int` })
  .from(risks)
  .where(
    and(
      eq(risks.project_id, projectId),
      sql`${risks.status} NOT IN ('resolved', 'closed', 'accepted')`
    )
  );

// "Was open last week" = open risks that existed 7+ days ago (created more than 7 days ago, still open)
const openLastWeek = await tx
  .select({ count: sql<number>`count(*)::int` })
  .from(risks)
  .where(
    and(
      eq(risks.project_id, projectId),
      sql`${risks.status} NOT IN ('resolved', 'closed', 'accepted')`,
      sql`${risks.created_at} < now() - interval '7 days'`
    )
  );
```

Trend: if openNow > openLastWeek → "up" (growing exposure). If less → "down". If same ±0 → "flat".

### Pattern 4: Weekly Time Rollup (8 weeks)

**What:** New API endpoint `/api/projects/[projectId]/analytics` (GET) that returns weekly rollup data. TimeTab is a client component (`'use client'`) already fetching `/api/projects/[projectId]/time-entries` — add a second fetch for analytics data.

```typescript
// New endpoint: app/api/projects/[projectId]/analytics/route.ts
// Returns: { weeklyRollup: [{weekLabel: 'Mar 17–23', hours: 6.5, variance: -8.5}], totalHours: number, weeklyTarget: number | null }

// SQL for weekly rollup (last 8 weeks):
SELECT
  date_trunc('week', date::date) AS week_start,
  SUM(hours::numeric)::numeric AS total_hours
FROM time_entries
WHERE project_id = $projectId
  AND date::date >= CURRENT_DATE - INTERVAL '8 weeks'
GROUP BY week_start
ORDER BY week_start ASC
```

Week label formatting ("Mar 17–23"): computed in JavaScript from week_start date — `new Date(week_start)` → format Mon and Sun of that week.

### Pattern 5: Inline-Editable Weekly Target Field

**What:** The Time tab header needs a click-to-edit field that saves `weekly_hour_target` to the projects table. Pattern: show value as text, click converts to `<input>`, blur/Enter triggers PATCH.

```typescript
// In TimeTab.tsx (client component) — new state:
const [weeklyTarget, setWeeklyTarget] = useState<number | null>(null);
const [editingTarget, setEditingTarget] = useState(false);
const [targetInput, setTargetInput] = useState('');

// Inline pattern:
{editingTarget ? (
  <input
    autoFocus
    type="number"
    step="0.5"
    value={targetInput}
    onChange={(e) => setTargetInput(e.target.value)}
    onBlur={handleSaveTarget}
    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTarget(); if (e.key === 'Escape') setEditingTarget(false); }}
    className="border border-zinc-300 rounded px-2 py-0.5 text-sm w-16 focus:outline-none focus:ring-1 focus:ring-zinc-400"
  />
) : (
  <button onClick={() => { setEditingTarget(true); setTargetInput(String(weeklyTarget ?? '')); }}
    className="text-sm text-zinc-600 hover:underline cursor-pointer">
    {weeklyTarget != null ? `${weeklyTarget} hrs target` : 'Set target'}
  </button>
)}
```

PATCH endpoint: extend existing `/api/projects/[projectId]/route.ts` or add a dedicated settings endpoint. Check whether `app/api/projects/[projectId]/route.ts` already accepts PATCH.

### Pattern 6: CSS Velocity Bar Chart

**What:** Pure Tailwind div bars. 4 bars, width fixed, height driven by inline style `style={{ height: \`${pct}%\` }}` within a fixed-height container.

```tsx
// In HealthCard.tsx — new rows at bottom of CardContent
// velocityWeeks: [n0, n1, n2, n3] oldest→newest
const maxCount = Math.max(...velocityWeeks, 1); // avoid div-by-zero

<div className="mt-2 pt-2 border-t border-zinc-100">
  <div className="flex items-end gap-1 h-8">
    {velocityWeeks.map((count, i) => (
      <div
        key={i}
        className="flex-1 bg-zinc-300 rounded-sm min-h-[2px]"
        style={{ height: `${Math.max((count / maxCount) * 100, 5)}%` }}
        title={`${count} completed`}
      />
    ))}
    <span className="text-xs text-zinc-500 ml-1 self-center">
      {project.actionTrend === 'up' ? '↑' : project.actionTrend === 'down' ? '↓' : '→'}
    </span>
  </div>
  <p className="text-xs text-zinc-400 mt-0.5">Action velocity (4w)</p>
</div>
```

### Pattern 7: DB Migration for weekly_hour_target

**What:** New migration file `0010_analytics.sql`. Adds `weekly_hour_target` to `projects` table and updates Drizzle schema.ts.

The `time_entries.hours` column is TEXT (not numeric). Weekly aggregation via `SUM(hours::numeric)` works because PostgreSQL casts text '1.5' to numeric at query time. This is confirmed by existing code at `time-entries/route.ts`.

```sql
-- bigpanda-app/db/migrations/0010_analytics.sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS weekly_hour_target NUMERIC(5,2);
```

In schema.ts, add to the projects table definition:
```typescript
import { numeric } from 'drizzle-orm/pg-core'; // add to imports
// In projects table:
weekly_hour_target: numeric('weekly_hour_target', { precision: 5, scale: 2 }),
```

### Recommended File Structure Changes

```
bigpanda-app/
├── db/
│   ├── migrations/
│   │   └── 0010_analytics.sql          # NEW — adds weekly_hour_target
│   └── schema.ts                        # MODIFIED — add weekly_hour_target to projects
├── lib/
│   └── queries.ts                       # MODIFIED — extend ProjectWithHealth + getDashboardData()
├── components/
│   ├── HealthCard.tsx                   # MODIFIED — add velocity bars + risk trend rows
│   └── TimeTab.tsx                      # MODIFIED — add weekly summary + capacity header
└── app/api/projects/[projectId]/
    └── analytics/
        └── route.ts                     # NEW — weekly rollup + weeklyTarget fetch/update
tests/e2e/
└── phase14.spec.ts                      # NEW — Wave 0 RED stubs
```

### Anti-Patterns to Avoid

- **Converting HealthCard to a client component:** Unnecessary, adds hydration cost. Keep RSC — pass data from getDashboardData().
- **Adding a third fetch in TimeTab for weekly target:** Combine into the analytics endpoint — one fetch returns weeklyRollup + weeklyTarget + totalHours.
- **Using `due` date for action velocity:** `due` is when action was supposed to be done. `updated_at` is when it was actually completed. Use `updated_at`.
- **Filtering actions by `due` date range for "completed this week":** Same problem — must use `updated_at` for temporal placement of completion events.
- **Installing recharts/d3/victory:** Explicitly locked out by CONTEXT.md. CSS bars only.
- **Storing weekly target globally (settings table):** Must be per-project on the `projects` table per locked decision.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Week boundary dates | Custom week-start logic | `date_trunc('week', ...)` in PostgreSQL | Handles ISO week boundaries correctly including year-boundary edge cases |
| Sparse week filling | Complex bucketing code | Generate 4/8 fixed slots in JS, LEFT JOIN or fill-from-map | Simple, explicit, correct |
| Percentage heights for bars | Absolute pixel math | CSS `height: X%` within a fixed parent height | Pure Tailwind, responds to container size |

---

## Common Pitfalls

### Pitfall 1: Empty Weeks Missing from SQL GROUP BY
**What goes wrong:** `GROUP BY date_trunc('week', ...)` omits weeks with no data. The velocity array ends up with 2 elements instead of 4.
**Why it happens:** SQL GROUP BY only produces rows for groups that exist.
**How to avoid:** Fetch the sparse SQL result, then fill a fixed 4-element array in JavaScript. Build a Map from week_start → count, then iterate over the 4 expected week starts (now, -1w, -2w, -3w) and look up each.
**Warning signs:** Velocity bars showing fewer than 4 bars.

### Pitfall 2: TEXT hours column — parseFloat() required
**What goes wrong:** `SUM(hours)` fails or returns wrong type because `hours` is TEXT in time_entries.
**Why it happens:** Phase 5.2 decision (STATE.md): hours stored as decimal string '1.5'.
**How to avoid:** Always cast in SQL: `SUM(hours::numeric)`. Already done this way in the GET handler.

### Pitfall 3: Risk trend "snapshot" problem
**What goes wrong:** Developer compares `COUNT(open risks updated this week)` vs `COUNT(open risks updated last week)` — this compares churn rate, not open count trend.
**Why it happens:** Misreading "trend" as "activity" rather than "stock count change".
**How to avoid:** Compare `openNow` (all currently open risks) vs `openLastWeek` (open risks that existed 7 days ago — i.e., open risks created more than 7 days ago, still open today).

### Pitfall 4: HealthCard RSC receiving client-only data
**What goes wrong:** Analytics queries involve async DB calls — if added incorrectly, TypeScript complains about async in a non-async component.
**Why it happens:** RSC (server component) can be async — but only if called from another RSC context, not from a client component.
**How to avoid:** All analytics queries run inside `getDashboardData()` (already async, already RSC context). HealthCard receives pre-computed data via props synchronously — no async in HealthCard itself.

### Pitfall 5: Inline numeric import for schema.ts
**What goes wrong:** Drizzle schema uses `text()` for hours and similar; `numeric()` is not in the existing imports.
**Why it happens:** The initial schema only needed `text`, `integer`, `serial`, `boolean`, etc.
**How to avoid:** Add `numeric` to the import from `drizzle-orm/pg-core` when adding `weekly_hour_target` column.

### Pitfall 6: analytics endpoint RLS pattern
**What goes wrong:** New `/api/projects/[projectId]/analytics/route.ts` forgets to set the RLS session variable, causing empty results.
**Why it happens:** All project-scoped tables use `SET LOCAL app.current_project_id = X` in a transaction (established pattern in time-entries route).
**How to avoid:** Follow the exact pattern from `time-entries/route.ts` — wrap all queries in `db.transaction(async (tx) => { await tx.execute(sql.raw(\`SET LOCAL app.current_project_id = ${numericId}\`)); ... })`.

---

## Code Examples

### getDashboardData() Extension Pattern
```typescript
// Source: existing pattern in lib/queries.ts — computeHealth() runs per-project in a loop
// Extend with analytics queries inside the same per-project loop:

for (const p of activeProjects) {
  const healthData = await computeHealth(p.id);
  const analyticsData = await computeProjectAnalytics(p.id); // new function
  projects.push({ ...p, ...healthData, ...analyticsData });
}

// New helper function:
async function computeProjectAnalytics(projectId: number): Promise<{
  velocityWeeks: number[];
  actionTrend: 'up' | 'flat' | 'down';
  openRiskCount: number;
  riskTrend: 'up' | 'flat' | 'down';
}> {
  // velocity query + risk query
  // Fill sparse weeks into fixed 4-element array
  // Compute trends
}
```

### Week Label Formatting (JavaScript)
```typescript
// Source: standard JS date manipulation — no library needed
function formatWeekLabel(weekStartISO: string): string {
  const start = new Date(weekStartISO + 'T00:00:00Z');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(start)}–${fmt(end)}`; // e.g. "Mar 17–23"
}
```

### Trend Computation
```typescript
// Source: CONTEXT.md decision — flat = within ~10% (1-2 action difference)
function computeTrend(current: number, prior: number): 'up' | 'flat' | 'down' {
  const diff = current - prior;
  if (Math.abs(diff) <= 1) return 'flat'; // within 1 = flat (conservative threshold)
  return diff > 0 ? 'up' : 'down';
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chart library (recharts/d3) | Hand-rolled CSS divs | Project-established pattern (Phases 6+) | No new dep, consistent with RiskHeatMap |
| TanStack Query for all fetches | Plain fetch + useState for TimeTab | Phase 5.2 | TimeTab extensions must continue using plain fetch |
| Global settings | Per-project columns on projects table | Established (CONTEXT.md) | weekly_hour_target must be on projects table |

---

## Open Questions

1. **Does `/api/projects/[projectId]/route.ts` accept PATCH for project updates?**
   - What we know: The endpoint exists (`app/api/projects/[projectId]/route.ts`). Time entries have their own route.
   - What's unclear: Whether PATCH is implemented for arbitrary project columns.
   - Recommendation: Check the file. If PATCH exists, extend it to handle `weekly_hour_target`. If not, add PATCH to the analytics route or the main project route. Given the existing code doesn't surface this in grep results, adding PATCH to the main project route is the cleanest approach.

2. **Week boundary: ISO week (Mon–Sun) vs. calendar week (Sun–Sat)?**
   - What we know: PostgreSQL `date_trunc('week', ...)` returns Monday as the start of week (ISO 8601).
   - What's unclear: User preference. CONTEXT.md example shows "Mar 17–23" (Mon–Sun) which aligns with ISO week.
   - Recommendation: Use ISO week (Monday start) — `date_trunc('week', ...)` default. No special handling needed.

3. **Should the analytics endpoint be combined with the time-entries GET, or a separate route?**
   - What we know: TimeTab currently fetches `/api/projects/[projectId]/time-entries`. The weekly rollup requires different aggregation (not per-entry rows).
   - Recommendation: Separate `/analytics` endpoint — keeps time-entries route clean, and analytics data has a different cache lifecycle than raw entries.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (existing, `@playwright/test`) |
| Config file | `playwright.config.ts` (project root) |
| Quick run command | `npx playwright test tests/e2e/phase14.spec.ts` |
| Full suite command | `npx playwright test` |

### Phase Requirements to Test Map

This phase has no formal requirement IDs assigned (per task brief: "new capability — extends TIME-01/02/03 and DASH-02/03 coverage"). Tests are organized by success criteria:

| Success Criterion | Behavior | Test Type | Automated Command |
|-------------------|----------|-----------|-------------------|
| SC-1: Weekly summary table | Time tab shows `[data-testid="weekly-summary"]` + 8 rows max | E2E structural | `npx playwright test tests/e2e/phase14.spec.ts --grep "weekly summary"` |
| SC-1: Total hours header | `[data-testid="total-hours"]` visible (extends TIME-01) | E2E structural | existing TIME-01 still passes |
| SC-2: Velocity chart | HealthCard shows `[data-testid="velocity-chart"]` with 4 bars | E2E structural | `npx playwright test tests/e2e/phase14.spec.ts --grep "velocity"` |
| SC-2: Trend indicator | `[data-testid="action-trend"]` shows ↑/↓/→ | E2E structural | same spec |
| SC-3: Risk trend | HealthCard shows `[data-testid="risk-trend"]` | E2E structural | same spec |
| SC-4: Capacity planning | Time tab shows `[data-testid="weekly-target"]` editable field | E2E structural | `npx playwright test tests/e2e/phase14.spec.ts --grep "capacity"` |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/e2e/phase14.spec.ts`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/e2e/phase14.spec.ts` — 6 E2E stubs covering all success criteria (does not exist yet)

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `bigpanda-app/components/HealthCard.tsx` — confirmed RSC, prop shape, no client directive
- Direct code read: `bigpanda-app/components/TimeTab.tsx` — confirmed `'use client'`, plain fetch pattern, existing total-hours testid
- Direct code read: `bigpanda-app/lib/queries.ts` — confirmed `computeHealth()` pattern, `ProjectWithHealth` type, SQL tagged template usage
- Direct code read: `bigpanda-app/db/schema.ts` — confirmed `risk.status` is plain `text`, `actions.updated_at` is TIMESTAMP, `weekly_hour_target` does NOT exist yet
- Direct code read: `bigpanda-app/db/migrations/` — next migration number is `0010_analytics.sql`
- Direct code read: `bigpanda-app/app/api/projects/[projectId]/time-entries/route.ts` — confirmed RLS SET LOCAL pattern, `hours::numeric` cast pattern
- Direct code read: `bigpanda-app/app/page.tsx` — confirmed Dashboard is RSC, calls getDashboardData(), passes project to HealthCard
- Direct code read: `.planning/config.json` — confirmed `nyquist_validation: true`

### Secondary (MEDIUM confidence)
- PostgreSQL `date_trunc('week', ...)` behavior: ISO Monday week-start is standard PG behavior, well-established
- Drizzle ORM `numeric` column type: standard Drizzle feature, consistent with pg-core imports pattern used elsewhere in schema.ts

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing
- Architecture: HIGH — directly read all integration points from source
- Pitfalls: HIGH — derived from actual schema inspection (risk status is text, not enum; hours is text; updated_at is the completion timestamp)
- DB migration: HIGH — migration pattern read directly, next number confirmed as 0010

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable codebase, low churn risk)
