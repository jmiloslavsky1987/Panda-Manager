// worker/jobs/__tests__/db-backup.test.ts
// Phase 86 Plan 00 — RED gates for BACKUP-01..03 (pg_dump retention job).
//
// Behavioral test with vi.mock for `child_process` and `fs`. The handler is small
// and pure (no DB calls) so it tests cleanly without source-scan. Dynamic-import
// with try/catch + expect.fail to keep RED state failures clean while
// worker/jobs/db-backup.ts doesn't exist yet.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn(() => true),
}));

const today = new Date().toISOString().slice(0, 10);
const DAY_MS = 24 * 60 * 60 * 1000;

describe('db-backup worker job (Phase 86 BACKUP-01..03)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const cp = await import('child_process');
    const fs = await import('fs');
    vi.mocked(cp.execSync).mockReset();
    vi.mocked(fs.readdirSync).mockReset();
    vi.mocked(fs.statSync).mockReset();
    vi.mocked(fs.unlinkSync).mockReset();
    vi.mocked(fs.mkdirSync).mockReset();
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  });

  it('BACKUP-01: invokes pg_dump with DATABASE_URL', async () => {
    try {
      const fs = await import('fs');
      const cp = await import('child_process');
      vi.mocked(fs.readdirSync).mockReturnValue([] as unknown as never);

      const mod = await import('@/worker/jobs/db-backup');
      // BullMQ-style job arg with .data; handler shape will be confirmed in Plan 03
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (mod.default as any)({ data: { triggeredBy: 'cron' } });

      expect(vi.mocked(cp.execSync)).toHaveBeenCalledTimes(1);
      const cmdString = vi.mocked(cp.execSync).mock.calls[0]?.[0] as string;
      expect(cmdString).toMatch(/pg_dump/);
      // Command should reference DATABASE_URL — either interpolated value or env var name
      const hasDatabaseUrl =
        cmdString.includes('postgresql://test') ||
        cmdString.includes('process.env.DATABASE_URL') ||
        cmdString.includes('$DATABASE_URL') ||
        cmdString.includes('DATABASE_URL');
      expect(
        hasDatabaseUrl,
        `pg_dump command must reference DATABASE_URL. Got: ${cmdString}`
      ).toBe(true);
    } catch (e) {
      expect.fail(
        `db-backup BACKUP-01 import failed (RED state OK): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  });

  it('BACKUP-02: skips when a backup for today already exists', async () => {
    try {
      const fs = await import('fs');
      const cp = await import('child_process');
      const todaysFile = `backup-${today}_foo.sql`;
      vi.mocked(fs.readdirSync).mockReturnValue([todaysFile] as unknown as never);

      const mod = await import('@/worker/jobs/db-backup');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (mod.default as any)({ data: { triggeredBy: 'cron' } });

      expect(result).toEqual({ status: 'skipped-today' });
      expect(vi.mocked(cp.execSync)).not.toHaveBeenCalled();
    } catch (e) {
      expect.fail(
        `db-backup BACKUP-02 import failed (RED state OK): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  });

  it('BACKUP-03a: prunes files older than 30 days', async () => {
    try {
      const fs = await import('fs');

      const oldFile = 'backup-2025-01-01_old.sql';
      const newFile = `backup-${today}_new.sql`;
      vi.mocked(fs.readdirSync).mockReturnValue([oldFile, newFile] as unknown as never);
      vi.mocked(fs.statSync).mockImplementation(
        (p: unknown) =>
          ({
            mtimeMs:
              typeof p === 'string' && p.includes('2025-01-01_old.sql')
                ? Date.now() - 60 * DAY_MS
                : Date.now(),
          }) as unknown as ReturnType<typeof fs.statSync>
      );

      const mod = await import('@/worker/jobs/db-backup');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (mod.default as any)({ data: { triggeredBy: 'cron' } });

      const unlinkCalls = vi.mocked(fs.unlinkSync).mock.calls.map((c) => String(c[0]));
      const deletedOld = unlinkCalls.some((p) => p.includes('2025-01-01_old.sql'));
      const deletedNew = unlinkCalls.some((p) => p.includes('_new.sql'));
      expect(deletedOld, `Old file (60d) should be pruned. unlink calls: ${unlinkCalls.join(', ')}`).toBe(true);
      expect(deletedNew, `Fresh file should NOT be pruned. unlink calls: ${unlinkCalls.join(', ')}`).toBe(false);
    } catch (e) {
      expect.fail(
        `db-backup BACKUP-03a import failed (RED state OK): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  });

  it('BACKUP-03b: does NOT prune files within 30-day window', async () => {
    try {
      const fs = await import('fs');

      const recentFile = `backup-recent_a.sql`;
      vi.mocked(fs.readdirSync).mockReturnValue([recentFile] as unknown as never);
      vi.mocked(fs.statSync).mockReturnValue({
        mtimeMs: Date.now() - 10 * DAY_MS,
      } as unknown as ReturnType<typeof fs.statSync>);

      const mod = await import('@/worker/jobs/db-backup');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (mod.default as any)({ data: { triggeredBy: 'cron' } });

      const unlinkCalls = vi.mocked(fs.unlinkSync).mock.calls.map((c) => String(c[0]));
      expect(
        unlinkCalls.some((p) => p.includes('recent_a.sql')),
        `Recent (10d) file should NOT be pruned. unlink calls: ${unlinkCalls.join(', ')}`
      ).toBe(false);
    } catch (e) {
      expect.fail(
        `db-backup BACKUP-03b import failed (RED state OK): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  });

  it('BACKUP-01b: execSync called with a positive timeout option (RESEARCH.md spec: 5 min)', async () => {
    try {
      const fs = await import('fs');
      const cp = await import('child_process');
      vi.mocked(fs.readdirSync).mockReturnValue([] as unknown as never);

      const mod = await import('@/worker/jobs/db-backup');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (mod.default as any)({ data: { triggeredBy: 'cron' } });

      const opts = vi.mocked(cp.execSync).mock.calls[0]?.[1] as { timeout?: number } | undefined;
      expect(opts, 'execSync should be called with an options object').toBeDefined();
      expect(opts?.timeout, 'execSync options should include a positive `timeout`').toBeGreaterThan(0);
    } catch (e) {
      expect.fail(
        `db-backup BACKUP-01b import failed (RED state OK): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  });
});
