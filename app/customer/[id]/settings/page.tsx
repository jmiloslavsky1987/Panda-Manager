import { DangerZoneSection } from '@/components/workspace/DangerZoneSection'
import { ProjectSettingsForm } from '@/components/ProjectSettingsForm'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { projectMembers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { resolveRole } from '@/lib/auth-utils'
import { getProjectWithHealth } from '@/lib/queries'

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  // Get current session
  const session = await auth.api.getSession({ headers: await headers() })

  // Determine if user is a project admin
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

  // Fetch project for settings form
  let project = null
  try {
    project = await getProjectWithHealth(projectId)
  } catch {
    // DB not available
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-zinc-900 mb-6">Project Settings</h2>
      {project ? (
        <ProjectSettingsForm
          project={project}
          projectId={projectId}
          isAdmin={isProjectAdmin}
        />
      ) : (
        <p className="text-sm text-zinc-500 mb-6">Could not load project settings.</p>
      )}
      {isProjectAdmin && (
        <DangerZoneSection projectId={projectId} isArchived={project?.status === 'archived'} />
      )}
    </div>
  )
}
