import { NextRequest } from 'next/server'
import { z } from 'zod'
import ExcelJS from 'exceljs'
import * as path from 'path'
import { db } from '@/db'
import { actions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { readSettings } from '@/lib/settings'

// ─── Validation Schema ────────────────────────────────────────────────────────

const ActionPatchSchema = z.object({
  description: z.string().min(1).optional(),
  owner: z.string().optional(),
  due: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
})

type ActionPatch = z.infer<typeof ActionPatchSchema>

// ─── Column name mapping to xlsx headers ─────────────────────────────────────

const FIELD_TO_HEADER: Record<string, string[]> = {
  description: ['Action / Question', 'Description', 'Action'],
  owner: ['Owner'],
  due: ['Due Date', 'Due'],
  status: ['Status'],
  notes: ['Notes'],
}

// ─── xlsx helper ─────────────────────────────────────────────────────────────

async function updateXlsxRow(actionId: number, patch: ActionPatch): Promise<void> {
  const settings = await readSettings()
  const xlsxPath = path.join(settings.workspace_path, 'PA3_Action_Tracker.xlsx')

  // Gracefully skip if file does not exist (dev environment without xlsx)
  try {
    await import('node:fs/promises').then((fs) => fs.access(xlsxPath))
  } catch {
    return
  }

  // Use document-based Workbook (not streaming) to preserve cell styles/themes
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(xlsxPath)

  // Get action's external_id from DB
  const [actionRow] = await db
    .select({ external_id: actions.external_id })
    .from(actions)
    .where(eq(actions.id, actionId))
    .limit(1)

  if (!actionRow) {
    throw new Error(`Action not found in DB: ${actionId}`)
  }

  const { external_id } = actionRow

  // Get Open Actions sheet (with emoji fallback)
  const openSheet =
    wb.getWorksheet('🔴 Open Actions') ?? wb.getWorksheet('Open Actions')

  if (!openSheet) {
    throw new Error('Could not find Open Actions sheet in PA3_Action_Tracker.xlsx')
  }

  // Build header map from row 2 (same pattern as migrate-local.ts)
  const headerRow = openSheet.getRow(2)
  const headerMap: Record<string, number> = {}
  headerRow.eachCell((cell, colNumber) => {
    const header = String(cell.value ?? '').trim()
    if (header) {
      headerMap[header] = colNumber
    }
  })

  // Resolve column index for a field (tries multiple candidate header names)
  function colFor(candidates: string[]): number | undefined {
    for (const candidate of candidates) {
      if (headerMap[candidate] !== undefined) return headerMap[candidate]
    }
    return undefined
  }

  // Find the row matching external_id (rows start at index 3 after headers)
  let targetRowIndex: number | null = null
  const idColCandidates = ['ID', 'Action ID', 'Task ID', 'external_id']
  const idCol = colFor(idColCandidates) ?? 1 // default to col 1

  openSheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return
    const cellValue = String(row.getCell(idCol).value ?? '').trim()
    if (cellValue === external_id) {
      targetRowIndex = rowNumber
    }
  })

  if (targetRowIndex === null) {
    // Row not found in xlsx — skip silently (could have been manually deleted)
    return
  }

  if (patch.status === 'completed') {
    // Move row from Open Actions to Completed sheet
    const completedSheet =
      wb.getWorksheet('✅ Completed') ?? wb.getWorksheet('Completed')

    if (!completedSheet) {
      throw new Error('Could not find Completed sheet in PA3_Action_Tracker.xlsx')
    }

    // Copy all cell values to new row in Completed sheet
    const sourceRow = openSheet.getRow(targetRowIndex)
    const newRow = completedSheet.addRow([])
    sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      newRow.getCell(colNumber).value = cell.value
    })
    newRow.commit()

    // Delete the row from Open Actions
    openSheet.spliceRows(targetRowIndex, 1)
  } else {
    // Update cells in-place for changed fields only
    const targetRow = openSheet.getRow(targetRowIndex)

    for (const [field, candidates] of Object.entries(FIELD_TO_HEADER)) {
      const patchValue = patch[field as keyof ActionPatch]
      if (patchValue === undefined) continue

      const colIndex = colFor(candidates)
      if (colIndex === undefined) continue

      targetRow.getCell(colIndex).value = patchValue
    }

    targetRow.commit()
  }

  // Write file — throws EBUSY/EPERM if file is locked in Excel
  try {
    await wb.xlsx.writeFile(xlsxPath)
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'EBUSY' || nodeErr.code === 'EPERM') {
      throw new Error('Close PA3_Action_Tracker.xlsx in Excel before saving')
    }
    throw err
  }
}

// ─── PATCH handler ────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actionId = parseInt(id, 10)
  if (isNaN(actionId)) {
    return Response.json({ error: 'Invalid action ID' }, { status: 400 })
  }

  let patch: ActionPatch
  try {
    patch = ActionPatchSchema.parse(await req.json())
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    // Step 1: xlsx write FIRST — if this throws, DB write is blocked
    await updateXlsxRow(actionId, patch)

    // Step 2: DB write (only after xlsx succeeds)
    await db
      .update(actions)
      .set({ ...patch, last_updated: new Date().toISOString().split('T')[0] })
      .where(eq(actions.id, actionId))

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Write failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
