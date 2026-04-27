import { getTasksForProject, getWorkspaceData } from './queries';

/**
 * Optional calendar event metadata passed from /daily-prep or the skill runner
 * to enrich the meeting-prep context with event-specific information.
 */
export interface CalendarMetadata {
  eventTitle?: string;
  attendees?: string[];
  durationHours?: string;
  recurrenceFlag?: boolean;
  eventDescription?: string | null;
}

/**
 * Assembles a markdown-formatted context string for the meeting-prep skill.
 * Queries tasks via getTasksForProject and actions via getWorkspaceData.
 * Filters:
 *   - openTasks:              status NOT 'done' AND NOT 'cancelled'
 *   - openActions:            status NOT 'completed' AND NOT 'cancelled'
 *   - recentCompletedTasks:   status === 'done' AND created_at >= 7 days ago
 *   - recentClosedActions:    status === 'completed' AND created_at >= 7 days ago
 * User input is escaped (< > stripped) before interpolation to prevent prompt injection.
 * Optional calendarMeta enriches the context with attendees, duration, recurrence, and event description.
 */
export async function buildMeetingPrepContext(
  projectId: number,
  input?: string,
  calendarMeta?: CalendarMetadata
): Promise<string> {
  const [taskRows, workspaceData] = await Promise.all([
    getTasksForProject(projectId),
    getWorkspaceData(projectId),
  ]);

  const actionRows = workspaceData.actions;

  // 7-day window cutoff
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Open tasks: not done, not cancelled
  const openTasks = taskRows.filter(
    t => t.status !== 'done' && t.status !== 'cancelled'
  );

  // Open actions: not completed, not cancelled
  const openActions = actionRows.filter(
    a => a.status !== 'completed' && a.status !== 'cancelled'
  );

  // Recent completed tasks: done AND created within last 7 days
  const recentCompletedTasks = taskRows.filter(
    t => t.status === 'done' && new Date(t.created_at) >= sevenDaysAgo
  );

  // Recent closed actions: completed AND created within last 7 days
  const recentClosedActions = actionRows.filter(
    a => a.status === 'completed' && new Date(a.created_at) >= sevenDaysAgo
  );

  // Escape user-controlled input to prevent prompt injection
  const safeInput = input?.replace(/[<>]/g, '') ?? '';

  const sections: string[] = [];

  // --- Open Items ---
  sections.push('## Open Items');

  sections.push('### Tasks');
  if (openTasks.length) {
    openTasks.forEach(t => {
      sections.push(`- [${t.status}] ${t.title}`);
    });
  } else {
    sections.push('_None_');
  }

  sections.push('### Actions');
  if (openActions.length) {
    openActions.forEach(a => {
      sections.push(`- [${a.status}] ${a.description}`);
    });
  } else {
    sections.push('_None_');
  }

  // --- Recent Activity ---
  sections.push('## Recent Activity (Last 7 Days)');

  sections.push('### Completed Tasks');
  if (recentCompletedTasks.length) {
    recentCompletedTasks.forEach(t => {
      sections.push(`- ${t.title} (completed)`);
    });
  } else {
    sections.push('_None_');
  }

  sections.push('### Closed Actions');
  if (recentClosedActions.length) {
    recentClosedActions.forEach(a => {
      sections.push(`- ${a.description} (completed)`);
    });
  } else {
    sections.push('_None_');
  }

  // --- Meeting Notes (optional) ---
  if (safeInput) {
    sections.push('## Meeting Notes (optional)');
    sections.push(safeInput);
  }

  // --- Calendar Event Metadata (optional, from daily-prep or skill runner) ---
  if (calendarMeta) {
    sections.push('## Meeting Context');
    if (calendarMeta.durationHours) {
      sections.push(`**Duration:** ${calendarMeta.durationHours} hours${calendarMeta.recurrenceFlag ? ' (Recurring meeting)' : ''}`);
    }
    if (calendarMeta.attendees?.length) {
      sections.push('### Attendees:');
      calendarMeta.attendees.forEach(a => sections.push(`- ${a}`));
    }
    if (calendarMeta.eventDescription) {
      const safeDesc = calendarMeta.eventDescription.replace(/[<>]/g, '');
      sections.push('### Meeting Description');
      sections.push(safeDesc);
    }
  }

  return sections.join('\n');
}
