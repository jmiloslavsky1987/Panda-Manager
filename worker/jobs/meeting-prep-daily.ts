// worker/jobs/meeting-prep-daily.ts
// BullMQ job handler — auto-generates daily prep briefs for all today's calendar events.
// Runs on schedule; persists results to daily_prep_briefs table (user_id: 'default').
// NON-streaming: uses client.messages.create (not messages.stream).
import type { Job } from 'bullmq';
import { sql, eq, and } from 'drizzle-orm';
import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import path from 'path';
import db from '../../db';
import { jobRuns, userSourceTokens, projects, stakeholders, dailyPrepBriefs } from '../../db/schema';
import { LOCK_IDS } from '../lock-ids';
import { buildMeetingPrepContext } from '../../lib/meeting-prep-context';
import { resolveSkillsDir } from '../../lib/skill-path';
import { readSettings } from '../../lib/settings-core';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalendarEventSummary {
  event_id: string;
  summary: string;
  matched_project_id: number | null;
  attendee_names: string[];
  duration_hours: string;
  recurrence_flag: boolean;
  event_description: string | null;
  start_datetime: string;
  end_datetime: string;
}

// ─── Calendar client (mirrors calendar-import/route.ts pattern) ──────────────

async function getCalendarClient() {
  const [tokenRow] = await db
    .select()
    .from(userSourceTokens)
    .where(and(
      eq(userSourceTokens.user_id, 'default'),
      eq(userSourceTokens.source, 'calendar'),
    ))
    .limit(1);

  if (!tokenRow) throw new Error('Calendar not connected');

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
    try {
      await db
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
    } catch (err) {
      console.error('[meeting-prep-daily] token refresh persist error:', err);
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// ─── Fetch today's calendar events ───────────────────────────────────────────

async function fetchTodayEvents(today: string): Promise<CalendarEventSummary[]> {
  const calendar = await getCalendarClient();

  const dayStart = new Date(today + 'T00:00:00Z');
  const dayEnd = new Date(today + 'T23:59:59Z');

  const eventsResponse = await calendar.events.list({
    calendarId: 'primary',
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const rawEvents = eventsResponse.data.items ?? [];

  // Keep only timed events with meaningful duration (>= 5 min)
  const significantEvents = rawEvents.filter((e) => {
    if (!e.start?.dateTime) return false;
    const durationMs =
      new Date(e.end!.dateTime!).getTime() - new Date(e.start!.dateTime!).getTime();
    return durationMs >= 5 * 60 * 1000;
  });

  // Build project matching map
  const allProjects = await db.select({ id: projects.id, name: projects.customer }).from(projects);
  const allStakeholders = await db.select({ project_id: stakeholders.project_id, email: stakeholders.email }).from(stakeholders);

  const projectEmailMap = new Map<number, Set<string>>();
  for (const s of allStakeholders) {
    if (!s.email) continue;
    if (!projectEmailMap.has(s.project_id)) {
      projectEmailMap.set(s.project_id, new Set());
    }
    projectEmailMap.get(s.project_id)!.add(s.email.toLowerCase());
  }

  const projectNameMap = new Map<number, string>(allProjects.map((p) => [p.id, p.name]));

  return significantEvents.map((e) => {
    const startDT = e.start!.dateTime!;
    const endDT = e.end!.dateTime!;
    const durationHours = (
      (new Date(endDT).getTime() - new Date(startDT).getTime()) / 3_600_000
    ).toFixed(2);

    // Title + attendee hybrid matching
    let bestScore = 0;
    let bestProjectId: number | null = null;
    const summaryLower = (e.summary ?? '').toLowerCase();
    const attendeeEmails = new Set(
      (e.attendees ?? []).map((a) => (a.email ?? '').toLowerCase()).filter(Boolean),
    );

    for (const [pid, emails] of projectEmailMap) {
      const projectName = (projectNameMap.get(pid) ?? '').toLowerCase();
      let score = 0;
      if (projectName.length > 3 &&
          (summaryLower.includes(projectName) || projectName.includes(summaryLower))) {
        score += 2;
      }
      for (const email of attendeeEmails) {
        if (emails.has(email)) score++;
      }
      if (score > bestScore) { bestScore = score; bestProjectId = pid; }
    }

    const matchConfidence: 'high' | 'low' | 'none' =
      bestScore >= 2 ? 'high' : bestScore === 1 ? 'low' : 'none';
    if (matchConfidence === 'none') bestProjectId = null;

    return {
      event_id: e.id ?? `${today}-${startDT.substring(11, 16)}`,
      summary: e.summary ?? '(no title)',
      matched_project_id: bestProjectId,
      attendee_names: (e.attendees ?? [])
        .map((a) => a.displayName ?? a.email ?? '')
        .filter(Boolean),
      duration_hours: durationHours,
      recurrence_flag: !!e.recurringEventId,
      event_description: e.description ?? null,
      start_datetime: startDT,
      end_datetime: endDT,
    };
  });
}

// ─── Strip YAML front-matter ─────────────────────────────────────────────────

function stripFrontMatter(content: string): string {
  const match = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

// ─── Job handler ─────────────────────────────────────────────────────────────

export default async function meetingPrepDailyJob(job: Job): Promise<{ status: string }> {
  // 1. Advisory lock — prevents duplicate runs
  const [row] = await db.execute(
    sql`SELECT pg_try_advisory_xact_lock(${LOCK_IDS.MEETING_PREP_DAILY}) AS acquired`
  );
  const acquired = (row as Record<string, unknown>).acquired === true;

  if (!acquired) {
    console.log(`[meeting-prep-daily] skipped: advisory lock ${LOCK_IDS.MEETING_PREP_DAILY} held`);
    await db.insert(jobRuns).values({
      job_name: 'meeting-prep-daily',
      status: 'skipped',
      triggered_by: (job.data?.triggeredBy as string) ?? 'scheduled',
      completed_at: new Date(),
    });
    return { status: 'skipped' };
  }

  // 2. Record job start
  const [runRecord] = await db.insert(jobRuns).values({
    job_name: 'meeting-prep-daily',
    status: 'running',
    triggered_by: (job.data?.triggeredBy as string) ?? 'scheduled',
  }).returning({ id: jobRuns.id });

  try {
    const today = new Date().toISOString().slice(0, 10);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // 3. Load meeting-prep skill prompt
    const settings = await readSettings();
    const skillsDir = resolveSkillsDir(settings.skill_path ?? '');
    const skillPath = path.join(skillsDir, 'meeting-prep.md');
    const rawSkill = await readFile(skillPath, 'utf-8');
    const systemPrompt = stripFrontMatter(rawSkill);

    // 4. Fetch today's events
    const events = await fetchTodayEvents(today);
    console.log(`[meeting-prep-daily] found ${events.length} event(s) for ${today}`);

    // 5. Generate brief for each event
    for (const event of events) {
      console.log(`[meeting-prep-daily] generating brief for event ${event.event_id}: ${event.summary}`);
      try {
        const calendarMeta = {
          eventTitle: event.summary,
          attendees: event.attendee_names,
          durationHours: event.duration_hours,
          recurrenceFlag: event.recurrence_flag,
          eventDescription: event.event_description,
        };

        const userContext = event.matched_project_id
          ? await buildMeetingPrepContext(event.matched_project_id, undefined, calendarMeta)
          : `## Meeting\n${event.summary}\n\n## Calendar Metadata\nDuration: ${event.duration_hours}h\nAttendees: ${event.attendee_names.join(', ')}`;

        // NON-streaming call
        const message = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContext }],
        });

        const briefContent = message.content
          .filter((b) => b.type === 'text')
          .map((b) => (b as Anthropic.TextBlock).text)
          .join('');

        // 6. Upsert brief to daily_prep_briefs
        await db.insert(dailyPrepBriefs)
          .values({
            user_id: 'default',
            event_id: event.event_id,
            date: today,
            brief_content: briefContent,
          })
          .onConflictDoUpdate({
            target: [dailyPrepBriefs.user_id, dailyPrepBriefs.event_id, dailyPrepBriefs.date],
            set: { brief_content: briefContent, generated_at: new Date() },
          });

        console.log(`[meeting-prep-daily] brief upserted for event ${event.event_id}`);
      } catch (eventErr) {
        // Non-fatal: log and continue to next event
        const message = eventErr instanceof Error ? eventErr.message : String(eventErr);
        console.error(`[meeting-prep-daily] error generating brief for event ${event.event_id}:`, message);
      }
    }

    // 7. Mark completed
    await db.update(jobRuns)
      .set({ status: 'completed', completed_at: new Date() })
      .where(sql`id = ${runRecord.id}`);

    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[meeting-prep-daily] error:', message);
    await db.update(jobRuns)
      .set({ status: 'failed', completed_at: new Date(), error_message: message })
      .where(sql`id = ${runRecord.id}`);
    throw err; // re-throw so BullMQ marks the job as failed
  }
}
