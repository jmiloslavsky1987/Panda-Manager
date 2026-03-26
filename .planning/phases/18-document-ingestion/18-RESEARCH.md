# Phase 18: Document Ingestion - Research

**Researched:** 2026-03-25
**Domain:** File upload, document text extraction, Claude API document input, structured extraction preview UI, dedup/conflict detection
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Upload entry point: full Artifacts tab area is a drag-and-drop zone; no separate "Import" button
- After drop, a full-screen Dialog modal opens for the entire upload → extraction → preview → approve flow
- Multiple files can be dropped in one session; files are reviewed sequentially (one document at a time)
- All files upload upfront; extraction runs per document as user steps through them
- A sidebar/stepper within the modal shows file list and progress (e.g., "1 of 3 — meeting-notes.pdf ✓")
- Extracted items grouped by entity type using tabs at the top of the preview
- Tab labels: Actions, Risks, Decisions, Milestones, Stakeholders, Tasks, Architecture, History, Business Outcomes, Teams — only tabs with extracted items shown
- Each tab badge shows item count for that type
- Each extracted item row shows: checkbox (approve/reject), content summary, collapsible source excerpt, confidence indicator
- Checking checkbox = approved; unchecked = rejected; default: all checked
- Bulk approve: single action to approve all visible items on current tab or across all tabs
- Clicking an item row expands it inline to show editable fields — edit-in-place, no separate modal
- After editing, checkbox state is preserved

### Claude's Discretion
- Confidence indicator exact design (dot color thresholds, % cutoffs)
- Exact field set shown per entity type in expanded edit row
- Progress/loading indicator design during extraction phase
- Empty-tab handling (hide vs show disabled tab)
- Conflict resolution UX detail (inline prompt on the conflicting item row)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ING-01 | Upload one or more files (PDF, DOCX, PPTX, XLSX, MD, TXT) via drag-and-drop or file browse from Artifacts tab | HTML5 drag-and-drop API; `<input type="file" multiple>` fallback; no library needed |
| ING-02 | Platform validates file type and size (max 50 MB per file) before accepting; clear error on rejection | File.type MIME check + File.size check on drop handler before upload begins |
| ING-03 | Uploaded files stored on disk at configured workspace path; Artifact record created with ingestion_status: pending | `fs.writeFile` to `settings.workspace_path`; artifacts POST route already supports ingestion_status |
| ING-04 | Claude extracts structured project data targeting all entity types | Base64 PDF → document block; text extraction (mammoth/exceljs) → text block for non-PDF types |
| ING-05 | Extraction results shown as structured preview grouped by destination tab, confidence indicator and source excerpt per item | SSE streaming response carries JSON; client parses and renders preview tabs |
| ING-06 | User can approve, edit, or reject each extracted item individually before DB write | Inline expand pattern; controlled checkbox state; edit form per entity type |
| ING-07 | User can bulk-approve all extracted items | Single "Approve All" action sets all item checkboxes; confirmation then writes |
| ING-08 | Platform detects conflicts with existing records; prompts merge/replace/skip | Dedup query per entity type before write; inline conflict indicator on item row |
| ING-09 | Confirmed items written to appropriate DB tables with source attribution (filename, upload timestamp, artifact_id) | Existing API routes accept source field; need source_artifact_id + ingested_at column additions |
| ING-10 | Each ingestion event logged: filename, upload time, items extracted/approved/rejected; artifact.ingestion_log_json updated | PATCH artifact route updates ingestion_log_json after write phase completes |
| ING-11 | Re-uploading previously ingested document triggers preview flow again; no silent overwrite | Hash-based or name+size dedup check against artifacts; re-ingestion shows full preview |
| ING-12 | Incremental uploads only surface net-new items not already present in DB | Content-hash dedup per entity before presenting to user |
</phase_requirements>

---

## Summary

Phase 18 delivers a human-in-the-loop document ingestion pipeline. Files are uploaded to disk, an Artifact record is created, Claude extracts structured entities across all 10+ entity types, and a grouped preview UI lets the user approve/edit/reject before any DB writes occur.

The core technical challenge splits into three areas: (1) file format → plain text conversion (different library per format), (2) Claude API document submission and streaming JSON extraction, and (3) a stateful preview UI with per-item and bulk approval, inline editing, conflict detection, and dedup.

