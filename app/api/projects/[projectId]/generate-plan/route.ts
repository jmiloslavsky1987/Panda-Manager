import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import path from 'path';
import db from '@/db';
import { skillRuns } from '@/db/schema';
import { SkillOrchestrator } from '@/lib/skill-orchestrator';

const SKILLS_DIR = path.join(process.cwd(), 'skills');

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }

  try {
    // Create a transient skill_run row to drive the orchestrator
    const [run] = await db.insert(skillRuns).values({
      project_id: projectId,
      skill_name: 'ai-plan-generator',
      run_id: crypto.randomUUID(),
      status: 'running',
      started_at: new Date(),
    }).returning();

    const orchestrator = new SkillOrchestrator();
    await orchestrator.run({
      skillName: 'ai-plan-generator',
      projectId,
      runId: run.id,
      skillsDir: SKILLS_DIR,
    });

    // Read output written by orchestrator
    const [completedRun] = await db.select().from(skillRuns).where(sql`id = ${run.id}`);
    const outputText = completedRun?.full_output ?? '';

    // Strip markdown fences and parse
    const raw = outputText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    let parsed: { tasks: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Claude output was not valid JSON', raw }, { status: 502 });
    }

    // Mark run as completed — NOT writing proposed tasks to the tasks table here
    await db.update(skillRuns)
      .set({ status: 'completed', completed_at: new Date() })
      .where(sql`id = ${run.id}`);

    // Return proposed tasks — NOT written to DB tasks table by this route
    return NextResponse.json({ tasks: parsed.tasks ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
