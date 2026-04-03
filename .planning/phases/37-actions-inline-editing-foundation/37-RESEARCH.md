# Phase 37: Actions & Inline Editing Foundation - Research

**Researched:** 2026-04-03
**Domain:** React inline cell editing, date picker integration, table UI, bulk operations, Next.js Server/Client Component pattern
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Inline edit mechanics:**
- Click an editable cell (status, owner, due date) — the cell becomes an input in-place, no row-level edit mode
- Status cells: click → `<select>` dropdown appears in-place → onChange → PATCH immediately (no confirm step)
- Owner cells: click → text input with datalist autocomplete → save on blur
- Date cells: click → calendar popover (react-day-picker + Radix Popover) → save on date select
- All saves are optimistic — UI updates immediately, reverts silently on error
- Save errors surface as toast notifications (not inline cell errors)
- Modal retained for description and notes fields — accessible by clicking the non-inline cells or a dedicated edit icon

**Date picker:**
- Library: react-day-picker + Radix Popover (install required) — matches shadcn/ui style
- "Clear / TBD" button inside the popover to set the field back to TBD/null
- Built as a shared `<DatePickerCell />` component — reused across Actions, Risks, Milestones, and Tasks

**Owner autocomplete:**
- HTML `<datalist>` pointing to the project's stakeholder names — zero install, browser handles the dropdown
- Freeform entry allowed — unrecognized names saved as-is with no warning
- Built as a shared `<OwnerCell />` component — reused across Actions, Risks, Milestones, and Tasks
- Stakeholder names fetched from existing `/api/stakeholders?project_id=X` endpoint

**Actions table layout:**
- Columns (in order): ID | Description | Owner | Due Date | Status | Source
- Uses existing shadcn `<Table>` component
- Filter/toolbar row: `[Search box] [Status chips] [Owner filter] [Date range]` — all in one row
- All filters use URL query params (consistent with existing `?status=` pattern)
- Architecture: page remains Server Component for data; inline editing + filter bar extracted into `<ActionsTableClient />` Client Component

**Bulk actions (ACTN-05):**
- Checkbox column added as the first column in the Actions table
- When 1+ rows selected: floating bar appears above the table — "N selected — [Status ▾] [Clear]"
- Bulk status dropdown shows all 4 statuses: open / in_progress / completed / cancelled
- After bulk save: selection clears automatically
- Bulk actions are Actions-only in this phase

**Risk and Milestone inline editing:**
- Risks table: status (open/mitigated/resolved/accepted), owner, and severity cells become inline-editable
- Milestones table: status (not_started/in_progress/completed/blocked), target date, and owner cells become inline-editable
- Both use the same `<DatePickerCell />` and `<OwnerCell />` shared components
- Mitigation field on Risks remains append-only (existing modal behavior preserved)
- Notes field on Milestones remains in the modal

### Claude's Discretion
- Calendar popover visual styling details (month navigation, day highlight colors)
- Whether to use a single `<InlineSelectCell />` component for all status dropdowns or per-entity implementations
- Exact toast notification library/component (use whatever toast pattern already exists in the codebase, or add a minimal one)
- Radix Popover positioning (above/below cell, collision avoidance)
- Loading state during stakeholder fetch for datalist (can use empty datalist until loaded)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACTN-01 | User can view Actions in a table layout with columns for ID, description, owner, due date, status, and source badge | Existing shadcn `<Table>` used in Risks/Milestones pages; Actions page card layout is replaced |
| ACTN-02 | User can edit action status, owner, and due date inline by clicking the table cell — no modal required | `<InlineSelectCell />`, `<OwnerCell />`, `<DatePickerCell />` components; PATCH `/api/actions/[id]` exists |
| ACTN-03 | User can filter Actions by owner and due date range in addition to existing status filter | URL query params pattern from existing actions page; `<ActionsTableClient />` reads `useSearchParams()` |
| ACTN-04 | User can search Actions by description text | Same as SRCH-03; handled in `<ActionsTableClient />` via URL query param `?q=` + client-side filter |
| ACTN-05 | User can bulk-update status for multiple selected actions via checkbox selection | `components/ui/checkbox.tsx` exists; `/api/actions/bulk-update` (new endpoint, mirrors tasks-bulk pattern) |
| IEDIT-01 | User can edit Risk status, severity, owner, and mitigation inline in the Risks table row | `<InlineSelectCell />` for status/severity; `<OwnerCell />` for owner; mitigation stays in modal |
| IEDIT-02 | User can edit Milestone status, target date, owner, and notes inline in the Milestones table row | `<InlineSelectCell />` for status; `<DatePickerCell />` for target date; `<OwnerCell />` for owner; notes stays in modal |
| IEDIT-03 | Risk status uses a fixed dropdown (open / mitigated / resolved / accepted) replacing freeform text | Schema change: `risks.status` is currently `text` — update API schema to `z.enum([...])` and UI to dropdown |
| IEDIT-04 | Milestone status uses a fixed dropdown (not_started / in_progress / completed / blocked) replacing freeform text | Schema change: `milestones.status` is currently `text` — same pattern as IEDIT-03 |
| FORM-01 | All entity edit surfaces (Actions, Risks, Milestones, Tasks) use a date picker component for date fields | `<DatePickerCell />` installed via react-day-picker + @radix-ui/react-popover; replace freeform text inputs in all 4 modals too |
| FORM-02 | Owner field on Actions, Risks, Milestones, and Tasks offers autocomplete suggestions from stakeholder list | `<OwnerCell />` with `<datalist>`; GET endpoint needed at `/api/stakeholders?project_id=X` |
| FORM-03 | Owner autocomplete allows freeform entry for names not in the stakeholder list (backwards compatible) | Native `<datalist>` behaviour: suggestions are advisory, freeform always allowed |
| SRCH-03 | Actions tab supports text search on the description field (in addition to status, owner, and date filters) | Same deliverable as ACTN-04; URL query param `?q=` fed into client-side `.filter()` in `<ActionsTableClient />` |
</phase_requirements>

