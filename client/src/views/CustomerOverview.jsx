// client/src/views/CustomerOverview.jsx — CUST-01 through CUST-10
// NOTE: CUST-01 (Sidebar) is implemented in Plan 02-05 (AppLayout). This view provides the main content area.
import React from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchRisk, patchMilestone } from '../api';
import {
  WORKSTREAM_CONFIG,
  getLatestHistory,
  getLatestWorkstreams,
  deriveOverallStatus,
  deriveDaysToGoLive,
  countOpenActions,
  getMostOverdueActions,
} from '../lib/deriveCustomer';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';

// Status dot lookup — complete literal class strings (Tailwind v4 purge safety)
const STATUS_DOT_CLASSES = {
  in_progress:  'bg-blue-500',
  not_started:  'bg-gray-300',
  completed:    'bg-green-500',
  complete:     'bg-green-500',
  green:        'bg-green-500',
  yellow:       'bg-yellow-400',
  red:          'bg-red-500',
  at_risk:      'bg-yellow-400',
  off_track:    'bg-red-500',
  on_track:     'bg-green-500',
  delayed:      'bg-orange-400',
};

function StatusDot({ status }) {
  const cls = STATUS_DOT_CLASSES[status] ?? 'bg-gray-300';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${cls}`} />;
}

// Inline edit field — shows value as text; click to edit; saves on blur/enter
function InlineEditField({ value, onSave, isPending, className = '' }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value ?? '');

  const handleBlur = () => {
    if (draft !== (value ?? '')) onSave(draft);
    setEditing(false);
  };

  if (isPending) {
    return <span className="text-gray-400 italic text-sm">Saving...</span>;
  }
  if (editing) {
    return (
      <input
        autoFocus
        className="border border-teal-300 rounded px-1 py-0.5 text-sm w-full"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (e.key === 'Enter') handleBlur();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }
  return (
    <span
      className={`cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 text-sm ${className}`}
      title="Click to edit"
      onClick={() => { setDraft(value ?? ''); setEditing(true); }}
    >
      {value || <span className="text-gray-400">—</span>}
    </span>
  );
}

// Inline select for status fields
function InlineSelectField({ value, options, onSave, isPending }) {
  if (isPending) {
    return <span className="text-gray-400 italic text-sm">Saving...</span>;
  }
  return (
    <select
      className="text-sm border border-gray-200 rounded px-1 py-0.5 bg-white"
      value={value}
      onChange={e => onSave(e.target.value)}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// One row per sub-workstream inside a group card
function SubWorkstreamRow({ ws }) {
  const { name, status, percentComplete, notes, blockers, scope } = ws;
  const truncNote     = notes?.length    > 70 ? notes.slice(0, 70) + '…'    : notes;
  const truncBlockers = blockers?.length > 70 ? blockers.slice(0, 70) + '…' : blockers;
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
      <StatusDot status={status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-gray-700 truncate">{name}</span>
          <span className="text-xs text-gray-500 shrink-0">{percentComplete}%</span>
        </div>
        <ProgressBar percent={percentComplete} />
        {scope !== null && scope.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {scope.map(t => (
              <span key={t} className="text-xs bg-teal-50 text-teal-700 rounded px-1.5 py-0.5">{t}</span>
            ))}
          </div>
        )}
        {scope !== null && scope.length === 0 && (
          <p className="text-xs text-gray-300 mt-1 italic">No tools in scope — set via Project Setup</p>
        )}
        {truncNote && !scope && (
          <p className="text-xs text-gray-400 mt-1 truncate" title={notes}>{truncNote}</p>
        )}
        {blockers && (
          <p className="text-xs text-red-500 mt-1 truncate" title={blockers}>⚠ {truncBlockers}</p>
        )}
      </div>
    </div>
  );
}

// One card per top-level group (ADR / Biggy)
function WorkstreamGroupCard({ groupKey, config, workstreams }) {
  const groupWs = workstreams.filter(ws => ws.group === groupKey);
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex-1 min-w-[280px]">
      <h4 className="text-sm font-bold text-gray-800 mb-1">{config.label}</h4>
      <div>
        {groupWs.map(ws => <SubWorkstreamRow key={ws.key} ws={ws} />)}
      </div>
    </div>
  );
}

// Risks section — CUST-07, CUST-09
const RISK_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'closed', label: 'Closed' },
];

const RISK_SEVERITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function RisksSection({ customer, customerId, mutation }) {
  const risks = [...(customer.risks ?? [])].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  if (risks.length === 0) {
    return <p className="text-sm text-gray-400">No risks recorded. Add via YAML Editor.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-2 text-xs font-medium text-gray-500 w-8">ID</th>
            <th className="pb-2 text-xs font-medium text-gray-500">Description</th>
            <th className="pb-2 text-xs font-medium text-gray-500 w-24">Severity</th>
            <th className="pb-2 text-xs font-medium text-gray-500 w-24">Status</th>
            <th className="pb-2 text-xs font-medium text-gray-500">Mitigation</th>
          </tr>
        </thead>
        <tbody>
          {risks.map(risk => (
            <tr key={risk.id} className="border-b border-gray-100">
              <td className="py-2 pr-2 font-mono text-xs text-gray-400">{risk.id}</td>
              <td className="py-2 pr-2">
                <InlineEditField
                  value={risk.description}
                  isPending={mutation.isPending && mutation.variables?.riskId === risk.id}
                  onSave={val => mutation.mutate({ riskId: risk.id, patch: { description: val } })}
                />
              </td>
              <td className="py-2 pr-2">
                <InlineSelectField
                  value={risk.severity}
                  options={RISK_SEVERITY_OPTIONS}
                  isPending={mutation.isPending && mutation.variables?.riskId === risk.id}
                  onSave={val => mutation.mutate({ riskId: risk.id, patch: { severity: val } })}
                />
              </td>
              <td className="py-2 pr-2">
                <InlineSelectField
                  value={risk.status}
                  options={RISK_STATUS_OPTIONS}
                  isPending={mutation.isPending && mutation.variables?.riskId === risk.id}
                  onSave={val => mutation.mutate({ riskId: risk.id, patch: { status: val } })}
                />
              </td>
              <td className="py-2">
                <InlineEditField
                  value={risk.mitigation}
                  isPending={mutation.isPending && mutation.variables?.riskId === risk.id}
                  onSave={val => mutation.mutate({ riskId: risk.id, patch: { mitigation: val } })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Milestones section — CUST-08, CUST-09
const MILESTONE_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'delayed', label: 'Delayed' },
];

function MilestonesSection({ customer, mutation }) {
  const milestones = [...(customer.milestones ?? [])].sort(
    (a, b) => new Date(a.target_date) - new Date(b.target_date)
  );

  if (milestones.length === 0) {
    return <p className="text-sm text-gray-400">No milestones recorded. Add via YAML Editor.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-2 text-xs font-medium text-gray-500 w-8">ID</th>
            <th className="pb-2 text-xs font-medium text-gray-500">Name</th>
            <th className="pb-2 text-xs font-medium text-gray-500 w-28">Target Date</th>
            <th className="pb-2 text-xs font-medium text-gray-500 w-28">Status</th>
            <th className="pb-2 text-xs font-medium text-gray-500">Notes</th>
          </tr>
        </thead>
        <tbody>
          {milestones.map(ms => (
            <tr key={ms.id} className="border-b border-gray-100">
              <td className="py-2 pr-2 font-mono text-xs text-gray-400">{ms.id}</td>
              <td className="py-2 pr-2">
                <InlineEditField
                  value={ms.name}
                  isPending={mutation.isPending && mutation.variables?.milestoneId === ms.id}
                  onSave={val => mutation.mutate({ milestoneId: ms.id, patch: { name: val } })}
                />
              </td>
              <td className="py-2 pr-2">
                <InlineEditField
                  value={ms.target_date}
                  isPending={mutation.isPending && mutation.variables?.milestoneId === ms.id}
                  onSave={val => mutation.mutate({ milestoneId: ms.id, patch: { target_date: val } })}
                />
              </td>
              <td className="py-2 pr-2">
                <InlineSelectField
                  value={ms.status}
                  options={MILESTONE_STATUS_OPTIONS}
                  isPending={mutation.isPending && mutation.variables?.milestoneId === ms.id}
                  onSave={val => mutation.mutate({ milestoneId: ms.id, patch: { status: val } })}
                />
              </td>
              <td className="py-2">
                <InlineEditField
                  value={ms.notes}
                  isPending={mutation.isPending && mutation.variables?.milestoneId === ms.id}
                  onSave={val => mutation.mutate({ milestoneId: ms.id, patch: { notes: val } })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Main CustomerOverview component
export default function CustomerOverview() {
  const { customer } = useOutletContext();
  const { customerId } = useParams();
  const queryClient = useQueryClient();
  const queryKey = ['customer', customerId];

  // Optimistic mutation for risk edits (CUST-07, CUST-09)
  const riskMutation = useMutation({
    mutationFn: ({ riskId, patch }) => patchRisk(customerId, riskId, patch),
    onMutate: async ({ riskId, patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old) => ({
        ...old,
        risks: (old?.risks ?? []).map(r => r.id === riskId ? { ...r, ...patch } : r),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Optimistic mutation for milestone edits (CUST-08, CUST-09)
  const milestoneMutation = useMutation({
    mutationFn: ({ milestoneId, patch }) => patchMilestone(customerId, milestoneId, patch),
    onMutate: async ({ milestoneId, patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old) => ({
        ...old,
        milestones: (old?.milestones ?? []).map(m => m.id === milestoneId ? { ...m, ...patch } : m),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const latest = getLatestHistory(customer);
  const workstreams = getLatestWorkstreams(customer);
  const overallStatus = deriveOverallStatus(customer);
  const days = deriveDaysToGoLive(customer);
  const openActionCount = countOpenActions(customer);
  const overdueActions = getMostOverdueActions(customer, 3);
  // Use history[0].week_ending as last-updated proxy (no metadata.updated_on in schema)
  const lastUpdated = latest?.week_ending ?? '—';

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header — CUST-02 */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">
                {customer.customer?.name ?? customerId}
              </h2>
              <StatusBadge status={overallStatus} />
            </div>
            <p className="text-sm text-gray-500">{customer.project?.name}</p>
          </div>
          <div className="flex gap-6 text-sm text-gray-600 flex-wrap">
            <div>
              <span className="text-xs text-gray-400 block">Go-Live</span>
              <span className="font-medium">{customer.project?.go_live_date ?? '—'}</span>
              {days !== null && (
                <span className="text-xs text-gray-400 ml-1">
                  ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`})
                </span>
              )}
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Last Updated</span>
              <span className="font-medium">{lastUpdated}</span>
            </div>
            <Link
              to={`/customer/${customerId}/reports`}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors self-end"
            >
              Generate Report
            </Link>
          </div>
        </div>
      </div>

      {/* Workstream Health — CUST-03, CUST-04, CUST-05 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800">Workstream Health</h3>
          <Link
            to={`/customer/${customerId}/setup`}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Project Setup →
          </Link>
        </div>
        <div className="flex gap-4 flex-wrap">
          {Object.entries(WORKSTREAM_CONFIG).map(([groupKey, config]) => (
            <WorkstreamGroupCard
              key={groupKey}
              groupKey={groupKey}
              config={config}
              workstreams={workstreams}
            />
          ))}
        </div>
      </section>

      {/* Open Actions Summary — CUST-06 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800">
            Open Actions
            <span className="ml-2 text-sm font-normal text-gray-500">({openActionCount} open)</span>
          </h3>
          <Link
            to={`/customer/${customerId}/actions`}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Manage Actions →
          </Link>
        </div>
        {overdueActions.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {overdueActions.map(action => (
              <div key={action.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                <span className="font-mono text-xs text-gray-400 shrink-0">{action.id}</span>
                <span className="text-sm text-gray-800 flex-1 truncate">{action.description}</span>
                <span className="text-xs text-gray-500 shrink-0">{action.owner}</span>
                <span className={`text-xs shrink-0 ${new Date(action.due) < new Date() ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                  {action.due}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No open actions.</p>
        )}
      </section>

      {/* Risks — CUST-07, CUST-09, CUST-10 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800">Risks</h3>
          <span className="text-xs text-gray-400">Add new risks via YAML Editor</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <RisksSection customer={customer} customerId={customerId} mutation={riskMutation} />
        </div>
      </section>

      {/* Milestones — CUST-08, CUST-09, CUST-10 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800">Milestones</h3>
          <span className="text-xs text-gray-400">Add new milestones via YAML Editor</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <MilestonesSection customer={customer} mutation={milestoneMutation} />
        </div>
      </section>
    </div>
  );
}
