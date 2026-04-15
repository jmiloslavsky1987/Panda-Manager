# Phase 64: Editable Prompts UI - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins can edit skill prompt files from the UI, guarded by a global on/off toggle (default: off). Scope covers: the global toggle in Settings, an edit button per skill on the Skills tab (admin-only), a CodeMirror editor modal for the prompt body, atomic filesystem writes with backup, Design Standard validation before save, and audit logging of all edits. Front-matter metadata editing is out of scope — prompt body only.

</domain>

<decisions>
## Implementation Decisions

### Global toggle placement
- Toggle lives on the **Settings page** (existing settings UI), alongside other app-wide admin controls
- Non-admins never see the toggle — it is admin-only, enforced at the settings route level
- Default: off — prompt editing is disabled until explicitly enabled

### Front-matter in the editor
- The YAML front-matter block (Phase 63 fields: `label`, `description`, `input_required`, `input_label`, `schedulable`, `error_behavior`) is **locked and read-only** in the edit modal
- Only the prompt body below the second `---` delimiter is editable
- Rationale: front-matter drives Skills tab metadata — accidental edits could break skill labels, scheduling flags, and error handling

### Pre-save flow
- Validation (Design Standard schema check) runs on save
- If validation passes → file written atomically with backup created automatically
- No intermediate diff confirmation step — the audit log records before/after for post-hoc review
- If validation fails → inline error shown in modal, save blocked

### Editor — CodeMirror features
- **Enhanced editor**: full-screen toggle, resize handle, markdown toolbar (bold, italic, code, heading shortcuts)
- Markdown syntax highlighting with line numbers
- Rationale: ELT skills and other structured prompts (5-slide decks with JSON output spec) are multi-section and long — full-screen and toolbar make editing comfortable

### Audit log
- All prompt saves write to the existing `audit_log` table
- Fields: `entity_type: 'skill_prompt'`, `entity_id: null` (file-based, no DB id), `action: 'edit'`, `actor_id: session.user.id`, `before_json: { content: oldBody }`, `after_json: { content: newBody }`
- Audit record is written inside the same transaction/operation as the file write

### Claude's Discretion
- Exact backup file naming convention (e.g., `.bak`, timestamp suffix)
- File locking implementation (e.g., advisory lock, temp-file swap)
- Visual placement of the edit button within the skill card on Skills tab
- Loading/saving state indicators inside the modal

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/dialog` — Dialog/DialogContent/DialogHeader/DialogFooter used by all existing edit modals (ActionEditModal, RiskEditModal, etc.) — use the same pattern for the prompt editor modal
- `auditLog` table in `db/schema.ts` — `entity_type`, `entity_id`, `action`, `actor_id`, `before_json`, `after_json`, `created_at` — already used extensively; prompt edits follow the same insert pattern
- `app/api/settings/route.ts` — Existing POST handler for settings updates; add `prompt_editing_enabled: boolean` field to `AppSettings` and `settingsUpdateSchema`
- `lib/settings-core.ts` — `AppSettings` interface and `readSettings()`/`writeSettings()` — add `prompt_editing_enabled` field here
- `app/customer/[id]/skills/page.tsx` — Server component already reads `readSettings()` and passes skill metadata to `SkillsTabClient`; extend to pass `promptEditingEnabled` and current user's admin status
- `requireProjectRole()` — RBAC guard from Phase 58; admin-only API route for writing prompt files uses this (or `requireSession()` + role check from settings session)

### Established Patterns
- Modal pattern: `Dialog` + `DialogContent` + `DialogHeader` + `DialogTitle` + `DialogFooter` with `useState(open)` — consistent across all edit modals
- Settings write: `readSettings()` → merge → `writeSettings()` — same pattern for adding `prompt_editing_enabled`
- Audit insert: `await tx.insert(auditLog).values({ entity_type, action, actor_id, before_json, after_json })` inside a db transaction
- Badge colors: `bg-zinc-100 text-zinc-700` for read-only/metadata display

### Integration Points
- `lib/settings-core.ts` → `AppSettings`: Add `prompt_editing_enabled?: boolean` (default false)
- `app/api/settings/route.ts` → `settingsUpdateSchema`: Add optional `prompt_editing_enabled: z.boolean()`
- `app/customer/[id]/skills/page.tsx`: Read `settings.prompt_editing_enabled` server-side, pass as prop to `SkillsTabClient`
- New API route: `app/api/skills/[skillName]/prompt/route.ts` — GET (read file), PATCH (write file + audit log); admin-only
- `SkillsTabClient.tsx`: Conditionally render edit button per skill card when `promptEditingEnabled && isAdmin`

</code_context>

<specifics>
## Specific Ideas

- ELT skills (`elt-external-status`, `elt-internal-status`) produce 5-slide JSON decks converted to `.pptx` — their prompts specify slide structure, tone, and JSON output schema. These are the primary motivation for the enhanced editor with full-screen mode.
- The locked front-matter shown in the editor header should be visually distinct (gray/dimmed, with a lock icon or "read-only" label) so it's obvious why those fields can't be clicked

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 64-editable-prompts-ui*
*Context gathered: 2026-04-15*
