import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fsPromises from 'node:fs/promises';
import { MCPClientPool } from '../bigpanda-app/lib/mcp-config';
import type { MCPServerConfig } from '../bigpanda-app/lib/settings-core';

// Helper: write a temp settings file with specific mcp_servers
async function writeTempSettings(
  servers: MCPServerConfig[]
): Promise<string> {
  const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'mcp-test-'));
  const file = path.join(dir, 'settings.json');
  await fsPromises.writeFile(file, JSON.stringify({ mcp_servers: servers }), 'utf-8');
  return file;
}

describe('MCPClientPool', () => {
  it('getServersForSkill returns empty array when mcp_servers not configured', async () => {
    // Point to a non-existent settings file (ENOENT path → empty mcp_servers)
    const pool = MCPClientPool.getInstance();
    const missingPath = path.join(os.tmpdir(), `mcp-test-missing-${Date.now()}.json`);
    const result = await pool.getServersForSkill('customer-project-tracker', missingPath);
    assert.deepStrictEqual(result, []);
  });

  it('getServersForSkill returns only enabled servers matching skill', async () => {
    const servers: MCPServerConfig[] = [
      { id: '1', name: 'gmail', url: 'https://gmail.mcp', apiKey: 'tok1', enabled: true },
      { id: '2', name: 'slack', url: 'https://slack.mcp', apiKey: 'tok2', enabled: false },
      { id: '3', name: 'glean', url: 'https://glean.mcp', apiKey: 'tok3', enabled: true },
      { id: '4', name: 'unknown', url: 'https://unknown.mcp', apiKey: 'tok4', enabled: true },
    ];
    const settingsPath = await writeTempSettings(servers);
    const pool = MCPClientPool.getInstance();
    const result = await pool.getServersForSkill('customer-project-tracker', settingsPath);
    // slack is disabled, unknown is not in the skill map — only gmail and glean expected
    assert.strictEqual(result.length, 2);
    const names = result.map(s => s.name).sort();
    assert.deepStrictEqual(names, ['glean', 'gmail']);
  });
});
