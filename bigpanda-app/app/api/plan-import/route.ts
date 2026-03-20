import { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { db } from '../../../db'
import { tasks } from '../../../db/schema'

// ─── POST /api/plan-import ────────────────────────────────────────────────────
// Accepts multipart/form-data with:
//   - file: .xlsx file
//   - project_id: number (as string in FormData)
// Parses KAISER-format columns and creates tasks in DB.

const KAISER_HEADERS = {
  taskId: ['Task ID', 'task id'],
  title: ['Task/Action', 'task/action', 'Action', 'action'],
  owner: ['Owner', 'owner'],
  status: ['Status', 'status'],
  due: ['Target Date', 'target date', 'Due Date', 'due date'],
  dependencies: ['Dependencies', 'dependencies'],
  notes: ['Notes', 'notes'],
}

function buildHeaderMap(row: ExcelJS.Row): Record<string, number> {
  const map: Record<string, number> = {}
  row.eachCell((cell, colNumber) => {
    const header = String(cell.value ?? '').trim()
    if (header) {
      map[header] = colNumber
    }
  })
  return map
}

function resolveColumn(headerMap: Record<string, number>, candidates: string[]): number | undefined {
  for (const candidate of candidates) {
    if (headerMap[candidate] !== undefined) return headerMap[candidate]
  }
  return undefined
}

function cellStr(row: ExcelJS.Row, colIndex: number | undefined): string | null {
  if (colIndex === undefined) return null
  const cell = row.getCell(colIndex)
  if (cell.value === null || cell.value === undefined) return null
  if (cell.value instanceof Date) return cell.value.toISOString().split('T')[0]
  return String(cell.value).trim() || null
}

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const projectIdStr = formData.get('project_id')
  if (!projectIdStr) {
    return Response.json({ error: 'project_id field required' }, { status: 400 })
  }
  const projectId = parseInt(String(projectIdStr), 10)
  if (isNaN(projectId)) {
    return Response.json({ error: 'Invalid project_id' }, { status: 400 })
  }

  const fileField = formData.get('file')
  if (!fileField || !(fileField instanceof Blob)) {
    return Response.json({ error: 'file field required (.xlsx)' }, { status: 400 })
  }

  try {
    const arrayBuffer = await fileField.arrayBuffer()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeBuffer: any = Buffer.from(arrayBuffer)

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(nodeBuffer)

    // Find worksheet: prefer 'Tasks', fallback to 'ByTeam', fallback to first sheet
    const ws =
      wb.getWorksheet('Tasks') ??
      wb.getWorksheet('ByTeam') ??
      wb.worksheets[0]

    if (!ws) {
      return Response.json({ error: 'No worksheet found in uploaded file' }, { status: 422 })
    }

    // Build header map from row 1
    const headerMap = buildHeaderMap(ws.getRow(1))

    const titleCol = resolveColumn(headerMap, KAISER_HEADERS.title)
    if (titleCol === undefined) {
      return Response.json({ error: 'Could not find Task/Action column in xlsx' }, { status: 422 })
    }

    const ownerCol = resolveColumn(headerMap, KAISER_HEADERS.owner)
    const statusCol = resolveColumn(headerMap, KAISER_HEADERS.status)
    const dueCol = resolveColumn(headerMap, KAISER_HEADERS.due)
    const notesCol = resolveColumn(headerMap, KAISER_HEADERS.notes)

    const inserts: Array<{
      project_id: number
      title: string
      owner: string | null
      status: string
      due: string | null
      description: string | null
      source: string
    }> = []

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // skip header

      const title = cellStr(row, titleCol)
      if (!title) return // skip empty rows

      const rawStatus = cellStr(row, statusCol)
      // Normalize status to DB enum values
      let status = 'todo'
      if (rawStatus) {
        const lower = rawStatus.toLowerCase()
        if (lower.includes('progress') || lower === 'in_progress') status = 'in_progress'
        else if (lower === 'done' || lower === 'complete' || lower === 'completed') status = 'done'
        else if (lower === 'blocked') status = 'blocked'
        else if (lower === 'todo' || lower === 'to do' || lower === 'not started') status = 'todo'
      }

      inserts.push({
        project_id: projectId,
        title,
        owner: cellStr(row, ownerCol),
        status,
        due: cellStr(row, dueCol),
        description: cellStr(row, notesCol),
        source: 'import',
      })
    })

    if (inserts.length === 0) {
      return Response.json({ count: 0 }, { status: 201 })
    }

    await db.insert(tasks).values(inserts)

    return Response.json({ count: inserts.length }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
