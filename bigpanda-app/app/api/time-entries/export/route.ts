import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gte, lte } from 'drizzle-orm'
import ExcelJS from 'exceljs'
import db from '@/db'
import { timeEntries, projects } from '@/db/schema'
import type { TimeEntry } from '@/db/schema'
import { getEntryStatus, groupEntries, computeSubtotals } from '@/lib/time-tracking'
import type { GroupBy } from '@/lib/time-tracking'
import { requireSession } from "@/lib/auth-server";

// ─── Export row shape (Project column moved to first position) ────────────────

type ExportRow = {
  Project: string
  Date: string
  Hours: string
  Description: string
  Status: string
  Team_Member: string
  Submitted_On: string
  Submitted_By: string
  Approved_On: string
  Approved_By: string
  Rejected_On: string
  Rejected_By: string
  Locked: string
}

function toExportRow(entry: TimeEntry, projectName: string): ExportRow {
  return {
    Project: projectName,
    Date: entry.date,
    Hours: entry.hours,
    Description: entry.description,
    Status: getEntryStatus(entry),
    Team_Member: entry.submitted_by ?? '',
    Submitted_On: entry.submitted_on ? new Date(entry.submitted_on).toISOString() : '',
    Submitted_By: entry.submitted_by ?? '',
    Approved_On: entry.approved_on ? new Date(entry.approved_on).toISOString() : '',
    Approved_By: entry.approved_by ?? '',
    Rejected_On: entry.rejected_on ? new Date(entry.rejected_on).toISOString() : '',
    Rejected_By: entry.rejected_by ?? '',
    Locked: entry.locked ? 'Yes' : 'No',
  }
}

// ─── CSV helpers ───────────────────────────────────────────────────────────────

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const EXPORT_COLUMNS: (keyof ExportRow)[] = [
  'Project', 'Date', 'Hours', 'Description', 'Status',
  'Team_Member', 'Submitted_On', 'Submitted_By',
  'Approved_On', 'Approved_By',
  'Rejected_On', 'Rejected_By', 'Locked',
]

function buildCSV(rows: ExportRow[]): string {
  const headerLine = EXPORT_COLUMNS.join(',')
  const dataLines = rows.map((row) =>
    EXPORT_COLUMNS.map((h) => escapeCSVField(row[h])).join(',')
  )
  return [headerLine, ...dataLines].join('\n')
}

// ─── Excel helpers ─────────────────────────────────────────────────────────────

type EntryWithProject = TimeEntry & { project_name: string | null }

function addWorksheetFromEntries(
  wb: ExcelJS.Workbook,
  sheetName: string,
  entries: EntryWithProject[],
  includeSubtotal: boolean
) {
  const ws = wb.addWorksheet(sheetName.slice(0, 31))
  ws.columns = EXPORT_COLUMNS.map((col) => ({ header: col, key: col, width: 20 }))

  const rows = entries.map((e) => toExportRow(e, e.project_name ?? 'Unknown'))
  rows.forEach((row) => ws.addRow(row))

  if (includeSubtotal && entries.length > 0) {
    const { total_hours, billable_hours, non_billable_hours } = computeSubtotals(entries)
    const subtotalRow = ws.addRow({
      Project: 'SUBTOTAL',
      Date: '',
      Hours: total_hours.toFixed(2),
      Description: `Billable: ${billable_hours.toFixed(2)} | Non-Billable: ${non_billable_hours.toFixed(2)}`,
      Status: '', Team_Member: '',
      Submitted_On: '', Submitted_By: '',
      Approved_On: '', Approved_By: '',
      Rejected_On: '', Rejected_By: '', Locked: '',
    })
    subtotalRow.font = { bold: true }
    subtotalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' },
    }
  }

  // Bold header row
  ws.getRow(1).font = { bold: true }
  return ws
}

