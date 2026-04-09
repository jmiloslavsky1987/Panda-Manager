// bigpanda-app/worker/jobs/document-extraction.ts
// BullMQ job handler for document extraction queue entries.
// Follows skill-run.ts pattern exactly:
//   1. Update status to running
//   2. Extract document and call Claude API for entity extraction
//   3. Update status to completed with staged items
//   try/catch → update status to failed, re-throw

import type { Job } from 'bullmq';
import { eq, and, ilike } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import db from '../../db';
import { extractionJobs, artifacts, actions, risks, milestones, keyDecisions, engagementHistory, stakeholders, tasks, businessOutcomes, focusAreas, architectureIntegrations, workstreams, onboardingSteps, integrations } from '../../db/schema';
import { extractDocumentText } from '../../lib/document-extractor';
import { readSettings } from '../../lib/settings-core';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHUNK_CHAR_LIMIT = 80_000; // ~20k tokens; leaves headroom for system prompt + JSON output

export const EXTRACTION_SYSTEM = `You are a project data extractor. Given a document, extract all structured project data.
Output ONLY a JSON array of extraction items — no prose before or after, no markdown code fences.
Each item follows this exact shape:
{
  "entityType": "action" | "risk" | "decision" | "milestone" | "stakeholder" | "task" | "architecture" | "history" | "businessOutcome" | "team" | "note" | "team_pathway" | "workstream" | "onboarding_step" | "integration" | "wbs_task" | "arch_node" | "focus_area" | "e2e_workflow" | "before_state" | "weekly_focus",
  "fields": { /* entity-specific key-value pairs as strings */ },
  "confidence": 0.85,
  "sourceExcerpt": "verbatim text this was extracted from (max 200 chars)"
}
Entity type guidance:
- action: { description, owner, due_date, status, notes (additional notes or null), type (category or null) }
- risk: { description, severity, mitigation, owner }
- decision: { decision, rationale, made_by, date }
- milestone: { name, target_date, status, owner (verbatim name or null) }
- stakeholder: { name, role, email, account }
- task: { title, status, owner, phase, description, start_date (ISO date string or null), due_date (ISO date string or null), priority ("high", "medium", or "low" or null), milestone_name (verbatim name as it appears in the document or null), workstream_name (verbatim name as it appears in the document or null) }
- architecture: { tool_name, track, phase, integration_group, status, integration_method } — workflow phase and integration method; integration_group = logical grouping within a phase (e.g. "ALERT NORMALIZATION", "ON-DEMAND DURING INVESTIGATION") or null; focus on how the tool integrates into delivery workflow
- history: { date, content, author }
- businessOutcome: { title, track, description, delivery_status }
- team: { team_name, track, ingest_status, correlation_status, incident_intelligence_status, sn_automation_status, biggy_ai_status } — team onboarding status across all capability tracks; use null for any status field not explicitly mentioned
- workstream: { name, track, phase, status, percent_complete } — delivery workstream or project phase name; use for named delivery tracks with status and completion percentage
- onboarding_step: { team_name, step_name, track, status, completed_date } — specific onboarding step for a team (e.g. ADR track steps); NOT the same as a generic task
- integration: { tool_name, category, connection_status, notes } — connection status of a tool (live/pilot/planned/not-connected); focus on operational readiness and connection state, NOT architecture workflow phase
- wbs_task: { title, track ("ADR" or "Biggy"), parent_section_name (exact match from WBS template — e.g., "Solution Design", "Platform Configuration", "Integrations"), level (1, 2, or 3 — 1 for top-level sections, 2 for sub-items, 3 for leaf tasks), status ("not_started" | "in_progress" | "complete" — normalize variants: "done"/"finished" → "complete", "in progress"/"ongoing" → "in_progress", "not started"/"todo" → "not_started"), description (task details or null) } — task that belongs in WBS structure; extract track and parent section verbatim as they appear in document; use level to indicate hierarchy depth
- arch_node: { track ("ADR Track" | "AI Assistant Track" — ONLY these two values are valid; if track name is different, skip this entity), node_name (tool or capability name — e.g., "Event Ingest", "Alert Intelligence", "Knowledge Sources"), status ("planned" | "in_progress" | "live"), notes (integration details, status notes, or null) } — architecture capability or tool node; extract track verbatim; use for system components, tools, integrations mentioned in architecture context
- focus_area: { title, tracks, why_it_matters, current_status, next_step, bp_owner, customer_owner } — a named focus area or strategic priority with ownership and status; use for named workstreams, priorities, or initiatives with a clear owner and next step
- e2e_workflow: { team_name, workflow_name, steps } — an end-to-end workflow for a team; steps is an array of { label, track, status, position } objects; use when document describes a multi-step team workflow or process
- note: { content, context } — use for any valuable content that does not fit the above types: observations, meeting highlights, open questions, context, or anything that would be useful to preserve but has no specific schema.
- team_pathway: { team_name, route_description (the delivery route steps joined by ' → ' e.g. "Alert Ingest → Correlation → Incident Creation → SNow Ticket"), status ("live" | "in_progress" | "pilot" | "planned"), notes } — named delivery pathway for a team through the BigPanda platform; use when document describes team-specific routes or journeys through the system
- before_state: { aggregation_hub_name (name of the primary alert aggregation hub or SIEM being replaced or supplemented), alert_to_ticket_problem (description of the pain point in the current alert-to-ticket workflow), pain_points (comma-separated list of customer pain points with the current state) } — customer's current state before BigPanda adoption; extract from sections titled "Current State", "Before State", "Pain Points", "Challenges", or similar; one entity per project
- weekly_focus: { bullets (JSON array of strings — the current week's focus items; each bullet is a short action or priority statement) } — this week's focus priorities extracted from a status update, meeting notes, or project status document; use when document contains a "This Week" or "Weekly Focus" section

IMPORTANT disambiguation rules — read carefully before assigning entityType:
- architecture vs arch_node vs integration:
  • architecture = tool's ROLE in BigPanda delivery workflow (which phase it belongs to, how it integrates into the delivery process) — use for workflow integration context
  • arch_node = capability NODE within an "ADR Track" or "AI Assistant Track" architecture diagram (e.g., "Event Ingest", "Alert Intelligence", "Knowledge Sources") — use ONLY when document explicitly references these tracks
  • integration = operational CONNECTION STATUS of a tool (is it live, pilot, planned, not-connected?) — use for tool readiness/status data
- task vs wbs_task:
  • task = generic project action item with owner, status, phase (not tied to a WBS template)
  • wbs_task = item that belongs in a WBS hierarchy — must have a track ("ADR" or "Biggy"), a parent section (e.g. "Solution Design", "Platform Configuration"), and a level (1/2/3)
  • Rule: If document mentions WBS structure, ADR/Biggy tracks, or explicit template section names → wbs_task. Otherwise → task.
- team vs stakeholder:
  • team = a TEAM (group of people) with onboarding status across BigPanda capability tracks (ingest_status, correlation_status, etc.)
  • stakeholder = a NAMED INDIVIDUAL with role, email, account
- workstream vs task vs wbs_task:
  • workstream = named DELIVERY TRACK or work stream (e.g. "ADR Workstream", "Integration Workstream") with owner and percent_complete — not individual tasks
  • Do NOT extract individual tasks as workstreams. Workstreams are high-level tracks spanning multiple tasks.
- arch_node track names: ONLY valid values are "ADR Track" and "AI Assistant Track". If the document mentions a different track name, do NOT extract an arch_node entity — skip it entirely.
- team_engagement: DO NOT use this entity type. It is deprecated. Use the appropriate specific types instead: businessOutcome, e2e_workflow, team, focus_area for team engagement content.

IMPORTANT: Do NOT discard content just because it doesn't fit a structured type. Capture it as a "note".

Extract all names (owners, milestone names, workstream names) exactly as they appear in the document. Do not abbreviate, normalize, or infer names. Use null for any field not explicitly present in the document.

If this document is a slide deck (PPTX), extract all project data visible in bullet points and speaker notes.
Output only the raw JSON array. Never wrap it in markdown code fences.`;

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
  | 'team_pathway'
  | 'workstream'
  | 'onboarding_step'
  | 'integration'
  | 'wbs_task'
  | 'arch_node'
  | 'focus_area'
  | 'e2e_workflow'
  | 'before_state'
  | 'weekly_focus';

