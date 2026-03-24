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
import { risks, projects } from '@/db/schema';
import { eq, and, or, isNull, ne, desc, inArray } from 'drizzle-orm';

export async function GET() {
  try {
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