**Primary recommendation:** Convert all non-PDF files to plain text server-side before sending to Claude. Send PDFs as base64 `document` blocks using the standard Messages API (no beta header needed). Stream extraction results as newline-delimited JSON via SSE following the existing skill stream pattern.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.80.0 (installed) | Claude API calls, streaming | Already in project; document block support confirmed |
| `mammoth` | ^1.12.0 | DOCX → plain text | Most reliable DOCX text extractor; `extractRawText({buffer})` API |
| `exceljs` | ^4.4.0 (installed) | XLSX → text rows | Already in project for plan-import; proven `wb.xlsx.load(buffer)` pattern |
| `node:fs/promises` | built-in | Disk write for uploaded files | Used throughout project; settings.workspace_path as storage root |
| Radix UI Dialog | installed | Full-screen ingestion modal | Already used in ArtifactEditModal pattern |
| Radix UI Tabs | installed | Preview entity-type tabs | Already used in workspace layout |
| Radix UI Checkbox | installed | Per-item approve/reject | Already in components/ui/checkbox.tsx |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pptx-parser` / raw text | — | PPTX → text | PPTX XML structure is zip-based; `unzip` + parse XML for text nodes OR send raw as plain text |
| `js-yaml` | installed | MD/YAML round-trip safety | Already in project; MD files are read as plain text via `fs.readFile` |
| `zod` | 4.3.6 (installed) | API request validation | Already used across all routes |

### Installation

```bash
npm install mammoth
# exceljs already installed; mammoth is the only new dependency
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| mammoth (DOCX) | `docx` package (installed) | `docx` is for generating DOCX, not reading; mammoth is the correct choice for extraction |
| plain-text pass-through for PPTX | pptx2json | PPTX is ZIP of XML; plain text extraction via unzip is 0-dependency; pptx2json adds complexity |
| base64 PDF → standard messages API | Files API (beta) | Files API requires `anthropic-beta: files-api-2025-04-14` header and beta.messages path; base64 on standard messages API is simpler and fully stable for local single-user use |

---

## Architecture Patterns

### Recommended Structure

```
bigpanda-app/
├── app/api/
│   ├── ingestion/
│   │   ├── upload/route.ts          # POST: multipart upload, disk write, artifact record
│   │   ├── extract/route.ts         # POST: receive artifactId, run Claude extraction, stream JSON
│   │   └── approve/route.ts         # POST: write approved items, update ingestion_log_json
│   └── artifacts/[id]/route.ts      # PATCH: update ingestion_status / log (may extend existing)
├── components/
│   ├── IngestionModal.tsx            # Full-screen Dialog container (stepper + preview)
│   ├── IngestionStepper.tsx          # Sidebar file list with per-file status
│   ├── ExtractionPreview.tsx         # Tabbed entity preview (Actions/Risks/etc.)
│   ├── ExtractionItemRow.tsx         # Per-item row: checkbox, summary, source, confidence
│   └── ExtractionItemEditForm.tsx    # Inline expand edit form per entity type
└── lib/
    └── document-extractor.ts         # Format detection + text extraction logic
```

### Pattern 1: Format Detection and Text Extraction

**What:** Server-side function that takes a file buffer + MIME type, returns plain text for non-PDF or base64 string for PDF.

**When to use:** Called by `/api/ingestion/upload` or `/api/ingestion/extract` after file is read from disk.

```typescript
// Source: Anthropic Files API docs + mammoth npm docs
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';

type ExtractResult =
  | { kind: 'pdf'; base64: string }
  | { kind: 'text'; content: string };

export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ExtractResult> {
  if (mimeType === 'application/pdf') {
    return { kind: 'pdf', base64: buffer.toString('base64') };
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return { kind: 'text', content: result.value };
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as Buffer);
    const lines: string[] = [];
    wb.worksheets.forEach(ws => {
      ws.eachRow(row => lines.push(row.values.slice(1).join('\t')));
    });
    return { kind: 'text', content: lines.join('\n') };
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    // PPTX: ZIP of XML — extract text nodes from slide XML
    // Use AdmZip or manual Buffer parsing; for simplicity pass filename hint as text
    // minimal: treat as binary, Claude will receive text-only context note
    return { kind: 'text', content: `[PPTX: ${filename} — text extraction limited]` };
  }
  // TXT, MD, plain text
  return { kind: 'text', content: buffer.toString('utf-8') };
}
```

### Pattern 2: Claude Extraction with Structured JSON Output

**What:** Send document to Claude with a structured extraction prompt; stream response as newline-delimited JSON objects.

**When to use:** `/api/ingestion/extract` route; called per document after upload completes.

