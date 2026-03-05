// client/src/views/ActionManager.jsx — ACT-01 through ACT-12
import React from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchAction, postAction } from '../api';
import { WORKSTREAM_OPTIONS, STATUS_CYCLE } from '../lib/deriveCustomer';
import clsx from 'clsx';

// STATUS_BADGE_CLASSES — complete literal strings (Tailwind v4 purge safety)
const STATUS_BADGE_CLASSES = {
  open:      'bg-blue-100 text-blue-700',
  delayed:   'bg-orange-100 text-orange-700',
  in_review: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};

const STATUS_BADGE_LABELS = {
  open:      'Open',
  delayed:   'Delayed',
  in_review: 'In Review',
  completed: 'Completed',
};

// Inline edit field — shows value as text; click to edit; saves on blur/enter
function InlineEditField({ value, onSave, isPending, className = '', type = 'text' }) {
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
        type={type}
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
      className={clsx('cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 text-sm', className)}
      title="Click to edit"
      onClick={() => { setDraft(value ?? ''); setEditing(true); }}
    >
      {value || <span className="text-gray-400">—</span>}
    </span>
  );
}

// Inline select for immediate onChange -> onSave
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

// SortableHeader sub-component
function SortableHeader({ label, sortKey: key, currentSortKey, currentSortDir, onSort, className = '' }) {
  const isActive = currentSortKey === key;
  return (
    <th
      className={clsx(
        'pb-2 pt-3 px-2 text-xs font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800',
        className
      )}
      onClick={() => onSort(key)}
    >
      {label}
      {isActive && (
        <span className="ml-1 text-gray-400">{currentSortDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  );
}

// Main ActionManager component
export default function ActionManager() {
  const { customer } = useOutletContext();
  const { customerId } = useParams();
  const queryClient = useQueryClient();
  const queryKey = ['customer', customerId];

  // Sort + filter state
  const [sortKey, setSortKey] = React.useState('due');
  const [sortDir, setSortDir] = React.useState('asc');
  const [filterWorkstream, setFilterWorkstream] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all');

  // Completed table state
  const [showCompleted, setShowCompleted] = React.useState(false);

  // Add action form state
  const [newAction, setNewAction] = React.useState({ description: '', owner: '', due: '', workstream: 'inbound_integrations' });

  // Optimistic mutation for patch operations (ACT-01 through ACT-07, ACT-11, ACT-12)
  const actionMutation = useMutation({
    mutationFn: ({ actionId, patch }) => patchAction(customerId, actionId, patch),
    onMutate: async ({ actionId, patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old) => ({
        ...old,
        actions: (old?.actions ?? []).map(a => a.id === actionId ? { ...a, ...patch } : a),
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

  // Add mutation (POST — no optimistic, server assigns ID) — ACT-09
  const addMutation = useMutation({
    mutationFn: (actionData) => postAction(customerId, actionData),
    onSuccess: () => {
      setNewAction({ description: '', owner: '', due: '', workstream: 'inbound_integrations' });
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Complete action handler (ACT-03) — client sets completed_date
  const handleComplete = (action) => {
    actionMutation.mutate({
      actionId: action.id,
      patch: {
        status: 'completed',
        completed_date: new Date().toISOString().split('T')[0],
      },
    });
  };

  // Sort handler
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Derived: filtered + sorted open actions
  const openActions = React.useMemo(() => {
    let list = (customer.actions ?? []).filter(a => a.status !== 'completed');
    if (filterWorkstream === '__unassigned__') list = list.filter(a => !a.workstream);
    else if (filterWorkstream !== 'all') list = list.filter(a => a.workstream === filterWorkstream);
    if (filterStatus !== 'all') list = list.filter(a => a.status === filterStatus);
    return [...list].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [customer.actions, sortKey, sortDir, filterWorkstream, filterStatus]);

  // Derived: completed actions
  const completedActions = (customer.actions ?? []).filter(a => a.status === 'completed');

  const openCount = (customer.actions ?? []).filter(a => a.status !== 'completed').length;

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Action Manager</h2>
        <p className="text-sm text-gray-500">{openCount} open action{openCount !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters row — workstream select + status toggles */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Workstream filter */}
        <select
          className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
          value={filterWorkstream}
          onChange={e => setFilterWorkstream(e.target.value)}
        >
          <option value="all">All Workstreams</option>
          <option value="__unassigned__">Unassigned</option>
          {WORKSTREAM_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Status filter toggles */}
        <div className="flex rounded-md overflow-hidden border border-gray-300">
          {['all', 'open', 'delayed', 'in_review'].map((s) => (
            <button
              key={s}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium',
                filterStatus === s
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-600 border-l border-gray-300 hover:bg-gray-50 first:border-l-0'
              )}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? 'All' : s === 'in_review' ? 'In Review' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Open Actions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-2 pt-3 px-2 w-8"></th>
              <SortableHeader
                label="ID"
                sortKey="id"
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
                className="w-20"
              />
              <SortableHeader
                label="Description"
                sortKey="description"
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Owner"
                sortKey="owner"
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
                className="w-32"
              />
              <SortableHeader
                label="Due"
                sortKey="due"
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
                className="w-32"
              />
              <SortableHeader
                label="Status"
                sortKey="status"
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
                className="w-28"
              />
              <SortableHeader
                label="Workstream"
                sortKey="workstream"
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
                className="w-52"
              />
            </tr>
          </thead>
          <tbody>
            {openActions.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 px-4 text-sm text-gray-400 text-center">
                  {filterWorkstream !== 'all' && filterWorkstream !== '__unassigned__'
                    ? 'No actions assigned to this workstream. Use the Workstream column to assign actions.'
                    : 'No actions match the current filters.'}
                </td>
              </tr>
            )}
            {openActions.map(action => {
              const isPending = actionMutation.isPending && actionMutation.variables?.actionId === action.id;
              const isOverdue = action.due && action.status !== 'completed' && new Date(action.due) < new Date();
              return (
                <tr key={action.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {/* Checkbox — complete action (ACT-03) */}
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      className="cursor-pointer w-4 h-4 rounded accent-teal-600"
                      checked={false}
                      onChange={() => handleComplete(action)}
                      title="Mark as completed"
                    />
                  </td>
                  {/* ID */}
                  <td className="py-2 px-2 font-mono text-xs text-gray-400">{action.id}</td>
                  {/* Description — inline edit (ACT-04) */}
                  <td className="py-2 px-2">
                    <InlineEditField
                      value={action.description}
                      isPending={isPending}
                      onSave={val => actionMutation.mutate({ actionId: action.id, patch: { description: val } })}
                    />
                  </td>
                  {/* Owner — inline edit (ACT-05) */}
                  <td className="py-2 px-2">
                    <InlineEditField
                      value={action.owner}
                      isPending={isPending}
                      onSave={val => actionMutation.mutate({ actionId: action.id, patch: { owner: val } })}
                    />
                  </td>
                  {/* Due date — inline edit, red if overdue (ACT-04) */}
                  <td className="py-2 px-2">
                    <InlineEditField
                      value={action.due}
                      type="date"
                      isPending={isPending}
                      className={clsx(isOverdue && 'text-red-600 font-medium')}
                      onSave={val => actionMutation.mutate({ actionId: action.id, patch: { due: val } })}
                    />
                  </td>
                  {/* Status dropdown (ACT-06) */}
                  <td className="py-2 px-2">
                    {isPending ? (
                      <span className="text-gray-400 italic text-sm">Saving...</span>
                    ) : (
                      <select
                        className={clsx(
                          'text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer appearance-none text-center',
                          STATUS_BADGE_CLASSES[action.status] ?? STATUS_BADGE_CLASSES.open
                        )}
                        value={action.status ?? 'open'}
                        onChange={e => actionMutation.mutate({
                          actionId: action.id,
                          patch: { status: e.target.value },
                        })}
                      >
                        <option value="open">Open</option>
                        <option value="delayed">Delayed</option>
                        <option value="in_review">In Review</option>
                      </select>
                    )}
                  </td>
                  {/* Workstream — inline select (ACT-07) */}
                  <td className="py-2 px-2">
                    <InlineSelectField
                      value={action.workstream ?? ''}
                      options={WORKSTREAM_OPTIONS}
                      isPending={isPending}
                      onSave={val => actionMutation.mutate({ actionId: action.id, patch: { workstream: val } })}
                    />
                  </td>
                </tr>
              );
            })}

            {/* Add Action row — ACT-09 */}
            <tr className="border-t-2 border-dashed border-gray-200">
              <td></td>
              <td className="py-2 pr-2 text-xs text-gray-400 italic">new</td>
              <td className="py-2 pr-2">
                <input
                  className="border border-gray-300 rounded px-1 py-0.5 text-sm w-full"
                  placeholder="Description"
                  value={newAction.description}
                  onChange={e => setNewAction(p => ({ ...p, description: e.target.value }))}
                />
              </td>
              <td className="py-2 pr-2">
                <input
                  className="border border-gray-300 rounded px-1 py-0.5 text-sm w-full"
                  placeholder="Owner"
                  value={newAction.owner}
                  onChange={e => setNewAction(p => ({ ...p, owner: e.target.value }))}
                />
              </td>
              <td className="py-2 pr-2">
                <input
                  type="date"
                  className="border border-gray-300 rounded px-1 py-0.5 text-sm"
                  value={newAction.due}
                  onChange={e => setNewAction(p => ({ ...p, due: e.target.value }))}
                />
              </td>
              <td></td>
              <td className="py-2 pr-2">
                <select
                  className="text-sm border border-gray-300 rounded px-1 py-0.5 bg-white w-full"
                  value={newAction.workstream}
                  onChange={e => setNewAction(p => ({ ...p, workstream: e.target.value }))}
                >
                  {WORKSTREAM_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </td>
              <td className="py-2">
                <button
                  className="px-2 py-1 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
                  disabled={!newAction.description.trim() || addMutation.isPending}
                  onClick={() => addMutation.mutate(newAction)}
                >
                  {addMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Completed Actions Table — ACT-10, ACT-11 */}
      <section className="mt-4">
        <button
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          onClick={() => setShowCompleted(v => !v)}
        >
          <span>{showCompleted ? '▾' : '▸'}</span>
          Completed Actions ({completedActions.length})
        </button>
        {showCompleted && (
          <div className="mt-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 pt-3 px-4 text-xs font-medium text-gray-500">ID</th>
                  <th className="pb-2 pt-3 px-4 text-xs font-medium text-gray-500">Description</th>
                  <th className="pb-2 pt-3 px-4 text-xs font-medium text-gray-500">Owner</th>
                  <th className="pb-2 pt-3 px-4 text-xs font-medium text-gray-500">Due</th>
                  <th className="pb-2 pt-3 px-4 text-xs font-medium text-gray-500">Completed</th>
                  <th className="pb-2 pt-3 px-4 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {completedActions.map(action => (
                  <tr key={action.id} className="border-b border-gray-100">
                    <td className="py-2 px-4 font-mono text-xs text-gray-400">{action.id}</td>
                    <td className="py-2 px-4 text-sm text-gray-700">{action.description}</td>
                    <td className="py-2 px-4 text-sm text-gray-600">{action.owner}</td>
                    <td className="py-2 px-4 text-sm text-gray-600">{action.due || '—'}</td>
                    <td className="py-2 px-4 text-sm text-gray-600">{action.completed_date || '—'}</td>
                    <td className="py-2 px-4">
                      <button
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium disabled:opacity-50"
                        disabled={actionMutation.isPending && actionMutation.variables?.actionId === action.id}
                        onClick={() => actionMutation.mutate({
                          actionId: action.id,
                          patch: { status: 'open', completed_date: '' },
                        })}
                      >
                        {actionMutation.isPending && actionMutation.variables?.actionId === action.id
                          ? 'Saving...' : 'Reopen'}
                      </button>
                    </td>
                  </tr>
                ))}
                {completedActions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 px-4 text-sm text-gray-400 text-center">
                      No completed actions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
