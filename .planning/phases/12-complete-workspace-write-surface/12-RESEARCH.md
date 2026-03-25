# Phase 12: Complete Workspace Write Surface — Research

**Researched:** 2026-03-25
**Domain:** Next.js 15 RSC write surface — shadcn Dialog modals, Drizzle ORM PATCH/POST routes, inline HTML range slider, tab navigation extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Architecture Inline Edit**
- Trigger: Edit button (top-right of each workstream card) opens a shadcn Dialog modal — same pattern as ActionEditModal/RiskEditModal
- Fields exposed: `state` (multi-line textarea, preserves whitespace-pre-wrap behavior) + `lead` (text input) only
- On save: Auto-set `last_updated` to today's date; router.refresh() after successful save
- API route: PATCH `/api/workstreams/[id]` — new route needed

**Decisions "Add Decision" Modal**
- Trigger: "Add Decision" button next to the page heading (top-right of the header row)
- Fields exposed: `decision` (required textarea) + `context` (optional textarea) only
- Auto-set on save: `date` = today's date; `source` = 'manual_entry'
- After save: router.refresh() — decision appears at top of chronological list (sorted newest-first)
- API route: POST `/api/decisions` — new route needed

**Artifacts Tab**
- Nav position: 13th tab, after Time — minimal disruption to existing tab order
- Route: `/customer/[id]/artifacts`
- Layout: Table (like Actions/Risks/Milestones) — columns: ID (X-NNN), Name, Status, Owner; click row opens edit modal
- Create modal fields: `name` (required), `status`, `owner`; `external_id` auto-assigned by API (next sequential X-NNN for the project); `description` optional
- Create + Edit: same modal component (ArtifactEditModal), mode determined by whether an artifact record is passed
- "New Artifact" button: next to heading, top-right — consistent with other tabs
- API routes: GET `/api/artifacts?projectId=X` + POST `/api/artifacts` + PATCH `/api/artifacts/[id]`

**Teams percent_complete Edit**
- Interaction: Inline HTML range slider (0–100) in the Teams tab table — new "Progress" column added to WorkstreamTable
- Save trigger: A small "Save" button appears when the slider value changes; user clicks Save to commit
- After save: router.refresh() — health score will reflect updated value on next Dashboard visit
- Override behavior: Manual edit writes directly to `workstreams.percent_complete`; no lock flag needed
- API route: PATCH `/api/workstreams/[id]` (same route as Architecture edit, different fields)

**Optimistic UI / Error Handling**
- All write operations follow Phase 3 convention: optimistic "Saving…" state, error toast on failure, router.refresh() on success
- No new conventions needed — extend existing patterns

**Placeholder Banner Cleanup**
- Remove amber "available in Phase 3" banner from Decisions tab
- Remove blue "Inline editing available in Phase 3" banner from Architecture tab
- Any other similar banners across tabs should be removed

### Claude's Discretion

None specified in context.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 12 adds write surfaces to four read-only workspace tabs that were deferred in Phase 2 with "available in Phase 3" placeholder banners. The work is purely additive: no new DB tables, no schema migrations, no new dependencies. Every pattern needed — shadcn Dialog modal, Zod-validated PATCH/POST route, `router.refresh()` after mutation, optimistic "Saving…" state — is already established and working in the codebase from Phases 2, 3, and 5.1.

The largest single deliverable is the Artifacts tab: a full new route (`/customer/[id]/artifacts`), a new page component, a dual-mode modal (ArtifactEditModal), and three API routes (GET/POST/PATCH). The other three write surfaces (Decisions modal, Architecture inline edit, Teams slider) each require one new API route and one new client component — all following the same established pattern.

The teams percent_complete slider is slightly different from the modal pattern in that it is fully inline (no Dialog), using React state within a client component wrapper around the existing WorkstreamTable rows. The WorkstreamTable component currently lives as a local function in `teams/page.tsx` (a server component); the teams page will need to be partially converted — keep RSC data fetch at the page level, extract a `'use client'` child component for the interactive table rows.

**Primary recommendation:** Treat ArtifactEditModal as the "heavy lift" of Wave 1; treat Decisions/Architecture modals as near-copy of StakeholderEditModal; treat Teams slider as the pattern-bending piece requiring a client component extraction.

