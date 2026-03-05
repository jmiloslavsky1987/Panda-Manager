// server/routes/milestones.test.js
'use strict';
const { describe, it, before, mock } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const sampleYamlPath = path.join(__dirname, '..', 'fixtures', 'sample.yaml');
const sampleYamlContent = fs.readFileSync(sampleYamlPath, 'utf8');

const mockReadYamlFile = mock.fn(() => Promise.resolve(sampleYamlContent));
const mockWriteYamlFile = mock.fn(() => Promise.resolve());

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

let request;
before(async () => {
  const supertest = require('supertest');
  const app = require('../index');
  request = supertest(app);
});

const FAKE_FILE_ID = 'fake-file-id-456';

describe('PATCH /api/customers/:id/milestones/:milestoneId', () => {
  it('returns 200 with updated milestone when valid milestoneId provided', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/milestones/M-001`)
      .send({ status: 'in_progress' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.equal(res.body.milestone.id, 'M-001');
    assert.equal(res.body.milestone.status, 'in_progress');
  });

  it('returns 404 when milestoneId not found in customer YAML', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/milestones/M-999`)
      .send({ status: 'complete' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('applies partial patch — only provided fields updated, others preserved', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/milestones/M-001`)
      .send({ notes: 'Access credentials received' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.equal(res.body.milestone.notes, 'Access credentials received');
    // Original fields preserved
    assert.equal(res.body.milestone.name, 'Environment Access Confirmed');
    assert.equal(res.body.milestone.target_date, '2026-03-31');
  });

  it('writes updated YAML back to Drive atomically (mocked driveService)', async () => {
    mockWriteYamlFile.mock.resetCalls();
    await request
      .patch(`/api/customers/${FAKE_FILE_ID}/milestones/M-002`)
      .send({ status: 'complete' })
      .set('Content-Type', 'application/json');
    assert.equal(mockWriteYamlFile.mock.calls.length, 1, 'writeYamlFile must be called exactly once');
  });
});
