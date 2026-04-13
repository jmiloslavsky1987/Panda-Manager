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
// import { jsonrepair } from 'jsonrepair'; // REMOVED in EXTR-08 — tool use replaces jsonrepair
import db from '../../db';
import { extractionJobs, artifacts, actions, risks, milestones, keyDecisions, engagementHistory, stakeholders, tasks, businessOutcomes, focusAreas, architectureIntegrations, workstreams, onboardingSteps, integrations } from '../../db/schema';
import { extractDocumentText } from '../../lib/document-extractor';
import { readSettings } from '../../lib/settings-core';
import { isAlreadyIngested } from '../../lib/extraction-types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHUNK_CHAR_LIMIT = 80_000; // ~20k tokens; leaves headroom for system prompt + JSON output
export const CHUNK_OVERLAP = 2_000; // 2000-char overlap between consecutive chunks (EXTR-09)

// ─── Tool Use Definition (EXTR-08, EXTR-10) ──────────────────────────────────

export const RECORD_ENTITIES_TOOL: Anthropic.Tool = {
  name: 'record_entities',
  description: 'Record all extracted project entities found in the document. After extracting all entities, provide a coverage summary.',
  input_schema: {
    type: 'object' as const,
    properties: {
      entities: {
        type: 'array',
        description: 'All extracted entities from this pass.',
        items: {
          type: 'object',
          properties: {
            entityType: {
              type: 'string',
              description: 'Entity type string matching the allowed types for this pass.',
            },
            fields: {
              type: 'object',
              description: 'Entity field values as key-value pairs.',
            },
            confidence: {
              type: 'number',
              description: 'Confidence score 0.0-1.0.',
            },
            sourceExcerpt: {
              type: 'string',
              description: 'Verbatim text from document that led to this entity.',
            },
          },
          required: ['entityType', 'fields', 'confidence', 'sourceExcerpt'],
          additionalProperties: false,
        },
      },
      coverage: {
        type: 'string',
        description: 'Summary of extraction coverage. Format: "action: N, risk: N, wbs_task: N | GAPS: <describe any sections where extraction was uncertain or incomplete>". Required — do not omit.',
      },
    },
    required: ['entities', 'coverage'],
    additionalProperties: false,
  },
};

// ─── Multi-Pass Extraction Prompts (Phase 52) ────────────────────────────────

