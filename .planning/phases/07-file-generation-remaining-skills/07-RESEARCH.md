# Phase 7: File Generation + Remaining Skills - Research

**Researched:** 2026-03-24
**Domain:** Office file generation (pptxgenjs, docx), AI skill wiring, Plan tab AI features
**Confidence:** HIGH

## Summary

Phase 7 wires four remaining AI skills (SKILL-05 through SKILL-08) and two plan intelligence features (PLAN-12, PLAN-13) by introducing a server-side FileGenerationService that converts Claude's structured JSON output into binary .pptx and .docx files plus self-contained .html outputs. The infrastructure — SkillOrchestrator, skill-run.ts, the outputs table with `filepath` column, and the `GET /api/outputs/[id]/open` route — is already fully deployed. The main new work is: authoring four SKILL.md files with structured JSON output contracts, building FileGenerationService using pptxgenjs (already installed) and docx (needs installation), and adding an AI plan generation panel plus a sprint summary panel on the Plan tab.

SKILL-09 (Biggy Weekly Briefing) is explicitly out of scope and must remain hidden. The `docx` npm package (v9.6.1) is not yet installed and must be added. The worker process uses tsx in a Node.js/ESM hybrid environment — the `docx` package supports both and can be imported as ESM.

**Primary recommendation:** Add `docx` npm package, write FileGenerationService as a pure function module under `bigpanda-app/lib/file-gen/`, extend `skill-run.ts` with a per-skill post-orchestrator generation step, then add SKILL.md stubs and Plan tab UI components.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Claude's SKILL.md instructs it to output structured JSON (slide titles, bullet points, sections, etc.)
- A new server-side FileGenerationService converts the JSON into binary files using:
  - `pptxgenjs` (already installed) for `.pptx` files (ELT External, ELT Internal)
  - `docx` library (or similar) for `.docx` files
  - Plain string rendering for self-contained `.html` files (Team Engagement Map, Workflow Diagram)
- No subprocess calls, no Cowork script dependencies — all generation is in-process
- Generated files saved to a per-customer subfolder: `~/Documents/BigPanda Projects/[CustomerName]/[filename]`
- `outputs` table stores filepath only — no binary content in the DB
- HTML files stored as `.html` on disk at same path
- Post-completion screen shows "Open in [app]" button — shells `open filepath` server-side
- Same `GET /api/outputs/[id]/open` pattern already in place
- HTML outputs continue to render inline in sandboxed `<iframe>`
- SKILL-05: ELT External Status → produces `.pptx`
- SKILL-06: ELT Internal Status → produces `.pptx`
- SKILL-07: Team Engagement Map → produces `.html`
- SKILL-08: Workflow Diagram → produces `.html`
- SKILL-09 (Biggy Weekly Briefing): remains grayed out / hidden — not in scope
- PLAN-12 "Generate plan" button on the Plan tab, one-click, no additional input
- After generation, a "Proposed Tasks" panel appears inline on the Plan tab with checkboxes
- Proposed tasks never written to DB until Josh explicitly commits — no auto-commit
- PLAN-13 lives as a collapsible panel at the top of the Plan tab
- "Refresh" button re-generates sprint summary; text stored in DB; no file generated

### Claude's Discretion
- Exact JSON schema shape for each skill's structured output (slide/section structure)
- `docx` library choice (e.g., `docx` npm package vs. hand-rolled XML)
- ELT skills: whether month/date input is exposed in the skill launcher or inferred from current date
- Filename convention for generated files (e.g., `ELT-External-Kaiser-2026-03.pptx`)
- FileGenerationService module location and interface shape
- Sprint summary storage approach (outputs table vs. dedicated DB column)

