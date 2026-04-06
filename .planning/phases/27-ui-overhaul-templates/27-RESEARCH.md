# Phase 27: UI Overhaul + Templates - Research

**Researched:** 2026-03-31
**Domain:** Next.js navigation patterns, TypeScript registry architecture, project seeding
**Confidence:** HIGH

## Summary

This phase refactors workspace navigation from 14 flat tabs to a 6+11 two-level grouped structure using Next.js searchParams for URL state (`?tab=delivery&subtab=actions`), builds a TypeScript-enforced template registry (`lib/tab-template-registry.ts`) that defines required sections for all 11 tab types, and seeds new projects with instructional placeholder content on creation.

Visual modernization (color palette, typography, spacing) is explicitly deferred — not part of this milestone.

The technical challenge is threefold: (1) migrating from pathname-based routing (`/customer/[id]/actions`) to searchParams-based routing while preserving deep-linking and browser back/forward, (2) creating a typed registry that enforces exhaustive key coverage at compile-time, and (3) integrating seeding logic into the Phase 20 wizard's launch flow.

**Primary recommendation:** Use Next.js `useSearchParams()` + `useRouter()` for client-side navigation state, `Record<TabType, SectionDef>` with `satisfies` for exhaustive type checking, and extend the POST /api/projects PATCH handler to trigger seeding after status='active'.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Tab Grouping Map:** 14 tabs collapse into 6 top-level items with sub-tabs:
  - Overview (standalone)
  - Delivery → Actions · Risks · Milestones · Plan
  - Team → Teams · Architecture · Stakeholders
  - Intel → Decisions · Engagement History
  - Skills (standalone)
  - Admin → Time · Artifacts · Review Queue
- **Plan's internal navigation preserved:** Phase Board / Task Board / Gantt / Swimlane remain as Plan's own internal view switcher (not flattened into Delivery sub-tabs)
- **Default landing:** Clicking a parent tab lands on first sub-tab; no last-visited memory
- **Sub-tab navigation UX:** Second row of tabs below primary bar (GitHub-style secondary nav), sticky alongside primary bar
- **URL pattern:** `?tab=delivery&subtab=actions` — deep-linkable, browser back works
- **Template registry file:** `lib/tab-template-registry.ts`
- **11 tab types covered:** Overview, Actions, Risks, Milestones, Teams, Architecture, Decisions, Engagement History, Stakeholders, Plan, Skills
- **Time/Artifacts/Review Queue excluded** from template requirement
- **Seed placeholder style:** Instructional text ("Add your first action — owner, due date, and description"), not silent empty state and not pre-populated demo rows
- **Dual purpose registry:** Single source of truth for Phase 27 seeding AND Phase 30 Context Hub completeness analysis
- **Visual modernization explicitly deferred:** No color palette, typography, or spacing work in this phase

### Claude's Discretion
- Exact section names and required fields for all 11 tab types (proposed during planning, reviewed at verification)
- Implementation of the two-level sticky tab bar (component structure, scroll behavior)
- New project creation hook that triggers seeding from registry

### Deferred Ideas (OUT OF SCOPE)
- **Visual modernization:** Updated color palette, typography scale, component spacing, Tailwind token system cleanup — future phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | Project workspace tabs are grouped into logical sub-tabs to reduce top-level navigation clutter | Next.js searchParams URL state (useSearchParams + useRouter), two-level Link href construction, WorkspaceTabs refactor from flat array to grouped structure |
| UI-02 | Color palette, typography, spacing, and component styling are modernized throughout | **EXPLICITLY OUT OF SCOPE** — user decision removed visual modernization from this phase |
| UI-03 | Each tab type has a fixed required section structure enforced by a TypeScript template registry | Record<TabType, SectionDef> with satisfies for exhaustive checking, typed registry pattern enforces compile-time coverage |
| UI-04 | New projects are seeded with template placeholder content on creation | POST /api/projects integration, wizard LaunchStep triggers seeding, registry provides placeholder text strings |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.x | App Router, searchParams, useSearchParams, useRouter | Already installed; official navigation APIs for URL state management |
| TypeScript | 5.x | Typed registry, exhaustive key checking with Record + satisfies | Project baseline; compile-time enforcement of registry completeness |
| Radix UI (via shadcn/ui) | @radix-ui/react-tabs ^1.1.13 | Tabs primitives for secondary tab row | Already installed; accessible tab components with keyboard nav |
| React | 19.x (canary) | useSearchParams, useRouter, client component hooks | Next.js 16 baseline |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | ^4.1.1 | Unit tests for registry type checking, navigation component rendering | Already installed; project test framework |
| @testing-library/react | ^16.3.2 | Component rendering tests for WorkspaceTabs, mock useSearchParams/useRouter | Already installed; standard React component testing |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers for navigation tests | Already installed; test assertions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| searchParams URL state | Client-only React state (useState) | searchParams preserves deep-linking and browser back/forward; client state breaks these |
| Record<K, V> + satisfies | Zod schema or class-based registry | Record + satisfies is zero-runtime-cost TypeScript; Zod adds bundle size; classes add ceremony; for compile-time enforcement only, Record wins |
| Radix Tabs primitives | Headless UI Tabs or custom tab logic | Radix already installed; accessible by default; swapping requires removing shadcn/ui dependency |