```typescript
// Source: Anthropic SDK 0.80.0 messages.stream + official PDF docs
import Anthropic from '@anthropic-ai/sdk';

const EXTRACTION_SYSTEM = `You are a project data extractor. Given a document, extract all structured project data.
Output ONLY a JSON array of extraction items — no prose before or after.
Each item has this shape:
{
  "entityType": "action" | "risk" | "decision" | "milestone" | "stakeholder" | "task" | "architecture" | "history" | "businessOutcome" | "team",
  "fields": { /* entity-specific key-value pairs */ },
  "confidence": 0.0–1.0,
  "sourceExcerpt": "verbatim text this was extracted from (max 200 chars)"
}`;

export async function streamExtraction(
  docResult: ExtractResult,
  projectContext: string,
  onChunk: (text: string) => void
): Promise<void> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userContent: Anthropic.MessageParam['content'] = [];

  if (docResult.kind === 'pdf') {
    userContent.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: docResult.base64 },
    } as Anthropic.DocumentBlockParam);
  } else {
    userContent.push({ type: 'text', text: `Document content:\n\n${docResult.content}` });
  }

  userContent.push({ type: 'text', text: `Project context:\n${projectContext}\n\nExtract all structured items.` });

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: EXTRACTION_SYSTEM,
    messages: [{ role: 'user', content: userContent }],
  });

  stream.on('text', onChunk);
  await stream.finalMessage();
}
```

### Pattern 3: Drag-and-Drop Zone on Artifacts Tab

**What:** Wrap the artifacts tab content in a drag-and-drop zone using native HTML5 events.

**When to use:** Artifacts tab page component wraps existing content.

```typescript
// Source: MDN HTML5 drag-and-drop API (no library needed)
// In ArtifactsPage or a client wrapper component:
const [isDragging, setIsDragging] = useState(false);

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(true);
};
const handleDragLeave = () => setIsDragging(false);
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  const files = Array.from(e.dataTransfer.files);
  // validate + open modal
};
```

### Pattern 4: Dedup Check Before Preview

**What:** Before presenting an extracted item to the user, query the DB to determine if a semantically equivalent record already exists.

**When to use:** `/api/ingestion/extract` after extraction completes; filter list before returning to client.

Dedup strategy per entity type:
- **actions/risks/decisions/milestones**: Compare `description`/`decision`/`name` normalized string similarity (lowercase, trim) — exact match on first 100 chars is sufficient for ING-12
- **stakeholders**: Deduplicate on `email` if present, else `name`
- **engagement_history**: Dedup on `content` hash
- **tasks**: Dedup on `title`

### Pattern 5: Source Attribution Columns

ING-09 requires writing `source_artifact_id` and `ingested_at` on each written record. These columns do NOT yet exist in entity tables. A new migration is needed.

```sql
-- Required migration: add source attribution to all entity tables
ALTER TABLE actions      ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id);
ALTER TABLE actions      ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
ALTER TABLE risks        ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id);
ALTER TABLE risks        ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
-- ... same for milestones, key_decisions, engagement_history, stakeholders, tasks,
--     business_outcomes, focus_areas, architecture_integrations, e2e_workflows
```

The existing `source` text column on these tables gets the value `'ingestion'` for ingested rows.

### Anti-Patterns to Avoid

- **Sending DOCX/XLSX/PPTX directly to Claude as a document block**: These are NOT supported as `document` content blocks. Only PDF and plain text are supported. DOCX/XLSX/PPTX must be converted to text first.
- **Using Files API (beta) for single-use local uploads**: Files API (`anthropic-beta: files-api-2025-04-14`) is designed for re-use across sessions. For this local single-user app, base64 PDF on standard `messages.create` is simpler and avoids beta dependency.
- **Agent Skills beta for DOCX/PPTX**: The Anthropic Agent Skills beta (docx/pptx skills) has known bugs (streaming ends silently). Avoid for production use.
- **Parsing XLSX with plan-import route pattern**: plan-import expects KAISER-format headers. Ingestion needs a general-purpose extraction that passes content to Claude as text rows.
- **Writing to DB before user approval**: The entire preview → approve flow must complete before any entity INSERT/UPDATE. No speculative writes.
- **Asking Claude to stream partial JSON**: Request Claude to output a complete JSON array. Parse on stream complete, not on partial chunks. Or stream NDJSON (one JSON object per line) for incremental preview rendering.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOCX text extraction | Custom XML parser | `mammoth` | DOCX is a zip of XML; mammoth handles relationships, paragraphs, lists reliably |
| XLSX text extraction | Custom row parser | `exceljs` (already installed) | ExcelJS handles merged cells, multiple sheets, date formatting edge cases |
| PDF text extraction | Custom PDF parser | Claude API document block (base64) | Claude extracts text AND understands visual content; pure text extraction (pdf-parse) loses tables/charts/images |
| File upload multipart parsing | Custom body parser | Next.js `request.formData()` | Already proven in plan-import/route.ts; no extra library needed |
| Drag-and-drop library | — | Native HTML5 drag events | @dnd-kit (installed) is for sortable lists; native `onDragOver`/`onDrop` is sufficient for file drop zone |
| Dedup algorithm | Custom embedding similarity | String normalization + substring match | This app has no vector DB; deterministic string dedup is faster and sufficient |

