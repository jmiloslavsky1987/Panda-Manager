// server/routes/risks.test.js
'use strict';
const { describe, it, before, mock } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

// Read the actual sample.yaml content — used as mock return value
const sampleYamlPath = path.join(__dirname, '..', 'fixtures', 'sample.yaml');
const sampleYamlContent = fs.readFileSync(sampleYamlPath, 'utf8');

// Mock driveService BEFORE requiring app (module-level mock)
// Override driveService in require cache before loading app
const mockReadYamlFile = mock.fn(() => Promise.resolve(sampleYamlContent));
const mockWriteYamlFile = mock.fn(() => Promise.resolve());

// Inject mocks before app loads
before(() => {
  // Pre-populate require cache with mock driveService
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

describe('PATCH /api/customers/:id/risks/:riskId', () => {
  it('returns 200 with updated risk when valid riskId provided', async () => {
    mockWriteYamlFile.mock.resetCalls();
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/risks/R-001`)
      .send({ status: 'mitigated' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.equal(res.body.risk.id, 'R-001');
    assert.equal(res.body.risk.status, 'mitigated');
  });

  it('returns 404 when riskId not found in customer YAML', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/risks/R-999`)
      .send({ status: 'closed' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('applies partial patch — only provided fields updated, others preserved', async () => {
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/risks/R-001`)
      .send({ mitigation: 'Updated mitigation text' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.equal(res.body.risk.mitigation, 'Updated mitigation text');
    // Original fields preserved
    assert.equal(res.body.risk.severity, 'high');
    assert.equal(res.body.risk.id, 'R-001');
  });

  it('writes updated YAML back to Drive atomically (mocked driveService)', async () => {
    mockWriteYamlFile.mock.resetCalls();
    await request
      .patch(`/api/customers/${FAKE_FILE_ID}/risks/R-001`)
      .send({ status: 'closed' })
      .set('Content-Type', 'application/json');
    assert.equal(mockWriteYamlFile.mock.calls.length, 1, 'writeYamlFile must be called exactly once');
  });

  it('returns 422 when patch would create invalid YAML', async () => {
    // Force readYamlFile to return content missing required keys
    mockReadYamlFile.mock.mockImplementationOnce(() =>
      Promise.resolve('customer:\n  name: "Broken"\nstatus: "on_track"\n')
    );
    const res = await request
      .patch(`/api/customers/${FAKE_FILE_ID}/risks/R-001`)
      .send({ status: 'closed' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 422);
  });
});

describe('POST /api/customers/:id/risks', () => {
  it('creates a new risk and returns 201 with R-### id', async () => {
    mockWriteYamlFile.mock.resetCalls();
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/risks`)
      .send({ description: 'New integration risk', owner: 'Alice', severity: 'high', status: 'open', mitigation: '' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 201);
    assert.ok(res.body.risk.id, 'risk.id must be set');
    assert.match(res.body.risk.id, /^R-\d{3}$/, 'risk.id must be R-### format');
    assert.equal(res.body.risk.description, 'New integration risk');
  });

  it('assigns next sequential R-### id (max+1) when risks already exist', async () => {
    // sample.yaml has R-001 as max — new risk should be R-002
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/risks`)
      .send({ description: 'Sequential ID test' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 201);
    assert.equal(res.body.risk.id, 'R-002', 'expected R-002 as next after R-001');
  });

  it('rejects missing required fields with 400', async () => {
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/risks`)
      .send({})
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('writes the new risk to Drive atomically (writeYamlFile called once)', async () => {
    mockWriteYamlFile.mock.resetCalls();
    await request
      .post(`/api/customers/${FAKE_FILE_ID}/risks`)
      .send({ description: 'Atomic write test' })
      .set('Content-Type', 'application/json');
    assert.equal(mockWriteYamlFile.mock.calls.length, 1, 'writeYamlFile must be called exactly once');
  });
});
