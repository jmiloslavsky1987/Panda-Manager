# Technology Stack — v6.0 Milestone Additions

**Project:** BigPanda AI Project Management App
**Milestone:** v6.0 — Dashboard, Navigation, Parity, WBS, Team Engagement, Architecture
**Researched:** 2026-04-07
**Confidence:** HIGH

---

## Executive Summary

v6.0 adds **portfolio dashboard**, **collapsible WBS**, **Team Engagement Overview**, and **Architecture diagrams** to an existing mature stack. **NO new major dependencies required.** All new features can be built with the existing stack plus ONE optional enhancement library. Existing libraries are current and React 19-compatible.

**Key findings:**
- Portfolio table: Use existing client-side filter pattern (ActionsTableClient), NO table library needed
- WBS hierarchy: Use `@radix-ui/react-collapsible` (already installed for other components)
- AI auto-classify: Use Vercel AI SDK `Output.object()` with Zod schemas (existing deps)
- Architecture diagrams: Use existing `@xyflow/react` with horizontal layout patterns
- Search/filter: Existing PostgreSQL FTS + client-side filtering patterns are sufficient

---

## Current Stack (Validated — DO NOT CHANGE)

These libraries are mature, current, and correctly integrated. **No changes needed.**

| Library | Current Version | Latest | Status | Purpose |
|---------|----------------|--------|--------|---------|
| `next` | 16.2.0 | 16.2.0 | ✓ Current | App framework |
| `react` | 19.2.4 | 19.2.4 | ✓ Current | UI framework |
| `@xyflow/react` | 12.10.2 | 12.10.2 | ✓ Current | Flow diagrams (org charts, workflows) |
| `recharts` | 3.8.1 | 3.8.1 | ✓ Current | Charts (bar, pie, progress) |
| `ai` (Vercel AI SDK) | 6.0.142 | 6.0.151 | ✓ Patch behind (safe) | Streaming chat, structured output |
| `@ai-sdk/anthropic` | 3.0.64 | 3.0.67 | ✓ Patch behind (safe) | Claude integration |
| `@anthropic-ai/sdk` | 0.80.0 | — | ✓ Current | Direct Claude API (extraction workers) |
| `drizzle-orm` | 0.45.1 | 0.45.2 | ✓ Patch behind (safe) | PostgreSQL ORM |
| `bullmq` | 5.71.0 | 5.73.0 | ✓ Patch behind (safe) | Background jobs (extraction, skills) |
| `lucide-react` | 0.577.0 | 1.7.0 | ⚠️ Major behind (works) | Icons — upgrade optional |
| `@dnd-kit/core` | 6.3.1 | 6.3.1 | ✓ Current | Drag-and-drop (Gantt, task boards) |
| `zod` | 4.3.6 | 4.3.6 | ✓ Current | Schema validation |
| `better-auth` | 1.5.6 | — | ✓ Current | Multi-user sessions |
| `sonner` | 2.0.7 | 2.0.7 | ✓ Current | Toast notifications |
| `mammoth` | 1.12.0 | 1.12.0 | ✓ Current | DOCX parsing |

**React 19 Compatibility:** All peer dependencies verified compatible with React 19.2.4.

---

## NEW Dependencies for v6.0

### REQUIRED: None

All v6.0 features can be built with existing stack.

### RECOMMENDED: 1 Library

| Library | Version | Purpose | Why Add | Installation |
|---------|---------|---------|---------|--------------|
| `@radix-ui/react-collapsible` | 1.1.12 | WBS collapsible tree UI | Native accessibility, animation hooks, controlled/uncontrolled modes | `npm install @radix-ui/react-collapsible` |

**Rationale:** App already uses 7 Radix UI primitives (checkbox, dialog, popover, select, separator, slot, tabs, tooltip). Adding Collapsible maintains consistency and avoids custom collapse state management. Zero SSR issues, WAI-ARIA compliant, CSS variable animation support.

**Alternative considered:** Build custom collapse with `useState` + CSS transitions → Rejected because Radix provides keyboard nav + screen reader support for free.

---

## Optional: Consider Later (NOT v6.0)

