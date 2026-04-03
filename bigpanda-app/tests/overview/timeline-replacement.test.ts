// tests/overview/timeline-replacement.test.ts
// TMLN-01 scope reduced: original dot-on-spine timeline retained per user preference.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('OnboardingDashboard — milestone timeline', () => {
  it('retains the original dot-on-spine milestone section', () => {
    const sourcePath = resolve(__dirname, '../../components/OnboardingDashboard.tsx')
    const source = readFileSync(sourcePath, 'utf-8')

    expect(source).toContain('data-testid="milestones-section"')
    expect(source).toContain('absolute top-5 left-0 right-0 h-px bg-zinc-200')
  })
})
