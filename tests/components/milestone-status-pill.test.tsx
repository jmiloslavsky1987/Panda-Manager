import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const repoRoot = join(__dirname, '..', '..')
const componentPath = join(repoRoot, 'components/teams/MilestoneTrackerSection.tsx')

describe('Phase 88.1 G3 — Milestone Tracker status pills', () => {
  // Note: dynamic import pattern — keeps test file able to RUN even before StatusPill exists.
  // Tests A, B, C will throw if StatusPill not exported; we use lazy import inside each test.

  it('Test A: StatusPill variant=milestone status=complete renders with emerald color class', async () => {
    const mod = await import('@/components/StatusPill')
    const { StatusPill } = mod
    const { container } = render(<StatusPill variant="milestone" status="complete" />)
    const cls = container.firstElementChild?.className ?? ''
    expect(cls).toMatch(/emerald|green/)
  })

  it('Test B: StatusPill variant=milestone status=at_risk renders with amber color class', async () => {
    const { StatusPill } = await import('@/components/StatusPill')
    const { container } = render(<StatusPill variant="milestone" status="at_risk" />)
    const cls = container.firstElementChild?.className ?? ''
    expect(cls).toMatch(/amber|yellow/)
  })

  it('Test C: StatusPill variant=outcome status=achieved renders with emerald color class', async () => {
    const { StatusPill } = await import('@/components/StatusPill')
    const { container } = render(<StatusPill variant="outcome" status="achieved" />)
    const cls = container.firstElementChild?.className ?? ''
    expect(cls).toMatch(/emerald|green/)
  })

  it('Test D: MilestoneTrackerSection source imports StatusPill from @/components/StatusPill', () => {
    expect(existsSync(componentPath)).toBe(true)
    const src = readFileSync(componentPath, 'utf8')
    expect(src).toMatch(/from ['"]@\/components\/StatusPill['"]/)
  })

  it('Test E: MilestoneTrackerSection source renders <StatusPill in JSX', () => {
    const src = readFileSync(componentPath, 'utf8')
    expect(src).toContain('<StatusPill')
  })

  it('Test F: MilestoneTrackerSection source does NOT contain the prior plain-text status node pattern', () => {
    const src = readFileSync(componentPath, 'utf8')
    // Anti-pattern: <span className="text-xs uppercase flex-shrink-0">{m.status
    expect(src).not.toMatch(/className=["']text-xs uppercase flex-shrink-0["']>\{m\.status/)
  })
})
