// bigpanda-app/worker/jobs/wbs-generate-plan.ts
// WBS Generate Plan logic — AI-powered gap-fill for WBS items.
// Called synchronously from /api/projects/[projectId]/wbs/generate/route.ts
// Returns proposals for preview modal (no direct DB writes).

import Anthropic from '@anthropic-ai/sdk';
import db from '../../db';
import { projects, actions, risks, milestones, keyDecisions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type { WbsItem } from '../../db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WbsProposal {
  parent_section_name: string;  // exact Level 1 section name
  level: 2 | 3;
  name: string;
  track: 'ADR' | 'Biggy';
  parent_id: number;            // resolved from parent_section_name lookup
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Build WBS proposals from AI analysis of project context + existing WBS items.
 * @param projectId - Project ID
 * @param existingItems - All existing WBS items (both tracks, all levels)
 * @returns Array of WbsProposal (deduplicated, Level 2/3 only, parent resolved)
 */
export async function buildWbsProposals(
  projectId: number,
  existingItems: WbsItem[]
): Promise<WbsProposal[]> {
  // 1. Fetch project context from DB
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new Error(`Project ${projectId} not found`);

  const [projectActions, projectRisks, projectMilestones, projectDecisions] = await Promise.all([
    db.select().from(actions).where(eq(actions.project_id, projectId)),
    db.select().from(risks).where(eq(risks.project_id, projectId)),
    db.select().from(milestones).where(eq(milestones.project_id, projectId)),
    db.select().from(keyDecisions).where(eq(keyDecisions.project_id, projectId)),
  ]);

  // 2. Build Level 1 section map (CRITICAL — prevents hallucination per pitfall 6)
  const l1Items = existingItems.filter(i => i.level === 1);
  const existingNames = new Set(existingItems.map(i => i.name.toLowerCase().trim()));

  const adrSections = l1Items.filter(i => i.track === 'ADR').map(i => i.name);
  const biggySections = l1Items.filter(i => i.track === 'Biggy').map(i => i.name);

  // 3. Build system prompt
  const systemPrompt = `You are a WBS gap-fill assistant for a BigPanda Professional Services project.
Analyze the project context and propose Level 2 or Level 3 WBS tasks that are MISSING from the current structure.

CRITICAL RULES:
- You may ONLY propose items under these EXACT parent section names:
  ADR Track: ${adrSections.join(', ') || '(no sections defined)'}
  Biggy Track: ${biggySections.join(', ') || '(no sections defined)'}
- Do NOT propose Level 1 sections. Only Level 2 or Level 3 items.
- Do NOT propose items that already exist (listed in the Existing WBS Items section below).
- If a task doesn't fit any existing section, skip it.
- parent_section_name must EXACTLY match one of the section names above (case-sensitive).

Output ONLY a JSON array (no markdown, no explanation):
[
  {
    "parent_section_name": "<exact L1 name>",
    "level": 2,
    "name": "<task name>",
    "track": "ADR"
  }
]

If no new tasks are needed, return an empty array: []`;

  // 4. Build user message with project context + existing WBS item names
  const sections: string[] = [
    `# Project Context`,
    ``,
    `## Project`,
    `Name: ${project.name}`,
    `Customer: ${project.customer}`,
    `Status: ${project.overall_status ?? 'N/A'}`,
    `Go-Live Target: ${project.go_live_target ?? 'N/A'}`,
    `Summary: ${project.status_summary ?? 'N/A'}`,
    ``,
  ];

  if (projectActions.length) {
    sections.push(`## Actions (${projectActions.length} total)`);
    projectActions.slice(0, 20).forEach(a => {
      sections.push(`- ${a.description} | Owner: ${a.owner ?? 'TBD'} | Status: ${a.status}`);
    });
    sections.push('');
  }

  if (projectRisks.length) {
    sections.push(`## Risks (${projectRisks.length} total)`);
    projectRisks.slice(0, 15).forEach(r => {
      sections.push(`- ${r.description} | Severity: ${r.severity ?? 'N/A'}`);
    });
    sections.push('');
  }

  if (projectMilestones.length) {
    sections.push(`## Milestones`);
    projectMilestones.forEach(m => {
      sections.push(`- ${m.name} | Status: ${m.status ?? 'N/A'}`);
    });
    sections.push('');
  }

  if (projectDecisions.length) {
    sections.push(`## Key Decisions`);
    projectDecisions.slice(0, 10).forEach(d => {
      sections.push(`- ${d.decision} (${d.date ?? 'N/A'})`);
    });
    sections.push('');
  }

  // Include existing WBS items grouped by track and level
  sections.push(`## Existing WBS Items`);
  sections.push('');
  sections.push('### ADR Track');
  existingItems.filter(i => i.track === 'ADR').forEach(i => {
    sections.push(`- [L${i.level}] ${i.name}`);
  });
  sections.push('');
  sections.push('### Biggy Track');
  existingItems.filter(i => i.track === 'Biggy').forEach(i => {
    sections.push(`- [L${i.level}] ${i.name}`);
  });

  const userMessage = sections.join('\n');

  // 5. Call Anthropic SDK (claude-sonnet-4-6 — established pattern)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  // 6. Parse JSON response
  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return []; // No text response — return empty proposals
  }

  let rawJson = textContent.text.trim();
  // Strip markdown code fences if present
  rawJson = rawJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed: Array<{
    parent_section_name: string;
    level: number;
    name: string;
    track: string;
  }>;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.error('[wbs-generate-plan] Failed to parse AI response as JSON:', rawJson);
    return []; // Parse failure — return empty proposals
  }

  if (!Array.isArray(parsed)) {
    console.error('[wbs-generate-plan] AI response is not an array:', parsed);
    return []; // Not an array — return empty proposals
  }

  // 7. Validate and resolve parent_id
  const proposals: WbsProposal[] = [];

  for (const p of parsed) {
    // Enforce L2/L3 only
    if (p.level !== 2 && p.level !== 3) continue;

    // Dedup — skip if name already exists (case-insensitive)
    if (existingNames.has(p.name.toLowerCase().trim())) continue;

    // Validate track
    if (p.track !== 'ADR' && p.track !== 'Biggy') continue;

    // Resolve parent_id — drop if parent_section_name doesn't match any L1 item
    const parent = l1Items.find(
      i => i.name === p.parent_section_name && i.track === p.track
    );
    if (!parent) {
      console.warn(
        `[wbs-generate-plan] Dropping proposal "${p.name}" — parent_section_name "${p.parent_section_name}" not found in L1 items for track ${p.track}`
      );
      continue; // Drop hallucinated parent sections
    }

    proposals.push({
      parent_section_name: p.parent_section_name,
      level: p.level as 2 | 3,
      name: p.name,
      track: p.track as 'ADR' | 'Biggy',
      parent_id: parent.id,
    });
  }

  return proposals;
}
