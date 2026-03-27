# Phase 21: Teams Tab + Architecture Tab - Research

**Researched:** 2026-03-26
**Domain:** Next.js 14 App Router, Drizzle ORM, React client components, inline CRUD, skill context assembly, self-contained HTML exports
**Confidence:** HIGH

---

## Summary

Phase 21 replaces two thin placeholder tabs (Teams and Architecture) with fully DB-powered, richly structured views. The Teams tab becomes a 5-section Team Engagement Map; the Architecture tab becomes a 2-tab Workflow Diagram (Before BigPanda / Current & Future State). Both views are editable inline with optimistic UI, and both corresponding AI skills are updated to read from the six Phase 17 tables instead of producing AI-generated content from scratch.

The schema is already complete and deployed. All six tables (`business_outcomes`, `e2e_workflows`, `workflow_steps`, `focus_areas`, `architecture_integrations`, `before_state`, `team_onboarding_status`) are exported from `db/schema.ts` with Drizzle and their migrations are in `0011_v2_schema.sql`. No schema work is required in Phase 21 — only API routes, UI components, queries, and skill prompt updates.

The established pattern throughout the codebase is: RSC page loads data via `getWorkspaceData` → passes to `'use client'` modal/editor components → edits go via `fetch` to a project-scoped API route → `router.refresh()` triggers RSC re-render with fresh data. Phase 21 must follow this exact pattern for all new edit surfaces. The skill export path requires extending `buildSkillContext` (or creating a sibling) to include the new table data as formatted markdown sections, then updating the skill `.md` prompt to include structured HTML template instructions matching the visual spec.

**Primary recommendation:** Build API layer first (wave 1), then RSC page restructure with read-only sections (wave 2), then inline edit modals (wave 3), then skill prompt updates (wave 4), with a human verification checkpoint at the end.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEAMS-01 | Teams tab renders 5-section Team Engagement Map view | RSC page.tsx restructure — 5 named section components; data from 4 tables |
| TEAMS-02 | Business Value & Outcomes section: icon+title, track pills, delivery_status badge, mapping_note — from DB | `business_outcomes` table fully defined; query pattern established |
| TEAMS-03 | Architecture section within Teams: ADR panel (blue) + Biggy panel (purple) with integration nodes | `architecture_integrations` filtered by track; design tokens from requirements |
| TEAMS-04 | E2E Workflows section: per-team step sequences with track ownership, arrows | `e2e_workflows` joined with `workflow_steps`; nested query pattern exists in onboarding route |
| TEAMS-05 | Teams & Engagement Status cards: ADR/Biggy items, E2E note, open items, footer tags | `team_onboarding_status` + cross-reference with open actions; data assembly in RSC |
| TEAMS-06 | Top Focus Areas: 3-5 cards with title, track pills, why_it_matters, owners | `focus_areas` table; simple SELECT with project_id |
| TEAMS-07 | Yellow warning banner for any under-populated section — no silent omission | Client-side or RSC check: if rows.length === 0 for a section, render `<WarningBanner>` |
| TEAMS-08 | Inline add/edit for business outcomes, E2E steps, focus areas, team card data | Modal pattern: `ActionEditModal` analog for each entity type; fetch PATCH/POST; router.refresh() |
| TEAMS-09 | AMEX: canonical 8-team order enforced | Customer-specific rule: detect `project.customer === 'AMEX'` in RSC; sort by canonical list |
| TEAMS-10 | team-engagement-map skill updated to read from DB | `buildSkillContext` extended with new sections; skill prompt updated with HTML template spec |
| TEAMS-11 | Design tokens consistent: ADR `#1e40af`, Biggy `#6d28d9`, E2E `#065f46`, status pill colors | Tailwind arbitrary values or `style={{}}` props; same tokens in skill HTML export via inline CSS |
| ARCH-01 | Architecture tab: two-tab Workflow Diagram, tab switching without page reload | `'use client'` tab switcher component with `useState`; two content sections |
| ARCH-02 | Before BigPanda tab: horizontal 5-phase flow with tool names from `before_state` | `before_state.aggregation_hub_name` drives aggregation hub label; tool names from `architecture_integrations` phase=before |
| ARCH-03 | Before BigPanda: 5-6 pain point cards from `before_state.pain_points_json` | JSONB array → map to card components; no generic placeholders |
| ARCH-04 | Current & Future State: ADR Track separated from Biggy AI Track by full-width amber divider | Layout: column flex with a `<div>` divider `bg-amber-400` between tracks |
| ARCH-05 | ADR Track: 5 phase columns with status pills on each node (tool name, method, status) | `architecture_integrations` filtered by track='ADR'; phase column grouping |
| ARCH-06 | Biggy AI Track: phase columns with integration name and status pill | `architecture_integrations` filtered by track='Biggy'; same grouping |
| ARCH-07 | Team Onboarding Status table below both tracks; split ADR/Biggy sections | `team_onboarding_status`; render as HTML table with conditional row coloring |
| ARCH-08 | Status pills: LIVE (green), In Progress (amber), Pilot (amber), Planned (gray) | Design token map; `integrationTrackStatusEnum` values → CSS classes |
| ARCH-09 | Inline add/edit for integration nodes, before-state data, pain points, team onboarding rows | Modal pattern per entity; JSON array for pain_points_json managed as structured list |
| ARCH-10 | workflow-diagram skill updated to read from DB | Same pattern as TEAMS-10; extend context builder, update `.md` prompt |
| ARCH-11 | Customer-specific rules: Kaiser "live in production", Amex "Sahara" hub, Merck mostly Planned | Customer name detection in RSC/context builder; applied at render and skill export |
| ARCH-12 | Architecture tab exports self-contained at 1280px and 1600px | Skill HTML output uses inline CSS with explicit `max-width: 1600px`; no external dependencies |
</phase_requirements>

