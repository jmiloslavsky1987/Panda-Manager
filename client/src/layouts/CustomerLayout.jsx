// client/src/layouts/CustomerLayout.jsx
// CRITICAL: <Outlet context={{customer}} /> passes data to all child views
// Child views access it via: const { customer } = useOutletContext()
import { Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCustomer } from '../api';

function CustomerSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse">
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-100 rounded w-32"></div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-5 h-40"></div>
      <div className="bg-white rounded-lg border border-gray-200 p-5 h-40"></div>
    </div>
  );
}

export default function CustomerLayout() {
  const { customerId } = useParams();
  const { data: customer, isPending, isError, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId),
    staleTime: 30_000,
  });

  if (isPending) return <CustomerSkeleton />;
  if (isError) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  return (
    <Outlet context={{ customer }} />
  );
}
