/**
 * app/api/settings/route.ts — Settings API route for BigPanda Project Assistant
 *
 * GET  /api/settings — Returns current settings (never exposes api key value)
 * POST /api/settings — Updates settings; api_key is written to .env.local only
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { readSettings, writeSettings, AppSettings, MCPServerConfig } from '@/lib/settings';
import { requireSession } from "@/lib/auth-server";
import { resolveRole } from "@/lib/auth-utils";

// Zod schema for a single MCP server entry
const mcpServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  apiKey: z.string(),
  enabled: z.boolean(),
  allowedTools: z.array(z.string()).optional(),
});

// Zod schema: all AppSettings fields are optional, plus optional api_key
const settingsUpdateSchema = z.object({
  workspace_path: z.string().optional(),
  skill_path: z.string().optional(),
  schedule: z
    .object({
      morning_briefing: z.string().optional(),
      health_check: z.string().optional(),
      slack_sweep: z.string().optional(),
      tracker_weekly: z.string().optional(),
      weekly_status: z.string().optional(),
      biggy_briefing: z.string().optional(),
    })
    .optional(),
  mcp_servers: z.array(mcpServerSchema).optional(),
  api_key: z.string().optional(),
  prompt_editing_enabled: z.boolean().optional(),
});

/**
 * GET /api/settings
 * Returns current settings with has_api_key boolean (never the key value).
 */
export async function GET() {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const settings = await readSettings();
  const has_api_key = Boolean(process.env.ANTHROPIC_API_KEY);

  // Mask apiKey in mcp_servers — show only last 4 chars
  const mcp_servers = (settings.mcp_servers ?? []).map((s: MCPServerConfig) => ({
    ...s,
    apiKey: s.apiKey.length > 4 ? `\u2022\u2022\u2022\u2022${s.apiKey.slice(-4)}` : s.apiKey,
  }));

  return NextResponse.json({
    ...settings,
    mcp_servers,
    has_api_key,
  });
}

/**
 * POST /api/settings
 * Updates settings. If body contains api_key, writes it to .env.local only.
 * All other fields are written to ~/.bigpanda-app/settings.json via writeSettings().
 */
export async function POST(request: Request) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const body = await request.json();
  const parsed = settingsUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { api_key, mcp_servers, prompt_editing_enabled, ...settingsFields } = parsed.data;

  // Admin guard: if prompt_editing_enabled is being changed, require admin role
  if (prompt_editing_enabled !== undefined) {
    const role = resolveRole(session!);
    if (role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: 'Admin required' },
        { status: 403 }
      );
    }
  }

  // Write api_key to .env.local only — never to settings.json
  if (api_key !== undefined) {
    const envLocalPath = path.join(process.cwd(), '.env.local');

    let existing = '';
    try {
      existing = await fsPromises.readFile(envLocalPath, 'utf-8');
    } catch {
      // File may not exist yet — that's fine
      existing = '';
    }

    const apiKeyLine = `ANTHROPIC_API_KEY=${api_key}`;
    const hasExistingLine = /^ANTHROPIC_API_KEY=.*/m.test(existing);

    const updated = hasExistingLine
      ? existing.replace(/^ANTHROPIC_API_KEY=.*/m, apiKeyLine)
      : existing
        ? `${existing.trimEnd()}\n${apiKeyLine}\n`
        : `${apiKeyLine}\n`;

    await fsPromises.writeFile(envLocalPath, updated, 'utf-8');
  }

  // Write mcp_servers wholesale (replace array) when present
  const mergedFields: Partial<AppSettings> = { ...settingsFields as Partial<AppSettings> };
  if (mcp_servers !== undefined) {
    mergedFields.mcp_servers = mcp_servers;
  }
  if (prompt_editing_enabled !== undefined) {
    mergedFields.prompt_editing_enabled = prompt_editing_enabled;
  }

  // Write remaining non-sensitive fields to settings.json
  if (Object.keys(mergedFields).length > 0) {
    await writeSettings(mergedFields);
  }

  return NextResponse.json({ ok: true });
}
