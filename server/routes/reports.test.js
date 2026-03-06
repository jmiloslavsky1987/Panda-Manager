// server/routes/reports.test.js
'use strict';
const { describe, it, before, mock } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('path');
const fs     = require('fs');

// Read the actual sample.yaml content — used as mock return value
const sampleYamlPath    = path.join(__dirname, '..', 'fixtures', 'sample.yaml');
const sampleYamlContent = fs.readFileSync(sampleYamlPath, 'utf8');

// Mock driveService and pptxService BEFORE requiring app (module-level mock)
const mockReadYamlFile    = mock.fn(() => Promise.resolve(sampleYamlContent));
const mockWriteYamlFile   = mock.fn(() => Promise.resolve());
const mockGeneratePptxB64 = mock.fn((_customer, type) =>
  Promise.resolve({
    base64:   Buffer.from('fake-pptx-content').toString('base64'),
    filename: `Test_${type}_2026-03-06.pptx`,
  })
);

before(() => {
  require.cache[require.resolve('../services/driveService')] = {
    id:       require.resolve('../services/driveService'),
    filename: require.resolve('../services/driveService'),
    loaded:   true,
    exports: {
      readYamlFile:     mockReadYamlFile,
      writeYamlFile:    mockWriteYamlFile,
      listCustomerFiles: mock.fn(() => Promise.resolve([])),
      checkDriveHealth:  mock.fn(() => Promise.resolve({ ok: true })),
    },
  };

  require.cache[require.resolve('../services/pptxService')] = {
    id:       require.resolve('../services/pptxService'),
    filename: require.resolve('../services/pptxService'),
    loaded:   true,
    exports: { generatePptxBase64: mockGeneratePptxB64 },
  };
});

let request;
before(async () => {
  const supertest = require('supertest');
  const app       = require('../index');
  request         = supertest(app);
});

const FAKE_FILE_ID = 'fake-file-id-123';

describe('POST /api/customers/:id/reports/pptx', () => {
  it('returns 200 with base64 and filename for elt_external type', async () => {
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/reports/pptx`)
      .send({ type: 'elt_external' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.base64 === 'string', 'base64 should be a string');
    assert.ok(res.body.base64.length > 0, 'base64 should be non-empty');
    assert.ok(typeof res.body.filename === 'string', 'filename should be a string');
    assert.match(res.body.filename, /\.pptx$/, 'filename should end with .pptx');
  });

  it('returns 200 with base64 and filename for elt_internal type', async () => {
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/reports/pptx`)
      .send({ type: 'elt_internal' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.base64 === 'string', 'base64 should be a string');
    assert.ok(res.body.base64.length > 0, 'base64 should be non-empty');
    assert.match(res.body.filename, /\.pptx$/, 'filename should end with .pptx');
  });

  it('returns 400 when type is invalid', async () => {
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/reports/pptx`)
      .send({ type: 'weekly' })
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 400);
    assert.ok(res.body.error, 'should return an error message');
  });

  it('returns 400 when type is missing', async () => {
    const res = await request
      .post(`/api/customers/${FAKE_FILE_ID}/reports/pptx`)
      .send({})
      .set('Content-Type', 'application/json');
    assert.equal(res.status, 400);
    assert.ok(res.body.error, 'should return an error message');
  });
});
