import { NextResponse } from 'next/server';
import db from '../../../db';
import { outputs, projects } from '../../../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { requireSession } from "@/lib/auth-server";

export async function GET(request: Request) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const skillType = searchParams.get('skillType');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const showArchived = searchParams.get('archived') === 'true';

  const conditions = [];
  if (!showArchived) conditions.push(eq(outputs.archived, false));
  if (projectId) conditions.push(eq(outputs.project_id, parseInt(projectId)));
  if (skillType) conditions.push(eq(outputs.skill_name, skillType));
  if (dateFrom) conditions.push(gte(outputs.created_at, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(outputs.created_at, new Date(dateTo)));

  const rows = await db
    .select({
      id: outputs.id,
      project_id: outputs.project_id,
      skill_name: outputs.skill_name,
      idempotency_key: outputs.idempotency_key,
      status: outputs.status,
      content: outputs.content,
      filename: outputs.filename,
      filepath: outputs.filepath,
      archived: outputs.archived,
      created_at: outputs.created_at,
      completed_at: outputs.completed_at,
      project_name: projects.name,
    })
    .from(outputs)
    .leftJoin(projects, eq(outputs.project_id, projects.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(outputs.created_at));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  // Register a new output (called by skill handlers on completion)
  const body = await request.json();
  const [row] = await db.insert(outputs).values(body).returning();
  return NextResponse.json(row, { status: 201 });
}
