# Phase 34: Overview Tab — Metrics & Health Dashboard - Research

**Researched:** 2026-04-02
**Domain:** Data aggregation, visualization with Recharts, dashboard metrics
**Confidence:** HIGH

## Summary

Phase 34 adds three read-only visualization sections to the Overview tab: a Recharts-based Milestone Timeline (replacing the existing custom scroller), a Metrics section (onboarding progress rings, risk distribution donut, hours spent bar chart), and a Health Dashboard (overall RAG indicator, per-track health badges, active blocker count). All data is computed via live database aggregations—no manual entry. Recharts 3.8.1 must be installed. The phase leverages existing patterns: Drizzle ORM aggregation queries, RLS transaction wrapper, `ProgressRing` component reuse, and established badge color constants.

**Primary recommendation:** Use Drizzle's built-in aggregation helpers (`count()`, `sum()`) for metrics queries, wrap in RLS transaction pattern (`SET LOCAL app.current_project_id`), create three new client components (`MilestoneTimeline`, `OverviewMetrics`, `HealthDashboard`) with 'use client' directive, install Recharts 3.8.1 with `react-is`, and implement rule-based health formula (critical risk → red; high risk OR <50% completion → yellow; else green).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Milestone Timeline
- Positioned at the **top of the Overview tab**, above onboarding tracks, metrics, and health sections
- The existing custom dot-on-spine horizontal scroller is **replaced** with a Recharts-based visual timeline component
- Must meet TMLN-01: visual timeline (not a text list), positioned near top

#### Metrics — which metrics to show
- **Onboarding progress per track**: Two `ProgressRing` components (one for ADR, one for Biggy) showing % of steps complete
- **Risk distribution by severity**: Recharts `PieChart` (donut) showing counts of critical / high / medium / low risks
- **Hours spent on project**: Stat card showing total hours + Recharts `BarChart` of hours per week (last 8 weeks)
- The existing analytics API (`GET /api/projects/[projectId]/analytics`) already returns weekly hours data — reuse it

#### Metrics — visualization pattern
- Stat cards + one chart per metric (not charts-only, not numbers-only)
- `ProgressRing` component already exists in `OnboardingDashboard.tsx` — reuse directly

#### Health Dashboard — active blockers
- Counts **onboarding steps with status='blocked'** across both ADR and Biggy tracks
- Does NOT include blocked integrations, blocked actions, or critical risks (those have their own indicators)

#### Health Dashboard — per-workstream health
- Two RAG badges: one for ADR, one for Biggy
- Badge color computed from the track's blocked step ratio (Claude's discretion on threshold)
- Reuse existing badge + color patterns (`bg-green-100 text-green-800`, etc.)

#### Health Dashboard — overall health formula
- Rule-based, evaluated in order:
  1. Any **critical risk open** → **red** (trumps all other signals)
  2. Any **high risk open** OR **onboarding completion < 50%** (either track) → **yellow**
  3. Otherwise → **green**
- Four signals inform the calculation: onboarding step completion rate, open critical/high risks, integration validation rate, milestone on-track rate
- The rule-based priority above is the final arbiter; the four signals feed the yellow condition (can be extended later)

#### Data fetching architecture
- New dedicated endpoint: `GET /api/projects/[projectId]/overview-metrics`
- Returns all aggregated data in one call: onboarding step counts per track, risk counts by severity, hours (via analytics), integration status counts, milestone on-track status
- New sub-components imported into the overview page:
  - `OverviewMetrics` — renders metrics section
  - `HealthDashboard` — renders health section
  - `MilestoneTimeline` — renders Recharts timeline (replaces inline section in OnboardingDashboard)
- `OnboardingDashboard.tsx` is NOT further expanded; new sections live in separate component files

#### Recharts installation
- Recharts is **not currently installed** — must be added (`npm install recharts`)
- Required for: milestone timeline, risk donut, hours bar chart

### Claude's Discretion
- Recharts chart color palette and styling details
- Exact timeline X-axis layout and milestone label truncation
- Per-track health badge threshold (e.g., >20% blocked steps = yellow, any blocked + critical = red)
- Layout of the Metrics section (grid, flex, or responsive card row)
- How the four health signals contribute to the yellow floor (beyond the explicit rules above)

