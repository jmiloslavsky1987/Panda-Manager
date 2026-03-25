import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../db';
import { knowledgeBase } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/knowledge-base/[id]
// Body: partial update — any combination of title, content, source_trace, linked_risk_id,
//       linked_history_id, linked_date
// This is the "link" operation for KB-02: e.g. PATCH { linked_risk_id: X }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch = body as Record<string, unknown>;

  // Build a type-safe update object — only include defined keys from the body
  const updateData: Partial<{
    title: string;
    content: string;
    source_trace: string | null;
    linked_risk_id: number | null;
    linked_history_id: number | null;
    linked_date: string | null;
  }> = {};

  if ('title' in patch && patch.title !== undefined) {
    updateData.title = String(patch.title);
  }
  if ('content' in patch && patch.content !== undefined) {
    updateData.content = String(patch.content);
  }
  if ('source_trace' in patch) {
    updateData.source_trace =
      patch.source_trace != null ? String(patch.source_trace) : null;
  }
  if ('linked_risk_id' in patch) {
    updateData.linked_risk_id =
      patch.linked_risk_id != null ? parseInt(String(patch.linked_risk_id), 10) : null;
  }
  if ('linked_history_id' in patch) {
    updateData.linked_history_id =
      patch.linked_history_id != null
        ? parseInt(String(patch.linked_history_id), 10)
        : null;
  }
  if ('linked_date' in patch) {
    updateData.linked_date =
      patch.linked_date != null ? String(patch.linked_date) : null;
  }

  const result = await db
    .update(knowledgeBase)
    .set(updateData)
    .where(eq(knowledgeBase.id, numericId))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: 'Knowledge base entry not found' }, { status: 404 });
  }

  return NextResponse.json({ entry: result[0] });
}

// DELETE /api/knowledge-base/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  await db.delete(knowledgeBase).where(eq(knowledgeBase.id, numericId));

  return new NextResponse(null, { status: 204 });
}
