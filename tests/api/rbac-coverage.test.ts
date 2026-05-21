// tests/api/rbac-coverage.test.ts
// Phase 86 Plan 00 — RBAC-01 static-analysis coverage gate.
// Phase 88.1 Plan 00 — XCUT-88-01 extension: new 88.1 route paths added below.
//
// Walks app/api/projects/[projectId]/ and asserts every route.ts contains
// `requireProjectRole`. Per 86-RESEARCH.md, all ~57 routes already pass —
// this test is expected GREEN immediately and serves as a regression gate.
//
// XCUT-88-01 describe block below adds explicit per-route assertions for all
// new Phase 88.1 route paths. These are RED today (Wave 2 creates them).
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_SCOPED_ROOT = path.join(
  __dirname,
  '..',
  '..',
  'app',
  'api',
  'projects',
  '[projectId]'
);

function walkRoutes(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkRoutes(full));
    else if (entry.name === 'route.ts') out.push(full);
  }
  return out;
}

const routeFiles = walkRoutes(PROJECT_SCOPED_ROOT);

describe('RBAC-01: project-scoped routes coverage', () => {
  it('RBAC-01a: at least 50 route.ts files exist under app/api/projects/[projectId]/', () => {
    expect(
      routeFiles.length,
      `Expected ≥50 project-scoped routes (RESEARCH.md says 57). Found ${routeFiles.length}. Walked: ${PROJECT_SCOPED_ROOT}`
    ).toBeGreaterThanOrEqual(50);
  });

  it('RBAC-01b: every project-scoped route.ts contains requireProjectRole', () => {
    const offenders = routeFiles.filter(
      (f) => !fs.readFileSync(f, 'utf-8').includes('requireProjectRole')
    );
    expect(
      offenders,
      `Routes missing requireProjectRole:\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('RBAC-01c: no project-scoped route relies on requireSession alone (must also have requireProjectRole)', () => {
    const offenders = routeFiles.filter((f) => {
      const src = fs.readFileSync(f, 'utf-8');
      return src.includes('requireSession') && !src.includes('requireProjectRole');
    });
    expect(
      offenders,
      `Routes using requireSession WITHOUT requireProjectRole (regression risk — global-admin elevation):\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// XCUT-88-01: Phase 88.1 new routes use requireProjectRole
//
// All assertions below are RED today — Wave 2 will create each route file.
// One it() block per route path gives Wave 2 tasks individual pass/fail signal.
// ---------------------------------------------------------------------------

function readRouteSafe(routePath: string): string {
  const absPath = path.join(
    path.resolve(__dirname, '..', '..'),
    'app', 'api', 'projects', '[projectId]',
    ...routePath.split('/')
  );
  try {
    return fs.readFileSync(absPath, 'utf-8');
  } catch {
    return '';
  }
}

describe('XCUT-88-01: Phase 88.1 new routes use requireProjectRole', () => {
  it('evidence-log POST/GET route uses requireProjectRole (TEAM-88-08)', () => {
    const src = readRouteSafe('evidence-log/route.ts');
    expect(src, 'evidence-log/route.ts not yet created or missing requireProjectRole').toContain('requireProjectRole');
  });

  it('evidence-log/[id] GET/DELETE route uses requireProjectRole', () => {
    const src = readRouteSafe('evidence-log/[id]/route.ts');
    expect(src, 'evidence-log/[id]/route.ts not yet created or missing requireProjectRole').toContain('requireProjectRole');
  });

  it('team-cards POST/GET route uses requireProjectRole', () => {
    const src = readRouteSafe('team-cards/route.ts');
    expect(src, 'team-cards/route.ts not yet created or missing requireProjectRole').toContain('requireProjectRole');
  });

  it('team-cards/[teamCardId] PATCH/DELETE route uses requireProjectRole', () => {
    const src = readRouteSafe('team-cards/[teamCardId]/route.ts');
    expect(src, 'team-cards/[teamCardId]/route.ts not yet created or missing requireProjectRole').toContain('requireProjectRole');
  });

  it('team-cards/[teamCardId]/key-metrics POST/GET route uses requireProjectRole (TEAM-88-10)', () => {
    const src = readRouteSafe('team-cards/[teamCardId]/key-metrics/route.ts');
    expect(src, 'team-cards/[teamCardId]/key-metrics/route.ts not yet created or missing requireProjectRole').toContain('requireProjectRole');
  });

  it('team-cards/[teamCardId]/key-metrics/[metricId] PATCH/DELETE route uses requireProjectRole', () => {
    const src = readRouteSafe('team-cards/[teamCardId]/key-metrics/[metricId]/route.ts');
    expect(src, 'team-cards/[teamCardId]/key-metrics/[metricId]/route.ts not yet created or missing requireProjectRole').toContain('requireProjectRole');
  });

  it('XCUT-88-01: /api/projects/[projectId]/track-workstream-stages/route.ts calls requireProjectRole', () => {
    const src = readRouteSafe('track-workstream-stages/route.ts');
    expect(src, 'track-workstream-stages/route.ts not yet created or missing requireProjectRole').toContain('requireProjectRole');
  });
});