### Deferred Ideas (OUT OF SCOPE)
- Task completion % and action velocity metrics — useful but not selected for this phase; candidates for Phase 35 or a future metrics phase
- Editable health thresholds per project — own phase
- Trend indicators (↑↓) on health signals — could be added in Phase 35

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| METR-01 | Overview tab includes a Metrics section showing onboarding progress indicators: milestones completed, integration completion counts, validation progress, team enablement progress | Drizzle aggregation queries (`count()`, `sum()`) for step counts, risk counts, integration status counts; existing analytics API for hours data; Recharts BarChart for hours, PieChart for risk distribution, ProgressRing for onboarding completion |
| HLTH-01 | Overview tab includes a Health Dashboard section showing: overall project health, risk status by severity, phase health by workstream (ADR vs Biggy), active blockers, and trend indicators | Rule-based health formula (critical risk → red, high risk OR <50% → yellow, else green); per-track step aggregation with blocked count; badge color patterns from HealthCard.tsx; aggregation queries for risk severity counts |
| TMLN-01 | Milestone timeline is positioned near the top of the Overview tab and rendered as a visual timeline (not a text list) | Recharts timeline component (LineChart or BarChart with timeline config); existing milestone data from milestones table; replace lines 795-858 in OnboardingDashboard.tsx |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 3.8.1 | Data visualization (BarChart, PieChart/donut, timeline) | React-native chart library with declarative component API, SVG-based, lightweight, MIT licensed; dominant choice for React dashboards |
| react-is | Match React 19.2.4 | Peer dependency for Recharts (type utilities) | Required by Recharts; must match installed React version |
| Drizzle ORM | 0.45.1 (installed) | Database queries with aggregation helpers | Project standard; provides `count()`, `sum()`, `sql` template for aggregations |
| Next.js 16 | 16.2.0 (installed) | App Router, server/client components | Project standard; Recharts requires 'use client' directive |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 4.x (installed) | Chart styling, responsive containers | Project standard; use for chart wrapper layout, grid, colors |
| Lucide React | 0.577.0 (installed) | Icons for health indicators, trend arrows | Project standard; supplement charts with iconography |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js + react-chartjs-2 | More imperative API, heavier bundle; Recharts preferred for React ecosystem |
| Recharts | Victory | More opinionated styling, less flexible layout; Recharts has better community support |
| Custom SVG timeline | D3.js | Massive learning curve, over-engineering for this use case; Recharts declarative components sufficient |

**Installation:**
```bash
npm install recharts react-is
```

## Architecture Patterns

### Recommended Project Structure
```
app/api/projects/[projectId]/
├── overview-metrics/
│   └── route.ts              # GET endpoint: aggregates all metrics data
components/
├── MilestoneTimeline.tsx     # Client component: Recharts timeline
├── OverviewMetrics.tsx       # Client component: stat cards + charts
├── HealthDashboard.tsx       # Client component: RAG badges + blockers
└── OnboardingDashboard.tsx   # Remove lines 795-858 (old timeline)
```

### Pattern 1: RLS Transaction Wrapper for Aggregation Queries
**What:** All API routes that query project-scoped data must set RLS session variable before aggregation
**When to use:** Every aggregation query in `overview-metrics/route.ts`
**Example:**
```typescript
// Source: bigpanda-app/app/api/projects/[projectId]/analytics/route.ts (lines 69-81)
try {
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

    // 8-week rollup from time_entries (hours is TEXT — must cast)
    const rollupRows = await tx.execute<WeekRollupRow>(sql`
      SELECT date_trunc('week', date::date)::text AS week_start,
             SUM(hours::numeric)::numeric AS total_hours
      FROM time_entries
      WHERE project_id = ${numericId}
        AND date::date >= CURRENT_DATE - INTERVAL '8 weeks'
      GROUP BY week_start
      ORDER BY week_start ASC
    `)
    // ... return aggregated data
  })
  return NextResponse.json(result)
} catch (err) {
  console.error('GET overview-metrics error:', err)
  return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 })
}
```

