# Phase 64: Editable Prompts UI - Research

**Researched:** 2026-04-15
**Domain:** CodeMirror editor integration, atomic filesystem writes, admin RBAC in Next.js RSC, audit logging
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Global toggle placement**
- Toggle lives on the **Settings page** (existing settings UI), alongside other app-wide admin controls
- Non-admins never see the toggle — it is admin-only, enforced at the settings route level
- Default: off — prompt editing is disabled until explicitly enabled

**Front-matter in the editor**
- The YAML front-matter block (Phase 63 fields: `label`, `description`, `input_required`, `input_label`, `schedulable`, `error_behavior`) is **locked and read-only** in the edit modal
- Only the prompt body below the second `---` delimiter is editable
- Rationale: front-matter drives Skills tab metadata — accidental edits could break skill labels, scheduling flags, and error handling

**Pre-save flow**
- Validation (Design Standard schema check) runs on save
- If validation passes → file written atomically with backup created automatically
- No intermediate diff confirmation step — the audit log records before/after for post-hoc review
- If validation fails → inline error shown in modal, save blocked

**Editor — CodeMirror features**
- **Enhanced editor**: full-screen toggle, resize handle, markdown toolbar (bold, italic, code, heading shortcuts)
- Markdown syntax highlighting with line numbers
- Rationale: ELT skills and other structured prompts (5-slide decks with JSON output spec) are multi-section and long — full-screen and toolbar make editing comfortable

**Audit log**
- All prompt saves write to the existing `audit_log` table
- Fields: `entity_type: 'skill_prompt'`, `entity_id: null` (file-based, no DB id), `action: 'edit'`, `actor_id: session.user.id`, `before_json: { content: oldBody }`, `after_json: { content: newBody }`
- Audit record is written inside the same transaction/operation as the file write

### Claude's Discretion
- Exact backup file naming convention (e.g., `.bak`, timestamp suffix)
- File locking implementation (e.g., advisory lock, temp-file swap)
- Visual placement of the edit button within the skill card on Skills tab
- Loading/saving state indicators inside the modal

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKILL-03a | Admin can enable or disable prompt editing as a global setting (default: off; preserves "prompts must not be modified" constraint when off) | Settings-core extension pattern confirmed; `AppSettings` interface + `writeSettings()` already handles partial updates atomically via tmp-file swap |
| SKILL-03b | When prompt editing is globally enabled, user can view and edit the prompt for any skill from the Skills tab UI | SkillsTabClient prop extension pattern confirmed; Dialog modal pattern established; CodeMirror `@uiw/react-codemirror` is the correct install; new API route `app/api/skills/[skillName]/prompt/route.ts` follows existing skill route structure |
</phase_requirements>

---

## Summary

Phase 64 adds admin-controlled prompt editing on top of the Phase 63 Skills Design Standard foundation. The work has five distinct layers: (1) a settings field addition, (2) a new filesystem API route, (3) a CodeMirror editor modal component, (4) conditional edit button in SkillsTabClient, and (5) audit logging. All five layers have clear analogues already in the codebase.

The main new dependency is CodeMirror via `@uiw/react-codemirror`. This is a React wrapper that handles SSR concerns itself; it requires `dynamic()` import with `ssr: false` in Next.js, consistent with the established pattern for `@xyflow/react`. The atomic write pattern is already implemented in `writeSettings()` using tmp-file + `fs.renameSync()` — the prompt API route should follow the same approach. File locking for concurrent edit protection is best achieved via the same temp-file rename strategy (POSIX atomic) rather than advisory locks, which add complexity without benefit for single-file writes in this deployment context.

Admin status propagation is well-understood: `app/customer/[id]/layout.tsx` already resolves `isProjectAdmin` via `resolveRole()` + project membership check. The skills page needs the same treatment, passing both `promptEditingEnabled` (from settings) and `isAdmin` as props to `SkillsTabClient`. The Settings page is a client component that fetches from `/api/settings` — the toggle can be added as a controlled boolean field in that fetch/update cycle, guarded by an admin check at the server route level.

