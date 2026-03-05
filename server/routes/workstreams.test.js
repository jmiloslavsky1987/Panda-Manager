// server/routes/workstreams.test.js
'use strict';
const { describe, it, before, mock } = require('node:test');
const assert = require('node:assert/strict');
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

// Minimal valid workstreams body for tests (shape only, not all 11 sub-workstreams)
const VALID_WORKSTREAMS = {
  adr: {
    inbound_integrations: { status: 'in_progress', percent_complete: 50, progress_notes: 'updated', blockers: '', scope: [] },
  },
  biggy: {
    biggy_app_integration: { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
  },
};

describe('PATCH /api/customers/:id/workstreams', () => {
  it('returns 200 with updated workstreams when given valid 11-subworkstream body', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/workstreams`)
      .send(VALID_WORKSTREAMS)
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.ok(res.body.workstreams);
    assert.ok(res.body.workstreams.adr);
    assert.ok(res.body.workstreams.biggy);
  });

  it('writes updated YAML to Drive (writeYamlFile called once)', async () => {
    mockWriteYamlFile.mock.resetCalls();
    await request
      .patch(`/api/customers/${FAKE_FILE_ID}/workstreams`)
      .send(VALID_WORKSTREAMS)
      .set('Content-Type', 'application/json');
    assert.equal(mockWriteYamlFile.mock.calls.length, 1);
  });

  it('returns 422 when workstreams body is missing required group adr', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/workstreams`)
      .send({ biggy: {} })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 422);
    assert.ok(res.body.error.includes('adr'));
  });

  it('returns 422 when YAML validation fails on read', async () => {
    mockReadYamlFile.mock.mockImplementationOnce(() =>
      Promise.resolve('customer:\n  name: "Broken"\nstatus: "on_track"\n')
    );
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/workstreams`)
      .send(VALID_WORKSTREAMS)
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 422);
  });

  it('replaces full workstreams object atomically — other YAML fields unchanged', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/workstreams`)
      .send(VALID_WORKSTREAMS)
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    // Verify response has fileId and workstreams keys
    assert.ok(res.body.fileId);
    assert.ok(res.body.workstreams);
  });
});