### Pattern 2: Drizzle Aggregation Helpers
**What:** Use Drizzle's `count()`, `sum()` functions instead of raw SQL templates where possible
**When to use:** Simple aggregations (count steps, count risks, sum hours)
**Example:**
```typescript
// Source: Drizzle ORM docs (aggregation helpers)
import { count, eq } from 'drizzle-orm'
import { onboardingSteps, risks } from '@/db/schema'

// Count onboarding steps per track per status
const adrSteps = await tx
  .select({
    status: onboardingSteps.status,
    count: count()
  })
  .from(onboardingSteps)
  .where(eq(onboardingSteps.track, 'ADR'))
  .groupBy(onboardingSteps.status)

// Count risks by severity
const riskCounts = await tx
  .select({
    severity: risks.severity,
    count: count()
  })
  .from(risks)
  .where(eq(risks.project_id, projectId))
  .groupBy(risks.severity)
```

### Pattern 3: Recharts Client Component Structure
**What:** Charts must be client components with 'use client' directive; wrap in ResponsiveContainer for responsive width
**When to use:** All Recharts usage (MilestoneTimeline, OverviewMetrics charts, etc.)
**Example:**
```typescript
// Source: Recharts docs + project client component patterns
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function HoursBarChart({ data }: { data: { weekLabel: string; hours: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="weekLabel" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="hours" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### Pattern 4: Reuse ProgressRing Component
**What:** ProgressRing SVG component already exists in OnboardingDashboard.tsx (lines 117-151); extract and reuse for per-track onboarding completion
**When to use:** ADR and Biggy onboarding completion % visualization
**Example:**
```typescript
// Source: bigpanda-app/components/OnboardingDashboard.tsx (lines 117-151)
const circumference = 138.23

function ProgressRing({ pct }: { pct: number }) {
  const offset = circumference * (1 - pct / 100)
  return (
    <div data-testid="progress-ring" className="relative flex items-center justify-center">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle
          r="22" cx="26" cy="26"
          fill="none" stroke="#e5e7eb" strokeWidth="5"
          strokeDasharray={circumference}
        />
        <circle
          r="22" cx="26" cy="26"
          fill="none" stroke="#22c55e" strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.5s ease',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-zinc-700">{Math.round(pct)}%</span>
    </div>
  )
}
```

### Pattern 5: Rule-Based Health Formula
**What:** Overall health computed server-side via deterministic rule evaluation, not weighted scoring
**When to use:** Health Dashboard overall RAG indicator
**Example:**
```typescript
// Source: CONTEXT.md user decisions (health formula)
function computeOverallHealth(metrics: {
  openCriticalRisks: number
  openHighRisks: number
  adrCompletion: number
  biggyCompletion: number
}): 'red' | 'yellow' | 'green' {
  // Priority 1: Any critical risk open → red
  if (metrics.openCriticalRisks > 0) return 'red'

  // Priority 2: High risk OR low completion → yellow
  if (metrics.openHighRisks > 0 ||
      metrics.adrCompletion < 50 ||
      metrics.biggyCompletion < 50) {
    return 'yellow'
  }

  // Otherwise: green
  return 'green'
}
```

### Anti-Patterns to Avoid
- **DON'T expand OnboardingDashboard.tsx further:** Create separate component files (MilestoneTimeline, OverviewMetrics, HealthDashboard) to avoid 1000+ line monolith
- **DON'T use Recharts in server components:** Charts require browser APIs; must use 'use client' directive
- **DON'T mix aggregation styles:** Use Drizzle helpers (`count()`, `sum()`) for simple cases; use `sql` template only for complex date math or window functions
- **DON'T forget RLS transaction wrapper:** All project-scoped queries must set `app.current_project_id` session variable
- **DON'T install Recharts without react-is:** Recharts peer dependency; must match React version

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom SVG path calculations, axis scaling, responsive sizing | Recharts BarChart, PieChart, ResponsiveContainer | Recharts handles coordinate transforms, axis labeling, responsive width/height, tooltips, accessibility; custom SVG charts require hundreds of lines for edge cases (zero values, long labels, overflow) |
| Donut chart inner radius | Manual arc path math with SVG `<path d="M...A...">` | Recharts PieChart with `innerRadius` prop | PieChart component auto-computes arc paths; `innerRadius={60}` creates donut hole; custom arc math is error-prone (clockwise vs counter-clockwise, large-arc-flag) |
| Progress ring animation | Custom CSS transitions on SVG strokeDashoffset | Existing ProgressRing component (OnboardingDashboard.tsx) | Already battle-tested, smoothly animates percentage changes; reuse avoids duplication |
| Aggregation query fallback | Manual JavaScript array filtering/grouping after fetching all rows | Drizzle `count()`, `sum()`, `groupBy()` with WHERE clauses | Database aggregation is 10-100x faster than in-memory JS; Postgres query planner optimizes GROUP BY with indexes |

**Key insight:** Charting libraries like Recharts exist because responsive, accessible, animated charts require solving dozens of edge cases (zero values, negative values, axis overflow, tooltip positioning, legend layout, responsive breakpoints). Custom SVG is under-engineered for production dashboards.

## Common Pitfalls

### Pitfall 1: Recharts Requires 'use client' But Data Fetch Should Stay Server-Side
**What goes wrong:** Developer adds 'use client' to entire page component, breaking server-side data fetching benefits
**Why it happens:** Recharts uses browser APIs (ResizeObserver, getBoundingClientRect), requires 'use client'; easy to over-apply directive
**How to avoid:** Keep page component as server component; fetch data server-side; pass as props to client chart components; only chart components need 'use client'
**Warning signs:** "ResizeObserver is not defined" error; loss of automatic request memoization; increased client bundle size
**Example:**
```typescript
// ❌ WRONG: Page component is client, loses server benefits
'use client'
export default function OverviewPage({ params }) {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(...).then(setData) }, []) // Client-side fetch
  return <OverviewMetrics data={data} />
}

