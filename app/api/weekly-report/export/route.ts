import { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { requireSession } from '@/lib/auth-server'

const HEALTH_COLORS: Record<string, string> = {
  green:  'FF92D050',
  yellow: 'FFFFC000',
  red:    'FFFF0000',
}

export async function GET(req: NextRequest) {
  const { redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const week = req.nextUrl.searchParams.get('week') ?? ''
  const base = req.nextUrl.origin
  const dataRes = await fetch(`${base}/api/weekly-report?week=${week}`, {
    headers: { cookie: req.headers.get('cookie') ?? '' },
  })
  if (!dataRes.ok) return new Response('Failed to fetch report data', { status: 500 })
  const { rows, weekOf } = await dataRes.json() as { rows: any[]; weekOf: string }

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Panda Manager'
  const ws = wb.addWorksheet('Weekly Status')

  // Title row
  ws.mergeCells('A1:M1')
  const title = ws.getCell('A1')
  title.value = `Weekly Project Status — ${weekOf}`
  title.font = { bold: true, size: 14 }
  title.alignment = { horizontal: 'center' }
  ws.getRow(1).height = 24

  // Header row
  ws.addRow([])
  const headers = [
    'Project Name', 'Type', 'Owner', 'Health',
    'Progress & Next Steps', 'Risks',
    'Start Date', 'Go-Live (Planned)',
    'Budgeted Hours', 'Hours Consumed', 'Progress %',
    'Budget Used %', 'ARR',
  ]
  const headerRow = ws.addRow(headers)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203864' } }
  headerRow.height = 18
  headerRow.alignment = { vertical: 'middle' }

  // Column widths
  const colWidths = [32, 18, 20, 10, 50, 40, 12, 16, 14, 14, 11, 12, 14]
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w })

  // Data rows
  for (const row of rows) {
    const budgetUsed = row.budgeted_hours && row.hours_consumed
      ? Math.round((row.hours_consumed / row.budgeted_hours) * 100)
      : null

    const dataRow = ws.addRow([
      row.customer || row.name,
      row.project_type,
      row.owner,
      row.health,
      row.notes,
      row.risk_summary,
      row.start_date,
      row.go_live_target,
      row.budgeted_hours ?? '',
      row.hours_consumed ? Math.round(row.hours_consumed) : '',
      row.progress_pct != null ? `${row.progress_pct}%` : '',
      budgetUsed != null ? `${budgetUsed}%` : '',
      row.arr,
    ])

    dataRow.getCell(5).alignment = { wrapText: true }
    dataRow.getCell(6).alignment = { wrapText: true }
    dataRow.height = 40

    // Health cell coloring
    const healthLower = (row.health ?? '').toLowerCase()
    if (HEALTH_COLORS[healthLower]) {
      dataRow.getCell(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: HEALTH_COLORS[healthLower] },
      }
      dataRow.getCell(4).font = { bold: true, color: { argb: 'FF000000' } }
    }

    // Red-flag budget used
    if (budgetUsed != null && budgetUsed > 100) {
      dataRow.getCell(12).font = { bold: true, color: { argb: 'FFCC0000' } }
    }
  }

  // Freeze header rows
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }]

  // Thin borders on all data
  const lastRow = ws.rowCount
  for (let r = 3; r <= lastRow; r++) {
    for (let c = 1; c <= headers.length; c++) {
      ws.getCell(r, c).border = {
        top:    { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left:   { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right:  { style: 'thin', color: { argb: 'FFD9D9D9' } },
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `weekly-status-${weekOf}.xlsx`
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
