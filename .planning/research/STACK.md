# Technology Stack — v9.0 Additions

**Project:** BigPanda AI Project Management App
**Milestone:** v9.0 — UX Maturity & Intelligence
**Researched:** 2026-04-22
**Confidence:** HIGH

## Executive Summary

v9.0 requires **minimal new dependencies**. The existing stack handles nearly all new features. Key findings:

1. **Kanban DnD between columns:** `@dnd-kit` is already installed and sufficient. The existing `TaskBoard.tsx` has a partial implementation — it uses `DndContext` + `SortableContext` per column but is missing `onDragOver` for real-time cross-column movement and `useDroppable` on empty columns. No new package is needed — only code corrections to the existing component.

2. **Outputs Library inline preview:** Different strategies for different content types. Markdown/text content (stored in `outputs.content`) can use the already-installed `react-markdown@10.1.0`. HTML outputs already use `<iframe sandbox>` in the existing page. PPTX files require server-side slide → slide-image conversion or client-side rendering via `docx-preview`-equivalent. **`docx-preview@0.3.7`** is the right addition for DOCX preview; PPTX preview requires a distinct approach (see below).

3. **Markdown rendering safety:** `react-markdown@10.1.0` is already installed and safe by default. No new library needed; `rehype-sanitize@6.0.0` is available if additional HTML sanitization is needed, but is not required for AI-generated content rendered in a sandboxed context.

4. **Chat conversation persistence:** Pure DB schema addition (new `chat_messages` table) + Vercel AI SDK's `initialMessages` prop. No new packages.

5. **Week view grouping:** ISO week computation is achievable with native `Date` APIs or `date-fns@4.1.0`. `date-fns` is not currently in the project. For 1-2 week grouping functions, native JS is preferred to avoid adding a dependency.

6. **Stakeholder email/Slack extraction:** Extension of the existing multi-pass extraction pipeline + DB schema column additions. No new packages.

7. **AI Meeting Prep skill:** New SKILL.md file + existing Vercel AI SDK streaming pattern. No new packages.

---

## Stack Additions for v9.0

### 1. Outputs Library: DOCX Inline Preview

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **docx-preview** | ^0.3.7 | Render `.docx` files to HTML in-browser | Browser-native rendering; renders to DOM container via `renderAsync()`; ES module + CommonJS dual exports; actively maintained (v0.3.7 shipped Sept 2025); only dependency is jszip (already implicit via other packages); Apache-2.0 license |

**Rationale:** The outputs library currently only expands HTML outputs in an iframe. Skills generate `.pptx` files stored on disk (via `filepath`) and text/HTML stored in the `content` column. DOCX is a valid future upload/output format given `mammoth@1.12.0` is already installed (used in ingestion). `docx-preview` renders directly to a DOM container without server round-trips and supports fonts, page breaks, headers/footers.

**Important:** `docx-preview` uses DOM APIs and requires `dynamic import` with `ssr: false` — same pattern already established for `@xyflow/react` and CodeMirror.

**Usage pattern:**
```typescript
// components/DocxPreview.tsx (dynamic-loaded, ssr: false)
'use client'
import { useEffect, useRef } from 'react'
import { renderAsync } from 'docx-preview'

export function DocxPreview({ fileUrl }: { fileUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!containerRef.current) return
    fetch(fileUrl)
      .then(r => r.blob())
      .then(blob => renderAsync(blob, containerRef.current!))
  }, [fileUrl])
  return <div ref={containerRef} className="overflow-auto max-h-[600px]" />
}
```

**PPTX Preview:** The installed `pptxgenjs@4.0.1` is a **generator** (creates PPTX), NOT a renderer. There is no viable browser-side PPTX renderer that doesn't depend on D3/jQuery legacy stacks (e.g. `pptx2html@0.3.4` depends on jQuery/D3). For PPTX outputs in the Outputs Library, use a **"slide count + download" approach**: display slide count and a download link rather than inline rendering. This is the pragmatic choice — PPTX outputs are presentation files meant to be opened in PowerPoint/Slides, not web-previewed.

**Installation:**
```bash
npm install docx-preview
```

### 2. Markdown Rendering (already installed — NO new package)

