// server/routes/customers.test.js
// Tests for GET/PUT /api/customers/:id/yaml — raw YAML read/write endpoints.
// Run: node --test routes/customers.test.js
// Requires: Node 18+ (node:test built-in), supertest

'use strict';

const { describe, it, before }  = require('node:test');
const assert                     = require('node:assert/strict');
const path                       = require('path');
const fs                         = require('fs');

// ── Fixture ──────────────────────────────────────────────────────────────────

const sampleYamlPath    = path.join(__dirname, '..', 'fixtures', 'sample.yaml');
const sampleYamlContent = fs.readFileSync(sampleYamlPath, 'utf8');

// Invalid YAML — parse error (unclosed block)
const badParseYaml = 'customer:\n  name: Bad\n  unclosed: [missing bracket\n';

// Valid YAML that is missing required top-level keys
const missingKeyYaml = 'customer:\n  name: X\n';

// ── Mocks (must be injected before app loads) ─────────────────────────────────

const { mock } = require('node:test');

const mockReadYamlFile  = mock.fn(() => Promise.resolve(sampleYamlContent));
const mockWriteYamlFile = mock.fn(() => Promise.resolve());

before(() => {
  require.cache[require.resolve('../services/driveService')] = {
    id:       require.resolve('../services/driveService'),
    filename: require.resolve('../services/driveService'),
    loaded:   true,
    exports: {
      readYamlFile:      mockReadYamlFile,
      writeYamlFile:     mockWriteYamlFile,
      listCustomerFiles: mock.fn(() => Promise.resolve([])),
      checkDriveHealth:  mock.fn(() => Promise.resolve({ ok: true })),
      createYamlFile:    mock.fn(() => Promise.resolve({ id: 'new-file-id' })),
    },
  };
});

let request;
before(async () => {
  const supertest = require('supertest');
  const app       = require('../index');
  request = supertest(app);
});

const FILE_ID = 'fake-yaml-file-id';

// ── GET /api/customers/:id/yaml ───────────────────────────────────────────────

describe('GET /api/customers/:id/yaml', () => {
  it('returns 200 with { content: string } containing the raw YAML', async () => {
    mockReadYamlFile.mock.resetCalls();

    const res = await request
      .get(`/api/customers/${FILE_ID}/yaml`)
      .set('Accept', 'application/json');

    assert.equal(res.status, 200, `expected 200, got ${res.status}`);
    assert.ok(typeof res.body.content === 'string', 'content should be a string');
    assert.ok(res.body.content.includes('customer:'), 'content should look like YAML');
    assert.equal(mockReadYamlFile.mock.calls.length, 1, 'driveService.readYamlFile should be called once');
    assert.equal(
      mockReadYamlFile.mock.calls[0].arguments[0],
      FILE_ID,
      'readYamlFile should be called with the file ID from the URL'
    );
  });
});

// ── PUT /api/customers/:id/yaml ───────────────────────────────────────────────

describe('PUT /api/customers/:id/yaml', () => {
  it('returns 200 and writes to Drive when given valid YAML', async () => {
    mockWriteYamlFile.mock.resetCalls();

    const res = await request
      .put(`/api/customers/${FILE_ID}/yaml`)
      .send({ content: sampleYamlContent })
      .set('Content-Type', 'application/json');

    assert.equal(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(typeof res.body.content === 'string', 'response should echo { content }');
    assert.equal(
      mockWriteYamlFile.mock.calls.length, 1,
      'driveService.writeYamlFile should be called once'
    );
    assert.equal(
      mockWriteYamlFile.mock.calls[0].arguments[0],
      FILE_ID,
      'writeYamlFile should be called with the correct file ID'
    );
    // Raw content is written as-is (not re-serialized) to preserve formatting
    assert.equal(
      mockWriteYamlFile.mock.calls[0].arguments[1],
      sampleYamlContent,
      'writeYamlFile should receive the exact content string sent by the client'
    );
  });

  it('returns 422 when content has a YAML parse error', async () => {
    mockWriteYamlFile.mock.resetCalls();

    const res = await request
      .put(`/api/customers/${FILE_ID}/yaml`)
      .send({ content: badParseYaml })
      .set('Content-Type', 'application/json');

    assert.equal(res.status, 422, `expected 422, got ${res.status}`);
    assert.ok(
      res.body.error && res.body.error.includes('YAML parse error'),
      `error should mention "YAML parse error", got: ${res.body.error}`
    );
    assert.equal(mockWriteYamlFile.mock.calls.length, 0, 'writeYamlFile must NOT be called on parse error');
  });

  it('returns 422 when content is valid YAML but missing required keys', async () => {
    mockWriteYamlFile.mock.resetCalls();

    const res = await request
      .put(`/api/customers/${FILE_ID}/yaml`)
      .send({ content: missingKeyYaml })
      .set('Content-Type', 'application/json');

    assert.equal(res.status, 422, `expected 422, got ${res.status}`);
    assert.ok(
      res.body.error && res.body.error.toLowerCase().includes('missing'),
      `error should mention missing keys, got: ${res.body.error}`
    );
    assert.equal(mockWriteYamlFile.mock.calls.length, 0, 'writeYamlFile must NOT be called on validation error');
  });

  it('returns 400 when content is not a string', async () => {
    mockWriteYamlFile.mock.resetCalls();

    const res = await request
      .put(`/api/customers/${FILE_ID}/yaml`)
      .send({ content: 12345 })
      .set('Content-Type', 'application/json');

    assert.equal(res.status, 400, `expected 400, got ${res.status}`);
    assert.ok(
      res.body.error && res.body.error.includes('string'),
      `error should say content must be a string, got: ${res.body.error}`
    );
    assert.equal(mockWriteYamlFile.mock.calls.length, 0, 'writeYamlFile must NOT be called');
  });
});

// ── POST /api/customers ───────────────────────────────────────────────────────

describe('POST /api/customers', () => {
  it('returns 201 with fileId and customer data when customerName is provided', { todo: true });
  it('returns 422 with error when customerName is missing or empty', { todo: true });
  it('returns 201 and seeds customer from yamlContent when base64 YAML string is provided', { todo: true });
});
