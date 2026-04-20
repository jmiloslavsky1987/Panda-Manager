// bigpanda-app/lib/chat-context-builder.ts
// Assembles project data into a markdown context string for chat AI.
// Adapted from lib/skill-context.ts but focused on chat requirements.
// Pure data assembly — no HTTP, no streaming, no BullMQ imports.

import { getWorkspaceData, getProjectById } from './queries';

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
  const [project, workspace] = await Promise.all([
    getProjectById(projectId),
    getWorkspaceData(projectId),
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
        sections.push(`- [${a.external_id}] ${a.description} | Owner: ${a.owner ?? 'TBD'} | Due: ${a.due ?? 'TBD'} | Status: ${a.status}`);
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
        sections.push(`- [${r.external_id}] ${r.description} | Severity: ${r.severity ?? 'N/A'} | Mitigation: ${r.mitigation ?? 'None'}`);
      });
    } else {
      sections.push('(No open risks)');
    }
  }

  // Milestones
  if (workspace.milestones?.length) {
    sections.push('', '## Milestones');
    workspace.milestones.forEach(m => {
      sections.push(`- [${m.external_id}] ${m.name} | Status: ${m.status ?? 'N/A'} | Target: ${m.target ?? m.date ?? 'TBD'}`);
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
      sections.push(`- [${d.date ?? 'N/A'}] ${d.decision}`);
    });
  }

  return sections.join('\n');
}
