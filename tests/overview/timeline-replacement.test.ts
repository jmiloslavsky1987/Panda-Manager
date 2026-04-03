// tests/overview/timeline-replacement.test.ts
// Wave 0 RED stub for TMLN-01: old inline timeline section removed from OnboardingDashboard
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('OnboardingDashboard — TMLN-01 old section removed', () => {
  it('does not contain inline milestone timeline section (lines 795-858 replaced)', () => {
    // Read the source file and verify old pattern is gone
    const sourcePath = resolve(__dirname, '../../components/OnboardingDashboard.tsx')
    const source = readFileSync(sourcePath, 'utf-8')

    // Verify old dot-on-spine pattern is removed
    expect(source).not.toContain('absolute top-5 left-0 right-0 h-px bg-zinc-200')
    expect(source).not.toContain('data-testid="milestones-section"')

    // Verify new MilestoneTimeline component is imported
    expect(source).toContain('import { MilestoneTimeline }')
    expect(source).toContain('<MilestoneTimeline projectId={projectId} />')
  })
})
