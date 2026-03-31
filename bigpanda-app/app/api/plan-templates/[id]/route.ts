import { NextResponse } from 'next/server';
import db from '../../../../db';
import { planTemplates, auditLog } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { requireSession } from "@/lib/auth-server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const [before] = await db.select().from(planTemplates).where(eq(planTemplates.id, templateId));
  if (!before) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx.delete(planTemplates).where(eq(planTemplates.id, templateId));
    await tx.insert(auditLog).values({
      entity_type: 'plan_template',
      entity_id: templateId,
      action: 'delete',
      actor_id: 'default',
      before_json: before as Record<string, unknown>,
      after_json: null,
    });
  });

  return NextResponse.json({ ok: true });
}
