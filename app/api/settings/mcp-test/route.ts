/**
 * app/api/settings/mcp-test/route.ts — MCP Server connectivity test
 *
 * POST /api/settings/mcp-test
 * Accepts: { name: string; url: string; apiKey: string }
 * Returns: { ok: true } on reachable + auth-accepted response
 *          { ok: false, error: string } on non-2xx or network error
 *
 * Only tests URL reachability + Authorization header acceptance.
 * Does NOT validate Anthropic SDK compatibility.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

const mcpTestSchema = z.object({
  name: z.string(),
  url: z.string().url({ message: 'Invalid URL' }),
  apiKey: z.string().min(1, { message: 'API key is required' }),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const parsed = mcpTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 }
    );
  }

  const { url, apiKey } = parsed.data;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return NextResponse.json({ ok: true });
    }

    // 401/403 means reachable but auth failed — still a meaningful result
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({
        ok: false,
        error: `Authentication failed (HTTP ${response.status}). Check your API key.`,
      });
    }

    return NextResponse.json({
      ok: false,
      error: `Server returned HTTP ${response.status}. Verify the URL is correct.`,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown network error';
    const isTimeout =
      err instanceof Error && err.name === 'TimeoutError';

    return NextResponse.json({
      ok: false,
      error: isTimeout
        ? 'Connection timed out after 5 seconds. Verify the URL is reachable.'
        : `Connection failed: ${message}`,
    });
  }
}
