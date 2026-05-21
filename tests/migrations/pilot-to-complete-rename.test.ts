// tests/migrations/pilot-to-complete-rename.test.ts
// Phase 88.1 Gap G4 — rename integration_track_status enum value 'pilot' → 'complete'
//
// Wave 0 RED scaffold for G4 gap closure. Gates Plan 88.1-09.
//
// Asserts:
//   A. Migration 0056 exists and contains ALTER TYPE ... RENAME VALUE 'pilot' TO 'complete'
//   B. db/schema.ts integrationTrackStatusEnum array has 'complete', not 'pilot'
//   C. lib/constants/track-workstream-stages.ts comment uses lifecycle order 'live > complete > in_progress > planned'
//   D. All 5 UI components use 'complete' (not 'pilot')
//   E. DISCRIMINATING codebase sweep — zero stray 'pilot' enum literals outside allow-list
//   F. API routes z.enum literal arrays no longer contain 'pilot' for integration_track_status
//
// All 6 tests must be RED before Task 2+3 land.
//
// Nit 9 disposition: Test E EXCLUDES test/fixture files via path-segment skip
// ('/tests/', '/__tests__/', '.test.', '.spec.').
// Allow-list rationale:
//   (a) coerceIntegrationStatus body in approve/route.ts:106 — 'pilot' is the IntegrationStatus
//       enum #2 input synonym mapping to 'configured'. Detected by checking surrounding 3-line
//       window for 'coerceIntegrationStatus' or "return 'configured'".
//   (b) test/fixture files — excluded by path pattern.
//   (c) worker/jobs/document-extraction.ts verbatim English prose 'pilot' inside sourceExcerpt
//       example strings (not enum slots) — detected by checking surrounding 3-line window for
//       "sourceExcerpt" or "Output:.*currently in pilot".

import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

const repoRoot = join(__dirname, '..', '..')
const migrationPath = join(repoRoot, 'db/migrations/0056_rename_pilot_to_complete.sql')
const schemaPath = join(repoRoot, 'db/schema.ts')
const constantsPath = join(repoRoot, 'lib/constants/track-workstream-stages.ts')

const UI_COMPONENT_PATHS = [
  'components/arch/TeamOnboardingEditModal.tsx',
  'components/arch/TeamPathwayEditModal.tsx',
  'components/arch/IntegrationEditModal.tsx',
  'components/arch/IntegrationNode.tsx',
  'components/arch/InteractiveArchGraph.tsx',
].map((p) => join(repoRoot, p))

const API_ROUTE_PATHS = [
  'app/api/projects/[projectId]/architecture-integrations/route.ts',
  'app/api/projects/[projectId]/architecture-integrations/[id]/route.ts',
  'app/api/projects/[projectId]/team-pathways/route.ts',
  'app/api/projects/[projectId]/team-pathways/[id]/route.ts',
  'app/api/projects/[projectId]/team-onboarding-status/route.ts',
  'app/api/projects/[projectId]/team-onboarding-status/[id]/route.ts',
].map((p) => join(repoRoot, p))

