// client/src/layouts/CustomerLayout.jsx
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
    <Outlet context={{ customer }} />
  );
}
