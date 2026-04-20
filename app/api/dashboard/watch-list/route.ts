/**
 * app/api/dashboard/watch-list/route.ts — DASH-05 Cross-Account Watch List API
 *
 * GET /api/dashboard/watch-list
 * Returns top escalated risks (high/critical severity, not resolved) across
 * all active projects, ordered by created_at DESC, limit 20.
 *
 * Response: { items: Array<{ id, description, severity, status, project_name, customer, last_updated }> }
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { risks, projects, projectMembers } from '@/db/schema';
import { eq, and, or, isNull, ne, desc, inArray } from 'drizzle-orm';
import { requireSession } from "@/lib/auth-server";
import { resolveRole } from '@/lib/auth-utils';

export async function GET() {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  try {
    const role = resolveRole(session!);
    const membershipCondition = role === 'admin'
      ? undefined
      : inArray(
          projects.id,
          db.select({ id: projectMembers.project_id })
            .from(projectMembers)
            .where(eq(projectMembers.user_id, session!.user.id))
        );

    const rows = await db
      .select({
        id: risks.id,
        description: risks.description,
        severity: risks.severity,
        status: risks.status,
        last_updated: risks.last_updated,
        project_name: projects.name,
        customer: projects.customer,
      })
      .from(risks)
      .innerJoin(projects, eq(risks.project_id, projects.id))
      .where(
        and(
          eq(projects.status, 'active'),
          inArray(risks.severity, ['high', 'critical']),
          or(
            isNull(risks.status),
            ne(risks.status, 'resolved'),
          ),
          membershipCondition
        )
      )
      .orderBy(desc(risks.created_at))
      .limit(20);

    return NextResponse.json({ items: rows });
  } catch (error) {
    console.error('[watch-list] query error:', error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
