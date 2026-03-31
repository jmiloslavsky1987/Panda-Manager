import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import path from 'path';
import db from '@/db';
import { projects, skillRuns } from '@/db/schema';
import { SkillOrchestrator } from '@/lib/skill-orchestrator';
import { requireSession } from "@/lib/auth-server";

const SKILLS_DIR = path.join(process.cwd(), 'skills');

// GET — return stored sprint summary (or null if not yet generated)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });

  const [project] = await db.select({
    sprint_summary: projects.sprint_summary,
    sprint_summary_at: projects.sprint_summary_at,
  }).from(projects).where(eq(projects.id, projectId));

  return NextResponse.json({
    summary: project?.sprint_summary ?? null,
    generated_at: project?.sprint_summary_at ?? null,
  });
}

// POST — generate new summary via Claude, overwrite stored value, return result
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });

  try {
    // Create transient skill_run row
    const [run] = await db.insert(skillRuns).values({
      project_id: projectId,
      skill_name: 'sprint-summary-generator',
      run_id: crypto.randomUUID(),
      status: 'running',
      started_at: new Date(),
    }).returning();

    const orchestrator = new SkillOrchestrator();
    await orchestrator.run({
      skillName: 'sprint-summary-generator',
      projectId,
      runId: run.id,
      skillsDir: SKILLS_DIR,
    });

    const [completedRun] = await db.select().from(skillRuns).where(sql`id = ${run.id}`);
    const summaryText = completedRun?.full_output ?? '';

    // Overwrite projects.sprint_summary — no outputs table insert (PLAN-13: not in Output Library)
    await db.update(projects)
      .set({ sprint_summary: summaryText, sprint_summary_at: new Date() })
      .where(eq(projects.id, projectId));

    // Mark skill_run completed
    await db.update(skillRuns)
      .set({ status: 'completed', completed_at: new Date() })
      .where(sql`id = ${run.id}`);

    return NextResponse.json({ summary: summaryText, generated_at: new Date() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
