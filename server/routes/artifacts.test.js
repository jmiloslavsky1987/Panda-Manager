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
  it('returns 201 with new artifact including server-assigned X-002 id', (t) => { t.todo(); });
  it('initializes related_topics: [] and linked_actions: [] in new artifact', (t) => { t.todo(); });
  it('calls writeYamlFile exactly once', (t) => { t.todo(); });
});

describe('PATCH /api/customers/:id/artifacts/:artifactId', () => {
  it('returns 200 and updates artifact fields', (t) => { t.todo(); });
  it('auto-updates last_updated to today', (t) => { t.todo(); });
  it('returns 404 for unknown artifactId', (t) => { t.todo(); });
  it('calls writeYamlFile exactly once', (t) => { t.todo(); });
});
