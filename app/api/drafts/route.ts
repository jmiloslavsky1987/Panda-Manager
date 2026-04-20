import { NextResponse } from 'next/server';
import db from '../../../db';
import { drafts, projects, projectMembers } from '../../../db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { requireSession } from "@/lib/auth-server";
import { resolveRole } from '@/lib/auth-utils';

export async function GET() {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const role = resolveRole(session!);
  const membershipCondition = role === 'admin'
    ? undefined
    : inArray(
        drafts.project_id,
        db.select({ id: projectMembers.project_id })
          .from(projectMembers)
          .where(eq(projectMembers.user_id, session!.user.id))
      );

  const pending = await db
    .select({
      id: drafts.id,
      draft_type: drafts.draft_type,
      recipient: drafts.recipient,
      subject: drafts.subject,
      content: drafts.content,
      status: drafts.status,
      created_at: drafts.created_at,
      updated_at: drafts.updated_at,
      project_id: drafts.project_id,
      run_id: drafts.run_id,
      project_name: projects.name,
    })
    .from(drafts)
    .leftJoin(projects, eq(drafts.project_id, projects.id))
    .where(and(eq(drafts.status, 'pending'), membershipCondition))
    .orderBy(desc(drafts.created_at));

  return NextResponse.json(pending);
}

export async function POST(request: Request) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const body = await request.json() as {
    draft_type: string;
    content: string;
    subject?: string;
    recipient?: string;
    project_id?: number;
  };

  if (!body.draft_type || !body.content) {
    return NextResponse.json({ error: 'draft_type and content are required' }, { status: 400 });
  }

  const [draft] = await db.insert(drafts).values({
    draft_type: body.draft_type,
    content: body.content,
    subject: body.subject ?? null,
    recipient: body.recipient ?? null,
    project_id: body.project_id ?? null,
    status: 'pending',
  }).returning();

  return NextResponse.json(draft, { status: 201 });
}
