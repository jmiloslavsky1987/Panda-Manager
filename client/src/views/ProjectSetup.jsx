// client/src/views/ProjectSetup.jsx — Project Setup view (ACT-08)
// Child of CustomerLayout — receives customer data via useOutletContext()
// Renders all 11 sub-workstreams grouped by ADR and Biggy cards
// Scope-enabled sub-workstreams show TagInput; Save triggers PATCH /api/customers/:id/workstreams
import React from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchWorkstreams, updateCustomer } from '../api';
import { WORKSTREAM_CONFIG } from '../lib/deriveCustomer';

// Status select options — complete literal strings (Tailwind v4 purge safety)
const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete',    label: 'Complete' },
  { value: 'at_risk',     label: 'At Risk' },
  { value: 'off_track',   label: 'Off Track' },
];

// TagInput — inline component (not exported)
// Manages comma/enter-separated tag input with add-on-blur, backspace-to-remove
function TagInput({ tags, onChange }) {
  const [inputVal, setInputVal] = React.useState('');

  const addTag = (val) => {
    const trimmed = val.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setInputVal('');
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));

  return (
    <div className="flex flex-wrap gap-1 items-center border border-gray-200 rounded px-2 py-1 min-h-[34px]">
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs rounded px-1.5 py-0.5"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-teal-400 hover:text-teal-700"
          >
            x
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[80px] text-sm outline-none py-0.5"
        value={inputVal}
        placeholder="Add tool, press Enter"
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(inputVal); }
          if (e.key === 'Backspace' && !inputVal && tags.length) removeTag(tags[tags.length - 1]);
        }}
        onBlur={() => { if (inputVal.trim()) addTag(inputVal); }}
      />
    </div>
  );
}

// Build local form state from customer.workstreams
// Initialises all 11 sub-workstreams with defaults; preserves existing values
function buildFormState(workstreams) {
  const state = {};
  for (const [groupKey, group] of Object.entries(WORKSTREAM_CONFIG)) {
    state[groupKey] = {};
    for (const { key, hasScope } of group.subWorkstreams) {
      const existing = workstreams?.[groupKey]?.[key] ?? {};
      state[groupKey][key] = {
        status:           existing.status           ?? 'not_started',
        percent_complete: existing.percent_complete ?? 0,
        progress_notes:   existing.progress_notes   ?? '',
        blockers:         existing.blockers         ?? '',
        ...(hasScope ? { scope: existing.scope ?? [] } : {}),
      };
    }
  }
  return state;
}

