import { NextRequest } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { eq, and, ilike } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { jsonrepair } from 'jsonrepair';
import { db } from '@/db';
import { readSettings } from '@/lib/settings';
import {
  artifacts,
  actions,
  risks,
  milestones,
  keyDecisions,
  engagementHistory,
  stakeholders,
  tasks,
  businessOutcomes,
  focusAreas,
  architectureIntegrations,
} from '@/db/schema';
import { extractDocumentText } from '@/lib/document-extractor';
import { requireSession } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

const CHUNK_CHAR_LIMIT = 80_000; // ~20k tokens; leaves headroom for system prompt + JSON output

function splitIntoChunks(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + limit;
    if (end < text.length) {
      // Break at a paragraph boundary to avoid cutting mid-sentence
      const boundary = text.lastIndexOf('\n\n', end);
      if (boundary > start) end = boundary;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(c => c.length > 0);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityType =
  | 'action'
  | 'risk'
  | 'decision'
  | 'milestone'
  | 'stakeholder'
  | 'task'
  | 'architecture'
  | 'history'
  | 'businessOutcome'
  | 'team'
  | 'note'
  | 'team_pathway';

export interface ExtractionItem {
  entityType: EntityType;
  fields: Record<string, string>;
  confidence: number;      // 0.0 – 1.0
  sourceExcerpt: string;   // verbatim text excerpt (max 200 chars)
}

// ─── Extraction System Prompt ─────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are a project data extractor. Given a document, extract all structured project data.
Output ONLY a JSON array of extraction items — no prose before or after, no markdown code fences.
Each item follows this exact shape:
{
  "entityType": "action" | "risk" | "decision" | "milestone" | "stakeholder" | "task" | "architecture" | "history" | "businessOutcome" | "team" | "note",
  "fields": { /* entity-specific key-value pairs as strings */ },
  "confidence": 0.85,
  "sourceExcerpt": "verbatim text this was extracted from (max 200 chars)"
}
Entity type guidance:
- action: { description, owner, due_date, status }
- risk: { description, severity, mitigation, owner }
- decision: { decision, rationale, made_by, date }
- milestone: { name, target_date, status }
- stakeholder: { name, role, email, account }
- task: { title, status, owner, phase }
- architecture: { tool_name, track, phase, status, integration_method }
- history: { date, content, author }
- businessOutcome: { title, track, description, delivery_status }
- team: { team_name, track, ingest_status }
- note: { content, context } — use for any valuable content that does not fit the above types: observations, meeting highlights, open questions, context, or anything that would be useful to preserve but has no specific schema.
IMPORTANT: Do NOT discard content just because it doesn't fit a structured type. Capture it as a "note".
If this document is a slide deck (PPTX), extract all project data visible in bullet points and speaker notes.
Output only the raw JSON array. Never wrap it in markdown code fences.`;

// ─── Dedup Logic (ING-12) ─────────────────────────────────────────────────────

function normalize(value: string | undefined | null): string {
  if (!value) return '';
  return value.toLowerCase().trim().slice(0, 120);
}

/**
 * Checks whether an extraction item already exists in the DB for the given project.
 * Returns true = already ingested (filter out), false = net-new (surface to user).
 */
export async function isAlreadyIngested(
  item: ExtractionItem,
  projectId: number,
): Promise<boolean> {
  const f = item.fields;

  switch (item.entityType) {
    case 'action': {
      const key = normalize(f.description);
      if (!key) return false;
      const rows = await db
        .select({ id: actions.id })
        .from(actions)
        .where(
          and(
            eq(actions.project_id, projectId),
            ilike(actions.description, `${key}%`),
          ),
        );
      // Exact prefix match on first 120 chars
      return rows.some(r => {
        // rows matched by ilike prefix; confirm normalized key matches exactly
        return true; // ilike already guarantees prefix match — if rows > 0, it's a match
      });
    }

    case 'risk': {
      const key = normalize(f.description);
      if (!key) return false;
      const rows = await db
        .select({ id: risks.id })
        .from(risks)
        .where(
          and(
            eq(risks.project_id, projectId),
            ilike(risks.description, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'milestone': {
      const key = normalize(f.name);
      if (!key) return false;
      const rows = await db
        .select({ id: milestones.id })
        .from(milestones)
        .where(
          and(
            eq(milestones.project_id, projectId),
            ilike(milestones.name, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'decision': {
      const key = normalize(f.decision);
      if (!key) return false;
      const rows = await db
        .select({ id: keyDecisions.id })
        .from(keyDecisions)
        .where(
          and(
            eq(keyDecisions.project_id, projectId),
            ilike(keyDecisions.decision, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'history':
    case 'note': {
      const key = normalize(f.content ?? f.context);
      if (!key) return false;
      const rows = await db
        .select({ id: engagementHistory.id })
        .from(engagementHistory)
        .where(
          and(
            eq(engagementHistory.project_id, projectId),
            ilike(engagementHistory.content, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'stakeholder': {
      // Match on email if present, else normalized name
      if (f.email && f.email.trim()) {
        const rows = await db
          .select({ id: stakeholders.id })
          .from(stakeholders)
          .where(
            and(
              eq(stakeholders.project_id, projectId),
              ilike(stakeholders.email, f.email.trim()),
            ),
          );
        return rows.length > 0;
      }
      const key = normalize(f.name);
      if (!key) return false;
      const rows = await db
        .select({ id: stakeholders.id })
        .from(stakeholders)
        .where(
          and(
            eq(stakeholders.project_id, projectId),
            ilike(stakeholders.name, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'task': {
      const key = normalize(f.title);
      if (!key) return false;
      const rows = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            eq(tasks.project_id, projectId),
            ilike(tasks.title, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'businessOutcome': {
      const key = normalize(f.title);
      if (!key) return false;
      const rows = await db
        .select({ id: businessOutcomes.id })
        .from(businessOutcomes)
        .where(
          and(
            eq(businessOutcomes.project_id, projectId),
            ilike(businessOutcomes.title, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'team': {
      // team maps to focus_areas (track-level grouping)
      const key = normalize(f.team_name);
      if (!key) return false;
      const rows = await db
        .select({ id: focusAreas.id })
        .from(focusAreas)
        .where(
          and(
            eq(focusAreas.project_id, projectId),
            ilike(focusAreas.title, `${key}%`),
          ),
        );
      return rows.length > 0;
    }

    case 'architecture': {
      // Match on tool_name + track combination
      const toolKey = normalize(f.tool_name);
      const trackKey = normalize(f.track);
      if (!toolKey) return false;
      const rows = await db
        .select({ id: architectureIntegrations.id })
        .from(architectureIntegrations)
        .where(
          and(
            eq(architectureIntegrations.project_id, projectId),
            ilike(architectureIntegrations.tool_name, `${toolKey}%`),
          ),
        );
      // If track is also provided, further filter by track match
      if (trackKey && rows.length > 0) {
        // rows were fetched by tool_name prefix; track check is advisory (not a DB filter to keep it simple)
        return rows.length > 0;
      }
      return rows.length > 0;
    }

    default:
      return false;
  }
}

// ─── Request Schema ───────────────────────────────────────────────────────────

const ExtractRequestSchema = z.object({
  artifactId: z.number().int().positive(),
  projectId: z.number().int().positive(),
});

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = ExtractRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return Response.json(
      { error: 'artifactId and projectId (integers) are required' },
      { status: 400 },
    );
  }

  const { artifactId, projectId } = parseResult.data;

  // SSE stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        const sendEvent = (payload: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        };

        try {
          // 1. Read artifact record from DB
          const [artifact] = await db
            .select()
            .from(artifacts)
            .where(
              and(
                eq(artifacts.id, artifactId),
                eq(artifacts.project_id, projectId),
              ),
            );

          if (!artifact) {
            sendEvent({ type: 'error', message: 'Artifact not found' });
            controller.close();
            return;
          }

          // 2. Update ingestion_status to 'extracting'
          await db
            .update(artifacts)
            .set({ ingestion_status: 'extracting' })
            .where(eq(artifacts.id, artifactId));

          sendEvent({ type: 'progress', message: 'Reading document from disk…' });

          // 3. Read file from disk — reconstruct path from workspace settings.
          // artifact.source is a type label ('upload'), not a path.
          // Upload route stores files at: {workspace_path}/ingestion/{projectId}/{filename}
          const settings = await readSettings();
          const filePath = path.join(settings.workspace_path, 'ingestion', String(projectId), artifact.name);
          let fileBuffer: Buffer;
          try {
            fileBuffer = Buffer.from(await readFile(filePath));
          } catch (e) {
            sendEvent({ type: 'error', message: `Cannot read file: ${filePath}` });
            await db
              .update(artifacts)
              .set({ ingestion_status: 'failed' })
              .where(eq(artifacts.id, artifactId));
            controller.close();
            return;
          }

          sendEvent({ type: 'progress', message: 'Extracting document content…' });

          // 4. Extract document text (PDF as base64 doc block, others as text)
          const extractResult = await extractDocumentText(fileBuffer, artifact.name);

          sendEvent({ type: 'progress', message: 'Sending to Claude for entity extraction…' });

          // 5. Build Claude client
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

          // Helper: run one Claude streaming call and return accumulated text
          const runClaudeCall = async (content: Anthropic.MessageParam['content']): Promise<string> => {
            let fullText = '';
            const claudeStream = client.messages.stream({
              model: 'claude-sonnet-4-6',
              max_tokens: 16384,
              system: EXTRACTION_SYSTEM,
              messages: [{ role: 'user', content }],
            });
            claudeStream.on('text', (text: string) => { fullText += text; });
            await claudeStream.finalMessage();
            return fullText;
          };

          // Helper: parse a Claude response string into ExtractionItem[]
          const parseClaudeResponse = (text: string): ExtractionItem[] => {
            const stripped = text.trim()
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\s*```\s*$/, '')
              .trim();
            const repaired = jsonrepair(stripped);
            const parsed = JSON.parse(repaired);
            return Array.isArray(parsed) ? (parsed as ExtractionItem[]) : [];
          };

          // 6. Extract — PDF as a single native document block; text split into chunks
          let allRawItems: ExtractionItem[] = [];

          if (extractResult.kind === 'pdf') {
            // PDF: single call, Claude handles it natively — no chunking needed
            const userContent: Anthropic.MessageParam['content'] = [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: extractResult.base64,
                },
              } as Anthropic.DocumentBlockParam,
              {
                type: 'text',
                text: `Extract all structured project data from the document above. Output only the JSON array.`,
              },
            ];
            const fullText = await runClaudeCall(userContent);
            sendEvent({ type: 'progress', message: 'Parsing extraction results…' });
            try {
              allRawItems = parseClaudeResponse(fullText);
            } catch (e) {
              console.error('[extract] JSON parse failed after repair attempt. Claude output (first 500 chars):', fullText.slice(0, 500));
              sendEvent({ type: 'error', message: 'Claude returned non-JSON output' });
              await db.update(artifacts).set({ ingestion_status: 'failed' }).where(eq(artifacts.id, artifactId));
              controller.close();
              return;
            }
          } else {
            // Text: split into chunks and call Claude sequentially for each
            const chunks = splitIntoChunks(extractResult.content, CHUNK_CHAR_LIMIT);
            const totalChunks = chunks.length;

            for (let i = 0; i < chunks.length; i++) {
              sendEvent({ type: 'progress', message: `Extracting chunk ${i + 1} of ${totalChunks}…` });

              const userContent: Anthropic.MessageParam['content'] = [
                {
                  type: 'text',
                  text: `Document content:\n\n${chunks[i]}`,
                },
                {
                  type: 'text',
                  text: `Extract all structured project data from the document above. Output only the JSON array.`,
                },
              ];

              const fullText = await runClaudeCall(userContent);

              try {
                const chunkItems = parseClaudeResponse(fullText);
                allRawItems.push(...chunkItems);
              } catch (e) {
                console.error(`[extract] JSON parse failed for chunk ${i + 1}. Claude output (first 500 chars):`, fullText.slice(0, 500));
                // Skip this chunk rather than aborting the whole extraction
              }
            }
          }

          // 7. All chunks processed — allRawItems is the merged set
          const rawItems = allRawItems;

          sendEvent({ type: 'progress', message: `Deduplicating ${rawItems.length} extracted items…` });

          // 8. Dedup: filter items already in DB (ING-12)
          const dedupResults = await Promise.all(
            rawItems.map(async (item) => {
              const alreadyIngested = await isAlreadyIngested(item, projectId);
              return { item, alreadyIngested };
            }),
          );

          const newItems = dedupResults
            .filter(r => !r.alreadyIngested)
            .map(r => r.item);
          const filteredCount = rawItems.length - newItems.length;

          // 9. Update artifact status to 'preview'
          await db
            .update(artifacts)
            .set({ ingestion_status: 'preview' })
            .where(eq(artifacts.id, artifactId));

          // 10. Send final SSE event with results
          sendEvent({
            type: 'complete',
            items: newItems,
            filteredCount,
          });

          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message })}\n\n`,
            ),
          );
          // Best-effort: mark artifact as failed
          try {
            await db
              .update(artifacts)
              .set({ ingestion_status: 'failed' })
              .where(eq(artifacts.id, artifactId));
          } catch {
            // ignore secondary failure
          }
          controller.close();
        }
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
}
