// client/src/views/Dashboard.jsx — DASH-01 through DASH-08
// Replaces placeholder. Uses TanStack Query with staleTime:30s for background refresh.
// CRITICAL: Does NOT call useOutletContext() — Dashboard is under AppLayout, not CustomerLayout.
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, createCustomer } from '../api';
import {
  deriveOverallStatus,
  derivePercentComplete,
  deriveDaysToGoLive,
  countOpenActions,
  countHighRisks,
  sortCustomers,
} from '../lib/deriveCustomer';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';

function NewCustomerModal({ onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ customerName: '', projectName: '', goLiveDate: '' });
  const [error, setError] = React.useState('');

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onClose();
      navigate(`/customer/${newCustomer.fileId}/setup`);
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.customerName.trim()) { setError('Customer name is required'); return; }
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4">New Customer Project</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Acme Corp"
              value={form.customerName}
              onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Acme ADR + Biggy Onboarding"
              value={form.projectName}
              onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Go-Live Date</label>
            <input
              type="date"
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={form.goLiveDate}
              onChange={e => setForm(f => ({ ...f, goLiveDate: e.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [showNewModal, setShowNewModal] = React.useState(false);
  const { data: customers = [], isPending, isError, error } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    staleTime: 30_000,
  });

  if (isPending) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
        <div className="text-gray-500">Loading customers...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
        <div className="text-red-500">Error loading customers: {error.message}</div>
      </div>
    );
  }

  const sorted = sortCustomers(customers);

  return (
    <div className="p-6">
      {showNewModal && <NewCustomerModal onClose={() => setShowNewModal(false)} />}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
        >
          + New Customer
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-gray-500">No customers found. Check Drive folder configuration.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((customer) => (
            <CustomerCard key={customer.fileId} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerCard({ customer }) {
  const status = deriveOverallStatus(customer);
  const pct = derivePercentComplete(customer);
  const days = deriveDaysToGoLive(customer);
  const openActions = countOpenActions(customer);
  const highRisks = countHighRisks(customer);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Header: name + status badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900 leading-tight">
          {customer.customer?.name ?? customer.fileId}
        </h3>
        <StatusBadge status={status} />
      </div>

      {/* Project name */}
      {customer.project?.name && (
        <p className="text-xs text-gray-500">{customer.project.name}</p>
      )}

      {/* Progress bar + percent */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">Overall Progress</span>
          <span className="text-xs font-medium text-gray-700">{pct}%</span>
        </div>
        <ProgressBar percent={pct} />
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-xs">
        <div className="flex flex-col">
          <span className="text-gray-500">Days to Go-Live</span>
          <span className="font-medium text-gray-800">
            {days === null ? '—' : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">Open Actions</span>
          <span className="font-medium text-gray-800">{openActions}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">High Risks</span>
          {/* Red if > 0 — complete literal class strings, no dynamic construction */}
          <span className={highRisks > 0 ? 'font-medium text-red-600' : 'font-medium text-gray-800'}>
            {highRisks}
          </span>
        </div>
      </div>

      {/* View + Setup buttons — DASH-04 */}
      <div className="mt-auto flex gap-2">
        <Link
          to={`/customer/${customer.fileId}`}
          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
        >
          View
        </Link>
        <Link
          to={`/customer/${customer.fileId}/setup`}
          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100 transition-colors"
        >
          Setup
        </Link>
      </div>
    </div>
  );
}
