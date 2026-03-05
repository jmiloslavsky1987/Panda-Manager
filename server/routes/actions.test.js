// server/routes/actions.test.js
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

describe('POST /api/customers/:id/actions', () => {
  it('returns 201 with new action including server-assigned A-004 id', async () => {
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/actions`)
      .send({ description: 'Test action', owner: 'Alice', due: '2026-04-01', workstream: 'adr' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 201);
    assert.equal(res.body.action.id, 'A-004');
    assert.equal(res.body.action.status, 'open');
    assert.equal(res.body.action.completed_date, '');
  });

  it('assignNextId increments correctly when existing max is A-003', async () => {
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/actions`)
      .send({ description: 'Another action', owner: 'Bob', due: '2026-04-15', workstream: 'biggy' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 201);
    assert.equal(res.body.action.id, 'A-004');
  });

  it('writes updated YAML to Drive (writeYamlFile called once)', async () => {
    mockWriteYamlFile.mock.resetCalls();
    await request
      .post(`/api/customers/${FAKE_FILE_ID}/actions`)
      .send({ description: 'Write test', owner: 'Carol', due: '2026-05-01', workstream: 'adr' })
      .set('Content-Type', 'application/json');
    assert.equal(mockWriteYamlFile.mock.calls.length, 1);
  });

  it('returns 422 when YAML validation fails', async () => {
    mockReadYamlFile.mock.mockImplementationOnce(() =>
      Promise.resolve('customer:\n  name: "Broken"\nstatus: "on_track"\n')
    );
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/actions`)
      .send({ description: 'Test action', owner: 'Alice', due: '2026-04-01', workstream: 'adr' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 422);
  });
});

describe('PATCH /api/customers/:id/actions/:actionId', () => {
  it('returns 200 with updated action when patching description', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/actions/A-002`)
      .send({ description: 'Updated desc' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.equal(res.body.action.description, 'Updated desc');
    assert.equal(res.body.action.id, 'A-002');
  });

  it('returns 200 with updated action when patching owner', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/actions/A-002`)
      .send({ owner: 'New Owner' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.equal(res.body.action.owner, 'New Owner');
  });

  it('marks action complete: sets status=completed and completed_date=today YYYY-MM-DD', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/actions/A-002`)
      .send({ status: 'completed', completed_date: today })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.equal(res.body.action.status, 'completed');
    assert.equal(res.body.action.completed_date, today);
  });

  it('reopens action: sets status=open and completed_date empty string', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/actions/A-001`)
      .send({ status: 'open', completed_date: '' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.equal(res.body.action.status, 'open');
    assert.equal(res.body.action.completed_date, '');
  });

  it('sets status=delayed when patching status field', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/actions/A-002`)
      .send({ status: 'delayed' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.equal(res.body.action.status, 'delayed');
  });

  it('returns 404 when actionId not found in YAML', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/actions/A-999`)
      .send({ status: 'open' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('applies partial patch — only provided fields updated, others preserved', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/actions/A-002`)
      .send({ owner: 'Patched' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.equal(res.body.action.owner, 'Patched');
    assert.equal(res.body.action.description, 'Schedule kickoff call with customer team');
  });

  it('writes updated YAML to Drive (writeYamlFile called once)', async () => {
    mockWriteYamlFile.mock.resetCalls();
    await request
      .patch(`/api/customers/${FAKE_FILE_ID}/actions/A-002`)
      .send({ status: 'delayed' })
      .set('Content-Type', 'application/json');
    assert.equal(mockWriteYamlFile.mock.calls.length, 1);
  });
});
