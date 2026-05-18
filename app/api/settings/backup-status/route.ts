// Phase 86: admin-only backup status endpoint. Returns most recent backup file metadata.
// Used by Settings UI to display "Last backup: 2026-05-15 02:00 — 124 MB".

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-server';
import { resolveRole } from '@/lib/auth-utils';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const BACKUP_DIR = process.env.BACKUP_DIR ?? '/root/.bigpanda-app/backups';

export async function GET(): Promise<NextResponse> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  if (resolveRole(session!) !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!existsSync(BACKUP_DIR)) {
    return NextResponse.json({ lastBackup: null, size: null, count: 0 });
  }

  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.sql'))
    .map((f) => {
      const fp = join(BACKUP_DIR, f);
      const st = statSync(fp);
      return { name: f, mtimeMs: st.mtimeMs, size: st.size };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (files.length === 0) {
    return NextResponse.json({ lastBackup: null, size: null, count: 0 });
  }

  const latest = files[0];
  return NextResponse.json({
    lastBackup: new Date(latest.mtimeMs).toISOString(),
    size: latest.size,
    count: files.length,
  });
}
