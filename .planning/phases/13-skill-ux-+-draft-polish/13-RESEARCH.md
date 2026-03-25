# Phase 13: Skill UX + Draft Polish - Research

**Researched:** 2026-03-25
**Domain:** Next.js 15 RSC/Client component patterns, shadcn Dialog modal, Drizzle ORM PATCH extension, PostgreSQL date comparison
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Skill Launch Buttons (History + Stakeholders)**
- Trigger behavior: Button navigates to `/customer/[id]/skills` — uses the existing Skills tab and SkillsTabClient, no new modal overlay needed
- No pre-fill: Buttons do not inject history entries or stakeholder data as transcript input — user pastes their own content as usual
- History tab placement: "Generate Meeting Summary" button in the heading row top-right, same position as "Add Decision" / "+ Add Stakeholder" on other tabs
- Stakeholders tab placement: "Create Handoff Doc" button in the heading row top-right, next to the existing "+ Add Stakeholder" button — same pattern as History
- Implementation: Both tabs are RSC pages; buttons need to be `'use client'` wrapper components (or inline client island) since they call `router.push()`, or can be Next.js `<Link>` elements pointing to `/customer/[id]/skills`

**Templates Picker Upgrade**
- Modal not dropdown: Replace the existing `TemplatePicker` dropdown popover with a shadcn Dialog modal — upgrade is for consistency with the established ActionEditModal/RiskEditModal pattern, not for new functionality
- Display: Show template name + task count per template (e.g. "Biggy Activation (8 tasks)") so the user knows what they're applying without guessing. Task count derived by parsing `template.data` JSON at render time.
- After apply: Close modal + `router.refresh()` — standard Phase 12 pattern
- Empty state: "No templates configured" message in the modal body — same text as existing dropdown

**Draft Edit Modal**
- Upgrade from inline: Replace the inline textarea expansion (click to expand content) with a shadcn Dialog modal
- Fields exposed: `subject`, `content` (body), and `recipient` — all three editable in the modal
- API: Extend existing `PATCH /api/drafts/[id]` to accept `subject` and `recipient` in addition to `content` when `action: 'edit'`
- Trigger: Clicking anywhere on the draft card (current behavior) opens the modal instead of expanding inline
- After save: Modal closes; draft card updates in place (optimistic update or re-fetch)
- Dismiss from modal: Keep Dismiss available as a button inside the modal (in addition to outside)

**Search Date Filter**
- Claude's Discretion: The UI (From/To date inputs) and API route are already wired. The fix lives in `searchAllRecords()` in `lib/queries.ts` — verify and implement date filtering against the record's `date` field (or `created_at` if `date` is null). No design decisions needed from user.

### Claude's Discretion

- Search date filter implementation details — verify how `dateBounds()` is actually applied and whether it works correctly against all 8 UNION arms

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKILL-03 | Weekly Customer Status skill | Skill launch button on Stakeholders tab navigates to `/customer/[id]/skills` |
| SKILL-04 | Meeting Summary skill | Skill launch button on History tab navigates to `/customer/[id]/skills` |
| SKILL-05 | ELT External Status | Accessible via SkillsTabClient after navigation |
| SKILL-06 | ELT Internal Status | Accessible via SkillsTabClient after navigation |
| SKILL-07 | Team Engagement Map | Accessible via SkillsTabClient after navigation |
| SKILL-08 | Workflow Diagram | Accessible via SkillsTabClient after navigation |
| SKILL-12 | Context Updater | Accessible via SkillsTabClient after navigation |
| SKILL-13 | Handoff Doc Generator | Skill launch button on Stakeholders tab navigates to skills page |
| DASH-09 | Drafts Inbox | DraftEditModal replaces inline expansion; exposes subject/content/recipient |
| SRCH-01 | Full-text search across all tables | Date filter already in searchAllRecords() — verify it executes correctly |
| SRCH-02 | Search filterable by date range | dateBounds() helper exists in queries.ts; UI/API wiring confirmed present |
</phase_requirements>

---

## Summary