---

## Summary

Phase 37 converts the Actions tab from a card layout to a table with per-cell inline editing, then applies the same inline-edit treatment to the existing Risks and Milestones tables. It also ships two shared form components (`<DatePickerCell />` and `<OwnerCell />`) that are used across Actions, Risks, Milestones, and Tasks. The architectural skeleton is already proven in the codebase — Risks and Milestones already use the shadcn `<Table>` component, the `WorkstreamTableClient` demonstrates the Server Component page + Client Component island pattern, and `sonner` is already wired into the root layout as the toast provider.

The two gaps that need new installation are `react-day-picker` (v9.14.0 — latest stable) and `@radix-ui/react-popover` (v1.1.15 — consistent with other Radix packages already in the project). The stakeholders route also lacks a GET handler — only POST and PATCH exist — which must be added to support the `<OwnerCell />` datalist population. The bulk-actions endpoint follows the exact same pattern as the existing `/api/tasks-bulk` route.

One important schema concern: both `risks.status` and `milestones.status` are plain `text` columns in the DB schema, not enums. This means existing data may contain arbitrary strings (e.g., "closed", "open", "Mitigated"). The API layer currently accepts any string for these fields. IEDIT-03 and IEDIT-04 tighten the client and API to a fixed enum — existing non-conforming DB values do NOT need a migration but the API patchSchema needs to be updated to validate the enum, and any display code needs a safe fallback.

**Primary recommendation:** Build the three shared components (`<InlineSelectCell />`, `<DatePickerCell />`, `<OwnerCell />`) first as they are the building blocks for all four entities. Then wire them into the Actions table (the most complex page), then apply to Risks and Milestones (simpler because the tables already exist).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-day-picker | 9.14.0 | Calendar UI for `<DatePickerCell />` | Decided in CONTEXT.md; matches shadcn/ui default; zero framework lock-in |
| @radix-ui/react-popover | 1.1.15 | Popover wrapper for the calendar | Decided in CONTEXT.md; consistent with other Radix primitives already installed |
| sonner | 2.0.7 (installed) | Toast notifications for save errors | Already in layout.tsx as `<Toaster position="bottom-right" richColors />` |

### Supporting (already installed — no new installs needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-select | 2.2.6 | `<InlineSelectCell />` for status/severity dropdowns | Status and severity cells; `components/ui/select.tsx` wrapper already exists |
| @radix-ui/react-checkbox | 1.3.3 | Bulk-select column in Actions table | `components/ui/checkbox.tsx` already exists |
| shadcn Table | n/a | Table layout for Actions | Already used in Risks/Milestones pages; `components/ui/table.tsx` |
| zod | 4.3.6 | API schema validation | All API routes use `z.object()` already |
| drizzle-orm | 0.45.1 | DB mutations | `db.update()` with `inArray()` for bulk endpoint |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-day-picker + Radix Popover | shadcn Calendar component | shadcn Calendar IS react-day-picker wrapped in Radix Popover — same result, locked by CONTEXT.md anyway |
| HTML `<datalist>` for owner | @radix-ui/react-combobox or cmdk | Zero install; browser renders native suggestions; freeform entry built-in; good enough for this use case |
| `/api/actions/bulk-update` POST | Loop individual PATCH calls | Bulk endpoint avoids N round-trips; mirrors established tasks-bulk pattern; ~10 lines to add |

