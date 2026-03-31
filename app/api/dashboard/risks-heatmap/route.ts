/**
 * app/api/dashboard/risks-heatmap/route.ts — DASH-04 Risk Heat Map API
 *
 * GET /api/dashboard/risks-heatmap
 * Returns risk counts grouped by severity x status for active projects only.
 * Excludes resolved risks and risks from archived/closed projects.
 *
 * Response: { heatmap: Array<{ severity: string, status: string, count: number }> }
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { risks, projects } from '@/db/schema';
import { eq, ne, and, sql } from 'drizzle-orm';
import { requireSession } from "@/lib/auth-server";

export async function GET() {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  try {
    const rows = await db
      .select({
        severity: risks.severity,
        status: risks.status,
        count: sql<number>`count(*)::int`,
      })
      .from(risks)
      .innerJoin(projects, eq(risks.project_id, projects.id))
      .where(
        and(
          eq(projects.status, 'active'),
          ne(risks.status, 'resolved'),
        )
      )
      .groupBy(risks.severity, risks.status);

    return NextResponse.json({ heatmap: rows });
  } catch (error) {
    console.error('[risks-heatmap] query error:', error);
    return NextResponse.json({ heatmap: [] }, { status: 500 });
  }
}
