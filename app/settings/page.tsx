'use client'

import { useEffect, useState, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';

const JOB_DISPLAY: Record<string, { label: string; schedule: string }> = {
  'action-sync':     { label: 'Action Sync',     schedule: '0 8 * * *'   },
  'health-refresh':  { label: 'Health Refresh',  schedule: '0 8 * * *'   },
  'weekly-briefing': { label: 'Weekly Briefing', schedule: '0 16 * * 4'  },
  'context-updater': { label: 'Context Updater', schedule: '0 9 * * *'   },
  'gantt-snapshot':  { label: 'Gantt Snapshot',  schedule: '0 7 * * 1'   },
  'risk-monitor':    { label: 'Risk Monitor',    schedule: '0 9 * * 5'   },
};

interface JobRun {
  id: number;
  job_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  triggered_by: string;
}

interface JobRow {
  job_name: string;
  last_run: JobRun | null;
}

interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
  allowedTools?: string[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-600',
  failed:    'text-red-600',
  running:   'text-blue-600',
  skipped:   'text-zinc-400',
  pending:   'text-zinc-400',
};

const TAB_CLASS =
  'px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 -mb-px';

function getTokenInstructions(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes('glean')) {
    return 'Get from Glean Admin Console \u2192 Platform \u2192 API Tokens. Requires MCP scope.';
  }
  if (lower.includes('slack')) {
    return 'Complete OAuth flow at slack.com. Required scopes: search:read.public, channels:history, users:read';
  }
  if (lower.includes('gmail')) {
    return 'Use Glean gmail_search tool if Glean indexes Gmail, or use Google MCP at gmail.googleapis.com/mcp';
  }
  return null;
}

