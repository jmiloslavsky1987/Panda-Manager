# Phase 33: Overview Tab Schema Migration + Workstream Structure - Research

**Researched:** 2026-04-02
**Domain:** Database schema migration (Drizzle ORM + PostgreSQL), React component refactoring, dual-track UI rendering
**Confidence:** HIGH

## Summary

Phase 33 adds a `track` column to `onboarding_phases` and `onboarding_steps` tables to enable separate ADR and Biggy workstream visualization in the Overview tab. The migration follows established patterns from Phases 31-32 (TEXT column with index, no RLS), auto-seeds standardized phase models on project creation, restructures the Overview tab into two parallel columns, and removes the Project Completeness indicator.

**Primary recommendation:** Use TEXT column with application-level validation (not PostgreSQL CHECK constraint or enum) for maximum flexibility. Auto-seed phases inside `POST /api/projects` transaction using established pattern from prior phases. Restructure `OnboardingDashboard` to accept pre-grouped `{ adr, biggy }` response from API. Remove completeness logic entirely from overview/page.tsx (lines 95-130).

## User Constraints (from CONTEXT.md)

<user_constraints>
### Locked Decisions

**Schema migration:**
- Add `track text` column to `onboardingPhases` table (values: 'ADR' | 'Biggy')
- No backfill needed — existing dev data will be wiped before go-live; migration adds the column only
- Migration file continues the existing sequence: `0026_onboarding_track.sql`

**Standard phase model — auto-seeding:**
- Both tracks are seeded automatically when a new project is created
- Seeding happens inside the project creation API (POST /api/projects), atomic with project creation
- Seeded phases (ADR track, display_order 1–5):
  1. Discovery & Kickoff
  2. Integrations
  3. Platform Configuration
  4. Teams
  5. UAT
- Seeded phases (Biggy track, display_order 1–5):
  1. Discovery & Kickoff
  2. IT Knowledge Graph
  3. Platform Configuration
  4. Teams
  5. Validation
- Steps are NOT auto-seeded — added manually via the Onboarding tab

**API response shape:**
- Onboarding API (`GET /api/projects/[projectId]/onboarding`) returns grouped response: `{ adr: PhaseWithSteps[], biggy: PhaseWithSteps[] }`
- Server does the grouping by `track` column — no client-side filtering needed
- Each `PhaseWithSteps` entry includes the `track` field

**Overview tab — dual-track UI:**
- Two side-by-side columns: ADR (left) | Biggy (right)
- Header changes: two progress rings (one per track) replace the single combined ring
- Each column renders its phases as collapsible cards with `X/Y steps` count
- When a track has phases but no steps yet: show the phase containers with `0/0 steps` (structure visible, ready for input)
- Single global filter bar at top — status filter + search applies to both columns simultaneously

**Project Completeness removal (WORK-02):**
- Remove the completeness score bar (lines ~95–107 of overview/page.tsx)
- Remove the below-60% warning banner (lines ~109–130)
- Remove all completeness-related imports and server-side fetch logic from overview/page.tsx

### Claude's Discretion

- Column layout breakpoint (suggest: side-by-side on md+, stacked on mobile)
- Color/accent used to visually distinguish ADR vs Biggy columns (e.g., subtle left-border color or section header badge)
- Progress ring color per track (or keep both green — consistent with existing ring)
- How collapse state is tracked when two tracks are rendered (suggest: keep collapsed state keyed by phase.id as today)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WORK-01 | Overview tab displays ADR and Biggy onboarding progress as separate parallel sections with standardized phase models (ADR: Discovery & Kickoff → Integrations → Platform Configuration → Teams → UAT; Biggy: Discovery & Kickoff → IT Knowledge Graph → Platform Configuration → Teams → Validation) | Standard stack: Drizzle schema update + migration pattern from Phase 31/32; Architecture pattern: API grouping + dual-column rendering; Code examples: seeding, API response grouping |
| WORK-02 | Project Completeness indicator is removed from the Overview tab | Architecture pattern: remove completeness imports/logic from overview/page.tsx (lines 95-130); verification confirms removal |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.45.1 | Schema definition + query builder | Project standard for database access — all 30+ tables use Drizzle schema |
| PostgreSQL | (via Drizzle) | Database backend | Project standard — migration files are SQL executed via `psql $DATABASE_URL` |
| Next.js 16 | 16.2.0 | Server components + API routes | Project standard for all pages and API endpoints |
| React 19 | 19.2.4 | Client-side UI | Project standard for all interactive components |
| Vitest | (devDep) | Test framework | Project standard — used across all 100+ existing tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | v4 | Responsive layout (grid/flex) | All UI styling in project — use for dual-column layout breakpoints |
| better-auth | 1.5.6 | Session management | Already integrated — use `requireSession()` in modified API routes |
| TypeScript | 5.x | Type safety | All project files are TypeScript — maintain for schema/API changes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TEXT column | pgEnum for track | TEXT allows easier future expansion (e.g., "Biggy+ADR hybrid") without enum migration; project precedent: `workstreams.track` is TEXT |
| Application validation | PostgreSQL CHECK constraint | Project pattern: use TypeScript types + API-level validation, not DB constraints (see: status fields across all tables) |
| SSE real-time updates | Optimistic client updates | Project pattern established in Phase 31/32 — use optimistic updates + refetch on mount |

