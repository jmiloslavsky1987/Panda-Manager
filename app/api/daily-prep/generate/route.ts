// app/api/daily-prep/generate/route.ts
// POST — direct Claude SSE stream for Daily Prep brief generation.
// IMPORTANT: POST endpoint — client must use fetch+ReadableStream, NOT EventSource.
// EventSource only supports GET and would silently ignore the request body.
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import path from 'path';
import { requireSession } from '@/lib/auth-server';
import { buildMeetingPrepContext } from '@/lib/meeting-prep-context';
import { resolveSkillsDir } from '@/lib/skill-path';
import { readSettings } from '@/lib/settings';

// Strip YAML front-matter (--- ... ---) from skill file
function stripFrontMatter(content: string): string {
  const match = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

export async function POST(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (!session) return new Response('Unauthorized', { status: 401 });

  const {
    eventId,
    eventTitle,
    projectId,
    attendees,
    durationHours,
    recurrenceFlag,
    eventDescription,
  } = await request.json();

  const userId = session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  // Build context — if no project assigned, generate a brief without project data
  const calendarMeta = { eventTitle, attendees, durationHours, recurrenceFlag, eventDescription };
  const userContext = projectId
    ? await buildMeetingPrepContext(projectId, undefined, calendarMeta)
    : `## Meeting\n${eventTitle}\n\n## Calendar Metadata\nDuration: ${durationHours}h\nAttendees: ${(attendees ?? []).join(', ')}`;

  // Read skill file for system prompt via settings-driven skill path
  const settings = await readSettings();
  const skillsDir = resolveSkillsDir(settings.skill_path ?? '');
  const skillPath = path.join(skillsDir, 'meeting-prep.md');
  const rawSkill = await readFile(skillPath, 'utf-8');
  const systemPrompt = stripFrontMatter(rawSkill);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        try {
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const msgStream = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: userContext }],
          });

          let finalText = '';
          msgStream.on('text', (text: string) => {
            finalText += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          });

          await msgStream.finalMessage();

          // Persist brief to DB — failure must NOT break streaming
          if (finalText) {
            try {
              const db = (await import('@/db')).default;
              const { dailyPrepBriefs } = await import('@/db/schema');
              await db.insert(dailyPrepBriefs)
                .values({
                  user_id: userId,
                  event_id: eventId,
                  date: today,
                  brief_content: finalText,
                })
                .onConflictDoUpdate({
                  target: [dailyPrepBriefs.user_id, dailyPrepBriefs.event_id, dailyPrepBriefs.date],
                  set: { brief_content: finalText, generated_at: new Date() },
                });
            } catch (persistErr) {
              console.error('[daily-prep/generate] DB persist error:', persistErr instanceof Error ? persistErr.message : String(persistErr));
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

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