**Key insight:** The heaviest lifting (document understanding) is delegated to Claude. Local libraries only handle format conversion to get content into Claude's input. This keeps the implementation thin and avoids maintaining format-specific parsers.

---

## Common Pitfalls

### Pitfall 1: MIME Type Unreliability on Drop

**What goes wrong:** `file.type` returns empty string or wrong MIME on some browsers/OS combinations for DOCX/PPTX.
**Why it happens:** MIME type sniffing is browser-dependent; DOCX/PPTX have inconsistent MIME registration.
**How to avoid:** Use file extension as primary type detection (`file.name.endsWith('.docx')`), MIME type as secondary confirmation.
**Warning signs:** Upload succeeds but extraction returns garbage text.

### Pitfall 2: PDF Base64 Size vs. Context Window

**What goes wrong:** Large PDF (20+ pages, dense) exceeds Claude's context window.
**Why it happens:** Each PDF page is processed as text + image. Dense PDFs use 3,000–7,000 tokens per page. At 50 MB and 600-page limit, a dense 50-page PDF can hit the 200k token window.
**How to avoid:** Enforce 50 MB limit (ING-02 already requires this). Warn user if PDF > 20 pages with a "this may be slow" message. Claude-sonnet-4-6 has a 200k token context window.
**Warning signs:** Extraction API call returns `400 context_window_exceeded`.

### Pitfall 3: Streaming JSON Parsing

**What goes wrong:** Trying to parse Claude's streaming response as JSON mid-stream fails because JSON is not complete.
**Why it happens:** Stream delivers text deltas, not complete tokens.
**How to avoid:** Accumulate all stream chunks into a buffer; parse JSON only after `stream.finalMessage()` resolves. OR design the extraction prompt to output NDJSON (one JSON object per line) so each complete line is independently parseable.
**Warning signs:** `SyntaxError: Unexpected end of JSON input` in extraction handler.

### Pitfall 4: Concurrent Extractions vs. Anthropic Rate Limits

**What goes wrong:** User drops 5 files; all 5 extraction calls fire simultaneously and hit rate limits.
**Why it happens:** Sequential stepper was decided (one document at a time), but "upload upfront" could trigger extraction eagerly.
**How to avoid:** Extraction is triggered per document only when the user steps to that document in the stepper — not on drop. Extraction is sequential, not parallel.
**Warning signs:** 429 errors from Claude API.

### Pitfall 5: source_artifact_id Column Missing from Entity Tables

**What goes wrong:** Ingestion writes fail with "column not found" when trying to set `source_artifact_id`.
**Why it happens:** Phase 17 only added columns to `artifacts` table. Entity tables (actions, risks, etc.) don't have `source_artifact_id` or `ingested_at` yet.
**How to avoid:** Phase 18 Wave 0 must include a migration adding these columns to all entity tables before any writes.
**Warning signs:** Drizzle ORM type errors when constructing insert with `source_artifact_id` field.

### Pitfall 6: App Router Page vs. Client Component for Drag-and-Drop

**What goes wrong:** `artifacts/page.tsx` is a Server Component (async, no `'use client'`). Adding `useState`/event handlers directly to it will fail.
**Why it happens:** Next.js App Router pages are RSC by default.
**How to avoid:** Create a `'use client'` wrapper component (`ArtifactsDropZone`) that wraps the drop zone logic and modal trigger, separate from the RSC data-fetching page.
**Warning signs:** Next.js build error: "useState is not allowed in Server Components."

### Pitfall 7: PPTX Text Extraction Quality

**What goes wrong:** PPTX text extraction produces low-quality output; Claude extracts few useful entities.
**Why it happens:** PPTX slides have terse bullet points without context. Plain text extraction loses layout cues.
**How to avoid:** Accept lower entity density from PPTX; present what Claude finds. Add a note in extraction prompt: "This document may be a slide deck — extract all project data visible in bullet points and speaker notes."
**Warning signs:** Preview shows 0–2 items for a PPTX that clearly has project data.