**Installation:**
No new packages required — all dependencies already in package.json.

## Architecture Patterns

### Recommended Project Structure
No new files required — modifications only:
```
bigpanda-app/
├── db/
│   ├── migrations/
│   │   └── 0026_onboarding_track.sql        # NEW migration
│   └── schema.ts                             # UPDATE: add track column to onboardingPhases
├── app/
│   ├── api/
│   │   └── projects/
│   │       ├── route.ts                      # UPDATE: seed phases on creation
│   │       └── [projectId]/
│   │           └── onboarding/
│   │               └── route.ts              # UPDATE: group response by track
│   └── customer/[id]/overview/
│       └── page.tsx                          # UPDATE: remove completeness logic
├── components/
│   └── OnboardingDashboard.tsx               # UPDATE: render dual-track layout
└── tests/
    └── overview/                              # NEW: Wave 0 tests for WORK-01, WORK-02
        ├── track-separation.test.ts           # Verify dual-track rendering
        └── completeness-removal.test.ts       # Verify completeness removed
```

### Pattern 1: TEXT Column Migration (Drizzle + PostgreSQL)
**What:** Add nullable TEXT column with index, no backfill (dev data will be wiped)
**When to use:** Adding categorical data to existing tables when enum would be too rigid
**Example:**
```sql
-- Source: Established pattern from Phase 31 (0024_extraction_jobs.sql) and Phase 32 (0025_time_entries_user_id.sql)
-- File: db/migrations/0026_onboarding_track.sql

-- Phase 33: Onboarding Track Column
-- Adds track column to onboarding_phases and onboarding_steps for ADR/Biggy separation
--
-- Run manually with:
--   psql $DATABASE_URL -f bigpanda-app/db/migrations/0026_onboarding_track.sql

ALTER TABLE onboarding_phases
ADD COLUMN track TEXT;

ALTER TABLE onboarding_steps
ADD COLUMN track TEXT;

-- Index for query performance (filtering by track is common in Overview tab)
CREATE INDEX idx_onboarding_phases_track ON onboarding_phases(project_id, track);
CREATE INDEX idx_onboarding_steps_track ON onboarding_steps(project_id, track);
```

**Why this pattern:** Project precedent: `workstreams.track` already uses TEXT (not enum) for 'ADR' | 'Biggy'. Migration 0025 shows column addition + index pattern. No RLS needed (project scoping handled via `project_id` WHERE clauses).

