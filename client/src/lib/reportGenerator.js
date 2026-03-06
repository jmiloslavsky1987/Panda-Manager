// client/src/lib/reportGenerator.js
// Pure heuristic report generation — no AI, no API calls.
// Takes customer YAML data, returns pre-populated report content for user editing.

import { WORKSTREAM_CONFIG, deriveOverallStatus } from './deriveCustomer.js';

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

function worstStatus(statuses) {
  const s = statuses.map(x => (x ?? 'green').toLowerCase());
  if (s.includes('red') || s.includes('off_track')) return 'red';
  if (s.includes('yellow') || s.includes('at_risk')) return 'yellow';
  return 'green';
}

function avgPct(values) {
  const nums = values.filter(v => typeof v === 'number');
  if (!nums.length) return 0;
  return Math.round(nums.reduce((sum, n) => sum + n, 0) / nums.length);
}

function statusEmoji(s) {
  const lower = (s ?? '').toLowerCase();
  if (lower === 'on_track' || lower === 'green') return '🟢 On Track';
  if (lower === 'at_risk' || lower === 'yellow') return '🟡 At Risk';
  if (lower === 'off_track' || lower === 'red') return '🔴 Off Track';
  return '⚪ Not Started';
}

function overallStatusLabel(customer) {
  return statusEmoji(deriveOverallStatus(customer));
}

// Maps YAML 11 sub-workstreams → ELT 4 ADR + 2 Biggy groupings.
// Each result: { key, label, group, percent, status, notes, blockers }
function getEltWorkstreams(customer) {
  const adr = customer?.workstreams?.adr ?? {};
  const biggy = customer?.workstreams?.biggy ?? {};

  const eltAdr = [
    {
      key: 'inbound_integrations',
      label: 'Inbound Integrations',
      group: 'adr',
      percent: adr.inbound_integrations?.percent_complete ?? 0,
      status: adr.inbound_integrations?.status ?? 'green',
      notes: adr.inbound_integrations?.progress_notes ?? '',
      blockers: adr.inbound_integrations?.blockers ?? '',
    },
    {
      // Covers normalization + platform_configuration + correlation
      key: 'configuration',
      label: 'Configuration',
      group: 'adr',
      percent: avgPct([
        adr.normalization?.percent_complete ?? 0,
        adr.platform_configuration?.percent_complete ?? 0,
        adr.correlation?.percent_complete ?? 0,
      ]),
      status: worstStatus([
        adr.normalization?.status ?? 'green',
        adr.platform_configuration?.status ?? 'green',
        adr.correlation?.status ?? 'green',
      ]),
      notes: [
        adr.normalization?.progress_notes,
        adr.platform_configuration?.progress_notes,
        adr.correlation?.progress_notes,
      ].filter(Boolean).join(' '),
      blockers: [
        adr.normalization?.blockers,
        adr.platform_configuration?.blockers,
        adr.correlation?.blockers,
      ].filter(Boolean).join(' '),
    },
    {
      key: 'outbound_integrations',
      label: 'Outbound Integrations',
      group: 'adr',
      percent: adr.outbound_integrations?.percent_complete ?? 0,
      status: adr.outbound_integrations?.status ?? 'green',
      notes: adr.outbound_integrations?.progress_notes ?? '',
      blockers: adr.outbound_integrations?.blockers ?? '',
    },
    {
      // Covers training_and_uat
      key: 'workflow_configuration',
      label: 'Workflow Configuration',
      group: 'adr',
      percent: adr.training_and_uat?.percent_complete ?? 0,
      status: adr.training_and_uat?.status ?? 'green',
      notes: adr.training_and_uat?.progress_notes ?? '',
      blockers: adr.training_and_uat?.blockers ?? '',
    },
  ];

  const eltBiggy = [
    {
      // Covers biggy_app_integration + udc + real_time_integrations
      key: 'integrations',
      label: 'Integrations',
      group: 'biggy',
      percent: avgPct([
        biggy.biggy_app_integration?.percent_complete ?? 0,
        biggy.udc?.percent_complete ?? 0,
        biggy.real_time_integrations?.percent_complete ?? 0,
      ]),
      status: worstStatus([
        biggy.biggy_app_integration?.status ?? 'green',
        biggy.udc?.status ?? 'green',
        biggy.real_time_integrations?.status ?? 'green',
      ]),
      notes: [
        biggy.biggy_app_integration?.progress_notes,
        biggy.udc?.progress_notes,
        biggy.real_time_integrations?.progress_notes,
      ].filter(Boolean).join(' '),
      blockers: [
        biggy.biggy_app_integration?.blockers,
        biggy.udc?.blockers,
        biggy.real_time_integrations?.blockers,
      ].filter(Boolean).join(' '),
    },
    {
      // Covers action_plans_configuration + workflows_configuration
      key: 'workflow_configuration',
      label: 'Workflow Configuration',
      group: 'biggy',
      percent: avgPct([
        biggy.action_plans_configuration?.percent_complete ?? 0,
        biggy.workflows_configuration?.percent_complete ?? 0,
      ]),
      status: worstStatus([
        biggy.action_plans_configuration?.status ?? 'green',
        biggy.workflows_configuration?.status ?? 'green',
      ]),
      notes: [
        biggy.action_plans_configuration?.progress_notes,
        biggy.workflows_configuration?.progress_notes,
      ].filter(Boolean).join(' '),
      blockers: [
        biggy.action_plans_configuration?.blockers,
        biggy.workflows_configuration?.blockers,
      ].filter(Boolean).join(' '),
    },
  ];

  return { eltAdr, eltBiggy };
}

