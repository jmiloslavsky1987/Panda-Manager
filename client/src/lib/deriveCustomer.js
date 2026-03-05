// client/src/lib/deriveCustomer.js
// Pure client-side derivation functions from raw YAML customer data.
// SCHEMA NOTE: history[0] = most recent (prepend-ordered).
// history[0].workstreams is an ARRAY: [{name, status, percent_complete, progress_notes, blockers}]
// status values from files: green/yellow/red (Merck/Kaiser) or via delivery_status (AMEX)
// Normalized status values output: on_track | at_risk | off_track | not_started

// Map color vocabulary (Merck/Kaiser) to standard status strings
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

// Returns normalized workstream array from latest history entry.
// Handles two source schemas:
//   Merck/Kaiser: history[0].workstreams = [{name, status, percent_complete, progress_notes, blockers}]
//   AMEX:         history[0].delivery_status = [{workstream, summary, blockers}] + status_score
// Output shape: [{name, status, percentComplete, notes, blockers}]
export function getLatestWorkstreams(customer) {
  const latest = getLatestHistory(customer);
  if (!latest) return [];

  // Merck/Kaiser format: history[0].workstreams is an array of objects
  if (Array.isArray(latest.workstreams) && latest.workstreams.length > 0) {
    return latest.workstreams.map(ws => ({
      name:           ws.name,
      status:         COLOR_TO_STATUS[ws.status] ?? ws.status ?? 'on_track',
      percentComplete: ws.percent_complete ?? 0,
      notes:          ws.progress_notes ?? '',
      blockers:       ws.blockers ?? '',
    }));
  }

  // AMEX format: history[0].delivery_status with overall status_score
  if (Array.isArray(latest.delivery_status) && latest.delivery_status.length > 0) {
    const overallColor = latest.status_score?.delivery;
    return latest.delivery_status.map(ds => ({
      name:           ds.workstream,
      status:         ds.blockers
                        ? 'at_risk'
                        : (COLOR_TO_STATUS[overallColor] ?? 'on_track'),
      percentComplete: 0,
      notes:          ds.summary ?? '',
      blockers:       ds.blockers ?? '',
    }));
  }

  return [];
}

// Derive overall status from latest workstreams.
// Priority: any off_track → 'off_track'; any at_risk → 'at_risk'; else 'on_track'
// Falls back to customer.status string when no workstream data exists.
export function deriveOverallStatus(customer) {
  const workstreams = getLatestWorkstreams(customer);
  if (workstreams.length === 0) return customer?.status ?? 'not_started';
  if (workstreams.some(ws => ws.status === 'off_track')) return 'off_track';
  if (workstreams.some(ws => ws.status === 'at_risk'))   return 'at_risk';
  return 'on_track';
}

// Average percentComplete across all workstreams in latest history entry
export function derivePercentComplete(customer) {
  const workstreams = getLatestWorkstreams(customer);
  if (!workstreams.length) return customer?.project?.overall_percent_complete ?? 0;
  const total = workstreams.reduce((sum, ws) => sum + (ws.percentComplete ?? 0), 0);
  return Math.round(total / workstreams.length);
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