### Pattern 2: Auto-Seed Phases in Transaction (Drizzle)
**What:** Seed standardized phases atomically inside `POST /api/projects` transaction
**When to use:** Initial data that should exist immediately on project creation
**Example:**
```typescript
// Source: Pattern inspired by Phase 31 BullMQ enqueue + transaction pattern
// File: app/api/projects/route.ts (POST handler)

export async function POST(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const body = await req.json();
  const { name, customer, description, start_date, end_date } = body;

  if (!name || !customer) {
    return NextResponse.json(
      { error: 'name and customer are required' },
      { status: 400 }
    );
  }

  // Seed phases atomically with project creation
  const result = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(projects)
      .values({
        name: String(name),
        customer: String(customer),
        status: 'draft',
        description: description ? String(description) : null,
        start_date: start_date ? String(start_date) : null,
        end_date: end_date ? String(end_date) : null,
      })
      .returning({ id: projects.id });

    const projectId = inserted.id;

    // ADR phases (display_order 1-5)
    const adrPhases = [
      { name: 'Discovery & Kickoff', display_order: 1 },
      { name: 'Integrations', display_order: 2 },
      { name: 'Platform Configuration', display_order: 3 },
      { name: 'Teams', display_order: 4 },
      { name: 'UAT', display_order: 5 },
    ];

    await tx.insert(onboardingPhases).values(
      adrPhases.map((p) => ({
        project_id: projectId,
        track: 'ADR',
        name: p.name,
        display_order: p.display_order,
      }))
    );

    // Biggy phases (display_order 1-5)
    const biggyPhases = [
      { name: 'Discovery & Kickoff', display_order: 1 },
      { name: 'IT Knowledge Graph', display_order: 2 },
      { name: 'Platform Configuration', display_order: 3 },
      { name: 'Teams', display_order: 4 },
      { name: 'Validation', display_order: 5 },
    ];

    await tx.insert(onboardingPhases).values(
      biggyPhases.map((p) => ({
        project_id: projectId,
        track: 'Biggy',
        name: p.name,
        display_order: p.display_order,
      }))
    );

    return inserted;
  });

  return NextResponse.json({ project: result }, { status: 201 });
}
```

**Why this pattern:** Atomic transaction prevents partial seeding on failure. Pattern matches Phase 31 approach (worker enqueue inside transaction). Steps remain manually added via Onboarding tab (no auto-seed).