### Deferred Ideas (OUT OF SCOPE)
- SKILL-09: Biggy Weekly Briefing — removed from Phase 7 scope
- SKILL.md editor in-app — Phase 8 polish
- ELT slide preview — requires LibreOffice, out of scope
- Per-skill MCP server allowlist — remains deferred
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKILL-05 | ELT External Status — select account + month → generate 5-slide .pptx (confidence-framed, partnership tone) | pptxgenjs already installed; FileGenerationService pattern; SKILL.md JSON contract |
| SKILL-06 | ELT Internal Status — select account + date → generate internal .pptx (direct tone, surfaces blockers) | Same pptxgenjs path as SKILL-05; separate SKILL.md with different tone instructions |
| SKILL-07 | Team Engagement Map — select account → generate self-contained HTML (business outcomes, ADR/Biggy flows, team status table) | Plain string render; same pattern as handoff-doc-generator but writes .html file |
| SKILL-08 | Workflow Diagram — select account → generate before/after HTML with two tabs | Same HTML path; SKILL.md defines two-tab structure; FileGenerationService writes .html |
| PLAN-12 | AI-assisted plan generation — given current project context, generates suggested task list for next 2 weeks | New API route + client component on Plan tab; tasks schema fully compatible |
| PLAN-13 | Weekly sprint summary — plain-English summary stored in DB, collapsible panel at top of Plan tab | outputs table or projects.status_summary-style column; TanStack Query cache-busting on Refresh |
</phase_requirements>

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pptxgenjs | 4.0.1 | Generate .pptx files from structured data | Already in bigpanda-app/package.json; prior builds use it; zero runtime deps; CJS + ESM builds |
| @anthropic-ai/sdk | ^0.80.0 | Claude API via SkillOrchestrator | Already installed; all existing skills use it |
| next | 16.2.0 | App framework; Route Handlers for new API endpoints | Already deployed |
| drizzle-orm | ^0.45.1 | DB writes for filepath + sprint summary | Already in use throughout |
| shadcn/ui (Dialog, Checkbox, Badge, Card) | installed | Proposed tasks panel UI | Established pattern in ActionEditModal, TaskEditModal |

### New Dependency Required

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| docx | ^9.6.1 | Generate .docx files | Not yet installed; CONTEXT.md names it; declarative API; built-in TypeScript types; ESM + CJS dual build; active maintenance (published 14 days ago) |

**Installation:**
```bash
cd bigpanda-app && npm install docx --no-package-lock
```

Note: `--no-package-lock` is the established project pattern for avoiding invalid esbuild semver in package-lock.json (see STATE.md decisions 02-01, 03-02, 05-01).

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.577.0 | Icons (Refresh, FileText, etc.) | Plan tab AI panels |
| sonner | ^2.0.7 | Toast notifications on file save / commit | Post-generation UX |
| zod | ^4.3.6 | Validate Claude's JSON output before file gen | Parse skill structured output |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| docx npm package | Hand-rolled XML | Hand-rolled is fragile; docx handles Open XML namespace boilerplate; no upside to custom |
| docx npm package | officegen | officegen less maintained, limited TypeScript; docx is the clear ecosystem standard |
| pptxgenjs (already in) | officegen or python-pptx subprocess | pptxgenjs already installed, in-process, no subprocess = simpler |

---

## Architecture Patterns

### FileGenerationService Location and Shape

```
bigpanda-app/lib/
└── file-gen/
    ├── index.ts          # exports generateFile(params) — the only public API
    ├── pptx.ts           # pptxgenjs logic for ELT External + ELT Internal
    ├── html.ts           # string-render logic for Team Engagement Map + Workflow Diagram
    └── types.ts          # FileGenParams, FileGenResult interfaces
```

The service is a pure function — no class, no state, no HTTP. Called from `worker/jobs/skill-run.ts` after `orchestrator.run()` completes.

### Pattern 1: Skill JSON Output Contract

**What:** SKILL.md system prompt ends with an instruction to return a strictly structured JSON object. The orchestrator captures `full_output` (a raw string). FileGenerationService JSON-parses `full_output` and validates it before generating the file.

**When to use:** All file-generating skills (SKILL-05, SKILL-06, SKILL-07, SKILL-08).