**Installation:**
```bash
# All dependencies already installed in project
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure
```
app/customer/[id]/
├── layout.tsx               # Renders WorkspaceTabs (refactored to grouped)
├── page.tsx                 # Redirects to ?tab=overview (default)
components/
├── WorkspaceTabs.tsx        # REFACTOR: flat TABS → grouped TAB_GROUPS
├── SubTabBar.tsx            # NEW: renders secondary tab row for active parent
lib/
├── tab-template-registry.ts # NEW: typed registry of section structures
├── seed-project.ts          # NEW: reads registry, writes placeholder rows to DB
app/api/projects/
├── route.ts                 # POST handler — no change needed (returns draft project)
├── [projectId]/route.ts     # PATCH handler — trigger seeding after status='active'
```

### Pattern 1: URL State Management with searchParams

**What:** Replace pathname-based routing (`/customer/[id]/actions`) with searchParams-based routing (`/customer/[id]?tab=delivery&subtab=actions`) while preserving deep-linking and browser back/forward.

**When to use:** Multi-level navigation where all content shares a single page route but displays different views.

**Implementation:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/use-search-params
'use client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

function WorkspaceTabs({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname() // /customer/[id]
  const router = useRouter()

  const activeTab = searchParams.get('tab') ?? 'overview'
  const activeSubtab = searchParams.get('subtab') ?? null

  // Method 1: Link-based navigation (preferred for accessibility)
  const href = `/customer/${projectId}?tab=delivery&subtab=actions`
  return <Link href={href}>Actions</Link>

  // Method 2: Programmatic navigation (for onClick handlers)
  const navigate = (tab: string, subtab?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    if (subtab) params.set('subtab', subtab)
    else params.delete('subtab')
    router.push(`${pathname}?${params.toString()}`)
  }
}
```

**Critical gotcha:** `useSearchParams()` in client components requires wrapping in `<Suspense>` boundary during prerendering, otherwise Next.js build fails with "Missing Suspense boundary with useSearchParams" error. WorkspaceTabs is already rendered in layout.tsx (server component) which can pass searchParams down, avoiding Suspense requirement.

**Alternative approach:** Server component reads `searchParams` prop directly:
```typescript
// app/customer/[id]/page.tsx
export default async function WorkspacePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string, subtab?: string }>
}) {
  const { tab = 'overview', subtab } = await searchParams
  // Render content based on tab/subtab
}
```

This avoids Suspense boundary requirement but prevents client-side interactivity (onClick handlers). **Hybrid approach:** Server component passes searchParams to client component as props:
```typescript
// layout.tsx (server)
export default async function Layout({ params, searchParams }) {
  return <WorkspaceTabs projectId={id} initialTab={tab} initialSubtab={subtab} />
}

// WorkspaceTabs.tsx (client)
'use client'
export function WorkspaceTabs({ initialTab, initialSubtab }) {
  const searchParams = useSearchParams()
  // Read from searchParams for client-side nav, fall back to initialTab for SSR
}
```

### Pattern 2: TypeScript Exhaustive Registry

**What:** Use `Record<K, V>` with `satisfies` operator to enforce that all keys in a union type are present in a registry object.

**When to use:** Type-safe registries where adding a new type (e.g., new tab type) must force adding a corresponding registry entry at compile-time.

