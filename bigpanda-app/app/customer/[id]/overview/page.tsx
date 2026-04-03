import { WeeklyFocus } from '../../../../components/WeeklyFocus'
import { OnboardingDashboard } from '../../../../components/OnboardingDashboard'
import { OverviewMetrics } from '../../../../components/OverviewMetrics'
import { HealthDashboard } from '../../../../components/HealthDashboard'

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  return (
    <div className="space-y-6 py-4">
      <WeeklyFocus projectId={projectId} />
      <OnboardingDashboard projectId={projectId} />
      <OverviewMetrics projectId={projectId} />
      <HealthDashboard projectId={projectId} />
    </div>
  )
}
