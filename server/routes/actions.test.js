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
  it('returns 201 with new action including server-assigned A-004 id', (t) => { t.todo(); });
  it('assignNextId increments correctly when existing max is A-003', (t) => { t.todo(); });
  it('writes updated YAML to Drive (writeYamlFile called once)', (t) => { t.todo(); });
  it('returns 422 when YAML validation fails', (t) => { t.todo(); });
});

describe('PATCH /api/customers/:id/actions/:actionId', () => {
  it('returns 200 with updated action when patching description', (t) => { t.todo(); });
  it('returns 200 with updated action when patching owner', (t) => { t.todo(); });
  it('marks action complete: sets status=completed and completed_date=today YYYY-MM-DD', (t) => { t.todo(); });
  it('reopens action: sets status=open and completed_date empty string', (t) => { t.todo(); });
  it('sets status=delayed when patching status field', (t) => { t.todo(); });
  it('returns 404 when actionId not found in YAML', (t) => { t.todo(); });
  it('applies partial patch — only provided fields updated, others preserved', (t) => { t.todo(); });
  it('writes updated YAML to Drive (writeYamlFile called once)', (t) => { t.todo(); });
});