**Implementation:**
```typescript
// lib/tab-template-registry.ts
type TabType =
  | 'overview'
  | 'actions'
  | 'risks'
  | 'milestones'
  | 'teams'
  | 'architecture'
  | 'decisions'
  | 'history'
  | 'stakeholders'
  | 'plan'
  | 'skills'

interface SectionDef {
  name: string
  requiredFields: string[]
  placeholderText: string
}

interface TabTemplate {
  sections: SectionDef[]
}

// Exhaustive check: if you add a new TabType, TS error until you add entry here
export const TAB_TEMPLATE_REGISTRY = {
  overview: {
    sections: [
      { name: 'Project Summary', requiredFields: ['description'], placeholderText: 'Describe the project scope and objectives' },
      { name: 'Key Metrics', requiredFields: ['metric'], placeholderText: 'Add success metrics' },
    ]
  },
  actions: {
    sections: [
      { name: 'Action Items', requiredFields: ['description', 'owner', 'due'], placeholderText: 'Add your first action — owner, due date, and description' },
    ]
  },
  // ... all 11 tab types
} satisfies Record<TabType, TabTemplate>

// Type-safe access
type RegistryType = typeof TAB_TEMPLATE_REGISTRY
type ValidTab = keyof RegistryType // 'overview' | 'actions' | ...

// If you reference a tab type not in the registry, TypeScript error:
// function getTemplate(tab: TabType) {
//   return TAB_TEMPLATE_REGISTRY[tab] // ✓ All TabType values covered
// }
```

**Why satisfies not as:** `satisfies` checks the object matches the type without widening; `as` casts away type safety. If you use `as Record<TabType, TabTemplate>`, TypeScript won't error on missing keys.

**Alternative with mapped types:**
```typescript
// More verbose but explicit about required coverage
type TabRegistry = {
  [K in TabType]: TabTemplate
}

export const TAB_TEMPLATE_REGISTRY: TabRegistry = {
  // Must list all TabType values
}
```

Both approaches enforce exhaustiveness; `satisfies` is terser and preserves literal types.

### Pattern 3: Grouped Navigation Structure

**What:** Refactor flat TABS array into grouped structure with parent/children relationships.

**When to use:** Reducing top-level navigation clutter while maintaining logical grouping.

**Implementation:**
```typescript
// components/WorkspaceTabs.tsx
interface TabGroup {
  id: string
  label: string
  standalone?: boolean // No sub-tabs
  children?: Array<{ id: string, label: string, segment: string }>
}

const TAB_GROUPS: TabGroup[] = [
  { id: 'overview', label: 'Overview', standalone: true },
  {
    id: 'delivery',
    label: 'Delivery',
    children: [
      { id: 'actions', label: 'Actions', segment: 'actions' },
      { id: 'risks', label: 'Risks', segment: 'risks' },
      { id: 'milestones', label: 'Milestones', segment: 'milestones' },
      { id: 'plan', label: 'Plan', segment: 'plan' },
    ]
  },
  {
    id: 'team',
    label: 'Team',
    children: [
      { id: 'teams', label: 'Teams', segment: 'teams' },
      { id: 'architecture', label: 'Architecture', segment: 'architecture' },
      { id: 'stakeholders', label: 'Stakeholders', segment: 'stakeholders' },
    ]
  },
  {
    id: 'intel',
    label: 'Intel',
    children: [
      { id: 'decisions', label: 'Decisions', segment: 'decisions' },
      { id: 'history', label: 'Engagement History', segment: 'history' },
    ]
  },
  { id: 'skills', label: 'Skills', standalone: true },
  {
    id: 'admin',
    label: 'Admin',
    children: [
      { id: 'time', label: 'Time', segment: 'time' },
      { id: 'artifacts', label: 'Artifacts', segment: 'artifacts' },
      { id: 'queue', label: 'Review Queue', segment: 'queue' },
    ]
  },
]

function WorkspaceTabs({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'overview'
  const activeSubtab = searchParams.get('subtab')

  const activeGroup = TAB_GROUPS.find(g =>
    g.id === activeTab || g.children?.some(c => c.id === activeTab)
  )

  return (
    <>
      {/* Primary tab bar */}
      <nav className="flex border-b">
        {TAB_GROUPS.map(group => (
          <Link
            key={group.id}
            href={`/customer/${projectId}?tab=${group.standalone ? group.id : group.children![0].id}`}
            className={activeGroup?.id === group.id ? 'border-b-2 border-zinc-900' : ''}
          >
            {group.label}
          </Link>
        ))}
      </nav>

      {/* Secondary tab bar (conditional) */}
      {activeGroup && !activeGroup.standalone && (
        <nav className="flex border-b bg-zinc-50">
          {activeGroup.children!.map(child => (
            <Link
              key={child.id}
              href={`/customer/${projectId}?tab=${activeGroup.id}&subtab=${child.id}`}
              className={activeSubtab === child.id ? 'border-b-2 border-zinc-900' : ''}
            >
              {child.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  )
}
```

