import { NextResponse } from 'next/server';
import db from '../../../db';
import { planTemplates, auditLog } from '../../../db/schema';

export async function GET() {
  const templates = await db.select().from(planTemplates);
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      name: string;
      template_type?: string;
      data?: string;
    };

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const template = await db.transaction(async (tx) => {
      const [row] = await tx.insert(planTemplates).values({
        name: body.name,
        template_type: body.template_type ?? null,
        data: body.data ?? null,
      }).returning();
      await tx.insert(auditLog).values({
        entity_type: 'plan_template',
        entity_id: row.id,
        action: 'create',
        actor_id: 'default',
        before_json: null,
        after_json: row as Record<string, unknown>,
      });
      return row;
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Insert failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
