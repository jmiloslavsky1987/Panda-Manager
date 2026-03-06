// client/src/components/Sidebar.jsx — UI-03, CUST-01
// Persistent customer sidebar. Uses NavLink for active state (handles nested routes correctly).
// CRITICAL: All NavLink className strings must be complete literals — no dynamic construction.
import { NavLink, Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '../api';
import { deriveOverallStatus } from '../lib/deriveCustomer';

// Status dot lookup — complete literal class strings (Tailwind v4 purge safety)
const SIDEBAR_STATUS_DOT_CLASSES = {
  on_track:    'bg-green-500',
  at_risk:     'bg-yellow-400',
  off_track:   'bg-red-500',
  not_started: 'bg-gray-300',
};

const NAV_LINKS = [
  { path: '',           label: 'Overview' },
  { path: '/reports',   label: 'Reports' },
  { path: '/actions',   label: 'Actions' },
  { path: '/artifacts', label: 'Artifacts' },
  { path: '/setup',     label: 'Project Setup' },
  { path: '/yaml',      label: 'YAML Editor' },
  { path: '/sessions',  label: 'Sessions' },
];

export default function Sidebar() {
  const { customerId } = useParams();
  const { data: customers = [], isPending } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    staleTime: 30_000,
  });

  return (
    <nav className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto flex flex-col shrink-0">
      {/* App title / home link */}
      <div className="p-4 border-b border-gray-200">
        <Link to="/" className="text-sm font-bold text-teal-700 hover:text-teal-800">
          Project Intelligence
        </Link>
      </div>

      {/* Customer list — CUST-01 */}
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Customers</p>
        <Link
          to="/new-customer"
          className="text-xs font-medium text-teal-600 hover:text-teal-700 px-2 py-0.5 rounded border border-teal-200 hover:border-teal-400 transition-colors"
        >
          + New
        </Link>
      </div>
      <ul className="flex-1">
        {isPending && (
          <li className="px-4 py-2 text-xs text-gray-400">Loading...</li>
        )}
        {customers.map(c => (
          <li key={c.fileId}>
            {/* NavLink knows about nested route matching — isActive true for /customer/:id and all children */}
            <NavLink
              to={`/customer/${c.fileId}`}
              className={({ isActive }) =>
                isActive
                  ? 'block px-4 py-2.5 text-sm bg-teal-50 text-teal-700 font-medium border-r-2 border-teal-500'
                  : 'block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50'
              }
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${SIDEBAR_STATUS_DOT_CLASSES[deriveOverallStatus(c)] ?? 'bg-gray-300'}`}
                />
                {c.customer?.name ?? c.fileId}
              </span>
            </NavLink>
          </li>
        ))}
        {!isPending && customers.length === 0 && (
          <li className="px-4 py-2 text-xs text-gray-400">No customers found</li>
        )}
      </ul>

      {/* Per-customer sub-nav — only shown when inside a customer route */}
      {customerId && (
        <div className="border-t border-gray-200 p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Views</p>
          <ul>
            {NAV_LINKS.map(({ path, label }) => (
              <li key={path}>
                <NavLink
                  to={`/customer/${customerId}${path}`}
                  end={path === ''}
                  className={({ isActive }) =>
                    isActive
                      ? 'block px-3 py-1.5 text-sm rounded bg-teal-50 text-teal-700 font-medium'
                      : 'block px-3 py-1.5 text-sm rounded text-gray-600 hover:bg-gray-50'
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