// ✅ CORRECT: Page stays server, only chart is client
// page.tsx (server component)
export default async function OverviewPage({ params }) {
  const data = await fetchMetrics(params.id) // Server-side fetch
  return <OverviewMetrics data={data} />
}

// OverviewMetrics.tsx (client component)
'use client'
import { BarChart } from 'recharts'
export function OverviewMetrics({ data }) {
  return <BarChart data={data} />
}
```

### Pitfall 2: Forgetting Type Casting in Drizzle Aggregation Results
**What goes wrong:** Aggregation queries return `bigint` or `string` instead of `number`; TypeScript types don't match runtime values
**Why it happens:** Postgres returns aggregates as TEXT or bigint to avoid precision loss; Drizzle preserves database types
**How to avoid:** Explicitly cast in SQL (`::int`, `::numeric`) or use `Number()` / `parseFloat()` on results
**Warning signs:** `count` is `"5"` (string) instead of `5` (number); arithmetic operations fail; chart displays `NaN`
**Example:**
```typescript
// Source: bigpanda-app/app/api/projects/[projectId]/analytics/route.ts (lines 73-81)
// ❌ WRONG: Missing cast, returns bigint
const rows = await tx.execute(sql`
  SELECT SUM(hours) AS total_hours FROM time_entries
`)
const total = rows[0].total_hours // Type: string | bigint

// ✅ CORRECT: Cast to numeric in SQL
const rows = await tx.execute<{ total_hours: number }>(sql`
  SELECT SUM(hours::numeric)::numeric AS total_hours FROM time_entries
`)
const total = parseFloat(String(rows[0].total_hours)) // Safe conversion
```

### Pitfall 3: PieChart Cell Colors Not Applied Without Explicit Cell Components
**What goes wrong:** PieChart renders all slices in same color despite passing `fill` prop to Pie component
**Why it happens:** Recharts Pie component ignores per-data-item colors unless using Cell components
**How to avoid:** Map over data array with Cell components, one per slice, each with unique `fill` prop
**Warning signs:** Risk donut shows all slices as same color; `data[].color` prop ignored
**Example:**
```typescript
// Source: Recharts API docs (Cell component)
// ❌ WRONG: fill prop on Pie doesn't apply per-slice colors
<PieChart>
  <Pie data={riskData} dataKey="count" fill="#8884d8" />
</PieChart>

// ✅ CORRECT: Use Cell components for per-slice colors
import { PieChart, Pie, Cell } from 'recharts'

const RISK_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#a1a1aa',
}

