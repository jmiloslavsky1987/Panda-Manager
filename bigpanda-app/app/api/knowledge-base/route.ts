import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../db';
import { knowledgeBase, auditLog, projects } from '../../../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { searchAllRecords } from '../../../lib/queries';

// GET /api/knowledge-base
// Query params: q (optional free-text), project_id (optional integer filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    const projectIdParam = searchParams.get('project_id');

    // Full-text search path
    if (q.trim().length >= 2) {
      const results = await searchAllRecords({ q: q.trim(), type: 'knowledge_base' });
      // Map SearchResult back to entry shape (id, title, snippet as content proxy)
      const entries = results.map((r) => ({
        id: r.id,
        project_id: r.project_id,
        title: r.title,
        content: r.snippet,
        source_trace: null,
        linked_risk_id: null,
        linked_history_id: null,
        linked_date: r.date,
        created_at: null,
        project_name: r.project_name,
      }));
      return NextResponse.json({ entries });
    }

    // Standard list path with optional project_id filter
    const conditions = [];
    if (projectIdParam) {
      const projectIdNum = parseInt(projectIdParam, 10);
      if (!isNaN(projectIdNum)) {
        conditions.push(eq(knowledgeBase.project_id, projectIdNum));
      }
    }

    const rows = await db
      .select({
        id: knowledgeBase.id,
        project_id: knowledgeBase.project_id,
        title: knowledgeBase.title,
        content: knowledgeBase.content,
        source_trace: knowledgeBase.source_trace,
        linked_risk_id: knowledgeBase.linked_risk_id,
        linked_history_id: knowledgeBase.linked_history_id,
        linked_date: knowledgeBase.linked_date,
        created_at: knowledgeBase.created_at,
        project_name: projects.name,
      })
      .from(knowledgeBase)
      .leftJoin(projects, eq(projects.id, knowledgeBase.project_id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(knowledgeBase.created_at));

    return NextResponse.json({ entries: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/knowledge-base
// Body: { title, content, source_trace?, project_id?, linked_risk_id?, linked_history_id?, linked_date? }
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const {
      title,
      content,
      source_trace,
      project_id,
      linked_risk_id,
      linked_history_id,
      linked_date,
    } = body as Record<string, unknown>;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const projectIdNum =
      project_id !== undefined && project_id !== null
        ? parseInt(String(project_id), 10)
        : undefined;

    // Auto-build source_trace when project_id is provided but source_trace not given (KB-03)
    let resolvedSourceTrace: string | undefined =
      source_trace && typeof source_trace === 'string' ? source_trace : undefined;

    if (!resolvedSourceTrace && projectIdNum !== undefined && !isNaN(projectIdNum)) {
      const projectRows = await db
        .select({ customer: projects.customer })
        .from(projects)
        .where(eq(projects.id, projectIdNum));
      if (projectRows.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        resolvedSourceTrace = `Project: ${projectRows[0].customer} | Date: ${today}`;
      }
    }

    const insertData = {
      title: title.trim(),
      content: content.trim(),
      source_trace: resolvedSourceTrace ?? null,
      project_id: projectIdNum !== undefined && !isNaN(projectIdNum) ? projectIdNum : null,
      linked_risk_id:
        linked_risk_id !== undefined && linked_risk_id !== null
          ? parseInt(String(linked_risk_id), 10)
          : null,
      linked_history_id:
        linked_history_id !== undefined && linked_history_id !== null
          ? parseInt(String(linked_history_id), 10)
          : null,
      linked_date:
        linked_date !== undefined && linked_date !== null ? String(linked_date) : null,
    };

    const newRow = await db.transaction(async (tx) => {
      const [row] = await tx.insert(knowledgeBase).values(insertData).returning();
      await tx.insert(auditLog).values({
        entity_type: 'knowledge_base',
        entity_id: row.id,
        action: 'create',
        actor_id: 'default',
        before_json: null,
        after_json: row as Record<string, unknown>,
      });
      return row;
    });

    return NextResponse.json({ entry: newRow }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
