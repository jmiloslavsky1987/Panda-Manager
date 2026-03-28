// GET /api/oauth/calendar/status — return calendar connection state
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import db from '@/db';
import { userSourceTokens } from '@/db/schema';

export async function GET(): Promise<Response> {
  try {
    const [tokenRow] = await db
      .select()
      .from(userSourceTokens)
      .where(and(
        eq(userSourceTokens.user_id, 'default'),
        eq(userSourceTokens.source, 'calendar'),
      ))
      .limit(1);

    if (!tokenRow) {
      return NextResponse.json({ connected: false, expires_at: null });
    }

    return NextResponse.json({
      connected: true,
      expires_at: tokenRow.expires_at?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('[calendar-status] DB error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ connected: false, expires_at: null }, { status: 500 });
  }
}
