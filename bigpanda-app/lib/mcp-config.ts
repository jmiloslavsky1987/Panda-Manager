// bigpanda-app/lib/mcp-config.ts
// Lightweight config registry for MCP server connections.
// NOT a process manager — Anthropic API handles actual MCP connectivity.
// Settings are read at call time (hot-reload consistent with SKILL.md pattern).

import { readSettings, SETTINGS_PATH, MCPServerConfig } from './settings-core';

// Which MCP server names each skill is allowed to use.
// Names must match MCPServerConfig.name values in settings.json.
const SKILL_MCP_MAP: Record<string, string[]> = {
  'customer-project-tracker': ['gmail', 'slack', 'glean'],
  'morning-briefing':         ['glean', 'gmail', 'slack'],
  'context-updater':          ['gmail', 'glean'],
  'weekly-customer-status':   ['glean', 'gmail'],
};

export class MCPClientPool {
  private static instance: MCPClientPool | null = null;
  private constructor() {}

  static getInstance(): MCPClientPool {
    if (!MCPClientPool.instance) {
      MCPClientPool.instance = new MCPClientPool();
    }
    return MCPClientPool.instance;
  }

  /**
   * Returns enabled MCP server configs for the given skill.
   * Returns [] if no servers configured or skill is not in SKILL_MCP_MAP.
   * Reads settings at call time — reflects live settings changes without restart.
   *
   * @param skillName - The skill identifier (must match a key in SKILL_MCP_MAP)
   * @param settingsPath - Optional override for settings file path (used in tests)
   */
  async getServersForSkill(
    skillName: string,
    settingsPath: string = SETTINGS_PATH
  ): Promise<MCPServerConfig[]> {
    const settings = await readSettings(settingsPath);
    const allowedNames = SKILL_MCP_MAP[skillName] ?? [];
    if (allowedNames.length === 0) return [];
    return settings.mcp_servers.filter(
      s => s.enabled && allowedNames.includes(s.name)
    );
  }
}