---

## Standard Stack

### Core (already in project — confirmed by inspection)

| Library | Version | Purpose | Confirmed |
|---------|---------|---------|-----------|
| Next.js | 14 App Router | RSC pages + API routes | Yes — all pages use `async` RSC pattern |
| Drizzle ORM | in use | DB queries | Yes — `db.transaction` + `SET LOCAL app.current_project_id` pattern throughout |
| shadcn/ui | in use | `Badge`, `Dialog`, `Button`, `Tabs`, `Card` | Yes — `components/ui/` directory confirmed |
| Tailwind CSS | in use | Styling | Yes — all components use Tailwind classes |
| React | 18 | Client components | Yes — `'use client'` + `useState` + `useRouter` throughout |
| Vitest | ^4.1.1 | Unit tests | Yes — `vitest.config.ts` confirmed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `shadcn/ui Tabs` | in use | Tab switching for Architecture tab (Before/Current) | ARCH-01: two-tab layout without page reload |
| `shadcn/ui Badge` | in use | Track pills, status badges | TEAMS-02, TEAMS-03, ARCH-08 |
| `shadcn/ui Card` | in use | Business outcome cards, focus area cards | TEAMS-02, TEAMS-06 |
| `shadcn/ui Dialog` | in use | Edit modals for all inline edits | TEAMS-08, ARCH-09 |

**No new packages required.** All needed UI primitives are already installed.

### Installation

No new installations needed for Phase 21.

---

## Architecture Patterns

### Established Project Pattern: RSC + Modal Edit

The project uses a consistent pattern throughout (confirmed in 20+ components):

1. RSC page (`page.tsx`) — `async` server component, queries DB directly, passes typed props to client components
2. Client edit modal — `'use client'`, `useState(false)` for open/closed, `setSaving(true)` during submit, `fetch()` PATCH/POST to API route, `router.refresh()` after success
3. API route — Next.js route handler with `db.transaction()` setting `SET LOCAL app.current_project_id = ${numericId}` before every query