**Primary recommendation:** Install `@uiw/react-codemirror` + `@codemirror/lang-markdown` + `@codemirror/theme-one-dark`, implement with `dynamic()` + `ssr: false`, split front-matter display from editable body at the `---` boundary, write atomically using tmp-file rename, and insert audit log in the same async operation as the file write (no DB transaction needed since file write is not transactional).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@uiw/react-codemirror` | ^4.x | React wrapper for CodeMirror 6 | Industry-standard React CM6 wrapper; handles SSR guard, theming, extensions API |
| `@codemirror/lang-markdown` | ^6.x | Markdown syntax highlighting + parsing | Official CM6 markdown extension; pairs with react-codemirror |
| `@codemirror/theme-one-dark` | ^6.x | Dark theme for editor | Bundled official theme; matches zinc-900 app aesthetic |
| `@codemirror/view` | ^6.x | EditorView API | Required for full-screen and custom keybindings (peer dep of react-codemirror) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@codemirror/state` | ^6.x | State management for editor content | Needed when reading value imperatively (e.g., on save) |
| `lucide-react` | already installed | Lock, Maximize2, Edit2, Save icons | Already in `package.json`; no new install |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@uiw/react-codemirror` | `@monaco-editor/react` | Monaco is VSCode-weight (3MB+), overkill for markdown editing; CM6 is ~300KB |
| `@uiw/react-codemirror` | plain `<textarea>` | No syntax highlighting, no full-screen, violates locked decision |
| tmp-file rename atomic write | `proper-lockfile` / `lockfile` | Advisory locks add complexity; POSIX rename is already used in `writeSettings()` — consistent |

**Installation:**
```bash
cd bigpanda-app && npm install @uiw/react-codemirror @codemirror/lang-markdown @codemirror/theme-one-dark @codemirror/view @codemirror/state
```

---

## Architecture Patterns

### Recommended Project Structure
```
bigpanda-app/
├── app/
│   ├── api/
│   │   └── skills/
│   │       └── [skillName]/
│   │           └── prompt/
│   │               └── route.ts        # GET + PATCH; admin-only
│   └── settings/
│       └── page.tsx                    # Add prompt_editing_enabled toggle (existing file)
├── components/
│   ├── SkillsTabClient.tsx             # Add promptEditingEnabled + isAdmin props + edit button
│   └── PromptEditModal.tsx             # New: CodeMirror modal component
├── lib/
│   └── settings-core.ts               # Add prompt_editing_enabled?: boolean to AppSettings
└── __tests__/
    └── skills/
        └── prompt-edit-api.test.ts     # Wave 0 RED stubs for SKILL-03a / SKILL-03b
```

### Pattern 1: Settings Field Extension
**What:** Add `prompt_editing_enabled?: boolean` to `AppSettings` interface and `settingsUpdateSchema`, default `false`
**When to use:** Any new app-wide boolean toggle following the established settings pattern

**Example:**
```typescript
// lib/settings-core.ts — extend AppSettings interface
export interface AppSettings {
  // ...existing fields...
  prompt_editing_enabled?: boolean;  // default: false (undefined === false)
}

export const DEFAULTS: AppSettings = {
  // ...existing defaults...
  // No explicit default needed — undefined treated as false in consumers
};
```

```typescript
// app/api/settings/route.ts — extend settingsUpdateSchema
const settingsUpdateSchema = z.object({
  // ...existing fields...
  prompt_editing_enabled: z.boolean().optional(),
});
```

### Pattern 2: Server Component Props to Client Island
**What:** Server component reads settings + session, passes primitives to client component as props
**When to use:** Any server-driven conditional rendering of admin features in client islands

```typescript
// app/customer/[id]/skills/page.tsx — extend SkillsPage
export default async function SkillsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = parseInt(id);
  const settings = await readSettings();

  // Resolve admin status (same pattern as layout.tsx)
  const session = await auth.api.getSession({ headers: await headers() });
  let isAdmin = false;
  if (session?.user) {
    if (resolveRole(session) === 'admin') {
      isAdmin = true;
    } else {
      const [member] = await db.select({ role: projectMembers.role })
        .from(projectMembers)
        .where(and(eq(projectMembers.project_id, projectId), eq(projectMembers.user_id, session.user.id)))
        .limit(1);
      isAdmin = member?.role === 'admin';
    }
  }

  return (
    <SkillsTabClient
      projectId={projectId}
      recentRuns={recentRuns}
      skills={skills}
      promptEditingEnabled={settings.prompt_editing_enabled ?? false}
      isAdmin={isAdmin}
    />
  );
}
```

### Pattern 3: Atomic File Write with Backup
**What:** Read current file → create backup → write to tmp → rename tmp to target
**When to use:** ALL filesystem writes for user-editable content; prevents partial writes and corruption

```typescript
// app/api/skills/[skillName]/prompt/route.ts — PATCH handler
import * as fsPromises from 'node:fs/promises';
import * as fs from 'node:fs';
import path from 'path';

