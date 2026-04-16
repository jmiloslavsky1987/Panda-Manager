// tests/components/GanttChart-wbs-rows.test.ts
// RED → GREEN tests for DLVRY-01 WBS row model logic
// Testing pure computation function buildWbsRows exported from GanttChart.tsx
import { describe, it, expect } from 'vitest';
import { buildWbsRows } from '@/components/GanttChart';
import type { GanttTask } from '@/components/GanttChart';

describe('buildWbsRows — WBS row model (DLVRY-01)', () => {
  it('WBS row with no child tasks has spanStart=null and spanEnd=null', () => {
    const wbsItems = [{ id: 1, name: 'Phase 1: Discovery', colorIdx: 0, level: 1, parentId: null, tasks: [] }];
    const unassignedTasks: GanttTask[] = [];
    const rows = buildWbsRows(wbsItems, unassignedTasks);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ wbsId: 1, spanStart: null, spanEnd: null });
  });

  it('WBS row with two tasks computes span from earliest start to latest end', () => {
    const wbsItems = [
      {
        id: 1,
        name: 'Phase 1',
        colorIdx: 0,
        tasks: [
          { id: 't1', name: 'Task 1', start: '2026-06-01', end: '2026-06-15', progress: 0, dependencies: '' },
          { id: 't2', name: 'Task 2', start: '2026-06-10', end: '2026-07-01', progress: 0, dependencies: '' },
        ] as GanttTask[],
      },
    ];
    const unassignedTasks: GanttTask[] = [];
    const rows = buildWbsRows(wbsItems, unassignedTasks);
    expect(rows[0].spanStart).toEqual(new Date('2026-06-01T00:00:00'));
    expect(rows[0].spanEnd).toEqual(new Date('2026-07-01T00:00:00'));
  });

  it('tasks with no WBS assignment fall into unassigned group', () => {
    const wbsItems = [{ id: 1, name: 'Phase 1', colorIdx: 0, level: 1, parentId: null, tasks: [] }];
    const unassignedTasks: GanttTask[] = [
      { id: 't1', name: 'Unassigned Task', start: '2026-06-01', end: '2026-06-15', progress: 0, dependencies: '' },
    ];
    const rows = buildWbsRows(wbsItems, unassignedTasks);
    const unassigned = rows.find(r => r.wbsId === 'unassigned');
    expect(unassigned).toBeDefined();
    expect(unassigned?.tasks).toHaveLength(1);
  });

  it('tasks are nested under their WBS parent row', () => {
    const wbsItems = [
      {
        id: 1,
        name: 'Phase 1',
        colorIdx: 0,
        tasks: [
          { id: 't1', name: 'Task 1', start: '2026-06-01', end: '2026-06-15', progress: 0, dependencies: '' },
        ] as GanttTask[],
      },
    ];
    const unassignedTasks: GanttTask[] = [];
    const rows = buildWbsRows(wbsItems, unassignedTasks);
    expect(rows[0].tasks).toHaveLength(1);
    expect(rows[0].tasks[0].id).toBe('t1');
  });
});