// Completed actions since a cutoff date (or last 14 days if no cutoff)
function getRecentCompleted(customer, sinceDate) {
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const cutoff = sinceDate ?? twoWeeksAgo;
  return (customer?.actions ?? []).filter(
    a => a.status === 'completed' && a.completed_date && a.completed_date >= cutoff
  );
}

// Open actions sorted by due date ascending (undated last)
function getOpenActionsSorted(customer) {
  return (customer?.actions ?? [])
    .filter(a => a.status !== 'completed')
    .sort((a, b) => {
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
}

// ─────────────────────────────────────────────────────────────
// WeeklyUpdateForm heuristic prefill
// ─────────────────────────────────────────────────────────────

/**
 * Returns { progress, decisions, outcomes } to pre-fill WeeklyUpdateForm summary fields.
 *   progress  — auto-derived from actions completed since last history entry
 *   decisions — carried forward from last history entry
 *   outcomes  — carried forward from last history entry
 */
export function buildWeeklyFormPrefill(customer) {
  const lastEntry = customer?.history?.[0];
  const lastDate = lastEntry?.week_ending ?? null;

  const recentDone = getRecentCompleted(customer, lastDate);
  let progress = '';
  if (recentDone.length > 0) {
    const list = recentDone.slice(0, 3).map(a => a.description).join('; ');
    progress = `Completed: ${list}.`;
  }

  return {
    progress,
    decisions: lastEntry?.decisions ?? '',
    outcomes: lastEntry?.outcomes ?? '',
  };
}

// ─────────────────────────────────────────────────────────────
// Weekly Customer Status email
// ─────────────────────────────────────────────────────────────

/**
 * Generates the full Weekly Customer Status email as a formatted plain-text string.
 * Caller renders it in an editable textarea.
 */
export function generateWeeklyCustomerStatus(customer) {
  const name = customer?.customer?.name ?? 'Customer';
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${String(today.getFullYear()).slice(2)}`;

  const lastEntry = customer?.history?.[0];
  const lastDate = lastEntry?.week_ending ?? null;
  const ws = customer?.workstreams ?? {};
  const adrWs = ws.adr ?? {};
  const biggyWs = ws.biggy ?? {};

  const recentDone = getRecentCompleted(customer, lastDate);
  const openActions = getOpenActionsSorted(customer);

  // Key Accomplishments: recently completed actions (fallback: last history progress)
  const accomplishments = recentDone.slice(0, 5).map(a => `- ${a.description}`);
  if (accomplishments.length === 0 && lastEntry?.progress) {
    accomplishments.push(`- ${lastEntry.progress}`);
  }
  if (accomplishments.length === 0) accomplishments.push('- [Add key accomplishments]');

  // In Progress: in_progress workstreams + open actions (max 4 total)
  const inProgressItems = [];
  for (const group of Object.values(ws)) {
    for (const [subKey, sub] of Object.entries(group)) {
      if (sub.status === 'in_progress' && inProgressItems.length < 4) {
        const label = subKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        inProgressItems.push(`- ${label} (${sub.percent_complete ?? 0}%)`);
      }
    }
  }
  openActions
    .slice(0, Math.max(0, 4 - inProgressItems.length))
    .forEach(a => inProgressItems.push(`- ${a.description}`));
  if (inProgressItems.length === 0) inProgressItems.push('- [Add in-progress items]');

  // Next Focus: upcoming milestones + near-due open actions (max 4)
  const nextFocusItems = [];
  (customer?.milestones ?? [])
    .filter(m => m.status !== 'completed' && m.status !== 'complete')
    .slice(0, 2)
    .forEach(m =>
      nextFocusItems.push(`- ${m.name}${m.target_date ? ` (target: ${m.target_date})` : ''}`)
    );
  openActions
    .slice(0, Math.max(0, 4 - nextFocusItems.length))
    .forEach(a =>
      nextFocusItems.push(`- ${a.description}${a.due ? ` (due ${a.due})` : ''}`)
    );
  if (nextFocusItems.length === 0) nextFocusItems.push('- [Add next focus items]');

  // Paragraph 1: active workstream focus + go-live proximity
  const activeWsNames = [];
  for (const group of Object.values(ws)) {
    for (const [subKey, sub] of Object.entries(group)) {
      if (sub.status === 'in_progress') {
        activeWsNames.push(subKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      }
    }
  }
  const goLive = customer?.project?.go_live_date;
  const daysUntil = goLive ? Math.ceil((new Date(goLive) - Date.now()) / 86_400_000) : null;
  let para1 = activeWsNames.length > 0
    ? `This week the implementation team continued progress on ${activeWsNames.join(', ')}.`
    : 'This week the implementation team continued project activities.';
  if (daysUntil !== null && daysUntil > 0) {
    para1 += ` The project is on schedule for the ${goLive} go-live target (${daysUntil} days away).`;
  }

  // Paragraph 2 (optional): open high risks reframed as dependency items
  const highRisks = (customer?.risks ?? []).filter(r => r.severity === 'high' && r.status === 'open');
  const para2 = highRisks.length > 0
    ? 'We are actively working through a dependency item that requires coordination. We will provide a resolution update shortly.'
    : '';

  // Biggy section only if any Biggy sub-workstream has activity
  const biggyActive = Object.values(biggyWs).some(
    s => (s.percent_complete ?? 0) > 0 || s.status === 'in_progress'
  );

  const lines = [
    `Subject: ${name} x BigPanda | Status ${dateStr}`,
    '',
    '---',
    '',
    'Hello Team,',
    '',
    'Please see below for the weekly status report:',
    '',
    `**Overall Status:** ${overallStatusLabel(customer)}`,
    '',
    para1,
  ];

  if (para2) lines.push('', para2);

  lines.push(
    '',
    '**Key Accomplishments**',
    '',
    ...accomplishments,
    '',
    '**In Progress**',
    '',
    ...inProgressItems.slice(0, 4),
    '',
    '**Next Focus**',
    '',
    ...nextFocusItems.slice(0, 4),
    '',
    '**Status Breakdown**',
    '',
    '**ADR**',
    `- Inbound Integrations: ${adrWs.inbound_integrations?.percent_complete ?? 0}%`,
    `- Outbound Integrations: ${adrWs.outbound_integrations?.percent_complete ?? 0}%`,
    `- Normalization: ${adrWs.normalization?.percent_complete ?? 0}%`,
    `- Platform Configuration: ${adrWs.platform_configuration?.percent_complete ?? 0}%`,
    `- Correlation: ${adrWs.correlation?.percent_complete ?? 0}%`,
    `- Training & UAT: ${adrWs.training_and_uat?.percent_complete ?? 0}%`,
  );

  if (biggyActive) {
    lines.push(
      '',
      '**Biggy**',
      `- Biggy App Integration: ${biggyWs.biggy_app_integration?.percent_complete ?? 0}%`,
      `- UDC (Unified Data Connector): ${biggyWs.udc?.percent_complete ?? 0}%`,
      `- Real-Time Integrations: ${biggyWs.real_time_integrations?.percent_complete ?? 0}%`,
      `- Action Plans Configuration: ${biggyWs.action_plans_configuration?.percent_complete ?? 0}%`,
      `- Workflows Configuration: ${biggyWs.workflows_configuration?.percent_complete ?? 0}%`,
    );
  }

  lines.push(
    '',
    'Thank you,',
    '',
    '[Sender Name]',
    '[Title]',
    '[Phone]',
    '[Email] | [Website]',
  );

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// External ELT deck
// ─────────────────────────────────────────────────────────────

/**
 * Generates External ELT slide content (customer-facing, 5 slides).
 * Returns Array<{ title: string, sections: Array<{ label: string, content: string }> }>
 */
export function generateExternalELT(customer) {
  const name = customer?.customer?.name ?? 'Customer';
  const today = new Date();
  const monthYear = today.toLocaleString('default', { month: 'long', year: 'numeric' });
  const program = customer?.project?.name ?? 'BigPanda Implementation';
  const goLive = customer?.project?.go_live_date;

  const { eltAdr, eltBiggy } = getEltWorkstreams(customer);
  const lastEntry = customer?.history?.[0];
  const openActions = getOpenActionsSorted(customer);
  const upcomingMilestones = (customer?.milestones ?? []).filter(
    m => m.status !== 'completed' && m.status !== 'complete'
  );

  // Executive summary content
  const recentDone = getRecentCompleted(customer, lastEntry?.week_ending ?? null);
  const highlights = recentDone.slice(0, 4).map(a => `- ${a.description}`);
  if (highlights.length === 0 && lastEntry?.progress) highlights.push(`- ${lastEntry.progress}`);
  if (highlights.length === 0) highlights.push('- [Add highlights]');

  const designProgress = [];
  if (lastEntry?.decisions) designProgress.push(`- ${lastEntry.decisions}`);
  eltAdr.filter(sw => sw.notes).slice(0, 3).forEach(sw =>
    designProgress.push(`- ${sw.label}: ${sw.notes}`)
  );
  if (designProgress.length === 0) designProgress.push('- [Add design & integration progress]');

  // Timeline: chronological completed actions
  const timelineItems = (customer?.actions ?? [])
    .filter(a => a.status === 'completed' && a.completed_date)
    .sort((a, b) => a.completed_date.localeCompare(b.completed_date))
    .slice(0, 6)
    .map(a => {
      const d = new Date(a.completed_date);
      const mon = d.toLocaleString('default', { month: 'short' });
      return `${mon} ${d.getDate()} — ${a.description}`;
    });
  if (timelineItems.length === 0) timelineItems.push('[No completed items yet]');

  // Health snapshot statuses
  const adrOverall = worstStatus(eltAdr.map(sw => sw.status));
  const biggyOverall = worstStatus(eltBiggy.map(sw => sw.status));

  // Per-workstream panel builder: progress bullets + looking ahead
  const buildPanel = (sw) => {
    const progressBullets = sw.notes
      ? sw.notes.split(/\.\s+/).filter(Boolean).map(s => `- ${s.trim().replace(/\.$/, '')}`)
      : ['- Work in progress'];
    const groupSubKeys = (WORKSTREAM_CONFIG[sw.group]?.subWorkstreams ?? []).map(s => s.key);
    const relevantActions = openActions
      .filter(a => a.workstream && groupSubKeys.includes(a.workstream))
      .slice(0, 2)
      .map(a => `- ${a.description}${a.due ? ` (${a.due})` : ''}`);
    const lookingAhead = relevantActions.length > 0
      ? relevantActions
      : ['- Continue current work items'];
    return { progressBullets, lookingAhead };
  };

  const upcomingSessions = openActions
    .slice(0, 5)
    .map(a => `- ${a.description}${a.due ? ` (${a.due})` : ''}`);

  return [
    {
      title: 'Slide 1 — Title',
      sections: [
        { label: 'Title', content: `${name} × BigPanda` },
        { label: 'Subtitle', content: 'Monthly Project Status Review' },
        { label: 'Program', content: `${program}  |  ${monthYear}` },
        { label: 'Footer', content: 'Confidential' },
      ],
    },
    {
      title: 'Slide 2 — Executive Summary',
      sections: [
        {
          label: 'Overall Status',
          content: `Overall Status: ${overallStatusLabel(customer)} — Project is progressing on schedule.${goLive ? ` Go-live target: ${goLive}.` : ''}`,
        },
        { label: 'Month Highlights', content: highlights.join('\n') },
        { label: 'Design & Integration Progress', content: designProgress.join('\n') },
        {
          label: 'Timeline',
          content: [...timelineItems, '---', `Go-Live Target: ${goLive ?? 'TBD'}`].join('\n'),
        },
      ],
    },
    {
      title: 'Slide 3 — Workstream Health Snapshot',
      sections: [
        {
          label: `ADR  ${statusEmoji(adrOverall)}`,
          content: eltAdr
            .map(sw => `${sw.label}: ${sw.percent}%${sw.notes ? ` — ${sw.notes}` : ''}`)
            .join('\n'),
        },
        {
          label: `Biggy  ${statusEmoji(biggyOverall)}`,
          content: eltBiggy
            .map(sw => `${sw.label}: ${sw.percent}%${sw.notes ? ` — ${sw.notes}` : ''}`)
            .join('\n'),
        },
      ],
    },
    {
      title: 'Slide 4 — ADR Detail',
      sections: eltAdr.map(sw => {
        const { progressBullets, lookingAhead } = buildPanel(sw);
        return {
          label: `${sw.label}  (${sw.percent}%)`,
          content: [
            'Progress:',
            ...progressBullets,
            '',
            'Looking Ahead:',
            ...lookingAhead,
            ...(sw.blockers ? ['', `Support Needed: ${sw.blockers}`] : []),
          ].join('\n'),
        };
      }),
    },
    {
      title: 'Slide 5 — Biggy Detail + Next Steps',
      sections: [
        ...eltBiggy.map(sw => {
          const { progressBullets, lookingAhead } = buildPanel(sw);
          return {
            label: `${sw.label}  (${sw.percent}%)`,
            content: [
              'Progress:',
              ...progressBullets,
              '',
              'Looking Ahead:',
              ...lookingAhead,
              ...(sw.blockers ? ['', `Support Needed: ${sw.blockers}`] : []),
            ].join('\n'),
          };
        }),
        {
          label: 'Upcoming Milestones',
          content: upcomingMilestones.length > 0
            ? upcomingMilestones
                .map(m => `${m.name} — ${m.target_date ?? 'TBD'} (${m.status})`)
                .join('\n')
            : '[No upcoming milestones]',
        },
        {
          label: 'Upcoming Sessions',
          content: upcomingSessions.length > 0
            ? upcomingSessions.join('\n')
            : '- [Add upcoming sessions]',
        },
      ],
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// Internal ELT deck
// ─────────────────────────────────────────────────────────────

/**
 * Generates Internal ELT slide content (leadership-facing, 4 slides).
 * Returns Array<{ title: string, sections: Array<{ label: string, content: string }> }>
 */
export function generateInternalELT(customer) {
  const name = customer?.customer?.name ?? 'Customer';
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const year = today.getFullYear();

  const { eltAdr, eltBiggy } = getEltWorkstreams(customer);
  const openActions = getOpenActionsSorted(customer);
  const highRisks = (customer?.risks ?? []).filter(r => r.severity === 'high' && r.status === 'open');

  // Key Focuses: top open actions + highest-priority risk
  const keyFocuses = [];
  openActions.slice(0, 2).forEach(a =>
    keyFocuses.push(`${a.description}${a.due ? ` (${a.due})` : ''}`)
  );
  if (highRisks.length > 0) keyFocuses.push(`Risk: ${highRisks[0].description}`);
  if (keyFocuses.length === 0) keyFocuses.push('[No open focus items]');

  // Workstream detail builder: Where We Are / What's Next / Need Help With
  const buildDetail = (sw) => {
    const whereWeAre = sw.notes || `${sw.percent}% complete.`;
    const relevant = openActions
      .filter(a => a.workstream && a.workstream.toLowerCase() === sw.group)
      .slice(0, 2)
      .map(a => `- ${a.description}`);
    const whatNext = relevant.length > 0 ? relevant.join('\n') : '- Continue current work items';
    const needHelp = sw.blockers || 'N/A';
    return [
      'Where We Are:',
      whereWeAre,
      '',
      "What's Next:",
      whatNext,
      '',
      'Need Help With:',
      needHelp,
    ].join('\n');
  };

  // Overview table rows
  const adrRows = eltAdr
    .map(sw => `${sw.label} | ${sw.percent}% | ${statusEmoji(sw.status)}${sw.notes ? ` — ${sw.notes}` : ''}`)
    .join('\n');
  const biggyRows = eltBiggy
    .map(sw => `${sw.label} | ${sw.percent}% | ${statusEmoji(sw.status)}${sw.notes ? ` — ${sw.notes}` : ''}`)
    .join('\n');

  return [
    {
      title: 'Slide 1 — Title',
      sections: [
        { label: 'Title', content: `${name} × BigPanda` },
        { label: 'Subtitle', content: 'Internal Project Status Sync' },
        { label: 'Date', content: dateStr },
        { label: 'Footer', content: `© ${year} Confidential` },
      ],
    },
    {
      title: 'Slide 2 — Active Workstream Overview',
      sections: [
        { label: 'ADR Workstreams', content: adrRows },
        { label: 'Biggy Workstreams', content: biggyRows },
        {
          label: 'Key Focuses Right Now',
          content: keyFocuses.map((f, i) => `${i + 1}. ${f}`).join('\n'),
        },
      ],
    },
    {
      title: 'Slide 3 — ADR Workstream Detail',
      sections: eltAdr.map(sw => ({
        label: sw.label,
        content: buildDetail(sw),
      })),
    },
    {
      title: 'Slide 4 — Biggy Workstream Detail',
      sections: eltBiggy.map(sw => ({
        label: sw.label,
        content: buildDetail(sw),
      })),
    },
  ];
}
