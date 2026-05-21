// tests/skills/context-updater-trigger-wiring.test.ts
// Phase 88.1 G5 — RED scaffold for Option α trigger wiring
// Covers BLOCKER 2: BOTH EntityType union locations must have the 4 new types.
// Tests C + D assert applier fn exports (Plan 12 refactor + Plan 04 preservation).
import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const repoRoot = join(__dirname, '..', '..')
const extractionTypesPath = join(repoRoot, 'lib/extraction-types.ts')
const extractionPath = join(repoRoot, 'worker/jobs/document-extraction.ts')
const applierPath = join(repoRoot, 'lib/context-updater-applier.ts')

const NEW_ENTITY_TYPES = ['evidence_log_entry', 'team_card_activity', 'team_metric_current', 'milestone_date_update']

describe('Phase 88.1 G5 — context-updater Option α trigger wiring', () => {
  it('Test A1: lib/extraction-types.ts EntityType (canonical) contains 4 new types', () => {
    const src = readFileSync(extractionTypesPath, 'utf8')
    for (const t of NEW_ENTITY_TYPES) {
      expect(src, `lib/extraction-types.ts canonical EntityType missing '${t}'`).toContain(`'${t}'`)
    }
  })

  it('Test A2: worker/jobs/document-extraction.ts EntityType (local copy) contains 4 new types — or re-exports from lib/extraction-types', () => {
    const src = readFileSync(extractionPath, 'utf8')
    const reExports =
      /export\s*(type)?\s*\{?\s*EntityType\s*\}?\s*from\s*['"](\.\.\/\.\.\/)?lib\/extraction-types['"]/.test(src) ||
      /import\s*type\s*\{?\s*EntityType.*from\s*['"](\.\.\/\.\.\/)?lib\/extraction-types['"]/.test(src)
    if (reExports) {
      // Refactored — canonical type wins; no need to check local strings
      return
    }
    for (const t of NEW_ENTITY_TYPES) {
      expect(src, `worker EntityType local copy missing '${t}'`).toContain(`'${t}'`)
    }
  })

  it('Test B: document-extraction.ts prompt template references 4 new types as extractable', () => {
    const src = readFileSync(extractionPath, 'utf8')
    for (const t of NEW_ENTITY_TYPES) {
      const regex = new RegExp(`${t}[\\s\\S]{0,400}(extract|entity_type|when the document|append|update)`, 'i')
      expect(src, `prompt should describe how to extract ${t}`).toMatch(regex)
    }
  })

  it('Test C: context-updater-applier.ts exports 4 new per-entity write fns', () => {
    expect(existsSync(applierPath)).toBe(true)
    const src = readFileSync(applierPath, 'utf8')
    expect(src).toMatch(/export\s+(async\s+)?function\s+applyEvidenceLogEntry/)
    expect(src).toMatch(/export\s+(async\s+)?function\s+applyTeamCardActivity/)
    expect(src).toMatch(/export\s+(async\s+)?function\s+applyTeamMetricCurrent/)
    expect(src).toMatch(/export\s+(async\s+)?function\s+applyMilestoneDate/)
  })

  it('Test D: applyContextUpdaterResult (Plan 04 bulk entrypoint) still exported', () => {
    const src = readFileSync(applierPath, 'utf8')
    expect(src).toMatch(/export\s+(async\s+)?function\s+applyContextUpdaterResult/)
  })
})
