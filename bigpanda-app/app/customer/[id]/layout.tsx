import { Suspense } from 'react'
import { getProjectWithHealth } from '../../../lib/queries'
import { ProjectHeader } from '../../../components/ProjectHeader'
import { WorkspaceTabs } from '../../../components/WorkspaceTabs'
import { AddNotesModal } from '../../../components/AddNotesModal'
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
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-2 border-b border-zinc-200 bg-white flex items-center justify-between">
        <div>
          {project ? (
            <ProjectHeader project={project} />
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="font-semibold text-xl text-zinc-400">Loading project…</h1>
            </div>
          )}
        </div>
        {project && <WorkspaceSearchBar projectId={project.id} />}
      </div>
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
      {project && <AddNotesModal projectId={projectId} />}
    </div>
  )
}