async function writePromptAtomic(filePath: string, newContent: string): Promise<string> {
  // Read current for backup + audit before_json
  const oldContent = await fsPromises.readFile(filePath, 'utf-8');

  // Create backup with timestamp suffix (Claude's discretion: timestamp naming)
  const backupPath = `${filePath}.${Date.now()}.bak`;
  await fsPromises.writeFile(backupPath, oldContent, 'utf-8');

  // Atomic write: write to .tmp then rename (POSIX atomic)
  const tmpPath = `${filePath}.tmp.${process.pid}`;
  await fsPromises.writeFile(tmpPath, newContent, 'utf-8');
  fs.renameSync(tmpPath, filePath);  // synchronous rename = atomic on POSIX

  return oldContent;
}
```

### Pattern 4: CodeMirror with SSR Guard
**What:** Dynamic import with `ssr: false` prevents CodeMirror from rendering server-side (it uses browser APIs)
**When to use:** Any browser-only library in Next.js App Router client components

```typescript
// components/PromptEditModal.tsx
import dynamic from 'next/dynamic';
// CodeMirror uses document/window — must be dynamic with ssr:false
const CodeMirrorEditor = dynamic(
  () => import('./CodeMirrorEditor'),
  { ssr: false, loading: () => <div className="h-64 bg-zinc-50 rounded animate-pulse" /> }
);
```

```typescript
// components/CodeMirrorEditor.tsx — thin wrapper (client-only)
'use client';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

interface Props {
  value: string;
  onChange: (value: string) => void;
  isFullScreen?: boolean;
}

