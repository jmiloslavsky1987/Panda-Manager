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
  WORKSTREAM_CONFIG,
  getLatestHistory,
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

const latestWorkstreams = {
  adr: {
    inbound_integrations: { status: 'in_progress', percent_complete: 40 },
    configuration: { status: 'not_started', percent_complete: 0 },
    outbound_integrations: { status: 'not_started', percent_complete: 0 },
    workflow_configuration: { status: 'not_started', percent_complete: 0 },
  },
  biggy: {
    integrations: { status: 'in_progress', percent_complete: 50 },
    workflow_configuration: { status: 'not_started', percent_complete: 0 },
  },
};

describe('deriveOverallStatus', () => {
  it('returns off_track when any sub-workstream has status red or off_track', () => {
    const c = makeCustomer({ history: [{ week_ending: '2026-03-07', workstreams: {
      adr: { inbound_integrations: { status: 'red', percent_complete: 0 },
             configuration: { status: 'not_started', percent_complete: 0 },
             outbound_integrations: { status: 'not_started', percent_complete: 0 },
             workflow_configuration: { status: 'not_started', percent_complete: 0 } },
      biggy: { integrations: { status: 'not_started', percent_complete: 0 },
               workflow_configuration: { status: 'not_started', percent_complete: 0 } },
    }}] });
    assert.equal(deriveOverallStatus(c), 'off_track');
  });

  it('returns at_risk when any sub-workstream has status yellow, at_risk, or in_progress', () => {
    const c = makeCustomer({ history: [{ week_ending: '2026-03-07', workstreams: latestWorkstreams }] });
    assert.equal(deriveOverallStatus(c), 'at_risk');
  });

  it('returns on_track when all sub-workstreams are not_started or green', () => {
    const allNotStarted = {
      adr: {
        inbound_integrations: { status: 'not_started', percent_complete: 0 },
        configuration: { status: 'not_started', percent_complete: 0 },
        outbound_integrations: { status: 'not_started', percent_complete: 0 },
        workflow_configuration: { status: 'not_started', percent_complete: 0 },
      },
      biggy: {
        integrations: { status: 'not_started', percent_complete: 0 },
        workflow_configuration: { status: 'not_started', percent_complete: 0 },
      },
    };
    const c = makeCustomer({ history: [{ week_ending: '2026-03-07', workstreams: allNotStarted }] });
    assert.equal(deriveOverallStatus(c), 'on_track');
  });

  it('falls back to customer.status when no history entries exist', () => {
    const c = makeCustomer({ status: 'off_track', history: [] });
    assert.equal(deriveOverallStatus(c), 'off_track');
  });
});

describe('derivePercentComplete', () => {
  it('returns average of all 6 sub-workstream percent_complete values from history[0]', () => {
    // ADR: 40+0+0+0=40, Biggy: 50+0=50. Total=90, count=6, avg=15
    const c = makeCustomer({ history: [{ week_ending: '2026-03-07', workstreams: latestWorkstreams }] });
    assert.equal(derivePercentComplete(c), Math.round((40 + 0 + 0 + 0 + 50 + 0) / 6));
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
      makeCustomer({ history: [{ week_ending: '2026-03-07', workstreams: {
        adr: {
          inbound_integrations: { status: s === 'off_track' ? 'red' : s === 'at_risk' ? 'in_progress' : 'not_started', percent_complete: 0 },
          configuration: { status: 'not_started', percent_complete: 0 },
          outbound_integrations: { status: 'not_started', percent_complete: 0 },
          workflow_configuration: { status: 'not_started', percent_complete: 0 },
        },
        biggy: {
          integrations: { status: 'not_started', percent_complete: 0 },
          workflow_configuration: { status: 'not_started', percent_complete: 0 },
        },
      }}], customer: { name: `Customer ${i}` } })
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

describe('WORKSTREAM_CONFIG', () => {
  it('ADR has exactly 4 sub-workstreams with correct keys and labels', () => {
    const { subWorkstreams } = WORKSTREAM_CONFIG.adr;
    assert.equal(subWorkstreams.length, 4);
    assert.equal(subWorkstreams[0].key, 'inbound_integrations');
    assert.equal(subWorkstreams[0].label, 'Inbound Integrations');
    assert.equal(subWorkstreams[1].key, 'configuration');
    assert.equal(subWorkstreams[2].key, 'outbound_integrations');
    assert.equal(subWorkstreams[3].key, 'workflow_configuration');
    assert.equal(WORKSTREAM_CONFIG.adr.label, 'ADR');
  });

  it('Biggy has exactly 2 sub-workstreams with correct keys and labels', () => {
    const { subWorkstreams } = WORKSTREAM_CONFIG.biggy;
    assert.equal(subWorkstreams.length, 2);
    assert.equal(subWorkstreams[0].key, 'integrations');
    assert.equal(subWorkstreams[0].label, 'Integrations');
    assert.equal(subWorkstreams[1].key, 'workflow_configuration');
    assert.equal(WORKSTREAM_CONFIG.biggy.label, 'Biggy');
  });
});

describe('getLatestHistory', () => {
  it('returns history[0] (prepend-ordered — index 0 is most recent)', () => {
    const c = makeCustomer({ history: [
      { week_ending: '2026-03-14' },
      { week_ending: '2026-03-07' },
    ]});
    assert.equal(getLatestHistory(c).week_ending, '2026-03-14');
  });

  it('returns null when history array is empty', () => {
    const c = makeCustomer({ history: [] });
    assert.equal(getLatestHistory(c), null);
  });
});
