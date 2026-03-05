import React from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postHistory } from '../api';
import { WORKSTREAM_CONFIG } from '../lib/deriveCustomer';

// Build nested workstream state prefilled from current customer YAML workstream data
const buildPrefillWorkstreams = (customer) =>
  Object.fromEntries(
    Object.entries(WORKSTREAM_CONFIG).map(([groupKey, group]) => [
      groupKey,
      Object.fromEntries(
        group.subWorkstreams.map(sw => {
          const wsData = customer?.workstreams?.[groupKey]?.[sw.key];
          return [
            sw.key,
            {
              status: wsData?.status ?? 'green',
              percent_complete: wsData?.percent_complete ?? 0,
              progress_notes: wsData?.progress_notes ?? '',
              blockers: wsData?.blockers ?? '',
            },
          ];
        })
      ),
    ])
  );

// Heuristic summary prefill:
//   progress  — completed actions since last history entry
//   decisions — carried forward from last history entry
//   outcomes  — carried forward from last history entry
const buildHeuristicSummary = (customer) => {
  const lastEntry = customer?.history?.[0];
  const lastDate = lastEntry?.week_ending ?? null;

  const recentDone = (customer?.actions ?? []).filter(a =>
    a.status === 'completed' &&
    a.completed_date &&
    (!lastDate || a.completed_date > lastDate)
  );

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
};

export default function WeeklyUpdateForm() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { customer } = useOutletContext();

  // State: week_ending defaulted to today's YYYY-MM-DD
  const [weekEnding, setWeekEnding] = React.useState(
    () => new Date().toISOString().split('T')[0]
  );

  // State: nested workstream form data — prefilled from current YAML workstream state
  const [formState, setFormState] = React.useState(() => buildPrefillWorkstreams(customer));

  // State: summary section — prefilled from heuristics
  const [summaryState, setSummaryState] = React.useState(() => buildHeuristicSummary(customer));

  // State updater — prevents closure capture issues on per-field updates
  const updateWorkstream = (groupKey, subKey, field, value) => {
    setFormState(prev => ({
      ...prev,
      [groupKey]: {
        ...prev[groupKey],
        [subKey]: { ...prev[groupKey][subKey], [field]: value },
      },
    }));
  };

  const submitMutation = useMutation({
    mutationFn: (entry) => postHistory(customerId, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      navigate(`/customer/${customerId}`);
    },
  });

  const handleSubmit = () => {
    submitMutation.mutate({
      week_ending: weekEnding,
      workstreams: formState,
      progress: summaryState.progress,
      decisions: summaryState.decisions,
      outcomes: summaryState.outcomes,
    });
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      {/* Header + breadcrumb */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Weekly Update</h2>
        <button
          type="button"
          onClick={() => navigate(`/customer/${customerId}`)}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          Back to Overview
        </button>
      </div>

      {/* Week ending date */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Week Ending
        </label>
        <input
          type="date"
          className="border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-teal-400"
          value={weekEnding}
          onChange={e => setWeekEnding(e.target.value)}
        />
      </div>

      {/* Per-workstream fieldsets — generated from WORKSTREAM_CONFIG */}
      {Object.entries(WORKSTREAM_CONFIG).map(([groupKey, group]) => (
        <fieldset
          key={groupKey}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <legend className="text-base font-semibold text-gray-800 px-1 mb-3">
            {group.label}
          </legend>

          <div className="flex flex-col gap-4">
            {group.subWorkstreams.map(sw => (
              <div
                key={sw.key}
                className="border border-gray-100 rounded-lg p-3 flex flex-col gap-2"
              >
                <p className="text-sm font-medium text-gray-700">{sw.label}</p>

                <div className="flex gap-3 flex-wrap items-start">
                  {/* Status select */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-xs text-gray-500">Status</label>
                    <select
                      className="border border-gray-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-teal-400"
                      value={formState[groupKey][sw.key].status}
                      onChange={e =>
                        updateWorkstream(groupKey, sw.key, 'status', e.target.value)
                      }
                    >
                      <option value="green">Green</option>
                      <option value="yellow">Yellow</option>
                      <option value="red">Red</option>
                    </select>
                  </div>

                  {/* Percent complete */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-xs text-gray-500">% Complete</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="border border-gray-200 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:border-teal-400"
                      value={formState[groupKey][sw.key].percent_complete}
                      onChange={e =>
                        updateWorkstream(
                          groupKey,
                          sw.key,
                          'percent_complete',
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>

                {/* Progress notes */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-xs text-gray-500">Progress Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Progress notes..."
                    className="border border-gray-200 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:border-teal-400"
                    value={formState[groupKey][sw.key].progress_notes}
                    onChange={e =>
                      updateWorkstream(groupKey, sw.key, 'progress_notes', e.target.value)
                    }
                  />
                </div>

                {/* Blockers */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-xs text-gray-500">Blockers</label>
                  <textarea
                    rows={1}
                    placeholder="Blockers (if any)..."
                    className="border border-orange-200 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:border-orange-400"
                    value={formState[groupKey][sw.key].blockers}
                    onChange={e =>
                      updateWorkstream(groupKey, sw.key, 'blockers', e.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      {/* Summary section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">Weekly Summary</h3>
          <p className="text-xs text-gray-400">Pre-filled from recent activity</p>
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-sm font-medium text-gray-700">Progress</label>
          <textarea
            rows={3}
            placeholder="Progress summary for the week..."
            className="border border-gray-200 rounded px-3 py-1.5 text-sm resize-none focus:outline-none focus:border-teal-400"
            value={summaryState.progress}
            onChange={e => setSummaryState(prev => ({ ...prev, progress: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-sm font-medium text-gray-700">Decisions</label>
          <textarea
            rows={2}
            placeholder="Key decisions made..."
            className="border border-gray-200 rounded px-3 py-1.5 text-sm resize-none focus:outline-none focus:border-teal-400"
            value={summaryState.decisions}
            onChange={e => setSummaryState(prev => ({ ...prev, decisions: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-sm font-medium text-gray-700">Outcomes</label>
          <textarea
            rows={2}
            placeholder="Outcomes achieved..."
            className="border border-gray-200 rounded px-3 py-1.5 text-sm resize-none focus:outline-none focus:border-teal-400"
            value={summaryState.outcomes}
            onChange={e => setSummaryState(prev => ({ ...prev, outcomes: e.target.value }))}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={submitMutation.isPending || !weekEnding}
          onClick={handleSubmit}
          className="self-start px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitMutation.isPending ? 'Saving...' : 'Submit Weekly Update'}
        </button>

        {submitMutation.isError && (
          <p className="text-red-600 text-sm">
            Failed to save: {submitMutation.error?.message}
          </p>
        )}
      </div>
    </div>
  );
}
