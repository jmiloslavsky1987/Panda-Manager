// bigpanda-app/app/api/discovery/scan-config/route.ts
// GET/POST per-project scan source configuration stored in ~/.bigpanda-app/discovery-scan-config.json
//
// GET  ?projectId=N  → returns { projectId, sources: string[] } (defaults to all 4 if absent)
// POST { projectId, sources } → writes/merges config keyed by projectId

import { NextRequest } from 'next/server';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { z } from 'zod';
import { requireSession } from "@/lib/auth-server";

// ─── Constants ────────────────────────────────────────────────────────────────

const SETTINGS_DIR = path.join(os.homedir(), '.bigpanda-app');
const CONFIG_PATH = path.join(SETTINGS_DIR, 'discovery-scan-config.json');
const DEFAULT_SOURCES = ['slack', 'gmail', 'glean', 'gong'];

// ─── Types ────────────────────────────────────────────────────────────────────

type Lookback = '7d' | '14d' | '1m' | '3m';

interface ProjectScanConfig {
  projectId: number;
  sources: string[];
  lookback?: Lookback;
  updatedAt?: string;
}

type ScanConfigStore = Record<string, ProjectScanConfig>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readConfigStore(): Promise<ScanConfigStore> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as ScanConfigStore;
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeConfigStore(store: ScanConfigStore): Promise<void> {
  await fs.mkdir(SETTINGS_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const url = new URL(request.url);
  const projectIdParam = url.searchParams.get('projectId');

  if (!projectIdParam || isNaN(parseInt(projectIdParam, 10))) {
    return Response.json({ error: 'projectId query parameter required' }, { status: 400 });
  }

  const projectId = parseInt(projectIdParam, 10);

  try {
    const store = await readConfigStore();
    const config = store[String(projectId)];

    if (!config) {
      return Response.json({
        projectId,
        sources: DEFAULT_SOURCES,
        lookback: '7d' as Lookback,
      });
    }

    return Response.json({
      projectId: config.projectId,
      sources: config.sources,
      lookback: config.lookback ?? ('7d' as Lookback),
      updatedAt: config.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[discovery/scan-config] GET error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

const PostBodySchema = z.object({
  projectId: z.number().int().positive(),
  sources: z.array(z.enum(['slack', 'gmail', 'glean', 'gong'])).min(1),
  lookback: z.enum(['7d', '14d', '1m', '3m']).optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = PostBodySchema.safeParse(body);
  if (!parseResult.success) {
    return Response.json(
      { error: 'projectId (integer) and sources (non-empty array of slack|gmail|glean|gong) are required' },
      { status: 400 }
    );
  }

  const { projectId, sources, lookback } = parseResult.data;

  try {
    const store = await readConfigStore();
    store[String(projectId)] = {
      projectId,
      sources,
      lookback: lookback ?? '7d',
      updatedAt: new Date().toISOString(),
    };
    await writeConfigStore(store);

    return Response.json({ projectId, sources, lookback: lookback ?? '7d' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[discovery/scan-config] POST error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
