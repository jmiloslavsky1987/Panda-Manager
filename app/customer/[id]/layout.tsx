import { Suspense } from 'react'
import { getProjectWithHealth } from '../../../lib/queries'
import { WorkspaceKpiStrip } from '../../../components/WorkspaceKpiStrip'
import { WorkspacePageBarConfigurator } from '../../../components/WorkspacePageBarConfigurator'
import { WorkspaceTabs } from '../../../components/WorkspaceTabs'
import WorkspaceSearchBar from '../../../components/WorkspaceSearchBar'
import { ArchivedBanner } from '../../../components/ArchivedBanner'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { projectMembers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { resolveRole } from '@/lib/auth-utils'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  // Graceful fallback when DB is unavailable (e.g. PostgreSQL not installed in dev)
  let project = null
  try {
    project = await getProjectWithHealth(projectId)
  } catch {
    // DB not available — render layout with empty project so child routes can still render
  }

  // Determine if user is a project admin
  const session = await auth.api.getSession({ headers: await headers() })
  let isProjectAdmin = false

  if (session?.user) {
    if (resolveRole(session) === 'admin') {
      isProjectAdmin = true
    } else {
      // Check project membership
      const [member] = await db
        .select({ role: projectMembers.role })
        .from(projectMembers)
        .where(and(
          eq(projectMembers.project_id, projectId),
          eq(projectMembers.user_id, session.user.id)
        ))
        .limit(1)

      isProjectAdmin = member?.role === 'admin'
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--kata-surface-canvas)' }}>
      {project ? (
        <WorkspacePageBarConfigurator
          title={project.customer}
          health={project.health}
          ctaSlot={<WorkspaceSearchBar projectId={project.id} />}
        />
      ) : (
        <div
          className="flex items-center px-4 border-b"
          style={{
            height: 44,
            background: 'var(--kata-surface-container)',
            borderColor: 'var(--kata-stroke-subtle)',
            flexShrink: 0,
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--kata-on-container-tertiary)' }}>
            Loading project…
          </span>
        </div>
      )}
      {project && <WorkspaceKpiStrip project={project} projectId={projectId} />}
      {project?.status === 'archived' && (
        <Suspense fallback={null}>
          <ArchivedBanner projectId={projectId} isAdmin={isProjectAdmin} />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <WorkspaceTabs projectId={id} />
      </Suspense>
      <div className="flex-1 p-6 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