```typescript
// Source: confirmed pattern from bigpanda-app/components/ActionEditModal.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SomeEditModal({ item }: { item: ItemType }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${item.project_id}/entity/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Save failed')
        setSaving(false)
        return
      }
      setOpen(false)
      router.refresh()  // triggers RSC re-fetch — the "optimistic" mechanism
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }
}
```

### Established Pattern: API Route with RLS Transaction

```typescript
// Source: confirmed pattern from bigpanda-app/app/api/projects/[projectId]/integrations/route.ts
import { db } from '@/db'
import { sql } from 'drizzle-orm'

export async function GET(_req, { params }) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
    return tx.select().from(table).where(eq(table.project_id, numericId))
  })

  return NextResponse.json({ data: result })
}
```

### Pattern: Nested Query (parent + children)

For `e2e_workflows` + `workflow_steps`, use the established nested pattern from the onboarding route:

```typescript
// Source: confirmed pattern from bigpanda-app/app/api/projects/[projectId]/onboarding/route.ts
const workflows = await tx.select().from(e2eWorkflows).where(eq(e2eWorkflows.project_id, numericId))
const result = await Promise.all(
  workflows.map(async (wf) => {
    const steps = await tx.select().from(workflowSteps).where(eq(workflowSteps.workflow_id, wf.id))
    return { ...wf, steps }
  })
)
```

### Pattern: Architecture Tab Two-Tab Layout

```tsx
// Use shadcn/ui Tabs (already installed at components/ui/tabs.tsx)
'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ArchitectureTabView({ data }) {
  return (
    <Tabs defaultValue="before">
      <TabsList>
        <TabsTrigger value="before">Before BigPanda</TabsTrigger>
        <TabsTrigger value="current">Current & Future State</TabsTrigger>
      </TabsList>
      <TabsContent value="before">...</TabsContent>
      <TabsContent value="current">...</TabsContent>
    </Tabs>
  )
}
```

### Pattern: Warning Banner for Empty Sections

```tsx
// TEAMS-07: Any section with no DB data must show this instead of generic copy
function SectionWarningBanner({ sectionName }: { sectionName: string }) {
  return (
    <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
      No data found for {sectionName}. Add items to populate this section.
    </div>
  )
}
// Usage in section: if (rows.length === 0) return <SectionWarningBanner sectionName="Business Outcomes" />
```

### Pattern: Design Token Application

Design tokens must be applied consistently in both the tab view AND skill HTML exports:

| Token | Tailwind (tab view) | Inline CSS (skill export) |
|-------|---------------------|--------------------------|
| ADR bg | `bg-blue-100 text-blue-800` | `background: #eff6ff; color: #1e40af` |
| ADR border | `border-blue-200` | `border: 1px solid #bfdbfe` |
| Biggy bg | `bg-purple-100 text-purple-800` | `background: #f5f3ff; color: #6d28d9` |
| Biggy border | `border-purple-200` | `border: 1px solid #ddd6fe` |
| E2E bg | `bg-emerald-100 text-emerald-800` | `background: #ecfdf5; color: #065f46` |
| Live pill | `bg-green-100 text-green-800` | `background: #dcfce7; color: #14532d` |
| In Progress pill | `bg-amber-100 text-amber-800` | `background: #fef3c7; color: #92400e` |
| Pilot pill | same as In Progress | same as In Progress |
| Planned pill | `bg-slate-100 text-slate-600` | `background: #f1f5f9; color: #475569` |
| Amber divider | `bg-amber-400` + `text-amber-900` | `background: #f59e0b; color: #78350f` |

### Recommended Project Structure for Phase 21

