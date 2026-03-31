import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gte, lte } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import ExcelJS from 'exceljs'
import db from '@/db'
import { timeEntries, projects } from '@/db/schema'
import type { TimeEntry } from '@/db/schema'
import { getEntryStatus, groupEntries, computeSubtotals } from '@/lib/time-tracking'
import type { GroupBy } from '@/lib/time-tracking'
import { requireSession } from "@/lib/auth-server";

// ─── Export row shape ──────────────────────────────────────────────────────────

type ExportRow = {
  Date: string
  Hours: string
  Description: string
  Status: string
  Project: string
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
    Date: entry.date,
    Hours: entry.hours,
    Description: entry.description,
    Status: getEntryStatus(entry),
    Project: projectName,
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
  'Date', 'Hours', 'Description', 'Status', 'Project',
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

function addWorksheetFromEntries(
  wb: ExcelJS.Workbook,
  sheetName: string,
  entries: TimeEntry[],
  projectName: string,
  includeSubtotal: boolean
) {
  const ws = wb.addWorksheet(sheetName.slice(0, 31))
  ws.columns = EXPORT_COLUMNS.map((col) => ({ header: col, key: col, width: 20 }))

  const rows = entries.map((e) => toExportRow(e, projectName))
  rows.forEach((row) => ws.addRow(row))

  if (includeSubtotal && entries.length > 0) {
    const { total_hours, billable_hours, non_billable_hours } = computeSubtotals(entries)
    const subtotalRow = ws.addRow({
      Date: 'SUBTOTAL',
      Hours: total_hours.toFixed(2),
      Description: `Billable: ${billable_hours.toFixed(2)} | Non-Billable: ${non_billable_hours.toFixed(2)}`,
      Status: '', Project: '', Team_Member: '',
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
  entries: TimeEntry[],
  projectName: string,
  groupBy: GroupBy
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  const grouped = groupEntries(entries, groupBy)

  const keys = Object.keys(grouped).sort()
  for (const key of keys) {
    addWorksheetFromEntries(wb, key, grouped[key], projectName, true)
  }

  addSummarySheet(wb, entries)
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf as ArrayBuffer)
}

async function buildSingleSheetWorkbook(
  entries: TimeEntry[],
  projectName: string
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  addWorksheetFromEntries(wb, 'Time Entries', entries, projectName, false)
  addSummarySheet(wb, entries)
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf as ArrayBuffer)
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  const { searchParams } = new URL(req.url)

  const format = (searchParams.get('format') ?? 'csv') as 'csv' | 'xlsx'
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const groupByParam = searchParams.get('group_by') ?? 'none'

  const validGroupBy = ['project', 'team_member', 'status', 'date'] as const
  const groupBy: GroupBy | null = validGroupBy.includes(groupByParam as GroupBy)
    ? (groupByParam as GroupBy)
    : null

  try {
    const { fetchedEntries, projectName } = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      const [project] = await tx
        .select({ customer: projects.customer })
        .from(projects)
        .where(eq(projects.id, numericId))
      const projectName = project?.customer ?? `Project ${numericId}`

      const conditions = [eq(timeEntries.project_id, numericId)]
      if (from) conditions.push(gte(timeEntries.date, from))
      if (to) conditions.push(lte(timeEntries.date, to))

      const fetchedEntries = await tx
        .select()
        .from(timeEntries)
        .where(and(...conditions))
        .orderBy(timeEntries.date)

      return { fetchedEntries, projectName }
    })

    const dateStr = new Date().toISOString().slice(0, 10)
    const safeName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()

    if (format === 'csv') {
      const rows = fetchedEntries.map((e) => toExportRow(e, projectName))
      const csv = buildCSV(rows)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="time-log-${safeName}-${dateStr}.csv"`,
        },
      })
    }

    // xlsx format
    const xlsxBytes: Uint8Array =
      groupBy != null
        ? await buildGroupedWorkbook(fetchedEntries, projectName, groupBy)
        : await buildSingleSheetWorkbook(fetchedEntries, projectName)

    return new Response(xlsxBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="time-log-${safeName}-${dateStr}.xlsx"`,
      },
    })
  } catch (err) {
    console.error('GET time-entries/export error:', err)
    return NextResponse.json({ error: 'Failed to export time entries' }, { status: 500 })
  }
}
