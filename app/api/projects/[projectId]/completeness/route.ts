import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  actions,
  risks,
  milestones,
  stakeholders,
  keyDecisions,
  architectureIntegrations,
  teamOnboardingStatus,
  engagementHistory,
  businessOutcomes,
} from '@/db/schema'
import { eq, count } from 'drizzle-orm'
import { requireProjectRole } from "@/lib/auth-server";
import Anthropic from '@anthropic-ai/sdk';
import { buildCompletenessContext } from '@/lib/completeness-context-builder';
import { TAB_TEMPLATE_REGISTRY, COMPLETENESS_SCHEMA_VERSION } from '@/lib/tab-template-registry';

export const dynamic = 'force-dynamic';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const COMPLETENESS_SYSTEM = `You are a project data quality analyst. Given a project's current workspace data, identify specific quality gaps per workspace tab.

Tab template requirements (what "complete" looks like per tab):
${JSON.stringify(TAB_TEMPLATE_REGISTRY, null, 2)}

Guidelines for assessment:
- "complete" = all required fields present for all records; no placeholder values (TBD, N/A, template text); meaningful content
- "partial" = some real data present but missing required fields, or has placeholder/TBD values
- "empty" = no records at all (after template records are excluded) OR only records with placeholder text
- Records with source='template' have already been excluded from the data — treat absent data as empty
- Gaps MUST be SPECIFIC: reference actual record IDs like [A-KAISER-003], counts, and exact missing fields
- Do NOT return "tab is incomplete" — always explain what is missing and which records need attention
- For tabs with no real data, status = "empty" and gaps = ["No real records — all data is template placeholder or missing"]
- Use status='conflicting' when records contain semantic contradictions. Examples: milestone marked 'complete' with no completion date; risk rated 'critical' with no mitigation plan; action marked 'done' with a future due date. Gap descriptions for conflicting entries MUST name specific record IDs and fields in conflict.
- Return a score (0-100 integer) per tab. 100 = all required fields populated with real content and no conflicts. 0 = completely empty. Partial = 1-79 based on proportion of required fields populated. Complete = 80-100. Conflicting = score data quality of the tab (e.g. 60 if most fields present but contradictions exist).
- Return exactly 11 entries: overview, actions, risks, milestones, teams, architecture, decisions, history, stakeholders, plan, skills`;

interface CompletenessEntry {
  tabId: string;
  status: 'complete' | 'partial' | 'empty' | 'conflicting';
  score: number;
  gaps: string[];
}

export type TableCounts = {
  actions: number
  risks: number
  milestones: number
  stakeholders: number
  keyDecisions: number
  architectureIntegrations: number
  teamOnboardingStatus: number
  engagementHistory: number
  businessOutcomes: number
}

export type BannerData = {
  show: boolean
  emptyTabs: string[]
}

/**
 * Computes completeness score from a TableCounts object.
 * Score = (number of populated tables / 9) * 100, rounded to nearest integer.
 */
export function computeCompletenessScore(counts: TableCounts): number {
  const populated = Object.values(counts).filter((c) => c > 0).length
  return Math.round((populated / 9) * 100)
}

/**
 * Returns banner data for the below-60% warning banner.
 * show: true when emptyTabs.length > 0, false otherwise.
 */
export function getBannerData(emptyTabs: string[]): BannerData {
  return {
    show: emptyTabs.length > 0,
    emptyTabs,
  }
}

const SCORED_TABS = [
  { label: 'Actions',            table: actions,                   key: 'actions' as const,                path: 'actions' },
  { label: 'Risks',              table: risks,                     key: 'risks' as const,                  path: 'risks' },
  { label: 'Milestones',         table: milestones,                key: 'milestones' as const,             path: 'milestones' },
  { label: 'Stakeholders',       table: stakeholders,              key: 'stakeholders' as const,           path: 'stakeholders' },
  { label: 'Decisions',          table: keyDecisions,              key: 'keyDecisions' as const,           path: 'decisions' },
  { label: 'Architecture',       table: architectureIntegrations,  key: 'architectureIntegrations' as const, path: 'architecture' },
  { label: 'Teams',              table: teamOnboardingStatus,      key: 'teamOnboardingStatus' as const,   path: 'teams' },
  { label: 'Engagement History', table: engagementHistory,         key: 'engagementHistory' as const,      path: 'history' },
  { label: 'Business Outcomes',  table: businessOutcomes,          key: 'businessOutcomes' as const,       path: 'plan' },
]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  const results = await Promise.all(
    SCORED_TABS.map(async (tab) => {
      const rows = await db
        .select({ cnt: count() })
        .from(tab.table)
        .where(eq(tab.table.project_id, numericId))
      return { label: tab.label, path: tab.path, key: tab.key, cnt: rows[0]?.cnt ?? 0 }
    })
  )

  const counts: TableCounts = {
    actions: 0,
    risks: 0,
    milestones: 0,
    stakeholders: 0,
    keyDecisions: 0,
    architectureIntegrations: 0,
    teamOnboardingStatus: 0,
    engagementHistory: 0,
    businessOutcomes: 0,
  }
  for (const r of results) {
    counts[r.key] = r.cnt
  }

  const populatedTabs = results.filter((r) => r.cnt > 0).map((r) => r.label)
  const emptyTabLabels = results.filter((r) => r.cnt === 0).map((r) => r.label)
  const score = computeCompletenessScore(counts)
  const banner = getBannerData(emptyTabLabels)

  return NextResponse.json({ score, populatedTabs, emptyTabs: banner.emptyTabs })
}

/**
 * POST /api/projects/[projectId]/completeness
 *
 * Performs detailed completeness analysis using Claude structured outputs.
 * Returns array of 11 entries (one per workspace tab) with status and specific gaps.
 *
 * Security: requireSession() at handler level.
 * Context: buildCompletenessContext() serializes all tab data + template definitions.
 * Output: Claude output_config.format json_schema guarantees valid JSON response.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const { session, redirectResponse } = await requireProjectRole(projectIdNum, 'user');
  if (redirectResponse) return redirectResponse;

  const contextPayload = await buildCompletenessContext(projectIdNum);

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16384,
    thinking: { type: 'adaptive' },
    system: COMPLETENESS_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `<project_data>\n${contextPayload}\n</project_data>\n\nAnalyze the project data above and return a completeness assessment for all 11 workspace tabs. Be specific — reference record IDs and exact missing fields in gap descriptions.`,
      },
    ],
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tabId: { type: 'string' },
              status: { type: 'string', enum: ['complete', 'partial', 'empty', 'conflicting'] },
              score: { type: 'integer', minimum: 0, maximum: 100 },
              gaps: { type: 'array', items: { type: 'string' } },
            },
            required: ['tabId', 'status', 'score', 'gaps'],
            additionalProperties: false,
          },
        },
      },
    },
  });

  // Extract text content (adaptive thinking may include thinking blocks — skip them)
  const textBlock = message.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return NextResponse.json({ error: 'No text response from Claude' }, { status: 500 });
  }

  const results: CompletenessEntry[] = JSON.parse(textBlock.text);
  return NextResponse.json({ schemaVersion: COMPLETENESS_SCHEMA_VERSION, results });
}
