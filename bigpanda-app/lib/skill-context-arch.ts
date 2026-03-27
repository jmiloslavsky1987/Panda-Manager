import { getArchTabData } from './queries'

/**
 * Assembles a markdown-formatted context string for the workflow-diagram skill.
 * Queries ONLY the 3 Architecture tab tables (architecture_integrations, before_state,
 * team_onboarding_status — via getArchTabData). Does NOT touch Teams tab tables.
 */
export async function buildArchSkillContext(projectId: number): Promise<string> {
  const data = await getArchTabData(projectId)
  const sections: string[] = []

  if (data.beforeState) {
    const bs = data.beforeState
    sections.push('## Before State')
    sections.push(`Aggregation Hub: ${bs.aggregation_hub_name ?? 'Aggregation Hub'}`)
    if (bs.alert_to_ticket_problem) sections.push(`Problem: ${bs.alert_to_ticket_problem}`)
    const painPoints = Array.isArray(bs.pain_points_json) ? bs.pain_points_json as string[] : []
    if (painPoints.length) {
      sections.push('Pain Points:')
      painPoints.forEach(p => sections.push(`  - ${p}`))
    }
  } else {
    sections.push('## Before State\n_No before-state data recorded._')
  }

  if (data.architectureIntegrations.length) {
    sections.push('## Architecture Integrations')
    const adr = data.architectureIntegrations.filter(i => i.track === 'ADR')
    const biggy = data.architectureIntegrations.filter(i => i.track === 'Biggy')
    sections.push('### ADR Track')
    adr.forEach(i => sections.push(`  - [${i.phase ?? 'N/A'}] ${i.tool_name} | Method: ${i.integration_method ?? 'N/A'} | Status: ${i.status}`))
    sections.push('### Biggy AI Track')
    biggy.forEach(i => sections.push(`  - [${i.phase ?? 'N/A'}] ${i.tool_name} | Method: ${i.integration_method ?? 'N/A'} | Status: ${i.status}`))
  } else {
    sections.push('## Architecture Integrations\n_No integration nodes recorded._')
  }

  if (data.teamOnboardingStatus.length) {
    sections.push('## Team Onboarding Status')
    data.teamOnboardingStatus.forEach(t => {
      sections.push(`- ${t.team_name} [${t.track ?? 'N/A'}]: Ingest: ${t.ingest_status ?? '—'} | Correlation: ${t.correlation_status ?? '—'} | Incident Intel: ${t.incident_intelligence_status ?? '—'} | SN Auto: ${t.sn_automation_status ?? '—'} | Biggy AI: ${t.biggy_ai_status ?? '—'}`)
    })
  } else {
    sections.push('## Team Onboarding Status\n_No team onboarding data recorded._')
  }

  return sections.join('\n')
}
