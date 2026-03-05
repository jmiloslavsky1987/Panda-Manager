// server/routes/history.test.js
'use strict';
const { describe, it, before, mock } = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

// Read the actual sample.yaml content — used as mock return value
const sampleYamlPath = path.join(__dirname, '..', 'fixtures', 'sample.yaml');
const sampleYamlContent = fs.readFileSync(sampleYamlPath, 'utf8');

// Mock driveService BEFORE requiring app (module-level mock)
const mockReadYamlFile = mock.fn(() => Promise.resolve(sampleYamlContent));
const mockWriteYamlFile = mock.fn(() => Promise.resolve());

// Inject mocks before app loads
before(() => {
  require.cache[require.resolve('../services/driveService')] = {
    id: require.resolve('../services/driveService'),
    filename: require.resolve('../services/driveService'),
    loaded: true,
    exports: {
      readYamlFile: mockReadYamlFile,
      writeYamlFile: mockWriteYamlFile,
      listCustomerFiles: mock.fn(() => Promise.resolve([])),
      checkDriveHealth: mock.fn(() => Promise.resolve({ ok: true })),
    },
  };
});

// Load app AFTER mocks are in place
let request;
before(async () => {
  const supertest = require('supertest');
  const app = require('../index');
  request = supertest(app);
});

const FAKE_FILE_ID = 'fake-file-id-123';

const TEST_ENTRY = {
  week_ending: '2026-03-14',
  workstreams: {
    adr: {
      inbound_integrations:   { status: 'green',       percent_complete: 40, progress_notes: 'Done', blockers: '' },
      outbound_integrations:  { status: 'not_started', percent_complete: 0,  progress_notes: '',     blockers: '' },
      normalization:          { status: 'not_started', percent_complete: 0,  progress_notes: '',     blockers: '' },
      platform_configuration: { status: 'not_started', percent_complete: 0,  progress_notes: '',     blockers: '' },
      correlation:            { status: 'not_started', percent_complete: 0,  progress_notes: '',     blockers: '' },
      training_and_uat:       { status: 'not_started', percent_complete: 0,  progress_notes: '',     blockers: '' },
    },
    biggy: {
      biggy_app_integration:      { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
      udc:                        { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
      real_time_integrations:     { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
      action_plans_configuration: { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
      workflows_configuration:    { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
    },
  },
  decisions: 'Test decision',
  outcomes:  'Test outcome',
  progress:  'Test progress',
};

describe('POST /api/customers/:id/history', () => {
  it('returns 201 with the submitted entry', async (t) => {
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/history`)
      .send(TEST_ENTRY)
      .set('Content-Type', 'application/json');

    assert.equal(res.status, 201);
    assert.equal(res.body.entry.week_ending, '2026-03-14');
  });

  it('prepends entry so history[0] is the new entry (not push)', async (t) => {
    mockWriteYamlFile.mock.resetCalls();

    await request
      .post(`/api/customers/${FAKE_FILE_ID}/history`)
      .send(TEST_ENTRY)
      .set('Content-Type', 'application/json');

    // Inspect the YAML string written to Drive (node:test mock API: calls[0].arguments[N])
    const writtenYamlString = mockWriteYamlFile.mock.calls[0].arguments[1];
    const writtenData = yaml.load(writtenYamlString);

    assert.equal(writtenData.history[0].week_ending, '2026-03-14');
    assert.equal(writtenData.history.length, 2);
  });

  it('calls writeYamlFile exactly once', async (t) => {
    mockWriteYamlFile.mock.resetCalls();

    await request
      .post(`/api/customers/${FAKE_FILE_ID}/history`)
      .send(TEST_ENTRY)
      .set('Content-Type', 'application/json');

    assert.equal(mockWriteYamlFile.mock.calls.length, 1);
  });
});
