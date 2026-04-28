// app/api/daily-prep/templates/route.ts
// GET/POST/DELETE — Recurring meeting prep template persistence.
// Lazy DB init (all DB calls inside handler functions — Docker build-time safe).
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth-server';

// ─── GET /api/daily-prep/templates?series_ids=id1,id2,... ─────────────────────
// Returns: { [recurring_event_id]: { brief_content: string, saved_at: string } }

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const seriesIdsParam = searchParams.get('series_ids');

  if (!seriesIdsParam) {
    return NextResponse.json({});
  }

  const seriesIds = seriesIdsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!seriesIds.length) {
    return NextResponse.json({});
  }

  const { db } = await import('@/db');
  const { meetingPrepTemplates } = await import('@/db/schema');
  const { and, eq, inArray } = await import('drizzle-orm');

  const rows = await db
    .select({
      recurring_event_id: meetingPrepTemplates.recurring_event_id,
      brief_content: meetingPrepTemplates.brief_content,
      saved_at: meetingPrepTemplates.saved_at,
    })
    .from(meetingPrepTemplates)
    .where(
      and(
        eq(meetingPrepTemplates.user_id, session.user.id),
        inArray(meetingPrepTemplates.recurring_event_id, seriesIds),
      ),
    );

  const result: Record<string, { brief_content: string; saved_at: string }> = {};
  for (const row of rows) {
    result[row.recurring_event_id] = {
      brief_content: row.brief_content,
      saved_at: row.saved_at.toISOString(),
    };
  }

  return NextResponse.json(result);
}

// ─── POST /api/daily-prep/templates ───────────────────────────────────────────
// Body: { recurring_event_id: string, brief_content: string }
// Upserts (onConflictDoUpdate) on (user_id, recurring_event_id).

const PostBodySchema = z.object({
  recurring_event_id: z.string().min(1),
  brief_content: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const { recurring_event_id, brief_content } = parsed.data;

  const { db } = await import('@/db');
  const { meetingPrepTemplates } = await import('@/db/schema');

  await db
    .insert(meetingPrepTemplates)
    .values({
      user_id: session.user.id,
      recurring_event_id,
      brief_content,
    })
    .onConflictDoUpdate({
      target: [meetingPrepTemplates.user_id, meetingPrepTemplates.recurring_event_id],
      set: {
        brief_content,
        saved_at: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}

// ─── DELETE /api/daily-prep/templates?recurring_event_id=xxx ──────────────────

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const recurringEventId = searchParams.get('recurring_event_id');

  if (!recurringEventId) {
    return NextResponse.json({ error: 'recurring_event_id query param required' }, { status: 400 });
  }

  const { db } = await import('@/db');
  const { meetingPrepTemplates } = await import('@/db/schema');
  const { and, eq } = await import('drizzle-orm');

  await db
    .delete(meetingPrepTemplates)
    .where(
      and(
        eq(meetingPrepTemplates.user_id, session.user.id),
        eq(meetingPrepTemplates.recurring_event_id, recurringEventId),
      ),
    );

  return NextResponse.json({ ok: true });
}