export default function CodeMirrorEditor({ value, onChange, isFullScreen }: Props) {
  return (
    <CodeMirror
      value={value}
      height={isFullScreen ? '80vh' : '400px'}
      extensions={[markdown()]}
      theme={oneDark}
      onChange={onChange}
      basicSetup={{ lineNumbers: true, foldGutter: false }}
    />
  );
}
```

### Pattern 5: Audit Log Insert (no DB transaction for file ops)
**What:** Insert audit log row immediately after successful file write; no wrapping DB transaction (file write is not transactional)
**When to use:** File-based entity edits where DB transaction cannot encompass the file write

```typescript
// After successful atomic write:
await db.insert(auditLog).values({
  entity_type: 'skill_prompt',
  entity_id: null,          // file-based, no DB id
  action: 'edit',
  actor_id: session.user.id,
  before_json: { content: oldBody },
  after_json: { content: newBody },
});
```

### Pattern 6: Design Standard Validation Before Save
**What:** Parse the prompt body + front-matter together to validate schema compliance before writing
**When to use:** All prompt saves; reuse the `parseSkillMeta` logic from `skills/page.tsx`

The front-matter is locked/read-only in the UI but must still be included when reassembling the file for write. The PATCH handler receives only the new body; it reads the existing front-matter from the file, prepends it, validates the assembled file against the Design Standard schema, then writes if valid.

```typescript
// Reconstruct full file content from immutable front-matter + new body
function extractFrontMatter(content: string): { frontMatter: string; body: string } {
  if (!content.startsWith('---')) return { frontMatter: '', body: content };
  const match = content.match(/^(---\n[\s\S]*?\n---)\n?([\s\S]*)$/);
  if (!match) return { frontMatter: '', body: content };
  return { frontMatter: match[1], body: match[2] };
}
```

### Anti-Patterns to Avoid
- **Wrapping file writes in Drizzle transactions:** Drizzle transactions are DB-only; don't attempt to wrap `fs.writeFile` inside `db.transaction()`. Write file first, then insert audit log as a separate awaited call.
- **Importing CodeMirror in a Server Component:** Always use `dynamic()` with `ssr: false`. CM6 uses `window` and `document` — direct RSC imports will crash the build.
- **Passing admin status from client-side session:** The client cannot be trusted for admin checks. Always resolve `isAdmin` server-side in the Server Component and pass as a prop.
- **Writing the full SKILL.md through a generic file write endpoint:** The prompt API route must reconstruct the full file from (immutable front-matter) + (new body) — never allow the client to send the full file content including front-matter, which could be tampered.
- **Opening the editor without checking `promptEditingEnabled` server-side:** The API route must independently verify the setting; client-side flag alone is not a security boundary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Syntax highlighting | Custom regex highlighter | `@codemirror/lang-markdown` | CM6 uses incremental parsing with tree-sitter grammar; handles nested fences, front-matter, etc. |
| Full-screen modal | CSS position:fixed hacks in Dialog | `DialogContent` with `max-w-[95vw] h-[90vh]` + controlled `isFullScreen` state | Radix Dialog already handles focus trap, scroll lock, portal rendering |
| Toolbar button shortcuts | Manual keydown listeners | CodeMirror `keymap` extension + `indentWithTab` from `@codemirror/commands` | Built-in command dispatch handles selection range awareness correctly |
| Backup naming with collision avoidance | UUID generator | `Date.now()` timestamp in filename | Sufficient for single-process concurrent safety; UUID adds no value here |

**Key insight:** CodeMirror 6 is significantly more complex than its v5 predecessor — the extension system, state management, and command dispatch have non-obvious behavior that makes hand-rolling equivalent functionality take 10-20x longer than using the library.

---

## Common Pitfalls

### Pitfall 1: CodeMirror Controlled vs Uncontrolled Mode
**What goes wrong:** Using CodeMirror in "controlled" mode (passing `value` + `onChange`) with React state causes cursor jumps on every keystroke because the state is serialized through React.
**Why it happens:** CodeMirror has its own internal state machine. When `value` prop changes from outside, it triggers a full document replacement, resetting the cursor.
**How to avoid:** Use CodeMirror in **uncontrolled** mode with `defaultValue` for initial load; only read the editor value on save (via `onChange` buffering to a ref, not state). Alternatively, use `@uiw/react-codemirror`'s built-in `onChange` callback which fires only when editor content changes — not on prop updates.
**Warning signs:** Cursor jumping to end of document on every keystroke; laggy typing experience.

### Pitfall 2: Front-Matter Reconstruction Divergence
**What goes wrong:** The PATCH route reads `newBody` from the request and the existing `frontMatter` from the file, but whitespace handling in the reconstruction (number of newlines between `---` and body) causes the front-matter parser in `skills/page.tsx` to fail on re-read.
**Why it happens:** The regex in `parseSkillMeta` matches `^---\n([\s\S]*?)\n---` — the body must be separated from the second `---` by exactly one newline.
**How to avoid:** When reconstructing: `${frontMatter}\n${newBody.trimStart()}` — ensure one clean newline between delimiter and body.
**Warning signs:** Skills showing as non-compliant immediately after a valid edit.

### Pitfall 3: Settings Page Admin Guard — Client vs Route Level
**What goes wrong:** The Settings page (`app/settings/page.tsx`) is a client component that fetches `/api/settings`. If `prompt_editing_enabled` toggle visibility is gated only in the client component, a non-admin can craft a POST request to toggle it.
**Why it happens:** Client-side rendering of admin-only controls is UI convenience, not a security boundary.
**How to avoid:** The POST `/api/settings` route must check `resolveRole(session) === 'admin'` before accepting `prompt_editing_enabled` updates. The GET response can include it for all authenticated users (read-only exposure is fine).
**Warning signs:** Non-admin user can POST `{ prompt_editing_enabled: true }` and get `{ ok: true }`.

### Pitfall 4: Backup File Accumulation
**What goes wrong:** Each save creates a `.bak` file in the skills directory. After many edits, the skills directory fills with backup files. The `loadSkills()` function in `skills/page.tsx` already filters for `.md` files only, but the backup files remain.
**Why it happens:** No cleanup mechanism is implemented.
**How to avoid:** Name backup files with a `.bak` extension (not `.md`) — they're already excluded from the skills loader. Optionally: keep only the last N backups per skill file (implementation in Claude's discretion).
**Warning signs:** Skills directory has dozens of `.bak` files; disk space warnings.

### Pitfall 5: Validation Runs Against Full File, Not Just Body
**What goes wrong:** Validation runs against only the `newBody` text, which doesn't contain the front-matter — causing validation to always fail because the front-matter fields are absent.
**Why it happens:** The `parseSkillMeta` function expects the full file content starting with `---`.
**How to avoid:** Before validation, reconstruct the full file content: `${frontMatter}\n${newBody}` — then pass that to the validation logic.
**Warning signs:** Every save attempt fails with "front-matter missing or invalid" even when the body is valid.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Audit Log Insert Pattern
```typescript
// Source: bigpanda-app/app/api/tasks/[id]/route.ts (lines 70-81)
await db.transaction(async (tx) => {
  await tx.update(tasks).set(patch).where(eq(tasks.id, taskId))
  const [afterFull] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
  await tx.insert(auditLog).values({
    entity_type: 'task',
    entity_id: taskId,
    action: 'update',
    actor_id: 'default',   // NOTE: Phase 64 must use session.user.id
    before_json: beforeFull as Record<string, unknown>,
    after_json: afterFull as Record<string, unknown>,
  })
})
// For file-based entities: omit db.transaction() wrapper; insert audit separately
```

### Existing Atomic Write Pattern (settings-core.ts)
```typescript
// Source: bigpanda-app/lib/settings-core.ts (lines 118-120)
const tempPath = `${settingsPath}.tmp.${process.pid}`;
await fsPromises.writeFile(tempPath, json, 'utf-8');
fs.renameSync(tempPath, settingsPath);  // atomic on POSIX
// Backup pattern: add before this block:
// await fsPromises.writeFile(`${settingsPath}.${Date.now()}.bak`, currentContent, 'utf-8');
```

### Existing Dialog Modal Pattern
```typescript
// Source: bigpanda-app/components/ActionEditModal.tsx (lines 1-46)
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'

