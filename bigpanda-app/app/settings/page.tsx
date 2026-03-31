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

// ─── Source Connections ───────────────────────────────────────────────────────

interface SlackStatus { connected: true; tokenHint: string; channels: string[] }
interface GongStatus  { connected: true; accessKeyHint: string }
interface GleanStatus { connected: true; tokenHint: string; instanceUrl: string; actAsEmail?: string }

interface SourceCredentialStatus {
  slack?: SlackStatus;
  gong?:  GongStatus;
  glean?: GleanStatus;
}

interface GmailStatus {
  connected: boolean;
  email: string | null;
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

function SettingsPageInner() {
  // MCP Servers state
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [addingServer, setAddingServer] = useState(false);
  const [newServer, setNewServer] = useState({ name: '', url: '', apiKey: '', enabled: true });
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Source Connections state
  const searchParams = useSearchParams();
  const gmailError = searchParams.get('gmail_error');
  const [sourceStatus, setSourceStatus] = useState<SourceCredentialStatus>({});
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false, email: null });
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false);

  // Slack form
  const [slackToken, setSlackToken] = useState('');
  const [slackChannels, setSlackChannels] = useState('');
  const [slackSaving, setSlackSaving] = useState(false);
  const [slackSaved, setSlackSaved] = useState(false);

  // Gong form
  const [gongAccessKey, setGongAccessKey] = useState('');
  const [gongAccessKeySecret, setGongAccessKeySecret] = useState('');
  const [gongBaseUrl, setGongBaseUrl] = useState('');
  const [gongSaving, setGongSaving] = useState(false);
  const [gongSaved, setGongSaved] = useState(false);

  // Glean form
  const [gleanToken, setGleanToken] = useState('');
  const [gleanInstanceUrl, setGleanInstanceUrl] = useState('');
  const [gleanActAsEmail, setGleanActAsEmail] = useState('');
  const [gleanSaving, setGleanSaving] = useState(false);
  const [gleanSaved, setGleanSaved] = useState(false);

  // Gmail success banner (after OAuth redirect)
  const [gmailSuccessBanner, setGmailSuccessBanner] = useState(false);

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      setMcpServers(data.mcp_servers ?? []);
    }
  }, []);

  const fetchSourceStatus = useCallback(async () => {
    const [credRes, gmailRes] = await Promise.all([
      fetch('/api/settings/source-credentials'),
      fetch('/api/oauth/gmail/status'),
    ]);
    if (credRes.ok)  setSourceStatus(await credRes.json());
    if (gmailRes.ok) setGmailStatus(await gmailRes.json());
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchSourceStatus();

    // Check for ?success=gmail in URL after OAuth redirect
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'gmail') {
        setGmailSuccessBanner(true);
        // Clean up URL without page reload
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
      setTestResult({ ok: false, error: 'Network error \u2014 could not reach the test endpoint.' });
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

  // ─── Source Connections handlers ──────────────────────────────────────────────

  const handleSaveSlack = async () => {
    setSlackSaving(true);
    setSlackSaved(false);
    try {
      const channels = slackChannels
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      await fetch('/api/settings/source-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slack: { token: slackToken, channels } }),
      });
      await fetchSourceStatus();
      setSlackToken('');
      setSlackChannels('');
      setSlackSaved(true);
      setTimeout(() => setSlackSaved(false), 3000);
    } finally {
      setSlackSaving(false);
    }
  };

  const handleSaveGong = async () => {
    setGongSaving(true);
    setGongSaved(false);
    try {
      await fetch('/api/settings/source-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gong: { accessKey: gongAccessKey, accessKeySecret: gongAccessKeySecret, baseUrl: gongBaseUrl },
        }),
      });
      await fetchSourceStatus();
      setGongAccessKey('');
      setGongAccessKeySecret('');
      setGongBaseUrl('');
      setGongSaved(true);
      setTimeout(() => setGongSaved(false), 3000);
    } finally {
      setGongSaving(false);
    }
  };

  const handleSaveGlean = async () => {
    setGleanSaving(true);
    setGleanSaved(false);
    try {
      await fetch('/api/settings/source-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glean: { token: gleanToken, instanceUrl: gleanInstanceUrl, actAsEmail: gleanActAsEmail || undefined },
        }),
      });
      await fetchSourceStatus();
      setGleanToken('');
      setGleanInstanceUrl('');
      setGleanActAsEmail('');
      setGleanSaved(true);
      setTimeout(() => setGleanSaved(false), 3000);
    } finally {
      setGleanSaving(false);
    }
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

  const tokenInstructions = getTokenInstructions(newServer.name);

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
          <Tabs.Trigger
            value="users"
            className={TAB_CLASS}
            data-testid="users-tab"
          >
            Users
          </Tabs.Trigger>
          <Tabs.Trigger
            value="mcp-servers"
            className={TAB_CLASS}
            data-testid="mcp-servers-tab"
          >
            MCP Servers
          </Tabs.Trigger>
          <Tabs.Trigger
            value="source-connections"
            className={TAB_CLASS}
            data-testid="source-connections-tab"
          >
            Source Connections
          </Tabs.Trigger>
          <Tabs.Trigger
            value="time-tracking"
            className={TAB_CLASS}
            data-testid="time-tracking-tab"
          >
            Time Tracking
          </Tabs.Trigger>
        </Tabs.List>

        {/* ── Users tab ── */}
        <Tabs.Content value="users" data-testid="users-section">
          <UsersTab />
        </Tabs.Content>

        {/* ── MCP Servers tab ── */}
        <Tabs.Content
          value="mcp-servers"
          data-testid="mcp-servers-section"
        >
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

        {/* ── Source Connections tab ── */}
        <Tabs.Content value="source-connections" data-testid="source-connections-section">
          <p className="text-sm text-zinc-500 mb-6">
            Configure direct REST API access for the discovery scanner. REST credentials take
            priority over MCP when configured.
          </p>

          <div className="space-y-6">

            {/* ── Slack ── */}
            <div className="border border-zinc-200 rounded-lg p-6 max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-zinc-900">Slack</h2>
                <ConnectedBadge connected={!!sourceStatus.slack} />
              </div>

              {!sourceStatus.slack && (
                <p className="text-xs text-zinc-500 mb-4 p-3 bg-zinc-50 rounded border border-zinc-100">
                  Create a Slack app at api.slack.com. Install it to your workspace. Add the{' '}
                  <code className="font-mono">channels:history</code> scope. Copy the Bot User OAuth Token.
                </p>
              )}

              {sourceStatus.slack && (
                <p className="text-xs text-zinc-500 mb-4">
                  Token: <code className="font-mono">{sourceStatus.slack.tokenHint}</code>
                  {sourceStatus.slack.channels.length > 0 && (
                    <> &nbsp;&bull;&nbsp; Channels: {sourceStatus.slack.channels.join(', ')}</>
                  )}
                </p>
              )}

              <div className="space-y-3">
                <div>
                  <label className={LABEL_CLASS}>Bot Token</label>
                  <input
                    type="password"
                    value={slackToken}
                    onChange={(e) => setSlackToken(e.target.value)}
                    placeholder="xoxb-..."
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Channel IDs</label>
                  <input
                    type="text"
                    value={slackChannels}
                    onChange={(e) => setSlackChannels(e.target.value)}
                    placeholder="C01234567, C0987654"
                    className={INPUT_CLASS}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Comma-separated channel IDs. Bot must be invited to each channel.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleSaveSlack}
                  disabled={slackSaving || !slackToken}
                  className="px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
                >
                  {slackSaving ? 'Saving\u2026' : 'Save'}
                </button>
                {slackSaved && <span className="text-xs text-green-600">Saved.</span>}
              </div>
            </div>

            {/* ── Gong ── */}
            <div className="border border-zinc-200 rounded-lg p-6 max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-zinc-900">Gong</h2>
                <ConnectedBadge connected={!!sourceStatus.gong} />
              </div>

              {!sourceStatus.gong && (
                <p className="text-xs text-zinc-500 mb-4 p-3 bg-zinc-50 rounded border border-zinc-100">
                  Get API credentials from Gong Admin &rarr; Settings &rarr; Ecosystem &rarr; API.
                  The Base URL is region-specific.
                </p>
              )}

              {sourceStatus.gong && (
                <p className="text-xs text-zinc-500 mb-4">
                  Access Key: <code className="font-mono">{sourceStatus.gong.accessKeyHint}</code>
                </p>
              )}

              <div className="space-y-3">
                <div>
                  <label className={LABEL_CLASS}>Access Key</label>
                  <input
                    type="password"
                    value={gongAccessKey}
                    onChange={(e) => setGongAccessKey(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Access Key Secret</label>
                  <input
                    type="password"
                    value={gongAccessKeySecret}
                    onChange={(e) => setGongAccessKeySecret(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Base URL</label>
                  <input
                    type="text"
                    value={gongBaseUrl}
                    onChange={(e) => setGongBaseUrl(e.target.value)}
                    placeholder="https://us-XXXX.api.gong.io"
                    className={INPUT_CLASS}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Find in Gong Admin &rarr; Settings &rarr; Ecosystem &rarr; API
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleSaveGong}
                  disabled={gongSaving || !gongAccessKey || !gongAccessKeySecret || !gongBaseUrl}
                  className="px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
                >
                  {gongSaving ? 'Saving\u2026' : 'Save'}
                </button>
                {gongSaved && <span className="text-xs text-green-600">Saved.</span>}
              </div>
            </div>

            {/* ── Glean ── */}
            <div className="border border-zinc-200 rounded-lg p-6 max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-zinc-900">Glean</h2>
                <ConnectedBadge connected={!!sourceStatus.glean} />
              </div>

              {!sourceStatus.glean && (
                <p className="text-xs text-zinc-500 mb-4 p-3 bg-zinc-50 rounded border border-zinc-100">
                  Get a global token from Glean Admin &rarr; Developer &rarr; API Tokens. The ActAs
                  Email field is required for global tokens.
                </p>
              )}

              {sourceStatus.glean && (
                <p className="text-xs text-zinc-500 mb-4">
                  Token: <code className="font-mono">{sourceStatus.glean.tokenHint}</code>
                  {' '}&bull;{' '}
                  Instance: <code className="font-mono">{sourceStatus.glean.instanceUrl}</code>
                </p>
              )}

              <div className="space-y-3">
                <div>
                  <label className={LABEL_CLASS}>API Token</label>
                  <input
                    type="password"
                    value={gleanToken}
                    onChange={(e) => setGleanToken(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Instance URL</label>
                  <input
                    type="text"
                    value={gleanInstanceUrl}
                    onChange={(e) => setGleanInstanceUrl(e.target.value)}
                    placeholder="https://company.glean.com"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>ActAs Email</label>
                  <input
                    type="email"
                    value={gleanActAsEmail}
                    onChange={(e) => setGleanActAsEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className={INPUT_CLASS}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Required for global tokens &mdash; use an admin email.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleSaveGlean}
                  disabled={gleanSaving || !gleanToken || !gleanInstanceUrl}
                  className="px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
                >
                  {gleanSaving ? 'Saving\u2026' : 'Save'}
                </button>
                {gleanSaved && <span className="text-xs text-green-600">Saved.</span>}
              </div>
            </div>

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
                    {gmailDisconnecting ? 'Disconnecting\u2026' : 'Disconnect'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </Tabs.Content>

        {/* ── Time Tracking tab ── */}
        <Tabs.Content value="time-tracking">
          <TimeTrackingSettings />
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
