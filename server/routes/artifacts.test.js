// server/routes/artifacts.test.js
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

describe('POST /api/customers/:id/artifacts', () => {
  it('returns 201 with new artifact including server-assigned X-002 id', async () => {
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/artifacts`)
      .send({ type: 'document', title: 'Test Doc', description: '', status: 'active', owner: 'Alice' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 201);
    assert.equal(res.body.artifact.id, 'X-002');
    assert.equal(res.body.artifact.type, 'document');
    assert.equal(res.body.artifact.status, 'active');
  });

  it('initializes related_topics: [] and linked_actions: [] in new artifact', async () => {
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/artifacts`)
      .send({ type: 'document', title: 'Test Doc', description: '', status: 'active', owner: 'Alice' })
      .set('Content-Type', 'application/json');
    assert.ok(Array.isArray(res.body.artifact.related_topics));
    assert.equal(res.body.artifact.related_topics.length, 0);
    assert.ok(Array.isArray(res.body.artifact.linked_actions));
    assert.equal(res.body.artifact.linked_actions.length, 0);
  });

  it('calls writeYamlFile exactly once', async () => {
    mockWriteYamlFile.mock.resetCalls();
    await request
      .post(`/api/customers/${FAKE_FILE_ID}/artifacts`)
      .send({ type: 'document', title: 'Test Doc', description: '', status: 'active', owner: 'Alice' })
      .set('Content-Type', 'application/json');
    assert.equal(mockWriteYamlFile.mock.calls.length, 1);
  });
});

describe('PATCH /api/customers/:id/artifacts/:artifactId', () => {
  it('returns 200 and updates artifact fields', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/artifacts/X-001`)
      .send({ title: 'Updated Title', owner: 'New Owner' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.equal(res.body.artifact.title, 'Updated Title');
    assert.equal(res.body.artifact.owner, 'New Owner');
  });

  it('auto-updates last_updated to today', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/artifacts/X-001`)
      .send({ title: 'Updated Title', owner: 'New Owner' })
      .set('Content-Type', 'application/json');
    assert.equal(res.body.artifact.last_updated, new Date().toISOString().split('T')[0]);
  });

  it('returns 404 for unknown artifactId', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/artifacts/X-999`)
      .send({ title: 'x' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 404);
    assert.ok(res.body.error.includes('X-999'));
  });

  it('calls writeYamlFile exactly once', async () => {
    mockWriteYamlFile.mock.resetCalls();
    await request
      .patch(`/api/customers/${FAKE_FILE_ID}/artifacts/X-001`)
      .send({ title: 'Updated Title' })
      .set('Content-Type', 'application/json');
    assert.equal(mockWriteYamlFile.mock.calls.length, 1);
  });
});