<PieChart>
  <Pie data={riskData} dataKey="count" innerRadius={60}>
    {riskData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.severity]} />
    ))}
  </Pie>
</PieChart>
```

### Pitfall 4: Missing ResponsiveContainer Causes Fixed-Width Chart Overflow
**What goes wrong:** Chart renders at fixed pixel width, overflows container on mobile, doesn't adapt to parent width
**Why it happens:** Recharts components default to `width={400} height={400}`; explicit pixel values ignore parent container
**How to avoid:** Wrap all charts in ResponsiveContainer with `width="100%" height={N}`; chart inherits parent width
**Warning signs:** Horizontal scroll on mobile; chart clipped; chart doesn't resize on window resize
**Example:**
```typescript
// ❌ WRONG: Fixed width causes overflow
<BarChart width={800} height={300} data={data}>
  <Bar dataKey="hours" />
</BarChart>

// ✅ CORRECT: ResponsiveContainer adapts to parent
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>
    <Bar dataKey="hours" />
  </BarChart>
</ResponsiveContainer>
```

### Pitfall 5: Reusing Existing Milestone Timeline Section Without Removing Old Code
**What goes wrong:** Both old custom timeline (lines 795-858) and new Recharts timeline render; duplicate milestones shown; layout breaks
**Why it happens:** Developer adds MilestoneTimeline component but forgets to remove old inline section in OnboardingDashboard.tsx
**How to avoid:** Delete lines 795-858 in OnboardingDashboard.tsx (milestone timeline section); replace with `<MilestoneTimeline />` import
**Warning signs:** Two milestone sections visible; "Milestone Timeline" heading appears twice; scrollbar conflicts
**Example:**
```typescript
// ❌ WRONG: Old section remains, new component added
// OnboardingDashboard.tsx
return (
  <div>
    {/* ... onboarding tracks ... */}
    {/* OLD: Lines 795-858 still here */}
    <section>
      <h2>Milestone Timeline</h2>
      <div className="overflow-x-auto">...</div>
    </section>
    {/* NEW: Also rendering below */}
    <MilestoneTimeline milestones={milestones} />
  </div>
)

// ✅ CORRECT: Remove old section, keep only new component
import { MilestoneTimeline } from './MilestoneTimeline'

