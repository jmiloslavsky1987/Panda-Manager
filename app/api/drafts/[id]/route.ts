import { NextResponse } from 'next/server';
import db from '../../../../db';
import { drafts } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draftId = parseInt(id);
  const body = await request.json() as { action: 'edit' | 'dismiss'; content?: string };

  if (body.action === 'dismiss') {
    await db.update(drafts)
      .set({ status: 'dismissed', updated_at: new Date() })
      .where(eq(drafts.id, draftId));
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'edit' && body.content !== undefined) {
    await db.update(drafts)
      .set({ content: body.content, updated_at: new Date() })
      .where(eq(drafts.id, draftId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
