// client/src/views/NewCustomer.jsx — New customer creation form (MGT-01)
// Accepts name + optional YAML file upload; posts to POST /api/customers via postCustomer.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postCustomer } from '../api';

export default function NewCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerName, setCustomerName] = React.useState('');
  const [projectName, setProjectName] = React.useState('');
  const [goLiveDate, setGoLiveDate] = React.useState('');
  const [yamlContent, setYamlContent] = React.useState('');
  const [fileName, setFileName] = React.useState('');

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) { setYamlContent(''); setFileName(''); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      // base64-encode the YAML text for JSON transport
      const text = ev.target.result;
      setYamlContent(btoa(unescape(encodeURIComponent(text))));
    };
    reader.readAsText(file);
  };

  const createMutation = useMutation({
    mutationFn: () => postCustomer({
      customerName: customerName.trim(),
      projectName: projectName.trim() || undefined,
      goLiveDate: goLiveDate || undefined,
      yamlContent: yamlContent || undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate(`/customer/${data.fileId}`);
    },
  });

  return (
    <div className="p-6 flex flex-col gap-6 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">New Customer</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Create a customer record. Optionally upload an existing YAML to seed the data.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Acme Corp"
            className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-teal-400"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Project Name</label>
          <input
            type="text"
            placeholder="BigPanda Implementation"
            className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-teal-400"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Go-Live Date</label>
          <input
            type="date"
            className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-teal-400"
            value={goLiveDate}
            onChange={e => setGoLiveDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Seed from YAML file <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <input
            type="file"
            accept=".yaml,.yml"
            className="text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            onChange={handleFile}
          />
          {fileName && (
            <p className="text-xs text-gray-400">Loaded: {fileName}</p>
          )}
          <p className="text-xs text-gray-400">
            If provided, the YAML must include all required keys. Customer name above is used for the filename.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!customerName.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="self-start px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Customer'}
        </button>
        {createMutation.isError && (
          <p className="text-sm text-red-600">
            Error: {createMutation.error?.message}
          </p>
        )}
      </div>
    </div>
  );
}
