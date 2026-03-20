// bigpanda-app/app/api/skills/runs/[runId]/stream/route.ts
// GET SSE — polls skill_run_chunks table and streams chunks to client in real-time.
// CRITICAL: export const dynamic = 'force-dynamic' required for Next.js App Router SSE.
// CRITICAL: Response returned immediately — async work runs inside ReadableStream.start() IIFE.
export const dynamic = 'force-dynamic';

import db from '../../../../../../db';
import { skillRuns, skillRunChunks } from '../../../../../../db/schema';
import { eq, gt, and, asc } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const encoder = new TextEncoder();

  // Look up DB serial id from UUID run_id — chunks use the integer FK
  const [run] = await db.select({ id: skillRuns.id }).from(skillRuns).where(eq(skillRuns.run_id, runId));
  if (!run) {
    return new Response('Not found', { status: 404 });
  }
  const dbRunId = run.id;
  let lastSeq = -1;

  const stream = new ReadableStream({
    start(controller) {
      // CRITICAL: no await here — Response must return immediately so SSE headers flush
      (async () => {
        try {
          while (true) {
            const chunks = await db
              .select()
              .from(skillRunChunks)
              .where(
                and(
                  eq(skillRunChunks.run_id, dbRunId),
                  gt(skillRunChunks.seq, lastSeq)
                )
              )
              .orderBy(asc(skillRunChunks.seq));

            for (const chunk of chunks) {
              lastSeq = chunk.seq;
              if (chunk.chunk === '__DONE__') {
                controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
                controller.close();
                return;
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunk.chunk })}\n\n`)
              );
            }

            // 500ms poll interval — balances real-time feel vs DB load
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (err) {
          controller.error(err);
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