export function ActionEditModal({ action, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ...
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Edit Prompt</DialogTitle></DialogHeader>
        {/* editor content */}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Front-Matter Parse (existing, from skills/page.tsx)
```typescript
// Source: bigpanda-app/app/customer/[id]/skills/page.tsx (lines 37-45)
if (!content.startsWith('---')) return stub;
const match = content.match(/^---\n([\s\S]*?)\n---/);
if (!match) return stub;
const frontMatter = match[1];
// For Phase 64 body extraction:
const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
const body = bodyMatch ? bodyMatch[1] : content;
```

### resolveRole + isAdmin propagation (from layout.tsx)
```typescript
// Source: bigpanda-app/app/customer/[id]/layout.tsx (lines 33-52)
const session = await auth.api.getSession({ headers: await headers() })
let isProjectAdmin = false
if (session?.user) {
  if (resolveRole(session) === 'admin') {
    isProjectAdmin = true
  } else {
    const [member] = await db.select({ role: projectMembers.role })
      .from(projectMembers)
      .where(and(eq(projectMembers.project_id, projectId), eq(projectMembers.user_id, session.user.id)))
      .limit(1)
    isProjectAdmin = member?.role === 'admin'
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CodeMirror 5 (jQuery-era) | CodeMirror 6 (functional, modular) | 2021 | CM6 uses extensions API; imports are `@codemirror/*` packages, not monolithic `codemirror` |
| `@uiw/react-codemirror` v3 | v4 (CM6 native) | 2022 | v4 is required for CM6; v3 wraps CM5 |
| `marked` / `remark` for markdown display | `react-markdown` (already installed) | — | `react-markdown` already in `package.json`; front-matter display can use it |

**Deprecated/outdated:**
- `codemirror` (v5 monolithic package): Do not install this — use `@uiw/react-codemirror` which brings CM6 as a peer dep
- `react-ace` / `brace`: Ace editor is legacy; CM6 has better performance and bundle splitting

---

## Open Questions

1. **Concurrent edit safety across multiple browser tabs**
   - What we know: tmp-file rename is atomic at the OS level; backup is created before write
   - What's unclear: If two admins have the modal open simultaneously, the second save silently wins (no last-write-wins warning)
   - Recommendation: Accept last-write-wins for v7.0 (the backup captures the overwritten version); add optimistic concurrency (etag) in a future phase if needed

2. **Settings page admin guard: is `requireSession()` sufficient or must it be `resolveRole === 'admin'`?**
   - What we know: The current Settings POST uses `requireSession()` only (any authenticated user can POST)
   - What's unclear: Whether Phase 64 should add an admin role check to the full Settings POST or only to the `prompt_editing_enabled` field
   - Recommendation: Add a targeted check — if `prompt_editing_enabled` is present in the request body, verify `resolveRole(session) === 'admin'`; other settings fields remain unrestricted (existing behavior)

3. **`@uiw/react-codemirror` exact version compatibility with React 19**
   - What we know: `@uiw/react-codemirror` v4.x supports React 16-18 per its README
   - What's unclear: React 19 compatibility (project uses `react: 19.2.4`)
   - Recommendation: Install and check for peer dep warnings; if incompatible, use `--legacy-peer-deps` (common for CM packages) or wrap in `'use client'` with `suppressHydrationWarning`

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run __tests__/skills/` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-03a | `prompt_editing_enabled` field persists through `readSettings()`/`writeSettings()` round-trip | unit | `npx vitest run __tests__/skills/prompt-settings.test.ts` | Wave 0 |
| SKILL-03a | Settings POST rejects `prompt_editing_enabled` update from non-admin session | unit | `npx vitest run tests/skills/prompt-edit-api.test.ts` | Wave 0 |
| SKILL-03b | GET `/api/skills/[skillName]/prompt` returns `{ frontMatter, body }` split correctly | unit | `npx vitest run tests/skills/prompt-edit-api.test.ts` | Wave 0 |
| SKILL-03b | PATCH `/api/skills/[skillName]/prompt` writes atomically and inserts audit log row | unit | `npx vitest run tests/skills/prompt-edit-api.test.ts` | Wave 0 |
| SKILL-03b | PATCH rejects save when Design Standard validation fails | unit | `npx vitest run tests/skills/prompt-edit-api.test.ts` | Wave 0 |
| SKILL-03b | Front-matter body extraction regex handles files with/without trailing newline | unit | `npx vitest run __tests__/skills/front-matter-strip.test.ts` | Extend existing ✅ |

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run __tests__/skills/ tests/skills/`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `__tests__/skills/prompt-settings.test.ts` — covers SKILL-03a settings field round-trip + admin guard
- [ ] `tests/skills/prompt-edit-api.test.ts` — covers SKILL-03b GET/PATCH route behaviors (4 stubs)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `bigpanda-app/lib/settings-core.ts` — settings write pattern confirmed
- Direct codebase inspection: `bigpanda-app/app/api/tasks/[id]/route.ts` — audit log insert pattern confirmed
- Direct codebase inspection: `bigpanda-app/app/customer/[id]/layout.tsx` — admin resolution pattern confirmed
- Direct codebase inspection: `bigpanda-app/app/customer/[id]/skills/page.tsx` — front-matter parser confirmed
- Direct codebase inspection: `bigpanda-app/components/ActionEditModal.tsx` — dialog modal pattern confirmed
- Direct codebase inspection: `bigpanda-app/package.json` — confirmed CodeMirror NOT yet installed
- Direct codebase inspection: `bigpanda-app/vitest.config.ts` — test framework configuration confirmed

### Secondary (MEDIUM confidence)
- `@uiw/react-codemirror` npm package documentation — React wrapper API, SSR behavior, `dynamic()` requirement
- CodeMirror 6 official docs — `@codemirror/lang-markdown` extension API

### Tertiary (LOW confidence)
- React 19 compatibility with `@uiw/react-codemirror` v4 — flagged as Open Question; requires validation at install time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — CodeMirror v6 + `@uiw/react-codemirror` is the definitive React CM6 wrapper; no alternatives needed
- Architecture: HIGH — all patterns derived from existing working code in the codebase; no speculation
- Pitfalls: HIGH — CodeMirror controlled/uncontrolled pitfall and front-matter reconstruction are concrete failure modes observed in CM6 integrations; settings admin guard is verified against actual route code

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable libraries; CodeMirror 6 and `@uiw/react-codemirror` have stable APIs)
