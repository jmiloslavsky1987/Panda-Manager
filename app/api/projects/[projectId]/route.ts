import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects, skillRuns, extractionJobs } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { requireProjectRole } from "@/lib/auth-server";
import { seedProjectFromRegistry } from '@/lib/seed-project'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }
  const { session, redirectResponse, projectRole } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      customer: projects.customer,
      status_summary: projects.status_summary,
      go_live_target: projects.go_live_target,
    })
    .from(projects)
    .where(eq(projects.id, numericId))
    .limit(1)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({ project: { ...rows[0], projectRole } })
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

  // PATCH requires admin role (upgraded from 'user')
  const { session, redirectResponse } = await requireProjectRole(numericId, 'admin');
  if (redirectResponse) return redirectResponse;

  const body = await req.json()
  const { status } = body

  // Archived-project write-block: allow status transitions to 'archived' or 'active',
  // but block all other updates if project is currently archived
  const statusTransitions = ['archived', 'active'];
  if (!statusTransitions.includes(status)) {
    const [current] = await db.select({ status: projects.status })
      .from(projects).where(eq(projects.id, numericId)).limit(1);
    if (current?.status === 'archived') {
      return NextResponse.json({ error: 'Project is archived and read-only' }, { status: 403 });
    }
  }

  const updated = await db
    .update(projects)
    .set({ status, updated_at: new Date() })
    .where(eq(projects.id, numericId))
    .returning({ id: projects.id })

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Trigger seeding when project transitions to active
  if (status === 'active') {
    await seedProjectFromRegistry(numericId)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  // DELETE requires admin role
  const { session, redirectResponse } = await requireProjectRole(numericId, 'admin');
  if (redirectResponse) return redirectResponse;

  // Pre-flight 1: Fetch project and verify it's archived
  const [project] = await db
    .select({ id: projects.id, status: projects.status })
    .from(projects)
    .where(eq(projects.id, numericId))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  if (project.status !== 'archived') {
    return NextResponse.json({
      error: 'Project must be archived before permanent deletion'
    }, { status: 409 })
  }

  // Pre-flight 2: Check for active skill runs
  const activeSkillRuns = await db
    .select({ id: skillRuns.id })
    .from(skillRuns)
    .where(
      and(
        eq(skillRuns.project_id, numericId),
        inArray(skillRuns.status, ['pending', 'running'])
      )
    )
    .limit(1);

  if (activeSkillRuns.length > 0) {
    return NextResponse.json({
      error: 'Cannot delete project with active jobs running.'
    }, { status: 409 })
  }

  // Pre-flight 3: Check for active extraction jobs
  const activeExtractionJobs = await db
    .select({ id: extractionJobs.id })
    .from(extractionJobs)
    .where(
      and(
        eq(extractionJobs.project_id, numericId),
        inArray(extractionJobs.status, ['pending', 'running'])
      )
    )
    .limit(1);

  if (activeExtractionJobs.length > 0) {
    return NextResponse.json({
      error: 'Cannot delete project with active jobs running.'
    }, { status: 409 })
  }

  // Execute deletion (FK cascade handles child tables)
  await db
    .delete(projects)
    .where(eq(projects.id, numericId));

  return NextResponse.json({ ok: true })
}
