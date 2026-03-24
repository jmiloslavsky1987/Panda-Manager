import { describe, it } from 'node:test';
import assert from 'node:assert';

// Stub: SkillOrchestrator uses non-beta path when mcpServers is empty/absent
// Activated in Plan 06-05 Task 1

describe('SkillOrchestrator MCP branch', () => {
  it('uses non-MCP path when mcpServers is absent', async () => {
    assert.fail('stub: orchestrator MCP extension not yet implemented');
  });

  it('uses non-MCP path when mcpServers is empty array', async () => {
    assert.fail('stub: orchestrator MCP extension not yet implemented');
  });
});
