import { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { db } from '../../../../db'
import { tasks } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { requireSession } from "@/lib/auth-server";

// ─── GET /api/plan-export/:projectId ─────────────────────────────────────────
// Exports all tasks for a project as an xlsx file in KAISER column format.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId: projectIdStr } = await params
  const projectId = parseInt(projectIdStr, 10)
  if (isNaN(projectId)) {
    return Response.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  try {
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.project_id, projectId))
      .orderBy(tasks.created_at)

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Tasks')

    // KAISER format headers
    ws.addRow(['Task ID', 'Task/Action', 'Owner', 'Status', 'Target Date', 'Dependencies', 'Notes'])

    // Style header row
    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true }
    headerRow.commit()

    // Set column widths
    ws.getColumn(1).width = 12
    ws.getColumn(2).width = 45
    ws.getColumn(3).width = 20
    ws.getColumn(4).width = 15
    ws.getColumn(5).width = 15
    ws.getColumn(6).width = 15
    ws.getColumn(7).width = 40

    // Data rows — KAISER P1-NNN format for Task IDs
    for (const task of projectTasks) {
      const taskId = `P1-${String(task.id).padStart(3, '0')}`
      const dependencies = task.blocked_by
        ? `P1-${String(task.blocked_by).padStart(3, '0')}`
        : ''

      ws.addRow([
        taskId,
        task.title,
        task.owner ?? '',
        task.status,
        task.due ?? '',
        dependencies,
        task.description ?? '',
      ])
    }

    // Generate xlsx buffer
    const buffer = await wb.xlsx.writeBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="plan-export-${projectId}.xlsx"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