---

## Standard Stack

### Core (all already installed — no new packages required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 15 (App Router) | already in use | RSC pages + API routes | established project stack |
| shadcn/ui Dialog | already in use | Modal pattern for all edit UIs | matches ActionEditModal/RiskEditModal reference implementation |
| Drizzle ORM | already in use | DB reads/writes | all existing routes use this |
| Zod | already in use | Request body validation in API routes | already used in risks/[id], stakeholders, tasks routes |
| React (`useState`, `useRouter`) | already in use | Client component state + RSC re-fetch trigger | established pattern |

### No new dependencies

All patterns are covered by the existing stack. The Teams slider uses a native `<input type="range">` — no slider library needed.

---

## Architecture Patterns

### Recommended File Structure for Phase 12

```
bigpanda-app/
├── app/
│   ├── api/
│   │   ├── artifacts/
│   │   │   ├── route.ts            ← NEW: GET ?projectId=X, POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts        ← NEW: PATCH (edit)
│   │   ├── decisions/
│   │   │   └── route.ts            ← NEW: POST (append-only)
│   │   └── workstreams/
│   │       └── [id]/
│   │           └── route.ts        ← NEW: PATCH (state+lead OR percent_complete)
│   └── customer/[id]/
│       └── artifacts/
│           └── page.tsx            ← NEW: 13th tab page (RSC)
├── components/
│   └── ArtifactEditModal.tsx       ← NEW: dual-mode create/edit
```

**Modified files:**
- `components/WorkspaceTabs.tsx` — add 13th tab entry
- `app/customer/[id]/decisions/page.tsx` — add modal + remove banner
- `app/customer/[id]/architecture/page.tsx` — add modal + remove banner
- `app/customer/[id]/teams/page.tsx` — add inline slider + convert WorkstreamTable to client component

### Pattern 1: shadcn Dialog Modal (reference: ActionEditModal)

**What:** Client component wrapping a shadcn Dialog. Receives optional record prop (undefined = create, defined = edit). Manages `saving`, `error`, `open` state. On submit: calls fetch PATCH or POST, calls `router.refresh()` on success, shows error inline in modal on failure.

**When to use:** Architecture edit modal, Decisions "Add Decision" modal, ArtifactEditModal — all three follow this exact pattern.

**Key implementation details from live code:**
```typescript
// Source: bigpanda-app/components/ActionEditModal.tsx (verified)
'use client'
const router = useRouter()
const [saving, setSaving] = useState(false)
const [error, setError] = useState<string | null>(null)

// On success:
setOpen(false)
router.refresh()

// On failure:
setError(data.error ?? 'Save failed')
setSaving(false)

// Error display:
{error && <p data-testid="error-toast" className="text-red-600 text-sm">{error}</p>}

// Saving state:
{saving && <p data-testid="saving-indicator" className="text-sm text-zinc-500 self-center mr-auto">Saving...</p>}
<Button type="submit" disabled={saving}>Save</Button>
```

**Dual-mode modal (create + edit same component) — reference: StakeholderEditModal:**
```typescript
// Source: bigpanda-app/components/StakeholderEditModal.tsx (verified)
interface ArtifactEditModalProps {
  artifact?: Artifact    // undefined = create mode, defined = edit mode
  projectId: number
  trigger: React.ReactNode
}
const isEdit = artifact !== undefined
// fetch to POST /api/artifacts OR PATCH /api/artifacts/${artifact.id}
```

### Pattern 2: API Route (PATCH with Zod validation)

**What:** Next.js 15 App Router route handler. Uses `params: Promise<{ id: string }>` (must await). Validates body with `zod.safeParse()` or `zod.parse()`. Returns `Response.json({ ok: true })` on success, `Response.json({ error: message }, { status: N })` on failure.

**Key implementation detail:** Use `@/db` import alias (not relative paths). Matches existing pattern in `app/api/risks/[id]/route.ts`.

```typescript
// Source: bigpanda-app/app/api/risks/[id]/route.ts (verified)
import { db } from '@/db'
import { risks } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = parseInt(id, 10)
  // ...
  const today = new Date().toISOString().split('T')[0]
  await db.update(table).set({ ...patch, last_updated: today }).where(eq(table.id, numericId))
  return NextResponse.json({ ok: true })
}
```