```
bigpanda-app/
├── app/
│   ├── api/projects/[projectId]/
│   │   ├── business-outcomes/route.ts           (GET + POST)
│   │   ├── business-outcomes/[id]/route.ts      (PATCH + DELETE)
│   │   ├── e2e-workflows/route.ts               (GET + POST)
│   │   ├── e2e-workflows/[workflowId]/route.ts  (PATCH + DELETE)
│   │   ├── e2e-workflows/[workflowId]/steps/route.ts      (GET + POST)
│   │   ├── e2e-workflows/[workflowId]/steps/[stepId]/route.ts  (PATCH + DELETE)
│   │   ├── focus-areas/route.ts                 (GET + POST)
│   │   ├── focus-areas/[id]/route.ts            (PATCH + DELETE)
│   │   ├── architecture-integrations/route.ts   (GET + POST)
│   │   ├── architecture-integrations/[id]/route.ts  (PATCH + DELETE)
│   │   ├── before-state/route.ts                (GET + PUT — singleton per project)
│   │   └── team-onboarding/route.ts             (GET + POST)
│   │   └── team-onboarding/[id]/route.ts        (PATCH + DELETE)
│   └── customer/[id]/
│       ├── teams/page.tsx                       (RSC — full 5-section rewrite)
│       └── architecture/page.tsx               (RSC — restructure to pass data to client)
├── components/
│   ├── TeamsTabView.tsx                         ('use client' — 5-section render)
│   ├── ArchitectureTabView.tsx                  ('use client' — 2-tab render)
│   ├── BusinessOutcomeEditModal.tsx             (edit modal)
│   ├── FocusAreaEditModal.tsx                   (edit modal)
│   ├── E2eWorkflowEditModal.tsx                 (edit modal)
│   ├── ArchIntegrationEditModal.tsx             (edit modal)
│   ├── BeforeStateEditModal.tsx                 (edit modal)
│   └── TeamOnboardingEditModal.tsx             (edit modal)
└── lib/
    ├── queries.ts                               (add query helpers for new tables)
    └── skill-context.ts                         (extend with new DB sections)
```

### Anti-Patterns to Avoid

- **Generic placeholder text:** Never render static copy in any section — always check DB row count and show warning banner if empty (TEAMS-07)
- **Fetching in client components:** Never use `useEffect + fetch` in RSC pages — load data directly in `async` page functions
- **Missing RLS transaction:** Never query project-scoped tables without `SET LOCAL app.current_project_id` inside `db.transaction()`
- **Hardcoded `before_state` data:** All Before BigPanda content must come from the `before_state` table — no customer-specific hardcoded values in component code
- **External deps in skill HTML:** Skill exports must be fully self-contained — no CDN links, no external CSS/JS. All styles inline.
- **Monolith RSC page:** Don't put all 5 sections in one giant RSC page function — extract section sub-components for testability and maintainability

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab switching | Custom tab state machine | `shadcn/ui Tabs` (already installed) | Already handles keyboard nav, ARIA, animation |
| Status pill colors | Custom color logic | Design token map (see table above) | Consistent across view and export |
| Modal open/close | Custom portal | `shadcn/ui Dialog` (already installed) | Handles focus trap, escape key, backdrop |
| Client-side refresh after edit | Manual state update | `router.refresh()` (established pattern) | Triggers Next.js RSC re-fetch cleanly |
| RLS in API routes | Custom middleware | `db.transaction` + `SET LOCAL` (established pattern) | Project isolation enforced at DB level |

---

## Common Pitfalls

### Pitfall 1: Forgetting RLS Transaction on New API Routes
**What goes wrong:** New routes for `business_outcomes`, `focus_areas` etc. query without `SET LOCAL app.current_project_id` — RLS policy blocks all rows or returns cross-project data.
**Why it happens:** The RLS policy uses `current_setting('app.current_project_id', true)::integer` — if not set, the cast fails or returns null, blocking all rows.
**How to avoid:** Every `db.transaction()` on a project-scoped table must start with `await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))`.
**Warning signs:** API returns empty arrays when data exists in DB; Drizzle query returns zero rows unexpectedly.