Phase 13 is a surgical UX polish pass across four isolated touch points: contextual navigation buttons on History and Stakeholders tabs, a Draft Edit modal upgrade, the Templates picker modal upgrade, and a search date-range filter verification/fix. All four are enhancements to already-working systems; no new tables, no schema changes, no new API routes (only a PATCH body extension for drafts).

The existing codebase already has all the building blocks in place. `ActionEditModal.tsx` is the reference modal pattern (shadcn `Dialog` + `DialogTrigger asChild` + form state + PATCH + `router.refresh()`). `DraftsInbox.tsx` has inline expand state that gets replaced by modal state. `PhaseBoard.tsx` has `TemplatePicker` as a dropdown div that gets wrapped in a shadcn Dialog. History and Stakeholders pages are plain RSC pages that get a `<Link>` element added to their heading row — no client island needed.

The date filter in `searchAllRecords()` already has a `dateBounds()` helper that appends SQL `AND column >= from AND column <= to` conditions to each UNION arm. The UI sends `from`/`to` params, the API route forwards them to `searchAllRecords()`. The fix is verifying the date comparison works against all 8 arms (some use `date` text field, some use `created_at::text` cast) and that the SQL string comparison with ISO date strings (`YYYY-MM-DD`) is correct.

**Primary recommendation:** Follow the ActionEditModal pattern verbatim for DraftEditModal and TemplatesModal. Use `<Link>` for skill navigation buttons (no client island needed). Verify and fix date filter SQL comparisons for all UNION arms.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Dialog | installed | Modal overlay | Established pattern — ActionEditModal, RiskEditModal, StakeholderEditModal all use it |
| Next.js Link | 15 (app router) | Client-side navigation | RSC-safe; no client island needed for simple href navigation |
| Drizzle ORM | installed | DB update | Extends existing `.set()` call on `drafts` table |
| Sonner | installed | Toast notifications | Already used in DraftsInbox for copy/Gmail/Slack feedback |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| useRouter (next/navigation) | 15 | router.refresh() after mutations | Used post-save in all modal patterns |
| useState | React 19 | Modal open/close state, form field state | All modal components |

---

## Architecture Patterns

### Recommended Project Structure

No new files except the two new modal components. Changes are in-place upgrades:

```
bigpanda-app/
├── components/
│   ├── DraftEditModal.tsx       # NEW — replaces inline expand in DraftsInbox
│   ├── TemplateBrowserModal.tsx # NEW (or inline in PhaseBoard) — replaces TemplatePicker dropdown
│   ├── DraftsInbox.tsx          # MODIFY — replace expandedId/editContent with modalDraft state
│   └── PhaseBoard.tsx           # MODIFY — replace TemplatePicker popover div with Dialog
├── app/
│   ├── customer/[id]/
│   │   ├── history/page.tsx     # MODIFY — add <Link> button in heading row
│   │   └── stakeholders/page.tsx # MODIFY — add <Link> button next to "+ Add Stakeholder"
│   └── api/drafts/[id]/route.ts # MODIFY — extend PATCH body to accept subject + recipient
└── lib/
    └── queries.ts               # VERIFY — confirm dateBounds() works for all UNION arms
```

### Pattern 1: Heading-Row Navigation Button (Link, RSC-safe)

**What:** Add a `<Link>` element to the right of the `<h2>` in the heading row of an RSC page.
**When to use:** Both History and Stakeholders pages are RSC — no `router.push`, no `'use client'` wrapper needed.
**Example:**
```tsx
// Source: established pattern from app/customer/[id]/stakeholders/page.tsx
// Existing pattern: <div className="flex items-center justify-between">
//                    <h2>Heading</h2>
//                    <button> or <StakeholderEditModal trigger={<button>...}> </button>

import Link from 'next/link'

// In HistoryPage — add to heading row:
<div className="flex items-center justify-between">
  <h2 className="text-xl font-semibold text-zinc-900">Engagement History</h2>
  <Link
    href={`/customer/${id}/skills`}
    className="px-3 py-1.5 text-sm font-medium text-white bg-zinc-900 rounded hover:bg-zinc-700"
  >
    Generate Meeting Summary
  </Link>
</div>
```