| Library | Purpose | When to Add | Why Not Now |
|---------|---------|-------------|-------------|
| `@tanstack/react-table` v8.21.3 | Advanced table state management | If portfolio table needs virtual scrolling (500+ projects) or server-side pagination | Current pattern (client-side filter) works for 10–50 projects; TanStack adds 200KB bundle size |
| `date-fns` | Date manipulation utilities | If WBS timeline calculations become complex | Native `Date` API + existing GanttChart date helpers are sufficient |
| `cmdk` | Command palette | If global search needs keyboard-first UI | Current search bar + filter inputs are sufficient |

---

## v6.0 Feature Breakdown — What Uses What

### 1. Portfolio Dashboard (DASH-01–06)

**Multi-project table with filtering, sort, search:**

- **Pattern:** Client-side filter (same as ActionsTableClient, RisksTableClient, MilestonesTableClient)
- **Libraries:** NONE new
- **Implementation:**
  - Server Component fetches all projects from PostgreSQL
  - Client Component (`PortfolioTableClient.tsx`) filters/sorts in-memory using URL params
  - Existing `Table`, `Checkbox` (Radix), `lucide-react` icons

**Health summary + exceptions panel:**

- **Charts:** Existing `recharts` (PieChart, ProgressRing patterns from Overview tab)
- **Layout:** Tailwind CSS grid (same as Overview HealthDashboard component)

**Search:**

- **Existing:** PostgreSQL FTS API (`/api/search`) supports `projectId` filter → extend to cross-project query
- **No new library needed**

**Confidence:** HIGH — all patterns exist in v5.0 codebase.

---

### 2. Work Breakdown Structure (WBS-01–05)

**Collapsible 3-level tree (ADR + Biggy templates):**

- **Library:** `@radix-ui/react-collapsible` (NEW — recommended add)
- **Pattern:**
  ```tsx
  <Collapsible.Root open={open} onOpenChange={setOpen}>
    <Collapsible.Trigger>Phase Node</Collapsible.Trigger>
    <Collapsible.Content>
      {/* Sub-nodes */}
    </Collapsible.Content>
  </Collapsible.Root>
  ```
- **State:** Nested `Map<nodeId, boolean>` for open/closed state
- **Styling:** CSS variables `--radix-collapsible-content-height` for smooth expand/collapse

**AI auto-classify tasks to WBS nodes:**

- **Library:** Existing Vercel AI SDK `ai` package
- **Function:** `generateObject()` with Zod schema
- **Pattern:**
  ```typescript
  import { generateObject } from 'ai';
  import { anthropic } from '@ai-sdk/anthropic';
  import { z } from 'zod';

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: z.object({
      taskId: z.number(),
      wbsNodeId: z.string(),
      confidence: z.number(),
      reasoning: z.string(),
    }),
    prompt: `Given WBS template: ${wbsStructure}\n\nClassify task: ${taskTitle}`,
  });
  ```