### Pitfall 2: Architecture Tab Passing Server Data to Client Component
**What goes wrong:** The Architecture tab needs tab switching (client-side state) but also needs DB data — mixing RSC and client incorrectly causes hydration errors.
**Why it happens:** `'use client'` components cannot directly `await` DB queries.
**How to avoid:** RSC `page.tsx` fetches all data, passes it as props to a `'use client'` `ArchitectureTabView` component. This is the same pattern as `OnboardingDashboard.tsx`.
**Warning signs:** "Server Component cannot be used in a client component" error, or hydration mismatch.

### Pitfall 3: pain_points_json JSONB Array Edit
**What goes wrong:** `before_state.pain_points_json` is a JSONB column (array of objects) — editing requires careful PATCH logic to replace the whole array, not append.
**Why it happens:** JSONB columns need full replacement via `jsonb` operators or full object re-send — partial updates require `jsonb_set()` SQL function.
**How to avoid:** In the `BeforeStateEditModal`, always send the full `pain_points_json` array on PATCH. The route replaces the column wholesale.
**Warning signs:** Pain points disappearing on save, or duplicate entries appearing.

### Pitfall 4: skill-context.ts Not Including New Table Data
**What goes wrong:** Updated skill prompts reference "business outcomes" and "integration nodes" but `buildSkillContext` never queries those tables — Claude has no data to work with.
**Why it happens:** `buildSkillContext` only calls `getWorkspaceData` which was built before Phase 17 tables existed.
**How to avoid:** Add new query calls to `buildSkillContext` (or create `buildTeamsSkillContext` / `buildArchSkillContext` variants) that pull from `businessOutcomes`, `e2eWorkflows`, `focusAreas`, `architectureIntegrations`, `beforeState`, `teamOnboardingStatus`.
**Warning signs:** Claude-generated HTML has generic placeholders instead of real customer data.

### Pitfall 5: Customer-Specific Logic Scattered Across Components
**What goes wrong:** AMEX canonical team order (TEAMS-09) and Kaiser/Amex/Merck-specific framing (ARCH-11) end up hardcoded in multiple components and the skill prompt independently — inconsistency creeps in.
**Why it happens:** No central location for customer-specific rules.
**How to avoid:** Define a `getCustomerRules(customer: string)` helper in `lib/queries.ts` or a dedicated `lib/customer-rules.ts` that both RSC pages and `buildSkillContext` call.
**Warning signs:** AMEX teams appear in wrong order in tab view but correct in skill export (or vice versa).

### Pitfall 6: Skill HTML Export Fails at 1600px
**What goes wrong:** The exported HTML renders well at 1280px but breaks at 1600px because the layout uses hardcoded pixel widths for columns.
**Why it happens:** Fixed-width CSS doesn't scale to wider viewports.
**How to avoid:** Use `max-width: 1600px` on the outer container, percentage-based column widths for phase columns, and test at both breakpoints. For the 5-phase flow in the Before tab, use `display: flex; flex: 1` per column.
**Warning signs:** Phase columns overflow or collapse at 1600px width.

---

## Code Examples

### Query Helper for Teams Tab Data (all 4 tables)

```typescript
// Source: pattern derived from confirmed bigpanda-app/lib/queries.ts patterns
// Add to lib/queries.ts as getTeamsTabData(projectId: number)
export async function getTeamsTabData(projectId: number) {
  return await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${projectId}`))

    const [outcomes, workflows, focusAreaRows, teamRows] = await Promise.all([
      tx.select().from(businessOutcomes).where(eq(businessOutcomes.project_id, projectId)),
      tx.select().from(e2eWorkflows).where(eq(e2eWorkflows.project_id, projectId)),
      tx.select().from(focusAreas).where(eq(focusAreas.project_id, projectId)),
      tx.select().from(teamOnboardingStatus).where(eq(teamOnboardingStatus.project_id, projectId)),
    ])

    const workflowsWithSteps = await Promise.all(
      workflows.map(async (wf) => {
        const steps = await tx.select().from(workflowSteps)
          .where(eq(workflowSteps.workflow_id, wf.id))
          .orderBy(asc(workflowSteps.position))
        return { ...wf, steps }
      })
    )

    return { outcomes, workflows: workflowsWithSteps, focusAreas: focusAreaRows, teamRows }
  })
}
```

### Extended buildSkillContext for Teams/Architecture Skills

```typescript
// Source: pattern derived from bigpanda-app/lib/skill-context.ts
// New sections to add after existing workspace sections:

