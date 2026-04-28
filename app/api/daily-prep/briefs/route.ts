// app/api/daily-prep/briefs/route.ts
// GET /api/daily-prep/briefs?date=YYYY-MM-DD
// Returns stored briefs for the authenticated user for the given date.
// Response shape: { [event_id]: { content: string, generatedAt: string } }
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import db from '@/db';
import { dailyPrepBriefs } from '@/db/schema';
import { requireSession } from '@/lib/auth-server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse as NextResponse;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({});
  }

  const rows = await db
    .select({
      event_id: dailyPrepBriefs.event_id,
      brief_content: dailyPrepBriefs.brief_content,
      generated_at: dailyPrepBriefs.generated_at,
    })
    .from(dailyPrepBriefs)
    .where(and(
      eq(dailyPrepBriefs.user_id, session.user.id),
      eq(dailyPrepBriefs.date, date),
    ));

  const result: Record<string, { content: string; generatedAt: string }> = {};
  for (const row of rows) {
    result[row.event_id] = {
      content: row.brief_content,
      generatedAt: row.generated_at.toISOString(),
    };
  }

  return NextResponse.json(result);
}
