// app/api/daily-prep/briefing/route.ts
// Phase 85.2 — Today's Briefing synthesis (POST) + fetch (GET).
// SSE wire format matches /api/daily-prep/generate exactly.
// IMPORTANT: POST endpoint — client must use fetch+ReadableStream, NOT EventSource.
// EventSource only supports GET and would silently ignore POST body.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { and, eq } from 'drizzle-orm';
import { requireSession } from '@/lib/auth-server';
import {
  fetchTodayActionCandidates,
  fetchWeekCriticalCandidates,
  fetchTodayMeetingsAndBriefs,
} from '@/lib/daily-briefing';

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an executive assistant generating a 3-minute morning briefing for a Project Services delivery manager.

Output strictly the following markdown structure with no preamble:

## Today's Meetings
[Chronological list. Per meeting: 1-paragraph synthesis (~3 sentences) of the full per-meeting brief if provided, else "Time + attendees + matched project". Max 5; if more than 5 meetings, prioritize meetings with briefs.]

## Today's Action Items
[Top 5 only. One line per item: action description — one-sentence "why this matters today". Pull from the provided candidate list. If fewer than 5 candidates, list fewer; do not pad.]

## This Week's Critical Items
[Top 5 mixed across risks, near-due milestones, recent decisions (FYI only), and overdue in-progress WBS work. One line per item: category label + title — one-sentence "why this matters". Hard cap 5.]

Tone: tight prose, executive-ready, no fluff. No tables, no emojis, no nested bullets.`;

// ─── POST — synthesize + stream + persist ─────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const { date } = body as { date?: string };
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response('Bad Request: date YYYY-MM-DD required', { status: 400 });
  }

  const userId = session.user.id;
  const today = new Date(date + 'T00:00:00');

  // Stage 1 — gather data in parallel
  const [meetings, actionsList, critical] = await Promise.all([
    fetchTodayMeetingsAndBriefs(userId, date),
    fetchTodayActionCandidates(userId, today),
    fetchWeekCriticalCandidates(userId, today),
  ]);

  const totalInputs =
    meetings.meetingsWithBriefs.length +
    meetings.meetingsWithoutBriefs.length +
    actionsList.length +
    critical.risks.length +
    critical.milestones.length +
    critical.decisions.length +
    critical.wbsItems.length;

  const encoder = new TextEncoder();

  // Empty-data short-circuit — skip Claude call entirely
  if (totalInputs === 0) {
    const emptyText = [
      "## Today's Meetings",
      'Nothing scheduled.',
      '',
      "## Today's Action Items",
      'No open actions due today.',
      '',
      "## This Week's Critical Items",
      'Nothing urgent this week.',
    ].join('\n');

    try {
      await persistBriefing(userId, date, emptyText, [], [], []);
    } catch (e) {
      console.error('[briefing] empty persist error:', e instanceof Error ? e.message : String(e));
    }

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: emptyText })}\n\n`));
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();
      },
    });
    return sseResponse(stream);
  }

  // Stage 2 — build Claude user payload (structured JSON for deterministic prompting)
  const userPayload = JSON.stringify(
    {
      date,
      meetings: {
        with_briefs: meetings.meetingsWithBriefs,
        without_briefs: meetings.meetingsWithoutBriefs,
      },
      actions_today: actionsList,
      week_critical: critical,
    },
    null,
    2,
  );

  // Stage 3 — stream from Anthropic
  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        try {
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const msgStream = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: userPayload }],
          });

          let finalText = '';
          msgStream.on('text', (text: string) => {
            finalText += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          });

          await msgStream.finalMessage();

          // Stage 4 — persist (non-fatal on failure; stream always gets event: done)
          if (finalText) {
            try {
              await persistBriefing(
                userId,
                date,
                finalText,
                [
                  ...meetings.meetingsWithBriefs.map((m) => m.event_id),
                  ...meetings.meetingsWithoutBriefs.map((m) => m.event_id),
                ],
                actionsList.map((a) => a.id),
                buildCriticalRefs(critical),
              );
            } catch (persistErr) {
              console.error(
                '[briefing] DB persist error:',
                persistErr instanceof Error ? persistErr.message : String(persistErr),
              );
            }
          }

          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
          controller.close();
        }
      })();
    },
  });

  return sseResponse(stream);
}

// ─── GET — fetch today's briefing row ─────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse as NextResponse;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = new URL(request.url).searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date YYYY-MM-DD required' }, { status: 400 });
  }

  // Lazy import for Docker build compatibility (STATE.md [80-03])
  const db = (await import('@/db')).default;
  const { dailyBriefings } = await import('@/db/schema');

  const [row] = await db
    .select()
    .from(dailyBriefings)
    .where(and(eq(dailyBriefings.user_id, session.user.id), eq(dailyBriefings.date, date)))
    .limit(1);

  return NextResponse.json(row ?? null);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function persistBriefing(
  userId: string,
  date: string,
  briefingContent: string,
  meetingEventIds: string[],
  actionIds: number[],
  criticalItemRefs: Array<{ kind: string; id: number }>,
): Promise<void> {
  // Lazy dynamic imports per Docker compatibility (STATE.md [80-03])
  const db = (await import('@/db')).default;
  const { dailyBriefings } = await import('@/db/schema');

  await db
    .insert(dailyBriefings)
    .values({
      user_id: userId,
      date,
      briefing_content: briefingContent,
      meeting_event_ids: meetingEventIds,
      action_ids: actionIds,
      critical_item_refs: criticalItemRefs,
    })
    .onConflictDoUpdate({
      target: [dailyBriefings.user_id, dailyBriefings.date],
      set: {
        briefing_content: briefingContent,
        meeting_event_ids: meetingEventIds,
        action_ids: actionIds,
        critical_item_refs: criticalItemRefs,
        generated_at: new Date(),
      },
    });
}

function buildCriticalRefs(
  critical: Awaited<ReturnType<typeof fetchWeekCriticalCandidates>>,
): Array<{ kind: string; id: number }> {
  return [
    ...critical.risks.map((r) => ({ kind: 'risk', id: r.id })),
    ...critical.milestones.map((m) => ({ kind: 'milestone', id: m.id })),
    ...critical.decisions.map((d) => ({ kind: 'decision', id: d.id })),
    ...critical.wbsItems.map((w) => ({ kind: 'wbs', id: w.id })),
  ];
}
