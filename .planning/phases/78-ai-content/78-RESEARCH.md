# Phase 78: AI & Content - Research

**Researched:** 2026-04-23
**Domain:** Skill infrastructure extension, DOCX/PPTX inline preview, XSS hardening for react-markdown
**Confidence:** HIGH

## Summary

Phase 78 delivers three largely independent features that share the skill/output surface: (1) a new Meeting Prep skill using the fully established BullMQ + SKILL.md + skill_runs pipeline, (2) inline previews in the Outputs Library for markdown, DOCX, and PPTX outputs, and (3) XSS hardening of all react-markdown render sites.

The skill infrastructure is mature. Adding Meeting Prep requires only a new `skills/meeting-prep.md` file (runtime auto-discovery picks it up), a meeting-prep-specific context builder that queries tasks and actions with date-based filters, and a Copy button wired into the existing `SkillRunPage`. No new infrastructure is needed. The key gap is that `WorkspaceData` (returned by `getWorkspaceData`) does NOT include tasks — the Meeting Prep context must call `getTasksForProject` separately and filter in application code.

The Outputs Library today only handles HTML (via iframe). Extending it to markdown, DOCX, and PPTX requires replacing the single `isHtmlOutput()` boolean check with a type discriminator, then adding three new expand branches. `docx-preview` (v0.3.7) is a DOM-dependent library not currently installed; it must be loaded via `dynamic import + ssr:false`, following the identical pattern used for CodeMirror in `PromptEditModal.tsx`. `rehype-sanitize` (v6.0.0) is also not installed; it is a two-line addition (`import rehypeSanitize from 'rehype-sanitize'` + `rehypePlugins={[rehypeSanitize]}`) to both `SkillRunPage` and `ChatMessage.tsx`.

**Primary recommendation:** Implement in three distinct plans: (1) Meeting Prep skill + context builder + Copy button, (2) Outputs Library preview extension, (3) XSS hardening. Plans 1 and 3 can run in parallel; Plan 2 is independent.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Meeting Prep — Input Mode**
- `input_required: false` — optional notes field, not required
- `input_label: "Meeting focus or attendees"` — prompts user to optionally specify topic or attendees
- `schedulable: false` — on-demand only; a scheduled meeting prep brief doesn't make semantic sense
- Appears as a regular skill card in the existing skill grid (no new section or grouping)

**Meeting Prep — Brief Content**
- Open items: Tasks not done + actions not closed/completed (two entity types only — no milestones or risks)
- Recent activity: Completed tasks + closed actions from the last 7 days
- Suggested agenda: AI-derived from open items + any optional user-provided notes field input
- Scope: Tasks + actions only — no milestone status, health badge, or risk context in the brief

**Outputs Library — Preview Surface**
- Inline in-row expand, consistent with the existing HTML iframe pattern (`expandedId` toggle in `app/outputs/page.tsx`)
- Click the row → content panel expands below; click again to collapse
- DOCX preview panel: fixed `h-[500px]` with `overflow-y-auto` scroll — matches the HTML iframe pattern
- PPTX outputs: no inline render; show slide count badge + Download button in the row (not Open in app)
- Slide count requires server-side PPTX parsing (acceptable for this phase)

**Copy Button — Skill Run Page**
- Copies plain text (markdown stripped) — suitable for pasting into email, Excel, or any non-markdown surface
- Positioned at top-right of the output box (standard code-block copy position)
- Visible only when `status === 'done'` — consistent with the existing 'Open in app' button gate
- Feedback: button text changes to `'Copied!'` for 2 seconds, then resets — no toast

**XSS Hardening**
- `rehype-sanitize` added to all `ReactMarkdown` instances: `SkillRunPage` (`app/customer/[id]/skills/[runId]/page.tsx`) and `ChatMessage.tsx`
- Claude's discretion on exact sanitize config (default schema is sufficient unless specific elements need whitelisting)