---

## Code Examples

### Upload Route Pattern (from existing plan-import)

```typescript
// Source: bigpanda-app/app/api/plan-import/route.ts (proven pattern)
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const fileField = formData.get('file');
  if (!fileField || !(fileField instanceof Blob)) {
    return Response.json({ error: 'file field required' }, { status: 400 });
  }
  const arrayBuffer = await fileField.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  // ... validate size, write to disk, create artifact record
}
```

### SSE Streaming Pattern (from existing skill stream)

```typescript
// Source: bigpanda-app/app/api/skills/runs/[runId]/stream/route.ts (proven pattern)
export const dynamic = 'force-dynamic';
const stream = new ReadableStream({
  start(controller) {
    (async () => {
      // ... accumulate chunks, enqueue SSE events
      controller.close();
    })();
  },
});
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  },
});
```

### PDF as Base64 Document Block

```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support
const pdfBase64 = buffer.toString('base64');
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 8192,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
      },
      { type: 'text', text: 'Extract all structured project data...' }
    ]
  }]
});
```

### Mammoth DOCX Extraction

```typescript
// Source: https://www.npmjs.com/package/mammoth (v1.12.0)
import mammoth from 'mammoth';
const result = await mammoth.extractRawText({ buffer });
const plainText = result.value; // all paragraphs, each followed by \n\n
```

### Artifact Record with Ingestion Status

```typescript
// Source: bigpanda-app/app/api/artifacts/route.ts + schema.ts
await db.insert(artifacts).values({
  project_id,
  external_id,
  name: originalFilename,
  source: 'upload',
  ingestion_status: 'pending',
  ingestion_log_json: { uploaded_at: new Date().toISOString(), filename: originalFilename }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Upload DOCX as document block | Convert to text; send as text block | Files API docs (2025) | DOCX/XLSX/PPTX are NOT native document blocks — text conversion required |
| Files API for single-use docs | Base64 in request body | Always available | For local apps, base64 avoids Files API beta dependency and per-file storage management |
| pdf-parse for PDF text | Claude PDF base64 | Claude 3.5+ (2024) | Claude extracts text AND images/charts; pure text extractors miss visual content |

**Deprecated/outdated:**
- `@anthropic-ai/sdk` ^0.20.0: Memory note says to check before Phase 5; installed version is 0.80.0 — no action needed, already current.
- Agent Skills beta for DOCX/PPTX (`skills-2025-10-02`): Known bug — streaming ends silently. Do not use.

---

## Open Questions

1. **PPTX text extraction depth**
   - What we know: PPTX is ZIP of XML slides; text node extraction is feasible without a library; `adm-zip` or manual decompression is an option
   - What's unclear: Is the extracted text dense enough for Claude to find entities in typical deck collateral (SOW decks, kick-off slides)?
   - Recommendation: Implement basic text pass-through first; if extraction quality is too low in testing, add `adm-zip` for proper slide XML parsing. Set confidence threshold lower for PPTX-sourced items.

2. **source_artifact_id migration scope**
   - What we know: Schema does not yet have source_artifact_id on entity tables; needs a new migration file
   - What's unclear: Should Wave 0 include this migration, or should it be its own plan?
   - Recommendation: Wave 0 plan creates the migration SQL. This is a dependency for ING-09 and must land before any write logic.

3. **Conflict detection granularity**
   - What we know: ING-08 requires merge/replace/skip for conflicting records; ING-12 requires dedup of already-ingested items
   - What's unclear: Is "conflict" defined as same description text, or same external_id, or semantic similarity?
   - Recommendation: Use deterministic string comparison (normalized first 120 chars of description/content). Claude-scored semantic similarity is not needed for MVP — keep it simple.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose bigpanda-app/tests/ingestion` |
