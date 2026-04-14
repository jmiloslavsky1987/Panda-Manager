import { MembersTab } from '@/components/workspace/MembersTab'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { projectMembers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { resolveRole } from '@/lib/auth-utils'

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  // Get current session
  const session = await auth.api.getSession({ headers: await headers() })

  // Determine if user is a project admin
  // Global admins (resolveRole returns 'admin') are always project admins
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

  return <MembersTab projectId={projectId} isProjectAdmin={isProjectAdmin} />
}
