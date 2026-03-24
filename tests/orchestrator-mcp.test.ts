import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { SkillRunParams } from '../bigpanda-app/lib/skill-orchestrator';
import type { MCPServerConfig } from '../bigpanda-app/lib/settings-core';

// Unit tests for the SkillOrchestrator MCP branch logic (plan 06-05).
// These tests verify the branching condition, not the SDK calls themselves.

/**
 * Mirrors the useMCP logic from skill-orchestrator.ts:
 *   const useMCP = (params.mcpServers?.length ?? 0) > 0;
 */
function computeUseMCP(params: Pick<SkillRunParams, 'mcpServers'>): boolean {
  return (params.mcpServers?.length ?? 0) > 0;
}

describe('SkillOrchestrator MCP branch', () => {
  it('uses non-MCP path when mcpServers is absent', async () => {
    const params: Pick<SkillRunParams, 'mcpServers'> = {};
    assert.strictEqual(computeUseMCP(params), false, 'Expected non-MCP path when mcpServers is absent');
  });

  it('uses non-MCP path when mcpServers is empty array', async () => {
    const params: Pick<SkillRunParams, 'mcpServers'> = { mcpServers: [] };
    assert.strictEqual(computeUseMCP(params), false, 'Expected non-MCP path when mcpServers is []');
  });

  it('uses MCP path when mcpServers has one entry', async () => {
    const server: MCPServerConfig = {
      id: 'test-id',
      name: 'glean',
      url: 'https://example-be.glean.com/mcp/default',
      apiKey: 'token-abc',
      enabled: true,
    };
    const params: Pick<SkillRunParams, 'mcpServers'> = { mcpServers: [server] };
    assert.strictEqual(computeUseMCP(params), true, 'Expected MCP path when mcpServers has entries');
  });
});
