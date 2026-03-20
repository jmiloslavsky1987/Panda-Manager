// bigpanda-app/lib/skill-context.ts
// Assembles project workspace data into a Claude userMessage string.
// Called by SkillOrchestrator before every Claude invocation.
// Pure data assembly — no HTTP, no streaming, no BullMQ imports.

import { getWorkspaceData, getProjectById } from './queries';
import type { EngagementHistoryRow } from './queries';

export interface SkillContext {
  userMessage: string;
  /** Returns a new SkillContext with oldest history entries truncated. */
  withTruncatedHistory(keepLast?: number): SkillContext;
}

/**
 * Build the userMessage for a skill invocation.
 * Loads all workspace data: project info, actions, risks, milestones,
 * stakeholders, workstreams, engagement history (last 20 entries), key decisions.
 *
 * @param projectId  - DB project ID
 * @param skillName  - Skill name (used as context header)
 * @param extraInput - Optional user-provided freeform input (transcript, notes, etc.)
 */
export async function buildSkillContext(
  projectId: number,
  skillName: string,
  extraInput?: Record<string, string>
): Promise<SkillContext> {
  const [project, workspace] = await Promise.all([
    getProjectById(projectId),
    getWorkspaceData(projectId),
  ]);

  // Serialize each section as readable markdown
  const sections: string[] = [
    `# Project Context for Skill: ${skillName}`,
    `## Project`,
    `Name: ${project.name}`,
    `Customer: ${project.customer}`,
    `Status: ${project.overall_status ?? 'N/A'}`,
    `Go-Live Target: ${project.go_live_target ?? 'N/A'}`,
    `Summary: ${project.status_summary ?? 'N/A'}`,
  ];

  if (workspace.workstreams?.length) {
    sections.push('## Workstreams');
    workspace.workstreams.forEach(ws => {
      sections.push(`- ${ws.name} (${ws.track ?? 'N/A'}): ${ws.current_status ?? 'N/A'} — ${ws.percent_complete ?? '?'}% complete`);
    });
  }

  if (workspace.actions?.length) {
    const open = workspace.actions.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
    sections.push(`## Open Actions (${open.length} of ${workspace.actions.length} total)`);
    open.slice(0, 30).forEach(a => {
      sections.push(`- [${a.external_id}] ${a.description} | Owner: ${a.owner ?? 'TBD'} | Due: ${a.due ?? 'TBD'} | Status: ${a.status}`);
    });
  }

  if (workspace.risks?.length) {
    const open = workspace.risks.filter(r => r.status !== 'closed');
    sections.push(`## Open Risks (${open.length})`);
    open.forEach(r => {
      sections.push(`- [${r.external_id}] ${r.description} | Severity: ${r.severity ?? 'N/A'} | Mitigation: ${r.mitigation ?? 'None'}`);
    });
  }

  if (workspace.milestones?.length) {
    sections.push('## Milestones');
    workspace.milestones.forEach(m => {
      sections.push(`- [${m.external_id}] ${m.name} | Status: ${m.status ?? 'N/A'} | Target: ${m.target ?? m.date ?? 'TBD'}`);
    });
  }

  if (workspace.stakeholders?.length) {
    sections.push('## Key Stakeholders');
    workspace.stakeholders.forEach(s => {
      sections.push(`- ${s.name} (${s.role ?? 'N/A'}, ${s.company ?? 'N/A'})`);
    });
  }

  // Engagement history — most recent 20 entries (truncatable for token budget)
  const historyEntries: EngagementHistoryRow[] = workspace.engagementHistory ?? [];
  const recentHistory = historyEntries.slice(-20);

  if (recentHistory.length) {
    sections.push(`## Recent Engagement History (last ${recentHistory.length} entries)`);
    recentHistory.forEach(h => {
      sections.push(`- [${h.date ?? 'N/A'}] ${h.content.substring(0, 500)}`);
    });
  }

  if (workspace.keyDecisions?.length) {
    sections.push('## Key Decisions');
    workspace.keyDecisions.slice(-15).forEach(d => {
      sections.push(`- [${d.date ?? 'N/A'}] ${d.decision}`);
    });
  }

  // Extra user-provided input (transcript, notes, etc.)
  if (extraInput) {
    Object.entries(extraInput).forEach(([key, value]) => {
      sections.push(`## User-Provided ${key}`);
      sections.push(value);
    });
  }

  const userMessage = sections.join('\n');

  /**
   * Builds a SkillContext object from a message and its history source.
   * Extracted to avoid closure capture issues in withTruncatedHistory.
   */
  function makeContext(msg: string): SkillContext {
    return {
      userMessage: msg,
      withTruncatedHistory(keepLast = 5): SkillContext {
        // Rebuild the message with truncated history
        const truncatedHistory = historyEntries.slice(-keepLast);

        // Rebuild sections without history block, then re-add truncated version
        const nonHistorySections = sections.filter(s => {
          // Remove the history header and individual history lines
          if (s.startsWith('## Recent Engagement History')) return false;
          if (recentHistory.some(h => s === `- [${h.date ?? 'N/A'}] ${h.content.substring(0, 500)}`)) return false;
          return true;
        });

        if (truncatedHistory.length) {
          nonHistorySections.push(`## Recent Engagement History (last ${truncatedHistory.length} entries — truncated for token budget)`);
          truncatedHistory.forEach(h => {
            nonHistorySections.push(`- [${h.date ?? 'N/A'}] ${h.content.substring(0, 500)}`);
          });
        }

        return makeContext(nonHistorySections.join('\n'));
      },
    };
  }

  return makeContext(userMessage);
}