**Critical detail:** Default landing logic — clicking "Delivery" navigates to first child (Actions), not a parent-level landing page. URL becomes `?tab=delivery&subtab=actions`.

### Pattern 4: Project Seeding on Creation

**What:** Inject template placeholder content into all 11 tab types when a project transitions from draft to active.

**When to use:** New project creation flows where empty tabs reduce usability; instructional placeholders guide users.

**Integration point:** Phase 20 wizard's LaunchStep calls `PATCH /api/projects/[projectId]` with `{ status: 'active' }`. Extend this handler to trigger seeding.

**Implementation:**
```typescript
// app/api/projects/[projectId]/route.ts
import { seedProjectFromRegistry } from '@/lib/seed-project'

export async function PATCH(req: NextRequest, { params }) {
  const { projectId } = await params
  const body = await req.json()

  if (body.status === 'active') {
    // Existing logic: update project status
    await db.update(projects).set({ status: 'active' }).where(eq(projects.id, projectId))

    // NEW: Seed template content
    await seedProjectFromRegistry(projectId)

    return NextResponse.json({ ok: true })
  }
}
```

```typescript
// lib/seed-project.ts
import { TAB_TEMPLATE_REGISTRY } from './tab-template-registry'
import { db } from '@/db'
import { actions, risks, milestones, /* ... all tables */ } from '@/db/schema'

export async function seedProjectFromRegistry(projectId: number) {
  // For each tab type in registry, insert placeholder rows
  const actionsTemplate = TAB_TEMPLATE_REGISTRY.actions
  for (const section of actionsTemplate.sections) {
    await db.insert(actions).values({
      project_id: projectId,
      description: section.placeholderText,
      owner: 'TBD',
      due: 'TBD',
      status: 'open',
      source: 'template', // Distinguish from user-created
      source_artifact_id: null,
    })
  }

  // Repeat for risks, milestones, teams, architecture, decisions, history, stakeholders, plan, skills
  // Overview is a special case — no DB table, completeness score is calculated
}
```

**Idempotency:** Check if seeding already occurred (e.g., flag in projects table: `seeded: boolean`) to prevent duplicate placeholder rows if PATCH is called multiple times.

**Placeholder identification:** Set `source: 'template'` so users can distinguish instructional placeholders from real data. Phase 30 completeness analysis must **exclude** rows where `source='template'` — placeholder rows count as **zero credit** toward completeness score.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL state management | Custom query string parser/builder | `URLSearchParams` + Next.js `useSearchParams()` | URLSearchParams is Web API standard; handles encoding, multiple values, edge cases; Next.js hooks integrate with Router cache and prefetching |
| Tab keyboard navigation | Custom focus management and arrow key handlers | Radix UI Tabs primitives (already installed via shadcn/ui) | ARIA attributes, focus trapping, arrow key nav, home/end keys, roving tabindex — all handled; rebuilding is 500+ LOC and breaks screen readers |
| Type-safe registry with exhaustiveness checking | Runtime validation (Zod) or manual type guards | TypeScript `Record<K, V>` with `satisfies` | Zero runtime cost; compile-time guarantee of complete coverage; adding new tab type fails build if registry entry missing |
| Sticky header scroll behavior | Custom intersection observer + scroll event listeners | CSS `position: sticky` + `top: 0` | Browser-native, 60fps, handles edge cases (nested scrollers, flex containers, print media) without JS |

**Key insight:** Navigation state management has deep browser integration requirements (back button, URL bar updates, prefetching, scroll restoration). Custom solutions break progressive enhancement and require extensive edge case handling. Next.js built-in hooks abstract this correctly; searchParams-based routing is the blessed pattern for view state.

## Common Pitfalls

### Pitfall 1: Missing Suspense Boundary with useSearchParams

**What goes wrong:** Build fails with "Missing Suspense boundary with useSearchParams" error during production build.

