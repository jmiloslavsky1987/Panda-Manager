import { NextResponse } from 'next/server';
import db from '../../../../db';
import { outputs } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { requireSession } from "@/lib/auth-server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { id } = await params;
  const body = await request.json();
  await db.update(outputs).set(body).where(eq(outputs.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}
