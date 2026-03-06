import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './layouts/AppLayout';
import CustomerLayout from './layouts/CustomerLayout';
import Dashboard from './views/Dashboard';
import CustomerOverview from './views/CustomerOverview';
import ActionManager from './views/ActionManager';
import ReportGenerator from './views/ReportGenerator';
import YAMLEditor from './views/YAMLEditor';
import ArtifactManager from './views/ArtifactManager';
import ProjectSetup from './views/ProjectSetup';
import HistoryTimeline from './views/HistoryTimeline';
import NewCustomer from './views/NewCustomer';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'new-customer', element: <NewCustomer /> },
      {
        path: 'customer/:customerId',
        element: <CustomerLayout />,
        children: [
          { index: true, element: <CustomerOverview /> },
          { path: 'actions', element: <ActionManager /> },
          { path: 'reports', element: <ReportGenerator /> },
          { path: 'yaml', element: <YAMLEditor /> },
          { path: 'artifacts', element: <ArtifactManager /> },
          { path: 'setup', element: <ProjectSetup /> },
          { path: 'history', element: <HistoryTimeline /> },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
