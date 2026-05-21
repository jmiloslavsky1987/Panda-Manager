// tests/components/milestone-status-pill.test.tsx
// Phase 88.1 G3 RED scaffold — Milestone Tracker status pills
// Source-scan pattern (node env, no jsdom) matching Phase 88.1 conventions from Plans 00-08.
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

const repoRoot = process.cwd()
const componentPath = join(repoRoot, 'components/teams/MilestoneTrackerSection.tsx')
const statusPillPath = join(repoRoot, 'components/StatusPill.tsx')

function readSafe(absPath: string): string {
  try {
    return readFileSync(absPath, 'utf-8')
  } catch {
    return ''
  }
}

describe('Phase 88.1 G3 — Milestone Tracker status pills', () => {
  it('Test A: StatusPill source maps complete status to emerald color class', () => {
    const src = readSafe(statusPillPath)
    // StatusPill must exist and contain emerald class for "complete"
    expect(src).not.toBe('')
    // Check that the complete key maps to emerald
    expect(src).toMatch(/complete.*emerald|emerald.*complete/)
  })

  it('Test B: StatusPill source maps at_risk status to amber color class', () => {
    const src = readSafe(statusPillPath)
    expect(src).not.toBe('')
    expect(src).toMatch(/at_risk.*amber|amber.*at_risk/)
  })

  it('Test C: StatusPill source maps achieved (outcome) to emerald color class', () => {
    const src = readSafe(statusPillPath)
    expect(src).not.toBe('')
    // The outcome map must have achieved → emerald
    expect(src).toMatch(/achieved.*emerald|emerald.*achieved/)
  })

  it('Test D: MilestoneTrackerSection source imports StatusPill from @/components/StatusPill', () => {
    expect(existsSync(componentPath)).toBe(true)
    const src = readSafe(componentPath)
    expect(src).toMatch(/from ['"]@\/components\/StatusPill['"]/)
  })

  it('Test E: MilestoneTrackerSection source renders <StatusPill in JSX', () => {
    const src = readSafe(componentPath)
    expect(src).toContain('<StatusPill')
  })

  it('Test F: MilestoneTrackerSection source does NOT contain the prior plain-text status node pattern', () => {
    const src = readSafe(componentPath)
    // Anti-pattern: <span className="text-xs uppercase flex-shrink-0">{m.status
    expect(src).not.toMatch(/className=["']text-xs uppercase flex-shrink-0["']>\{m\.status/)
  })
})
