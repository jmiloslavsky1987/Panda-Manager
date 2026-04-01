// bigpanda-app/lib/completeness-context-builder.ts
// Serializes all project tab data + template definitions for completeness analysis.
// Adapted from lib/chat-context-builder.ts — focuses on completeness assessment, not Q&A.

import { getProjectById } from './queries';
import { TAB_TEMPLATE_REGISTRY } from './tab-template-registry';
import { db } from '../db';
import {
  actions,
  risks,
  milestones,
  stakeholders,
  workstreams,
  keyDecisions,
  engagementHistory,
  tasks,
  businessOutcomes,
  architectureIntegrations,
  teamOnboardingStatus,
} from '../db/schema';
import { eq } from 'drizzle-orm';

const MAX_ACTIONS = 50;

/**
 * Serialize all 11 workspace tabs for completeness analysis.
 * - Records with source='template' are excluded (zero credit).
 * - Each section includes the TAB_TEMPLATE_REGISTRY requiredFields so Claude
 *   knows what "complete" looks like for each tab.
 * - Record IDs included in [external_id] format for gap citation.
 */
export async function buildCompletenessContext(projectId: number): Promise<string> {
  const [project, allData] = await Promise.all([
    getProjectById(projectId),
    db.transaction(async (tx) => {
      const [
        actionsData,
        risksData,
        milestonesData,
        stakeholdersData,
        workstreamsData,
        decisionsData,
        historyData,
        tasksData,
        outcomesData,
        integrationsData,
        onboardingData,
      ] = await Promise.all([
        tx.select().from(actions).where(eq(actions.project_id, projectId)),
        tx.select().from(risks).where(eq(risks.project_id, projectId)),
        tx.select().from(milestones).where(eq(milestones.project_id, projectId)),
        tx.select().from(stakeholders).where(eq(stakeholders.project_id, projectId)),
        tx.select().from(workstreams).where(eq(workstreams.project_id, projectId)),
        tx.select().from(keyDecisions).where(eq(keyDecisions.project_id, projectId)),
        tx.select().from(engagementHistory).where(eq(engagementHistory.project_id, projectId)),
        tx.select().from(tasks).where(eq(tasks.project_id, projectId)),
        tx.select().from(businessOutcomes).where(eq(businessOutcomes.project_id, projectId)),
        tx.select().from(architectureIntegrations).where(eq(architectureIntegrations.project_id, projectId)),
        tx.select().from(teamOnboardingStatus).where(eq(teamOnboardingStatus.project_id, projectId)),
      ]);

      return {
        actions: actionsData,
        risks: risksData,
        milestones: milestonesData,
        stakeholders: stakeholdersData,
        workstreams: workstreamsData,
        keyDecisions: decisionsData,
        engagementHistory: historyData,
        tasks: tasksData,
        businessOutcomes: outcomesData,
        architectureIntegrations: integrationsData,
        onboardingSteps: onboardingData,
      };
    }),
  ]);

  const sections: string[] = [
    `# Project: ${project.name} (ID: ${project.id})`,
    `Customer: ${project.customer ?? 'N/A'}`,
    `Go-Live Target: ${project.go_live_target ?? 'TBD'}`,
    '',
    '# Workspace Tab Data',
    '(Records with source=template excluded — placeholder content does not count toward completeness)',
    '',
  ];

  function sectionDefs(tabId: keyof typeof TAB_TEMPLATE_REGISTRY): string {
    const template = TAB_TEMPLATE_REGISTRY[tabId];
    if (!template) return '';
    const fields = template.sections.map(s => `${s.name}: [${s.requiredFields.join(', ')}]`).join('; ');
    return `Required sections: ${fields}`;
  }

  function isTemplate(record: { source?: string | null }): boolean {
    return record.source === 'template';
  }

  // Overview tab
  sections.push(`## Tab: overview`);
  sections.push(sectionDefs('overview'));
  sections.push(`Project name: ${project.name}`);
  sections.push(`Description: ${project.description ?? 'N/A'}`);
  sections.push(`Status: ${project.overall_status ?? 'N/A'}`);
  sections.push('');

  // Actions tab
  const realActions = (allData.actions ?? []).filter(a => !isTemplate(a));
  sections.push(`## Tab: actions`);
  sections.push(sectionDefs('actions'));
  sections.push(`${realActions.length} real action(s) (${(allData.actions ?? []).length - realActions.length} template placeholders excluded)`);
  const openActions = realActions.filter(a => a.status !== 'completed' && a.status !== 'cancelled').slice(0, MAX_ACTIONS);
  openActions.forEach(a => {
    sections.push(`- [${a.external_id}] ${a.description} | Owner: ${a.owner ?? 'MISSING'} | Due: ${a.due ?? 'MISSING'} | Status: ${a.status}`);
  });
  sections.push('');

  // Risks tab
  const realRisks = (allData.risks ?? []).filter(r => !isTemplate(r));
  sections.push(`## Tab: risks`);
  sections.push(sectionDefs('risks'));
  sections.push(`${realRisks.length} real risk(s)`);
  realRisks.forEach(r => {
    sections.push(`- [${r.external_id}] ${r.description} | Severity: ${r.severity ?? 'MISSING'} | Owner: ${r.owner ?? 'MISSING'} | Mitigation: ${r.mitigation ?? 'MISSING'}`);
  });
  sections.push('');

  // Milestones tab
  const realMilestones = (allData.milestones ?? []).filter(m => !isTemplate(m));
  sections.push(`## Tab: milestones`);
  sections.push(sectionDefs('milestones'));
  sections.push(`${realMilestones.length} real milestone(s)`);
  realMilestones.forEach(m => {
    sections.push(`- [${m.external_id}] ${m.name} | Status: ${m.status ?? 'MISSING'} | Target: ${m.target ?? m.date ?? 'MISSING'}`);
  });
  sections.push('');

  // Stakeholders tab
  const realStakeholders = (allData.stakeholders ?? []).filter(s => !isTemplate(s));
  sections.push(`## Tab: stakeholders`);
  sections.push(sectionDefs('stakeholders'));
  sections.push(`${realStakeholders.length} real stakeholder(s)`);
  realStakeholders.forEach(s => {
    sections.push(`- ${s.name} | Role: ${s.role ?? 'MISSING'} | Email: ${s.email ?? 'MISSING'} | Company: ${s.company ?? 'MISSING'}`);
  });
  sections.push('');

  // Teams tab — workstreams + onboarding status
  const realWorkstreams = (allData.workstreams ?? []).filter(w => !isTemplate(w));
  sections.push(`## Tab: teams`);
  sections.push(sectionDefs('teams'));
  sections.push(`${realWorkstreams.length} real workstream(s)`);
  realWorkstreams.forEach(w => {
    sections.push(`- ${w.name} (${w.track ?? 'N/A'}): ${w.current_status ?? 'MISSING'} — ${w.percent_complete ?? '?'}% complete`);
  });
  // Add onboarding status
  const realOnboarding = (allData.onboardingSteps ?? []).filter(s => !isTemplate(s));
  sections.push(`Onboarding status: ${realOnboarding.length} team(s)`);
  realOnboarding.forEach(s => {
    sections.push(`- ${s.team_name} | Track: ${s.track ?? 'N/A'} | Ingest: ${s.ingest_status ?? 'MISSING'} | Correlation: ${s.correlation_status ?? 'MISSING'}`);
  });
  sections.push('');

  // Architecture tab
  const realArch = (allData.architectureIntegrations ?? []).filter(a => !isTemplate(a));
  sections.push(`## Tab: architecture`);
  sections.push(sectionDefs('architecture'));
  sections.push(`${realArch.length} real architecture integration(s)`);
  realArch.forEach(a => {
    sections.push(`- ${a.tool_name} | Track: ${a.track ?? 'MISSING'} | Phase: ${a.phase ?? 'MISSING'} | Status: ${a.status ?? 'MISSING'}`);
  });
  sections.push('');

  // Decisions tab
  const realDecisions = (allData.keyDecisions ?? []).filter(d => !isTemplate(d));
  sections.push(`## Tab: decisions`);
  sections.push(sectionDefs('decisions'));
  sections.push(`${realDecisions.length} real decision(s)`);
  realDecisions.slice(0, 20).forEach(d => {
    sections.push(`- ${d.decision} | Date: ${d.date ?? 'MISSING'}`);
  });
  sections.push('');

  // Engagement History tab
  const realHistory = (allData.engagementHistory ?? []).filter(h => !isTemplate(h));
  sections.push(`## Tab: history`);
  sections.push(sectionDefs('history'));
  sections.push(`${realHistory.length} real engagement history entries`);
  realHistory.slice(0, 10).forEach(h => {
    sections.push(`- [${h.date ?? 'N/A'}] ${(h.content ?? '').slice(0, 100)}`);
  });
  sections.push('');

  // Plan tab (tasks + business outcomes)
  const realTasks = (allData.tasks ?? []).filter(t => !isTemplate(t));
  sections.push(`## Tab: plan`);
  sections.push(sectionDefs('plan'));
  sections.push(`${realTasks.length} real task(s)`);
  realTasks.slice(0, 30).forEach(t => {
    sections.push(`- ${t.title} | Owner: ${t.owner ?? 'MISSING'} | Status: ${t.status ?? 'MISSING'}`);
  });
  const realOutcomes = (allData.businessOutcomes ?? []).filter(o => !isTemplate(o));
  sections.push(`Business outcomes: ${realOutcomes.length}`);
  realOutcomes.forEach(o => {
    sections.push(`- ${o.title} | Track: ${o.track} | Status: ${o.delivery_status}`);
  });
  sections.push('');

  // Skills tab — no structured data, always assessed by presence of skill runs
  sections.push(`## Tab: skills`);
  sections.push(sectionDefs('skills'));
  sections.push('(Skills tab completeness is assessed by whether skill runs have been executed)');
  sections.push('');

  return sections.join('\n');
}