| Full suite command | `npx vitest run --reporter=verbose bigpanda-app/tests/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ING-01 | Files accepted via file input and drop zone | unit | `npx vitest run bigpanda-app/tests/ingestion/upload.test.ts` | Wave 0 |
| ING-02 | Files > 50 MB rejected before upload; wrong types rejected | unit | `npx vitest run bigpanda-app/tests/ingestion/validation.test.ts` | Wave 0 |
| ING-03 | Artifact record created with ingestion_status: pending after upload | unit | `npx vitest run bigpanda-app/tests/ingestion/upload.test.ts` | Wave 0 |
| ING-04 | Extraction prompt produces valid JSON array with entityType/fields/confidence/sourceExcerpt | unit | `npx vitest run bigpanda-app/tests/ingestion/extractor.test.ts` | Wave 0 |
| ING-05 | Preview tabs rendered with correct entity groups; badge counts | unit | `npx vitest run bigpanda-app/tests/ingestion/preview.test.ts` | Wave 0 |
| ING-06 | Approve/edit/reject per-item state changes; edit persists | unit | `npx vitest run bigpanda-app/tests/ingestion/preview.test.ts` | Wave 0 |
| ING-07 | Bulk approve sets all items to approved | unit | `npx vitest run bigpanda-app/tests/ingestion/preview.test.ts` | Wave 0 |
| ING-08 | Conflict detection returns conflicting item IDs for duplicate descriptions | unit | `npx vitest run bigpanda-app/tests/ingestion/dedup.test.ts` | Wave 0 |
| ING-09 | Written items have source='ingestion', source_artifact_id, ingested_at set | unit | `npx vitest run bigpanda-app/tests/ingestion/write.test.ts` | Wave 0 |
| ING-10 | ingestion_log_json updated after approve phase | unit | `npx vitest run bigpanda-app/tests/ingestion/write.test.ts` | Wave 0 |
| ING-11 | Re-upload triggers preview; no silent overwrite | unit | `npx vitest run bigpanda-app/tests/ingestion/dedup.test.ts` | Wave 0 |
| ING-12 | Already-ingested items filtered out of preview | unit | `npx vitest run bigpanda-app/tests/ingestion/dedup.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run bigpanda-app/tests/ingestion/`
- **Per wave merge:** `npx vitest run bigpanda-app/tests/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `bigpanda-app/tests/ingestion/upload.test.ts` — covers ING-01, ING-03
- [ ] `bigpanda-app/tests/ingestion/validation.test.ts` — covers ING-02
- [ ] `bigpanda-app/tests/ingestion/extractor.test.ts` — covers ING-04 (mock Claude response)
- [ ] `bigpanda-app/tests/ingestion/preview.test.ts` — covers ING-05, ING-06, ING-07
- [ ] `bigpanda-app/tests/ingestion/dedup.test.ts` — covers ING-08, ING-11, ING-12
- [ ] `bigpanda-app/tests/ingestion/write.test.ts` — covers ING-09, ING-10
- [ ] `bigpanda-app/db/migrations/0012_ingestion_source_attribution.sql` — source_artifact_id + ingested_at columns on all entity tables

---

## Sources

### Primary (HIGH confidence)
- `https://platform.claude.com/docs/en/docs/build-with-claude/files` — Files API supported types, DOCX/XLSX must be plain text, PDF/TXT are document blocks
- `https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support` — PDF base64 encoding pattern, 32 MB request limit, 600 page limit, TypeScript code examples
- `bigpanda-app/app/api/plan-import/route.ts` — multipart file upload pattern (`request.formData()` + Blob)
- `bigpanda-app/app/api/skills/runs/[runId]/stream/route.ts` — SSE ReadableStream streaming pattern
- `bigpanda-app/lib/skill-orchestrator.ts` — Claude API streaming with `messages.stream()`, model constant, chunk batching
- `bigpanda-app/db/schema.ts` — ingestion_status enum, ingestion_log_json on artifacts, source column on all entity tables
- `https://www.npmjs.com/package/mammoth` — v1.12.0, extractRawText({buffer}) API

### Secondary (MEDIUM confidence)
- WebSearch + GitHub issue `anthropics/anthropic-sdk-typescript#893` — Agent Skills beta bug (docx/pptx streaming fails); confirmed to avoid this path
- WebSearch mammoth 1.12.0 npm page — version confirmed, extractRawText({buffer}) signature confirmed

### Tertiary (LOW confidence)
- PPTX ZIP+XML text extraction approach — described in search results; specific Node.js implementation details need validation during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — libraries verified against installed packages and official npm
- Architecture: HIGH — based on existing proven patterns (plan-import, skill stream)
- Claude API document handling: HIGH — verified against official Anthropic docs
- Pitfalls: HIGH — most derived from official docs + existing code patterns; PPTX quality is MEDIUM (empirical)
- Test structure: HIGH — follows existing Vitest pattern in bigpanda-app/tests/

**Research date:** 2026-03-25
**Valid until:** 2026-05-01 (stable domain; Anthropic Files API beta status could change but base64 approach is stable)