### Pattern 3: Append-Only POST (reference: notes/route.ts)

**What:** POST route that inserts a new row. No GET on same route file needed for decisions (data comes from `getWorkspaceData()`). Set `source: 'manual_entry'` and `date: today`.

```typescript
// Source: bigpanda-app/app/api/notes/route.ts (verified — same table pattern)
await db.insert(keyDecisions).values({
  project_id: projectId,
  decision: decision.trim(),
  context: context?.trim() ?? null,
  source: 'manual_entry',
  date: new Date().toISOString().split('T')[0],
})
return NextResponse.json({ ok: true })
```

**Important:** `key_decisions` has a DB trigger (`enforce_append_only`) that prevents UPDATE and DELETE. The POST route must only INSERT — never attempt UPDATE.

### Pattern 4: Inline Range Slider (Teams tab — client component extraction)

**What:** Teams `page.tsx` is currently a pure RSC with `WorkstreamTable` as a local function component. To support interactive sliders, the interactive rows need to be a `'use client'` component. The correct split: keep `page.tsx` as RSC (fetches data), pass workstream rows to a new `WorkstreamTableClient` component.

**When to use:** When RSC data fetch is needed at page level but interactive state is needed per-row.

```typescript
// Pattern: RSC page delegates to client child
// page.tsx (RSC — keep as-is for data fetch)
import { WorkstreamTableClient } from './WorkstreamTableClient'
const data = await getWorkspaceData(...)
return <WorkstreamTableClient streams={adrStreams} projectId={id} ... />

// WorkstreamTableClient.tsx ('use client')
const [pendingPct, setPendingPct] = useState<Record<number, number>>({})
const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set())
// Show "Save" button only when dirtyIds.has(ws.id)
```

### Pattern 5: X-NNN external_id Auto-Assignment

**What:** Artifacts API POST route must generate the next sequential `X-NNN` for the project (e.g., X-001, X-002). No utility function exists yet — the route must query the current max and increment.

```typescript
// Pattern to implement in POST /api/artifacts:
const existing = await db
  .select({ external_id: artifacts.external_id })
  .from(artifacts)
  .where(eq(artifacts.project_id, projectId))
  .orderBy(desc(artifacts.external_id))

// Parse last number, generate next X-NNN:
const nums = existing.map(r => parseInt(r.external_id.replace('X-', ''), 10)).filter(n => !isNaN(n))
const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
const external_id = `X-${String(next).padStart(3, '0')}`
```

**Note from schema:** The `external_id` column in existing data uses format `X-KAISER-001` (project-scoped prefix from YAML migration). For new manually-created artifacts the CONTEXT.md specifies `X-NNN` format without project prefix. The API should use sequential `X-NNN` (project-agnostic, project is implicit via `project_id`). Verify against seed data when DB is seeded.

### Anti-Patterns to Avoid

- **Making WorkstreamTable fully client-side:** Only the interactive row portions need to be client components. Keep data fetching in the RSC page.
- **Calling `updateWorkstreamProgress()` from the manual percent_complete route:** This function recalculates from tasks. The manual edit writes directly to `workstreams.percent_complete` — the two paths are independent. Do NOT call `updateWorkstreamProgress()` from the PATCH route.
- **Using relative import paths in API routes:** All API routes must use `@/db` and `@/db/schema` (tsconfig path: `"@/*": ["./*"]`) — not `../../../../db`. This is an established project constraint.
- **Attempting to UPDATE key_decisions:** The DB trigger prevents it. Any attempt will throw at the DB layer. POST/INSERT only.
- **Adding a `data-testid` to `DialogTrigger asChild` directly:** The testid belongs on the inner child element, not the trigger wrapper (see `data-testid="action-row"` on the `<span>` inside DialogTrigger in ActionEditModal).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal state management | Custom modal context / portal | shadcn Dialog + local `useState(false)` | Already established; Dialog handles focus trap, a11y, ESC key |
| Form validation | Custom validators | Zod schema on API route | All existing write routes use Zod; consistent error shape |
| Append-only enforcement | Application-level guard | DB trigger `enforce_append_only` already in place | Trust the DB layer; don't add redundant UI enforcement |
| Date generation | Moment/date-fns | `new Date().toISOString().split('T')[0]` | Established project convention; seen in all PATCH routes |
| Slider UI | Third-party slider component | Native `<input type="range" min={0} max={100}>` | Zero dependency cost; CONTEXT.md explicitly specifies HTML range slider |

