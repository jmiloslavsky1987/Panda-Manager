// GET  /api/settings/source-credentials — returns connection status hints (no raw secrets)
// POST /api/settings/source-credentials — saves source credentials to settings.json
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSettings, writeSettings } from '@/lib/settings';

const sourceCredentialsSchema = z.object({
  slack: z
    .object({
      token: z.string().min(1),
      channels: z.array(z.string()).optional(),
    })
    .optional(),
  gong: z
    .object({
      accessKey: z.string().min(1),
      accessKeySecret: z.string().min(1),
      baseUrl: z.string().url(),
    })
    .optional(),
  glean: z
    .object({
      token: z.string().min(1),
      instanceUrl: z.string().url(),
      actAsEmail: z.string().email().optional(),
    })
    .optional(),
});

function maskToken(token: string): string {
  if (token.length <= 8) return '••••';
  return `••••${token.slice(-4)}`;
}

export async function GET(): Promise<Response> {
  const settings = await readSettings();
  const creds = settings.source_credentials;

  const status: Record<string, unknown> = {};

  if (creds?.slack) {
    status.slack = {
      connected: true,
      tokenHint: maskToken(creds.slack.token),
      channels: creds.slack.channels ?? [],
    };
  }

  if (creds?.gong) {
    status.gong = {
      connected: true,
      accessKeyHint: maskToken(creds.gong.accessKey),
    };
  }

  if (creds?.glean) {
    status.glean = {
      connected: true,
      tokenHint: maskToken(creds.glean.token),
      instanceUrl: creds.glean.instanceUrl,
      actAsEmail: creds.glean.actAsEmail,
    };
  }

  return NextResponse.json(status);
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = sourceCredentialsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const settings = await readSettings();
  const existing = settings.source_credentials ?? {};

  // Merge: only update the keys present in the POST body
  const merged = {
    ...existing,
    ...(parsed.data.slack !== undefined ? { slack: parsed.data.slack } : {}),
    ...(parsed.data.gong !== undefined ? { gong: parsed.data.gong } : {}),
    ...(parsed.data.glean !== undefined ? { glean: parsed.data.glean } : {}),
  };

  await writeSettings({ source_credentials: merged });

  return NextResponse.json({ ok: true });
}