export const EXTRACTION_BASE = `You are a project data extractor. Documents are often unstructured meeting notes, call transcripts, or informal status updates — do not require labeled sections or explicit headings. Infer entity types from any relevant content including scattered mentions, comparative language, and implicit context.

The document to extract from is provided in <document> tags in the user message.

Output ONLY a JSON array of extraction items — no prose before or after, no markdown code fences.
Each item follows this exact shape:
{
  "entityType": "action" | "risk" | "decision" | "milestone" | "stakeholder" | "task" | "architecture" | "history" | "businessOutcome" | "team" | "note" | "team_pathway" | "workstream" | "onboarding_step" | "integration" | "wbs_task" | "arch_node" | "focus_area" | "e2e_workflow" | "before_state" | "weekly_focus",
  "fields": { /* entity-specific key-value pairs as strings */ },
  "confidence": 0.75, // Confidence calibration — use SOURCE EXPLICITNESS, not just extraction certainty:
  // - 0.5–0.6: Weak inference (single scattered mention, ambiguous signal)
  // - 0.6–0.7: Strong inference (multiple corroborating signals, clear pattern)
  // - 0.8–0.9: Explicit but informal (stated directly, no labeled section)
  // - 0.9–0.95: Explicit structured (labeled section with clear field values)
  // Synthesized/inferred entities from scattered mentions: use 0.5–0.7
  // Explicitly stated entities: use 0.8–0.95
  // Use <0.5 for hypothetical or ambiguous items (not a real current project entity)
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
- integration: { tool_name, category, connection_status, notes } — connection status of a tool (not-connected | configured | validated | production | blocked); focus on operational readiness and connection state, NOT architecture workflow phase. Status guide: configured = basic connection active OR currently in pilot/testing; validated = tested end-to-end and verified; production = fully live at scale; blocked = connection failed or on hold; not-connected = no active connection or only planned
- wbs_task: { title, track (WBS template track — INFER from document context: "ADR" if BigPanda/enterprise deployment, "Biggy" if startup/SMB. Default to "ADR" if unclear), parent_section_name (section heading this task falls under — INFER from heading hierarchy; if item appears under "Solution Design", use "Solution Design". Match to seeded template names: Solution Design, Technical Architecture, Implementation, Go-Live), level (1, 2, or 3 — 1 for top-level sections, 2 for sub-items, 3 for leaf tasks), status ("not_started" | "in_progress" | "complete" — normalize variants: "done"/"finished" → "complete", "in progress"/"ongoing" → "in_progress", "not started"/"todo" → "not_started"), description (task details or null) } — task that belongs in WBS structure; extract track and parent section verbatim as they appear in document; use level to indicate hierarchy depth
- arch_node: { track ("ADR Track" | "AI Assistant Track" — ONLY these two values are valid; if track name is different, skip this entity), node_name (tool or capability name — e.g., "Event Ingest", "Alert Intelligence", "Knowledge Sources"), status (Node deployment status — See STATUS NORMALIZATION table above. Common signals: "configured" → live, "in testing" → pilot, "on roadmap" → planned), notes (integration details, status notes, or null) } — architecture capability or tool node; extract track verbatim; use for system components, tools, integrations mentioned in architecture context
- focus_area: { title, tracks, why_it_matters, current_status, next_step, bp_owner, customer_owner } — a named focus area or strategic priority with ownership and status; use for named workstreams, priorities, or initiatives with a clear owner and next step
- e2e_workflow: { team_name, workflow_name, steps } — an end-to-end workflow for a team. ASSEMBLE from scattered mentions: stitch together a team's end-to-end journey even when steps appear across multiple sections of the transcript. steps is an array of { label, track, status, position } objects; assign sequential positions starting at 1.
  Example: Document mentions "NOC team starts with alert ingestion, then correlation, then creates incidents in ServiceNow" → extract as steps: [{"label": "Alert Ingestion", "track": "ADR", "status": "live", "position": 1}, {"label": "Correlation", "track": "ADR", "status": "live", "position": 2}, {"label": "Incident Creation in ServiceNow", "track": "ADR", "status": "live", "position": 3}]. Use null for any step field not determinable from context.
- note: { content, context } — use for any valuable content that does not fit the above types: observations, meeting highlights, open questions, context, or anything that would be useful to preserve but has no specific schema. NEVER use note for: pre-BigPanda pain-point descriptions or alert-noise/manual-triage content (use before_state instead), team workflow step sequences (use e2e_workflow instead), or tool connection statuses (use integration instead).
- team_pathway: { team_name, route_description (the delivery route steps joined by ' → ' e.g. "Alert Ingest → Correlation → Incident Creation → SNow Ticket"), status ("live" | "in_progress" | "pilot" | "planned"), notes } — named delivery pathway for a team through the BigPanda platform; use when document describes team-specific routes or journeys through the system
- before_state: { aggregation_hub_name (INFER the primary tool being replaced or supplemented — reason from context even if not explicitly named; e.g., if ServiceNow is described as the current ticketing system being supplemented, use "ServiceNow"), alert_to_ticket_problem (ASSEMBLE from scattered pain-point mentions throughout the document — describe the alert workflow pain), pain_points (SYNTHESIZE all pain points found anywhere — comma-separate comparative phrases like "before BigPanda", "we used to", "currently struggling with", problem descriptions) } — customer's current state before BigPanda adoption. TRIGGER: Attempt extraction if ANY pain-point signal exists anywhere (comparative language, "struggling with", "manual triage", "alert noise", "previously", broken-state descriptions). THRESHOLD: A thin entity is more useful than a missing one — users can edit or dismiss. SINGLETON: Extract at most ONE before_state per document.
- weekly_focus: { bullets (JSON array of 3–5 strings — SYNTHESIZE from actual project signals; each bullet is an action-oriented imperative phrase, e.g. "Resolve ServiceNow integration blocker before pilot launch") } — ALWAYS synthesize weekly_focus even if no "This Week" section exists. SOURCE SIGNALS in priority order: (1) open action items and overdue tasks, (2) unresolved risks, (3) upcoming milestones. Do NOT extract verbatim; generate focused, prioritized items from the document's actual project state. Hard limit: 3–5 bullets maximum — prioritize rather than enumerate everything. SINGLETON: Extract at most ONE weekly_focus entity per document.

## STATUS NORMALIZATION

Always map extracted status values to canonical enum values using this table:

| Canonical Value   | Accept These Variants                                      |
|-------------------|------------------------------------------------------------|
| not_started       | not started, todo, planned, pending, open, new, not_yet   |
| in_progress       | in progress, in-progress, active, ongoing, started, wip   |
| completed         | complete, completed, done, finished, closed, resolved      |
| blocked           | blocked, on hold, waiting, stalled, paused, deferred       |
| live              | live, deployed, production, in production, released        |
| pilot             | pilot, trial, testing, poc, proof of concept               |
| planned           | planned, roadmap, future, upcoming, scheduled              |

IMPORTANT disambiguation rules — read carefully before assigning entityType:
- architecture vs arch_node vs integration:
  • architecture = tool's ROLE in BigPanda delivery workflow (which phase it belongs to, how it integrates into the delivery process) — use for workflow integration context
  • arch_node = capability NODE within an "ADR Track" or "AI Assistant Track" architecture diagram (e.g., "Event Ingest", "Alert Intelligence", "Knowledge Sources") — use ONLY when document explicitly references these tracks
  • integration = operational CONNECTION STATUS of a tool (not-connected | configured | validated | production | blocked) — use for tool readiness/status data
- task vs wbs_task:
  • task = generic project action item with owner, status, phase (not tied to a WBS template)
  • wbs_task = item that belongs in a WBS hierarchy — must have a track (WBS template track — INFER from document context: "ADR" if BigPanda/enterprise deployment, "Biggy" if startup/SMB. Default to "ADR" if unclear), a parent section (e.g. "Solution Design", "Platform Configuration"), and a level (1/2/3)
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

## DATE INFERENCE RULES

You MUST attempt to infer dates from ANY temporal signal near the entity:
- Explicit dates ("Q2 2025", "March 15", "by end of month")
- Relative references ("next sprint", "in two weeks", "before launch")
- Milestone proximity ("before the MVP milestone")

If you set a date field to null, you MUST include a brief justification in sourceExcerpt explaining
why no temporal signal exists for this entity. Do NOT default to null without attempting inference.

Extract all names (owners, milestone names, workstream names) exactly as they appear in the document. Do not abbreviate, normalize, or infer names. Use null for any field not explicitly present in the document.

If this document is a slide deck (PPTX), extract all project data visible in bullet points and speaker notes.
Output only the raw JSON array. Never wrap it in markdown code fences.`;

