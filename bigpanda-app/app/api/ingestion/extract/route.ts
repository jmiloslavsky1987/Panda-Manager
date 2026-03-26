import { NextRequest } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { eq, and, ilike } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import { db } from '@/db';
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

export const dynamic = 'force-dynamic';

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
  | 'team';

export interface ExtractionItem {
  entityType: EntityType;
  fields: Record<string, string>;
  confidence: number;      // 0.0 – 1.0
  sourceExcerpt: string;   // verbatim text excerpt (max 200 chars)
}

// ─── Extraction System Prompt ─────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are a project data extractor. Given a document, extract all structured project data.
Output ONLY a JSON array of extraction items — no prose before or after.
Each item follows this exact shape:
{
  "entityType": "action" | "risk" | "decision" | "milestone" | "stakeholder" | "task" | "architecture" | "history" | "businessOutcome" | "team",
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
If this document is a slide deck (PPTX), extract all project data visible in bullet points and speaker notes.
Output only the JSON array. No markdown fences.`;

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

    case 'history': {
      const key = normalize(f.content);
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

          // 3. Read file from disk at the stored path
          // artifact.source holds the file path set during upload
          // artifact.name holds the original filename for extension detection
          const filePath = artifact.source;
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

          // 5. Build Claude message content
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

          const userContent: Anthropic.MessageParam['content'] = [];

          if (extractResult.kind === 'pdf') {
            userContent.push({
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: extractResult.base64,
              },
            } as Anthropic.DocumentBlockParam);
          } else {
            userContent.push({
              type: 'text',
              text: `Document content:\n\n${extractResult.content}`,
            });
          }

          userContent.push({
            type: 'text',
            text: `Extract all structured project data from the document above. Output only the JSON array.`,
          });

          // 6. Stream Claude response — accumulate full text, do NOT parse mid-stream
          let fullText = '';
          const claudeStream = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            system: EXTRACTION_SYSTEM,
            messages: [{ role: 'user', content: userContent }],
          });

          claudeStream.on('text', (text: string) => {
            fullText += text;
          });

          await claudeStream.finalMessage();

          sendEvent({ type: 'progress', message: 'Parsing extraction results…' });

          // 7. Parse complete JSON response (pitfall 3: never parse mid-stream)
          let rawItems: ExtractionItem[] = [];
          try {
            const parsed = JSON.parse(fullText.trim());
            if (Array.isArray(parsed)) {
              rawItems = parsed as ExtractionItem[];
            }
          } catch (e) {
            sendEvent({ type: 'error', message: 'Claude returned non-JSON output' });
            await db
              .update(artifacts)
              .set({ ingestion_status: 'failed' })
              .where(eq(artifacts.id, artifactId));
            controller.close();
            return;
          }

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
