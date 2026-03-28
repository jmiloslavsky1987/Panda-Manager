// Calendar import route — list Google Calendar events (GET) + import as draft time entries (POST)
import { NextRequest, NextResponse } from 'next/server';
import { google, calendar_v3 } from 'googleapis';
import { and, eq } from 'drizzle-orm';
import db from '@/db';
import { userSourceTokens, timeEntries, projects, stakeholders } from '@/db/schema';
// ─── Token management ────────────────────────────────────────────────────────

// Research Pattern 2: setCredentials() + 'tokens' event — NOT refreshAccessToken() (deprecated)
async function getCalendarClient(database: typeof db): Promise<calendar_v3.Calendar> {
  const [tokenRow] = await database
    .select()
    .from(userSourceTokens)
    .where(and(
      eq(userSourceTokens.user_id, 'default'),
      eq(userSourceTokens.source, 'calendar'),
    ))
    .limit(1);

  if (!tokenRow) throw new Error('Calendar not connected');

  // CRITICAL: Use GOOGLE_CALENDAR_REDIRECT_URI exclusively — NO fallback to GOOGLE_REDIRECT_URI
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  );

  // setCredentials — automatic refresh is built in; no manual refresh call needed
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expires_at?.getTime(),
  });

  // Persist updated tokens back to DB when googleapis auto-refreshes
  oauth2Client.on('tokens', async (newTokens) => {
    await database
      .update(userSourceTokens)
      .set({
        access_token: newTokens.access_token ?? tokenRow.access_token,
        expires_at: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
        updated_at: new Date(),
        ...(newTokens.refresh_token ? { refresh_token: newTokens.refresh_token } : {}),
      })
      .where(and(
        eq(userSourceTokens.user_id, 'default'),
        eq(userSourceTokens.source, 'calendar'),
      ));
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// ─── GET — list calendar events for a week ───────────────────────────────────

export interface CalendarEventItem {
  event_id: string;
  summary: string;
  date: string;              // YYYY-MM-DD from event.start.dateTime (TTADV-14: event date not import date)
  start_time: string;        // HH:MM
  end_time: string;          // HH:MM
  duration_hours: string;    // decimal string
  matched_project_id: number | null;
  matched_project_name: string | null;
  match_confidence: 'high' | 'low' | 'none';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  await params; // consume params (route is under [projectId] but GET lists all-project events)

  const { searchParams } = new URL(request.url);
  const weekStartParam = searchParams.get('week_start');

  // Default to current Monday
  const weekStart = weekStartParam
    ? new Date(weekStartParam + 'T00:00:00Z')
    : (() => {
        const d = new Date();
        const day = d.getUTCDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setUTCDate(d.getUTCDate() + diff);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      })();

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  try {
    const calendar = await getCalendarClient(db);

    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: weekStart.toISOString(),
      timeMax: weekEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const rawEvents = eventsResponse.data.items ?? [];

    // Filter: skip all-day events (all-day events have only event.start.date, not event.start.dateTime)
    const timedEvents = rawEvents.filter(
      (e) => e.start?.dateTime !== undefined && e.start.dateTime !== null,
    );

    // Filter: skip events shorter than 5 minutes
    const significantEvents = timedEvents.filter((e) => {
      const durationMs =
        new Date(e.end!.dateTime!).getTime() - new Date(e.start!.dateTime!).getTime();
      return durationMs >= 5 * 60 * 1000;
    });

    // Build project→stakeholder email map for attendee matching
    const allProjects = await db.select({ id: projects.id, name: projects.customer }).from(projects);
    const allStakeholders = await db.select({ project_id: stakeholders.project_id, email: stakeholders.email }).from(stakeholders);

    // Map: projectId → Set<email>
    const projectEmailMap = new Map<number, Set<string>>();
    for (const s of allStakeholders) {
      if (!s.email) continue;
      if (!projectEmailMap.has(s.project_id)) {
        projectEmailMap.set(s.project_id, new Set());
      }
      projectEmailMap.get(s.project_id)!.add(s.email.toLowerCase());
    }

    const projectNameMap = new Map<number, string>(allProjects.map((p) => [p.id, p.name]));

    const items: CalendarEventItem[] = significantEvents.map((e) => {
      const startDT = e.start!.dateTime!;
      const endDT = e.end!.dateTime!;

      // TTADV-14: use event date (not import date)
      const date = startDT.split('T')[0];
      const start_time = startDT.substring(11, 16); // HH:MM
      const end_time = endDT.substring(11, 16);

      const durationHours =
        (new Date(endDT).getTime() - new Date(startDT).getTime()) / 3_600_000;
      const duration_hours = durationHours.toFixed(2);

      // Attendee-based project matching
      const attendeeEmails = new Set(
        (e.attendees ?? []).map((a) => (a.email ?? '').toLowerCase()).filter(Boolean),
      );

      let bestProjectId: number | null = null;
      let bestOverlap = 0;

      for (const [projectId, emails] of projectEmailMap) {
        let overlap = 0;
        for (const email of attendeeEmails) {
          if (emails.has(email)) overlap++;
        }
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestProjectId = projectId;
        }
      }

      const match_confidence: 'high' | 'low' | 'none' =
        bestOverlap >= 2 ? 'high' : bestOverlap === 1 ? 'low' : 'none';

      if (match_confidence === 'none') bestProjectId = null;

      return {
        event_id: e.id ?? `${date}-${start_time}`,
        summary: e.summary ?? '(no title)',
        date,
        start_time,
        end_time,
        duration_hours,
        matched_project_id: bestProjectId,
        matched_project_name: bestProjectId ? (projectNameMap.get(bestProjectId) ?? null) : null,
        match_confidence,
      };
    });

    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'Calendar not connected') {
      return NextResponse.json({ error: 'not_connected' }, { status: 401 });
    }
    console.error('[calendar-import GET] Error:', message);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}

// ─── POST — import selected events as draft time entries ─────────────────────

interface ImportItem {
  event_id: string;
  date: string;
  duration_hours: string;
  description: string;
  project_id: number | null;
  skip?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  await params; // consume params

  let items: ImportItem[];
  try {
    items = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'Body must be an array of import items' }, { status: 400 });
  }

  const toImport = items.filter((item) => !item.skip);

  // Validate: each non-skipped item must have a project_id
  for (const item of toImport) {
    if (!item.project_id) {
      return NextResponse.json(
        { error: `Item "${item.event_id}" is missing project_id — either set a project or mark skip=true` },
        { status: 400 },
      );
    }
  }

  try {
    if (toImport.length === 0) {
      return NextResponse.json({ created_count: 0, entries: [] });
    }

    const inserted = await db
      .insert(timeEntries)
      .values(
        toImport.map((item) => ({
          project_id: item.project_id!,
          date: item.date,                    // TTADV-14: event date used (set by client from GET response)
          hours: item.duration_hours,
          description: item.description,
          // submitted_on, approved_on etc all null — these are new draft entries
        })),
      )
      .returning();

    return NextResponse.json({ created_count: inserted.length, entries: inserted });
  } catch (err) {
    console.error('[calendar-import POST] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to create time entries' }, { status: 500 });
  }
}