### Claude's Discretion
- Markdown-to-plain-text conversion approach (e.g., strip via regex vs. a library like `remark-strip-markdown` — whichever is cleaner without adding heavy deps)
- PPTX slide count parsing approach (e.g., unzip + count `ppt/slides/slide*.xml` entries — no heavy library needed)
- `docx-preview` dynamic import + `ssr:false` pattern (already confirmed as correct pattern for DOM-dependent libraries per CodeMirror precedent)
- Exact Meeting Prep DB query structure (JOIN shape for tasks + actions filtered by project_id)
- Meeting Prep prompt wording and output structure (structured markdown brief is the output format)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKILL-01 | User can trigger Meeting Prep from the Skills tab (as a standard skill entry, using the existing skill execution infrastructure) | New `skills/meeting-prep.md` with correct YAML front-matter is auto-discovered by `loadSkills()` in `app/customer/[id]/skills/page.tsx`. No code registration needed. |
| SKILL-02 | Meeting Prep brief includes open items, recent activity, and a suggested agenda derived from live project data | Requires a meeting-prep-specific context builder that queries `tasks` (via `getTasksForProject`) and `actions` (via `getWorkspaceData` or direct query) with status/date filters, then injects as skill context. |
| SKILL-03 | Meeting Prep output is rendered inline and copyable to clipboard | Copy button slotted into `SkillRunPage` output box header; `navigator.clipboard.writeText()` with markdown-stripped plain text; visible only when `status === 'done'`. |
| SKILL-04 | Meeting Prep prompt is editable via the existing Admin > Prompts UI (inherited from skill infrastructure) | Zero implementation needed — `GET/PATCH /api/skills/[skillName]/prompt` already works for any SKILL.md file. Editing appears automatically for admin users when `prompt_editing_enabled` is set. |
| OUT-01 | User can view an inline preview of a skill output (markdown outputs rendered as formatted text; DOCX outputs rendered via docx-preview) | Replace `isHtmlOutput()` boolean with output type discriminator; add markdown (ReactMarkdown) and DOCX (`docx-preview` via dynamic import + `ssr:false`) expand branches to `app/outputs/page.tsx`. |
| OUT-02 | PPTX outputs show slide count and a download link (no inline render) | Server-side PPTX slide count via unzip + count `ppt/slides/slide*.xml` entries; new `/api/outputs/[id]/slide-count` route; slide count badge + Download button rendered in the output row. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | 10.1.0 (installed) | Render markdown strings to React | Already used in SkillRunPage and ChatMessage |
| rehype-sanitize | 6.0.0 (to install) | XSS-safe HTML sanitization plugin for rehype | Official rehype ecosystem; two-line integration |
| docx-preview | 0.3.7 (to install) | Render DOCX binary to HTML in a DOM container | Only viable client-side DOCX renderer without legacy deps; single dependency (jszip) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/dynamic | built-in (Next.js 16) | Lazy-load DOM-dependent modules with `ssr:false` | Required for docx-preview (accesses DOM at import time) |
| jszip | transitive via docx-preview | ZIP parsing (docx/pptx are ZIP containers) | Needed for PPTX slide count — already available as docx-preview dep |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rehype-sanitize (default schema) | Custom allowlist | Default schema is sufficient for markdown output; custom allowlist only needed if skills output specific HTML tags that should be preserved |
| regex markdown strip for plain text | remark-strip-markdown | Regex is lighter (no new dep); remark-strip-markdown handles edge cases better but adds a dep. Regex is the right call here per CONTEXT.md guidance. |
| Server-side PPTX parse (unzip approach) | pptxgenjs or python bridge | Unzip + count `ppt/slides/slide*.xml` is ~10 lines of Node.js using jszip (already a transitive dep); no additional library needed |

**Installation:**
```bash
cd /Users/jmiloslavsky/Documents/Panda-Manager && npm install docx-preview rehype-sanitize
```

---

## Architecture Patterns

### Recommended Project Structure

New files this phase:
```
skills/
└── meeting-prep.md              # New SKILL.md (auto-discovered)

lib/
└── meeting-prep-context.ts      # New context builder for Meeting Prep (tasks + actions)

app/
└── api/outputs/[id]/
    └── slide-count/
        └── route.ts             # New: server-side PPTX slide count
```

Modified files:
```
app/customer/[id]/skills/[runId]/page.tsx   # Add Copy button + rehype-sanitize
components/chat/ChatMessage.tsx             # Add rehype-sanitize
app/outputs/page.tsx                        # Extend output type discriminator + preview branches
lib/skill-orchestrator.ts                   # Add meeting-prep branch (calls meeting-prep context builder)
```

### Pattern 1: SKILL.md Auto-Discovery (HIGH confidence)

**What:** Drop a `.md` file in `skills/` with correct YAML front-matter. `loadSkills()` in the Skills page server component picks it up automatically on every request (no caching, hot-reload by design).

**When to use:** Every new user-facing skill.