return (
  <div>
    {/* ... onboarding tracks ... */}
    <MilestoneTimeline milestones={milestones} />
    {/* Old section deleted: lines 795-858 removed */}
  </div>
)
```

## Code Examples

Verified patterns from official sources:

### Drizzle Aggregation Query with Grouping
```typescript
// Source: Drizzle ORM docs + bigpanda-app/lib/queries.ts (lines 96-174)
import { count, eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { onboardingSteps } from '@/db/schema'

// Count steps per track per status
const result = await db.transaction(async (tx) => {
  await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${projectId}`))

  const stepCounts = await tx
    .select({
      track: onboardingSteps.track,
      status: onboardingSteps.status,
      count: count()
    })
    .from(onboardingSteps)
    .where(eq(onboardingSteps.project_id, projectId))
    .groupBy(onboardingSteps.track, onboardingSteps.status)

  return stepCounts
})
```

### Recharts Donut Chart with Custom Colors
```typescript
// Source: Recharts API docs (PieChart + Cell)
'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const RISK_SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#71717a',
}

export function RiskDistributionChart({ data }: {
  data: { severity: string; count: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="severity"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          label
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={RISK_SEVERITY_COLORS[entry.severity] ?? '#a1a1aa'}
            />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

### Recharts BarChart with 8-Week Hours Data
```typescript
// Source: Recharts docs + bigpanda-app/app/api/projects/[projectId]/analytics/route.ts
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function WeeklyHoursChart({ data }: {
  data: { weekLabel: string; hours: number; variance: number | null }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="weekLabel"
          tick={{ fontSize: 12 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="hours" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### Health Badge with Color Logic
```typescript
// Source: bigpanda-app/components/HealthCard.tsx (lines 9-16)
const ragConfig: Record<
  'green' | 'yellow' | 'red',
  { label: string; className: string }
> = {
  green: { label: 'Healthy', className: 'bg-green-100 text-green-800 border-green-200' },
  yellow: { label: 'At Risk', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  red: { label: 'Critical', className: 'bg-red-100 text-red-800 border-red-200' },
}

export function HealthBadge({ health }: { health: 'green' | 'yellow' | 'red' }) {
  const config = ragConfig[health]
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}
```

### Overview Metrics API Endpoint Structure
```typescript
// Source: Project API patterns (RLS + aggregation)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { onboardingSteps, risks, integrations, milestones } from '@/db/schema'
import { eq, count, sql } from 'drizzle-orm'
import { requireSession } from '@/lib/auth-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      // Onboarding step counts per track
      const stepCounts = await tx
        .select({
          track: onboardingSteps.track,
          status: onboardingSteps.status,
          count: count()
        })
        .from(onboardingSteps)
        .where(eq(onboardingSteps.project_id, numericId))
        .groupBy(onboardingSteps.track, onboardingSteps.status)

      // Risk counts by severity
      const riskCounts = await tx
        .select({
          severity: risks.severity,
          count: count()
        })
        .from(risks)
        .where(eq(risks.project_id, numericId))
        .groupBy(risks.severity)

      // Integration status counts
      const integrationCounts = await tx
        .select({
          status: integrations.status,
          count: count()
        })
        .from(integrations)
        .where(eq(integrations.project_id, numericId))
        .groupBy(integrations.status)

      // Milestone on-track counts
      const milestoneOnTrack = await tx
        .select({
          status: milestones.status,
          count: count()
        })
        .from(milestones)
        .where(eq(milestones.project_id, numericId))
        .groupBy(milestones.status)

      return {
        stepCounts,
        riskCounts,
        integrationCounts,
        milestoneOnTrack,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET overview-metrics error:', err)
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 })
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SVG timeline with horizontal scroll (lines 795-858) | Recharts-based timeline component | Phase 34 | Better accessibility, tooltip support, responsive sizing; aligns with other charts |
| Manual JS array filtering for aggregations | Drizzle `count()`, `sum()`, `groupBy()` | Drizzle 0.40+ | 10-100x faster; leverages Postgres query planner; type-safe |
| Recharts v2.x (babel plugin for tree-shaking) | Recharts v3.8.1 (ESM with automatic tree-shaking) | March 2026 | Babel plugin deprecated; modern bundlers handle tree-shaking; simpler install |
| Chart.js imperative canvas API | Recharts declarative React components | React ecosystem shift 2020-2024 | Better fit for React; component composition; server/client boundary clear |

**Deprecated/outdated:**
- Recharts babel plugin (`babel-plugin-recharts`): Out of date, doesn't work with 2.x+; modern bundlers (Turbopack, Webpack 5) tree-shake automatically
- Manual `react-is` version matching: Recharts 3.x documentation says "needs to match" but uses caret range; install both together avoids mismatch

## Open Questions

1. **Recharts compatibility with Next.js 16 + React 19**
   - What we know: Recharts 3.8.1 is latest stable (March 2026); project uses Next.js 16.2.0 + React 19.2.4; Recharts docs don't mention React 19 explicitly
   - What's unclear: Whether Recharts 3.8.1 fully supports React 19; any known issues with Next.js Turbopack
   - Recommendation: Install and test in development; check GitHub issues for "react 19" or "next.js 16"; if issues arise, consider dynamic import with `ssr: false` (pattern already used for React Flow in Phase 28)

2. **Milestone timeline chart type choice**
   - What we know: User wants visual timeline (not text list); Recharts offers LineChart, BarChart, ScatterChart; existing timeline is horizontal scroll with dots on spine
   - What's unclear: Best Recharts chart type for milestone timeline (LineChart with dots? BarChart with vertical bars? Custom ComposedChart?)
   - Recommendation: Use BarChart with vertical bars (one per milestone), color by status; simpler than ComposedChart; aligns with hours BarChart pattern; fallback: LineChart with single series + colored dots via Cell

3. **Per-track health badge threshold**
   - What we know: Badge computed from blocked step ratio; user gave discretion on threshold
   - What's unclear: Optimal threshold values (>20% blocked = yellow? >50% = red?)
   - Recommendation: Start with: green (0% blocked), yellow (>0% and <50% blocked), red (≥50% blocked OR any critical risk in track); iterate after UAT feedback

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- tests/overview/metrics-health.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| METR-01 | Metrics section renders with onboarding progress rings (ADR/Biggy), risk donut chart, hours bar chart | integration | `npm test -- tests/overview/metrics-health.test.ts::METR-01 -x` | ❌ Wave 0 |
| METR-01 | GET /api/projects/[projectId]/overview-metrics returns aggregated data (step counts, risk counts, hours) | unit | `npm test -- tests/api/overview-metrics.test.ts::aggregation -x` | ❌ Wave 0 |
| HLTH-01 | Health Dashboard renders overall RAG badge, per-track badges, active blocker count | integration | `npm test -- tests/overview/metrics-health.test.ts::HLTH-01 -x` | ❌ Wave 0 |
| HLTH-01 | Overall health formula: critical risk → red, high risk OR <50% → yellow, else green | unit | `npm test -- tests/overview/metrics-health.test.ts::health-formula -x` | ❌ Wave 0 |
| TMLN-01 | MilestoneTimeline renders as Recharts component (not text list), positioned at top of Overview | integration | `npm test -- tests/overview/metrics-health.test.ts::TMLN-01 -x` | ❌ Wave 0 |
| TMLN-01 | Old custom timeline section (lines 795-858) is removed from OnboardingDashboard.tsx | smoke | `npm test -- tests/overview/timeline-replacement.test.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- tests/overview/ -x` (fast subset)
- **Per wave merge:** `npm test -- tests/overview/ tests/api/overview-metrics.test.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/overview/metrics-health.test.ts` — covers METR-01, HLTH-01, TMLN-01 (integration tests)
- [ ] `tests/api/overview-metrics.test.ts` — covers API aggregation logic (unit tests)
- [ ] `tests/overview/timeline-replacement.test.ts` — smoke test verifying old section removed
- [ ] `tests/__mocks__/recharts.ts` — mock Recharts components for Vitest (node env doesn't have ResizeObserver)
- [ ] Framework install: `npm install recharts react-is` — Recharts not currently installed

## Sources

### Primary (HIGH confidence)
- Recharts npm page (npmjs.com/package/recharts) - Version 3.8.1, installation requirements, react-is peer dependency
- Recharts GitHub README (github.com/recharts/recharts) - Basic usage, component API, current stable version
- Drizzle ORM documentation (orm.drizzle.team/docs/select) - Aggregation helpers (count, sum, groupBy), sql template, type casting
- Project codebase:
  - `bigpanda-app/components/OnboardingDashboard.tsx` - ProgressRing component, status color constants
  - `bigpanda-app/app/api/projects/[projectId]/analytics/route.ts` - RLS transaction pattern, weekly hours aggregation
  - `bigpanda-app/lib/queries.ts` - computeProjectAnalytics function, aggregation patterns
  - `bigpanda-app/components/HealthCard.tsx` - RAG badge config, color constants
  - `bigpanda-app/db/schema.ts` - onboardingSteps, risks, milestones, integrations table schemas

### Secondary (MEDIUM confidence)
- Recharts API documentation (recharts.github.io/en-US/api) - PieChart innerRadius, Cell component, ResponsiveContainer, common props (verified with GitHub README cross-reference)
- Project STATE.md and CONTEXT.md - User decisions, health formula rules, locked implementation choices

### Tertiary (LOW confidence)
- Recharts React 19 compatibility - No explicit documentation found; assume compatible based on recent 3.8.1 release (March 2026) but needs validation during implementation
- Optimal milestone timeline chart type - Recharts offers multiple options; BarChart recommended based on pattern similarity but not verified with user preference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts version confirmed via npm, Drizzle patterns verified in codebase, installation steps clear
- Architecture: HIGH - RLS transaction pattern verified across 5+ API routes, Drizzle aggregation helpers documented, client component patterns established
- Pitfalls: HIGH - All pitfalls sourced from official Recharts docs, Drizzle docs, or existing project code patterns
- Recharts compatibility: MEDIUM - No explicit React 19 confirmation; fallback strategy (dynamic import with ssr: false) available from Phase 28 pattern

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (30 days, stable ecosystem)