**Why it happens:** Next.js prerenders pages during build; `useSearchParams()` in client components opts the component tree into client-side rendering, requiring a Suspense boundary so the rest of the page can still be prerendered.

**How to avoid:**
1. **Preferred:** Pass searchParams from server component (layout/page) to client component as props — no Suspense needed
2. **Alternative:** Wrap client component using `useSearchParams()` in `<Suspense fallback={...}>`

**Warning signs:** Build succeeds in dev mode but fails in `next build`; error message mentions prerendering.

**Example fix:**
```typescript
// app/customer/[id]/layout.tsx (server component)
export default async function Layout({ children, params, searchParams }) {
  const { tab, subtab } = await searchParams
  return (
    <>
      <WorkspaceTabs projectId={id} initialTab={tab} initialSubtab={subtab} />
      {children}
    </>
  )
}

// components/WorkspaceTabs.tsx (client component)
'use client'
export function WorkspaceTabs({ initialTab, initialSubtab }) {
  // Can still use useSearchParams() for client-side updates
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') ?? initialTab
  // ...
}
```

### Pitfall 2: Stale searchParams in Layout Components

**What goes wrong:** Layout components do NOT receive `searchParams` prop; attempting to read URL state in layout leads to stale values across navigations.

**Why it happens:** Layouts are not re-rendered during client-side navigation (performance optimization); searchParams would be cached from initial load.

**How to avoid:** Only read searchParams in page.tsx or client components using useSearchParams(). Pass down as props from page to layout children if needed.

**Warning signs:** Tab state doesn't update when clicking links; initial page load shows correct tab but navigation breaks.

**Source:** https://nextjs.org/docs/app/api-reference/file-conventions/layout#query-params

### Pitfall 3: Record<K, V> Without satisfies

**What goes wrong:** TypeScript doesn't error when registry is missing keys for some TabType values.

**Why it happens:** Using `as Record<TabType, Template>` casts the object, telling TypeScript "trust me, this matches" — no verification.

**How to avoid:** Use `satisfies Record<TabType, Template>` instead of `as` — TypeScript checks every key exists and values match, but preserves literal types.

**Warning signs:** Adding a new tab type doesn't fail compilation; runtime error when accessing registry['newTab'] returns undefined.

**Example:**
```typescript
// BAD — compiles even if entries missing
const registry = {
  overview: { ... },
  actions: { ... },
  // missing 'risks'
} as Record<TabType, Template>

// GOOD — TypeScript error: Property 'risks' is missing
const registry = {
  overview: { ... },
  actions: { ... },
  // missing 'risks'
} satisfies Record<TabType, Template>
```

### Pitfall 4: Forgetting Plan's Internal Navigation

**What goes wrong:** Flattening Plan's internal views (Phase Board, Task Board, Gantt, Swimlane) into Delivery sub-tabs breaks existing functionality.

**Why it happens:** Misinterpreting user requirement — "group tabs" doesn't mean flatten nested navigation.

**How to avoid:** Plan is ONE sub-tab under Delivery; its internal navigation remains as-is (separate component, separate routes). URL pattern: `?tab=delivery&subtab=plan` → Plan page renders PlanTabs component → internal links to `/customer/[id]/plan/board`, `/customer/[id]/plan/tasks`, etc.

**Warning signs:** Plan's existing 4-way navigation disappears; user requirement explicitly states "Plan's internal navigation is preserved as-is."

### Pitfall 5: Seeding Race Condition

**What goes wrong:** Concurrent PATCH requests to set status='active' trigger duplicate seeding; DB now has 2x placeholder rows.

**Why it happens:** No idempotency check; seeding logic runs on every PATCH with status='active'.

**How to avoid:** Add `seeded: boolean` column to projects table; check before seeding:
```typescript
const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) })
if (project.seeded) return // Already seeded

await seedProjectFromRegistry(projectId)
await db.update(projects).set({ seeded: true }).where(eq(projects.id, projectId))
```

**Warning signs:** Multiple placeholder rows appear for same project; no deduplication logic in seeding code.

## Code Examples

Verified patterns from official sources:

