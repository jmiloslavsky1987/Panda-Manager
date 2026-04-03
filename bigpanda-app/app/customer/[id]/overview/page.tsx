import { OnboardingDashboard } from '../../../../components/OnboardingDashboard'
import { MilestoneTimeline } from '../../../../components/MilestoneTimeline'
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
      <MilestoneTimeline projectId={projectId} />
      <OnboardingDashboard projectId={projectId} />
      <OverviewMetrics projectId={projectId} />
      <HealthDashboard projectId={projectId} />
    </div>
  )
}
