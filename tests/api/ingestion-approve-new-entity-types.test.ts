// tests/api/ingestion-approve-new-entity-types.test.ts
// Phase 88.1 G5 — RED scaffold for approve route source-scan + BLOCKER 1 Zod gate
// Tests E: case branches present
// Test F: imports from context-updater-applier
// Test G (BLOCKER 1): ApprovalItemSchema z.enum contains new entity-type strings (runtime gate)
// Test H: context_upload reference (soft check)
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const repoRoot = join(__dirname, '..', '..')
const approvePath = join(repoRoot, 'app/api/ingestion/approve/route.ts')
const NEW_ENTITY_TYPES = ['evidence_log_entry', 'team_card_activity', 'team_metric_current', 'milestone_date_update']

describe('Phase 88.1 G5 — approve route routes 4 new entity types', () => {
  it('Test E: approve route source contains case branches for 4 new entity types', () => {
    const src = readFileSync(approvePath, 'utf8')
    for (const t of NEW_ENTITY_TYPES) {
      expect(src, `case '${t}' missing in approve route switch`).toMatch(new RegExp(`case ['"]${t}['"]`))
    }
  })

  it('Test F: approve route imports new per-entity applier fns from @/lib/context-updater-applier', () => {
    const src = readFileSync(approvePath, 'utf8')
    expect(src).toMatch(/from ['"]@\/lib\/context-updater-applier['"]/)
    expect(src).toMatch(/apply(EvidenceLogEntry|TeamCardActivity|TeamMetricCurrent|MilestoneDate)/)
  })

  it('Test G (BLOCKER 1 fix): ApprovalItemSchema.entityType z.enum contains all 4 new entity-type strings', () => {
    // CRITICAL: without this, Zod safeParse silently filters items before switch dispatch.
    const src = readFileSync(approvePath, 'utf8')
    // Find the ApprovalItemSchema definition and extract its z.enum array
    const match = src.match(/ApprovalItemSchema[\s\S]*?entityType:\s*z\.enum\(\s*\[([^\]]+)\]/m)
    expect(match, 'could not locate ApprovalItemSchema.entityType z.enum').not.toBeNull()
    const enumBody = match![1]
    for (const t of NEW_ENTITY_TYPES) {
      expect(enumBody, `ApprovalItemSchema z.enum missing '${t}' — items would be silently filtered`).toContain(`'${t}'`)
    }
  })

  it('Test H: approve route handler paths reference context_upload (soft check)', () => {
    const src = readFileSync(approvePath, 'utf8')
    const passesIfApplierHandles =
      src.includes('context_upload') ||
      /apply(EvidenceLogEntry|TeamCardActivity|TeamMetricCurrent|MilestoneDate)/.test(src)
    expect(passesIfApplierHandles).toBe(true)
  })
})