**Meeting Prep front-matter:**
```yaml
---
label: Meeting Prep
description: Generate a structured meeting brief from open items and recent activity
input_required: false
input_label: "Meeting focus or attendees"
schedulable: false
error_behavior: retry
---
```
Source: `skills/SKILLS-DESIGN-STANDARD.md` + `app/customer/[id]/skills/page.tsx` `loadSkills()`.

### Pattern 2: Skill-Specific Context Builder (HIGH confidence)

**What:** For skills needing data not in `buildSkillContext` (e.g., tasks), a per-skill branch in `SkillOrchestrator.run()` calls an alternate context builder, just like `buildTeamsSkillContext` for `team-engagement-map` and `buildArchSkillContext` for `workflow-diagram`.

**When to use:** Skill needs a different data slice than the standard workspace context.

**Example pattern (from existing skill-orchestrator.ts):**
```typescript
// Source: lib/skill-orchestrator.ts lines 69-79
if (params.skillName === 'team-engagement-map') {
  skillSpecificContext = await buildTeamsSkillContext(params.projectId);
} else if (params.skillName === 'workflow-diagram') {
  skillSpecificContext = await buildArchSkillContext(params.projectId);
}
// Add:
} else if (params.skillName === 'meeting-prep') {
  skillSpecificContext = await buildMeetingPrepContext(params.projectId, params.input);
}
```

**Critical:** `WorkspaceData` (returned by `getWorkspaceData`) does NOT include tasks. Tasks require `getTasksForProject(projectId)` from `lib/queries.ts`. The Meeting Prep context builder must call both independently.

### Pattern 3: dynamic import + ssr:false for DOM-dependent libraries (HIGH confidence)

**What:** Next.js `dynamic()` with `ssr: false` prevents DOM-dependent modules from running during server-side rendering.

**When to use:** Any library that accesses `document`, `window`, or DOM APIs at import time.

**Example (from existing PromptEditModal.tsx):**
```typescript
// Source: components/PromptEditModal.tsx lines 10-16
const CodeMirrorEditor = dynamic(
  () => import('./CodeMirrorEditor'),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-zinc-800 rounded animate-pulse" />
  }
);
```

Apply identical pattern for a `DocxPreview` wrapper component that calls `docx-preview`'s `renderAsync()`.

### Pattern 4: Output Row Type Discriminator (HIGH confidence)

**What:** Current `isHtmlOutput()` in `app/outputs/page.tsx` is a boolean. Replace with a `getOutputType()` function returning `'html' | 'markdown' | 'docx' | 'pptx' | 'file'`.

**Detection logic:**
```typescript
// Source: app/outputs/page.tsx (current isHtmlOutput pattern, to be extended)
function getOutputType(o: OutputRow): 'html' | 'markdown' | 'docx' | 'pptx' | 'file' {
  if (o.skill_name.includes('html') || o.filename?.endsWith('.html')) return 'html';
  if (o.filename?.endsWith('.docx')) return 'docx';
  if (o.filename?.endsWith('.pptx')) return 'pptx';
  if (!o.filename || o.content) return 'markdown'; // content-bearing, no file extension
  return 'file';
}
```

### Pattern 5: rehype-sanitize with react-markdown (HIGH confidence)

**What:** Add `rehypeSanitize` to the `rehypePlugins` prop on any `<ReactMarkdown>` instance.

**Usage (two-line change per site):**
```typescript
// Source: rehype-sanitize v6 README + react-markdown v10 docs
import rehypeSanitize from 'rehype-sanitize';
// ...
<ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
```

**Default schema** (`defaultSchema` from `hast-util-sanitize`) blocks all `<script>`, event handlers (`onclick`, etc.), dangerous URLs (`javascript:`), and non-standard attributes. Suitable for markdown skill outputs and chat messages without any custom config.

### Pattern 6: Plain Text Copy from Markdown (HIGH confidence — no new dep)

**What:** Strip markdown syntax to produce pasted-friendly plain text. Regex approach is sufficient for typical skill output (headers, bullets, bold, code blocks).

**Implementation:**
```typescript
// No dep needed — regex strip covers 99% of Meeting Prep output patterns
function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')          // headers
    .replace(/\*\*(.+?)\*\*/g, '$1')      // bold
    .replace(/\*(.+?)\*/g, '$1')          // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '')   // inline code / code blocks
    .replace(/^\s*[-*+]\s+/gm, '- ')     // bullets normalized
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
    .trim();
}
```

