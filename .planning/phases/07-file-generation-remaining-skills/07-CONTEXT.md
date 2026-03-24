# Phase 7: File Generation + Remaining Skills - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire 4 remaining AI skills (ELT External Status, ELT Internal Status, Team Engagement Map, Workflow Diagram) and 2 plan features (AI-assisted plan generation, weekly sprint summary). Introduce a FileGenerationService that converts Claude's structured JSON output into binary Office files (.pptx, .docx) and self-contained HTML. All generated files open without corruption in macOS system apps and are registered in the Output Library.

**Biggy Weekly Briefing (SKILL-09) is explicitly out of scope** — it is not a customer project management skill and has no place in this app. Marked deferred below.

</domain>

<decisions>
## Implementation Decisions

### File Generation Architecture
- Claude's SKILL.md instructs it to output **structured JSON** (slide titles, bullet points, sections, etc.)
- A new server-side **FileGenerationService** converts the JSON into binary files using:
  - `pptxgenjs` (already installed) for `.pptx` files (ELT External, ELT Internal)
  - `docx` library (or similar) for `.docx` files
  - Plain string rendering for self-contained `.html` files (Team Engagement Map, Workflow Diagram)
- No subprocess calls, no Cowork script dependencies — all generation is in-process

### File Storage
- Generated files saved to a **per-customer subfolder** of the configured workspace path
  - Pattern: `~/Documents/BigPanda Projects/[CustomerName]/[filename]`
  - Customer name derived from the project record (not hardcoded)
- `outputs` table stores **filepath only** — no binary content in the DB
  - filepath column already exists on the outputs schema
  - content column stores Claude's raw JSON output (for debugging/regeneration)
- HTML files (Team Engagement Map, Workflow Diagram) stored as `.html` on disk at same path

### Post-Completion UX for File Skills
- Skill run completion screen shows **"Open in [app]"** button — shells `open filepath` server-side
- Same `GET /api/outputs/[id]/open` pattern already in place from Phase 5
- HTML outputs continue to render inline in sandboxed `<iframe>` as decided in Phase 5
- Output Library registers every completed file run automatically (existing behavior)

### Skills Now Enabled (no longer grayed out)
- SKILL-05: ELT External Status → produces `.pptx`
- SKILL-06: ELT Internal Status → produces `.pptx`
- SKILL-07: Team Engagement Map → produces `.html`
- SKILL-08: Workflow Diagram → produces `.html`
- SKILL-09 (Biggy Weekly Briefing): **remains grayed out / hidden** — not in scope

### AI Plan Generation (PLAN-12)
- Trigger: **"Generate plan" button on the Plan tab**, alongside existing task creation controls
- One-click — no additional input required (Claude uses current project context + open blockers automatically)
- After generation, a **"Proposed Tasks" panel appears inline on the Plan tab**
  - Checkbox per task (all checked by default)
  - Click task title to edit inline before committing
  - Owner, due date, priority set post-commit via normal task editor
  - "Commit selected tasks" button writes approved tasks to DB
  - "Discard" clears the panel without writing anything
- Proposed tasks are **never written to DB until Josh explicitly commits** — no auto-commit

### Weekly Sprint Summary (PLAN-13)
- Lives as a **collapsible panel at the top of the Plan tab**
- Contains plain-English text: last week's completions, this week's due tasks, at-risk items
- "Refresh" button re-generates (new Claude call)
- Text only — no file generated, not registered in Output Library
- Stored in DB (e.g., in outputs or a dedicated column) so it persists across sessions without re-generating

### Claude's Discretion
- Exact JSON schema shape for each skill's structured output (slide/section structure)
- `docx` library choice (e.g., `docx` npm package vs. hand-rolled XML)
- ELT skills: whether month/date input is exposed in the skill launcher or inferred from current date
- Filename convention for generated files (e.g., `ELT-External-Kaiser-2026-03.pptx`)
- FileGenerationService module location and interface shape
- Sprint summary storage approach (outputs table vs. dedicated DB column)

</decisions>

<specifics>
## Specific Ideas

- File output should feel like Cowork: one click → file opens in PowerPoint/Word automatically. No "download" step, no extra confirmation.
- Per-customer subfolder is important for organization — Josh already organizes files this way in `~/Documents/BigPanda Projects/`
- The "Generate plan" button should feel native to the Plan tab, not like launching a skill from the Skills tab. It belongs in the planning context.
- Proposed tasks panel should be non-intrusive — it shouldn't take over the whole Plan tab, just appear above or alongside the existing board/list views.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/skill-orchestrator.ts` — SkillOrchestrator.run(): all 4 new skills follow exact same pattern; FileGenerationService called post-orchestrator
- `worker/jobs/skill-run.ts` — generic handler: outputs registration + draft insertion; extend with filepath write for file-producing skills
- `app/api/outputs/[id]/open/route.ts` — `open filepath` shell command already implemented for .docx/.pptx; reuse directly
- `bigpanda-app/skills/` — SKILL.md stub files needed for: `elt-external-status.md`, `elt-internal-status.md`, `team-engagement-map.md`, `workflow-diagram.md`
- `pptxgenjs` — already installed in bigpanda-app; used by prior builds
- Plan tab UI (`app/customer/[id]/plan/` pages) — "Generate plan" button + proposal panel added here

### Established Patterns
- **Structured JSON output**: SKILL.md system prompt ends with "Return a JSON object with the following structure: {...}"; orchestrator captures full_output; FileGenerationService parses it
- **outputs row on completion**: `skill-run.ts` inserts outputs row after orchestrator completes; file-generating skills set `filepath` instead of (or in addition to) `content`
- **Open file**: `GET /api/outputs/[id]/open` shells `open filepath`; idempotent GET; already deployed
- **shadcn/ui components**: Dialog, Checkbox, Badge, Card available; proposal panel uses these

### Integration Points
- `worker/jobs/skill-run.ts` → add per-skill file generation call between orchestrator.run() and outputs.insert()
- `bigpanda-app/lib/` → new `file-generation-service.ts` (or `lib/file-gen/index.ts`)
- Plan tab → add "Generate plan" button + proposal panel component
- Plan tab → add sprint summary collapsible panel at top
- `bigpanda-app/skills/` → 4 new SKILL.md files (elt-external-status, elt-internal-status, team-engagement-map, workflow-diagram)
- `db/schema.ts` → no new tables required; `outputs.filepath` already exists; sprint summary stored in existing outputs or settings

</code_context>

<deferred>
## Deferred Ideas

- **SKILL-09: Biggy Weekly Briefing** — removed from Phase 7 scope; not a customer project management skill; belongs in a separate standalone tool if needed at all
- **SKILL.md editor in-app** — editing skill prompts through the UI (mentioned in Phase 5); Phase 8 polish
- **ELT slide preview** — rendering a .pptx preview inside the app before opening; requires LibreOffice or similar; out of scope
- **Per-skill MCP server allowlist** — noted as Phase 7+ concern in Phase 6 context; remains deferred

</deferred>

---

*Phase: 07-file-generation-remaining-skills*
*Context gathered: 2026-03-24*