**Installation:**
```bash
cd bigpanda-app && npm install react-day-picker @radix-ui/react-popover
```

---

## Architecture Patterns

### Recommended Project Structure

New files to create:

```
bigpanda-app/
├── components/
│   ├── InlineSelectCell.tsx      # Shared: click-to-select dropdown for status/severity
│   ├── DatePickerCell.tsx        # Shared: click-to-calendar popover for date fields
│   ├── OwnerCell.tsx             # Shared: click-to-input with datalist autocomplete
│   └── ActionsTableClient.tsx    # Client island: filter bar + bulk select + inline-edit rows
├── app/
│   └── customer/[id]/actions/
│       └── page.tsx              # Refactor: Server Component, renders <ActionsTableClient />
└── app/api/
    ├── actions/
    │   └── bulk-update/
    │       └── route.ts          # New: POST /api/actions/bulk-update
    └── stakeholders/
        └── route.ts              # Add GET handler (project_id query param)
```

### Pattern 1: Server Component Page + Client Component Island

**What:** The page-level component (`page.tsx`) remains a Server Component that fetches all data server-side. An island client component (`<ActionsTableClient />`) receives data as props, owns all interactive state (selected rows, inline edit state, filter values via `useSearchParams()`), and calls `router.refresh()` after mutations.

**When to use:** Any page requiring both initial SSR data load and interactive client-side state. Established in `WorkstreamTableClient`, `GlobalTimeView`, and `PlanTabs`.

**Example (from existing WorkstreamTableClient pattern):**
```typescript
// Source: bigpanda-app/components/WorkstreamTableClient.tsx
'use client'
import { useRouter } from 'next/navigation'

export function WorkstreamTableClient({ streams }: { streams: WorkstreamRow[] }) {
  const router = useRouter()

  async function handleSave(id: number, patch: object) {
    const res = await fetch(`/api/workstreams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) { /* show error */ return }
    router.refresh()  // Re-fetches server data, re-renders Server Component
  }
  // ...
}
```

**Actions page applies the same pattern:**
```typescript
// app/customer/[id]/actions/page.tsx (Server Component — stays as-is structurally)
export default async function ActionsPage({ params, searchParams }) {
  const data = await getWorkspaceData(projectId)
  return (
    <ActionsTableClient
      actions={data.actions}
      projectId={projectId}
      stakeholders={stakeholderNames}
      artifactMap={artifactMap}
    />
  )
}
```

### Pattern 2: Inline Cell Editing — Click-to-Edit

**What:** A table cell renders display content by default. On click it swaps to an input/select/popover. On save (onChange for select, blur for text, date select for calendar) it PATCHes the API optimistically — the local state updates immediately, and the UI reverts on error with a toast.

**When to use:** Status, owner, and date cells across Actions, Risks, and Milestones.

**Example — InlineSelectCell:**
```typescript
// Source: established pattern from ActionEditModal.tsx status select + WorkstreamTableClient
'use client'
import { useState } from 'react'
import { toast } from 'sonner'

interface InlineSelectCellProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onSave: (value: T) => Promise<void>
  className?: string
}