function addSummarySheet(wb: ExcelJS.Workbook, entries: TimeEntry[]) {
  const ws = wb.addWorksheet('Summary')
  ws.columns = [
    { header: 'Status', key: 'Status', width: 15 },
    { header: 'Count', key: 'Count', width: 10 },
    { header: 'Total_Hours', key: 'Total_Hours', width: 15 },
    { header: 'Billable_Hours', key: 'Billable_Hours', width: 15 },
    { header: 'Non_Billable_Hours', key: 'Non_Billable_Hours', width: 18 },
  ]
  ws.getRow(1).font = { bold: true }

  const statusGroups = groupEntries(entries, 'status')
  Object.entries(statusGroups).forEach(([status, groupEntryList]) => {
    const { total_hours, billable_hours, non_billable_hours } = computeSubtotals(groupEntryList)
    ws.addRow({
      Status: status,
      Count: groupEntryList.length,
      Total_Hours: total_hours.toFixed(2),
      Billable_Hours: billable_hours.toFixed(2),
      Non_Billable_Hours: non_billable_hours.toFixed(2),
    })
  })
}

async function buildGroupedWorkbook(
  entries: EntryWithProject[],
  groupBy: GroupBy
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  const grouped = groupEntries(entries, groupBy)

  const keys = Object.keys(grouped).sort()
  for (const key of keys) {
    addWorksheetFromEntries(wb, key, grouped[key] as EntryWithProject[], true)
  }

  addSummarySheet(wb, entries)
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf as ArrayBuffer)
}

async function buildSingleSheetWorkbook(
  entries: EntryWithProject[]
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  addWorksheetFromEntries(wb, 'Time Entries', entries, false)
  addSummarySheet(wb, entries)
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf as ArrayBuffer)
}

// ─── Route handler (global — no projectId path param) ─────────────────────────

export async function GET(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url)

  const format = (searchParams.get('format') ?? 'csv') as 'csv' | 'xlsx'
  const projectId = searchParams.get('project_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const groupByParam = searchParams.get('group_by') ?? 'none'

  const validGroupBy = ['project', 'team_member', 'status', 'date'] as const
  const groupBy: GroupBy | null = validGroupBy.includes(groupByParam as GroupBy)
    ? (groupByParam as GroupBy)
    : null

  try {
    // Build conditions - always filter by current user
    const conditions = [eq(timeEntries.user_id, session.user.id)]

    if (projectId) {
      conditions.push(eq(timeEntries.project_id, parseInt(projectId, 10)))
    }
    if (from) {
      conditions.push(gte(timeEntries.date, from))
    }
    if (to) {
      conditions.push(lte(timeEntries.date, to))
    }

    // Cross-project query with LEFT JOIN - no RLS needed
    const fetchedEntries = await db
      .select({
        id: timeEntries.id,
        project_id: timeEntries.project_id,
        user_id: timeEntries.user_id,
        date: timeEntries.date,
        hours: timeEntries.hours,
        description: timeEntries.description,
        created_at: timeEntries.created_at,
        updated_at: timeEntries.updated_at,
        submitted_on: timeEntries.submitted_on,
        submitted_by: timeEntries.submitted_by,
        approved_on: timeEntries.approved_on,
        approved_by: timeEntries.approved_by,
        rejected_on: timeEntries.rejected_on,
        rejected_by: timeEntries.rejected_by,
        locked: timeEntries.locked,
        project_name: projects.customer,
      })
      .from(timeEntries)
      .leftJoin(projects, eq(timeEntries.project_id, projects.id))
      .where(and(...conditions))
      .orderBy(timeEntries.date)

    const dateStr = new Date().toISOString().slice(0, 10)

    if (format === 'csv') {
      const rows = fetchedEntries.map((e) => toExportRow(e, e.project_name ?? 'Unknown'))
      const csv = buildCSV(rows)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="time-entries-${dateStr}.csv"`,
        },
      })
    }

    // xlsx format
    const xlsxBytes: Uint8Array =
      groupBy != null
        ? await buildGroupedWorkbook(fetchedEntries, groupBy)
        : await buildSingleSheetWorkbook(fetchedEntries)

    return new Response(xlsxBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="time-entries-${dateStr}.xlsx"`,
      },
    })
  } catch (err) {
    console.error('GET /api/time-entries/export error:', err)
    return NextResponse.json({ error: 'Failed to export time entries' }, { status: 500 })
  }
}
