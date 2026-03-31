/**
 * GET/PATCH /api/notifications/time-tracking
 *
 * GET:   Returns unread timesheet notifications for user_id='default', newest first (limit 20).
 *        Response: { notifications: AppNotification[], unread_count: number }
 *
 * PATCH: Marks a single notification as read.
 *        Body: { id: number }
 *        Response: { ok: true }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, like, desc, count } from 'drizzle-orm'
import db from '@/db'
import { appNotifications } from '@/db/schema'
import { requireSession } from "@/lib/auth-server";

const TIMESHEET_USER_ID = 'default'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  try {
    const notifications = await db
      .select()
      .from(appNotifications)
      .where(
        and(
          eq(appNotifications.user_id, TIMESHEET_USER_ID),
          like(appNotifications.type, 'timesheet_%')
        )
      )
      .orderBy(desc(appNotifications.created_at))
      .limit(20)

    const unreadCount = notifications.filter((n) => !n.read).length

    return NextResponse.json({ notifications, unread_count: unreadCount })
  } catch (err) {
    console.error('GET /api/notifications/time-tracking error:', err)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

const MarkReadSchema = z.object({
  id: z.number().int().positive(),
})

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = MarkReadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  try {
    await db
      .update(appNotifications)
      .set({ read: true })
      .where(
        and(
          eq(appNotifications.id, parsed.data.id),
          eq(appNotifications.user_id, TIMESHEET_USER_ID)
        )
      )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/notifications/time-tracking error:', err)
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
  }
}