### Reading searchParams in Server Component
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/page
// app/customer/[id]/page.tsx
export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string, subtab?: string }>
}) {
  const { id } = await params
  const { tab = 'overview', subtab } = await searchParams

  // Render content based on active tab/subtab
  return <div>Active: {tab} / {subtab}</div>
}
```

### Updating searchParams with useRouter
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/use-search-params
'use client'
import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export function NavigationLink({ tab, subtab, children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value)
        else params.delete(key)
      })
      return params.toString()
    },
    [searchParams]
  )

  const handleClick = () => {
    router.push(pathname + '?' + createQueryString({ tab, subtab: subtab ?? '' }))
  }

  return <button onClick={handleClick}>{children}</button>
}
```

### Link Component with Query Parameters
```typescript
// Source: https://nextjs.org/docs/app/api-reference/components/link
import Link from 'next/link'

// Object syntax (Next.js converts to query string)
<Link href={{ pathname: '/customer/123', query: { tab: 'delivery', subtab: 'actions' } }}>
  Actions
</Link>

// String syntax (manual query string)
<Link href="/customer/123?tab=delivery&subtab=actions">
  Actions
</Link>
```

### Mocking Next.js Hooks in Vitest
```typescript
// Source: tests/auth/login-page.test.tsx (existing project pattern)
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => '/customer/123'),
  useSearchParams: vi.fn(() => new URLSearchParams('tab=overview')),
}))

import { WorkspaceTabs } from '@/components/WorkspaceTabs'

describe('WorkspaceTabs', () => {
  it('renders primary tabs', () => {
    const { getByText } = render(<WorkspaceTabs projectId="123" />)
    expect(getByText('Overview')).toBeInTheDocument()
    expect(getByText('Delivery')).toBeInTheDocument()
  })
})
```