**Key insight:** This phase is pure extension of existing patterns. Every pattern has a live working example in the codebase. Research, not invention, is the mode.

---

## Common Pitfalls

### Pitfall 1: Teams Page RSC-to-Client Conversion Scope Creep

**What goes wrong:** Developer converts the entire `teams/page.tsx` to a client component to add slider interactivity, losing RSC data fetch benefits and breaking the established page architecture.

**Why it happens:** The `WorkstreamTable` function is currently co-located in `teams/page.tsx`. It's tempting to just add `'use client'` to the top.

**How to avoid:** Keep `page.tsx` as RSC. Extract only the interactive table portion to a `WorkstreamTableClient` (or `TeamsTabClient`) component that receives pre-fetched workstream data as props. Page remains RSC, interactive rows become client.

**Warning signs:** If `teams/page.tsx` gains `'use client'` at the top, the page can no longer do async data fetches directly.

### Pitfall 2: key_decisions DB Trigger Conflict

**What goes wrong:** POST `/api/decisions` succeeds, but if a developer accidentally tries to UPDATE a decision (e.g., during debugging or if schema drift occurs), the DB trigger fires and throws an obscure error.

**Why it happens:** The `enforce_append_only` trigger prevents any UPDATE or DELETE on `key_decisions`. This is a DB-level constraint from Phase 1.

**How to avoid:** The decisions POST route must only INSERT. Never expose any edit/patch interface for decisions (confirmed by CONTEXT.md — no edit, only append).

**Warning signs:** `ERROR: 42501` or `permission denied` on key_decisions UPDATE is the DB trigger firing.

### Pitfall 3: External ID Format Inconsistency for Artifacts

**What goes wrong:** Artifacts created via migration have IDs like `X-KAISER-001` (project-prefixed). New manually-created artifacts get `X-001`. Code that sorts or displays both together produces inconsistent ordering or display.

**Why it happens:** The migration script follows YAML schema format; the CONTEXT.md specifies `X-NNN` for new artifacts. Both exist in the same table.

