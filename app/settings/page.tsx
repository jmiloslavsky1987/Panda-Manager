'use client'

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import TimeTrackingSettings from '@/components/TimeTrackingSettings';
import { UsersTab } from '@/components/settings/UsersTab';

interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
  allowedTools?: string[];
}

interface GmailStatus {
  connected: boolean;
  email: string | null;
}

interface SlackStatus {
  connected: boolean;
  hint: string | null;
}

const TAB_CLASS =
  'px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 -mb-px';

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900';

const LABEL_CLASS = 'block text-sm font-medium text-zinc-700 mb-1';

function ConnectedBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
      Connected
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-500">
      Not connected
    </span>
  );
}

function PendingAdminBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
      Pending setup
    </span>
  );
}

function AdminRequiredBanner({ tool }: { tool: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
      <span className="mt-0.5 shrink-0">&#9888;</span>
      <span>
        {tool} requires admin approval to set up. This integration will be configured
        when the app moves to AWS. No action needed now.
      </span>
    </div>
  );
}

function generateId(): string {
  return `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function SettingsPageInner() {
  // MCP Servers state
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [addingServer, setAddingServer] = useState(false);
  const [newServer, setNewServer] = useState({ name: '', url: '', apiKey: '', enabled: true });
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Prompt editing toggle state
  const [promptEditingEnabled, setPromptEditingEnabled] = useState(false);

  // Source Connections state
  const searchParams = useSearchParams();
  const gmailError = searchParams.get('gmail_error');
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false, email: null });
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false);

  // Gmail success banner (after OAuth redirect)
  const [gmailSuccessBanner, setGmailSuccessBanner] = useState(false);

  // Slack OAuth state
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false, hint: null });
  const [slackDisconnecting, setSlackDisconnecting] = useState(false);
  const [slackSuccessBanner, setSlackSuccessBanner] = useState(false);

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      setMcpServers(data.mcp_servers ?? []);
      setPromptEditingEnabled(data.prompt_editing_enabled ?? false);
    }
  }, []);

  const fetchSourceStatus = useCallback(async () => {
    const gmailRes = await fetch('/api/oauth/gmail/status');
    if (gmailRes.ok) setGmailStatus(await gmailRes.json());
    const slackRes = await fetch('/api/oauth/slack/status');
    if (slackRes.ok) setSlackStatus(await slackRes.json());
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchSourceStatus();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'gmail') {
        setGmailSuccessBanner(true);
        window.history.replaceState({}, '', '/settings');
      }
      if (params.get('slack_connected') === '1') {
        setSlackSuccessBanner(true);
        window.history.replaceState({}, '', '/settings');
      }
    }
  }, [fetchSettings, fetchSourceStatus]);

  // ─── MCP handlers ────────────────────────────────────────────────────────────

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

  const handleDisconnectGmail = async () => {
    setGmailDisconnecting(true);
    try {
      await fetch('/api/oauth/gmail/status', { method: 'DELETE' });
      await fetchSourceStatus();
    } finally {
      setGmailDisconnecting(false);
    }
  };

  const handleConnectSlack = () => {
    window.location.href = '/api/oauth/slack';
  };

  const handleDisconnectSlack = async () => {
    setSlackDisconnecting(true);
    try {
      await fetch('/api/oauth/slack/status', { method: 'DELETE' });
      setSlackStatus({ connected: false, hint: null });
    } finally {
      setSlackDisconnecting(false);
    }
  };

  const tokenInstructions =
    newServer.name.toLowerCase().includes('glean')
      ? 'Get from Glean Admin Console → Platform → API Tokens. Requires MCP scope.'
      : null;

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Settings</h1>

      {gmailSuccessBanner && (
        <div className="mb-6 px-4 py-3 rounded bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-between">
          <span>Gmail connected successfully.</span>
          <button onClick={() => setGmailSuccessBanner(false)} className="text-green-600 hover:text-green-800 ml-4">
            &times;
          </button>
        </div>
      )}

      <Tabs.Root defaultValue="users">
        <Tabs.List className="flex border-b border-zinc-200 mb-6">
          <Tabs.Trigger value="users" className={TAB_CLASS} data-testid="users-tab">
            Users
          </Tabs.Trigger>
          <Tabs.Trigger value="mcp-servers" className={TAB_CLASS} data-testid="mcp-servers-tab">
            MCP Servers
          </Tabs.Trigger>
          <Tabs.Trigger value="source-connections" className={TAB_CLASS} data-testid="source-connections-tab">
            Source Connections
          </Tabs.Trigger>
          <Tabs.Trigger value="time-tracking" className={TAB_CLASS} data-testid="time-tracking-tab">
            Time Tracking
          </Tabs.Trigger>
          <Tabs.Trigger value="skills" className={TAB_CLASS} data-testid="skills-tab">
            Skills
          </Tabs.Trigger>
        </Tabs.List>

        {/* ── Users tab ── */}
        <Tabs.Content value="users" data-testid="users-section">
          <UsersTab />
        </Tabs.Content>

        {/* ── MCP Servers tab ── */}
        <Tabs.Content value="mcp-servers" data-testid="mcp-servers-section">
          <div data-testid="mcp-servers-form">
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

            {addingServer ? (
              <div className="border border-zinc-200 rounded-lg p-6 bg-zinc-50 max-w-lg">
                <h2 className="text-base font-semibold text-zinc-900 mb-4">Add MCP Server</h2>

                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLASS}>Name</label>
                    <input
                      type="text"
                      value={newServer.name}
                      onChange={(e) => setNewServer((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. glean, slack, gmail"
                      className={INPUT_CLASS}
                    />
                    {tokenInstructions && (
                      <p className="mt-1 text-xs text-zinc-500">{tokenInstructions}</p>
                    )}
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>URL</label>
                    <input
                      type="text"
                      value={newServer.url}
                      onChange={(e) => setNewServer((p) => ({ ...p, url: e.target.value }))}
                      placeholder="https://your-mcp-server.example.com/mcp"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS}>API Key</label>
                    <input
                      type="password"
                      value={newServer.apiKey}
                      onChange={(e) => setNewServer((p) => ({ ...p, apiKey: e.target.value }))}
                      placeholder="Bearer token or API key"
                      className={INPUT_CLASS}
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
                    {testing ? 'Testing…' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleAddServer}
                    disabled={saving || !newServer.name || !newServer.url || !newServer.apiKey}
                    className="px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
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

        {/* ── Source Connections tab ── */}
        <Tabs.Content value="source-connections" data-testid="source-connections-section">
          <p className="text-sm text-zinc-500 mb-6">
            Configure direct REST API access for the discovery scanner. REST credentials take
            priority over MCP when configured.
          </p>

          <div className="space-y-6">

            {/* ── Gmail ── */}
            <div className="border border-zinc-200 rounded-lg p-6 max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-zinc-900">Gmail</h2>
                <ConnectedBadge connected={gmailStatus.connected} />
              </div>

              {!gmailStatus.connected ? (
                <>
                  <p className="text-xs text-zinc-500 mb-4 p-3 bg-zinc-50 rounded border border-zinc-100">
                    Connect your Google account to allow the scanner to search your Gmail. Only{' '}
                    <code className="font-mono">gmail.readonly</code> scope is requested &mdash; the
                    app cannot send emails.
                  </p>
                  {gmailError && (
                    <p className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded border border-red-200">
                      {gmailError}
                    </p>
                  )}
                  <a
                    href="/api/oauth/gmail"
                    className="inline-block px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700"
                  >
                    Connect Gmail
                  </a>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  {gmailStatus.email && (
                    <p className="text-sm text-zinc-700">
                      Connected as <span className="font-medium">{gmailStatus.email}</span>
                    </p>
                  )}
                  <button
                    onClick={handleDisconnectGmail}
                    disabled={gmailDisconnecting}
                    className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    {gmailDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Slack ── */}
            <div className="border border-zinc-200 rounded-lg p-6 max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-zinc-900">Slack</h2>
                <ConnectedBadge connected={slackStatus.connected} />
              </div>

              {slackSuccessBanner && (
                <div className="mb-4 px-4 py-3 rounded bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-between">
                  <span>Slack connected successfully.</span>
                  <button onClick={() => setSlackSuccessBanner(false)} className="text-green-600 hover:text-green-800 ml-4">
                    &times;
                  </button>
                </div>
              )}

              {!slackStatus.connected ? (
                <>
                  <p className="text-xs text-zinc-500 mb-4 p-3 bg-zinc-50 rounded border border-zinc-100">
                    Connect your Slack workspace to allow the scanner to search messages across channels you have access to.
                  </p>
                  <button
                    onClick={handleConnectSlack}
                    className="inline-block px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700"
                  >
                    Authorize with Slack
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  {slackStatus.hint && (
                    <p className="text-sm text-zinc-700">
                      Connected &mdash; token: <span className="font-mono">...{slackStatus.hint}</span>
                    </p>
                  )}
                  <button
                    onClick={handleDisconnectSlack}
                    disabled={slackDisconnecting}
                    className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    {slackDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Gong ── */}
            <div className="border border-zinc-200 rounded-lg p-6 max-w-lg opacity-75">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-zinc-900">Gong</h2>
                <PendingAdminBadge />
              </div>
              <AdminRequiredBanner tool="Gong" />
            </div>

            {/* ── Glean ── */}
            <div className="border border-zinc-200 rounded-lg p-6 max-w-lg opacity-75">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-zinc-900">Glean</h2>
                <PendingAdminBadge />
              </div>
              <AdminRequiredBanner tool="Glean" />
            </div>

          </div>
        </Tabs.Content>

        {/* ── Time Tracking tab ── */}
        <Tabs.Content value="time-tracking">
          <TimeTrackingSettings />
        </Tabs.Content>

        {/* ── Skills tab ── */}
        <Tabs.Content value="skills" data-testid="skills-section">
          <div className="space-y-6">
            <div className="border border-zinc-200 rounded-lg p-6 max-w-lg">
              <h2 className="text-base font-semibold text-zinc-900 mb-4">Skill Prompts</h2>
              <div className="flex items-center justify-between py-3 border-b border-zinc-100">
                <div>
                  <p className="text-sm font-medium">Prompt Editing</p>
                  <p className="text-xs text-zinc-500">Allow admins to edit skill prompt files from the Skills tab</p>
                </div>
                <input
                  type="checkbox"
                  checked={promptEditingEnabled}
                  onChange={async (e) => {
                    const newVal = e.target.checked;
                    setPromptEditingEnabled(newVal);
                    await fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt_editing_enabled: newVal }),
                    });
                  }}
                  className="h-4 w-4 accent-zinc-900"
                />
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500 text-sm">Loading...</div>}>
      <SettingsPageInner />
    </Suspense>
  );
}
