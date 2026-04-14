import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projectMembers, users } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'
import { writeAuditLog } from '@/lib/audit'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  // Any project member can view the member list
  const { session, redirectResponse } = await requireProjectRole(numericId, 'user')
  if (redirectResponse) return redirectResponse

  // JOIN with users table to get name and email
  const members = await db
    .select({
      id: projectMembers.id,
      userId: projectMembers.user_id,
      name: users.name,
      email: users.email,
      role: projectMembers.role,
      createdAt: projectMembers.created_at,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.user_id, users.id))
    .where(eq(projectMembers.project_id, numericId))

  return NextResponse.json({ members })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  // Only project admins can add members
  const { session, redirectResponse } = await requireProjectRole(numericId, 'admin')
  if (redirectResponse) return redirectResponse

  const body = await req.json()
  const { userId, role } = body

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
  }

  if (role !== 'admin' && role !== 'user') {
    return NextResponse.json({ error: 'Invalid role: must be admin or user' }, { status: 400 })
  }

  // Check if user already a member
  const [existing] = await db
    .select()
    .from(projectMembers)
    .where(and(
      eq(projectMembers.project_id, numericId),
      eq(projectMembers.user_id, userId)
    ))
    .limit(1)

  if (existing) {
    return NextResponse.json({ error: 'User is already a member of this project' }, { status: 409 })
  }

  // Insert the new member
  const [member] = await db
    .insert(projectMembers)
    .values({
      project_id: numericId,
      user_id: userId,
      role,
    })
    .returning()

  // Audit log
  await writeAuditLog({
    entityType: 'project_member',
    entityId: member.id,
    action: 'create',
    actorId: session!.user.id,
    afterJson: { project_id: numericId, user_id: userId, role },
  })

  return NextResponse.json({ member })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  // Only project admins can change roles
  const { session, redirectResponse } = await requireProjectRole(numericId, 'admin')
  if (redirectResponse) return redirectResponse

  const body = await req.json()
  const { userId, role } = body

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
  }

  if (role !== 'admin' && role !== 'user') {
    return NextResponse.json({ error: 'Invalid role: must be admin or user' }, { status: 400 })
  }

  // Get current member data for audit
  const [currentMember] = await db
    .select()
    .from(projectMembers)
    .where(and(
      eq(projectMembers.project_id, numericId),
      eq(projectMembers.user_id, userId)
    ))
    .limit(1)

  if (!currentMember) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // GUARD: if changing to 'user', check remaining admin count
  if (role === 'user' && currentMember.role === 'admin') {
    const adminCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectMembers)
      .where(and(
        eq(projectMembers.project_id, numericId),
        eq(projectMembers.role, 'admin')
      ))

    const adminCount = Number(adminCountResult[0]?.count ?? 0)

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove last admin' },
        { status: 400 }
      )
    }
  }

  // Update the role
  const [updated] = await db
    .update(projectMembers)
    .set({ role })
    .where(and(
      eq(projectMembers.project_id, numericId),
      eq(projectMembers.user_id, userId)
    ))
    .returning()

  // Audit log
  await writeAuditLog({
    entityType: 'project_member',
    entityId: updated.id,
    action: 'update',
    actorId: session!.user.id,
    beforeJson: { role: currentMember.role },
    afterJson: { role },
  })

  return NextResponse.json({ member: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  // Only project admins can remove members
  const { session, redirectResponse } = await requireProjectRole(numericId, 'admin')
  if (redirectResponse) return redirectResponse

  const body = await req.json()
  const { userId } = body

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  // Get current member data for audit and guard check
  const [currentMember] = await db
    .select()
    .from(projectMembers)
    .where(and(
      eq(projectMembers.project_id, numericId),
      eq(projectMembers.user_id, userId)
    ))
    .limit(1)

  if (!currentMember) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // GUARD: if removing an admin, check remaining admin count
  if (currentMember.role === 'admin') {
    const adminCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectMembers)
      .where(and(
        eq(projectMembers.project_id, numericId),
        eq(projectMembers.role, 'admin')
      ))

    const adminCount = Number(adminCountResult[0]?.count ?? 0)

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove last admin' },
        { status: 400 }
      )
    }
  }

  // Delete the member
  await db
    .delete(projectMembers)
    .where(and(
      eq(projectMembers.project_id, numericId),
      eq(projectMembers.user_id, userId)
    ))

  // Audit log
  await writeAuditLog({
    entityType: 'project_member',
    entityId: currentMember.id,
    action: 'delete',
    actorId: session!.user.id,
    beforeJson: { user_id: userId, role: currentMember.role },
  })

  return NextResponse.json({ success: true })
}
