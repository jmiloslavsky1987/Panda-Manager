# Phase 78: AI & Content - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Meeting Prep skill delivered via the existing BullMQ/skill infrastructure (SKILL.md + skill_runs pipeline). Skill run output page gets a Copy to Clipboard button. Outputs Library adds inline preview for markdown and DOCX outputs; PPTX outputs show slide count and a download link. All react-markdown instances (SkillRunPage + ChatMessage) are XSS-hardened with rehype-sanitize.

New capabilities (chat persistence, stakeholder extraction, real-time sync) are explicitly out of scope.

</domain>

<decisions>
## Implementation Decisions

### Meeting Prep — Input Mode
- `input_required: false` — optional notes field, not required
- `input_label: "Meeting focus or attendees"` — prompts user to optionally specify topic or attendees
- `schedulable: false` — on-demand only; a scheduled meeting prep brief doesn't make semantic sense
- Appears as a regular skill card in the existing skill grid (no new section or grouping)

### Meeting Prep — Brief Content
- **Open items:** Tasks not done + actions not closed/completed (two entity types only — no milestones or risks)
- **Recent activity:** Completed tasks + closed actions from the last 7 days
- **Suggested agenda:** AI-derived from open items + any optional user-provided notes field input
- **Scope:** Tasks + actions only — no milestone status, health badge, or risk context in the brief

### Outputs Library — Preview Surface
- Inline in-row expand, consistent with the existing HTML iframe pattern (`expandedId` toggle in `app/outputs/page.tsx`)
- Click the row → content panel expands below; click again to collapse
- DOCX preview panel: fixed `h-[500px]` with `overflow-y-auto` scroll — matches the HTML iframe pattern
- PPTX outputs: no inline render; show slide count badge + Download button in the row (not Open in app)
- Slide count requires server-side PPTX parsing (acceptable for this phase)

### Copy Button — Skill Run Page
- Copies **plain text** (markdown stripped) — suitable for pasting into email, Excel, or any non-markdown surface
- Positioned at **top-right of the output box** (standard code-block copy position)
- Visible only when `status === 'done'` — consistent with the existing 'Open in app' button gate
- Feedback: button text changes to `'Copied!'` for 2 seconds, then resets — no toast

### XSS Hardening
- `rehype-sanitize` added to all `ReactMarkdown` instances: `SkillRunPage` (`app/customer/[id]/skills/[runId]/page.tsx`) and `ChatMessage.tsx`
- Claude's discretion on exact sanitize config (default schema is sufficient unless specific elements need whitelisting)

### Claude's Discretion
- Markdown-to-plain-text conversion approach (e.g., strip via regex vs. a library like `remark-strip-markdown` — whichever is cleaner without adding heavy deps)
- PPTX slide count parsing approach (e.g., unzip + count `ppt/slides/slide*.xml` entries — no heavy library needed)
- `docx-preview` dynamic import + `ssr:false` pattern (already confirmed as correct pattern for DOM-dependent libraries per CodeMirror precedent)
- Exact Meeting Prep DB query structure (JOIN shape for tasks + actions filtered by project_id)
- Meeting Prep prompt wording and output structure (structured markdown brief is the output format)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `skills/meeting-summary.md`: Closest analog to Meeting Prep SKILL.md — same YAML front-matter schema, same markdown output format. Use as structural template.
- `app/customer/[id]/skills/[runId]/page.tsx`: Existing skill run output page — `status === 'done'` gate, `output` string in state, `ReactMarkdown` already rendering. Copy button slots into this component's output box header.
- `app/outputs/page.tsx`: `expandedId` useState + HTML iframe expand pattern already wired. Markdown + DOCX preview extends the same toggle pattern; current `isHtmlOutput()` check needs to become a type discriminator for html/markdown/docx/pptx.
- `components/chat/ChatMessage.tsx`: Has `ReactMarkdown` without `rehype-sanitize` — confirmed XSS gap from STATE.md security flags. Single-file fix.

### Established Patterns
- `input_required: false` + `input_label` pattern: See `morning-briefing.md` (no input) vs `meeting-summary.md` (required input). Meeting Prep uses the hybrid optional approach.
- BullMQ + polling for skill execution: Already the standard pattern — Meeting Prep inherits this with no infrastructure changes.
- `dynamic import + ssr:false`: Used for React Flow (`@xyflow/react`) and CodeMirror — apply same pattern for `docx-preview`.
- `prose prose-zinc prose-sm max-w-none` Tailwind prose classes: Used in SkillRunPage and ChatMessage for markdown rendering — keep consistent.

### Integration Points
- `skills/` directory: Add `meeting-prep.md` — runtime SKILL.md discovery picks it up automatically (no code registration needed)
- `app/customer/[id]/skills/[runId]/page.tsx`: Add Copy button to output box; add `rehype-sanitize` to ReactMarkdown
- `components/chat/ChatMessage.tsx`: Add `rehype-sanitize` to ReactMarkdown (single import + prop addition)
- `app/outputs/page.tsx`: Extend `isHtmlOutput()` → type discriminator; add markdown/DOCX/PPTX expand branches; new `/api/outputs/[id]/slide-count` or inline PPTX parse endpoint
- `/api/projects/[projectId]/meeting-prep-context` or inline in skill runner: DB query for open tasks, open actions, recent completed tasks, recent closed actions

</code_context>

<specifics>
## Specific Ideas

- Plain text copy is preferred for Meeting Prep output (paste into email/Excel use case, not developer tools)
- Brief scope is deliberately narrow: tasks + actions only — user wants a focused operational brief, not a full project dashboard in text form
- PPTX: slide count + download is the right call (no viable inline renderer without legacy deps — matches OUT-02 spec exactly)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 78-ai-content*
*Context gathered: 2026-04-23*