**How to avoid:** The ArtifactEditModal and artifacts page should display `external_id` as-is (it's already the correct display value). The sequential ID generation in POST `/api/artifacts` only needs to consider `X-NNN` format numerics — skip rows with non-numeric suffixes when computing next ID.

### Pitfall 4: workstreams PATCH Route Field Collision

**What goes wrong:** The PATCH `/api/workstreams/[id]` route is shared by Architecture edit (`state` + `lead`) and Teams slider (`percent_complete`). If the Zod schema makes all fields optional and doesn't validate which fields are present, an empty body succeeds silently.

**Why it happens:** Developer makes all fields optional for flexibility.

**How to avoid:** Use `.refine()` or separate Zod schemas with `.union()` to require at least one valid field group. Alternatively, rely on the `undefined` handling in the update — only fields explicitly passed in the request body get updated. This is the same approach used in the risks PATCH route.

### Pitfall 5: `router.refresh()` in RSC-Rendered Client Components

**What goes wrong:** Client components that use `router.refresh()` trigger a full re-render of the RSC subtree. If the parent page has a loading state or animation, it may flash briefly.

**Why it happens:** `router.refresh()` is the correct pattern for RSC data re-fetch, but it re-runs the server component.

**How to avoid:** This is expected and acceptable behavior per CONTEXT.md (Phase 3 convention). No workaround needed — the project explicitly uses this pattern.

---

## Code Examples

### Workstreams PATCH Route (single route, two field groups)

```typescript
// Source: pattern derived from bigpanda-app/app/api/risks/[id]/route.ts (verified)
// File: bigpanda-app/app/api/workstreams/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { workstreams } from '@/db/schema'
import { eq } from 'drizzle-orm'

const patchSchema = z.object({
  state: z.string().optional(),
  lead: z.string().optional(),
  percent_complete: z.number().int().min(0).max(100).optional(),
}).refine(
  (d) => d.state !== undefined || d.lead !== undefined || d.percent_complete !== undefined,
  { message: 'At least one field required' }
)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { state, lead, percent_complete } = parsed.data
  const today = new Date().toISOString().split('T')[0]

  const patch: Record<string, unknown> = { last_updated: today }
  if (state !== undefined) patch.state = state
  if (lead !== undefined) patch.lead = lead
  if (percent_complete !== undefined) patch.percent_complete = percent_complete

  const result = await db.update(workstreams).set(patch).where(eq(workstreams.id, numericId)).returning({ id: workstreams.id })
  if (result.length === 0) return NextResponse.json({ error: 'Workstream not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
```

### Decisions POST Route (append-only)

```typescript
// Source: pattern from bigpanda-app/app/api/notes/route.ts (verified — same append-only pattern)
// File: bigpanda-app/app/api/decisions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { keyDecisions } from '@/db/schema'

const postSchema = z.object({
  project_id: z.number().int().positive(),
  decision: z.string().min(1, 'Decision text is required'),
  context: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const parsed = postSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { project_id, decision, context } = parsed.data
  const today = new Date().toISOString().split('T')[0]

  await db.insert(keyDecisions).values({
    project_id,
    decision: decision.trim(),
    context: context?.trim() ?? null,
    source: 'manual_entry',
    date: today,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

### WorkspaceTabs.tsx — Add 13th Tab

```typescript
// Source: bigpanda-app/components/WorkspaceTabs.tsx (verified — line 19)
// Add after the Time entry:
{ label: 'Artifacts', segment: 'artifacts' },    // 13th tab
```

### Architecture page — Remove banner, add edit button

```typescript
// Source: bigpanda-app/app/customer/[id]/architecture/page.tsx (verified)
// Remove: the <div className="rounded-md border border-blue-200 ..."> block entirely
// Add: import ArchitectureEditModal, wrap each card with an Edit button trigger
```

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 12 |
|--------------|------------------|---------------------|
| Page-level RSC with no interactivity (Phase 2) | RSC page + 'use client' child for interactive rows (Phase 3 pattern) | Teams tab needs this split |
| Static read-only tab pages | Modal write surface on each tab | Standard approach proven in Phases 3, 5.1 |
| Placeholder banners ("available in Phase 3") | Real write UI | Banner removal is a required cleanup step |

**Deprecated/outdated:**
- Phase 2 read-only WorkstreamTable in teams/page.tsx: will be replaced by a client component wrapper with slider + save button

---

## Open Questions

1. **Artifacts external_id format for new rows**
   - What we know: Migrated artifacts use `X-KAISER-001` (project-prefixed). CONTEXT.md specifies `X-NNN` for API-created artifacts.
   - What's unclear: Whether having mixed formats in the same table causes display or sort issues.
   - Recommendation: Display `external_id` as-is in the table (no normalization). For POST route, skip non-`X-NNN` rows when computing next sequential number. Document this in the plan.

2. **WorkstreamTable is a local function — not an exported component**
   - What we know: `WorkstreamTable` is defined inline inside `teams/page.tsx` as a plain function, not exported. It receives a `streams` prop typed inline.
   - What's unclear: Whether extracting it to `components/WorkstreamTableClient.tsx` requires updating the prop type to use the `Workstream` type from `lib/queries.ts`.
   - Recommendation: Use `Workstream` type from `lib/queries.ts` for the extracted client component prop — it already includes `percent_complete`, `lead`, `state`, `last_updated`, `id`, `name`, `track`.

3. **Artifacts page data source**
   - What we know: `getWorkspaceData()` already returns `artifacts` (confirmed in queries.ts line 308). No additional query function needed for the page.
   - What's unclear: Whether GET `/api/artifacts?projectId=X` is needed at all for the page (since RSC can call `getWorkspaceData()` directly).
   - Recommendation: Artifacts page RSC should call `getWorkspaceData()` directly, same as decisions/architecture/teams. The GET `/api/artifacts?projectId=X` route is still useful for the ArtifactEditModal to refresh data without full page RSC fetch — but `router.refresh()` makes it unnecessary. Consider skipping the GET route and using `router.refresh()` consistently.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (already installed) |
| Config file | `playwright.config.ts` (project root) |
| Quick run command | `npx playwright test tests/e2e/phase12.spec.ts --reporter=line` |
| Full suite command | `npx playwright test tests/e2e/phase12.spec.ts` |

### Phase 12 Behaviors → Test Map

| Behavior | Test Type | Automated Command | Notes |
|----------|-----------|-------------------|-------|
| Artifacts tab renders at `/customer/1/artifacts` | smoke | `npx playwright test tests/e2e/phase12.spec.ts --grep "artifacts-tab"` | Wave 0 stub |
| New Artifact button opens ArtifactEditModal | smoke | `--grep "ArtifactEditModal"` | Wave 0 stub |
| Artifact create saves and appears in table | integration | `--grep "artifact-create"` | Wave 0 stub |
| Artifact edit modal opens on row click | smoke | `--grep "artifact-edit"` | Wave 0 stub |
| "Add Decision" button opens modal | smoke | `--grep "add-decision"` | Wave 0 stub |
| New decision appears at top of list after save | integration | `--grep "decision-save"` | Wave 0 stub |
| Architecture Edit button opens workstream modal | smoke | `--grep "architecture-edit"` | Wave 0 stub |
| Architecture save persists state+lead change | integration | `--grep "architecture-save"` | Wave 0 stub |
| Teams tab shows Progress column with slider | smoke | `--grep "teams-progress"` | Wave 0 stub |
| Teams slider save updates percent_complete | integration | `--grep "teams-save"` | Wave 0 stub |
| Phase 3 placeholder banners are removed | smoke | `--grep "banner-removed"` | Wave 0 stub |
| 13th tab "Artifacts" visible in WorkspaceTabs | smoke | `--grep "artifacts-tab-nav"` | Wave 0 stub |

### Sampling Rate

- **Per task commit:** `npx playwright test tests/e2e/phase12.spec.ts --reporter=line`
- **Per wave merge:** `npx playwright test tests/e2e/phase12.spec.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/e2e/phase12.spec.ts` — all 12 stubs above (RED baseline, file does not exist yet)

*(All stubs follow the `expect(false, 'stub').toBe(true)` first-line pattern established in Phase 2 — 02-01 decision)*

---

## Sources

### Primary (HIGH confidence)

- Codebase: `bigpanda-app/components/ActionEditModal.tsx` — reference implementation for modal write pattern
- Codebase: `bigpanda-app/components/StakeholderEditModal.tsx` — dual-mode create/edit modal pattern
- Codebase: `bigpanda-app/app/api/risks/[id]/route.ts` — Zod-validated PATCH route pattern
- Codebase: `bigpanda-app/app/api/notes/route.ts` — append-only POST route pattern
- Codebase: `bigpanda-app/app/api/stakeholders/route.ts` — POST with Zod create route pattern
- Codebase: `bigpanda-app/db/schema.ts` — live schema for workstreams, artifacts, key_decisions tables
- Codebase: `bigpanda-app/lib/queries.ts` — `getWorkspaceData()` confirmed to return artifacts already
- Codebase: `bigpanda-app/components/WorkspaceTabs.tsx` — current TABS array (12 tabs), insertion point confirmed
- Codebase: `bigpanda-app/app/customer/[id]/decisions/page.tsx` — live banner markup to remove
- Codebase: `bigpanda-app/app/customer/[id]/architecture/page.tsx` — live banner markup to remove
- Codebase: `bigpanda-app/app/customer/[id]/teams/page.tsx` — current WorkstreamTable to extend
- Context: `.planning/phases/12-complete-workspace-write-surface/12-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — project decisions log confirming patterns (e.g., `@/db` alias, `router.refresh()` convention, assert-if-present E2E pattern)

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against live code; no new dependencies
- Architecture patterns: HIGH — all patterns have exact working examples in codebase
- Pitfalls: HIGH — derived from live code inspection and STATE.md project decisions log
- External_id format question: MEDIUM — schema shows both formats exist; safe recommendation documented

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable patterns; no external library churn)