export interface ExtractionItem {
  entityType: EntityType;
  fields: Record<string, string>;
  confidence: number;      // 0.0 – 1.0
  sourceExcerpt: string;   // verbatim text excerpt (max 200 chars)
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

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

function normalize(value: string | undefined | null): string {
  if (!value) return '';
  return value.toLowerCase().trim().slice(0, 120);
}

/**
 * Checks whether an extraction item already exists in the DB for the given project.
 * Returns true = already ingested (filter out), false = net-new (surface to user).
 */
async function isAlreadyIngested(
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
      return rows.length > 0;
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
      return rows.length > 0;
    }

    case 'workstream': {
      const key = normalize(f.name);
      if (!key) return false;
      const rows = await db.select({ id: workstreams.id }).from(workstreams)
        .where(and(eq(workstreams.project_id, projectId), ilike(workstreams.name, `${key}%`)));
      return rows.length > 0;
    }

    case 'onboarding_step': {
      const key = normalize(f.step_name);
      if (!key) return false;
      const rows = await db.select({ id: onboardingSteps.id }).from(onboardingSteps)
        .where(and(eq(onboardingSteps.project_id, projectId), ilike(onboardingSteps.name, `${key}%`)));
      return rows.length > 0;
    }

    case 'integration': {
      const key = normalize(f.tool_name);
      if (!key) return false;
      const rows = await db.select({ id: integrations.id }).from(integrations)
        .where(and(eq(integrations.project_id, projectId), ilike(integrations.tool, `${key}%`)));
      return rows.length > 0;
    }

    default:
      return false;
  }
}