`react-markdown@10.1.0` is already in `package.json` and is the current stable version. It is safe by default (HTML is escaped unless `rehype-raw` is explicitly added). For AI-generated skill output content stored in `outputs.content`, this is sufficient.

**No new package needed.** Pattern:
```typescript
import ReactMarkdown from 'react-markdown'
// AI-generated content is safe by default (no raw HTML injection)
<ReactMarkdown className="prose prose-sm max-w-none">{output.content}</ReactMarkdown>
```

`@tailwindcss/typography` is already installed (`^0.5.19`) — use the `prose` class for styled markdown rendering.

If untrusted HTML is ever rendered (e.g. user-uploaded content rendered inline), add `rehype-sanitize@^6.0.0` at that point. Not needed for v9.0.

---

## No New Packages Needed For These Features

### Task Board Kanban DnD Between Columns

`@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0`, and `@dnd-kit/utilities@^3.2.2` are all already installed. The existing `TaskBoard.tsx` is structurally correct but incomplete:

**What exists:**
- `DndContext` wrapping all columns
- `SortableContext` per column with `verticalListSortingStrategy`
- `useSortable` on each card
- `DragOverlay` imported but partially wired
- `onDragEnd` that attempts to find the target column from `over.id`

**What is missing (code-only fixes, no new packages):**
- `onDragOver` handler for real-time cross-column item movement (cards must visually move as you drag across columns, not just on drop)
- `useDroppable` on each column container div so empty columns accept drops
- `DragOverlay` rendering the ghost card while dragging

The `@dnd-kit` multi-container pattern (confirmed via official GitHub story `MultipleContainers.tsx`) uses exactly these primitives. No new library is needed. The fix is extending the existing `handleDragEnd` with an `onDragOver` handler that moves items between container state arrays in real-time.

**Key pattern (code guidance for implementer):**
```typescript
// onDragOver: move item to new column in real-time as user drags
function handleDragOver(event: DragOverEvent) {
  const { active, over } = event
  if (!over) return
  const activeColumn = tasks.find(t => t.id === Number(active.id))?.status
  const overColumn = COLUMNS.find(c => c.id === String(over.id))?.id
    ?? tasks.find(t => t.id === Number(over.id))?.status
  if (!activeColumn || !overColumn || activeColumn === overColumn) return
  setTasks(prev => prev.map(t =>
    t.id === Number(active.id) ? { ...t, status: overColumn } : t
  ))
}
// Add <DndContext onDragOver={handleDragOver} ...>
// Add useDroppable({ id: col.id }) on each column container
```

### Gantt Baseline Tracking (snapshot + ghost bars)

Custom `GanttChart.tsx` already handles all rendering. Baseline tracking is a **data model extension** (new `task_baselines` table) plus a UI addition (ghost bars rendered alongside real bars). No new library needed — the existing SVG/canvas rendering in `GanttChart.tsx` supports adding translucent baseline bars.

### Chat Conversation Persistence

Vercel AI SDK (`ai@^6.0.142`) already supports `initialMessages` prop on `useChat`. Persistence is a DB schema addition (`chat_messages` table with `project_id`, `role`, `content`, `created_at`) plus:
1. A GET route to load last 50 messages from DB → passed as `initialMessages`
2. A POST hook on the chat API to persist user + assistant turns after streaming completes

No new packages. Pattern uses existing `drizzle-orm` insert/select.

### AI Meeting Prep Skill

New `skills/meeting-prep.md` SKILL.md file following the established SKILLS-DESIGN-STANDARD.md YAML front-matter schema. Uses existing `skill-orchestrator.ts` + Vercel AI SDK streaming. No new library.

### Task Board Week View

Group tasks by ISO week of their `due` date. ISO week computation:
```typescript
function getISOWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = d.getDay() || 7  // Mon=1 ... Sun=7
  d.setDate(d.getDate() + 4 - dayOfWeek)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `Week ${weekNo} (${d.getFullYear()})`
}
```

`date-fns` is NOT needed for this feature — the native ISO week algorithm above is 10 lines. Adding a 400KB utility library for 2 date functions violates the "no redundant libraries" constraint.