### Pattern 2: shadcn Dialog Modal (reference: ActionEditModal.tsx)

**What:** Controlled Dialog with DialogTrigger, form state, PATCH fetch, router.refresh() on success.
**When to use:** DraftEditModal and TemplatesModal both follow this pattern exactly.
**Example (skeleton):**
```tsx
// Source: bigpanda-app/components/ActionEditModal.tsx (established pattern)
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'

export function DraftEditModal({ draft, trigger }: { draft: Draft; trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subject, setSubject] = useState(draft.subject ?? '')
  const [content, setContent] = useState(draft.content)
  const [recipient, setRecipient] = useState(draft.recipient ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', content, subject, recipient }),
      })
      if (!res.ok) { setError('Save failed'); setSaving(false); return }
      setOpen(false)
      // Optimistic: update local state in parent, OR re-fetch via loadDrafts()
    } catch { setError('Network error'); setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Draft</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          {/* subject, recipient, content fields */}
          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### Pattern 3: TemplatePicker Dialog upgrade

**What:** The existing `TemplatePicker` component renders as an absolutely-positioned popover `<div>`. Wrap with shadcn Dialog instead.
**When to use:** Replace `templatePickerOpen` state toggling the popover with `Dialog open={templatePickerOpen}`.
**Key insight:** The `applyTemplate()` logic stays identical — only the wrapper changes from `<div className="absolute...">` to `<DialogContent>`. The `data-testid="template-picker"` moves to `DialogContent` or a wrapper inside it.

```tsx
// Before (PhaseBoard.tsx lines ~266-283):
<div className="relative">
  <button data-testid="template-btn" onClick={() => setTemplatePickerOpen(v => !v)}>
    Templates
  </button>
  {templatePickerOpen && <TemplatePicker ... />}
</div>

// After:
<Dialog open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
  <DialogTrigger asChild>
    <button data-testid="template-btn">Templates</button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader><DialogTitle>Plan Templates</DialogTitle></DialogHeader>
    <TemplatePicker ... />  {/* TemplatePicker content, updated to show task count */}
  </DialogContent>
