import { NextResponse } from 'next/server';
import db from '../../../db';
import { drafts, projects } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
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
    .where(eq(drafts.status, 'pending'))
    .orderBy(desc(drafts.created_at));

  return NextResponse.json(pending);
}