### Pattern 7: PPTX Slide Count via jszip (HIGH confidence)

**What:** PPTX files are ZIP archives. Count `ppt/slides/slide*.xml` entries without parsing content.

**Implementation (server-side route handler):**
```typescript
import JSZip from 'jszip'; // transitive dep via docx-preview — no separate install needed
// ...
const zip = await JSZip.loadAsync(fileBuffer);
const slideCount = Object.keys(zip.files).filter(name =>
  /^ppt\/slides\/slide\d+\.xml$/.test(name)
).length;
```

### Anti-Patterns to Avoid

- **Importing docx-preview at module level in a Next.js page:** Causes SSR build failure. Always use `dynamic(() => import(...), { ssr: false })`.
- **Rendering markdown during streaming:** The existing SkillRunPage correctly shows raw `<pre>` during streaming and only calls ReactMarkdown after `status === 'done'`. Do not change this.
- **Adding tasks to `getWorkspaceData`:** The `WorkspaceData` interface and its callers are stable. Add tasks only to the Meeting Prep context builder, not globally.
- **Prompt injection in Meeting Prep context:** User-provided `input_label` field must be escaped before interpolating into the context string. Use `input?.replace(/[<>]/g, '')` or equivalent at injection time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOCX rendering | Custom DOCX→HTML parser | `docx-preview` | DOCX format is complex (OOXML); custom parsers miss styles, tables, images |
| Markdown XSS sanitization | Custom attribute filter | `rehype-sanitize` (default schema) | hast-util-sanitize covers 100+ attack vectors including mXSS; custom filters miss edge cases |
| ZIP parsing for PPTX slide count | Shell exec / child_process | `jszip` (already transitive dep) | jszip is already available via docx-preview; no exec needed |

**Key insight:** All three "don't hand-roll" items have established, actively maintained solutions that integrate in < 10 lines each.

---

## Common Pitfalls

### Pitfall 1: docx-preview accesses DOM at import time
**What goes wrong:** Importing `docx-preview` at module level causes `ReferenceError: document is not defined` during Next.js server-side rendering.
**Why it happens:** `docx-preview` calls `document.createElement` at import time to initialize its rendering surface.
**How to avoid:** Always wrap in `dynamic(() => import('docx-preview'), { ssr: false })`. Create a thin wrapper component (`DocxPreview.tsx`) that accepts a `Blob` or `ArrayBuffer` and calls `renderAsync` in a `useEffect`.
**Warning signs:** Build error `ReferenceError: document is not defined` in the outputs page.

### Pitfall 2: docx-preview requires a DOM container ref, not a React state
**What goes wrong:** Calling `renderAsync(blob, container)` before the container div is mounted results in `null` reference errors.
**Why it happens:** `renderAsync` is imperative — it writes HTML directly into a DOM node. It must be called inside `useEffect` after the ref is attached.
**How to avoid:**
```typescript
const containerRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (containerRef.current && blob) {
    renderAsync(blob, containerRef.current, undefined, { inWrapper: false });
  }
}, [blob]);
```

### Pitfall 3: Tasks absent from WorkspaceData — Meeting Prep context will be incomplete
**What goes wrong:** If Meeting Prep context builder naively calls `buildSkillContext`, the brief will have no task data (only actions, risks, milestones, etc. are in `WorkspaceData`).
**Why it happens:** `getWorkspaceData` was built for the original workspace context and never included tasks. Tasks have their own `getTasksForProject` query.
**How to avoid:** `buildMeetingPrepContext` must call `getTasksForProject(projectId)` directly, in parallel with actions from `getWorkspaceData`, then filter:
- Open tasks: `status !== 'done' && status !== 'cancelled'`
- Open actions: `status !== 'completed' && status !== 'cancelled'`
- Recent completed tasks: `status === 'done'` AND `created_at >= 7 days ago` (note: tasks have no `updated_at`; use `created_at` per Phase 77 precedent)
- Recent closed actions: `status === 'completed'` AND `created_at >= 7 days ago`

### Pitfall 4: Markdown-to-plain-text strips too aggressively (headers become blank lines)
**What goes wrong:** Regex strips header markers but leaves content; adjacent blank lines make the plain text hard to read.
**Why it happens:** Simple regex doesn't handle surrounding whitespace after stripping.
**How to avoid:** Add `.replace(/\n{3,}/g, '\n\n').trim()` at the end of `stripMarkdown` to collapse excessive blank lines.

