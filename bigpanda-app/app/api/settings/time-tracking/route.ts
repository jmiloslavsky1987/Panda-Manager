/**
 * app/api/settings/time-tracking/route.ts
 *
 * GET  /api/settings/time-tracking  — Returns full time tracking config (single-row table)
 * PATCH /api/settings/time-tracking — Updates config fields, returns updated config
 *
 * Single-row config table: id=1 is always seeded by migration 0018.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import db from '@/db';
import { timeTrackingConfig } from '@/db/schema';
import { requireSession } from "@/lib/auth-server";

const patchSchema = z.object({
  enabled:               z.boolean().optional(),
  weekly_capacity_hours: z.string().optional(),
  working_days:          z.array(z.string()).optional(),
  submission_due_day:    z.string().optional(),
  submission_due_time:   z.string().optional(),
  reminder_days_before:  z.number().int().min(0).optional(),
  categories:            z.array(z.string()).optional(),
  restrict_to_assigned:  z.boolean().optional(),
  active_projects_only:  z.boolean().optional(),
  lock_after_approval:   z.boolean().optional(),
  exempt_users:          z.array(z.string()).optional(),
});

export async function GET(): Promise<NextResponse> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  try {
    const rows = await db.select().from(timeTrackingConfig).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('[GET /api/settings/time-tracking]', err);
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = {
      ...parsed.data,
      updated_at: new Date(),
    };

    const updated = await db
      .update(timeTrackingConfig)
      .set(updateData)
      .where(eq(timeTrackingConfig.id, 1))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Config row not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (err) {
    console.error('[PATCH /api/settings/time-tracking]', err);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