if (businessOutcomes?.length) {
  sections.push('## Business Outcomes')
  businessOutcomes.forEach(o => {
    sections.push(`- ${o.title} | Track: ${o.track} | Status: ${o.delivery_status} | Note: ${o.mapping_note ?? 'N/A'}`)
  })
}

if (workflows?.length) {
  sections.push('## E2E Workflows')
  workflows.forEach(wf => {
    sections.push(`### ${wf.team_name}: ${wf.workflow_name}`)
    wf.steps.forEach(s => sections.push(`  - Step ${s.position}: ${s.label} (${s.track ?? 'N/A'}) — ${s.status ?? 'N/A'}`))
  })
}

if (architectureIntegrations?.length) {
  sections.push('## Architecture Integrations')
  architectureIntegrations.forEach(i => {
    sections.push(`- ${i.tool_name} | Track: ${i.track} | Phase: ${i.phase ?? 'N/A'} | Status: ${i.status} | Method: ${i.integration_method ?? 'N/A'}`)
  })
}

if (beforeStateRow) {
  sections.push('## Before BigPanda State')
  sections.push(`Aggregation Hub: ${beforeStateRow.aggregation_hub_name ?? 'N/A'}`)
  sections.push(`Alert→Ticket Problem: ${beforeStateRow.alert_to_ticket_problem ?? 'N/A'}`)
  const painPoints = beforeStateRow.pain_points_json as string[]
  painPoints.forEach(p => sections.push(`- Pain Point: ${p}`))
}

if (teamOnboardingRows?.length) {
  sections.push('## Team Onboarding Status')
  teamOnboardingRows.forEach(t => {
    sections.push(`- ${t.team_name} (${t.track ?? 'N/A'}): Ingest=${t.ingest_status ?? '?'} Correlation=${t.correlation_status ?? '?'} Incident=${t.incident_intelligence_status ?? '?'} SN=${t.sn_automation_status ?? '?'} Biggy=${t.biggy_ai_status ?? '?'}`)
  })
}
```

### AMEX Canonical Team Order (TEAMS-09)

```typescript
// Source: requirement TEAMS-09 spec
const AMEX_CANONICAL_TEAMS = [
  'ITSM & Platform Ops',
  'Loyalty',
  'Observability & Monitoring',
  'OETM/Infrastructure',
  'MIM Team',
  'Global Remittance',
  'Merchant Domain',
  'Change Management',
]

