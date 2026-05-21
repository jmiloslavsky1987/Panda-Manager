/**
 * Phase 88.1 G2: aggregate per-track stage progress per team.
 *
 * Pure function — operates on already-fetched arrays from getTeamsTabData.
 * Returns Record<team_name, Record<trackKey, {live, total}>>.
 *
 * The result drives TeamCard.tsx Progress Bar render (Plan 03 lines 74-100).
 * Without this, TeamCard's inner `if (!progress)` short-circuits and no bar renders.
 */

type TrackKey = 'adr' | 'biggy' | 'incident_prevention'

const TRACK_KEY_MAP: Record<string, TrackKey> = {
  'ADR': 'adr',
  'Biggy': 'biggy',
  'Incident Prevention': 'incident_prevention',
}

export type TrackProgressByTeam = Record<string, Partial<Record<TrackKey, { live: number; total: number }>>>

export function buildTrackProgressByTeam(
  onboardingRows: Array<{ id: number; team_name: string | null; track: string | null }>,
  trackStagesRows: Array<{ track: string; stage_key: string }>,
  stageStatusRows: Array<{ team_onboarding_id: number; stage_key: string; status: string | null }>
): TrackProgressByTeam {
  // Step 1: count total stages per track
  const totalByTrack: Record<string, number> = {}
  for (const s of trackStagesRows) {
    totalByTrack[s.track] = (totalByTrack[s.track] ?? 0) + 1
  }

  // Step 2: group stage-status rows by team_onboarding_id for O(1) lookup
  const statusByTeamOnboarding: Record<number, Array<{ team_onboarding_id: number; stage_key: string; status: string | null }>> = {}
  for (const s of stageStatusRows) {
    const arr = statusByTeamOnboarding[s.team_onboarding_id] ?? []
    arr.push(s)
    statusByTeamOnboarding[s.team_onboarding_id] = arr
  }

  // Step 3: aggregate per team × track
  const result: TrackProgressByTeam = {}
  for (const row of onboardingRows) {
    if (!row.team_name) continue
    const trackStr = row.track ?? 'ADR'
    const trackKey = TRACK_KEY_MAP[trackStr]
    if (!trackKey) continue
    const live = (statusByTeamOnboarding[row.id] ?? []).filter((s) => s.status === 'live').length
    const total = totalByTrack[trackStr] ?? 0
    result[row.team_name] = result[row.team_name] ?? {}
    result[row.team_name][trackKey] = { live, total }
  }
  return result
}
