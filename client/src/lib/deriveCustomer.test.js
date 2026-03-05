// client/src/lib/deriveCustomer.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveOverallStatus,
  derivePercentComplete,
  deriveDaysToGoLive,
  countOpenActions,
  countHighRisks,
  sortCustomers,
  getLatestHistory,
  getLatestWorkstreams,
} from './deriveCustomer.js';

// Minimal fixture matching actual sample.yaml shape
const makeCustomer = (overrides = {}) => ({
  customer: { name: 'Test Corp' },
  project: { go_live_date: '2030-01-01', overall_percent_complete: 50 },
  status: 'on_track',
  actions: [],
  risks: [],
  history: [],
  ...overrides,
});

// Merck/Kaiser style: workstreams is an array in history entries
const makeWsHistory = (workstreams) => [{ week_of: '2026-03-07', workstreams }];

const twoWorkstreams = [
  { name: 'ADR Onboarding',   status: 'yellow', percent_complete: 40, progress_notes: 'In progress', blockers: '' },
  { name: 'Biggy Onboarding', status: 'green',  percent_complete: 60, progress_notes: 'On track',    blockers: '' },
];

describe('getLatestWorkstreams', () => {
  it('normalizes green/yellow/red to on_track/at_risk/off_track', () => {
    const c = makeCustomer({ history: makeWsHistory([
      { name: 'ADR',   status: 'red',    percent_complete: 0, progress_notes: '', blockers: 'blocker' },
      { name: 'Biggy', status: 'yellow', percent_complete: 0, progress_notes: '', blockers: '' },
      { name: 'Extra', status: 'green',  percent_complete: 0, progress_notes: '', blockers: '' },
    ])});
    const ws = getLatestWorkstreams(c);
    assert.equal(ws[0].status, 'off_track');
    assert.equal(ws[1].status, 'at_risk');
    assert.equal(ws[2].status, 'on_track');
  });

  it('handles AMEX delivery_status format', () => {
    const c = makeCustomer({ history: [{ delivery_status: [
      { workstream: 'Architecture', summary: 'Baseline understood', blockers: '' },
      { workstream: 'Automation',   summary: 'Roles clarified',    blockers: 'Pending SNOW field guardrails' },
    ], status_score: { delivery: 'yellow' } }] });
    const ws = getLatestWorkstreams(c);
    assert.equal(ws.length, 2);
    assert.equal(ws[0].name, 'Architecture');
    assert.equal(ws[1].name, 'Automation');
    // Entry with blockers → at_risk regardless of overall score
    assert.equal(ws[1].status, 'at_risk');
  });

  it('returns empty array when no history', () => {
    const c = makeCustomer({ history: [] });
    assert.deepEqual(getLatestWorkstreams(c), []);
  });
});

describe('deriveOverallStatus', () => {
  it('returns off_track when any workstream has status red (normalized off_track)', () => {
    const c = makeCustomer({ history: makeWsHistory([
      { name: 'ADR', status: 'red', percent_complete: 0, progress_notes: '', blockers: '' },
    ])});
    assert.equal(deriveOverallStatus(c), 'off_track');
  });

  it('returns at_risk when any workstream has status yellow (normalized at_risk)', () => {
    const c = makeCustomer({ history: makeWsHistory(twoWorkstreams) });
    assert.equal(deriveOverallStatus(c), 'at_risk');
  });

  it('returns on_track when all workstreams are green', () => {
    const c = makeCustomer({ history: makeWsHistory([
      { name: 'ADR',   status: 'green', percent_complete: 0, progress_notes: '', blockers: '' },
      { name: 'Biggy', status: 'green', percent_complete: 0, progress_notes: '', blockers: '' },
    ])});
    assert.equal(deriveOverallStatus(c), 'on_track');
  });

  it('falls back to customer.status when no history entries exist', () => {
    const c = makeCustomer({ status: 'off_track', history: [] });
    assert.equal(deriveOverallStatus(c), 'off_track');
  });
});

