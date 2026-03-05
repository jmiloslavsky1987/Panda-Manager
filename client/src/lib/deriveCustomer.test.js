// client/src/lib/deriveCustomer.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WORKSTREAM_CONFIG,
  deriveOverallStatus,
  derivePercentComplete,
  deriveDaysToGoLive,
  countOpenActions,
  countHighRisks,
  sortCustomers,
  getLatestHistory,
  getLatestWorkstreams,
} from './deriveCustomer.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeCustomer = (overrides = {}) => ({
  customer: { name: 'Test Corp' },
  project: { go_live_date: '2030-01-01', overall_percent_complete: 50 },
  status: 'not_started',
  actions: [],
  risks: [],
  history: [],
  workstreams: {},
  ...overrides,
});

// Build a full workstreams object with all 11 sub-workstreams set to the given status
function makeWorkstreams(statusByKey = {}) {
  const ws = { adr: {}, biggy: {} };
  for (const [groupKey, group] of Object.entries(WORKSTREAM_CONFIG)) {
    for (const { key } of group.subWorkstreams) {
      ws[groupKey][key] = {
        status:           statusByKey[key] ?? 'not_started',
        percent_complete: statusByKey[key] === 'on_track' ? 50 : 0,
        progress_notes:   '',
        blockers:         '',
      };
    }
  }
  return ws;
}

// ── WORKSTREAM_CONFIG ─────────────────────────────────────────────────────────

describe('WORKSTREAM_CONFIG', () => {
  it('ADR has exactly 6 sub-workstreams', () => {
    assert.equal(WORKSTREAM_CONFIG.adr.subWorkstreams.length, 6);
  });

  it('ADR sub-workstream keys are correct', () => {
    const keys = WORKSTREAM_CONFIG.adr.subWorkstreams.map(s => s.key);
    assert.deepEqual(keys, [
      'inbound_integrations', 'outbound_integrations', 'normalization',
      'platform_configuration', 'correlation', 'training_and_uat',
    ]);
  });

  it('Biggy has exactly 5 sub-workstreams', () => {
    assert.equal(WORKSTREAM_CONFIG.biggy.subWorkstreams.length, 5);
  });

  it('Biggy sub-workstream keys are correct', () => {
    const keys = WORKSTREAM_CONFIG.biggy.subWorkstreams.map(s => s.key);
    assert.deepEqual(keys, [
      'biggy_app_integration', 'udc', 'real_time_integrations',
      'action_plans_configuration', 'workflows_configuration',
    ]);
  });

  it('inbound and outbound integrations have hasScope: true', () => {
    const inbound  = WORKSTREAM_CONFIG.adr.subWorkstreams.find(s => s.key === 'inbound_integrations');
    const outbound = WORKSTREAM_CONFIG.adr.subWorkstreams.find(s => s.key === 'outbound_integrations');
    assert.equal(inbound.hasScope,  true);
    assert.equal(outbound.hasScope, true);
  });
});

// ── getLatestWorkstreams ──────────────────────────────────────────────────────

describe('getLatestWorkstreams', () => {
  it('returns 11 entries (6 ADR + 5 Biggy) for a fully populated workstreams object', () => {
    const c = makeCustomer({ workstreams: makeWorkstreams() });
    const ws = getLatestWorkstreams(c);
    assert.equal(ws.length, 11);
    assert.equal(ws.filter(w => w.group === 'adr').length,   6);
    assert.equal(ws.filter(w => w.group === 'biggy').length, 5);
  });

  it('normalizes YAML green/yellow/red to on_track/at_risk/off_track', () => {
    const workstreams = makeWorkstreams();
    workstreams.adr.inbound_integrations.status  = 'red';
    workstreams.adr.outbound_integrations.status = 'yellow';
    workstreams.adr.normalization.status         = 'green';
    const c  = makeCustomer({ workstreams });
    const ws = getLatestWorkstreams(c);
    assert.equal(ws.find(w => w.key === 'inbound_integrations').status,  'off_track');
    assert.equal(ws.find(w => w.key === 'outbound_integrations').status, 'at_risk');
    assert.equal(ws.find(w => w.key === 'normalization').status,         'on_track');
  });

  it('returns 11 default not_started entries when workstreams is empty object', () => {
    const ws = getLatestWorkstreams(makeCustomer({ workstreams: {} }));
    assert.equal(ws.length, 11);
    assert.ok(ws.every(w => w.status === 'not_started'));
  });

  it('returns empty array when workstreams is null', () => {
    const c = makeCustomer({ workstreams: null });
    assert.deepEqual(getLatestWorkstreams(c), []);
  });

  it('scope is null for non-scope sub-workstreams, array for scope ones', () => {
    const c  = makeCustomer({ workstreams: makeWorkstreams() });
    const ws = getLatestWorkstreams(c);
    const inbound = ws.find(w => w.key === 'inbound_integrations');
    const correl  = ws.find(w => w.key === 'correlation');
    assert.ok(Array.isArray(inbound.scope), 'inbound scope should be array');
    assert.equal(correl.scope, null);
  });
});

// ── deriveOverallStatus ───────────────────────────────────────────────────────

