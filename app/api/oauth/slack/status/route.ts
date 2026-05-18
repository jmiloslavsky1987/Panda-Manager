// GET  /api/oauth/slack/status — returns Slack connection status + hint
// DELETE /api/oauth/slack/status — disconnects Slack (removes token row)
import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  // Lazy dynamic DB import for Docker build compatibility
  const { db } = await import('@/db');
  const { userSourceTokens } = await import('@/db/schema');

  // Phase 86: read the real user's token first; fall back to legacy 'default' row
  // so single-user Docker installs (no per-user connect yet) keep working.
  let [row] = await db
    .select({ access_token: userSourceTokens.access_token })
    .from(userSourceTokens)
    .where(
      and(
        eq(userSourceTokens.user_id, session!.user.id),
        eq(userSourceTokens.source, 'slack')
      )
    )
    .limit(1);

  if (!row) {
    [row] = await db
      .select({ access_token: userSourceTokens.access_token })
      .from(userSourceTokens)
      .where(
        and(
          eq(userSourceTokens.user_id, 'default'),
          eq(userSourceTokens.source, 'slack')
        )
      )
      .limit(1);
  }

  if (!row) {
    return Response.json({ connected: false, hint: null });
  }

  // Hint: last 6 chars of access_token for display (e.g., "...abc123")
  const hint = row.access_token ? row.access_token.slice(-6) : null;
  return Response.json({ connected: true, hint });
}

export async function DELETE(_request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  // Lazy dynamic DB import for Docker build compatibility
  const { db } = await import('@/db');
  const { userSourceTokens } = await import('@/db/schema');

  // Phase 86: only delete the real user's row. Never delete the 'default'
  // fallback row — other concurrent users may rely on it during multi-PM rollout.
  await db
    .delete(userSourceTokens)
    .where(
      and(
        eq(userSourceTokens.user_id, session!.user.id),
        eq(userSourceTokens.source, 'slack')
      )
    );

  return Response.json({ ok: true }, { status: 200 });
}