describe('derivePercentComplete', () => {
  it('returns average of workstream percent_complete values from history[0]', () => {
    // twoWorkstreams: ADR=40, Biggy=60. Avg = (40+60)/2 = 50
    const c = makeCustomer({ history: makeWsHistory(twoWorkstreams) });
    assert.equal(derivePercentComplete(c), 50);
  });

  it('falls back to project.overall_percent_complete when no history exists', () => {
    const c = makeCustomer({ history: [], project: { overall_percent_complete: 35 } });
    assert.equal(derivePercentComplete(c), 35);
  });

  it('returns 0 for customer with empty history and no project.overall_percent_complete', () => {
    const c = makeCustomer({ history: [], project: {} });
    assert.equal(derivePercentComplete(c), 0);
  });
});

describe('deriveDaysToGoLive', () => {
  it('returns positive integer for future go_live_date', () => {
    const c = makeCustomer({ project: { go_live_date: '2030-01-01' } });
    const days = deriveDaysToGoLive(c);
    assert.ok(days > 0, `Expected positive days, got ${days}`);
  });

  it('returns negative integer for past go_live_date', () => {
    const c = makeCustomer({ project: { go_live_date: '2020-01-01' } });
    const days = deriveDaysToGoLive(c);
    assert.ok(days < 0, `Expected negative days, got ${days}`);
  });

  it('returns null when project.go_live_date is missing', () => {
    const c = makeCustomer({ project: {} });
    assert.equal(deriveDaysToGoLive(c), null);
  });
});

describe('countOpenActions', () => {
  it('counts only actions where status !== completed', () => {
    const c = makeCustomer({ actions: [
      { id: 'A-001', status: 'completed' },
      { id: 'A-002', status: 'open' },
      { id: 'A-003', status: 'delayed' },
    ]});
    assert.equal(countOpenActions(c), 2);
  });

  it('returns 0 for customer with no actions array', () => {
    const c = makeCustomer({ actions: [] });
    assert.equal(countOpenActions(c), 0);
  });
});

describe('countHighRisks', () => {
  it('counts only high severity + open status risks', () => {
    const c = makeCustomer({ risks: [
      { id: 'R-001', severity: 'high', status: 'open' },
      { id: 'R-002', severity: 'high', status: 'mitigated' },
      { id: 'R-003', severity: 'medium', status: 'open' },
    ]});
    assert.equal(countHighRisks(c), 1);
  });

  it('does not count high risks that are closed or mitigated', () => {
    const c = makeCustomer({ risks: [
      { id: 'R-001', severity: 'high', status: 'closed' },
      { id: 'R-002', severity: 'high', status: 'mitigated' },
    ]});
    assert.equal(countHighRisks(c), 0);
  });
});

describe('sortCustomers', () => {
  it('sorts: at_risk customers appear before on_track, on_track before off_track', () => {
    const makeCs = (statuses) => statuses.map((s, i) =>
      makeCustomer({ history: makeWsHistory([
        { name: 'ADR', percent_complete: 0, progress_notes: '', blockers: '',
          status: s === 'off_track' ? 'red' : s === 'at_risk' ? 'yellow' : 'green' },
      ]), customer: { name: `Customer ${i}` } })
    );
    const customers = makeCs(['off_track', 'on_track', 'at_risk']);
    const sorted = sortCustomers(customers);
    assert.equal(deriveOverallStatus(sorted[0]), 'at_risk');
    assert.equal(deriveOverallStatus(sorted[1]), 'on_track');
    assert.equal(deriveOverallStatus(sorted[2]), 'off_track');
  });

  it('does not mutate the original array', () => {
    const customers = [makeCustomer({ customer: { name: 'A' } }), makeCustomer({ customer: { name: 'B' } })];
    const original = [...customers];
    sortCustomers(customers);
    assert.deepEqual(customers.map(c => c.customer.name), original.map(c => c.customer.name));
  });
});

describe('getLatestHistory', () => {
  it('returns history[0] (prepend-ordered — index 0 is most recent)', () => {
    const c = makeCustomer({ history: [
      { week_of: '2026-03-14' },
      { week_of: '2026-03-07' },
    ]});
    assert.equal(getLatestHistory(c).week_of, '2026-03-14');
  });

  it('returns null when history array is empty', () => {
    const c = makeCustomer({ history: [] });
    assert.equal(getLatestHistory(c), null);
  });
});