### Stakeholder Email + Slack Handle Extraction

Extension of the existing multi-pass extraction pipeline (`document-extractor.ts`) + DB column additions (`stakeholders.email`, `stakeholders.slack_handle`). The `@anthropic-ai/sdk` tool-use API (`record_entities` pattern) already handles structured extraction. No new library.

### Owner Fields: Stakeholder Picker

Uses existing `@radix-ui/react-popover@^1.1.15` + `@radix-ui/react-select@^2.2.6` (both installed). Searchable dropdown with free-text fallback. No new library.

### Task Dependency + Milestone Link Pickers

Same pattern as stakeholder picker — uses installed Radix UI primitives + existing `tasks` and `milestones` queries. No new library.

---

## Updated Full Dependency Matrix

### Existing Dependencies — Confirmed Still Valid for v9.0

| Library | Version | v9.0 Usage |
|---------|---------|-----------|
| @dnd-kit/core | ^6.3.1 | Kanban cross-column DnD (extended) |
| @dnd-kit/sortable | ^10.0.0 | SortableContext per column + useSortable per card |
| @dnd-kit/utilities | ^3.2.2 | CSS.Transform.toString for card transform |
| react-markdown | ^10.1.0 | Outputs Library: inline markdown rendering |
| @tailwindcss/typography | ^0.5.19 | `prose` class for markdown output styling |
| ai (Vercel AI SDK) | ^6.0.142 | Chat persistence via initialMessages prop |
| @anthropic-ai/sdk | ^0.80.0 | Meeting Prep skill + stakeholder extraction |
| drizzle-orm | ^0.45.1 | chat_messages table, stakeholder column additions |
| mammoth | ^1.12.0 | Already installed; DOCX → HTML for ingestion (not outputs preview) |
| @radix-ui/react-popover | ^1.1.15 | Stakeholder/dependency picker UI |
| @radix-ui/react-select | ^2.2.6 | Owner field dropdowns |

### New Dependency for v9.0

| Library | Version | Purpose | Confidence |
|---------|---------|---------|-----------|
| **docx-preview** | ^0.3.7 | DOCX inline preview in Outputs Library | HIGH — confirmed browser-compatible, ES module, active maintenance (Sept 2025 release) |

---

## Installation

