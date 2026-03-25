import { NextResponse } from 'next/server';
import db from '../../../db';
import { planTemplates } from '../../../db/schema';

export async function GET() {
  const templates = await db.select().from(planTemplates);
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const body = await request.json() as {
    name: string;
    template_type?: string;
    data?: string;
  };

  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const [template] = await db.insert(planTemplates).values({
    name: body.name,
    template_type: body.template_type ?? null,
    data: body.data ?? null,
  }).returning();

  return NextResponse.json(template, { status: 201 });
}