export default function ProjectSetup() {
  const { customer } = useOutletContext();
  const { customerId } = useParams();
  const queryClient = useQueryClient();

  const [formState, setFormState] = React.useState(() => buildFormState(customer.workstreams));
  const [savedFlag, setSavedFlag] = React.useState(false);

  const [customerName, setCustomerName] = React.useState(
    () => customer?.customer?.name ?? ''
  );
  const [goLiveDate, setGoLiveDate] = React.useState(
    () => customer?.project?.go_live_date ?? ''
  );
  const [projectName, setProjectName] = React.useState(
    () => customer?.project?.name ?? ''
  );
  const [metaSavedFlag, setMetaSavedFlag] = React.useState(false);

  const metaMutation = useMutation({
    mutationFn: () => {
      // Build updated customer object with new name, program name, and go-live date
      const updated = {
        ...customer,
        customer: { ...customer.customer, name: customerName.trim() },
        project:  {
          ...customer.project,
          go_live_date: goLiveDate,
          name: projectName.trim(),
        },
      };
      // Remove the fileId key before sending (server adds it back)
      const { fileId, ...body } = updated;
      return updateCustomer(customerId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setMetaSavedFlag(true);
      setTimeout(() => setMetaSavedFlag(false), 2000);
    },
  });

  const workstreamsMutation = useMutation({
    mutationFn: (workstreams) => patchWorkstreams(customerId, workstreams),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      setSavedFlag(true);
      setTimeout(() => setSavedFlag(false), 2000);
    },
  });

  const handleSubField = (groupKey, subKey, field, value) => {
    setFormState(prev => ({
      ...prev,
      [groupKey]: {
        ...prev[groupKey],
        [subKey]: { ...prev[groupKey]?.[subKey], [field]: value },
      },
    }));
  };

  const handleSave = () => {
    workstreamsMutation.mutate(formState);
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Project Setup</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {customerName || customerId}
        </p>
      </div>

      {/* Customer Metadata — auto-filled from YAML; MGT-05 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gray-800">Customer Metadata</h3>
        <p className="text-xs text-gray-400">
          Pre-filled from YAML. Changes here update the YAML customer and project blocks.
        </p>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Customer Name</label>
            <input
              type="text"
              className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:border-teal-400"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Project / Program Name</label>
            <input
              type="text"
              className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:border-teal-400"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Go-Live Date</label>
            <input
              type="date"
              className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:border-teal-400"
              value={goLiveDate}
              onChange={e => setGoLiveDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={metaMutation.isPending}
            onClick={() => metaMutation.mutate()}
            className="px-4 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md disabled:opacity-50 transition-colors"
          >
            Save Metadata
          </button>
          {metaMutation.isPending && (
            <span className="text-sm text-gray-400 italic">Saving...</span>
          )}
          {metaSavedFlag && !metaMutation.isPending && (
            <span className="text-sm text-teal-600 font-medium">Saved!</span>
          )}
          {metaMutation.isError && (
            <span className="text-sm text-red-500">
              Error: {metaMutation.error?.message ?? 'Save failed'}
            </span>
          )}
        </div>
      </div>

      {/* Two-column cards: ADR and Biggy */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(WORKSTREAM_CONFIG).map(([groupKey, group]) => (
          <div
            key={groupKey}
            className="bg-white rounded-lg border border-gray-200 p-4 flex-1 min-w-[320px]"
          >
            <h3 className="text-sm font-bold text-gray-800 mb-3">{group.label}</h3>

            {group.subWorkstreams.map(({ key, label, hasScope }) => {
              const sub = formState[groupKey]?.[key] ?? {};
              return (
                <div key={key} className="border-b border-gray-100 last:border-0 py-3">
                  {/* Sub-workstream label */}
                  <p className="text-xs font-semibold text-gray-700 mb-2">{label}</p>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {/* Status select */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Status</label>
                      <select
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1 bg-white"
                        value={sub.status ?? 'not_started'}
                        onChange={e => handleSubField(groupKey, key, 'status', e.target.value)}
                      >
                        {STATUS_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Percent complete */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">% Complete</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                        value={sub.percent_complete ?? 0}
                        onChange={e =>
                          handleSubField(groupKey, key, 'percent_complete', Number(e.target.value))
                        }
                      />
                    </div>
                  </div>

                  {/* Progress notes */}
                  <div className="mb-2">
                    <label className="block text-xs text-gray-500 mb-0.5">Progress Notes</label>
                    <textarea
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded px-2 py-1 resize-none"
                      value={sub.progress_notes ?? ''}
                      onChange={e => handleSubField(groupKey, key, 'progress_notes', e.target.value)}
                    />
                  </div>

                  {/* Blockers */}
                  <div className="mb-2">
                    <label className="block text-xs text-gray-500 mb-0.5">Blockers</label>
                    <input
                      type="text"
                      className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                      value={sub.blockers ?? ''}
                      onChange={e => handleSubField(groupKey, key, 'blockers', e.target.value)}
                    />
                  </div>

                  {/* Scope — only for hasScope sub-workstreams */}
                  {hasScope && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Scope (tools)</label>
                      <TagInput
                        tags={sub.scope ?? []}
                        onChange={val => handleSubField(groupKey, key, 'scope', val)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={workstreamsMutation.isPending}
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md disabled:opacity-50 transition-colors"
        >
          Save
        </button>
        {workstreamsMutation.isPending && (
          <span className="text-sm text-gray-400 italic">Saving...</span>
        )}
        {savedFlag && !workstreamsMutation.isPending && (
          <span className="text-sm text-teal-600 font-medium">Saved!</span>
        )}
        {workstreamsMutation.isError && (
          <span className="text-sm text-red-500">
            Error: {workstreamsMutation.error?.message ?? 'Save failed'}
          </span>
        )}
      </div>
    </div>
  );
}