### Exhaustive Type-Safe Registry
```typescript
// TypeScript Handbook patterns (mapped types + satisfies)
type TabType = 'overview' | 'actions' | 'risks' // ... 11 total

interface TabTemplate {
  sections: Array<{ name: string, placeholderText: string }>
}

// Compile-time enforcement: all TabType keys required
export const TAB_TEMPLATE_REGISTRY = {
  overview: { sections: [{ name: 'Summary', placeholderText: '...' }] },
  actions: { sections: [{ name: 'Action Items', placeholderText: '...' }] },
  risks: { sections: [{ name: 'Risk Register', placeholderText: '...' }] },
  // ... must list all 11
} satisfies Record<TabType, TabTemplate>

// Type-safe access
function getTemplate(tab: TabType): TabTemplate {
  return TAB_TEMPLATE_REGISTRY[tab] // TypeScript verifies tab is valid key
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pathname-based tab routing (`/customer/[id]/actions`) | searchParams-based routing (`?tab=delivery&subtab=actions`) | Next.js 13+ App Router | URL state doesn't require route files; single page.tsx handles all tab views; faster client-side transitions |
| `as` type assertions for registries | `satisfies` operator | TypeScript 4.9 (2022) | Exhaustiveness checking without losing literal types; compile-time guarantee of complete key coverage |
| `router.query` in Pages Router | `useSearchParams()` in App Router | Next.js 13 App Router | Client Components use hook, Server Components use searchParams prop; different APIs for same data |
| Headless UI / manual tab logic | Radix UI Tabs primitives | 2021+ | Accessible by default (ARIA, keyboard nav); 90% less code than custom implementation |

**Deprecated/outdated:**
- **router.query (Pages Router):** Replaced by `useSearchParams()` in App Router — different import, different API shape
- **`<a>` tags inside `<Link>`:** Next.js 13+ removed requirement; Link renders `<a>` directly
- **as prop on Link:** Removed in Next.js 10; href now handles both display URL and prefetch URL

## Open Questions

All questions resolved by user (2026-03-31).

1. **Completeness score impact of placeholder rows** — **RESOLVED: Zero credit**
   - Placeholder rows (source='template') count as **zero** toward completeness score
   - Completeness logic must filter out rows where `source='template'` before calculating score
   - Impact: new projects start at 0% completeness until users replace placeholders with real data

2. **Section structure for Plan tab** — **RESOLVED: Yes, needs registry entry**
   - Plan tab requires a template registry entry
   - Registry defines "Business Outcomes" section; seeding inserts 1 placeholder business outcome row
   - Plan's internal navigation (Phase Board / Task Board / Gantt / Swimlane) is unaffected

3. **Skills tab structure** — **RESOLVED: Skip seeding, include registry entry**
   - Skills tab is read-only (execution log); seeding writes nothing to DB
   - Registry entry exists (empty sections array) for compile-time exhaustiveness
   - `seedProjectFromRegistry` skips Skills tab explicitly (no DB writes)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | WorkspaceTabs renders 6 top-level tabs (not 14) | unit | `npm test tests/ui/workspace-tabs.test.tsx -- --run` | ❌ Wave 0 |
| UI-01 | Clicking "Delivery" shows sub-tab bar with 4 children | unit | `npm test tests/ui/workspace-tabs.test.tsx -- --run` | ❌ Wave 0 |
| UI-01 | URL is `?tab=delivery&subtab=actions` after navigation | unit | `npm test tests/ui/workspace-tabs.test.tsx -- --run` | ❌ Wave 0 |
| UI-02 | **OUT OF SCOPE** — no tests needed (visual modernization deferred) | N/A | N/A | N/A |
| UI-03 | TAB_TEMPLATE_REGISTRY has entries for all 11 tab types | unit | `npm test tests/ui/tab-registry.test.ts -- --run` | ❌ Wave 0 |
| UI-03 | TypeScript error if registry missing a TabType key | type-check | `npx tsc --noEmit` | ✅ (existing tsconfig) |
| UI-04 | seedProjectFromRegistry inserts placeholder rows | unit | `npm test tests/ui/seed-project.test.ts -- --run` | ❌ Wave 0 |
| UI-04 | PATCH /api/projects/[id] triggers seeding when status='active' | integration | `npm test tests/api/projects-patch.test.ts -- --run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test tests/ui/ -- --run` (UI-specific tests, < 10 seconds)
- **Per wave merge:** `npm test -- --run` (full suite, < 30 seconds)
- **Phase gate:** Full suite green + manual browser verification of tab navigation and URL state

### Wave 0 Gaps
- [ ] `tests/ui/workspace-tabs.test.tsx` — covers UI-01 (grouped navigation, searchParams URL state)
- [ ] `tests/ui/tab-registry.test.ts` — covers UI-03 (registry completeness)
- [ ] `tests/ui/seed-project.test.ts` — covers UI-04 (seeding logic)
- [ ] `tests/api/projects-patch.test.ts` — covers UI-04 (PATCH handler integration)
- [ ] Mock setup for `useSearchParams` / `useRouter` in `tests/__mocks__/next-navigation.ts` — reusable across tests

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.1 Official Docs — useSearchParams: https://nextjs.org/docs/app/api-reference/functions/use-search-params
- Next.js 16.2.1 Official Docs — page.tsx searchParams prop: https://nextjs.org/docs/app/api-reference/file-conventions/page
- Next.js 16.2.1 Official Docs — useRouter: https://nextjs.org/docs/app/api-reference/functions/use-router
- Next.js 16.2.1 Official Docs — Link component: https://nextjs.org/docs/app/api-reference/components/link
- Next.js 16.2.1 Official Docs — Layout searchParams limitation: https://nextjs.org/docs/app/api-reference/file-conventions/layout#query-params
- shadcn/ui Tabs component: https://ui.shadcn.com/docs/components/tabs
- Existing codebase patterns: `tests/auth/login-page.test.tsx` (Next.js hook mocking)
- Existing codebase patterns: `components/WorkspaceTabs.tsx` (current navigation structure)
- Existing codebase patterns: `app/customer/[id]/layout.tsx` (WorkspaceTabs integration)
- Existing codebase patterns: `components/PlanTabs.tsx` (Plan's internal navigation)

### Secondary (MEDIUM confidence)
- TypeScript handbook patterns for mapped types and exhaustiveness checking (inferred from official TS features)
- Vitest + React Testing Library patterns from existing project test suite

### Tertiary (LOW confidence)
- None — all findings verified against official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Sub-tab navigation (searchParams): HIGH — verified with Next.js 16.2.1 official docs and existing codebase patterns
- TypeScript registry: HIGH — Record + satisfies is established TS pattern; existing project uses TypeScript 5.x
- Project seeding: HIGH — integration point identified (POST /api/projects/[projectId]); pattern mirrors Phase 18 ingestion flow
- Testing patterns: HIGH — Vitest config and mock patterns exist in codebase; React Testing Library already integrated

**Research date:** 2026-03-31
**Valid until:** 60 days (stable APIs — Next.js 16 stable, TypeScript mature, Radix UI primitives unchanged since 1.x)
