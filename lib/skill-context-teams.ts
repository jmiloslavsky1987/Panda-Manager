import { getTeamsTabData } from './queries'

/**
 * Assembles a markdown-formatted context string for the team-engagement-map skill.
 * Queries ONLY the 5 Teams tab tables (business_outcomes, e2e_workflows, workflow_steps,
 * focus_areas — via getTeamsTabData). Does NOT touch architecture or before_state tables.
 */
export async function buildTeamsSkillContext(projectId: number): Promise<string> {
  const data = await getTeamsTabData(projectId)
  const sections: string[] = []

  if (data.businessOutcomes.length) {
    sections.push('## Business Outcomes')
    data.businessOutcomes.forEach(o => {
      sections.push(`- [${o.track}] ${o.title} | Status: ${o.delivery_status} | ${o.mapping_note ?? ''}`)
    })
  } else {
    sections.push('## Business Outcomes\n_No data recorded._')
  }

  if (data.architectureIntegrations.length) {
    sections.push('## Architecture Overview')
    const adr = data.architectureIntegrations.filter(i => i.track === 'ADR')
    const biggy = data.architectureIntegrations.filter(i => i.track === 'Biggy')
    sections.push('### ADR Track')
    adr.forEach(i => sections.push(`  - [${i.phase ?? 'N/A'}] ${i.tool_name} | Status: ${i.status}`))
    sections.push('### Biggy AI Track')
    biggy.forEach(i => sections.push(`  - [${i.phase ?? 'N/A'}] ${i.tool_name} | Status: ${i.status}`))
  } else {
    sections.push('## Architecture Overview\n_No integration data recorded._')
  }

  if (data.e2eWorkflows.length) {
    sections.push('## E2E Workflows')
    data.e2eWorkflows.forEach(wf => {
      sections.push(`### Team: ${wf.team_name} — ${wf.workflow_name}`)
      wf.steps.forEach(s => {
        sections.push(`  - Step ${s.position}: ${s.label} [track: ${s.track ?? 'N/A'}, status: ${s.status ?? 'N/A'}]`)
      })
    })
  } else {
    sections.push('## E2E Workflows\n_No data recorded._')
  }

  if (data.focusAreas.length) {
    sections.push('## Focus Areas')
    data.focusAreas.forEach(f => {
      sections.push(`- ${f.title} [tracks: ${f.tracks ?? 'N/A'}]`)
      if (f.why_it_matters) sections.push(`  Why: ${f.why_it_matters}`)
      if (f.current_status) sections.push(`  Status: ${f.current_status} → Next: ${f.next_step ?? 'TBD'}`)
      if (f.bp_owner) sections.push(`  Owners: BP: ${f.bp_owner} | Customer: ${f.customer_owner ?? 'TBD'}`)
    })
  } else {
    sections.push('## Focus Areas\n_No data recorded._')
  }

  return sections.join('\n')
}
