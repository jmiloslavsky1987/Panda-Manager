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
import { isAlreadyIngested } from '../../lib/extraction-types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHUNK_CHAR_LIMIT = 80_000; // ~20k tokens; leaves headroom for system prompt + JSON output

// ─── Multi-Pass Extraction Prompts (Phase 52) ────────────────────────────────

const EXTRACTION_BASE = `You are a project data extractor. Given a document, extract all structured project data.
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

// Pass-specific prompts: EXTRACTION_BASE + entity type guidance for that pass only
export const PASS_PROMPTS: Record<1 | 2 | 3, string> = {
  1: `${EXTRACTION_BASE}

FOCUS ON THESE ENTITY TYPES ONLY FOR THIS PASS:
- action: { description, owner, due_date, status, notes (additional notes or null), type (category or null) }
- risk: { description, severity, mitigation, owner }
- task: { title, status, owner, phase, description, start_date (ISO date string or null), due_date (ISO date string or null), priority ("high", "medium", or "low" or null), milestone_name (verbatim name as it appears in the document or null), workstream_name (verbatim name as it appears in the document or null) }
- milestone: { name, target_date, status, owner (verbatim name or null) }
- decision: { decision, rationale, made_by, date }
- note: { content, context } — use for any valuable content that does not fit the above types: observations, meeting highlights, open questions, context, or anything that would be useful to preserve but has no specific schema.
- history: { date, content, author }

Key disambiguation for this pass:
- task vs wbs_task: task = generic project action item with owner, status, phase (not tied to a WBS template). If document mentions WBS structure, ADR/Biggy tracks, or explicit template section names → skip it (will be extracted in pass 3 as wbs_task).
- Do NOT discard content just because it doesn't fit a structured type. Capture it as a "note".

Extract all names exactly as they appear in the document. Do not abbreviate, normalize, or infer names. Use null for any field not explicitly present.`,

  2: `${EXTRACTION_BASE}

FOCUS ON THESE ENTITY TYPES ONLY FOR THIS PASS:
- architecture: { tool_name, track, phase, integration_group, status, integration_method } — workflow phase and integration method; integration_group = logical grouping within a phase (e.g. "ALERT NORMALIZATION", "ON-DEMAND DURING INVESTIGATION") or null; focus on how the tool integrates into delivery workflow
- arch_node: { track ("ADR Track" | "AI Assistant Track" — ONLY these two values are valid; if track name is different, skip this entity), node_name (tool or capability name — e.g., "Event Ingest", "Alert Intelligence", "Knowledge Sources"), status ("planned" | "in_progress" | "live"), notes (integration details, status notes, or null) } — architecture capability or tool node; extract track verbatim; use for system components, tools, integrations mentioned in architecture context
- integration: { tool_name, category, connection_status, notes } — connection status of a tool (live/pilot/planned/not-connected); focus on operational readiness and connection state, NOT architecture workflow phase
- before_state: { aggregation_hub_name (name of the primary alert aggregation hub or SIEM being replaced or supplemented), alert_to_ticket_problem (description of the pain point in the current alert-to-ticket workflow), pain_points (comma-separated list of customer pain points with the current state) } — customer's current state before BigPanda adoption; extract from sections titled "Current State", "Before State", "Pain Points", "Challenges", or similar; one entity per project

Key disambiguation for this pass:
- architecture vs arch_node vs integration:
  • architecture = tool's ROLE in BigPanda delivery workflow (which phase it belongs to, how it integrates into the delivery process) — use for workflow integration context
  • arch_node = capability NODE within an "ADR Track" or "AI Assistant Track" architecture diagram (e.g., "Event Ingest", "Alert Intelligence", "Knowledge Sources") — use ONLY when document explicitly references these tracks
  • integration = operational CONNECTION STATUS of a tool (is it live, pilot, planned, not-connected?) — use for tool readiness/status data
- arch_node track names: ONLY valid values are "ADR Track" and "AI Assistant Track". If the document mentions a different track name, do NOT extract an arch_node entity — skip it entirely.

Extract all names exactly as they appear in the document. Use null for any field not explicitly present.`,

  3: `${EXTRACTION_BASE}

