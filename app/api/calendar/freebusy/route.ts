// POST /api/calendar/freebusy — proxy to Google Calendar freebusy.query
// Returns per-event per-email free/busy status for a given set of events and stakeholder emails
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { google, calendar_v3 } from 'googleapis';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireSession } from '@/lib/auth-server';

// ─── Overlap helper ───────────────────────────────────────────────────────────

function isBusyDuringEvent(
  busyIntervals: Array<{ start: string; end: string }>,
  eventStartISO: string,
  eventEndISO: string,
): boolean {
  const eventStart = new Date(eventStartISO).getTime();
  const eventEnd = new Date(eventEndISO).getTime();
  return busyIntervals.some(({ start, end }) => {
    const busyStart = new Date(start).getTime();
    const busyEnd = new Date(end).getTime();
    // Overlap: not (busyEnd <= eventStart || busyStart >= eventEnd)
    return busyEnd > eventStart && busyStart < eventEnd;
  });
}

// ─── Request schema ───────────────────────────────────────────────────────────

const freebusyBodySchema = z.object({
  events: z
    .array(
      z.object({
        event_id: z.string(),
        start_datetime: z.string(),
        end_datetime: z.string(),
      }),
    )
    .min(1),
  stakeholder_emails: z.array(z.string()),
});

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = freebusyBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { events, stakeholder_emails } = parsed.data;

  if (stakeholder_emails.length === 0) {
    // Nothing to check — return empty map per event
    const result: Record<string, Record<string, 'free' | 'busy'>> = {};
    for (const ev of events) result[ev.event_id] = {};
    return NextResponse.json(result);
  }

  // ── Build calendar client ─────────────────────────────────────────────────
  // DB and googleapis imports done inside handler for Docker compatibility
  const db = (await import('@/db')).default;
  const { userSourceTokens } = await import('@/db/schema');

  const [tokenRow] = await db
    .select()
    .from(userSourceTokens)
    .where(
      and(
        eq(userSourceTokens.user_id, 'default'),
        eq(userSourceTokens.source, 'calendar'),
      ),
    )
    .limit(1);

  if (!tokenRow) {
    return NextResponse.json({ error: 'not_connected' }, { status: 200 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  );
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expires_at?.getTime(),
  });

  // Persist refreshed tokens back to DB
  oauth2Client.on('tokens', async (newTokens) => {
    await db
      .update(userSourceTokens)
      .set({
        access_token: newTokens.access_token ?? tokenRow.access_token,
        expires_at: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
        updated_at: new Date(),
        ...(newTokens.refresh_token ? { refresh_token: newTokens.refresh_token } : {}),
      })
      .where(
        and(
          eq(userSourceTokens.user_id, 'default'),
          eq(userSourceTokens.source, 'calendar'),
        ),
      );
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // ── Build freebusy request ────────────────────────────────────────────────
  // Cover the full time window from earliest event start to latest event end
  const startTimes = events.map((e) => new Date(e.start_datetime).getTime());
  const endTimes = events.map((e) => new Date(e.end_datetime).getTime());
  const timeMin = new Date(Math.min(...startTimes)).toISOString();
  const timeMax = new Date(Math.max(...endTimes)).toISOString();

  try {
    const freebusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: 'UTC',
        items: stakeholder_emails.map((email) => ({ id: email })),
      },
    });

    const calendarsData = freebusyResponse.data.calendars ?? {};

    // ── Map response: per event, per email → 'free' | 'busy' ───────────────
    const result: Record<string, Record<string, 'free' | 'busy'>> = {};

    for (const ev of events) {
      const eventResult: Record<string, 'free' | 'busy'> = {};
      for (const email of stakeholder_emails) {
        const busyIntervals = (calendarsData[email]?.busy ?? []) as Array<{
          start: string;
          end: string;
        }>;
        eventResult[email] = isBusyDuringEvent(
          busyIntervals,
          ev.start_datetime,
          ev.end_datetime,
        )
          ? 'busy'
          : 'free';
      }
      result[ev.event_id] = eventResult;
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    // Handle Google API errors
    const status = (err as { status?: number; code?: number })?.status
      ?? (err as { status?: number; code?: number })?.code;

    if (status === 403) {
      return NextResponse.json({ error: 'scope_insufficient' }, { status: 200 });
    }
    if (status === 401) {
      return NextResponse.json({ error: 'not_connected' }, { status: 200 });
    }

    console.error('[freebusy POST] Google API error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'freebusy_failed' }, { status: 500 });
  }
}
