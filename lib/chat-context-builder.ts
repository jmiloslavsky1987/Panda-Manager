// bigpanda-app/lib/chat-context-builder.ts
// Assembles project data into a markdown context string for chat AI.
// Adapted from lib/skill-context.ts but focused on chat requirements.
// Pure data assembly — no HTTP, no streaming, no BullMQ imports.

import db from '../db';
import { businessOutcomes, e2eWorkflows, workflowSteps, focusAreas } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getWorkspaceData, getProjectById, getArchTabData, getArchNodes } from './queries';

/**
 * Build the chat context for a project.
 * Returns a markdown string containing: project info, open actions (with record IDs),
 * open risks, milestones, stakeholders, workstreams, key decisions, recent engagement history.
 *
 * All queries are project-scoped via projectId parameter to prevent data leakage.
 * Record IDs are included in [EXTERNAL_ID] format for inline citations in responses.
 *
 * @param projectId - DB project ID
 * @returns Markdown string with all project data
 */
export async function buildChatContext(projectId: number): Promise<string> {
  const [project, workspace, archData, outcomes, workflows, wfSteps, areas, archNodesData] = await Promise.all([
    getProjectById(projectId),
    getWorkspaceData(projectId),
    getArchTabData(projectId),
    db.select().from(businessOutcomes).where(eq(businessOutcomes.project_id, projectId)),
    db.select().from(e2eWorkflows).where(eq(e2eWorkflows.project_id, projectId)),
    db.select().from(workflowSteps)
      .innerJoin(e2eWorkflows, eq(workflowSteps.workflow_id, e2eWorkflows.id))
      .where(eq(e2eWorkflows.project_id, projectId)),
    db.select().from(focusAreas).where(eq(focusAreas.project_id, projectId)),
    getArchNodes(projectId),
  ]);

  // Serialize each section as readable markdown
  const sections: string[] = [
    `# Project Context`,
    `## Project Information`,
    `Name: ${project.name}`,
    `Customer: ${project.customer}`,
    `Overall Status: ${project.overall_status ?? 'N/A'}`,
    `Go-Live Target: ${project.go_live_target ?? 'N/A'}`,
    `Status Summary: ${project.status_summary ?? 'N/A'}`,
  ];

  // Workstreams
  if (workspace.workstreams?.length) {
    sections.push('', '## Workstreams');
    workspace.workstreams.forEach(ws => {
      sections.push(`- ${ws.name} (${ws.track ?? 'N/A'}): ${ws.current_status ?? 'N/A'} — ${ws.percent_complete ?? '?'}% complete`);
    });
  }

  // Open Actions (filter out completed/cancelled)
  if (workspace.actions?.length) {
    const open = workspace.actions.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
    sections.push('', `## Open Actions (${open.length} of ${workspace.actions.length} total)`);
    if (open.length > 0) {
      open.slice(0, 30).forEach(a => {
        sections.push(`- [${a.external_id}] (db_id:${a.id}) ${a.description} | Owner: ${a.owner ?? 'TBD'} | Due: ${a.due ?? 'TBD'} | Status: ${a.status}`);
      });
    } else {
      sections.push('(No open actions)');
    }
  }

  // Open Risks (filter out resolved)
  if (workspace.risks?.length) {
    const open = workspace.risks.filter(r => r.status !== 'resolved');
    sections.push('', `## Open Risks (${open.length})`);
    if (open.length > 0) {
      open.forEach(r => {
        sections.push(`- [${r.external_id}] (db_id:${r.id}) ${r.description} | Severity: ${r.severity ?? 'N/A'} | Mitigation: ${r.mitigation ?? 'None'}`);
      });
    } else {
      sections.push('(No open risks)');
    }
  }

  // Milestones
  if (workspace.milestones?.length) {
    sections.push('', '## Milestones');
    workspace.milestones.forEach(m => {
      sections.push(`- [${m.external_id}] (db_id:${m.id}) ${m.name} | Status: ${m.status ?? 'N/A'} | Target: ${m.target ?? m.date ?? 'TBD'}`);
    });
  }

  // Key Stakeholders
  if (workspace.stakeholders?.length) {
    sections.push('', '## Key Stakeholders');
    workspace.stakeholders.forEach(s => {
      sections.push(`- ${s.name} (${s.role ?? 'N/A'}, ${s.company ?? 'N/A'})`);
    });
  }

  // Recent Engagement History (last 20 entries)
  const historyEntries = workspace.engagementHistory ?? [];
  const recentHistory = historyEntries.slice(-20);
  if (recentHistory.length) {
    sections.push('', `## Recent Engagement History (last ${recentHistory.length} entries)`);
    recentHistory.forEach(h => {
      sections.push(`- [${h.date ?? 'N/A'}] ${h.content.substring(0, 500)}`);
    });
  }

  // Key Decisions
  if (workspace.keyDecisions?.length) {
    sections.push('', '## Key Decisions');
    workspace.keyDecisions.slice(-15).forEach(d => {
      sections.push(`- [${d.date ?? 'N/A'}] (db_id:${d.id}) ${d.decision}`);
    });
  }

  // Team Pathways
  if (archData.teamPathways?.length) {
    sections.push('', '## Team Pathways');
    archData.teamPathways.forEach(p => {
      const steps = Array.isArray(p.route_steps) ? (p.route_steps as { label: string }[]).map(s => s.label).join(' → ') : '';
      sections.push(`- (db_id:${p.id}) ${p.team_name} | Status: ${p.status} | Route: ${steps || 'N/A'} | Notes: ${p.notes ?? 'None'}`);
    });
  }

  // Team Onboarding Status
  if (archData.teamOnboardingStatus?.length) {
    sections.push('', '## Team Onboarding Status');
    archData.teamOnboardingStatus.forEach(t => {
      sections.push(`- (db_id:${t.id}) ${t.team_name} (${t.track ?? 'N/A'}) | Ingest: ${t.ingest_status ?? '—'} | Correlation: ${t.correlation_status ?? '—'} | Incident Intelligence: ${t.incident_intelligence_status ?? '—'} | SN Automation: ${t.sn_automation_status ?? '—'} | Biggy AI: ${t.biggy_ai_status ?? '—'}`);
    });
  }

  // Business Outcomes
  if (outcomes.length) {
    sections.push('', '## Business Outcomes');
    outcomes.forEach(o => {
      sections.push(`- (db_id:${o.id}) ${o.title} | Track: ${o.track ?? 'N/A'} | Status: ${o.delivery_status ?? 'N/A'}`);
    });
  }

  // E2E Workflows
  if (workflows.length) {
    // Group steps by workflow_id
    const stepsMap = new Map<number, typeof wfSteps>();
    wfSteps.forEach(row => {
      const wfId = row.workflow_steps.workflow_id;
      if (!stepsMap.has(wfId)) stepsMap.set(wfId, []);
      stepsMap.get(wfId)!.push(row);
    });
    sections.push('', '## E2E Workflows');
    workflows.forEach(wf => {
      sections.push(`- (db_id:${wf.id}) [${wf.team_name}] ${wf.workflow_name}`);
      const steps = stepsMap.get(wf.id) ?? [];
      steps.sort((a, b) => (a.workflow_steps.position ?? 0) - (b.workflow_steps.position ?? 0));
      steps.forEach(row => {
        const s = row.workflow_steps;
        sections.push(`  - Step (db_id:${s.id}) pos:${s.position} ${s.label} | Track: ${s.track ?? 'N/A'} | Status: ${s.status ?? 'N/A'}`);
      });
    });
  }

  // Focus Areas
  if (areas.length) {
    sections.push('', '## Focus Areas');
    areas.forEach(f => {
      sections.push(`- (db_id:${f.id}) ${f.title} | Tracks: ${f.tracks ?? 'N/A'} | Status: ${f.current_status ?? 'N/A'} | Next: ${f.next_step ?? 'N/A'} | BP Owner: ${f.bp_owner ?? 'N/A'} | Customer Owner: ${f.customer_owner ?? 'N/A'}`);
    });
  }

  // Architecture — grouped by section → sub-column
  const { nodes: archNodesList } = archNodesData
  const sectionNodes = archNodesList.filter(n => n.node_type === 'section').sort((a, b) => a.display_order - b.display_order)
  const subCapsByParent = new Map<number, typeof archNodesList>()
  archNodesList.filter(n => n.node_type === 'sub-capability').forEach(n => {
    if (n.parent_id != null) {
      const arr = subCapsByParent.get(n.parent_id) ?? []
      arr.push(n)
      subCapsByParent.set(n.parent_id, arr)
    }
  })

  if (archData.architectureIntegrations?.length || sectionNodes.length) {
    sections.push('', '## Architecture Pipeline')
    sections.push('<!-- Tool hint: track_name must be "ADR Track" or "AI Assistant Track". To add a sub-capability node, set parent_node_name to the section name (Alert Intelligence / Incident Intelligence / Workflow Automation). -->')
    sectionNodes.forEach(section => {
      sections.push(`\n### ${section.name}`)
      const subCaps = subCapsByParent.get(section.id) ?? []
      subCaps.forEach(subCap => {
        const integrationsForCol = archData.architectureIntegrations?.filter(i => i.phase === subCap.name) ?? []
        sections.push(`#### ${subCap.name} (${subCap.status})`)
        if (integrationsForCol.length) {
          integrationsForCol.forEach(i => {
            sections.push(`- (db_id:${i.id}) ${i.tool_name} | Status: ${i.status} | Method: ${i.integration_method ?? 'N/A'}`)
          })
        } else {
          sections.push('- (no integrations configured)')
        }
      })
    })
    // Flat integrations not under any section (non-ADR track or unmatched)
    const matchedPhases = new Set(sectionNodes.flatMap(s => (subCapsByParent.get(s.id) ?? []).map(n => n.name)))
    const unmatched = archData.architectureIntegrations?.filter(i => i.phase && !matchedPhases.has(i.phase)) ?? []
    if (unmatched.length) {
      sections.push('\n### Other Integrations')
      unmatched.forEach(i => {
        sections.push(`- (db_id:${i.id}) ${i.tool_name} | Track: ${i.track ?? 'N/A'} | Phase: ${i.phase ?? 'N/A'} | Status: ${i.status}`)
      })
    }
  }

  return sections.join('\n');
}
