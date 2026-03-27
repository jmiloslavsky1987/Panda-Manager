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
