/**
 * app/api/search/route.ts — SRCH-01/02/03 Full-Text Search API
 *
 * GET /api/search?q=term&account=NAME&type=risks&from=2026-01-01&to=2026-12-31
 *
 * Returns unified search results from all 8 project data tables using PostgreSQL
 * tsvector/tsquery. Supports filtering by account name, data type, and date range.
 *
 * Response: { results: SearchResult[], total: number }
 * Error:    { results: [], total: 0, error: string } — HTTP 500
 *
 * Note: server-only import omitted — consistent with db/index.ts decision (worker/test context compat).
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchAllRecords, type SearchResult } from '@/lib/queries';
import { requireSession } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { searchParams } = request.nextUrl;

  const q         = searchParams.get('q') ?? '';
  const account   = searchParams.get('account') ?? undefined;
  const projectId = searchParams.get('projectId') ? Number(searchParams.get('projectId')) : undefined;
  const type      = searchParams.get('type') ?? undefined;
  const from      = searchParams.get('from') ?? undefined;
  const to        = searchParams.get('to') ?? undefined;

  // Validate: short or missing query is not an error — return empty results
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] as SearchResult[], total: 0 });
  }

  try {
    const results = await searchAllRecords({ q, account, projectId, type, from, to });
    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { results: [] as SearchResult[], total: 0, error: message },
      { status: 500 }
    );
  }
}