### Pattern 3: API Response Grouping (Server-Side)
**What:** Group phases by `track` in API response before sending to client
**When to use:** When client needs data pre-organized for rendering (avoids client-side filtering)
**Example:**
```typescript
// Source: Established project pattern — server does data shaping, client renders
// File: app/api/projects/[projectId]/onboarding/route.ts

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId } = await params;
  const numericId = parseInt(projectId, 10);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  }

  try {
    const grouped = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`));

      const phaseRows = await tx
        .select()
        .from(onboardingPhases)
        .where(eq(onboardingPhases.project_id, numericId))
        .orderBy(asc(onboardingPhases.display_order));

      const phasesWithSteps = await Promise.all(
        phaseRows.map(async (phase) => {
          const steps = await tx
            .select()
            .from(onboardingSteps)
            .where(eq(onboardingSteps.phase_id, phase.id))
            .orderBy(asc(onboardingSteps.display_order));
          return { ...phase, steps };
        })
      );

      // Group by track
      const adr = phasesWithSteps.filter((p) => p.track === 'ADR');
      const biggy = phasesWithSteps.filter((p) => p.track === 'Biggy');

      return { adr, biggy };
    });

    return NextResponse.json(grouped);
  } catch (err) {
    console.error('GET /api/projects/[projectId]/onboarding error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Why this pattern:** Server-side grouping means client doesn't need to filter 100+ phases across multiple projects. Single fetch, pre-organized data, simpler client logic.

### Pattern 4: Dual-Track Responsive Layout (Tailwind + React)
**What:** Render two side-by-side columns on desktop, stacked on mobile, with shared filter bar
**When to use:** Parallel workstream visualization with independent progress tracking
**Example:**
```typescript
// Source: Established Tailwind responsive patterns + project component structure
// File: components/OnboardingDashboard.tsx

interface GroupedPhases {
  adr: PhaseWithSteps[];
  biggy: PhaseWithSteps[];
}

export function OnboardingDashboard({ projectId }: OnboardingDashboardProps) {
  const [adrPhases, setAdrPhases] = useState<PhaseWithSteps[]>([]);
  const [biggyPhases, setBiggyPhases] = useState<PhaseWithSteps[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch(`/api/projects/${projectId}/onboarding`)
      .then((r) => r.json())
      .then((data: GroupedPhases) => {
        setAdrPhases(data.adr ?? []);
        setBiggyPhases(data.biggy ?? []);

        // Auto-collapse complete phases (both tracks)
        const collapseMap: Record<number, boolean> = {};
        [...data.adr, ...data.biggy].forEach((p) => {
          collapseMap[p.id] = p.steps.length > 0 && p.steps.every((s) => s.status === 'complete');
        });
        setCollapsed(collapseMap);
      });
  }, [projectId]);

  // Calculate progress per track
  const adrTotal = adrPhases.flatMap((p) => p.steps).length;
  const adrComplete = adrPhases.flatMap((p) => p.steps).filter((s) => s.status === 'complete').length;
  const adrPct = adrTotal > 0 ? (adrComplete / adrTotal) * 100 : 0;

  const biggyTotal = biggyPhases.flatMap((p) => p.steps).length;
  const biggyComplete = biggyPhases.flatMap((p) => p.steps).filter((s) => s.status === 'complete').length;
  const biggyPct = biggyTotal > 0 ? (biggyComplete / biggyTotal) * 100 : 0;

  return (
    <div data-testid="onboarding-dashboard" className="space-y-6 pb-10">
      {/* Sticky header with dual progress rings */}
      <div className="sticky top-0 z-[5] bg-white border-b px-4 py-3 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <ProgressRing pct={adrPct} />
          <div>
            <p className="text-xs font-semibold text-zinc-900">ADR</p>
            <p className="text-xs text-zinc-500">{adrComplete}/{adrTotal} steps</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ProgressRing pct={biggyPct} />
          <div>
            <p className="text-xs font-semibold text-zinc-900">Biggy</p>
            <p className="text-xs text-zinc-500">{biggyComplete}/{biggyTotal} steps</p>
          </div>
        </div>
      </div>

      {/* Shared filter bar */}
      <div data-testid="filter-bar" className="px-4 flex flex-wrap items-center gap-2">
        {/* Same filter implementation as existing */}
      </div>

      {/* Dual-track layout: side-by-side on md+, stacked on mobile */}
      <div className="px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ADR Column */}
        <section data-testid="adr-track" className="space-y-4 border-l-4 border-blue-200 pl-4">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            ADR Onboarding
          </h2>
          {adrPhases.length === 0 ? (
            <p className="text-sm text-zinc-400">No ADR phases found.</p>
          ) : (
            adrPhases.map((phase) => (
              <PhaseCard key={phase.id} phase={phase} /* ... */ />
            ))
          )}
        </section>

        {/* Biggy Column */}
        <section data-testid="biggy-track" className="space-y-4 border-l-4 border-green-200 pl-4">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Biggy Onboarding
          </h2>
          {biggyPhases.length === 0 ? (
            <p className="text-sm text-zinc-400">No Biggy phases found.</p>
          ) : (
            biggyPhases.map((phase) => (
              <PhaseCard key={phase.id} phase={phase} /* ... */ />
            ))
          )}
        </section>
      </div>

      {/* Risks, Milestones sections remain unchanged */}
    </div>
  );
}
```

**Why this pattern:** `grid-cols-1 md:grid-cols-2` is Tailwind standard for responsive dual-column. Filter state shared across both columns (single source of truth). `border-l-4` provides subtle visual distinction. Phase card keyed by `phase.id` maintains collapse state even when switching tracks.

### Anti-Patterns to Avoid
- **Client-side filtering by track:** Server should pre-group data — avoids N^2 filtering on every render
- **Enum for track column:** TEXT is more flexible (matches `workstreams.track` pattern); enum migration adds complexity
- **Mixing completeness with onboarding logic:** WORK-02 explicitly removes completeness — don't create dependencies between these concepts
- **Backfilling existing data:** User confirmed dev data will be wiped; no backfill logic needed in migration

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive layout breakpoints | Custom media query hooks | Tailwind `grid-cols-1 md:grid-cols-2` | Project standard — all responsive layouts use Tailwind utilities; CSS-in-JS is 0% of codebase |
| Progress ring animation | CSS keyframes + custom SVG | Existing `ProgressRing` component | Already implemented in OnboardingDashboard.tsx:117; reuse verbatim, render twice |
| Transaction rollback on failure | Try-catch with manual cleanup | Drizzle `db.transaction()` | Project pattern established in Phase 31/32; automatic rollback on throw |
| Phase collapse state | localStorage persistence | React `useState<Record<number, boolean>>` | Existing pattern in OnboardingDashboard.tsx:213; collapse state keyed by phase.id works across tracks |

**Key insight:** This phase is 90% refactoring existing patterns. Migration pattern from Phase 31/32, transaction pattern from Phase 31, responsive layout from existing dashboard components. Don't invent new abstractions — follow established project conventions.

## Common Pitfalls

### Pitfall 1: Forgetting to Update Drizzle Schema After SQL Migration
**What goes wrong:** Migration runs successfully, but Drizzle queries fail with type errors because `schema.ts` doesn't reflect new column
**Why it happens:** Migration is SQL-first, but Drizzle schema is TypeScript-first — they're separate sources of truth
**How to avoid:** ALWAYS update `db/schema.ts` immediately after writing migration SQL
**Warning signs:** TypeScript error `Property 'track' does not exist on type 'OnboardingPhase'` despite column existing in DB

```typescript
// CORRECT: Update schema.ts to match migration
export const onboardingPhases = pgTable('onboarding_phases', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  track: text('track'), // ADD THIS LINE
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
})
```

### Pitfall 2: Seeding Phases Outside Transaction
**What goes wrong:** Project INSERT succeeds, but phase seeding fails → orphaned project with no phases
**Why it happens:** Separate API calls or non-transactional inserts
**How to avoid:** Wrap project creation + phase seeding in single `db.transaction(async (tx) => { ... })`
**Warning signs:** Manual cleanup queries in production logs; "new project has no phases" user reports

### Pitfall 3: Not Handling Empty Track Arrays in Dual-Column UI
**What goes wrong:** UI crashes or renders blank when one track has zero phases
**Why it happens:** Assuming both `adr` and `biggy` arrays always have content
**How to avoid:** Render empty state explicitly: `{adrPhases.length === 0 ? <EmptyState /> : <PhaseList />}`
**Warning signs:** Console error `Cannot read property 'map' of undefined`; blank column on one side

### Pitfall 4: Forgetting to Remove Completeness Imports
**What goes wrong:** Build succeeds but completeness logic remains partially active, causing confusion
**Why it happens:** Removing UI but not the imports/server-side fetch logic
**How to avoid:** Remove BOTH the UI (lines 95-130 in overview/page.tsx) AND the imports (`computeCompletenessScore`, `getBannerData`, `TableCounts`, `count` from drizzle-orm)
**Warning signs:** Unused variable warnings; larger bundle size than expected

### Pitfall 5: Not Filtering API Response by Track in GET /onboarding
**What goes wrong:** Client receives flat array of all phases, must filter by track on every render
**Why it happens:** Copying existing API response shape without considering new track column
**How to avoid:** Server returns `{ adr: [], biggy: [] }` — pre-grouped by track
**Warning signs:** Client-side `.filter((p) => p.track === 'ADR')` in component; performance issues with 100+ phases

## Code Examples

Verified patterns from project codebase:

### Auto-Collapse Complete Phases (Existing Pattern)
```typescript
// Source: components/OnboardingDashboard.tsx:240-244
// Pattern: Auto-collapse phases where ALL steps are complete

const collapseMap: Record<number, boolean> = {};
fetchedPhases.forEach((p) => {
  collapseMap[p.id] = p.steps.length > 0 && p.steps.every((s) => s.status === 'complete');
});
setCollapsed(collapseMap);
```

### Optimistic Update Pattern (Existing)
```typescript
// Source: components/OnboardingDashboard.tsx:265-280
// Pattern: Update local state immediately, then sync to backend

const cycleStepStatus = async (phaseId: number, stepId: number, currentStatus: string) => {
  const idx = STEP_STATUS_CYCLE.indexOf(currentStatus as (typeof STEP_STATUS_CYCLE)[number]);
  const nextStatus = STEP_STATUS_CYCLE[(idx + 1) % STEP_STATUS_CYCLE.length];

  // Optimistic update
  setPhases((prev) =>
    prev.map((p) =>
      p.id === phaseId
        ? { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, status: nextStatus } : s)) }
        : p
    )
  );

  // Backend sync (no await — fire-and-forget)
  await fetch(`/api/projects/${projectId}/onboarding/steps/${stepId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: nextStatus }),
  });
};
```

### Migration Index Pattern (Phase 32)
```sql
-- Source: db/migrations/0025_time_entries_user_id.sql
-- Pattern: Composite index for common query pattern (project_id + track)