describe('Phase 88.1 G4 — pilot → complete enum rename (integration_track_status)', () => {
  it('Test A: migration 0056 exists and contains RENAME VALUE pilot → complete', () => {
    expect(existsSync(migrationPath)).toBe(true)
    const src = readFileSync(migrationPath, 'utf8')
    expect(src).toMatch(/ALTER TYPE integration_track_status RENAME VALUE 'pilot' TO 'complete'/)
  })

  it("Test B: db/schema.ts integrationTrackStatusEnum array has complete, not pilot", () => {
    const src = readFileSync(schemaPath, 'utf8')
    const match = src.match(/integrationTrackStatusEnum[^]*?\[([^\]]*)\]/)
    expect(match).not.toBeNull()
    const arr = match![1]
    expect(arr).toContain("'complete'")
    expect(arr).not.toContain("'pilot'")
  })

  it('Test C: track-workstream-stages.ts comment uses live > complete > in_progress > planned', () => {
    const src = readFileSync(constantsPath, 'utf8')
    expect(src).toMatch(/live > complete > in_progress > planned/)
  })

  it('Test D: all 5 UI components use complete (not pilot)', () => {
    for (const p of UI_COMPONENT_PATHS) {
      expect(existsSync(p), `missing: ${p}`).toBe(true)
      const src = readFileSync(p, 'utf8')
      expect(src, `${p} should contain 'complete'`).toContain("'complete'")
      expect(
        src,
        `${p} should NOT contain enum literal 'pilot' or "pilot" or case 'pilot' or === 'pilot'`
      ).not.toMatch(/(?:'pilot'|"pilot"|case 'pilot'|=== 'pilot')/)
    }
  })

  it('Test E (DISCRIMINATING): codebase sweep — no stray pilot enum literals outside allow-list', () => {
    // Allow-list rules:
    // (a) coerceIntegrationStatus body in approve/route.ts — 'pilot' is IntegrationStatus enum #2 input synonym
    // (b) test/fixture files — *.test.*, /tests/, /__tests__/
    // (c) verbatim English in sourceExcerpt example strings in worker/jobs/document-extraction.ts
    //     (detected by checking the surrounding 3-line window for "sourceExcerpt" or "Output:" example)

    const skipDirs = new Set(['node_modules', '.next', 'dist', '.git'])
    const offenders: string[] = []

    function isAllowed(filePath: string, lineNo: number, lines: string[]): boolean {
      const rel = filePath.replace(repoRoot + '/', '')
      // (b) tests
      if (/\/tests\/|\/__tests__\/|\.test\.|\.spec\./.test(rel)) return true
      // (a) coerceIntegrationStatus
      if (rel === 'app/api/ingestion/approve/route.ts') {
        const ctxStart = Math.max(0, lineNo - 3)
        const ctxEnd = Math.min(lines.length, lineNo + 2)
        const ctx = lines.slice(ctxStart, ctxEnd).join('\n')
        if (/coerceIntegrationStatus|return 'configured'/.test(ctx)) return true
      }
      // (c) worker prompt sourceExcerpt verbatim
      if (rel === 'worker/jobs/document-extraction.ts') {
        const ctxStart = Math.max(0, lineNo - 3)
        const ctxEnd = Math.min(lines.length, lineNo + 2)
        const ctx = lines.slice(ctxStart, ctxEnd).join('\n')
        if (/sourceExcerpt|Output:.*currently in pilot/i.test(ctx)) return true
      }
      return false
    }

    function walk(dir: string) {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, ent.name)
        if (ent.isDirectory()) {
          if (skipDirs.has(ent.name)) continue
          walk(full)
        } else if (ent.isFile() && /\.(ts|tsx)$/.test(ent.name)) {
          const content = readFileSync(full, 'utf8')
          const lines = content.split('\n')
          lines.forEach((line, idx) => {
            if (/'pilot'|"pilot"/.test(line)) {
              if (!isAllowed(full, idx + 1, lines)) {
                offenders.push(`${full.replace(repoRoot + '/', '')}:${idx + 1}`)
              }
            }
          })
        }
      }
    }
    walk(join(repoRoot, 'app'))
    walk(join(repoRoot, 'lib'))
    walk(join(repoRoot, 'components'))
    walk(join(repoRoot, 'db'))
    walk(join(repoRoot, 'worker'))
    expect(offenders, `Stray 'pilot' enum literals found in:\n  ${offenders.join('\n  ')}`).toEqual([])
  })

  it('Test F: API routes z.enum literal arrays no longer contain pilot for integration_track_status', () => {
    for (const p of API_ROUTE_PATHS) {
      expect(existsSync(p), `missing: ${p}`).toBe(true)
      const src = readFileSync(p, 'utf8')
      expect(src, `${p} z.enum should NOT contain ['live', 'in_progress', 'pilot'`).not.toMatch(
        /z\.enum\(\s*\[\s*'live',\s*'in_progress',\s*'pilot'/
      )
      expect(src, `${p} z.enum should contain ['live', 'in_progress', 'complete'`).toMatch(
        /z\.enum\(\s*\[\s*'live',\s*'in_progress',\s*'complete'/
      )
    }
  })
})
