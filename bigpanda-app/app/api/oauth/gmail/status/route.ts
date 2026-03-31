// GET  /api/oauth/gmail/status — returns gmail connection status
// DELETE /api/oauth/gmail/status — disconnects gmail (removes token row)
import { db } from '@/db';
import { userSourceTokens } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSession } from "@/lib/auth-server";

export async function GET(): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const [row] = await db
    .select({ email: userSourceTokens.email })
    .from(userSourceTokens)
    .where(
      and(
        eq(userSourceTokens.user_id, 'default'),
        eq(userSourceTokens.source, 'gmail')
      )
    )
    .limit(1);

  return Response.json({ connected: !!row, email: row?.email ?? null });
}

export async function DELETE(): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  await db
    .delete(userSourceTokens)
    .where(
      and(
        eq(userSourceTokens.user_id, 'default'),
        eq(userSourceTokens.source, 'gmail')
      )
    );
  return Response.json({ ok: true });
}
