import { getTeamsTabData, getProjectById } from '@/lib/queries'
import { TeamEngagementMap } from '@/components/teams/TeamEngagementMap'

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  const [data, project] = await Promise.all([
    getTeamsTabData(projectId),
    getProjectById(projectId),
  ])
  return (
    <div data-testid="teams-tab" className="space-y-8">
      <TeamEngagementMap
        projectId={projectId}
        customer={project.customer}
        data={data}
      />
    </div>
  )
}
