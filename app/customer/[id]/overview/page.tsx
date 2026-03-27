import Link from 'next/link'
import { OnboardingDashboard } from '../../../../components/OnboardingDashboard'
import { db } from '../../../../db'
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
} from '../../../../db/schema'
import { computeCompletenessScore, getBannerData, type TableCounts } from '../../../api/projects/[projectId]/completeness/route'
import { eq, count } from 'drizzle-orm'

// Maps tab label to URL path segment
function getTabPath(tabLabel: string): string {
  const map: Record<string, string> = {
    'Actions': 'actions',
    'Risks': 'risks',
    'Milestones': 'milestones',
    'Stakeholders': 'stakeholders',
    'Decisions': 'decisions',
    'Architecture': 'architecture',
    'Teams': 'teams',
    'Engagement History': 'history',
    'Business Outcomes': 'plan',
  }
  return map[tabLabel] ?? tabLabel.toLowerCase().replace(/\s+/g, '-')
}

const SCORED_TABS = [
  { label: 'Actions',            table: actions,                   key: 'actions' as const },
  { label: 'Risks',              table: risks,                     key: 'risks' as const },
  { label: 'Milestones',         table: milestones,                key: 'milestones' as const },
  { label: 'Stakeholders',       table: stakeholders,              key: 'stakeholders' as const },
  { label: 'Decisions',          table: keyDecisions,              key: 'keyDecisions' as const },
  { label: 'Architecture',       table: architectureIntegrations,  key: 'architectureIntegrations' as const },
  { label: 'Teams',              table: teamOnboardingStatus,      key: 'teamOnboardingStatus' as const },
  { label: 'Engagement History', table: engagementHistory,         key: 'engagementHistory' as const },
  { label: 'Business Outcomes',  table: businessOutcomes,          key: 'businessOutcomes' as const },
]

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  // Fetch completeness data via direct DB queries (avoids HTTP self-call)
  let score = 0
  let emptyTabs: string[] = []

  try {
    const results = await Promise.all(
      SCORED_TABS.map(async (tab) => {
        const rows = await db
          .select({ cnt: count() })
          .from(tab.table)
          .where(eq(tab.table.project_id, projectId))
        return { label: tab.label, key: tab.key, cnt: rows[0]?.cnt ?? 0 }
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

    score = computeCompletenessScore(counts)
    const banner = getBannerData(results.filter((r) => r.cnt === 0).map((r) => r.label))
    emptyTabs = banner.emptyTabs
  } catch {
    // DB unavailable — render without completeness data
  }

  const showBanner = score < 60 && emptyTabs.length > 0

  return (
    <div className="space-y-4">
      {/* Completeness Score Bar — always visible (WIZ-08, WIZ-09) */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-zinc-700">Project Completeness</span>
          <span className="text-sm font-semibold text-zinc-900">{score}%</span>
        </div>
        <div className="w-full bg-zinc-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Below-60% warning banner — non-dismissible, disappears when score >= 60% */}
      {showBanner && (
        <div className="mx-6 rounded border border-yellow-400 bg-yellow-50 px-4 py-3">
          <p className="text-sm font-medium text-yellow-800 mb-1">
            Missing data in:{' '}
            {emptyTabs.map((tab, i) => (
              <span key={tab}>
                <Link
                  href={`/customer/${id}/${getTabPath(tab)}`}
                  className="underline hover:text-yellow-900"
                >
                  {tab}
                </Link>
                {i < emptyTabs.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>
          <p className="text-xs text-yellow-700">
            Add data to these tabs to reach 60% completeness.
          </p>
        </div>
      )}

      <OnboardingDashboard projectId={projectId} />
    </div>
  )
}