</Dialog>
```

### Pattern 4: PATCH body extension (Drizzle)

**What:** Extend `PATCH /api/drafts/[id]` to also update `subject` and `recipient` fields when `action: 'edit'`.
**Current code** (route.ts line 21-25):
```ts
if (body.action === 'edit' && body.content !== undefined) {
  await db.update(drafts)
    .set({ content: body.content, updated_at: new Date() })
    .where(eq(drafts.id, draftId));
```
**Extended:**
```ts
// Extend body type: { action: 'edit' | 'dismiss'; content?: string; subject?: string; recipient?: string }
if (body.action === 'edit') {
  const updateFields: Partial<typeof drafts.$inferInsert> & { updated_at: Date } = { updated_at: new Date() }
  if (body.content !== undefined) updateFields.content = body.content
  if (body.subject !== undefined) updateFields.subject = body.subject
  if (body.recipient !== undefined) updateFields.recipient = body.recipient
  await db.update(drafts).set(updateFields).where(eq(drafts.id, draftId))
  return NextResponse.json({ ok: true })
}
```

### Pattern 5: Search Date Filter (queries.ts)

**What:** The `dateBounds()` helper already builds SQL WHERE clauses. The wiring is already end-to-end: UI -> API -> `searchAllRecords()` -> `dateBounds()` -> SQL.
**Verification needed:** Confirm each UNION arm's date column is compared correctly. The helper does string comparison (`>= 'YYYY-MM-DD'`). This works for:
- ISO date text columns (`a.due`, `r.last_updated`, `kd.date`, `eh.date`, `t.due`, `te.date`) — all stored as `TEXT` in `YYYY-MM-DD` format; lexicographic comparison is correct
- Cast columns (`op.created_at::text`, `os.updated_at::text`, `i.updated_at::text`) — `::text` on a timestamptz produces `'2026-03-25 10:00:00+00'` format, NOT `'YYYY-MM-DD'`; this breaks date comparison

**Fix required for cast columns:** Use `::date::text` or `to_char(col, 'YYYY-MM-DD')` instead of `::text` to normalize to ISO date format before comparison.

```sql
-- Current (BROKEN for timestamp columns):
op.created_at::text >= '2026-01-01'    -- '2026-01-01 08:00:00+00' >= '2026-01-01' → True only by luck

-- Fixed:
to_char(op.created_at, 'YYYY-MM-DD') >= '2026-01-01'   -- deterministic ISO comparison
```

The affected arms are: `outputs` (op.created_at), `onboarding_steps` (os.updated_at), `integrations` (i.updated_at). Other arms use native text date fields which are already ISO format.

### Anti-Patterns to Avoid

- **Using `router.push()` in RSC pages**: History and Stakeholders pages are Server Components. A `<Link>` element is sufficient and preferred — no client island needed for navigation-only buttons.
- **Creating a new TemplatePicker component from scratch**: The existing `TemplatePicker` component and its `applyTemplate()` logic are correct. Only the wrapper div → Dialog change is needed.
- **Clearing all DraftsInbox state on modal close**: When the modal save is optimistic, update the draft in the `drafts` array by mapping over it with the new values — don't call `loadDrafts()` (network round-trip) unless necessary.
- **Forgetting Dismiss button inside modal**: CONTEXT.md explicitly requires Dismiss to remain available inside the modal as a button, in addition to the card-level Dismiss.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal overlay with backdrop/close/focus trap | Custom dialog div | shadcn Dialog | Already installed; handles all accessibility and focus trap automatically |
| Form state management | External form library | useState per field | Consistent with ActionEditModal — no form library in this project |
| SQL injection protection in date filter | Custom sanitizer | Existing `replace(/'/g, "''")` already applied to `from`/`to` in `dateBounds()` | Already safe; just fix the cast issue |

---

## Common Pitfalls

### Pitfall 1: RSC page adding onClick without 'use client'
**What goes wrong:** TypeScript error — Server Components cannot have event handlers. Adding `onClick={() => router.push(...)}` to a button in an RSC page fails at build time.
**Why it happens:** History and Stakeholders pages have no `'use client'` directive — they are pure RSC.
**How to avoid:** Use `<Link href="/customer/${id}/skills">` from `next/link` — no event handler needed, works natively in RSC.
**Warning signs:** Build error "Event handlers cannot be passed to Client Component props."

### Pitfall 2: TemplatePicker dialog blocking DndContext
**What goes wrong:** shadcn Dialog renders a portal outside the DndContext tree. If dialog is opened and DnD is active simultaneously, context may be lost.
**Why it happens:** `@dnd-kit/core` `DndContext` does not require children to be directly nested but dialog portal may confuse pointer sensors.
**How to avoid:** The TemplatePicker modal is not draggable — no DnD inside it. Opening the dialog does not affect existing DnD on the board. This is low risk.

### Pitfall 3: Timestamp cast produces wrong format for date comparison
**What goes wrong:** `created_at::text` in PostgreSQL outputs `'2026-03-25 10:00:00+00'` (timestamp format), not `'2026-03-25'`. String comparison against `'YYYY-MM-DD'` from/to values may behave unexpectedly depending on time zone.
**Why it happens:** Three UNION arms in `searchAllRecords()` use `::text` cast on timestamp columns instead of `::date::text` or `to_char(...)`.
**How to avoid:** Change the cast in the three affected arms: `to_char(op.created_at, 'YYYY-MM-DD')`, `to_char(os.updated_at, 'YYYY-MM-DD')`, `to_char(i.updated_at, 'YYYY-MM-DD')`.

### Pitfall 4: DraftsInbox state drift after modal save
**What goes wrong:** Modal saves successfully; modal closes; but the card still shows the old subject/content/recipient because the `drafts` state array was not updated.
**Why it happens:** DraftsInbox uses local `useState<Draft[]>` — it does not auto-refresh from server unless `loadDrafts()` is called or `router.refresh()` is used.
**How to avoid:** After modal save, either (a) call the parent's `onSaved` callback to update the draft in-place via `setDrafts(prev => prev.map(d => d.id === id ? { ...d, subject, content, recipient } : d))`, or (b) call `loadDrafts()` to re-fetch. Option (a) is faster (no network roundtrip). Since DraftsInbox is a 'use client' component, not RSC, `router.refresh()` won't help directly.

### Pitfall 5: data-testid placement in modal upgrade
**What goes wrong:** E2E tests from prior phases target `data-testid="template-picker"` on the dropdown div. Moving to Dialog changes DOM structure; tests break.
**Why it happens:** Test selectors are brittle when component structure changes.
**How to avoid:** Keep `data-testid="template-picker"` on the DialogContent wrapper div inside the modal, or on the scroll container — same selector, different DOM ancestor.

---

## Code Examples

### DraftEditModal — triggering from card click

```tsx
// Source: established pattern from bigpanda-app/components/DraftsInbox.tsx (existing)
// Replace expandedId logic with:
const [modalDraft, setModalDraft] = useState<Draft | null>(null)

// Card click:
<div
  onClick={() => setModalDraft(draft)}
  className="border border-zinc-200 rounded-lg p-3 bg-white cursor-pointer hover:bg-zinc-50"
>
  {/* card content — no inline expand */}
</div>

{modalDraft && (
  <DraftEditModal
    draft={modalDraft}
    open={true}
    onClose={() => setModalDraft(null)}
    onSaved={(updated) => {
      setDrafts(prev => prev.map(d => d.id === updated.id ? updated : d))
      setModalDraft(null)
    }}
    onDismissed={(id) => {
      setDrafts(prev => prev.filter(d => d.id !== id))
      setModalDraft(null)
    }}
  />
)}
```

### TemplateModal — task count display

```tsx
// Source: existing applyTemplate() in bigpanda-app/components/PhaseBoard.tsx line 120
// Task count derived from: JSON.parse(template.data).tasks?.length ?? 0

templates.map((tpl) => {
  const taskCount = tpl.data
    ? (JSON.parse(tpl.data) as { tasks?: unknown[] }).tasks?.length ?? 0
    : 0
  return (
    <button key={tpl.id} onClick={() => applyTemplate(tpl)} disabled={loading}>
      {tpl.name}
      <span className="ml-2 text-xs text-zinc-400">({taskCount} tasks)</span>
    </button>
  )
})
```

### PATCH route type extension

```ts
// Source: bigpanda-app/app/api/drafts/[id]/route.ts (current)
// Extend body type:
const body = await request.json() as {
  action: 'edit' | 'dismiss';
  content?: string;
  subject?: string;
  recipient?: string;
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline textarea expand (DraftsInbox) | shadcn Dialog modal | Phase 13 | Exposes subject/recipient fields; consistent modal UX |
| Popover dropdown (TemplatePicker) | shadcn Dialog modal | Phase 13 | Shows task count; consistent with rest of app |
| Date filter broken for timestamp cols | `to_char()` normalization | Phase 13 | Accurate date range filtering across all 8 UNION arms |

---

## Open Questions

1. **DraftsInbox modal state: controlled vs uncontrolled**
   - What we know: DraftsInbox is a 'use client' component with local `drafts` state. ActionEditModal is self-contained with its own `open` state.
   - What's unclear: Should DraftEditModal manage its own `open` state (uncontrolled from parent), or should DraftsInbox control it via `modalDraft` state? The "click anywhere on card" trigger pattern is slightly different from ActionEditModal's `<DialogTrigger asChild>` wrapping a button.
   - Recommendation: Use parent-controlled pattern (`modalDraft` in DraftsInbox) because the trigger is the entire card div, not a discrete button. Pass `open` + `onOpenChange` to the modal.

2. **Search filter: do existing test fixtures include date-stamped records?**
   - What we know: The search page E2E tests (phase10.spec.ts) exist. Date filter is new behavior.
   - What's unclear: Whether phase13.spec.ts needs to seed a specific date-stamped record or can rely on existing DB data.
   - Recommendation: E2E test for date filter should use a wide date range (`from=2020-01-01`) to catch any records, then verify the filter does not exclude them. A second test uses `to=2020-01-01` to verify it excludes modern records.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (installed) |
| Config file | `/Users/jmiloslavsky/Documents/Project Assistant Code/playwright.config.ts` |
| Quick run command | `npx playwright test tests/e2e/phase13.spec.ts` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-04 / SKILL-13 | "Generate Meeting Summary" Link visible on History tab | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "history.*skill"` | ❌ Wave 0 |
| SKILL-03 / SKILL-13 | "Create Handoff Doc" Link visible on Stakeholders tab | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "stakeholders.*skill"` | ❌ Wave 0 |
| SKILL-03 / SKILL-13 | Clicking skill button navigates to /skills tab | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "navigate.*skills"` | ❌ Wave 0 |
| DASH-09 | Clicking draft card opens Dialog modal (not inline expand) | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "draft.*modal"` | ❌ Wave 0 |
| DASH-09 | Draft edit modal exposes subject, content, recipient fields | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "draft.*fields"` | ❌ Wave 0 |
| DASH-09 | Saving draft modal updates card content | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "draft.*save"` | ❌ Wave 0 |
| DASH-09 | Dismiss button inside modal dismisses draft | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "draft.*dismiss"` | ❌ Wave 0 |
| SRCH-02 | Date range filter from/to inputs are present on /search | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "search.*date"` | ❌ Wave 0 |
| SRCH-02 | Date range filter with past to-date returns no results | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "date.*filter.*empty"` | ❌ Wave 0 |
| PLAN-08 | Templates button in PhaseBoard opens Dialog modal | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "template.*modal"` | ❌ Wave 0 |
| PLAN-08 | Template list shows task count per template | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "template.*count"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/e2e/phase13.spec.ts`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/e2e/phase13.spec.ts` — covers all 11 behaviors above

*(Existing test infrastructure covers all other phase requirements — no new framework setup needed)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `bigpanda-app/components/DraftsInbox.tsx` — current inline expand state confirmed
- Direct code inspection: `bigpanda-app/components/PhaseBoard.tsx` — TemplatePicker dropdown confirmed; `applyTemplate()` logic confirmed
- Direct code inspection: `bigpanda-app/components/ActionEditModal.tsx` — reference modal pattern confirmed
- Direct code inspection: `bigpanda-app/app/api/drafts/[id]/route.ts` — PATCH body schema confirmed; only accepts `content` currently
- Direct code inspection: `bigpanda-app/lib/queries.ts` lines 417–714 — `searchAllRecords()` with `dateBounds()` helper confirmed; timestamp cast issue identified
- Direct code inspection: `bigpanda-app/app/customer/[id]/history/page.tsx` — RSC confirmed; heading row structure confirmed
- Direct code inspection: `bigpanda-app/app/customer/[id]/stakeholders/page.tsx` — RSC confirmed; heading row with StakeholderEditModal button confirmed
- Direct code inspection: `bigpanda-app/components/SkillsTabClient.tsx` — accepts `projectId` + `recentRuns` props; no URL param for pre-selection currently
- Direct code inspection: `playwright.config.ts` — test framework and command confirmed

### Secondary (MEDIUM confidence)
- PostgreSQL `::text` cast behavior on `timestamptz` — standard PostgreSQL behavior; output format includes time zone offset, not ISO date-only format

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed and in use
- Architecture patterns: HIGH — all reference implementations read directly from source
- Pitfalls: HIGH — pitfalls identified from direct code inspection, not speculation
- Date filter fix: HIGH — the cast issue is a standard PostgreSQL behavior, directly verified in queries.ts

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable stack; no fast-moving dependencies)
