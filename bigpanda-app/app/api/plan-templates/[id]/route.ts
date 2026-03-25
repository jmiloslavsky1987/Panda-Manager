import { NextResponse } from 'next/server';
import db from '../../../../db';
import { planTemplates } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const templateId = parseInt(id, 10);

  await db.delete(planTemplates).where(eq(planTemplates.id, templateId));
  return NextResponse.json({ ok: true });
}
