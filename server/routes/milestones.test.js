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

describe('POST /api/customers/:id/milestones', () => {
  it('creates a new milestone and returns 201 with M-### id', async () => {
    mockWriteYamlFile.mock.resetCalls();
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/milestones`)
      .send({ name: 'Go-live readiness review', date: '2026-07-01', status: 'upcoming' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 201);
    assert.ok(res.body.milestone.id, 'milestone.id must be set');
    assert.match(res.body.milestone.id, /^M-\d{3}$/, 'milestone.id must be M-### format');
    assert.equal(res.body.milestone.name, 'Go-live readiness review');
  });

  it('assigns next sequential M-### id (max+1) when milestones already exist', async () => {
    // sample.yaml has M-001 and M-002 — new milestone should be M-003
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/milestones`)
      .send({ name: 'Sequential test milestone' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 201);
    assert.equal(res.body.milestone.id, 'M-003', 'expected M-003 as next after M-002');
  });

  it('rejects missing required fields with 400', async () => {
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/milestones`)
      .send({})
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('writes the new milestone to Drive atomically (writeYamlFile called once)', async () => {
    mockWriteYamlFile.mock.resetCalls();
    await request
      .post(`/api/customers/${FAKE_FILE_ID}/milestones`)
      .send({ name: 'Atomic write test' })
      .set('Content-Type', 'application/json');
    assert.equal(mockWriteYamlFile.mock.calls.length, 1, 'writeYamlFile must be called exactly once');
  });
});
