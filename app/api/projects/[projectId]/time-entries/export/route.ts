import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gte, lte } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import * as XLSX from 'xlsx'
import db from '@/db'
import { timeEntries, projects } from '@/db/schema'
import type { TimeEntry } from '@/db/schema'
import { getEntryStatus, groupEntries, computeSubtotals } from '@/lib/time-tracking'
import type { GroupBy } from '@/lib/time-tracking'

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
  // Wrap in quotes if value contains comma, double-quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildCSV(rows: ExportRow[]): string {
  const headers: (keyof ExportRow)[] = [
    'Date', 'Hours', 'Description', 'Status', 'Project',
    'Team_Member', 'Submitted_On', 'Submitted_By',
    'Approved_On', 'Approved_By',
    'Rejected_On', 'Rejected_By', 'Locked',
  ]
  const headerLine = headers.join(',')
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCSVField(row[h])).join(',')
  )
  return [headerLine, ...dataLines].join('\n')
}

// ─── Excel helpers ─────────────────────────────────────────────────────────────

function addSubtotalRow(rows: ExportRow[], entries: TimeEntry[]): ExportRow[] {
  const { total_hours, billable_hours, non_billable_hours } = computeSubtotals(entries)
  return [
    ...rows,
    {
      Date: 'SUBTOTAL',
      Hours: total_hours.toFixed(2),
      Description: `Billable: ${billable_hours.toFixed(2)} | Non-Billable: ${non_billable_hours.toFixed(2)}`,
      Status: '',
      Project: '',
      Team_Member: '',
      Submitted_On: '',
      Submitted_By: '',
      Approved_On: '',
      Approved_By: '',
      Rejected_On: '',
      Rejected_By: '',
      Locked: '',
    },
  ]
}

function buildGroupedWorkbook(
  entries: TimeEntry[],
  projectName: string,
  groupBy: GroupBy
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const grouped = groupEntries(entries, groupBy)

  // Sort group keys for consistent sheet ordering
  const keys = Object.keys(grouped).sort()

  for (const key of keys) {
    const groupEntryList = grouped[key]
    const rows = groupEntryList.map((e) => toExportRow(e, projectName))
    const rowsWithSubtotal = addSubtotalRow(rows, groupEntryList)
    const ws = XLSX.utils.json_to_sheet(rowsWithSubtotal)
    // Sheet name: truncate to 31 chars (Excel limit)
    const sheetName = key.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  // Summary sheet: totals per status
  const statusGroups = groupEntries(entries, 'status')
  const summaryRows = Object.entries(statusGroups).map(([status, groupEntryList]) => {
    const { total_hours, billable_hours, non_billable_hours } = computeSubtotals(groupEntryList)
    return {
      Status: status,
      Count: groupEntryList.length,
      Total_Hours: total_hours.toFixed(2),
      Billable_Hours: billable_hours.toFixed(2),
      Non_Billable_Hours: non_billable_hours.toFixed(2),
    }
  })
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  return wb
}

function buildSingleSheetWorkbook(entries: TimeEntry[], projectName: string): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const rows = entries.map((e) => toExportRow(e, projectName))
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Time Entries')

  // Summary sheet: totals per status
  const statusGroups = groupEntries(entries, 'status')
  const summaryRows = Object.entries(statusGroups).map(([status, groupEntryList]) => {
    const { total_hours, billable_hours, non_billable_hours } = computeSubtotals(groupEntryList)
    return {
      Status: status,
      Count: groupEntryList.length,
      Total_Hours: total_hours.toFixed(2),
      Billable_Hours: billable_hours.toFixed(2),
      Non_Billable_Hours: non_billable_hours.toFixed(2),
    }
  })
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  return wb
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
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
    const wb =
      groupBy != null
        ? buildGroupedWorkbook(fetchedEntries, projectName, groupBy)
        : buildSingleSheetWorkbook(fetchedEntries, projectName)

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    return new NextResponse(buffer, {
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