- **Source:** [Vercel AI SDK Structured Output Docs](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- **Verification:** HIGH confidence — `Output.object()` and `Output.array()` are core SDK features, Zod already installed

**Generate Plan gap-fill button:**

- **Library:** Same as auto-classify — Vercel AI SDK `generateObject()` with array schema
- **Schema:** `z.array(z.object({ nodeId, suggestedTasks: z.array(...) }))`
- **Background job:** BullMQ worker (same pattern as extraction job in v4.0 Phase 31)

**Manual edit:**

- **Libraries:** Existing inline edit components (InlineSelectCell, OwnerCell, DatePickerCell from v5.0)

**Confidence:** HIGH — Radix Collapsible API verified, Vercel AI SDK structured output verified, BullMQ pattern exists.

---

### 3. Team Engagement Overview (TEAM-01–04)

**5-section structured report view:**

- **Libraries:** NONE new
- **Pattern:** Same as existing TeamEngagementMap component (v3.0 Phase 30)
  - 5 sections: BusinessOutcomesSection, ArchOverviewSection, E2eWorkflowsSection, TeamsEngagementSection, FocusAreasSection
  - Each section renders from DB tables: `business_outcomes`, `architecture_integrations`, `e2e_workflows`, `focus_areas`
  - Manual edit: inline forms (existing patterns)

**Context-upload extraction (Team Engagement entities):**

- **Library:** Existing extraction system (v5.0 Phase 42 — full field coverage)
- **Extension:** Add Team Engagement entity types to `extraction-types.ts`
  - Already supports: `businessOutcome`, `team` (focus_areas), `architecture`
  - NEW types needed: `e2e_workflow`, `workflow_step` (if not already covered)
- **Worker:** Existing BullMQ extraction worker (`worker/jobs/extraction-job.ts`)
- **Dedup:** Existing `isAlreadyIngested()` logic in `extraction-types.ts`

**Missing-data warnings:**

- **Library:** Existing completeness system (`lib/completeness-context-builder.ts`)
- **Pattern:** Call `/api/completeness` → Claude analyzes gaps → display warnings
- **UI:** Same as Context Hub completeness analysis (v3.0 Phase 30 CTX-04)

**Confidence:** HIGH — all patterns exist, only need entity type extensions (no new libraries).

---

### 4. Architecture Tab Update (ARCH-01–04)

**Before State + Current & Future State two-tab diagram:**

- **Library:** Existing `@xyflow/react` (v12.10.2) with `dynamic(() => import(), { ssr: false })`
- **Pattern:** Same as InteractiveEngagementGraph component
  - Two React Flow instances (one per tab)
  - Horizontal layout (not Dagre auto-layout) — manual positioning with `position: { x, y }`
  - ADR Track + AI Track as separate node groups

**Phase flows with status nodes:**

- **Nodes:** Custom node types (same pattern as org chart TeamNode, StakeholderNode)
- **Edges:** Straight edges with arrows (`type: 'straight'`)
- **Status:** Color-coded based on `onboarding_steps.status` enum

**Team Onboarding Status table:**

- **Library:** NONE new
- **Pattern:** Standard table (same as ActionsTableClient inline edit pattern)
- **Data source:** `team_onboarding_status` table (already exists in DB schema v2.0)

**Context-upload extraction (Architecture entities):**

- **Library:** Existing extraction system
- **Already supported:** `architecture` entity type exists in `extraction-types.ts` (line 226–246)
  - Matches on `tool_name` + `track` combination
  - Maps to `architecture_integrations` table
- **Extension:** Add `onboarding_step` entity type if not present
  - NEW: Matches on `step_name` (lines 256–262 already exist in extraction-types.ts)

**Confidence:** HIGH — React Flow patterns exist, extraction entity types already implemented in v5.0.

---

### 5. Context Upload Expansion (Existing Feature)

**NO changes needed to libraries.** Extraction system (v5.0 Phase 42) already supports:
- All Team Engagement entity types: `businessOutcome`, `team`, `architecture`, `e2e_workflow`
- All Architecture entity types: `architecture`, `onboarding_step`

Extension work is **entity routing logic only** (no new dependencies).

---

## Library Verification (Context7 + Official Docs)

| Library | Verified With | Confidence | Notes |
|---------|---------------|------------|-------|
| `@radix-ui/react-collapsible` | [Official Radix Docs](https://www.radix-ui.com/primitives/docs/components/collapsible) + npm registry | HIGH | v1.1.12 current, API stable, WAI-ARIA compliant |
| Vercel AI SDK structured output | [Official AI SDK Docs](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) | HIGH | `Output.object()` and `Output.array()` confirmed, Zod schema support verified |
| `@xyflow/react` | npm registry + package peer deps | HIGH | v12.10.2 current (published 11 days ago), React 19 compatible, no breaking changes in 12.x |
| `recharts` | npm registry | HIGH | v3.8.1 current, React 19 peer dep explicit (`^19.0.0`), works with existing Overview charts |
| `lucide-react` | npm registry | MEDIUM | v0.577.0 → v1.7.0 major version available, but v0.577 works fine with React 19 |
| `@tanstack/react-table` | npm registry | HIGH | v8.21.3 current, React 19 compatible (`>=16.8` peer dep), NOT needed for v6.0 |

---

## Alternatives Considered & Rejected

### TanStack Table v8 for Portfolio Table

**Why considered:** Powerful filtering, sorting, column management, virtual scrolling.

**Why rejected:**
- Portfolio table scope: 10–50 projects (small dataset)
- Client-side filter pattern works (already used in 6 table clients)
- TanStack adds ~200KB bundle size
- Existing pattern is consistent (ActionsTableClient, RisksTableClient, MilestonesTableClient, DecisionsTableClient all use same approach)
- **If needed later:** Easy to migrate (data fetching stays same, swap client component)

**Verdict:** Defer until 500+ projects or server-side pagination requirement emerges.

---

### react-arborist for WBS Tree

**Why considered:** Specialized tree component with virtualization, drag-drop, bulk operations.

**Why rejected:**
- 3-level depth is shallow (no virtualization needed)
- WBS is read-mostly (not drag-drop heavy)
- Radix Collapsible is simpler (100 LOC vs 2000+ LOC for react-arborist)
- App already uses Radix UI primitives (consistency)

**Verdict:** Radix Collapsible is correct for this use case.

---

### react-flow-renderer (Old Package)

**Why considered:** None — user already has `@xyflow/react` (rebranded modern version).

**Context:** `react-flow-renderer` was renamed to `@xyflow/react` in v12. App is already on correct package.

---

### AG Grid for Advanced Tables

**Why considered:** Enterprise-grade table with server-side ops, Excel export.

**Why rejected:**
- Overkill for v6.0 scope
- Commercial license required for advanced features
- Portfolio table doesn't need pivot tables or aggregation

**Verdict:** Not appropriate.

---

## Installation Commands

### Required for v6.0

```bash
# WBS collapsible tree
npm install @radix-ui/react-collapsible
```

### Optional — Upgrade Existing (SAFE)

```bash
# Patch updates (breaking changes unlikely)
npm install ai@latest @ai-sdk/anthropic@latest drizzle-orm@latest bullmq@latest

# Icon library upgrade (major version, test before applying)
npm install lucide-react@latest  # v0.577 → v1.7.0
```

**Recommendation:** Defer optional upgrades until v6.0 feature work completes (reduce variables).

---

## Integration Points

### 1. Portfolio Dashboard → Existing Search API

**File:** `app/api/search/route.ts`

**Change needed:** Extend `searchAllRecords()` to accept `projectId: undefined` → cross-project search.

**Libraries:** NONE (PostgreSQL FTS already exists).

---

### 2. WBS AI Auto-Classify → BullMQ Worker

**Pattern:** Same as extraction job (v4.0 Phase 31 EXTR-02)

**File to create:** `worker/jobs/wbs-classify-job.ts`

**Libraries used:**
- `ai` (Vercel AI SDK) — `generateObject()` with Zod schema
- `bullmq` — job registration
- `drizzle-orm` — DB writes

**Integration:** Register in `worker/index.ts` alongside `extraction-job` and `skills-job`.

---

### 3. Team Engagement Extraction → Existing Extraction Job

**File:** `lib/extraction-types.ts`

**Change needed:** Verify all entity types present:
- ✓ `businessOutcome` (line 195)
- ✓ `team` (maps to `focus_areas`, line 210)
- ✓ `architecture` (line 226)
- ✓ `onboarding_step` (line 256)
- ⚠️ `e2e_workflow` — VERIFY if exists (not in provided excerpt)

**If missing:** Add entity type + dedup logic to `isAlreadyIngested()`.

**Libraries:** NONE (extension of existing extraction system).

---

### 4. Architecture Diagrams → React Flow Dynamic Import

**Pattern:** Same as `components/teams/TeamEngagementMap.tsx` (lines 14–24)

**SSR handling:**
```typescript
const ArchitectureDiagram = dynamic(
  () => import('./ArchitectureDiagram').then((m) => ({ default: m.ArchitectureDiagram })),
  {
    ssr: false,
    loading: () => <div className="h-96 border rounded-lg flex items-center justify-center text-zinc-400 text-sm">Loading diagram...</div>,
  },
);
```

**Libraries:** Existing `@xyflow/react` + `next/dynamic`.

---

## What NOT to Add

| Library | Why NOT |
|---------|---------|
| `react-table` (v7) | Deprecated — v8 is `@tanstack/react-table` |
| `react-virtualized` | Heavy, not needed for v6.0 dataset sizes |
| `ag-grid-react` | Commercial license, overkill |
| `react-beautiful-dnd` | Archived — app uses `@dnd-kit` |
| `d3` | Recharts already wraps D3 for simple charts |
| `uuid` | Node.js `crypto.randomUUID()` is sufficient |
| `moment.js` | Heavy, deprecated — native `Date` API sufficient |
| `lodash` | Tree-shaking overhead — prefer native JS |
| `axios` | Native `fetch` API is correct for Next.js App Router |

**Principle:** Add libraries only when existing patterns fail. v6.0 scope fits within current stack.

---

## Version Pinning Strategy

**Current approach:** Caret ranges (`^`) for most deps (allows patch/minor updates).

**Recommendation for v6.0:** Keep existing strategy.

- **Lock major versions:** `next@16.x`, `react@19.x`, `@xyflow/react@12.x`
- **Allow patches:** `ai`, `bullmq`, `drizzle-orm` (frequent bug fixes)
- **Test before major upgrades:** `lucide-react` v1.x, `recharts` v4.x (when available)

**Why:** App is mature (42,385 LOC), large dependency surface. Pin major versions, validate minors in non-critical milestones.

---

## Summary Table — What v6.0 Needs

| Feature | NEW Library? | Existing Library | Integration Work |
|---------|--------------|------------------|------------------|
| Portfolio dashboard table | ❌ NO | Client-side filter pattern | LOW — copy ActionsTableClient pattern |
| Portfolio health summary | ❌ NO | `recharts` | LOW — reuse HealthDashboard component |
| Portfolio exceptions panel | ❌ NO | PostgreSQL FTS + Tailwind | LOW — query open risks/overdue actions |
| WBS collapsible tree | ✅ YES | `@radix-ui/react-collapsible` | MEDIUM — nested collapse state management |
| WBS AI auto-classify | ❌ NO | Vercel AI SDK `generateObject()` | MEDIUM — BullMQ job + Zod schema |
| WBS Generate Plan | ❌ NO | Vercel AI SDK `generateObject()` | MEDIUM — same as auto-classify (array output) |
| Team Engagement report | ❌ NO | Existing components | LOW — extend entity types |
| Team Engagement extraction | ❌ NO | Existing extraction job | LOW — verify entity types in `extraction-types.ts` |
| Architecture diagrams | ❌ NO | `@xyflow/react` | MEDIUM — horizontal layout + custom nodes |
| Architecture extraction | ❌ NO | Existing extraction job | LOW — entity types already exist |

**Total new dependencies:** 1 (`@radix-ui/react-collapsible`)

**Bundle size impact:** +12KB gzipped (Radix Collapsible is lightweight).

---

## Confidence Assessment

| Area | Level | Reasoning |
|------|-------|-----------|
| Portfolio table | HIGH | Pattern exists 6× in codebase (ActionsTableClient, RisksTableClient, etc.) |
| WBS collapsible | HIGH | Radix Collapsible API verified via official docs, compatible with app's existing Radix usage |
| AI auto-classify | HIGH | Vercel AI SDK structured output verified via official docs, Zod already installed |
| Team Engagement | HIGH | Components exist in v3.0 Phase 30, entity types in extraction system v5.0 |
| Architecture diagrams | HIGH | React Flow patterns exist (InteractiveEngagementGraph), horizontal layout is standard |
| Version compatibility | HIGH | All peer dependencies verified compatible with React 19.2.4 |
| No TanStack Table | MEDIUM | Defer decision is safe, but may need in v7.0 if project count exceeds 100 |

**Overall confidence:** HIGH — v6.0 stack is well-supported by existing dependencies.

---

## Sources

- **Radix Collapsible:** [Official Docs](https://www.radix-ui.com/primitives/docs/components/collapsible), npm registry v1.1.12
- **Vercel AI SDK Structured Output:** [Official Docs](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- **@xyflow/react:** [npm registry](https://www.npmjs.com/package/@xyflow/react) v12.10.2, [React Flow site](https://reactflow.dev)
- **Recharts:** [npm registry](https://www.npmjs.com/package/recharts) v3.8.1, React 19 peer dep verified
- **TanStack Table:** [npm registry](https://www.npmjs.com/package/@tanstack/react-table) v8.21.3, [Official Docs](https://tanstack.com/table/latest/docs/introduction)
- **lucide-react:** [npm registry](https://www.npmjs.com/package/lucide-react) v1.7.0, [Lucide site](https://lucide.dev)
- **sonner:** [npm registry](https://www.npmjs.com/package/sonner) v2.0.7

All versions verified via `npm view [package] version peerDependencies` on 2026-04-07.