```bash
# New dependency
npm install docx-preview
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| docx-preview (DOCX) | mammoth (already installed) | mammoth converts DOCX → simplified HTML (lossy, no layout fidelity); docx-preview preserves visual document structure. Use mammoth for extraction, docx-preview for preview |
| docx-preview (DOCX) | Office Online viewer (embed URL) | Requires file to be publicly accessible online; files are stored locally on disk; privacy concern |
| Native ISO week calc (Week view) | date-fns@4.1.0 | 400KB+ dependency for 2 functions; native Date arithmetic is 10 lines and sufficient |
| Existing @dnd-kit (Kanban) | react-beautiful-dnd | Unmaintained (Atlassian deprecated in 2022); @dnd-kit is the current standard |
| Existing @dnd-kit (Kanban) | dnd-kit @dnd-kit/dom | @dnd-kit/dom is the new v2 API (breaking change from current @dnd-kit/core v6); migration not worth it for this milestone |
| "Slide count + download" (PPTX preview) | pptx2html@0.3.4 | Depends on jQuery + D3; legacy stack; v0.3.4 is last update; incompatible with modern bundlers cleanly |
| No addition (markdown) | rehype-sanitize | react-markdown is safe by default; AI-generated content does not introduce raw HTML; unnecessary for this milestone |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| date-fns | 400KB for 2 functions (ISO week, start-of-week); native Date is sufficient | Native `Date` arithmetic (10-line ISO week function) |
| react-beautiful-dnd | Deprecated by Atlassian in 2022; no longer maintained | @dnd-kit (already installed) |
| pptx2html | Legacy jQuery/D3 dependencies; last updated years ago; PPTX preview in browser is a poor UX anyway | "Slide count + download" fallback for PPTX outputs |
| rehype-raw + rehype-sanitize | react-markdown is already safe by default; raw HTML rendering not needed for AI outputs | react-markdown without plugins (already installed) |
| @dnd-kit/dom | v2 breaking API change from current @dnd-kit/core@6; forces full rewrite of WbsTree + TaskBoard | @dnd-kit/core@6 (already installed) |
| Monaco Editor | Already resolved in v7.0; CodeMirror in use for prompt editing | @uiw/react-codemirror (already installed) |
| New chart library | Recharts already handles all visualization needs | recharts@^3.8.1 (already installed) |

---

## Version Compatibility

| Package | Installed | v9.0 Compatibility | Notes |
|---------|-----------|-------------------|-------|
| docx-preview | NEW — ^0.3.7 | ✓ Compatible | Requires `dynamic import` + `ssr: false`; same pattern as @xyflow/react |
| @dnd-kit/core | ^6.3.1 | ✓ Compatible | Multi-container (Kanban) is a core supported pattern per official MultipleContainers.tsx story |
| @dnd-kit/sortable | ^10.0.0 | ✓ Compatible | `SortableContext` per column + `useDroppable` per column is the correct multi-container pattern |
| react-markdown | ^10.1.0 | ✓ Compatible | Latest stable (as of March 2025); safe by default; no breaking changes expected |
| ai (Vercel AI SDK) | ^6.0.142 | ✓ Compatible | `useChat` `initialMessages` prop supports chat history hydration |
| drizzle-orm | ^0.45.1 | ✓ Compatible | Schema additions (chat_messages, stakeholder columns) use existing patterns |
| mammoth | ^1.12.0 | ✓ Not changed | Already used for document ingestion; do NOT use for inline preview |

---

## Key Integration Notes

### docx-preview + Next.js SSR

`docx-preview` uses DOM APIs unavailable in Node.js SSR. Import pattern:
```typescript
// components/DocxPreviewPanel.tsx
// In parent: dynamic(() => import('./DocxPreviewPanel'), { ssr: false })
```
This is the **established pattern** already used for `@xyflow/react` (org charts) and CodeMirror — no new complexity introduced.

### @dnd-kit Cross-Column DnD: onDragOver is Required

The current `TaskBoard.tsx` only has `onDragEnd`. For smooth Kanban cross-column movement, `onDragOver` must also be wired. Without it, cards only "snap" to new columns on release (poor UX). The `DragOverlay` import already exists in the file — it just needs to be rendered with the active card's content.

### Chat Persistence + Vercel AI SDK

`useChat` accepts `initialMessages` to seed conversation history. The pattern:
1. Server Component loads last 50 `chat_messages` rows for the project
2. Passes them as `initialMessages` to `<ChatPanel>`
3. After each exchange, the chat API route persists both `user` and `assistant` turns to DB
4. `setMessages` hook handles local state; DB is source of truth on next load

No changes to `@ai-sdk/react` or `ai` packages — this is configuration and data flow, not API surface changes.

---

## Sources

- **@dnd-kit GitHub** (`clauderic/dnd-kit`) — MultipleContainers.tsx official story confirming `onDragOver` + `useDroppable` pattern; HIGH confidence
- **docx-preview npm registry** (registry.npmjs.org) — v0.3.7 confirmed latest; browser-compatible confirmed; active maintenance confirmed; HIGH confidence
- **react-markdown npm registry** (registry.npmjs.org) — v10.1.0 confirmed latest stable; safe-by-default behavior confirmed; HIGH confidence
- **rehype-sanitize npm registry** — v6.0.0 latest; unnecessary for this use case; HIGH confidence
- **Existing codebase** (`/Users/jmiloslavsky/Documents/Panda-Manager`) — `package.json`, `components/TaskBoard.tsx`, `components/chat/ChatPanel.tsx`, `app/outputs/page.tsx`, `db/schema.ts`, `lib/file-gen/index.ts` — direct inspection; HIGH confidence
- **pptxgenjs npm registry** — confirmed generator-only (not renderer); HIGH confidence
- **pptx2html npm registry** — v0.3.4 latest; jQuery/D3 legacy dependencies confirmed; rejected; HIGH confidence

---

*Stack research for: BigPanda AI Project Management App v9.0*
*Researched: 2026-04-22*
*Confidence: HIGH*