**JSON contracts (Claude's discretion — recommended schemas):**

ELT External / ELT Internal (.pptx):
```typescript
// Source: CONTEXT.md code_context + pptxgenjs docs
interface EltSlideJson {
  title: string;
  customer: string;
  period: string;           // e.g. "March 2026"
  slides: Array<{
    heading: string;
    bullets: string[];
    notes?: string;         // presenter notes
  }>;
}
```

Team Engagement Map / Workflow Diagram (.html):
```typescript
// Source: CONTEXT.md decisions
interface HtmlSkillJson {
  title: string;
  html: string;             // self-contained HTML string with inline CSS
}
```

Recommended: Claude writes the complete self-contained HTML directly in the JSON `html` field. This avoids the complexity of Claude outputting a data structure that must be re-rendered client-side.

### Pattern 2: FileGenerationService Integration in skill-run.ts

**What:** After `orchestrator.run()` completes and `full_output` is read back from DB, call `generateFile()` and write `filepath` + `filename` to the outputs row.

**Example (within skill-run.ts post-orchestrator block):**
```typescript
// Source: CONTEXT.md code_context — established extension point
import { generateFile } from '../../lib/file-gen';

// After orchestrator completes, for file-producing skills:
const FILE_SKILLS = new Set(['elt-external-status', 'elt-internal-status', 'team-engagement-map', 'workflow-diagram']);

if (outputText && FILE_SKILLS.has(skillName)) {
  const project = await getProjectById(projectId);
  const fileResult = await generateFile({ skillName, outputText, project });
  // Insert outputs row with filepath set
  await db.insert(outputs).values({
    project_id: projectId,
    skill_name: skillName,
    idempotency_key: runUuid,
    status: 'complete',
    content: outputText,          // raw JSON — for debug/regeneration
    filename: fileResult.filename,
    filepath: fileResult.filepath,
    completed_at: new Date(),
  }).onConflictDoNothing();
} else {
  // Existing non-file path
  await db.insert(outputs).values({ ... }).onConflictDoNothing();
}
```

### Pattern 3: pptxgenjs Slide Generation

**What:** FileGenerationService's `pptx.ts` loops over the JSON slides array and calls pptxgenjs's addSlide() API.

**Example:**
```typescript
// Source: pptxgenjs official docs (gitbrent.github.io/PptxGenJS) + npm page
import PptxGenJS from 'pptxgenjs';

export async function generatePptx(data: EltSlideJson, outputPath: string): Promise<void> {
  const pres = new PptxGenJS();
  for (const slide of data.slides) {
    const s = pres.addSlide();
    s.addText(slide.heading, { x: 0.5, y: 0.3, w: 9, h: 1, fontSize: 28, bold: true });
    s.addText(slide.bullets.map(b => `• ${b}`).join('\n'), {
      x: 0.5, y: 1.5, w: 9, h: 4, fontSize: 18,
    });
  }
  await pres.writeFile({ fileName: outputPath });
}
```

Note: `pres.writeFile({ fileName: absolutePath })` writes to disk directly. Confirmed behavior from pptxgenjs npm page and GitHub.

### Pattern 4: docx Document Generation

**What:** `docx` npm package builds a Document from Sections, Paragraphs, TextRuns; Packer.toBuffer serializes to Buffer written with `fs.writeFileSync`.

**Example:**
```typescript
// Source: docx.js.org official docs (Packer API)
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { writeFileSync } from 'fs';

export async function generateDocx(sections: DocxSection[], outputPath: string): Promise<void> {
  const doc = new Document({
    sections: sections.map(sec => ({
      children: [
        new Paragraph({ text: sec.heading, heading: HeadingLevel.HEADING_1 }),
        ...sec.paragraphs.map(p => new Paragraph({ children: [new TextRun(p)] })),
      ],
    })),
  });
  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputPath, buffer);
}
```

ESM import (`import { Document, Packer } from 'docx'`) is safe in this project: tsconfig uses `"module": "esnext"`, `"moduleResolution": "bundler"`. The worker runs via `tsx` which handles ESM transparently.

### Pattern 5: HTML File Write

**What:** For SKILL-07 and SKILL-08, Claude produces a complete self-contained HTML string. FileGenerationService writes it directly.

```typescript
// Source: CONTEXT.md decisions
import { writeFileSync } from 'fs';
import { mkdirSync } from 'fs';
import path from 'path';

export function generateHtml(html: string, outputPath: string): void {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, 'utf-8');
}
```

### Pattern 6: Filename Convention and Path Construction

**What:** Filenames include customer name and date; files land in per-customer workspace subfolder.

```typescript
// Source: CONTEXT.md decisions + settings-core workspace_path
import os from 'os';
import path from 'path';
import { readSettings } from '../settings-core';

export function buildOutputPath(skillName: string, customer: string): string {
  const settings = readSettings();
  // workspace_path defaults to '/Documents/PM Application' but SET-01 target is ~/Documents/BigPanda Projects/
  const base = settings.workspace_path.startsWith('/')
    ? path.join(os.homedir(), settings.workspace_path)
    : settings.workspace_path;
  const customerDir = path.join(base, customer.replace(/[^a-zA-Z0-9 _-]/g, '_'));
  const date = new Date().toISOString().slice(0, 7); // "2026-03"
  const ext = SKILL_EXT_MAP[skillName];
  const slug = customer.replace(/\s+/g, '-');
  const filename = `${SKILL_PREFIX_MAP[skillName]}-${slug}-${date}.${ext}`;
  return { filepath: path.join(customerDir, filename), filename };
}
```

### Pattern 7: Plan Tab AI Generation (PLAN-12)

**What:** New API route `POST /api/projects/[id]/generate-plan` calls SkillOrchestrator with a new `ai-plan-generator` skill. Returns suggested tasks as JSON. Client component renders "Proposed Tasks" panel with checkboxes. "Commit" POSTs approved tasks to existing `POST /api/tasks`.

**Integration point:** The Plan Board page (`app/customer/[id]/plan/board/page.tsx`) is a Server Component that delegates to `PhaseBoard` (Client Component). Add a new Client Component `AiPlanPanel` rendered above `PhaseBoard` — this keeps Server Component boundary intact while enabling client-side fetch.

**Key constraint:** Tasks are never auto-committed. The panel is local state only until "Commit selected tasks" is clicked.

### Pattern 8: Sprint Summary Panel (PLAN-13)

**What:** Collapsible panel at the top of the Plan tab layout. Text fetched from DB via a new API route. "Refresh" triggers a new Claude call (short, targeted) and overwrites the stored text.

**Storage recommendation:** Store in `outputs` table with `skill_name = 'sprint-summary'` and `project_id` set. This reuses existing infrastructure with no new DB column. On "Refresh", archive the old row and insert a new one — consistent with OUT-04 regenerate behavior.

**Alternative:** Add `sprint_summary` TEXT column to `projects` table via new migration 0007. Simpler read path (just `SELECT sprint_summary FROM projects WHERE id = ?`), but adds schema overhead for a transient cache field. `outputs` table is preferred.

### Recommended Project Structure (new files only)

```
bigpanda-app/
├── lib/
│   └── file-gen/
│       ├── index.ts          # generateFile(params): Promise<FileGenResult>
│       ├── pptx.ts           # pptxgenjs ELT slide builder
│       ├── html.ts           # HTML file writer
│       └── types.ts          # FileGenParams, FileGenResult, EltSlideJson, HtmlSkillJson
├── skills/
│   ├── elt-external-status.md    # NEW — structured JSON output contract
│   ├── elt-internal-status.md    # NEW
│   ├── team-engagement-map.md    # NEW
│   └── workflow-diagram.md       # NEW
├── components/
│   ├── AiPlanPanel.tsx       # NEW — proposed tasks panel (PLAN-12)
│   └── SprintSummaryPanel.tsx # NEW — collapsible summary (PLAN-13)
├── app/
│   └── api/
│       └── projects/[id]/
│           ├── generate-plan/route.ts   # NEW (PLAN-12)
│           └── sprint-summary/route.ts  # NEW (PLAN-13)
└── worker/
    └── jobs/
        └── skill-run.ts      # MODIFIED — per-skill file gen call
```

### Anti-Patterns to Avoid

- **Storing binary .pptx/.docx content in the DB:** The `content` column is TEXT — store raw JSON output (for debug/regeneration) there. Binary files live on disk only, `filepath` column is the reference.
- **Calling `generateFile()` from SkillOrchestrator:** The orchestrator is a pure Claude streaming layer. File generation is a post-processing concern — always call it from `skill-run.ts`, never inside the orchestrator.
- **Using `pres.writeFile()` with relative paths:** pptxgenjs resolves paths relative to process.cwd() in worker context. Always pass absolute paths constructed from `path.join(os.homedir(), ...)`.
- **Parsing JSON from `full_output` without validation:** Claude may include markdown fences around the JSON. Strip triple-backtick fences before `JSON.parse()`.
- **Committing proposed tasks from client-side fetch:** The "Commit" button should POST to the existing `/api/tasks` route individually per task — do not batch-insert with a new route that bypasses Zod validation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| .pptx file structure | Custom OOXML assembly | pptxgenjs (already installed) | OOXML is ~200 XML files, relationship references, content types; hand-rolled always corrupts on first open |
| .docx file structure | Custom XML or zip manipulation | docx npm package | Same OOXML complexity; docx handles namespace registration, [Content_Types].xml, _rels/ — all invisible to the developer |
| JSON extraction from Claude output | Custom regex | `JSON.parse(full_output.replace(/^```json\n?/, '').replace(/\n?```$/, ''))` | Claude reliably fences JSON in markdown; a two-line strip is sufficient; no regex complexity needed |
| File path sanitization | Custom char replacement | `customer.replace(/[^a-zA-Z0-9 _-]/g, '_')` | Simple is fine; no library needed here |

**Key insight:** The Office format complexity is entirely in the binary container structure, not the content. Both pptxgenjs and docx handle the container; the developer only writes content logic.

---

## Common Pitfalls

### Pitfall 1: pptxgenjs `writeFile` vs `write` in Node.js context

**What goes wrong:** `pres.writeFile({ fileName: path })` writes to disk (correct for server-side). `pres.write()` returns a buffer/blob and is the browser path. Mixing them causes either missing files or unhandled buffer promises.

**Why it happens:** The pptxgenjs docs show both methods; the Node.js path is `writeFile`.

**How to avoid:** In `file-gen/pptx.ts`, always use `await pres.writeFile({ fileName: absolutePath })`. The return is `void`.

**Warning signs:** Function returns undefined/null instead of throwing; file never appears on disk.

### Pitfall 2: docx ESM Named Export Issue

**What goes wrong:** `SyntaxError: Named export 'Packer' not found` when importing from docx in older Node.js contexts.

**Why it happens:** Historically docx was CJS-only; ESM consumers hit this in Node 16. Node.js 18+ with `"moduleResolution": "bundler"` resolves it correctly.

**How to avoid:** This project uses tsconfig `"moduleResolution": "bundler"` and tsx — ESM imports work. Use `import { Document, Packer, Paragraph, TextRun } from 'docx'`.

**Warning signs:** Error at worker startup; seen in older Node versions only.

### Pitfall 3: Claude JSON output wrapped in markdown fences

**What goes wrong:** `JSON.parse(full_output)` throws `SyntaxError: Unexpected token` because full_output is `"```json\n{...}\n```"`.

**Why it happens:** Claude naturally wraps JSON in markdown code fences even when instructed otherwise.

**How to avoid:** Strip fences before parse:
```typescript
const raw = full_output.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
const parsed = JSON.parse(raw);
```

**Warning signs:** File generation fails silently; check if `full_output.startsWith('```')`.

### Pitfall 4: Per-customer directory doesn't exist yet

**What goes wrong:** `writeFileSync` throws `ENOENT: no such file or directory` because `~/Documents/BigPanda Projects/[CustomerName]/` doesn't exist.

**Why it happens:** The workspace path exists but per-customer subdirectory is created on first run.

**How to avoid:** Always call `mkdirSync(path.dirname(filepath), { recursive: true })` before write — both in `pptx.ts` and `html.ts`.

**Warning signs:** `ENOENT` on file write, not on file open.

### Pitfall 5: `skill-run.ts` generic handler vs skill-specific handlers

**What goes wrong:** Currently `skill-run.ts` is the generic handler that calls `orchestrator.run()` and then writes to outputs. The meeting-summary and handoff-doc-generator jobs have separate handler files that also call orchestrator. For Phase 7 file skills, the correct extension point is inside `skill-run.ts` (for on-demand runs) — not in the separate handler files.

**Why it happens:** The architecture has two paths: generic `skill-run` BullMQ job (for SkillsTab triggers), and per-skill handlers (for some scheduled jobs). File generation for SKILL-05 through SKILL-08 should live in `skill-run.ts`, which is what all on-demand skill runs invoke.

**How to avoid:** Add the `FILE_SKILLS` check in `skill-run.ts` only. If a scheduled version is ever needed, create `elt-external-status.ts` job handler following the same pattern.

### Pitfall 6: AiPlanPanel JSON schema mismatch with tasks table

**What goes wrong:** Claude generates tasks with field names like `task_title` or `dueDate` that don't match the DB schema (`title`, `due`, `status`).

**Why it happens:** The SKILL.md (or generate-plan prompt) didn't specify the exact schema.

**How to avoid:** The `ai-plan-generator` SKILL.md must include the exact tasks schema as the JSON output contract. Validate with Zod before rendering in the panel. Map to DB columns explicitly in the commit POST handler.

### Pitfall 7: Sprint summary collapsible panel causes hydration mismatch

**What goes wrong:** `useState` for open/collapsed in a Server Component causes React hydration error in Next.js 16.

**Why it happens:** `SprintSummaryPanel` must be a Client Component (`'use client'`) because it manages collapse state and fetch side effects.

**How to avoid:** Mark `SprintSummaryPanel` as `'use client'`. Wrap it in a Server Component shell that passes `projectId` as a prop (same pattern as `SkillsTabClient`).

---

## Code Examples

### generateFile Public Interface

```typescript
// bigpanda-app/lib/file-gen/types.ts
export interface FileGenParams {
  skillName: string;
  outputText: string;    // raw full_output from skill_runs
  project: { id: number; customer: string; name: string };
}

export interface FileGenResult {
  filepath: string;
  filename: string;
}
```

### skill-run.ts Extension Point

```typescript
// Source: bigpanda-app/worker/jobs/skill-run.ts — established pattern, see code_context
const FILE_SKILLS = new Set([
  'elt-external-status',
  'elt-internal-status',
  'team-engagement-map',
  'workflow-diagram',
]);

// After orchestrator.run() + completedRun fetch:
let filepath: string | undefined;
let filename: string | undefined;

if (FILE_SKILLS.has(skillName) && outputText) {
  const project = await getProjectById(projectId);
  const result = await generateFile({ skillName, outputText, project });
  filepath = result.filepath;
  filename = result.filename;
}

await db.insert(outputs).values({
  project_id: projectId,
  skill_name: skillName,
  idempotency_key: runUuid,
  status: 'complete',
  content: outputText,
  filename: filename ?? null,
  filepath: filepath ?? null,
  completed_at: new Date(),
}).onConflictDoNothing();
```

### SkillsTabClient WIRED_SKILLS Extension

```typescript
// Source: bigpanda-app/components/SkillsTabClient.tsx — current WIRED_SKILLS set
const WIRED_SKILLS = new Set([
  'weekly-customer-status',
  'meeting-summary',
  'morning-briefing',
  'context-updater',
  'handoff-doc-generator',
  'customer-project-tracker',
  'elt-external-status',       // Phase 7 addition
  'elt-internal-status',       // Phase 7 addition
  'team-engagement-map',       // Phase 7 addition
  'workflow-diagram',          // Phase 7 addition
]);
```

`biggy-weekly-briefing` must NOT be added to `WIRED_SKILLS` — remains grayed out per locked decision.

### Skill Run Page: "Open in app" Button Addition

```typescript
// Source: bigpanda-app/app/customer/[id]/skills/[runId]/page.tsx — existing pattern
// Add after status === 'done' block, when outputFilepath is set:
{status === 'done' && outputFilepath && (
  <button
    onClick={() => fetch(`/api/outputs/${outputId}/open`)}
    className="mt-3 px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700"
  >
    Open in {getAppLabel(skillName)}
  </button>
)}
```

The run page needs to fetch the output row (by matching `skill_name` + `project_id` + `idempotency_key`) to get `output.id` for the open endpoint. Or the outputs row `id` can be returned from the existing run status endpoint.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Base64 PPTX in JSON response (originally planned) | File written to disk; filepath in DB; `open` route shells `open` | Phase 5 decisions | No binary in DB; instant open in PowerPoint |
| Separate Cowork script for file generation | In-process FileGenerationService | Phase 7 decision | No subprocess; simpler error handling; same process means shared settings |
| All skills output markdown text | File-generating skills output structured JSON parsed by FileGenerationService | Phase 7 decision | Enables binary file generation; raw JSON stored in `content` for debug |

**Current installed versions (verified from package.json):**
- pptxgenjs: 4.0.1 (installed)
- docx: not installed → install 9.6.1
- @anthropic-ai/sdk: ^0.80.0

---

## Open Questions

1. **Where does the `Open in app` button read `output.id`?**
   - What we know: `GET /api/skills/runs/{runId}` returns the run row, not the outputs row. The open endpoint needs `outputs.id`.
   - What's unclear: Whether the run page should fetch the corresponding outputs row, or whether the run status endpoint should include the output_id.
   - Recommendation: Add `output_id` to the run status endpoint response OR have the run page fetch `GET /api/outputs?skill_run_id={runId}`. The simplest path: add `output_id` (nullable) to the `skill_runs` table and populate it after file gen. Alternatively, query outputs by `idempotency_key` (which equals `run.run_id`).

2. **Sprint summary storage: `outputs` table vs new migration**
   - What we know: `outputs` table has `skill_name`, `content`, `project_id` — sufficient for storage. A new migration 0007 would add `sprint_summary TEXT` to `projects`.
   - What's unclear: Whether re-using outputs table creates confusion with the Output Library (PLAN-13 says "not registered in Output Library").
   - Recommendation: Store in `outputs` table with a dedicated `skill_name = 'sprint-summary'` but mark as non-library by adding `archived = true` on insert, or use a separate lightweight table `project_settings(project_id, key, value)`. The cleanest approach: new migration adds `sprint_summary TEXT, sprint_summary_at TIMESTAMP` to `projects` table directly — two columns, no new table, no ambiguity with Output Library.

3. **Month/date input for ELT skills — infer vs expose**
   - What we know: CONTEXT.md leaves this as Claude's discretion.
   - What's unclear: Whether SKILL-05 needs a month picker in the Skills tab launcher.
   - Recommendation: Infer from current date for Phase 7 (simpler UI, no new input components). The SKILL.md can say "Use current month: {month} {year}" with the date injected by skill-context assembler.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (E2E), node:test (unit) |
| Config file | `playwright.config.ts` (project root) |
| Quick run command | `npx playwright test tests/e2e/phase7.spec.ts --grep "SKILL-05"` |
| Full suite command | `npx playwright test tests/e2e/phase7.spec.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-05 | ELT External Status skill is wired and triggerable | E2E (Playwright) | `npx playwright test tests/e2e/phase7.spec.ts --grep "SKILL-05"` | Wave 0 |
| SKILL-06 | ELT Internal Status skill is wired and triggerable | E2E (Playwright) | `npx playwright test tests/e2e/phase7.spec.ts --grep "SKILL-06"` | Wave 0 |
| SKILL-07 | Team Engagement Map skill is wired and triggerable | E2E (Playwright) | `npx playwright test tests/e2e/phase7.spec.ts --grep "SKILL-07"` | Wave 0 |
| SKILL-08 | Workflow Diagram skill is wired and triggerable | E2E (Playwright) | `npx playwright test tests/e2e/phase7.spec.ts --grep "SKILL-08"` | Wave 0 |
| PLAN-12 | "Generate plan" button visible on Plan tab; proposed tasks panel renders | E2E (Playwright) | `npx playwright test tests/e2e/phase7.spec.ts --grep "PLAN-12"` | Wave 0 |
| PLAN-13 | Sprint summary panel visible at top of Plan tab | E2E (Playwright) | `npx playwright test tests/e2e/phase7.spec.ts --grep "PLAN-13"` | Wave 0 |

Note: All E2E tests should use `assert-if-present` pattern for Anthropic API-dependent assertions (established Phase 5/6 pattern). Structural UI assertions (skill card visible and not grayed out, panel renders) always pass without API key.

### Sampling Rate

- **Per task commit:** `npx playwright test tests/e2e/phase7.spec.ts --grep "SKILL-05|SKILL-06|SKILL-07|SKILL-08"`
- **Per wave merge:** `npx playwright test tests/e2e/phase7.spec.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/e2e/phase7.spec.ts` — covers SKILL-05, SKILL-06, SKILL-07, SKILL-08, PLAN-12, PLAN-13 (6 stubs using `expect(false, 'stub').toBe(true)` as first line per established pattern)

---

## Sources

### Primary (HIGH confidence)

- bigpanda-app/package.json — verified all installed versions
- bigpanda-app/lib/skill-orchestrator.ts — orchestrator interface and run() signature
- bigpanda-app/worker/jobs/skill-run.ts — established extension point for post-orchestrator file gen
- bigpanda-app/app/api/outputs/[id]/open/route.ts — confirmed `open filepath` shell pattern
- bigpanda-app/db/schema.ts — confirmed `outputs.filepath`, `outputs.filename`, `outputs.content` all exist
- bigpanda-app/components/SkillsTabClient.tsx — confirmed gray-out mechanism via WIRED_SKILLS set
- bigpanda-app/app/customer/[id]/skills/[runId]/page.tsx — confirmed skill run detail page structure
- npm registry: `npm show docx version` → 9.6.1, `npm show pptxgenjs version` → 4.0.1
- .planning/phases/07-file-generation-remaining-skills/07-CONTEXT.md — all locked decisions

### Secondary (MEDIUM confidence)

- [pptxgenjs npm page](https://www.npmjs.com/package/pptxgenjs) — `writeFile({ fileName })` Node.js API confirmed
- [pptxgenjs GitHub](https://github.com/gitbrent/PptxGenJS) — CJS build at `dist/pptxgen.cjs.js` confirmed
- [docx.js.org Packer API](https://docx.js.org/api/classes/Packer.html) — `Packer.toBuffer()` returns `Promise<Buffer>`
- [docx npm page](https://www.npmjs.com/package/docx) — v9.6.1 active, published 14 days ago

### Tertiary (LOW confidence)

- WebSearch re: docx ESM/CJS issue — `"Named export 'Packer' not found"` is a historical Node 16 issue; not expected with this project's tsconfig/tsx setup

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json or npm registry
- Architecture: HIGH — extension points confirmed from reading actual source files; FileGenerationService shape follows established worker job patterns
- Pitfalls: HIGH for pptxgenjs (in-project, known); MEDIUM for docx (not yet installed, ESM issue is historical)

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable libraries; pptxgenjs and docx APIs change slowly)
