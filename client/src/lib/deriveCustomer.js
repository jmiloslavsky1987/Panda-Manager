// client/src/lib/deriveCustomer.js
// Pure client-side derivation functions from raw YAML customer data.
// SCHEMA: workstreams is a nested object at customer.workstreams.{adr|biggy}.{subKey}
// status values in YAML: not_started | in_progress | complete | at_risk | off_track | green | yellow | red
// Normalized output status: on_track | at_risk | off_track | not_started | complete

// Fixed workstream structure — identical across all customers
export const WORKSTREAM_CONFIG = {
  adr: {
    label: 'ADR',
    subWorkstreams: [
      { key: 'inbound_integrations',   label: 'Inbound Integrations',   hasScope: true  },
      { key: 'outbound_integrations',  label: 'Outbound Integrations',  hasScope: true  },
      { key: 'normalization',          label: 'Normalization',           hasScope: false },
      { key: 'platform_configuration', label: 'Platform Configuration', hasScope: false },
      { key: 'correlation',            label: 'Correlation',             hasScope: false },
      { key: 'training_and_uat',       label: 'Training & UAT',         hasScope: false },
    ],
  },
  biggy: {
    label: 'Biggy',
    subWorkstreams: [
      { key: 'biggy_app_integration',      label: 'Biggy App Integration',       hasScope: false },
      { key: 'udc',                        label: 'UDC (Unified Data Connector)', hasScope: true  },
      { key: 'real_time_integrations',     label: 'Real-Time Integrations',      hasScope: true  },
      { key: 'action_plans_configuration', label: 'Action Plans Configuration',  hasScope: false },
      { key: 'workflows_configuration',    label: 'Workflows Configuration',     hasScope: false },
    ],
  },
};

// Map YAML color vocabulary → normalized status
const COLOR_TO_STATUS = {
  green:  'on_track',
  yellow: 'at_risk',
  orange: 'at_risk',
  red:    'off_track',
};

// Returns history[0] — newest entry (history is prepend-ordered: newest first)
export function getLatestHistory(customer) {
  return customer?.history?.[0] ?? null;
}

// Returns a flat array of normalized sub-workstream objects from customer.workstreams.
// Reads from top-level `workstreams` field (nested object format).
// Output shape: [{group, groupLabel, key, name, status, percentComplete, notes, blockers, scope}]
export function getLatestWorkstreams(customer) {
  const ws = customer?.workstreams;
  if (!ws || typeof ws !== 'object' || Array.isArray(ws)) return [];

  const result = [];
  for (const [groupKey, group] of Object.entries(WORKSTREAM_CONFIG)) {
    const groupData = ws[groupKey] ?? {};
    for (const { key, label, hasScope } of group.subWorkstreams) {
      const sub = groupData[key] ?? {};
      result.push({
        group:           groupKey,
        groupLabel:      group.label,
        key,
        name:            label,
        status:          COLOR_TO_STATUS[sub.status] ?? sub.status ?? 'not_started',
        percentComplete: sub.percent_complete ?? 0,
        notes:           sub.progress_notes ?? '',
        blockers:        sub.blockers ?? '',
        scope:           hasScope ? (sub.scope ?? []) : null,
      });
    }
  }
  return result;
}

// Derive overall status from all sub-workstreams.
// Priority: any off_track → 'off_track'; any at_risk → 'at_risk';
//           all not_started → 'not_started'; else 'on_track'
export function deriveOverallStatus(customer) {
  const workstreams = getLatestWorkstreams(customer);
  if (workstreams.length === 0) return customer?.status ?? 'not_started';
  if (workstreams.some(ws => ws.status === 'off_track'))           return 'off_track';
  if (workstreams.some(ws => ws.status === 'at_risk'))             return 'at_risk';
  if (workstreams.every(ws => ws.status === 'not_started'))        return 'not_started';
  return 'on_track';
}

// Average percentComplete across all sub-workstreams
export function derivePercentComplete(customer) {
  const workstreams = getLatestWorkstreams(customer);
  if (!workstreams.length) return customer?.project?.overall_percent_complete ?? 0;
  const total = workstreams.reduce((sum, ws) => sum + (ws.percentComplete ?? 0), 0);
  return Math.round(total / workstreams.length);
}

// Days until project.go_live_date from today. Returns null if no go_live_date.
export function deriveDaysToGoLive(customer) {
  const goLive = customer?.project?.go_live_date;
  if (!goLive) return null;
  const diff = new Date(goLive) - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Count actions where status !== 'completed'
export function countOpenActions(customer) {
  return (customer?.actions ?? []).filter(a => a.status !== 'completed').length;
}

// Count risks where severity === 'high' AND status === 'open'
export function countHighRisks(customer) {
  return (customer?.risks ?? []).filter(r => r.severity === 'high' && r.status === 'open').length;
}

// Sort order for Dashboard: at_risk=0, on_track=1, not_started=2, off_track=3 (DASH-03)
const STATUS_ORDER = { at_risk: 0, on_track: 1, not_started: 2, off_track: 3 };

// Sort customers: At Risk first, then On Track, then Not Started, then Off Track
export function sortCustomers(customers) {
  return [...customers].sort((a, b) => {
    const aOrder = STATUS_ORDER[deriveOverallStatus(a)] ?? 4;
    const bOrder = STATUS_ORDER[deriveOverallStatus(b)] ?? 4;
    return aOrder - bOrder;
  });
}

// Return the N most overdue open actions (earliest due date first)
export function getMostOverdueActions(customer, limit = 3) {
  const open = (customer?.actions ?? []).filter(a => a.status !== 'completed' && a.due);
  open.sort((a, b) => new Date(a.due) - new Date(b.due));
  return open.slice(0, limit);
}
