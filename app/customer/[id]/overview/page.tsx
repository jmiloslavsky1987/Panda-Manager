import { OnboardingDashboard } from '../../../../components/OnboardingDashboard'

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  return <OnboardingDashboard projectId={projectId} />
}