### Pitfall 5: Outputs Library row click handler needs type-aware gate
**What goes wrong:** Current `onClick` fires `setExpandedId` only for HTML rows (`isHtmlOutput(output) && setExpandedId(...)`). If this is not updated, markdown/DOCX rows won't expand.
**Why it happens:** The onClick guard uses the old `isHtmlOutput` boolean.
**How to avoid:** Replace guard with `getOutputType(output) !== 'file' && getOutputType(output) !== 'pptx'` so all previewable types respond to row click.

### Pitfall 6: PPTX slide count fetch blocking the row render
**What goes wrong:** If slide count is fetched eagerly for all PPTX rows on page load, it adds N sequential requests that delay the initial render.
**Why it happens:** PPTX rows are included in the flat `outputs` list.
**How to avoid:** Fetch slide count lazily on first expand/hover, or only when `expandedId === output.id` for PPTX rows. Since PPTX has no inline render, the slide count badge can be fetched on row mount with a lightweight `useEffect` per PPTX row, or computed server-side and stored in the `outputs` table if this becomes a performance concern.

---

## Code Examples

### Meeting Prep SKILL.md (complete)
```markdown
---
label: Meeting Prep
description: Generate a structured meeting brief from open items and recent activity
input_required: false
input_label: "Meeting focus or attendees"
schedulable: false
error_behavior: retry
---

# Meeting Prep Skill

You are an expert PS consultant preparing a meeting brief.
Given the project's open tasks, open actions, and recent activity from the last 7 days,
generate a structured meeting brief with:

## Open Items
List all open tasks and open actions that need attention, grouped by type.

## Recent Activity (Last 7 Days)
Summarize tasks completed and actions closed in the last 7 days.

## Suggested Agenda
Based on the open items and any notes provided, suggest a focused meeting agenda with 3-5 agenda items.

Be concise and action-oriented. Format as clean markdown.
```

### rehype-sanitize addition to ReactMarkdown (both sites)
```typescript
// Source: rehype-sanitize v6.0.0 README
import rehypeSanitize from 'rehype-sanitize';

// In SkillRunPage (app/customer/[id]/skills/[runId]/page.tsx):
<ReactMarkdown rehypePlugins={[rehypeSanitize]}>{output}</ReactMarkdown>

// In ChatMessage.tsx:
<ReactMarkdown rehypePlugins={[rehypeSanitize]}>{textContent}</ReactMarkdown>
```

### docx-preview dynamic wrapper component
```typescript
// components/DocxPreview.tsx
'use client';
import { useEffect, useRef } from 'react';

interface DocxPreviewProps {
  url: string; // URL to fetch the .docx binary
}

export default function DocxPreview({ url }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const { renderAsync } = await import('docx-preview');
      const res = await fetch(url);
      const blob = await res.blob();
      if (!cancelled && containerRef.current) {
        containerRef.current.innerHTML = '';
        await renderAsync(blob, containerRef.current, undefined, { inWrapper: false });
      }
    }
    render().catch(console.error);
    return () => { cancelled = true; };
  }, [url]);

  return <div ref={containerRef} className="w-full h-full overflow-y-auto" />;
}

// In app/outputs/page.tsx — load with dynamic + ssr:false:
const DocxPreview = dynamic(() => import('@/components/DocxPreview'), {
  ssr: false,
  loading: () => <div className="h-[500px] bg-zinc-50 animate-pulse" />
});
```