export function InlineSelectCell<T extends string>({
  value, options, onSave, className
}: InlineSelectCellProps<T>) {
  const [editing, setEditing] = useState(false)
  const [optimisticValue, setOptimisticValue] = useState(value)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newValue = e.target.value as T
    const previousValue = optimisticValue
    setOptimisticValue(newValue)  // Optimistic update
    setEditing(false)
    try {
      await onSave(newValue)
    } catch {
      setOptimisticValue(previousValue)  // Revert
      toast.error('Save failed — please try again')
    }
  }

  if (editing) {
    return (
      <select
        autoFocus
        value={optimisticValue}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        className="text-sm border rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-zinc-400"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:bg-zinc-100 rounded px-1 py-0.5 ${className}`}
    >
      {options.find(o => o.value === optimisticValue)?.label ?? optimisticValue}
    </span>
  )
}
```

### Pattern 3: DatePickerCell with Radix Popover

**What:** A date display cell that, when clicked, opens a Radix Popover containing a `react-day-picker` `<DayPicker>` calendar. Selecting a date saves immediately and closes the popover. A "Clear / TBD" button sets the value to `null`.

**Example:**
```typescript
// Source: react-day-picker v9 docs + @radix-ui/react-popover patterns
'use client'
import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import * as Popover from '@radix-ui/react-popover'
import { toast } from 'sonner'
import 'react-day-picker/style.css'

interface DatePickerCellProps {
  value: string | null  // ISO date string, 'TBD', or null
  onSave: (isoDate: string | null) => Promise<void>
}

export function DatePickerCell({ value, onSave }: DatePickerCellProps) {
  const [open, setOpen] = useState(false)
  const [optimisticValue, setOptimisticValue] = useState(value)

  const parsedDate = value && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? new Date(value)
    : undefined

  async function handleDaySelect(day: Date | undefined) {
    const isoDate = day ? day.toISOString().split('T')[0] : null
    const prev = optimisticValue
    setOptimisticValue(isoDate)
    setOpen(false)
    try {
      await onSave(isoDate)
    } catch {
      setOptimisticValue(prev)
      toast.error('Save failed — please try again')
    }
  }

  async function handleClear() {
    const prev = optimisticValue
    setOptimisticValue(null)
    setOpen(false)
    try {
      await onSave(null)
    } catch {
      setOptimisticValue(prev)
      toast.error('Save failed — please try again')
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <span className="cursor-pointer hover:bg-zinc-100 rounded px-1 py-0.5 text-sm">
          {optimisticValue ?? '—'}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 bg-white border rounded-md shadow-md p-3"
          sideOffset={4}
          align="start"
        >
          <DayPicker
            mode="single"
            selected={parsedDate}
            onSelect={handleDaySelect}
          />
          <button
            onClick={handleClear}
            className="w-full mt-2 text-sm text-zinc-500 hover:text-zinc-700 text-center py-1 border-t"
          >
            Clear / TBD
          </button>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
```

### Pattern 4: OwnerCell with Datalist Autocomplete

**What:** A text input that references a `<datalist>` populated from the stakeholders API. Saves on blur. Freeform names are accepted.

**Example:**
```typescript
// Source: HTML datalist spec; stakeholder fetch from /api/stakeholders?project_id=X
'use client'
import { useState, useEffect, useId } from 'react'
import { toast } from 'sonner'

interface OwnerCellProps {
  value: string | null
  projectId: number
  onSave: (owner: string) => Promise<void>
}

export function OwnerCell({ value, projectId, onSave }: OwnerCellProps) {
  const [editing, setEditing] = useState(false)
  const [optimisticValue, setOptimisticValue] = useState(value ?? '')
  const [stakeholders, setStakeholders] = useState<string[]>([])
  const datalistId = useId()

  useEffect(() => {
    if (!editing) return
    fetch(`/api/stakeholders?project_id=${projectId}`)
      .then(r => r.json())
      .then(data => setStakeholders((data ?? []).map((s: { name: string }) => s.name)))
      .catch(() => {})  // Empty datalist is acceptable fallback
  }, [editing, projectId])

  async function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const newValue = e.target.value
    const prev = optimisticValue
    setOptimisticValue(newValue)
    setEditing(false)
    try {
      await onSave(newValue)
    } catch {
      setOptimisticValue(prev)
      toast.error('Save failed — please try again')
    }
  }

  if (editing) {
    return (
      <>
        <datalist id={datalistId}>
          {stakeholders.map(name => <option key={name} value={name} />)}
        </datalist>
        <input
          autoFocus
          type="text"
          list={datalistId}
          defaultValue={optimisticValue}
          onBlur={handleBlur}
          className="text-sm border rounded px-1 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </>
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-zinc-100 rounded px-1 py-0.5 text-sm"
    >
      {optimisticValue || '—'}
    </span>
  )
}
```

### Pattern 5: Bulk Selection Floating Bar

**What:** A floating bar that appears above the table when 1+ checkboxes are selected. Contains a status dropdown and a "Clear" link. After bulk save, clears all selections.

**When to use:** Actions table only (this phase).

**Example (structure):**
```typescript
// Source: Gmail/Linear floating action bar pattern; tasks-bulk API mirrors this
{selectedIds.size > 0 && (
  <div className="flex items-center gap-3 bg-white border rounded-md shadow px-4 py-2 mb-2">
    <span className="text-sm text-zinc-600">{selectedIds.size} selected</span>
    <select
      onChange={async (e) => {
        await fetch('/api/actions/bulk-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action_ids: [...selectedIds],
            patch: { status: e.target.value }
          })
        })
        setSelectedIds(new Set())
        router.refresh()
      }}
      className="text-sm border rounded px-2 py-1"
    >
      <option value="" disabled>Set status...</option>
      <option value="open">open</option>
      <option value="in_progress">in_progress</option>
      <option value="completed">completed</option>
      <option value="cancelled">cancelled</option>
    </select>
    <button onClick={() => setSelectedIds(new Set())} className="text-sm text-zinc-400 hover:text-zinc-700">
      Clear
    </button>
  </div>
)}
```

### Pattern 6: Stakeholders GET Endpoint (new — needed for OwnerCell)

**What:** A GET handler at `/api/stakeholders?project_id=X` that returns `[{ id, name, role }]` for a project. The `stakeholders/route.ts` currently only has POST.

**Example:**
```typescript
// Mirrors existing GET patterns across the codebase
export async function GET(request: NextRequest) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const projectId = parseInt(request.nextUrl.searchParams.get('project_id') ?? '', 10)
  if (isNaN(projectId)) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const rows = await db
    .select({ id: stakeholders.id, name: stakeholders.name, role: stakeholders.role })
    .from(stakeholders)
    .where(eq(stakeholders.project_id, projectId))

  return NextResponse.json(rows)
}
```

### Anti-Patterns to Avoid

- **Row-level edit mode (click row → everything becomes editable):** CONTEXT.md explicitly locks per-cell editing. Don't implement a "row edit" state machine.
- **Opening a modal for status/owner/date changes:** These three fields must be inline. The modal is only for description and notes.
- **Storing inline edit state in a parent component for all rows:** Each inline cell component owns its own `editing` boolean. Parent only owns `selectedIds` (bulk selection) and filter state.
- **Using Radix Select for inline status instead of a native `<select>`:** Radix Select is good for form UIs, but a native `<select>` with `autoFocus` is simpler and sufficient for the in-cell case. The existing `components/ui/select.tsx` is best reserved for non-inline contexts.
- **DB migration to add enum constraints for risk/milestone status:** The `status` column is `text` — leave the DB schema as-is. Enforce the enum only at the API (zod schema) and UI layers. No migration needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar UI | Custom date input | react-day-picker `<DayPicker>` | Month navigation, keyboard nav, localisation, ARIA are all solved |
| Popover positioning | CSS position:absolute with JS scroll/resize handlers | @radix-ui/react-popover | Handles viewport collision, portaling, focus trapping |
| Toast notifications | Error state div or alert component | `sonner` `toast()` already in layout | `<Toaster>` is already mounted in `app/layout.tsx` |
| Bulk DB update loop | N sequential PATCH calls | `db.update().where(inArray(...))` | Single SQL statement; mirrors tasks-bulk pattern exactly |
| Owner suggestions dropdown | Custom combobox | HTML `<datalist>` + `<input list="...">` | Zero install; freeform allowed; browser renders native UI |

**Key insight:** Every hard sub-problem in this phase already has a solved counterpart in the codebase (tasks-bulk for bulk, WorkstreamTableClient for inline editing, sonner for toasts, shadcn Table for layout). The implementation is wiring, not invention.

---

## Common Pitfalls

### Pitfall 1: Actions Page Server Component with `searchParams` — Not Passing Filters to Client

**What goes wrong:** The Server Component reads `searchParams` and pre-filters data before passing to `<ActionsTableClient />`. The Client Component then can't re-filter without a full page navigation.

**Why it happens:** Trying to keep the Client Component stateless.

**How to avoid:** Pass the full unfiltered action list to `<ActionsTableClient />`. Let the client component read `useSearchParams()` and do its own filtering. URL-driven filters work because `useSearchParams()` reactive re-renders on URL change without a full navigation.

**Warning signs:** `ActionsTableClient` receives a pre-filtered list as a prop named `filtered`.

---

### Pitfall 2: Optimistic Update Revert Race Condition

**What goes wrong:** User clicks two status cells quickly. Both PATCHes go out. First PATCH fails and reverts the cell, but by then the second PATCH has already updated the UI to the second value — the revert overwrites the intended second value.

**Why it happens:** Naive optimistic state with no in-flight tracking.

**How to avoid:** Each cell component is independent — they hold their own local state. Two different cells don't interfere. For the same cell clicked twice rapidly: add a `saving` boolean that disables re-click while a PATCH is in flight. (Low risk in practice — only one cell can be `editing` at a time per cell.)

**Warning signs:** Status appears to jump back to a previous value after rapid consecutive edits.

---

### Pitfall 3: react-day-picker v9 Import — No Default Export

**What goes wrong:** `import DayPicker from 'react-day-picker'` fails or imports undefined.

**Why it happens:** react-day-picker v9 changed to named exports only. The default export was removed.

**How to avoid:** Always use named import: `import { DayPicker } from 'react-day-picker'`

**Warning signs:** TypeScript error "Module has no default export" or undefined DayPicker at runtime.

---

### Pitfall 4: react-day-picker CSS Import in Next.js 16 + Tailwind 4

**What goes wrong:** `import 'react-day-picker/style.css'` causes a build error or styles do not apply because Tailwind 4's PostCSS pipeline handles CSS differently.

**Why it happens:** The project uses Tailwind 4 (`tailwindcss: ^4`) which has a different PostCSS configuration. A related problem was already solved for frappe-gantt (its CSS is loaded via `<link>` in `app/layout.tsx` from `public/`).

**How to avoid:** Prefer loading `react-day-picker/style.css` via a global CSS `@import` in `globals.css`, or copy the minified CSS into `public/` and add a `<link>` in `layout.tsx` (same approach as frappe-gantt). Test the calendar renders correctly before proceeding.

**Warning signs:** Unstyled calendar grid, missing chevron arrows, or PostCSS build error mentioning `style.css`.

---

### Pitfall 5: Risk Status Freeform → Enum Migration — Existing Data

**What goes wrong:** Changing the API zod schema for Risk status from `z.string()` to `z.enum(['open','mitigated','resolved','accepted'])` causes PATCH calls from the modal to fail if a risk was previously saved with a non-conforming value like `"closed"` or `"Resolved"` (capital R).

**Why it happens:** The DB has no constraint on `risks.status` — existing data can be anything.

**How to avoid:** CONTEXT.md says map non-conforming values to `'open'` as the safe default. Apply the mapping at the display layer only (in `InlineSelectCell` for Risks: if `value` is not in the enum, display as `'open'`). The API patchSchema enforces enum only on write — it does not reject reads, so `GET` data can still return non-conforming strings. Add a normalisation helper:

```typescript
// In risks/page.tsx or in InlineSelectCell
const RISK_STATUS_VALUES = ['open', 'mitigated', 'resolved', 'accepted'] as const
type RiskStatus = typeof RISK_STATUS_VALUES[number]
function normaliseRiskStatus(s: string | null | undefined): RiskStatus {
  return RISK_STATUS_VALUES.includes(s as RiskStatus) ? (s as RiskStatus) : 'open'
}
```

**Warning signs:** `<InlineSelectCell />` receives a value that doesn't match any `<option>` — the select renders blank or shows the raw non-conforming string.

---

### Pitfall 6: Stakeholders GET Endpoint Does Not Exist Yet

**What goes wrong:** `<OwnerCell />` fetches `/api/stakeholders?project_id=X` on edit focus, gets a 404 or Method Not Allowed.

**Why it happens:** `app/api/stakeholders/route.ts` currently only exports `POST`. No `GET` handler exists.

**How to avoid:** The GET handler is a required new addition in this phase (5–10 lines). Without it, `<OwnerCell />` will silently fall back to an empty datalist — which is acceptable per CONTEXT.md but means no suggestions appear. Prioritise adding the GET in the same wave as `OwnerCell`.

**Warning signs:** Network tab shows 405 Method Not Allowed on the stakeholders endpoint.

---

### Pitfall 7: Actions Page `searchParams` in Next.js 16 — Async Promise

**What goes wrong:** Accessing `searchParams.status` synchronously in a Next.js 16 Server Component throws a warning or returns undefined.

**Why it happens:** In Next.js 16, `searchParams` is a Promise and must be awaited. The existing `actions/page.tsx` already does this correctly (`const sp = await searchParams`) — but it must be preserved when refactoring the page.

**How to avoid:** Keep `searchParams: Promise<{...}>` and `await searchParams` in the Server Component. Pass the resolved params or the full URL to `<ActionsTableClient />` only if needed for initial state — otherwise let the Client Component read from `useSearchParams()` directly.

---

## Code Examples

Verified patterns from codebase:

### Existing PATCH Pattern for Single Action
```typescript
// Source: bigpanda-app/app/api/actions/[id]/route.ts (lines 157–203)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const { id } = await params
  const actionId = parseInt(id, 10)
  // ... parse body with zod ActionPatchSchema ...
  // Step 1: xlsx write FIRST (if xlsx exists)
  await updateXlsxRow(actionId, patch)
  // Step 2: DB update + audit log in transaction
  await db.transaction(async (tx) => {
    await tx.update(actions).set(patchWithDate).where(eq(actions.id, actionId))
    await tx.insert(auditLog).values({ entity_type: 'action', ... })
  })
  return Response.json({ ok: true })
}
```

**Important:** The actions PATCH route also writes to an xlsx file (`PA3_Action_Tracker.xlsx`). This xlsx write happens before the DB write. For inline edits (status, owner, due), the full PATCH endpoint must be called — NOT a shortcut endpoint — to keep the xlsx in sync. The xlsx write is gracefully skipped if the file does not exist (dev environment).

### Existing Bulk Update Pattern (tasks-bulk)
```typescript
// Source: bigpanda-app/app/api/tasks-bulk/route.ts
const BulkUpdateSchema = z.object({
  task_ids: z.array(z.number()).min(1),
  patch: z.object({ status: z.string().optional() /* ... */ }),
})

export async function POST(request: NextRequest) {
  const { session, redirectResponse } = await requireSession()
  // ... parse and validate ...
  await db.update(tasks).set(updateFields).where(inArray(tasks.id, task_ids))
  return Response.json({ ok: true, count: task_ids.length })
}
```

**Note:** The tasks-bulk endpoint does NOT write to xlsx. The actions bulk endpoint should follow the same pattern — no xlsx write for bulk (bulk is Actions-UI only, xlsx sync for bulk is out of scope per CONTEXT.md).

### Sonner Toast Usage Pattern
```typescript
// Source: bigpanda-app/components/ContextTab.tsx
import { toast } from 'sonner'

// Success:
toast.success('Saved')
// Error:
toast.error('Save failed — please try again')
// The <Toaster> is already in app/layout.tsx — no additional setup needed
```

### Existing router.refresh() Pattern
```typescript
// Source: bigpanda-app/components/WorkstreamTableClient.tsx (line 58)
// AND: bigpanda-app/components/ActionEditModal.tsx (line 70)
import { useRouter } from 'next/navigation'
const router = useRouter()
// After any successful mutation:
router.refresh()
// This re-fetches the Server Component data and re-renders the page without a full navigation
```

### URL Query Param Filter Pattern (existing actions page)
```typescript
// Source: bigpanda-app/app/customer/[id]/actions/page.tsx
type SearchParams = Promise<{ status?: string }>
export default async function ActionsPage({ params, searchParams }: { ... }) {
  const sp = await searchParams
  const statusFilter = sp.status ?? ''
  // ...
  const href = opt.value
    ? `/customer/${id}/actions?status=${opt.value}`
    : `/customer/${id}/actions`
}
```

For `<ActionsTableClient />`, extend this to include `?q=` (search), `?owner=` (owner filter), `?from=` and `?to=` (date range), using `useSearchParams()` + `useRouter()` to push URL updates without re-fetching the server data.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-day-picker v7/v8 (default export) | react-day-picker v9 (named exports only) | v9.0.0, mid-2023 | Must use `import { DayPicker }` not `import DayPicker` |
| Actions as card layout | Actions as table (this phase) | Phase 37 | Full UI refactor of actions page |
| Risk/Milestone status as freeform text | Fixed enum via API + InlineSelectCell | Phase 37 | No DB migration; enforce at API/UI layer |
| All editing via modal | Per-cell inline editing for status/owner/date | Phase 37 | Modals retained only for description/notes |

**Deprecated/outdated in this codebase:**
- The card layout in `app/customer/[id]/actions/page.tsx` — replaced entirely by the table in this phase
- Wrapping entire `<TableRow>` in `<RiskEditModal>` and `<MilestoneEditModal>` as the click trigger — replaced by per-cell components with a dedicated "edit description/notes" trigger
- Freeform `<input type="text">` for status fields in Risks and Milestones modals — replaced by `<InlineSelectCell>` and enum-constrained API

---

## Open Questions

1. **react-day-picker CSS loading in Tailwind 4**
   - What we know: frappe-gantt's CSS was moved to `public/` and loaded via `<link>` to avoid Tailwind 4 PostCSS issues
   - What's unclear: Whether `react-day-picker/style.css` via `@import` in `globals.css` works cleanly with Tailwind 4 PostCSS
   - Recommendation: In Wave 0 (setup), test `import 'react-day-picker/style.css'` inside `DatePickerCell.tsx`. If it breaks the build, use the same `public/` + `<link>` pattern as frappe-gantt.

2. **`actions/page.tsx` xlsx side-effect on every inline PATCH**
   - What we know: The PATCH handler writes to `PA3_Action_Tracker.xlsx` synchronously before the DB write; it is skipped gracefully if the file does not exist
   - What's unclear: Whether the xlsx write introduces meaningful latency for the optimistic inline-edit UX (could make the "save" feel slow)
   - Recommendation: Keep calling the existing PATCH endpoint as-is. The xlsx write skips in development (file does not exist). In production, the file-write latency is acceptable for single-cell saves. For bulk updates, create a separate `/api/actions/bulk-update` endpoint without xlsx sync.

3. **Owner filter dropdown in the Actions toolbar**
   - What we know: CONTEXT.md specifies an `[Owner filter]` in the filter row
   - What's unclear: Whether this is a free-text search box or a dropdown of unique owners from the data
   - Recommendation: Use a `<select>` populated with unique owner values derived from the full action list (no extra API call needed). Render as URL param `?owner=`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run tests/api/` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACTN-01 | Actions table renders with correct columns | smoke/manual | Manual browser check | N/A |
| ACTN-02 | PATCH /api/actions/[id] accepts status/owner/due | unit | `cd bigpanda-app && npx vitest run tests/api/actions-patch.test.ts -x` | ❌ Wave 0 |
| ACTN-03 | Owner + date range filter params work client-side | manual | Manual browser check (URL param filter) | N/A |
| ACTN-04 | Description text search filters actions | manual | Manual browser check | N/A |
| ACTN-05 | POST /api/actions/bulk-update updates multiple rows | unit | `cd bigpanda-app && npx vitest run tests/api/actions-bulk.test.ts -x` | ❌ Wave 0 |
| IEDIT-01 | PATCH /api/risks/[id] accepts enum status values | unit | `cd bigpanda-app && npx vitest run tests/api/risks-patch.test.ts -x` | ❌ Wave 0 |
| IEDIT-02 | PATCH /api/milestones/[id] accepts enum status values | unit | `cd bigpanda-app && npx vitest run tests/api/milestones-patch.test.ts -x` | ❌ Wave 0 |
| IEDIT-03 | Risk status dropdown shows correct 4 enum values | manual | Manual browser check | N/A |
| IEDIT-04 | Milestone status dropdown shows correct 4 enum values | manual | Manual browser check | N/A |
| FORM-01 | DatePickerCell renders and saves ISO date | manual | Manual browser check | N/A |
| FORM-02 | GET /api/stakeholders?project_id=X returns names | unit | `cd bigpanda-app && npx vitest run tests/api/stakeholders-get.test.ts -x` | ❌ Wave 0 |
| FORM-03 | OwnerCell accepts freeform name not in datalist | manual | Manual browser check | N/A |
| SRCH-03 | Actions filtered by description text match | manual | Manual browser check | N/A |

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run tests/api/`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `bigpanda-app/tests/api/actions-patch.test.ts` — covers ACTN-02 (inline PATCH for status/owner/due)
- [ ] `bigpanda-app/tests/api/actions-bulk.test.ts` — covers ACTN-05 (bulk status update)
- [ ] `bigpanda-app/tests/api/risks-patch.test.ts` — covers IEDIT-01 (Risk status enum validation)
- [ ] `bigpanda-app/tests/api/milestones-patch.test.ts` — covers IEDIT-02 (Milestone status enum validation)
- [ ] `bigpanda-app/tests/api/stakeholders-get.test.ts` — covers FORM-02 (GET stakeholders endpoint)

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `bigpanda-app/app/api/actions/[id]/route.ts`, `risks/[id]/route.ts`, `milestones/[id]/route.ts`, `stakeholders/route.ts` — current API shape confirmed
- Codebase direct inspection — `bigpanda-app/package.json` — dependency versions confirmed, react-day-picker and @radix-ui/react-popover confirmed NOT installed
- Codebase direct inspection — `bigpanda-app/app/layout.tsx` — `<Toaster>` from sonner confirmed mounted at root with `position="bottom-right" richColors`
- Codebase direct inspection — `bigpanda-app/app/api/tasks-bulk/route.ts` — bulk update pattern confirmed
- Codebase direct inspection — `bigpanda-app/db/schema.ts` — `risks.status` and `milestones.status` confirmed as `text` columns (no enum constraint)
- `npm view react-day-picker version` — v9.14.0 confirmed latest
- `npm view @radix-ui/react-popover version` — v1.1.15 confirmed latest

### Secondary (MEDIUM confidence)
- react-day-picker v9 named export change — confirmed by `npm view react-day-picker@9` peer deps showing v9.0.0 as first release

### Tertiary (LOW confidence)
- Tailwind 4 + react-day-picker CSS import compatibility — based on observed frappe-gantt workaround in the codebase; not directly tested

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed from package.json and npm registry
- Architecture: HIGH — all patterns verified from existing codebase files
- Pitfalls: HIGH (API/schema) / MEDIUM (CSS import) — API pitfalls from direct code inspection; CSS pitfall from inferred pattern

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (react-day-picker and Radix APIs are stable; risk if major version bumps occur)