function sortTeamsForCustomer(teams: TeamRow[], customer: string): TeamRow[] {
  if (customer.toLowerCase() !== 'amex') return teams
  return [...teams].sort((a, b) => {
    const ai = AMEX_CANONICAL_TEAMS.indexOf(a.team_name)
    const bi = AMEX_CANONICAL_TEAMS.indexOf(b.team_name)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact for Phase 21 |
|--------------|------------------|--------------|---------------------|
| Teams tab: workstream table only | 5-section engagement map with DB-backed sections | Phase 21 | Full page.tsx rewrite required |
| Architecture tab: workstream list with inline edit modal | 2-tab before/after workflow diagram | Phase 21 | Full page.tsx rewrite required |
| skill-context: workstreams/actions/risks only | Extended context with 6 new tables | Phase 21 | `buildSkillContext` must be extended |
| Skills generate HTML from AI imagination | Skills assemble HTML from structured DB data + template | Phase 21 | Skill prompts need full rewrite with template instructions |
| team-engagement-map.md: generic structure | DB-specific 5-section structure | Phase 21 | Prompt rewrite with section spec and design tokens |
| workflow-diagram.md: generic before/after | DB-specific 2-tab with exact visual spec | Phase 21 | Prompt rewrite with panel spec, phase columns, amber divider |

**Deprecated/outdated in this phase:**
- Current `teams/page.tsx` workstream table: replaced entirely
- Current `architecture/page.tsx` workstream list: replaced entirely
- `ArchitectureEditModal.tsx` (edits `workstreams.state`): no longer the edit surface; new per-entity modals replace it
- `team-engagement-map.md` prompt: current version generates from AI inference; Phase 21 replaces with structured DB-driven template
- `workflow-diagram.md` prompt: current version generates from AI inference; Phase 21 replaces with structured DB-driven template

---

## Open Questions

1. **Phase 17 migration applied to dev DB?**
   - What we know: `0011_v2_schema.sql` exists and defines all 6 tables. Schema.ts exports are confirmed present.
   - What's unclear: Whether the migration has been applied to the active development database (`bigpanda_test`). STATE.md shows Phase 17 as "In progress (2/3 plans complete)" — plan 17-03 is pending.
   - Recommendation: Verify migration is applied before Wave 1 API routes are tested. If not, apply manually: `psql $DATABASE_URL -f bigpanda-app/db/migrations/0011_v2_schema.sql`.

2. **Seed data for new tables**
   - What we know: All three customer projects (KAISER, AMEX, Merck) exist in the DB. The new tables are empty.
   - What's unclear: Whether Wave 0 tests should include seed data helpers or whether the warning-banner path covers the empty-data case.
   - Recommendation: Wave 0 test stubs should cover both empty-state (warning banner renders) and populated-state (section renders). Seed a minimal test fixture in Wave 0.

3. **skill-context.ts extension vs. new context builder**
   - What we know: `buildSkillContext` currently only queries `getWorkspaceData` (which does not include the new tables). Both skills need the new data.
   - What's unclear: Whether to extend the single `buildSkillContext` function (adding 6 new queries for all skill runs) or create `buildTeamsSkillContext` / `buildArchSkillContext` variants called only when those specific skills run.
   - Recommendation: Create skill-specific context builders (avoid loading `before_state` for every skill invocation). `SkillOrchestrator` can dispatch to the correct builder based on `skillName`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run tests/teams-arch/` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEAMS-01 | Teams tab renders 5 sections | unit | `npx vitest run tests/teams-arch/teams-sections.test.ts` | Wave 0 |
| TEAMS-02 | Business outcomes query returns correct shape | unit | `npx vitest run tests/teams-arch/business-outcomes.test.ts` | Wave 0 |
| TEAMS-04 | E2E workflows with nested steps | unit | `npx vitest run tests/teams-arch/e2e-workflows.test.ts` | Wave 0 |
| TEAMS-07 | Warning banner renders when section empty | unit | `npx vitest run tests/teams-arch/warning-banner.test.ts` | Wave 0 |
| TEAMS-09 | AMEX canonical team order | unit | `npx vitest run tests/teams-arch/team-order.test.ts` | Wave 0 |
| TEAMS-10 | skill-context includes new DB sections | unit | `npx vitest run tests/teams-arch/skill-context-teams.test.ts` | Wave 0 |
| TEAMS-11 | Design tokens present in skill HTML export | unit | `npx vitest run tests/teams-arch/design-tokens.test.ts` | Wave 0 |
| ARCH-01 | Architecture tab two-tab structure | unit | `npx vitest run tests/teams-arch/arch-tabs.test.ts` | Wave 0 |
| ARCH-03 | Pain points rendered from JSONB array | unit | `npx vitest run tests/teams-arch/pain-points.test.ts` | Wave 0 |
| ARCH-08 | Status pill color map complete | unit | `npx vitest run tests/teams-arch/status-pills.test.ts` | Wave 0 |
| ARCH-10 | workflow-diagram skill context includes arch tables | unit | `npx vitest run tests/teams-arch/skill-context-arch.test.ts` | Wave 0 |
| ARCH-11 | Customer-specific rules (Kaiser, Amex, Merck) | unit | `npx vitest run tests/teams-arch/customer-rules.test.ts` | Wave 0 |
| ARCH-12 | Skill HTML export is self-contained (no external URLs) | unit | `npx vitest run tests/teams-arch/skill-html-export.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd bigpanda-app && npx vitest run tests/teams-arch/`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `bigpanda-app/tests/teams-arch/business-outcomes.test.ts` — covers TEAMS-02 API shape
- [ ] `bigpanda-app/tests/teams-arch/e2e-workflows.test.ts` — covers TEAMS-04 nested query
- [ ] `bigpanda-app/tests/teams-arch/teams-sections.test.ts` — covers TEAMS-01 section rendering
- [ ] `bigpanda-app/tests/teams-arch/warning-banner.test.ts` — covers TEAMS-07 empty section
- [ ] `bigpanda-app/tests/teams-arch/team-order.test.ts` — covers TEAMS-09 AMEX ordering
- [ ] `bigpanda-app/tests/teams-arch/skill-context-teams.test.ts` — covers TEAMS-10 context extension
- [ ] `bigpanda-app/tests/teams-arch/design-tokens.test.ts` — covers TEAMS-11 token consistency
- [ ] `bigpanda-app/tests/teams-arch/arch-tabs.test.ts` — covers ARCH-01 two-tab structure
- [ ] `bigpanda-app/tests/teams-arch/pain-points.test.ts` — covers ARCH-03 JSONB pain points
- [ ] `bigpanda-app/tests/teams-arch/status-pills.test.ts` — covers ARCH-08 pill colors
- [ ] `bigpanda-app/tests/teams-arch/skill-context-arch.test.ts` — covers ARCH-10 arch context
- [ ] `bigpanda-app/tests/teams-arch/customer-rules.test.ts` — covers ARCH-11 customer rules
- [ ] `bigpanda-app/tests/teams-arch/skill-html-export.test.ts` — covers ARCH-12 self-contained export

---

## Sources

### Primary (HIGH confidence)

- `bigpanda-app/db/schema.ts` — all 6 Phase 17 table definitions confirmed present with correct column shapes
- `bigpanda-app/db/migrations/0011_v2_schema.sql` — migration SQL with enums, tables, indexes, RLS policies
- `bigpanda-app/components/ActionEditModal.tsx`, `RiskEditModal.tsx` — confirmed optimistic UI pattern (fetch + router.refresh)
- `bigpanda-app/app/api/projects/[projectId]/integrations/route.ts`, `onboarding/route.ts` — confirmed API route pattern with RLS transaction
- `bigpanda-app/lib/skill-context.ts` — confirmed `buildSkillContext` structure; does NOT currently include Phase 17 tables
- `bigpanda-app/lib/skill-orchestrator.ts` — confirmed skill runner pattern; loads `.md` file as system prompt
- `bigpanda-app/skills/team-engagement-map.md`, `workflow-diagram.md` — confirmed existing prompts; both generic AI-inference based
- `bigpanda-app/vitest.config.ts` — confirmed test framework setup

### Secondary (MEDIUM confidence)

- Phase 21 PLAN.md files (21-01 through 21-06) — already exist, confirm API routes planned and wave structure
- `.planning/REQUIREMENTS.md` TEAMS/ARCH section — authoritative requirement source
- `.planning/STATE.md` — Phase 17 status, decision log

### Tertiary (LOW confidence)

- None — all findings are from direct code inspection of the production codebase

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — confirmed by direct code inspection of node_modules and component files
- Architecture: HIGH — confirmed by reading 10+ component files and API routes; patterns are consistent
- Pitfalls: HIGH — derived from confirmed code patterns and requirements; RLS pitfall documented in STATE.md decisions
- Skill extension: HIGH — `buildSkillContext` and `SkillOrchestrator` both read and confirmed; extension path clear

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable codebase; no fast-moving dependencies)