### PPTX slide count route
```typescript
// app/api/outputs/[id]/slide-count/route.ts
import JSZip from 'jszip';
import { readFile } from 'fs/promises';
// ...
const zip = await JSZip.loadAsync(fileBuffer);
const slideCount = Object.keys(zip.files).filter(name =>
  /^ppt\/slides\/slide\d+\.xml$/.test(name)
).length;
return NextResponse.json({ slideCount });
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `isHtmlOutput()` boolean | Multi-type discriminator `getOutputType()` | Phase 78 | Enables markdown/DOCX/PPTX preview branches |
| ReactMarkdown without sanitize | ReactMarkdown with `rehype-sanitize` default schema | Phase 78 | Closes confirmed XSS gap in ChatMessage.tsx and SkillRunPage |

**Deprecated/outdated:**
- `isHtmlOutput()` function in `app/outputs/page.tsx`: superseded by `getOutputType()` type discriminator.

---

## Open Questions

1. **PPTX slide count storage: fetch on demand vs. persist in DB**
   - What we know: PPTX files are written to disk; filepath is stored in `outputs.filepath`
   - What's unclear: Whether slide count should be cached in the `outputs` table (avoids repeated ZIP parse) or fetched on demand
   - Recommendation: Fetch on demand via `/api/outputs/[id]/slide-count` for Phase 78 simplicity. If performance is an issue, add a `slide_count` column in a future migration.

2. **Meeting Prep: recent activity date window uses `created_at` not `updated_at`**
   - What we know: Per Phase 77 precedent (exceptions panel), tasks have no `updated_at`; `created_at` is used for staleness detection
   - What's unclear: Whether "completed in last 7 days" should use `created_at` (when row was inserted) or a completion timestamp
   - Recommendation: Use `created_at >= NOW() - INTERVAL '7 days'` combined with `status = 'done'` filter. This matches Phase 77 pattern. Flag for UAT: if a task was created long ago and completed recently, it won't appear in recent activity.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `/Users/jmiloslavsky/Documents/Panda-Manager/vitest.config.ts` |
| Quick run command | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run --reporter=verbose` |
| Full suite command | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-01 | `meeting-prep.md` is discoverable by `loadSkills()` and appears in skill grid | unit | `npx vitest run app/api/__tests__/meeting-prep-skill.test.ts -x` | ❌ Wave 0 |
| SKILL-02 | `buildMeetingPrepContext` returns open tasks, open actions, recent completed/closed items | unit | `npx vitest run lib/__tests__/meeting-prep-context.test.ts -x` | ❌ Wave 0 |
| SKILL-03 | Copy button renders when `status === 'done'`; `stripMarkdown` produces plain text | unit | `npx vitest run app/api/__tests__/meeting-prep-copy.test.ts -x` | ❌ Wave 0 |
| SKILL-04 | Admin > Prompts UI works for `meeting-prep` skill (inherited — no new test needed) | manual | Verify in browser: Admin > Prompts shows Meeting Prep | N/A |
| OUT-01 | `getOutputType()` returns correct type for html/markdown/docx/pptx/file inputs | unit | `npx vitest run app/api/__tests__/output-type-discriminator.test.ts -x` | ❌ Wave 0 |
| OUT-02 | `/api/outputs/[id]/slide-count` returns correct count for known PPTX fixture | unit | `npx vitest run app/api/__tests__/slide-count.test.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `app/api/__tests__/meeting-prep-skill.test.ts` — verifies SKILL.md parsing + discovery for SKILL-01
- [ ] `lib/__tests__/meeting-prep-context.test.ts` — verifies context query filtering (open items, recent activity) for SKILL-02
- [ ] `app/api/__tests__/meeting-prep-copy.test.ts` — verifies `stripMarkdown` pure function for SKILL-03
- [ ] `app/api/__tests__/output-type-discriminator.test.ts` — verifies `getOutputType()` discriminator for OUT-01
- [ ] `app/api/__tests__/slide-count.test.ts` — verifies PPTX slide count parsing for OUT-02

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `skills/SKILLS-DESIGN-STANDARD.md`, `lib/skill-orchestrator.ts`, `lib/skill-context.ts`, `app/customer/[id]/skills/[runId]/page.tsx`, `components/chat/ChatMessage.tsx`, `app/outputs/page.tsx`, `lib/queries.ts`, `db/schema.ts`, `components/PromptEditModal.tsx`
- npm registry — docx-preview@0.3.7, rehype-sanitize@6.0.0, react-markdown@10.1.0 (installed)

### Secondary (MEDIUM confidence)
- docx-preview GitHub README (VolodymyrBaydalka/docxjs) — `renderAsync(blob, container)` API shape and `inWrapper` option
- rehype-sanitize v6 README — `rehypePlugins={[rehypeSanitize]}` usage pattern

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against npm registry and installed versions
- Architecture: HIGH — existing patterns for dynamic import + skill branching are directly observed in codebase
- Pitfalls: HIGH — DOCX/DOM pitfall is a known Next.js SSR issue; tasks-absent-from-WorkspaceData is confirmed by direct schema inspection
- Meeting Prep context design: HIGH — confirmed tasks are absent from `getWorkspaceData`; query pattern confirmed from `getTasksForProject`

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (stable libraries, internal codebase patterns are stable)
