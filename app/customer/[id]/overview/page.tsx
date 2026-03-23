import { OnboardingDashboard } from '../../../../components/OnboardingDashboard'

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <OnboardingDashboard projectId={parseInt(id, 10)} />
}
