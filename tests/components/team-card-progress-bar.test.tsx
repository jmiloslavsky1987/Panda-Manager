import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const repoRoot = join(__dirname, '..', '..')
const queriesPath = join(repoRoot, 'lib/queries.ts')
const mapPath = join(repoRoot, 'components/teams/TeamEngagementMap.tsx')
const sectionPath = join(repoRoot, 'components/teams/TeamsEngagementSection.tsx')
const helperPath = join(repoRoot, 'lib/teams-track-progress.ts')

describe('Phase 88.1 G2 — per-track Progress Bar data wiring', () => {
  it('Test A (RED at start): lib/queries.ts declares trackProgressByTeam in TeamsTabData and populates it in getTeamsTabData', () => {
    const src = readFileSync(queriesPath, 'utf8')
    expect(src).toMatch(/trackProgressByTeam/)
    expect(src).toMatch(/getTeamsTabData[\s\S]{0,4000}trackProgressByTeam/)
  })

  it('Test B (RED at start): TeamEngagementMap source does NOT contain trackProgressByTeam={{}} stub', () => {
    const src = readFileSync(mapPath, 'utf8')
    // Currently line 51 has `trackProgressByTeam={{}}` — this test is RED at first commit.
    expect(src).not.toMatch(/trackProgressByTeam=\{\{\}\}/)
  })

  it('Test C (RED at start): TeamEngagementMap source uses real data.trackProgressByTeam', () => {
    const src = readFileSync(mapPath, 'utf8')
    expect(src).toMatch(/trackProgressByTeam=\{data\.trackProgressByTeam/)
  })

  it('Test D (REGRESSION GUARD — likely GREEN at start): TeamsEngagementSection still looks up trackProgressByTeam[c.team_name]', () => {
    // Documented exception to Nyquist contract: Plan 03 already wired this lookup.
    // Test D guards against regression rather than gating new implementation.
    const src = readFileSync(sectionPath, 'utf8')
    expect(src).toMatch(/trackProgressByTeam\[c\.team_name\]/)
  })

  it('Test F (RED at start): lib/teams-track-progress.ts exports buildTrackProgressByTeam — pure-fn aggregation', async () => {
    if (!existsSync(helperPath)) {
      // Force a clear RED failure if helper doesn't exist yet.
      expect(existsSync(helperPath), 'lib/teams-track-progress.ts must be created in Task 2').toBe(true)
      return
    }
    const { buildTrackProgressByTeam } = await import('@/lib/teams-track-progress')
    const onboardingRows = [
      { id: 1, team_name: 'Alpha', track: 'ADR' },
      { id: 2, team_name: 'Alpha', track: 'Biggy' },
      { id: 3, team_name: 'Beta', track: 'ADR' },
    ]
    const stageRows = [
      { track: 'ADR', stage_key: 'discovery_kickoff' }, { track: 'ADR', stage_key: 'integrations' },
      { track: 'ADR', stage_key: 'platform_configuration' }, { track: 'ADR', stage_key: 'teams' }, { track: 'ADR', stage_key: 'uat' },
      { track: 'Biggy', stage_key: 'discovery_kickoff' }, { track: 'Biggy', stage_key: 'it_knowledge_graph' },
      { track: 'Biggy', stage_key: 'platform_configuration' }, { track: 'Biggy', stage_key: 'teams' }, { track: 'Biggy', stage_key: 'validation' },
    ]
    const statusRows = [
      { team_onboarding_id: 1, stage_key: 'integrations', status: 'live' },
      { team_onboarding_id: 1, stage_key: 'discovery_kickoff', status: 'live' },
    ]
    const result = buildTrackProgressByTeam(onboardingRows as never, stageRows as never, statusRows as never)
    expect(result.Alpha.adr).toEqual({ live: 2, total: 5 })
    expect(result.Alpha.biggy).toEqual({ live: 0, total: 5 })
    expect(result.Beta.adr).toEqual({ live: 0, total: 5 })
    expect(result.Beta.biggy).toBeUndefined()
  })
})