FOCUS ON THESE ENTITY TYPES ONLY FOR THIS PASS:
- team: { team_name, track, ingest_status, correlation_status, incident_intelligence_status, sn_automation_status, biggy_ai_status } — team onboarding status across all capability tracks; use null for any status field not explicitly mentioned
- wbs_task: { title, track ("ADR" or "Biggy"), parent_section_name (exact match from WBS template — e.g., "Solution Design", "Platform Configuration", "Integrations"), level (1, 2, or 3 — 1 for top-level sections, 2 for sub-items, 3 for leaf tasks), status ("not_started" | "in_progress" | "complete" — normalize variants: "done"/"finished" → "complete", "in progress"/"ongoing" → "in_progress", "not started"/"todo" → "not_started"), description (task details or null) } — task that belongs in WBS structure; extract track and parent section verbatim as they appear in document; use level to indicate hierarchy depth
- workstream: { name, track, phase, status, percent_complete } — delivery workstream or project phase name; use for named delivery tracks with status and completion percentage
- focus_area: { title, tracks, why_it_matters, current_status, next_step, bp_owner, customer_owner } — a named focus area or strategic priority with ownership and status; use for named workstreams, priorities, or initiatives with a clear owner and next step
- e2e_workflow: { team_name, workflow_name, steps } — an end-to-end workflow for a team; steps is an array of { label, track, status, position } objects; use when document describes a multi-step team workflow or process
- team_pathway: { team_name, route_description (the delivery route steps joined by ' → ' e.g. "Alert Ingest → Correlation → Incident Creation → SNow Ticket"), status ("live" | "in_progress" | "pilot" | "planned"), notes } — named delivery pathway for a team through the BigPanda platform; use when document describes team-specific routes or journeys through the system
- weekly_focus: { bullets (JSON array of strings — the current week's focus items; each bullet is a short action or priority statement) } — this week's focus priorities extracted from a status update, meeting notes, or project status document; use when document contains a "This Week" or "Weekly Focus" section
- stakeholder: { name, role, email, account }
- businessOutcome: { title, track, description, delivery_status }
- onboarding_step: { team_name, step_name, track, status, completed_date } — specific onboarding step for a team (e.g. ADR track steps); NOT the same as a generic task

Key disambiguation for this pass:
- task vs wbs_task: wbs_task = item that belongs in a WBS hierarchy with a track ("ADR" or "Biggy"), a parent section (e.g. "Solution Design", "Platform Configuration"), and a level (1/2/3). Rule: If document mentions WBS structure, ADR/Biggy tracks, or explicit template section names → wbs_task.
- team vs stakeholder: team = a TEAM (group of people) with onboarding status across BigPanda capability tracks; stakeholder = a NAMED INDIVIDUAL with role, email, account.
- workstream vs task vs wbs_task: workstream = named DELIVERY TRACK or work stream (e.g. "ADR Workstream", "Integration Workstream") with owner and percent_complete — not individual tasks. Do NOT extract individual tasks as workstreams. Workstreams are high-level tracks spanning multiple tasks.
- arch_node track names (reference only): track names "ADR Track" and "AI Assistant Track" were covered in pass 2.

Extract all names exactly as they appear in the document. Use null for any field not explicitly present.`,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractionPass {
  passNumber: 1 | 2 | 3;
  label: string;
  entityTypes: EntityType[];
}

export const PASSES: ExtractionPass[] = [
  {
    passNumber: 1,
    label: 'Project data',
    entityTypes: ['action', 'risk', 'task', 'milestone', 'decision', 'note', 'history'],
  },
  {
    passNumber: 2,
    label: 'Architecture',
    entityTypes: ['architecture', 'arch_node', 'integration', 'before_state'],
  },
  {
    passNumber: 3,
    label: 'Teams & delivery',
    entityTypes: [
      'team', 'wbs_task', 'workstream', 'focus_area', 'e2e_workflow',
      'team_pathway', 'weekly_focus', 'stakeholder', 'businessOutcome', 'onboarding_step',
    ],
  },
];

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

// Local isAlreadyIngested removed — imported from lib/extraction-types.ts (Phase 52 Plan 02)

function parseClaudeResponse(text: string): ExtractionItem[] {
  const stripped = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  const repaired = jsonrepair(stripped);
  const parsed = JSON.parse(repaired);
  return Array.isArray(parsed) ? (parsed as ExtractionItem[]) : [];
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function buildDedupeKey(item: ExtractionItem): string | null {
  const f = item.fields;
  const t = item.entityType;
  const norm = (v: string | undefined | null) => (v ?? '').toLowerCase().trim().slice(0, 120);

  switch (t) {
    case 'action':
    case 'risk':
      return f.description ? `${t}::${norm(f.description)}` : null;
    case 'milestone':
      return f.name ? `${t}::${norm(f.name)}` : null;
    case 'decision':
      return f.decision ? `${t}::${norm(f.decision)}` : null;
    case 'history':
    case 'note':
      return (f.content || f.context) ? `${t}::${norm(f.content ?? f.context)}` : null;
    case 'stakeholder':
      return (f.email || f.name) ? `${t}::${norm(f.email ?? f.name)}` : null;
    case 'task':
    case 'businessOutcome':
    case 'focus_area':
      return f.title ? `${t}::${norm(f.title)}` : null;
    case 'team':
    case 'team_pathway':
      return f.team_name ? `${t}::${norm(f.team_name)}` : null;
    case 'architecture':
    case 'integration':
      return f.tool_name ? `${t}::${norm(f.tool_name)}` : null;
    case 'workstream':
      return f.name ? `${t}::${norm(f.name)}` : null;
    case 'onboarding_step':
      return f.step_name ? `${t}::${norm(f.step_name)}` : null;
    case 'wbs_task':
      return (f.title && f.track)
        ? `${t}::${norm(f.title)}::${norm(f.track)}`
        : (f.title ? `${t}::${norm(f.title)}` : null);
    case 'arch_node':
      return (f.node_name && f.track)
        ? `${t}::${norm(f.node_name)}::${norm(f.track)}`
        : (f.node_name ? `${t}::${norm(f.node_name)}` : null);
    case 'e2e_workflow':
      return (f.workflow_name && f.team_name)
        ? `${t}::${norm(f.workflow_name)}::${norm(f.team_name)}`
        : (f.workflow_name ? `${t}::${norm(f.workflow_name)}` : null);
    case 'before_state':
      return f.aggregation_hub_name ? `${t}::${norm(f.aggregation_hub_name)}` : null;
    case 'weekly_focus':
      return null; // singletons — no dedup
    default:
      return null;
  }
}

export function deduplicateWithinBatch(items: ExtractionItem[]): ExtractionItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = buildDedupeKey(item);
    if (key === null) return true; // No dedup key → pass through
    if (seen.has(key)) return false; // Duplicate → filter out
    seen.add(key);
    return true;
  });
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

    // Helper: run one Claude streaming call with explicit system prompt
    const runClaudeCall = async (
      content: Anthropic.MessageParam['content'],
      systemPrompt: string,
    ): Promise<string> => {
      let fullText = '';
      const claudeStream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 16384,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      });
      claudeStream.on('text', (text: string) => { fullText += text; });
      await claudeStream.finalMessage();
      return fullText;
    };

    // 5. Extract — 3-pass extraction (Phase 52)
    let allRawItems: ExtractionItem[] = [];

    if (extractResult.kind === 'pdf') {
      // PDF: 3 sequential calls (one per pass), Claude handles PDF natively
      await db.update(extractionJobs)
        .set({
          total_chunks: 3,
          current_chunk: 0,
          progress_pct: 0,
          updated_at: new Date()
        })
        .where(eq(extractionJobs.id, jobId));

      for (let passIdx = 0; passIdx < PASSES.length; passIdx++) {
        const pass = PASSES[passIdx];
        const passSystemPrompt = PASS_PROMPTS[pass.passNumber];
        const passUserText = `Extract ONLY the following entity types: ${pass.entityTypes.join(', ')}.\nExtract all structured project data from the document above. Output only the JSON array.`;

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
            text: passUserText,
          },
        ];

        const fullText = await runClaudeCall(userContent, passSystemPrompt);

        try {
          const passItems = parseClaudeResponse(fullText);
          allRawItems.push(...passItems);
        } catch (e) {
          console.error(`[document-extraction] JSON parse failed for PDF pass ${pass.passNumber}`, fullText.slice(0, 500));
        }

        // Global progress: pass 1 → 33%, pass 2 → 66%, pass 3 → 100%
        const globalPct = Math.round(((passIdx + 1) / 3) * 100);
        await db.update(extractionJobs)
          .set({
            progress_pct: Math.min(100, globalPct),
            current_chunk: passIdx + 1,
            updated_at: new Date()
          })
          .where(eq(extractionJobs.id, jobId));
      }
    } else {
      // Text: outer pass loop, inner chunk loop
      const chunks = splitIntoChunks(extractResult.content, CHUNK_CHAR_LIMIT);
      const totalChunks = chunks.length;

      await db.update(extractionJobs)
        .set({
          total_chunks: totalChunks,
          current_chunk: 0,
          progress_pct: 0,
          updated_at: new Date()
        })
        .where(eq(extractionJobs.id, jobId));

      for (let passIdx = 0; passIdx < PASSES.length; passIdx++) {
        const pass = PASSES[passIdx];
        const passSystemPrompt = PASS_PROMPTS[pass.passNumber];

        for (let i = 0; i < chunks.length; i++) {
          const passUserText = `Extract ONLY the following entity types: ${pass.entityTypes.join(', ')}.\n\nDocument content:\n\n${chunks[i]}\n\nOutput only the JSON array.`;

          const userContent: Anthropic.MessageParam['content'] = [
            {
              type: 'text',
              text: passUserText,
            },
          ];

          const fullText = await runClaudeCall(userContent, passSystemPrompt);

          try {
            const chunkItems = parseClaudeResponse(fullText);
            allRawItems.push(...chunkItems);
          } catch (e) {
            console.error(`[document-extraction] JSON parse failed pass ${pass.passNumber} chunk ${i + 1}`, fullText.slice(0, 500));
          }

          // Global progress: (passIdx * totalChunks + i + 1) / (3 * totalChunks)
          const passProgressPct = Math.round((i + 1) / totalChunks * 100);
          const globalPct = Math.round((passIdx / 3) * 100 + (passProgressPct / 3));
          await db.update(extractionJobs)
            .set({
              progress_pct: Math.max(0, Math.min(100, globalPct)),
              current_chunk: i + 1,
              updated_at: new Date()
            })
            .where(eq(extractionJobs.id, jobId));
        }
      }
    }

    // Intra-batch dedup before DB sweep
    allRawItems = deduplicateWithinBatch(allRawItems);

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
        const cleanedFields = item.fields && typeof item.fields === 'object'
          ? Object.fromEntries(Object.entries(item.fields).filter(([, v]) => v != null)) as Record<string, string>
          : {};
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
