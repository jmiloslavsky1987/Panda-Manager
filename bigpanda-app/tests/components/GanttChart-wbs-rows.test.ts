// tests/components/GanttChart-wbs-rows.test.ts
// RED stubs for DLVRY-01 WBS row model logic
// These test pure computation functions to be exported from GanttChart.tsx in Plan 03.
import { describe, it, expect } from 'vitest';

// TODO: replace with actual import after Plan 03
// import { buildWbsRows } from '@/components/GanttChart';

// Inline stub — always returns wrong shape so tests stay RED until real export exists
function buildWbsRows(_wbsItems: Array<{ id: number; name: string }>, _tasks: Array<{ id: string; start: string; end: string; wbsItemId: number | null }>) {
  return [];  // stub — RED until Plan 03
}

describe('buildWbsRows — WBS row model (DLVRY-01)', () => {
  it('WBS row with no child tasks has spanStart=null and spanEnd=null', () => {
    const wbsItems = [{ id: 1, name: 'Phase 1: Discovery' }];
    const tasks: Array<{ id: string; start: string; end: string; wbsItemId: number | null }> = [];
    const rows = buildWbsRows(wbsItems, tasks);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ wbsId: 1, spanStart: null, spanEnd: null });
  });

  it('WBS row with two tasks computes span from earliest start to latest end', () => {
    const wbsItems = [{ id: 1, name: 'Phase 1' }];
    const tasks = [
      { id: 't1', start: '2026-06-01', end: '2026-06-15', wbsItemId: 1 },
      { id: 't2', start: '2026-06-10', end: '2026-07-01', wbsItemId: 1 },
    ];
    const rows = buildWbsRows(wbsItems, tasks);
    expect(rows[0]).toMatchObject({ spanStart: '2026-06-01', spanEnd: '2026-07-01' });
  });

  it('tasks with no WBS assignment fall into unassigned group', () => {
    const wbsItems = [{ id: 1, name: 'Phase 1' }];
    const tasks = [
      { id: 't1', start: '2026-06-01', end: '2026-06-15', wbsItemId: null },
    ];
    const rows = buildWbsRows(wbsItems, tasks);
    const unassigned = rows.find(r => r.wbsId === 'unassigned');
    expect(unassigned).toBeDefined();
    expect(unassigned?.tasks).toHaveLength(1);
  });

  it('tasks are nested under their WBS parent row', () => {
    const wbsItems = [{ id: 1, name: 'Phase 1' }];
    const tasks = [
      { id: 't1', start: '2026-06-01', end: '2026-06-15', wbsItemId: 1 },
    ];
    const rows = buildWbsRows(wbsItems, tasks);
    expect(rows[0].tasks).toHaveLength(1);
    expect(rows[0].tasks[0].id).toBe('t1');
  });
});
