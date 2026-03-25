# Phase 13: Skill UX + Draft Polish - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Four targeted UX improvements: (1) contextual skill launch buttons on History and Stakeholders tabs, (2) draft editing modal on Drafts Inbox that exposes subject/body/recipient, (3) working search date range filter backend, (4) plan templates picker upgraded from dropdown to shadcn Dialog modal.

</domain>

<decisions>
## Implementation Decisions

### Skill Launch Buttons (History + Stakeholders)
- **Trigger behavior**: Button navigates to `/customer/[id]/skills` — uses the existing Skills tab and SkillsTabClient, no new modal overlay needed
- **No pre-fill**: Buttons do not inject history entries or stakeholder data as transcript input — user pastes their own content as usual
- **History tab placement**: "Generate Meeting Summary" button in the heading row top-right, same position as "Add Decision" / "+ Add Stakeholder" on other tabs
- **Stakeholders tab placement**: "Create Handoff Doc" button in the heading row top-right, next to the existing "+ Add Stakeholder" button — same pattern as History
- **Implementation**: Both tabs are RSC pages; buttons need to be `'use client'` wrapper components (or inline client island) since they call `router.push()`, or can be Next.js `<Link>` elements pointing to `/customer/[id]/skills`

### Templates Picker Upgrade
- **Modal not dropdown**: Replace the existing `TemplatePicker` dropdown popover with a shadcn Dialog modal — upgrade is for consistency with the established ActionEditModal/RiskEditModal pattern, not for new functionality
- **Display**: Show template name + task count per template (e.g. "Biggy Activation (8 tasks)") so the user knows what they're applying without guessing. Task count derived by parsing `template.data` JSON at render time.
- **After apply**: Close modal + `router.refresh()` — standard Phase 12 pattern
- **Empty state**: "No templates configured" message in the modal body — same text as existing dropdown

### Draft Edit Modal
- **Upgrade from inline**: Replace the inline textarea expansion (click to expand content) with a shadcn Dialog modal
- **Fields exposed**: `subject`, `content` (body), and `recipient` — all three editable in the modal
- **API**: Extend existing `PATCH /api/drafts/[id]` to accept `subject` and `recipient` in addition to `content` when `action: 'edit'`
- **Trigger**: Clicking anywhere on the draft card (current behavior) opens the modal instead of expanding inline
- **After save**: Modal closes; draft card updates in place (optimistic update or re-fetch)
- **Dismiss from modal**: Keep Dismiss available as a button inside the modal (in addition to outside)

### Search Date Filter
- **Claude's Discretion**: The UI (From/To date inputs) and API route are already wired. The fix lives in `searchAllRecords()` in `lib/queries.ts` — verify and implement date filtering against the record's `date` field (or `created_at` if `date` is null). No design decisions needed from user.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SkillsTabClient.tsx`: Full skill launcher — accepts `projectId`, shows all skills, handles run trigger. Skill launch buttons on History/Stakeholders navigate here via `router.push` or `<Link>` with skill pre-selected via URL param (e.g. `?skill=meeting-summary`).
- `ActionEditModal.tsx` / `RiskEditModal.tsx`: Reference implementation for the Draft Edit modal — shadcn Dialog + form state + PATCH + router.refresh() + inline error handling.
- `PhaseBoard.tsx`: Already has `TemplatePicker` component with `applyTemplate()` logic — the modal upgrade reuses this logic, just replaces the dropdown `<div>` wrapper with a shadcn Dialog.
- `DraftsInbox.tsx`: Has `expandedId` / `editContent` state for inline editing — replace with modal state (`modalDraft: Draft | null`).
- `app/api/drafts/[id]/route.ts`: Existing PATCH route handles `action: 'edit'` with `content` — extend to also accept `subject` and `recipient`.

### Established Patterns
- Heading-row button placement: `<div className="flex items-center justify-between">` with `<h2>` on left, button on right — used in Actions, Risks, Milestones, Decisions, Stakeholders, Artifacts tabs
- Modal trigger: shadcn `<Dialog>` with `<DialogTrigger asChild>` wrapping a `<Button>` or `<span>`
- `router.refresh()` after all mutations (RSC re-fetch)
- History page and Stakeholders page are RSC — skill launch button needs to be a `'use client'` island or a plain `<Link>` (no `router.push` needed if using Link)

### Integration Points
- `app/customer/[id]/history/page.tsx` — add "Generate Meeting Summary" Link button in the heading row
- `app/customer/[id]/stakeholders/page.tsx` — add "Create Handoff Doc" Link button next to "+ Add Stakeholder"
- `components/PhaseBoard.tsx` — replace TemplatePicker dropdown with Dialog modal
- `components/DraftsInbox.tsx` — replace inline expand with modal
- `app/api/drafts/[id]/route.ts` — extend PATCH to handle subject + recipient
- `lib/queries.ts` → `searchAllRecords()` — add date range filtering logic

</code_context>

<specifics>
## Specific Ideas

- Skill launch buttons: a plain `<Link href={`/customer/${projectId}/skills`}>` is sufficient since both History and Stakeholders pages are RSC — no need for a client island just to navigate
- Templates modal: task count derived from `JSON.parse(template.data).tasks?.length ?? 0` — same logic already in `applyTemplate()`
- Draft Edit modal: "Edit" button or clicking the draft card should open the modal; keep Copy/Gmail Draft/Slack/Dismiss buttons outside the modal on the card for quick actions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-skill-ux-draft-polish*
*Context gathered: 2026-03-25*