describe('deriveOverallStatus', () => {
  it('returns off_track when any sub-workstream is off_track (red)', () => {
    const ws = makeWorkstreams({ inbound_integrations: 'red' });
    const c  = makeCustomer({ workstreams: ws });
    assert.equal(deriveOverallStatus(c), 'off_track');
  });

  it('returns at_risk when any sub-workstream is at_risk (yellow)', () => {
    const ws = makeWorkstreams({ outbound_integrations: 'yellow' });
    const c  = makeCustomer({ workstreams: ws });
    assert.equal(deriveOverallStatus(c), 'at_risk');
  });

  it('returns not_started when all sub-workstreams are not_started', () => {
    const c = makeCustomer({ workstreams: makeWorkstreams() });
    assert.equal(deriveOverallStatus(c), 'not_started');
  });

  it('returns on_track when some are in_progress (none at_risk/off_track)', () => {
    const ws = makeWorkstreams({ inbound_integrations: 'in_progress' });
    const c  = makeCustomer({ workstreams: ws });
    assert.equal(deriveOverallStatus(c), 'on_track');
  });

  it('returns not_started when workstreams is empty object (all defaults)', () => {
    const c = makeCustomer({ workstreams: {}, status: 'off_track' });
    assert.equal(deriveOverallStatus(c), 'not_started');
  });

  it('falls back to customer.status when workstreams is null', () => {
    const c = makeCustomer({ workstreams: null, status: 'off_track' });
    assert.equal(deriveOverallStatus(c), 'off_track');
  });
});

// ── derivePercentComplete ─────────────────────────────────────────────────────

describe('derivePercentComplete', () => {
  it('averages percent_complete across all 11 sub-workstreams', () => {
    // Set inbound_integrations to 100% — rest are 0%. Avg = 100/11 ≈ 9
    const ws = makeWorkstreams();
    ws.adr.inbound_integrations.percent_complete = 100;
    const c  = makeCustomer({ workstreams: ws });
    assert.equal(derivePercentComplete(c), Math.round(100 / 11));
  });

  it('returns 0 when workstreams is empty object (all 11 at 0%)', () => {
    const c = makeCustomer({ workstreams: {}, project: { overall_percent_complete: 35 } });
    assert.equal(derivePercentComplete(c), 0);
  });

  it('falls back to project.overall_percent_complete when workstreams is null', () => {
    const c = makeCustomer({ workstreams: null, project: { overall_percent_complete: 35 } });
    assert.equal(derivePercentComplete(c), 35);
  });

  it('returns 0 for empty workstreams and no project fallback', () => {
    const c = makeCustomer({ workstreams: {}, project: {} });
    assert.equal(derivePercentComplete(c), 0);
  });
});

// ── deriveDaysToGoLive ────────────────────────────────────────────────────────

describe('deriveDaysToGoLive', () => {
  it('returns positive integer for future go_live_date', () => {
    const c = makeCustomer({ project: { go_live_date: '2030-01-01' } });
    assert.ok(deriveDaysToGoLive(c) > 0);
  });

  it('returns negative integer for past go_live_date', () => {
    const c = makeCustomer({ project: { go_live_date: '2020-01-01' } });
    assert.ok(deriveDaysToGoLive(c) < 0);
  });

  it('returns null when project.go_live_date is missing', () => {
    const c = makeCustomer({ project: {} });
    assert.equal(deriveDaysToGoLive(c), null);
  });
});

// ── countOpenActions ──────────────────────────────────────────────────────────

describe('countOpenActions', () => {
  it('counts only actions where status !== completed', () => {
    const c = makeCustomer({ actions: [
      { id: 'A-001', status: 'completed' },
      { id: 'A-002', status: 'open' },
      { id: 'A-003', status: 'delayed' },
    ]});
    assert.equal(countOpenActions(c), 2);
  });

  it('returns 0 for empty actions', () => {
    assert.equal(countOpenActions(makeCustomer()), 0);
  });
});

// ── countHighRisks ────────────────────────────────────────────────────────────

describe('countHighRisks', () => {
  it('counts only high severity + open status risks', () => {
    const c = makeCustomer({ risks: [
      { id: 'R-001', severity: 'high',   status: 'open'      },
      { id: 'R-002', severity: 'high',   status: 'mitigated' },
      { id: 'R-003', severity: 'medium', status: 'open'      },
    ]});
    assert.equal(countHighRisks(c), 1);
  });

  it('returns 0 when no high+open risks', () => {
    const c = makeCustomer({ risks: [
      { id: 'R-001', severity: 'high', status: 'closed' },
    ]});
    assert.equal(countHighRisks(c), 0);
  });
});

// ── sortCustomers ─────────────────────────────────────────────────────────────

describe('sortCustomers', () => {
  it('sorts: at_risk before on_track before not_started before off_track', () => {
    const makeC = (wsStatus, name) => makeCustomer({
      customer: { name },
      workstreams: makeWorkstreams({ inbound_integrations: wsStatus }),
    });
    const customers = [
      makeC('not_started', 'NS'),
      makeC('red',         'OT_OFF'),
      makeC('in_progress', 'IP'),
      makeC('yellow',      'AR'),
    ];
    const sorted = sortCustomers(customers);
    assert.equal(deriveOverallStatus(sorted[0]), 'at_risk');
    assert.equal(deriveOverallStatus(sorted[1]), 'on_track');
    assert.equal(deriveOverallStatus(sorted[2]), 'not_started');
    assert.equal(deriveOverallStatus(sorted[3]), 'off_track');
  });

  it('does not mutate the original array', () => {
    const customers = [makeCustomer({ customer: { name: 'A' } }), makeCustomer({ customer: { name: 'B' } })];
    const original  = [...customers];
    sortCustomers(customers);
    assert.deepEqual(customers.map(c => c.customer.name), original.map(c => c.customer.name));
  });
});

// ── getLatestHistory ──────────────────────────────────────────────────────────

describe('getLatestHistory', () => {
  it('returns history[0] (prepend-ordered — index 0 is most recent)', () => {
    const c = makeCustomer({ history: [
      { week_of: '2026-03-14' },
      { week_of: '2026-03-07' },
    ]});
    assert.equal(getLatestHistory(c).week_of, '2026-03-14');
  });

  it('returns null when history array is empty', () => {
    assert.equal(getLatestHistory(makeCustomer()), null);
  });
});
