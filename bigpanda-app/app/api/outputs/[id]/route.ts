import { NextResponse } from 'next/server';
import db from '../../../../db';
import { outputs } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  await db.update(outputs).set(body).where(eq(outputs.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}
