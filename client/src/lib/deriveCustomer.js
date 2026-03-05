// client/src/lib/deriveCustomer.js
// Pure client-side derivation functions from raw YAML customer data.
// SCHEMA NOTE: workstreams use flat objects (not arrays). history[0] = most recent (prepend-ordered).
// Status values to handle: in_progress, not_started, completed, red, yellow, green, on_track, at_risk, off_track

// Workstream config — CUST-04: exact sub-workstream names
export const WORKSTREAM_CONFIG = {
  adr: {
    label: 'ADR',
    subWorkstreams: [
      { key: 'inbound_integrations', label: 'Inbound Integrations' },
      { key: 'configuration', label: 'Configuration' },
      { key: 'outbound_integrations', label: 'Outbound Integrations' },
      { key: 'workflow_configuration', label: 'Workflow Configuration' },
    ],
  },
  biggy: {
    label: 'Biggy',
    subWorkstreams: [
      { key: 'integrations', label: 'Integrations' },
      { key: 'workflow_configuration', label: 'Workflow Configuration' },
    ],
  },
};

// Internal helper: flatten all sub-workstream data objects into an array
// Handles the flat object structure: workstreams.adr.{key} and workstreams.biggy.{key}
function getAllSubWorkstreams(workstreams) {
  if (!workstreams) return [];
  return Object.values(workstreams).flatMap(ws => Object.values(ws));
}

// Returns history[0] — newest entry (history is prepend-ordered: newest first)
export function getLatestHistory(customer) {
  return customer?.history?.[0] ?? null;
}

// Derive overall status from latest history workstream statuses.
// Handles both vocabulary sets: red/yellow/green AND off_track/at_risk/on_track AND in_progress/not_started
// Priority: any red/off_track → 'off_track'; any yellow/at_risk → 'at_risk'; else 'on_track'
export function deriveOverallStatus(customer) {
  const latest = getLatestHistory(customer);
  if (!latest) return customer?.status ?? 'unknown';
  const subs = getAllSubWorkstreams(latest.workstreams);
  if (subs.some(s => s.status === 'red' || s.status === 'off_track')) return 'off_track';
  if (subs.some(s => s.status === 'yellow' || s.status === 'at_risk' || s.status === 'in_progress')) return 'at_risk';
  return 'on_track';
}

// Average percent_complete across all sub-workstreams in latest history entry
export function derivePercentComplete(customer) {
  const latest = getLatestHistory(customer);
  if (!latest) return customer?.project?.overall_percent_complete ?? 0;
  const subs = getAllSubWorkstreams(latest.workstreams);
  if (!subs.length) return 0;
  const total = subs.reduce((sum, s) => sum + (s.percent_complete ?? 0), 0);
  return Math.round(total / subs.length);
}

// Days until project.go_live_date from today. Returns null if no go_live_date.
// KNOWN LIMITATION: minor off-by-one possible due to UTC vs local timezone.
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

// Sort order for Dashboard: at_risk=0, on_track=1, off_track=2 (DASH-03)
const STATUS_ORDER = { at_risk: 0, on_track: 1, off_track: 2 };

// Sort customers: At Risk first, then On Track, then Off Track
export function sortCustomers(customers) {
  return [...customers].sort((a, b) => {
    const aOrder = STATUS_ORDER[deriveOverallStatus(a)] ?? 3;
    const bOrder = STATUS_ORDER[deriveOverallStatus(b)] ?? 3;
    return aOrder - bOrder;
  });
}

// Return the 3 most overdue open actions (earliest due date first), for CUST-06
export function getMostOverdueActions(customer, limit = 3) {
  const open = (customer?.actions ?? []).filter(a => a.status !== 'completed' && a.due);
  open.sort((a, b) => new Date(a.due) - new Date(b.due));
  return open.slice(0, limit);
}