// Pass-specific prompts: EXTRACTION_BASE + entity type guidance for that pass only
export const PASS_PROMPTS: Record<1 | 2 | 3, string> = {
  1: `${EXTRACTION_BASE}

FOCUS ON THESE ENTITY TYPES ONLY FOR THIS PASS:
<example>
Input: "John to configure alert routing rules in BigPanda before Go-Live"
Output: [{"entityType": "action", "fields": {"description": "Configure alert routing rules in BigPanda", "owner": "John", "due_date": null}, "confidence": 0.9, "sourceExcerpt": "John to configure alert routing rules"}]
</example>

<example>
Input: "Risk: Integration with legacy ticketing system may cause delays — owner: Sarah"
Output: [{"entityType": "risk", "fields": {"description": "Integration with legacy ticketing system may cause delays", "owner": "Sarah", "severity": "medium"}, "confidence": 0.85, "sourceExcerpt": "Risk: Integration with legacy..."}]
</example>

<example>
Input: "Phase 1 tasks: 1. Solution Design - Complete solution architecture (due Q2)"
NOT an action (no owner/assignee) — this is a wbs_task. Do NOT extract as task.
Output: [] (no task/action entities — wbs_task is handled in Pass 3)
</example>


- action: { description, owner, due_date, status, notes (additional notes or null), type (category or null) }
- risk: { description, severity, mitigation, owner }
- task: { title, status, owner, phase, description, start_date (ISO date string or null), due_date (ISO date string or null), priority ("high", "medium", or "low" or null), milestone_name (verbatim name as it appears in the document or null), workstream_name (verbatim name as it appears in the document or null) }
- milestone: { name, target_date, status, owner (verbatim name or null) }
- decision: { decision, rationale, made_by, date }
- note: { content, context } — use for any valuable content that does not fit the above types: observations, meeting highlights, open questions, context, or anything that would be useful to preserve but has no specific schema. NEVER use note for: pre-BigPanda pain-point descriptions or alert-noise/manual-triage content (use before_state instead), team workflow step sequences (use e2e_workflow instead), or tool connection statuses (use integration instead).
- history: { date, content, author }

Key disambiguation for this pass:
- task vs wbs_task: task = generic project action item with owner, status, phase (not tied to a WBS template). If document mentions WBS structure, ADR/Biggy tracks, or explicit template section names → skip it (will be extracted in pass 3 as wbs_task).
- Do NOT discard content just because it doesn't fit a structured type. Capture it as a "note".

## SCANNING INSTRUCTION
Before extracting, scan the document section-by-section (introduction, main body, tables, bullet lists,
appendices). Do not skip any section — entities often appear in tables or footnotes.

## SELF-CHECK
Before calling record_entities, verify:
1. Have I extracted all entities of the allowed types from every section?
2. Have I applied the STATUS NORMALIZATION table to all status fields?
3. Have I attempted date inference for all date fields (and justified any null)?
4. Have I used the examples above to resolve ambiguous entity types?

## DOCUMENT-TYPE-AWARE EXTRACTION

If document type is \`transcript\` or \`status-update\` (from Pass 0 pre_analysis above):
- Infer more aggressively from scattered mentions and conversational language
- Assemble entities from partial information spread across multiple sections
- Synthesize fields where explicit content is absent but signals exist
- Use lower confidence scores (0.5–0.7) to reflect inference vs direct extraction
- Recognize implicit action items (e.g., "John mentioned he'll look into the configuration")
- Extract meeting follow-ups, commitments, and decisions from dialogue patterns

If document type is \`formal-doc\`:
- Prefer explicit extraction from labeled sections when available
- Use higher confidence scores (0.8–0.95) for content from labeled sections
- Still apply inference for content that spans multiple sections

Extract all names exactly as they appear in the document. Do not abbreviate, normalize, or infer names. Use null for any field not explicitly present.`,

  2: `${EXTRACTION_BASE}

FOCUS ON THESE ENTITY TYPES ONLY FOR THIS PASS:
<example>
Input: "BigPanda Alert Intelligence module is currently in pilot with the NOC team"
Output: [{"entityType": "arch_node", "fields": {"track": "ADR Track", "node_name": "Alert Intelligence", "status": "pilot", "notes": "Currently in pilot with NOC team"}, "confidence": 0.9, "sourceExcerpt": "Alert Intelligence module is currently in pilot"}]
NOT an "architecture" (diagram text) — this is a specific named arch_node with a status.
</example>

<example>
Input: "The ServiceNow integration is currently in pilot — basic connection is working but custom field mapping isn't done yet"
Output: [{"entityType": "integration", "fields": {"tool_name": "ServiceNow", "category": "ITSM", "connection_status": "configured", "notes": "Basic connection working; custom field mapping incomplete"}, "confidence": 0.85, "sourceExcerpt": "ServiceNow integration is currently in pilot"}]
</example>

<example>
Input: "Before BigPanda: 90% of alerts were noise, avg MTTR 4 hours, manual triage required"
Output: [{"entityType": "before_state", "fields": {"aggregation_hub_name": null, "alert_to_ticket_problem": "90% of alerts were noise, avg MTTR 4 hours, manual triage required", "pain_points": "Alert noise at 90%, MTTR 4 hours, Manual triage"}, "confidence": 0.9, "sourceExcerpt": "Before BigPanda: 90% of alerts were noise..."}]
</example>

<example>
Input: "John: Before we had BigPanda, our situation was pretty rough. ServiceNow was basically acting as our aggregation hub — every alert was creating a ticket directly in ServiceNow, and our NOC team was drowning. We had about 85% noise on a good day, manual triage was taking 3 to 4 hours, and we had no way to correlate related alerts."
Output: [{"entityType": "before_state", "fields": {"aggregation_hub_name": "ServiceNow", "alert_to_ticket_problem": "Every alert created a ticket directly in ServiceNow with no correlation. NOC team doing manual triage taking 3-4 hours.", "pain_points": "85% alert noise, manual triage 3-4 hours, no alert correlation, ServiceNow as aggregation hub"}, "confidence": 0.85, "sourceExcerpt": "Before we had BigPanda, our situation was pretty rough..."}]
NOT a "note" or "history" — conversational pain-point language about pre-BigPanda state is always before_state.
</example>


- architecture: { tool_name, track, phase, integration_group, status, integration_method } — workflow phase and integration method; integration_group = logical grouping within a phase (e.g. "ALERT NORMALIZATION", "ON-DEMAND DURING INVESTIGATION") or null; focus on how the tool integrates into delivery workflow
- arch_node: { track ("ADR Track" | "AI Assistant Track" — ONLY these two values are valid; if track name is different, skip this entity), node_name (tool or capability name — e.g., "Event Ingest", "Alert Intelligence", "Knowledge Sources"), status (Node deployment status — See STATUS NORMALIZATION table above. Common signals: "configured" → live, "in testing" → pilot, "on roadmap" → planned), notes (integration details, status notes, or null) } — architecture capability or tool node; extract track verbatim; use for system components, tools, integrations mentioned in architecture context
- integration: { tool_name, category, connection_status, notes } — connection status of a tool (not-connected | configured | validated | production | blocked); focus on operational readiness and connection state, NOT architecture workflow phase. Status guide: configured = basic connection active OR currently in pilot/testing; validated = tested end-to-end and verified; production = fully live at scale; blocked = connection failed or on hold; not-connected = no active connection or only planned
- before_state: { aggregation_hub_name (INFER the primary tool being replaced or supplemented — reason from context even if not explicitly named; e.g., if ServiceNow is described as the current ticketing system being supplemented, use "ServiceNow"), alert_to_ticket_problem (ASSEMBLE from scattered pain-point mentions throughout the document — describe the alert workflow pain), pain_points (SYNTHESIZE all pain points found anywhere — comma-separate comparative phrases like "before BigPanda", "we used to", "currently struggling with", problem descriptions) } — customer's current state before BigPanda adoption. TRIGGER: Attempt extraction if ANY pain-point signal exists anywhere (comparative language, "struggling with", "manual triage", "alert noise", "previously", broken-state descriptions). THRESHOLD: A thin entity is more useful than a missing one — users can edit or dismiss. SINGLETON: Extract at most ONE before_state per document.

Key disambiguation for this pass:
- architecture vs arch_node vs integration:
  • architecture = tool's ROLE in BigPanda delivery workflow (which phase it belongs to, how it integrates into the delivery process) — use for workflow integration context
  • arch_node = capability NODE within an "ADR Track" or "AI Assistant Track" architecture diagram (e.g., "Event Ingest", "Alert Intelligence", "Knowledge Sources") — use ONLY when document explicitly references these tracks
  • integration = operational CONNECTION STATUS of a tool (not-connected | configured | validated | production | blocked) — use for tool readiness/status data
- arch_node track names: ONLY valid values are "ADR Track" and "AI Assistant Track". If the document mentions a different track name, do NOT extract an arch_node entity — skip it entirely.

## SCANNING INSTRUCTION
Before extracting, scan the document section-by-section (introduction, main body, tables, bullet lists,
appendices). Do not skip any section — entities often appear in tables or footnotes.

## SELF-CHECK
Before calling record_entities, verify:
1. Have I extracted all entities of the allowed types from every section?
2. Have I applied the STATUS NORMALIZATION table to all status fields?
3. Have I attempted date inference for all date fields (and justified any null)?
4. Have I used the examples above to resolve ambiguous entity types?

## DOCUMENT-TYPE-AWARE EXTRACTION

If document type is \`transcript\` or \`status-update\` (from Pass 0 pre_analysis above):
- Infer more aggressively from scattered mentions and conversational language
- Assemble entities from partial information spread across multiple sections
- Synthesize fields where explicit content is absent but signals exist
- Use lower confidence scores (0.5–0.7) to reflect inference vs direct extraction
- Recognize implicit action items (e.g., "John mentioned he'll look into the configuration")
- Extract meeting follow-ups, commitments, and decisions from dialogue patterns
- PRIORITY — \`before_state\`: If ANY pain-point language exists in the document — even in conversational phrasing — you MUST attempt extraction. Triggers include: "before BigPanda", "before we had", "our situation was", "previously we", "we used to", "struggling with", "alert noise", "manual triage", descriptions of broken or painful pre-BigPanda processes. Conversational dialogue ("Before we had BigPanda, our situation was pretty rough...") is a valid trigger. A thin entity is better than a missing one.
- PRIORITY — \`integration\`: "in pilot", "in testing", "currently piloting", "basic connection working" → connection_status = "configured". Do NOT default to "not-connected" when an explicit status is stated.

If document type is \`formal-doc\`:
- Prefer explicit extraction from labeled sections when available
- Use higher confidence scores (0.8–0.95) for content from labeled sections
- Still apply inference for content that spans multiple sections

Extract all names exactly as they appear in the document. Use null for any field not explicitly present.`,

  3: `${EXTRACTION_BASE}

FOCUS ON THESE ENTITY TYPES ONLY FOR THIS PASS:
<example>
Input: "Solution Design\n  - Complete solution architecture (in progress)\n  - Define alert routing rules (not started)"
Output: [
  {"entityType": "wbs_task", "fields": {"title": "Complete solution architecture", "parent_section_name": "Solution Design", "track": "ADR", "level": "3", "status": "in_progress"}, "confidence": 0.9, "sourceExcerpt": "Complete solution architecture (in progress)"},
  {"entityType": "wbs_task", "fields": {"title": "Define alert routing rules", "parent_section_name": "Solution Design", "track": "ADR", "level": "3", "status": "not_started"}, "confidence": 0.9, "sourceExcerpt": "Define alert routing rules (not started)"}
]
NOT generic "task" entities — these belong in the WBS hierarchy.
</example>

<example>
Input: "NOC Team: currently doing manual alert triage, expected to move to BigPanda by Q3"
Output: [{"entityType": "team", "fields": {"team_name": "NOC Team", "track": "ADR", "ingest_status": null, "correlation_status": null}, "confidence": 0.85, "sourceExcerpt": "NOC Team: currently doing manual alert triage"}]
</example>

<example>
Input: "This week's focus: finalize integration testing with ServiceNow, prepare for pilot launch"
Output: [{"entityType": "weekly_focus", "fields": {"bullets": ["Finalize integration testing with ServiceNow", "Prepare for pilot launch"]}, "confidence": 0.8, "sourceExcerpt": "This week's focus: finalize integration testing"}]
</example>

<example>
Input: "Mike: End-to-end for the NOC — alerts come in through Event Ingest, BigPanda runs correlation and enrichment, then anything that hits the severity threshold automatically creates a ticket in ServiceNow. The NOC engineer reviews it there, works the incident, closes it out. We're also routing high-severity incidents to PagerDuty for on-call escalation but that's still manual."
Output: [{"entityType": "e2e_workflow", "fields": {"team_name": "NOC", "workflow_name": "NOC Alert-to-Resolution Workflow", "steps": [{"label": "Event Ingest", "track": "ADR", "status": "live", "position": 1}, {"label": "Correlation and Enrichment", "track": "ADR", "status": "live", "position": 2}, {"label": "ServiceNow Ticket Creation", "track": "ADR", "status": "pilot", "position": 3}, {"label": "NOC Engineer Review and Resolution", "track": "ADR", "status": "live", "position": 4}, {"label": "PagerDuty Escalation (manual)", "track": "ADR", "status": "planned", "position": 5}]}, "confidence": 0.85, "sourceExcerpt": "End-to-end for the NOC — alerts come in through Event Ingest..."}]
NOT a "workstream" or "team_pathway" — a described sequence of steps for a named team is always e2e_workflow.
</example>


- team: { team_name, track, ingest_status, correlation_status, incident_intelligence_status, sn_automation_status, biggy_ai_status } — team onboarding status across all capability tracks; use null for any status field not explicitly mentioned
- wbs_task: { title, track (WBS template track — INFER from document context: "ADR" if BigPanda/enterprise deployment, "Biggy" if startup/SMB. Default to "ADR" if unclear), parent_section_name (section heading this task falls under — INFER from heading hierarchy; if item appears under "Solution Design", use "Solution Design". Match to seeded template names: Solution Design, Technical Architecture, Implementation, Go-Live), level (1, 2, or 3 — 1 for top-level sections, 2 for sub-items, 3 for leaf tasks), status ("not_started" | "in_progress" | "complete" — normalize variants: "done"/"finished" → "complete", "in progress"/"ongoing" → "in_progress", "not started"/"todo" → "not_started"), description (task details or null) } — task that belongs in WBS structure; extract track and parent section verbatim as they appear in document; use level to indicate hierarchy depth
- workstream: { name, track, phase, status, percent_complete } — delivery workstream or project phase name; use for named delivery tracks with status and completion percentage
- focus_area: { title, tracks, why_it_matters, current_status, next_step, bp_owner, customer_owner } — a named focus area or strategic priority with ownership and status; use for named workstreams, priorities, or initiatives with a clear owner and next step
- e2e_workflow: { team_name, workflow_name, steps } — PRIMARY type for any team workflow sequence. Use this whenever a team's process steps are described, even conversationally. ASSEMBLE from scattered mentions: stitch together a team's end-to-end journey even when steps appear across multiple sections. steps is an array of { label, track, status, position } objects; assign sequential positions starting at 1.
  Example: Document mentions "NOC team starts with alert ingestion, then correlation, then creates incidents in ServiceNow" → extract as steps: [{"label": "Alert Ingestion", "track": "ADR", "status": "live", "position": 1}, {"label": "Correlation", "track": "ADR", "status": "live", "position": 2}, {"label": "Incident Creation in ServiceNow", "track": "ADR", "status": "live", "position": 3}]. Use null for any step field not determinable from context.
  IMPORTANT: Do NOT use team_pathway for this — team_pathway is only for simple route strings, not step-by-step workflows.
- team_pathway: { team_name, route_description (the delivery route steps joined by ' → ' e.g. "Alert Ingest → Correlation → Incident Creation → SNow Ticket"), status ("live" | "in_progress" | "pilot" | "planned"), notes } — use ONLY when the document explicitly describes a named delivery route as a simple string with no step details. If step details exist (status per step, descriptions, tools per step), use e2e_workflow instead.
- weekly_focus: { bullets (JSON array of 3–5 strings — SYNTHESIZE from actual project signals; each bullet is an action-oriented imperative phrase, e.g. "Resolve ServiceNow integration blocker before pilot launch") } — ALWAYS synthesize weekly_focus even if no "This Week" section exists. SOURCE SIGNALS in priority order: (1) open action items and overdue tasks, (2) unresolved risks, (3) upcoming milestones. Do NOT extract verbatim; generate focused, prioritized items from the document's actual project state. Hard limit: 3–5 bullets maximum — prioritize rather than enumerate everything. SINGLETON: Extract at most ONE weekly_focus entity per document.
- stakeholder: { name, role, email, account }
- businessOutcome: { title, track, description, delivery_status }
- onboarding_step: { team_name, step_name, track, status, completed_date } — specific onboarding step for a team (e.g. ADR track steps); NOT the same as a generic task

Key disambiguation for this pass:
- e2e_workflow vs team_pathway: If a team's process involves identifiable steps (even described conversationally), use e2e_workflow. Use team_pathway ONLY for a simple named route string with no step-level detail. When in doubt, prefer e2e_workflow.
- task vs wbs_task: wbs_task = item that belongs in a WBS hierarchy with a track (WBS template track — INFER from document context: "ADR" if BigPanda/enterprise deployment, "Biggy" if startup/SMB. Default to "ADR" if unclear), a parent section (e.g. "Solution Design", "Platform Configuration"), and a level (1/2/3). Rule: If document mentions WBS structure, ADR/Biggy tracks, or explicit template section names → wbs_task.
- team vs stakeholder: team = a TEAM (group of people) with onboarding status across BigPanda capability tracks; stakeholder = a NAMED INDIVIDUAL with role, email, account.
- workstream vs task vs wbs_task: workstream = named DELIVERY TRACK or work stream (e.g. "ADR Workstream", "Integration Workstream") with owner and percent_complete — not individual tasks. Do NOT extract individual tasks as workstreams. Workstreams are high-level tracks spanning multiple tasks.
- arch_node track names (reference only): track names "ADR Track" and "AI Assistant Track" were covered in pass 2.

## SCANNING INSTRUCTION
Before extracting, scan the document section-by-section (introduction, main body, tables, bullet lists,
appendices). Do not skip any section — entities often appear in tables or footnotes.

## SELF-CHECK
Before calling record_entities, verify:
1. Have I extracted all entities of the allowed types from every section?
2. Have I applied the STATUS NORMALIZATION table to all status fields?
3. Have I attempted date inference for all date fields (and justified any null)?
4. Have I used the examples above to resolve ambiguous entity types?

## DOCUMENT-TYPE-AWARE EXTRACTION

If document type is \`transcript\` or \`status-update\` (from Pass 0 pre_analysis above):
- Infer more aggressively from scattered mentions and conversational language
- Assemble entities from partial information spread across multiple sections
- Synthesize fields where explicit content is absent but signals exist
- Use lower confidence scores (0.5–0.7) to reflect inference vs direct extraction
- Recognize implicit action items (e.g., "John mentioned he'll look into the configuration")
- Extract meeting follow-ups, commitments, and decisions from dialogue patterns
- PRIORITY — \`e2e_workflow\`: Any described sequence of steps a team follows — even in a single conversational sentence — MUST be extracted as an e2e_workflow. Do NOT absorb team process descriptions into \`workstream\`, \`task\`, or \`team_pathway\`. If the document mentions a team and a sequence of steps (even implicitly: "first we do X, then Y, then Z" or "NOC team workflow: A → B → C"), extract it as e2e_workflow with steps. A brief description is sufficient; do not require a formal list.
- PRIORITY — \`weekly_focus\`: ALWAYS synthesize from open action items, risks, and upcoming milestones in the transcript. Do not require an explicit "This Week" section.

If document type is \`formal-doc\`:
- Prefer explicit extraction from labeled sections when available
- Use higher confidence scores (0.8–0.95) for content from labeled sections
- Still apply inference for content that spans multiple sections

Extract all names exactly as they appear in the document. Use null for any field not explicitly present.`,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractionPass {
  passNumber: 0 | 1 | 2 | 3;
  label: string;
  entityTypes: EntityType[];
}

// Pass 0 pre-analysis prompt (EXTR-11)
export const PASS_0_PROMPT = `You are a document pre-analyzer. Your task is to (1) classify the document type, (2) predict likely entity types, and (3) quote 5-10 high-value sections.

STEP 1: Classify document type
Determine which ONE of these best describes the document:
- transcript: meeting or call notes with dialogue, conversation, or first-person statements
- status-update: periodic written update (email format, weekly status doc, progress report)
- formal-doc: structured report or specification with explicit section headings

STEP 2: Predict likely entity types
Based on a quick scan, list the entity types most likely present in this document. Choose from:
action, risk, decision, milestone, stakeholder, task, architecture, history, businessOutcome, team, note, team_pathway, workstream, onboarding_step, integration, wbs_task, arch_node, focus_area, e2e_workflow, before_state, weekly_focus

STEP 3: Quote relevant sections
Quote the 5-10 most information-dense sections relevant to: project status, tasks, architecture, and team engagement. Include pain-point language, comparative language ("before BigPanda", "we used to"), and any "this week" or focus content — these may yield before_state and weekly_focus entities.

OUTPUT FORMAT (required — output exactly these XML tags):
<document_type>transcript | status-update | formal-doc</document_type>
<likely_entity_types>comma, separated, list</likely_entity_types>

<relevant_section>
[Quote verbatim or near-verbatim — do not paraphrase]
</relevant_section>

<relevant_section>
[Quote verbatim or near-verbatim — do not paraphrase]
</relevant_section>

Do NOT extract entities yet. Do NOT output JSON. Classify, predict, and quote only.`;

export const PASSES: ExtractionPass[] = [
  {
    passNumber: 0,
    label: 'Pre-analysis',
    entityTypes: [],
  },
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

export function splitIntoChunks(text: string, limit: number): string[] {
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
    // EXTR-09: Add overlap — next chunk starts CHUNK_OVERLAP chars before the end of this chunk
    start = Math.max(start + 1, end - CHUNK_OVERLAP);
  }
  return chunks.filter(c => c.length > 0);
}

function normalize(value: string | undefined | null): string {
  if (!value) return '';
  return value.toLowerCase().trim().slice(0, 120);
}

// Local isAlreadyIngested removed — imported from lib/extraction-types.ts (Phase 52 Plan 02)

// DEPRECATED — replaced by tool use in EXTR-08. Kept as dead code for reference.
// function parseClaudeResponse(text: string): ExtractionItem[] {
//   const stripped = text.trim()
//     .replace(/^```(?:json)?\s*/i, '')
//     .replace(/\s*```\s*$/, '')
//     .trim();
//   const repaired = jsonrepair(stripped);
//   const parsed = JSON.parse(repaired);
//   return Array.isArray(parsed) ? (parsed as ExtractionItem[]) : [];
// }

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

// ─── Helper: Tool Use Call ────────────────────────────────────────────────────

async function runClaudeToolUseCall(
  client: Anthropic,
  content: Anthropic.MessageParam['content'],
  systemPrompt: string,
): Promise<{ items: ExtractionItem[]; coverage: string }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
    tools: [RECORD_ENTITIES_TOOL],
    tool_choice: { type: 'tool', name: 'record_entities' },
  });

  // Extract tool use block
  const toolBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );

  if (!toolBlock || toolBlock.name !== 'record_entities') {
    return { items: [], coverage: '' };
  }

  const input = toolBlock.input as { entities?: ExtractionItem[]; coverage?: string };
  return {
    items: input.entities ?? [],
    coverage: input.coverage ?? '',
  };
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

    // ─── Pass 0: Pre-analysis (runs once per document) ────────────────────────
    let preAnalysisContext = '';

    try {
      // For PDF path: use the PDF document content block
      // For text path: use first chunk (or full text if under limit)
      const isPdf = extractResult.kind === 'pdf';
      const pass0Content = isPdf
        ? [
            {
              type: 'document' as const,
              source: {
                type: 'base64' as const,
                media_type: 'application/pdf' as const,
                data: extractResult.base64,
              },
            } as Anthropic.DocumentBlockParam,
            { type: 'text' as const, text: PASS_0_PROMPT },
          ]
        : [
            {
              type: 'text' as const,
              text: `<document>\n${extractResult.content.slice(0, CHUNK_CHAR_LIMIT)}\n</document>\n\n${PASS_0_PROMPT}`,
            },
          ];

      const pass0Response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096, // Pre-analysis is concise — 4k sufficient
        system: 'You are a document pre-analyzer. Extract key sections only.',
        messages: [{ role: 'user', content: pass0Content }],
      });

      const pass0Text = pass0Response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n');

      if (pass0Text.trim()) {
        preAnalysisContext = `<pre_analysis>\n${pass0Text}\n</pre_analysis>`;
      }

      // Update progress: Pass 0 complete = 10%
      await db.update(extractionJobs)
        .set({ progress_pct: 10, updated_at: new Date() })
        .where(eq(extractionJobs.id, jobId));

    } catch (err) {
      // Pass 0 failure is non-fatal — log and continue without pre-analysis
      console.warn('[Pass 0] pre-analysis failed, continuing without context:', err);
      preAnalysisContext = '';
    }

    // 5. Extract — 3-pass extraction (Phase 52, now with Pass 0 pre-analysis context)
    let allRawItems: ExtractionItem[] = [];
    const coverageByPass: Record<number, string> = {};

    if (extractResult.kind === 'pdf') {
      // PDF: 3 sequential calls (one per pass), Claude handles PDF natively
      // Pass 0 already complete at 10%, now run Passes 1-3
      await db.update(extractionJobs)
        .set({
          total_chunks: 3, // Passes 1-3 only (Pass 0 is not a chunk-processing pass)
          current_chunk: 0,
          updated_at: new Date()
        })
        .where(eq(extractionJobs.id, jobId));

      // Skip Pass 0 in the loop (already done above)
      const contentPasses = PASSES.filter(p => p.passNumber !== 0);

      for (let passIdx = 0; passIdx < contentPasses.length; passIdx++) {
        const pass = contentPasses[passIdx];
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
          // Prepend pre-analysis context if available
          ...(preAnalysisContext ? [{ type: 'text' as const, text: preAnalysisContext }] : []),
          {
            type: 'text',
            text: passUserText,
          },
        ];

        // EXTR-08: use tool use instead of streaming
        const { items: passItems, coverage: passCoverage } = await runClaudeToolUseCall(client, userContent, passSystemPrompt);
        allRawItems.push(...passItems);
        coverageByPass[pass.passNumber] = passCoverage; // EXTR-10: store per-pass coverage

        // Global progress with Pass 0: Pass 0 = 10%, Pass 1 = 40%, Pass 2 = 70%, Pass 3 = 100%
        const progressMap = { 1: 40, 2: 70, 3: 100 };
        const globalPct = progressMap[pass.passNumber as 1 | 2 | 3] ?? 100;
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
      // Pass 0 already complete at 10%, now run Passes 1-3
      const chunks = splitIntoChunks(extractResult.content, CHUNK_CHAR_LIMIT);
      const totalChunks = chunks.length;

      await db.update(extractionJobs)
        .set({
          total_chunks: totalChunks, // Passes 1-3 only (Pass 0 is not a chunk-processing pass)
          current_chunk: 0,
          updated_at: new Date()
        })
        .where(eq(extractionJobs.id, jobId));

      // Skip Pass 0 in the loop (already done above)
      const contentPasses = PASSES.filter(p => p.passNumber !== 0);

      for (let passIdx = 0; passIdx < contentPasses.length; passIdx++) {
        const pass = contentPasses[passIdx];
        const passSystemPrompt = PASS_PROMPTS[pass.passNumber];

        for (let i = 0; i < chunks.length; i++) {
          // Prepend pre-analysis context to user message
          // NOTE: do NOT append passSystemPrompt here — it is already the system param.
          // Appending it after the "Extract ONLY" constraint causes the model to ignore
          // the constraint and fall back to the full entity list at the end of the message.
          const passUserText = preAnalysisContext
            ? `${preAnalysisContext}\n\n<document>\n${chunks[i]}\n</document>\n\nExtract ONLY the following entity types: ${pass.entityTypes.join(', ')}. Call record_entities with your findings.`
            : `<document>\n${chunks[i]}\n</document>\n\nExtract ONLY the following entity types: ${pass.entityTypes.join(', ')}. Call record_entities with your findings.`;

          const userContent: Anthropic.MessageParam['content'] = [
            {
              type: 'text',
              text: passUserText,
            },
          ];

          // EXTR-08: use tool use instead of streaming
          const { items: chunkItems, coverage: chunkCoverage } = await runClaudeToolUseCall(client, userContent, passSystemPrompt);
          allRawItems.push(...chunkItems);

          // EXTR-10: accumulate coverage (last chunk of pass overwrites — this is OK for text chunks)
          if (i === chunks.length - 1) {
            coverageByPass[pass.passNumber] = chunkCoverage;
          }

          // Global progress with Pass 0: Pass 0 = 10%, Passes 1-3 split remaining 90%
          // Pass 1: 10 + (30 * progress), Pass 2: 40 + (30 * progress), Pass 3: 70 + (30 * progress)
          const passProgressPct = (i + 1) / totalChunks;
          const baseProgress = { 1: 10, 2: 40, 3: 70 };
          const globalPct = Math.round(baseProgress[pass.passNumber as 1 | 2 | 3] + (passProgressPct * 30));
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
        coverage_json: coverageByPass, // EXTR-10: store per-pass coverage summary
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