function generateId(): string {
  return `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function SettingsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [triggering, setTriggering] = useState<string | null>(null);

  // MCP Servers state
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [addingServer, setAddingServer] = useState(false);
  const [newServer, setNewServer] = useState({ name: '', url: '', apiKey: '', enabled: true });
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchJobs = useCallback(async () => {
    const res = await fetch('/api/job-runs');
    if (res.ok) setJobs(await res.json());
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      setMcpServers(data.mcp_servers ?? []);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchSettings();
  }, [fetchJobs, fetchSettings]);

  const triggerJob = async (jobName: string) => {
    setTriggering(jobName);
    try {
      await fetch('/api/jobs/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobName }),
      });
      // Brief delay then re-fetch to show the new running row
      setTimeout(fetchJobs, 1500);
    } finally {
      setTimeout(() => setTriggering(null), 1500);
    }
  };

  const saveMcpServers = async (updated: MCPServerConfig[]) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mcp_servers: updated }),
    });
  };

  const handleDeleteServer = async (id: string) => {
    const updated = mcpServers.filter((s) => s.id !== id);
    setMcpServers(updated);
    await saveMcpServers(updated);
  };

  const handleToggleEnabled = async (id: string) => {
    const updated = mcpServers.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setMcpServers(updated);
    await saveMcpServers(updated);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/mcp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServer.name,
          url: newServer.url,
          apiKey: newServer.apiKey,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, error: 'Network error — could not reach the test endpoint.' });
    } finally {
      setTesting(false);
    }
  };

  const handleAddServer = async () => {
    setSaving(true);
    const entry: MCPServerConfig = {
      id: generateId(),
      name: newServer.name,
      url: newServer.url,
      apiKey: newServer.apiKey,
      enabled: newServer.enabled,
    };
    const updated = [...mcpServers, entry];
    setMcpServers(updated);
    await saveMcpServers(updated);
    setAddingServer(false);
    setNewServer({ name: '', url: '', apiKey: '', enabled: true });
    setTestResult(null);
    setSaving(false);
  };

  const handleCancelAdd = () => {
    setAddingServer(false);
    setNewServer({ name: '', url: '', apiKey: '', enabled: true });
    setTestResult(null);
  };

  const tokenInstructions = getTokenInstructions(newServer.name);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Settings</h1>

      <Tabs.Root defaultValue="jobs" data-testid="jobs-tab">
        <Tabs.List className="flex border-b border-zinc-200 mb-6">
          <Tabs.Trigger value="jobs" className={TAB_CLASS}>
            Jobs
          </Tabs.Trigger>
          <Tabs.Trigger
            value="mcp-servers"
            className={TAB_CLASS}
            data-testid="mcp-servers-tab"
          >
            MCP Servers
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="jobs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="pb-3 pr-6 font-medium">Job Name</th>
                  <th className="pb-3 pr-6 font-medium">Schedule</th>
                  <th className="pb-3 pr-6 font-medium">Last Run</th>
                  <th className="pb-3 pr-6 font-medium">Last Status</th>
                  <th className="pb-3 pr-6 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(({ job_name, last_run }) => {
                  const display = JOB_DISPLAY[job_name] ?? { label: job_name, schedule: '\u2014' };
                  const statusClass = last_run ? (STATUS_COLORS[last_run.status] ?? 'text-zinc-500') : 'text-zinc-400';
                  return (
                    <tr key={job_name} className="border-b border-zinc-100">
                      <td className="py-3 pr-6 font-medium text-zinc-900" data-testid={`job-row-${job_name}`}>
                        {display.label}
                      </td>
                      <td className="py-3 pr-6 text-zinc-500 font-mono text-xs">{display.schedule}</td>
                      <td className="py-3 pr-6 text-zinc-500">
                        {last_run ? new Date(last_run.started_at).toLocaleString() : '\u2014'}
                      </td>
                      <td className={`py-3 pr-6 capitalize ${statusClass}`}>
                        {last_run?.status ?? '\u2014'}
                      </td>
                      <td className="py-3 pr-6">
                        <button
                          onClick={() => triggerJob(job_name)}
                          disabled={triggering === job_name}
                          className="px-3 py-1 text-xs bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
                          data-testid={`trigger-${job_name}`}
                        >
                          {triggering === job_name ? 'Queued\u2026' : 'Trigger Now'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {jobs.length === 0 && (
              <p className="text-zinc-400 text-sm mt-4">Loading job status\u2026</p>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content
          value="mcp-servers"
          data-testid="mcp-servers-section"
        >
          {/* Wrap in a div that always renders so the E2E test can find it */}
          <div data-testid="mcp-servers-form">
            {/* Server table */}
            {mcpServers.length > 0 && (
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-500">
                      <th className="pb-3 pr-6 font-medium">Name</th>
                      <th className="pb-3 pr-6 font-medium">URL</th>
                      <th className="pb-3 pr-6 font-medium">API Key</th>
                      <th className="pb-3 pr-6 font-medium">Enabled</th>
                      <th className="pb-3 pr-6 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mcpServers.map((server) => (
                      <tr key={server.id} className="border-b border-zinc-100">
                        <td className="py-3 pr-6 font-medium text-zinc-900">{server.name}</td>
                        <td className="py-3 pr-6 text-zinc-500 font-mono text-xs max-w-xs truncate">
                          {server.url}
                        </td>
                        <td className="py-3 pr-6 text-zinc-500 font-mono text-xs">
                          {server.apiKey}
                        </td>
                        <td className="py-3 pr-6">
                          <input
                            type="checkbox"
                            checked={server.enabled}
                            onChange={() => handleToggleEnabled(server.id)}
                            className="cursor-pointer"
                            aria-label={`Enable ${server.name}`}
                          />
                        </td>
                        <td className="py-3 pr-6">
                          <button
                            onClick={() => handleDeleteServer(server.id)}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {mcpServers.length === 0 && !addingServer && (
              <p className="text-zinc-400 text-sm mb-4">No MCP servers configured.</p>
            )}

            {/* Add Server form */}
            {addingServer ? (
              <div className="border border-zinc-200 rounded-lg p-6 bg-zinc-50 max-w-lg">
                <h2 className="text-base font-semibold text-zinc-900 mb-4">Add MCP Server</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newServer.name}
                      onChange={(e) => setNewServer((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. glean, slack, gmail"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    {tokenInstructions && (
                      <p className="mt-1 text-xs text-zinc-500">{tokenInstructions}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      URL
                    </label>
                    <input
                      type="text"
                      value={newServer.url}
                      onChange={(e) => setNewServer((p) => ({ ...p, url: e.target.value }))}
                      placeholder="https://your-mcp-server.example.com/mcp"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={newServer.apiKey}
                      onChange={(e) => setNewServer((p) => ({ ...p, apiKey: e.target.value }))}
                      placeholder="Bearer token or API key"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new-server-enabled"
                      checked={newServer.enabled}
                      onChange={(e) => setNewServer((p) => ({ ...p, enabled: e.target.checked }))}
                      className="cursor-pointer"
                    />
                    <label htmlFor="new-server-enabled" className="text-sm text-zinc-700 cursor-pointer">
                      Enabled
                    </label>
                  </div>
                </div>

                {/* Test Connection result */}
                {testResult && (
                  <div
                    className={`mt-4 px-3 py-2 rounded text-sm ${
                      testResult.ok
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {testResult.ok
                      ? 'Connection successful.'
                      : `Connection failed: ${testResult.error}`}
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleTestConnection}
                    disabled={testing || !newServer.url || !newServer.apiKey}
                    className="px-4 py-2 text-sm border border-zinc-300 rounded hover:bg-zinc-100 disabled:opacity-50"
                  >
                    {testing ? 'Testing\u2026' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleAddServer}
                    disabled={saving || !newServer.name || !newServer.url || !newServer.apiKey}
                    className="px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving\u2026' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelAdd}
                    className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingServer(true)}
                className="px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700"
              >
                Add MCP Server
              </button>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