function parseClaudeResponse(text: string): ExtractionItem[] {
  const stripped = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  const repaired = jsonrepair(stripped);
  const parsed = JSON.parse(repaired);
  return Array.isArray(parsed) ? (parsed as ExtractionItem[]) : [];
}

// ─── Job Handler ──────────────────────────────────────────────────────────────

export default async function documentExtractionJob(job: Job): Promise<{ status: string }> {
  const { jobId, artifactId, projectId, batchId } = job.data as {
    jobId: number;
    artifactId: number;
    projectId: number;
    batchId: string;
  };

  // Mark job as running and artifact as extracting
  await db.update(extractionJobs)
    .set({ status: 'running', updated_at: new Date() })
    .where(eq(extractionJobs.id, jobId));

  await db.update(artifacts)
    .set({ ingestion_status: 'extracting' })
    .where(eq(artifacts.id, artifactId));

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
      throw new Error(`Artifact ${artifactId} not found`);
    }

    // 2. Read file from disk
    const settings = await readSettings();
    const filePath = path.join(settings.workspace_path, 'ingestion', String(projectId), artifact.name);
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(await readFile(filePath));
    } catch (e) {
      throw new Error(`Cannot read file: ${filePath}`);
    }

    // 3. Extract document text
    const extractResult = await extractDocumentText(fileBuffer, artifact.name);

    // 4. Build Claude client
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

    // 5. Extract — PDF as a single native document block; text split into chunks
    let allRawItems: ExtractionItem[] = [];

    if (extractResult.kind === 'pdf') {
      // PDF: single call, Claude handles it natively — no chunking needed
      await db.update(extractionJobs)
        .set({
          total_chunks: 1,
          current_chunk: 0,
          progress_pct: 0,
          updated_at: new Date()
        })
        .where(eq(extractionJobs.id, jobId));

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

      try {
        allRawItems = parseClaudeResponse(fullText);
      } catch (e) {
        console.error('[document-extraction] JSON parse failed for PDF. Claude output (first 500 chars):', fullText.slice(0, 500));
        throw new Error('Claude returned non-JSON output for PDF');
      }

      // Update progress to 100% after single chunk
      await db.update(extractionJobs)
        .set({
          current_chunk: 1,
          progress_pct: 100,
          updated_at: new Date()
        })
        .where(eq(extractionJobs.id, jobId));
    } else {
      // Text: split into chunks and call Claude sequentially for each
      const chunks = splitIntoChunks(extractResult.content, CHUNK_CHAR_LIMIT);
      const totalChunks = chunks.length;

      // Initialize chunk tracking
      await db.update(extractionJobs)
        .set({
          total_chunks: totalChunks,
          current_chunk: 0,
          progress_pct: 0,
          updated_at: new Date()
        })
        .where(eq(extractionJobs.id, jobId));

      for (let i = 0; i < chunks.length; i++) {
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
          console.error(`[document-extraction] JSON parse failed for chunk ${i + 1}. Claude output (first 500 chars):`, fullText.slice(0, 500));
          // Skip this chunk rather than aborting the whole extraction
        }

        // Update progress after each chunk (heartbeat for stale detection)
        const progressPct = Math.round(((i + 1) / totalChunks) * 100);
        await db.update(extractionJobs)
          .set({
            progress_pct: progressPct,
            current_chunk: i + 1,
            updated_at: new Date()
          })
          .where(eq(extractionJobs.id, jobId));
      }
    }

    // 6. Dedup: filter items already in DB
    const dedupResults = await Promise.all(
      allRawItems.map(async (item) => {
        const alreadyIngested = await isAlreadyIngested(item, projectId);
        return { item, alreadyIngested };
      }),
    );

    const newItems = dedupResults
      .filter(r => !r.alreadyIngested)
      .map(r => {
        const item = r.item;
        const cleanedFields = Object.fromEntries(
          Object.entries(item.fields).filter(([, v]) => v != null)
        ) as Record<string, string>;
        return { ...item, fields: cleanedFields };
      });
    const filteredCount = allRawItems.length - newItems.length;

    // 7. Mark completed with staged items
    await db.update(extractionJobs)
      .set({
        status: 'completed',
        progress_pct: 100,
        staged_items_json: newItems,
        filtered_count: filteredCount,
        updated_at: new Date()
      })
      .where(eq(extractionJobs.id, jobId));

    // 8. Update artifact status to preview
    await db.update(artifacts)
      .set({ ingestion_status: 'preview' })
      .where(eq(artifacts.id, artifactId));

    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Mark job as failed
    await db.update(extractionJobs)
      .set({
        status: 'failed',
        error_message: message,
        updated_at: new Date()
      })
      .where(eq(extractionJobs.id, jobId));

    // Mark artifact as failed
    await db.update(artifacts)
      .set({ ingestion_status: 'failed' })
      .where(eq(artifacts.id, artifactId));

    throw err; // re-throw so BullMQ marks the job as failed in Redis
  }
}

// Named export for testing compatibility
export const processDocumentExtraction = documentExtractionJob;
