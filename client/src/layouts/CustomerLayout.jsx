// CRITICAL: <Outlet context={{customer}} /> passes data to all child views
// Child views access it via: const { customer } = useOutletContext()
import { Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCustomer } from '../api';

export default function CustomerLayout() {
  const { customerId } = useParams();
  const { data: customer, isPending, isError, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId),
    staleTime: 30_000,
  });

  if (isPending) return <div className="p-4 text-gray-500">Loading customer...</div>;
  if (isError) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  return (
    <div>
      {/* Customer header — implemented in Phase 2 */}
      <div className="mb-4 p-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">
          {customer?.customer?.name ?? customerId}
        </h1>
        <p className="text-sm text-gray-500">Customer Layout (Phase 2 adds full header)</p>
      </div>
      <Outlet context={{ customer }} />
    </div>
  );
}
