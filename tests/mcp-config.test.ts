import { describe, it } from 'node:test';
import assert from 'node:assert';

// Stub: MCPClientPool.getServersForSkill() returns [] when no servers configured
// Activated in Plan 06-03 Task 2

describe('MCPClientPool', () => {
  it('getServersForSkill returns empty array when mcp_servers not configured', async () => {
    assert.fail('stub: mcp-config not yet implemented');
  });

  it('getServersForSkill returns only enabled servers matching skill', async () => {
    assert.fail('stub: mcp-config not yet implemented');
  });
});
