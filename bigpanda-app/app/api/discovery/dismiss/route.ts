import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { discoveryItems } from '@/db/schema';

export const dynamic = 'force-dynamic';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const DismissRequestSchema = z.object({
  projectId: z.number(),
  itemIds: z.array(z.number()),
});

// ─── POST handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/discovery/dismiss
 * Body: { projectId: number, itemIds: number[] }
 *
 * Sets status='dismissed' on the given discovery items.
 * DISC-15: Does NOT delete records — items are preserved for dismiss-history.
 * DISC-13: Supports bulk IDs via single UPDATE with inArray.
 *
 * Returns: { dismissed: N }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = DismissRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }

  const { projectId, itemIds } = parsed.data;

  if (itemIds.length === 0) {
    return NextResponse.json({ dismissed: 0 });
  }

  await db
    .update(discoveryItems)
    .set({ status: 'dismissed' })
    .where(and(inArray(discoveryItems.id, itemIds), eq(discoveryItems.project_id, projectId)));

  return NextResponse.json({ dismissed: itemIds.length });
}
