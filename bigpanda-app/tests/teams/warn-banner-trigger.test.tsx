// TDD test for WarnBanner logic with defensive checks
// Phase 48 Plan 02 Task 1
// Tests that component code has defensive null checks before WarnBanner render

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('TeamEngagementOverview Defensive Checks', () => {
  let componentSource: string

  it('component source includes defensive check for businessOutcomes', async () => {
    const componentPath = resolve(process.cwd(), 'components/teams/TeamEngagementOverview.tsx')
    componentSource = readFileSync(componentPath, 'utf-8')

    // Verify the defensive pattern: !data.businessOutcomes || data.businessOutcomes.length === 0
    // This ensures the code checks for both undefined/null AND empty array
    expect(componentSource).toContain('!data.businessOutcomes')
    expect(componentSource).toContain('businessOutcomes.length')
  })

  it('component source includes defensive check for e2eWorkflows', async () => {
    const componentPath = resolve(process.cwd(), 'components/teams/TeamEngagementOverview.tsx')
    componentSource = readFileSync(componentPath, 'utf-8')

    expect(componentSource).toContain('!data.e2eWorkflows')
    expect(componentSource).toContain('e2eWorkflows.length')
  })

  it('component source includes defensive check for focusAreas', async () => {
    const componentPath = resolve(process.cwd(), 'components/teams/TeamEngagementOverview.tsx')
    componentSource = readFileSync(componentPath, 'utf-8')

    expect(componentSource).toContain('!data.focusAreas')
    expect(componentSource).toContain('focusAreas.length')
  })

  it('component source includes defensive check for architectureIntegrations', async () => {
    const componentPath = resolve(process.cwd(), 'components/teams/TeamEngagementOverview.tsx')
    componentSource = readFileSync(componentPath, 'utf-8')

    expect(componentSource).toContain('!data.architectureIntegrations')
    expect(componentSource).toContain('architectureIntegrations.length')
  })

  it('component imports WarnBanner for missing data warnings', async () => {
    const componentPath = resolve(process.cwd(), 'components/teams/TeamEngagementOverview.tsx')
    componentSource = readFileSync(componentPath, 'utf-8')

    // Verify WarnBanner is imported and used
    expect(componentSource).toContain("import { WarnBanner } from './WarnBanner'")
    expect(componentSource).toContain('<WarnBanner')
  })

  it('component has all 4 section headings and no Architecture section', async () => {
    const componentPath = resolve(process.cwd(), 'components/teams/TeamEngagementOverview.tsx')
    componentSource = readFileSync(componentPath, 'utf-8')

    // Verify 4 required sections
    expect(componentSource).toContain('Business Value & Expected Outcomes')
    expect(componentSource).toContain('End-to-End Workflows')
    expect(componentSource).toContain('Teams & Engagement Status')
    expect(componentSource).toContain('Top Focus Areas')

    // Verify Architecture section is NOT present (explicitly excluded per CONTEXT.md)
    // Check for headings that would indicate an architecture section
    expect(componentSource).not.toContain('Architecture Integration')
    expect(componentSource).not.toContain('<h2 className="text-lg font-bold text-zinc-900 mb-4">Architecture')
  })
})
