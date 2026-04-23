import { WeeklyFocus } from '../../../../components/WeeklyFocus'
import { OnboardingDashboard } from '../../../../components/OnboardingDashboard'
import { OverviewMetrics } from '../../../../components/OverviewMetrics'
import { HealthDashboard } from '../../../../components/HealthDashboard'
import { ExceptionsPanel } from '../../../../components/ExceptionsPanel'

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  return (
    <div className="space-y-6 py-4">
      <div className="flex gap-4">
        <div className="w-[30%]">
          <HealthDashboard projectId={projectId} />
          <ExceptionsPanel projectId={projectId} />
        </div>
        <div className="w-[70%]">
          <WeeklyFocus projectId={projectId} />
        </div>
      </div>
      <OnboardingDashboard projectId={projectId} />
      <OverviewMetrics projectId={projectId} />
    </div>
  )
}