CREATE INDEX idx_onboarding_phases_track ON onboarding_phases(project_id, track);
```

### requireSession() Pattern (Phase 26)
```typescript
// Source: app/api/projects/[projectId]/onboarding/route.ts:12-13
// Pattern: Session check at route handler entry

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  // ... rest of handler
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single flat phase list | Grouped by track (ADR/Biggy) | Phase 33 (this phase) | Enables separate progress tracking, clearer roadmap visualization |
| Project Completeness score | Removed (no replacement) | Phase 33 (this phase) | Simplifies Overview tab, removes confusing metric that didn't reflect actual project health |
| Client-side filtering | Server-side grouping | Phase 33 (this phase) | Better performance with 100+ phases across multiple projects |
| Manual phase creation | Auto-seeded on project creation | Phase 33 (this phase) | Standardizes onboarding structure, reduces setup friction |

**Deprecated/outdated:**
- **Completeness indicator (lines 95-130 of overview/page.tsx):** Being removed in this phase per WORK-02 requirement; no migration path needed

## Open Questions

**None** — all research domains fully covered with HIGH confidence.

User decisions from CONTEXT.md provide complete specification:
- Migration strategy: TEXT column, no backfill
- Seeding approach: Inside POST /api/projects transaction
- API contract: `{ adr: [], biggy: [] }` response shape
- UI layout: Dual-column with shared filter bar

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 0.x + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npm test -- tests/overview/track-separation.test.ts -x` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORK-01 | ADR and Biggy phases render in separate columns with independent progress rings | unit | `npm test -- tests/overview/track-separation.test.ts::test_dual_track_rendering -x` | ❌ Wave 0 |
| WORK-01 | API response groups phases by track (`{ adr: [], biggy: [] }`) | unit | `npm test -- tests/api/onboarding-grouped.test.ts::test_api_grouping -x` | ❌ Wave 0 |
| WORK-01 | Filter bar applies to both tracks simultaneously | unit | `npm test -- tests/overview/track-separation.test.ts::test_shared_filter -x` | ❌ Wave 0 |
| WORK-01 | Auto-seeded phases exist on new project creation | integration | `npm test -- tests/api/project-seeding.test.ts::test_phase_seeding -x` | ❌ Wave 0 |
| WORK-02 | Completeness score bar removed from overview/page.tsx | unit | `npm test -- tests/overview/completeness-removal.test.ts::test_no_completeness -x` | ❌ Wave 0 |
| WORK-02 | Completeness warning banner removed | unit | `npm test -- tests/overview/completeness-removal.test.ts::test_no_banner -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- tests/overview/ -x` (runs all overview tests, exits on first failure)
- **Per wave merge:** `npm test` (full suite across all 100+ tests)
- **Phase gate:** Full suite green + manual browser verification of dual-track UI before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/overview/track-separation.test.ts` — covers WORK-01 dual-track rendering and shared filter
- [ ] `tests/api/onboarding-grouped.test.ts` — covers WORK-01 API response grouping
- [ ] `tests/api/project-seeding.test.ts` — covers WORK-01 auto-seeded phases on project creation
- [ ] `tests/overview/completeness-removal.test.ts` — covers WORK-02 completeness removal
- [ ] Framework install: N/A — Vitest already configured in vitest.config.ts

## Sources

### Primary (HIGH confidence)
- **Project codebase analysis:**
  - `db/schema.ts` — confirmed `workstreams.track` uses TEXT (not enum), established precedent
  - `db/migrations/0024_*.sql`, `0025_*.sql` — migration patterns (TEXT column + index, no RLS)
  - `app/api/projects/[projectId]/onboarding/route.ts` — existing API structure, transaction pattern
  - `components/OnboardingDashboard.tsx` — existing UI patterns (ProgressRing, collapse state, optimistic updates)
  - `app/customer/[id]/overview/page.tsx` — completeness logic to be removed (lines 95-130)
  - `vitest.config.ts` — test framework configuration
- **CONTEXT.md (user decisions):** All technical decisions locked, no ambiguity
- **STATE.md:** Phase 31/32 precedents for migration + transaction patterns

### Secondary (MEDIUM confidence)
- None required — all findings sourced from project codebase or user decisions

### Tertiary (LOW confidence)
- None — research based entirely on project code and explicit user decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, versions confirmed via package.json
- Architecture: HIGH — patterns established in Phase 31/32, user decisions eliminate ambiguity
- Pitfalls: HIGH — identified from existing codebase patterns and common migration mistakes

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (30 days — stable domain, no fast-moving dependencies)
