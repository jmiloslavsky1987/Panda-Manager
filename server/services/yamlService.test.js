// Wave 0 test stubs — behaviors defined in Plan 01, assertions filled in Plan 03
// Run: node --test server/services/yamlService.test.js
// Requires: Node 18+ (node:test built-in)

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  parseYaml,
  serializeYaml,
  validateYaml,
  assignNextId,
  ValidationError,
} = require('../services/yamlService');

// ---------------------------------------------------------------------------
// Group: parseYaml — INFRA-03 coercion prevention
// ---------------------------------------------------------------------------

describe('parseYaml', () => {

  test('parseYaml() parses "status: on" as string "on" not boolean true', () => {
    const result = parseYaml('status: on\n');
    assert.strictEqual(typeof result.status, 'string', 'status should be typeof string');
    assert.strictEqual(result.status, 'on', 'status should equal "on"');
  });

  test('parseYaml() parses "active: yes" as string "yes" not boolean true', () => {
    const result = parseYaml('active: yes\n');
    assert.strictEqual(typeof result.active, 'string', 'active should be typeof string');
    assert.strictEqual(result.active, 'yes', 'active should equal "yes"');
  });

  test('parseYaml() parses "flag: no" as string "no" not boolean false', () => {
    const result = parseYaml('flag: no\n');
    assert.strictEqual(typeof result.flag, 'string', 'flag should be typeof string');
    assert.strictEqual(result.flag, 'no', 'flag should equal "no"');
  });

});

// ---------------------------------------------------------------------------
// Group: serializeYaml — INFRA-03 round-trip fidelity
// ---------------------------------------------------------------------------

describe('serializeYaml', () => {

  test('serializeYaml() preserves key insertion order (sortKeys: false)', () => {
    const obj = { b: 2, a: 1 };
    const output = serializeYaml(obj);
    const bIndex = output.indexOf('b:');
    const aIndex = output.indexOf('a:');
    assert.ok(bIndex !== -1, '"b:" should appear in output');
    assert.ok(aIndex !== -1, '"a:" should appear in output');
    assert.ok(bIndex < aIndex, '"b:" should appear before "a:" (sortKeys:false preserves insertion order)');
  });

  test('serializeYaml() does not wrap long lines (lineWidth: -1)', () => {
    const longValue = 'x'.repeat(200);
    const obj = { description: longValue };
    const output = serializeYaml(obj);
    // The value should appear on a single line without internal newlines
    // Strip the "description: " prefix and check the value portion has no newlines
    const valueStart = output.indexOf(longValue);
    assert.ok(valueStart !== -1, 'long value should appear verbatim in output');
  });

  test('serializeYaml() round-trips sample.yaml without data loss', () => {
    const fixturePath = path.join(__dirname, '../fixtures/sample.yaml');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const parsed1 = parseYaml(raw);
    const serialized = serializeYaml(parsed1);
    const parsed2 = parseYaml(serialized);
    assert.deepStrictEqual(parsed2, parsed1, 'Round-tripped object should deeply equal original');
  });

});

// ---------------------------------------------------------------------------
// Group: validateYaml — INFRA-04 schema enforcement
// ---------------------------------------------------------------------------

describe('validateYaml', () => {

  // Minimal valid object with all 9 required keys
  function makeValid() {
    return {
      customer: { name: 'Test Corp' },
      project: { name: 'Test Project' },
      status: 'on_track',
      workstreams: {},
      actions: [],
      risks: [],
      milestones: [],
      artifacts: [],
      history: [],
    };
  }

  test('validateYaml() passes for object with all 9 required top-level keys', () => {
    assert.doesNotThrow(() => validateYaml(makeValid()), 'validateYaml should not throw for a fully valid object');
  });

  test('validateYaml() throws ValidationError when a required key is missing', () => {
    const data = makeValid();
    delete data.customer;
    assert.throws(
      () => validateYaml(data),
      (err) => {
        assert.ok(err instanceof ValidationError, 'error should be a ValidationError');
        assert.ok(err.message.includes('Missing'), `error message should include "Missing", got: ${err.message}`);
        assert.deepStrictEqual(err.details.missing, ['customer']);
        return true;
      }
    );
  });

  test('validateYaml() does NOT throw when extra top-level keys are present', () => {
    // Design decision: extra keys are allowed — real customer files may have
    // additional fields. Only the 9 required keys are enforced.
    const data = makeValid();
    data.foo = 'bar';
    assert.doesNotThrow(
      () => validateYaml(data),
      'validateYaml should not throw for extra top-level keys'
    );
  });

  test('validateYaml() throws ValidationError when actions is not an array', () => {
    const data = makeValid();
    data.actions = null;
    assert.throws(
      () => validateYaml(data),
      (err) => {
        assert.ok(err instanceof ValidationError, 'error should be a ValidationError');
        assert.ok(err.message.includes('array'), `error message should include "array", got: ${err.message}`);
        assert.strictEqual(err.details.field, 'actions');
        return true;
      }
    );
  });

  test('validateYaml() throws ValidationError when history is not an array', () => {
    const data = makeValid();
    data.history = 'not-array';
    assert.throws(
      () => validateYaml(data),
      (err) => {
        assert.ok(err instanceof ValidationError, 'error should be a ValidationError');
        assert.ok(err.message.includes('array'), `error message should include "array", got: ${err.message}`);
        assert.strictEqual(err.details.field, 'history');
        return true;
      }
    );
  });

});

// ---------------------------------------------------------------------------
// Group: assignNextId — INFRA-05 sequential ID assignment
// ---------------------------------------------------------------------------

describe('assignNextId', () => {

  test('assignNextId("A", []) returns "A-001"', () => {
    assert.strictEqual(assignNextId('A', []), 'A-001');
  });

  test('assignNextId("A", items with A-003 as max) returns "A-004"', () => {
    const items = [
      { id: 'A-001', status: 'completed' },
      { id: 'A-003' },
      { id: 'A-002' },
    ];
    assert.strictEqual(assignNextId('A', items), 'A-004');
  });

  test('assignNextId("R", []) returns "R-001"', () => {
    assert.strictEqual(assignNextId('R', []), 'R-001');
  });

  test('assignNextId("X", items including completed items) never reuses IDs', () => {
    // Completed items must be counted to prevent ID reuse
    const items = [
      { id: 'X-001', status: 'completed' },
      { id: 'A-005' }, // Different prefix — should NOT count for X
    ];
    assert.strictEqual(assignNextId('X', items), 'X-002', 'Completed items must be counted; cross-prefix IDs ignored');
  });

});
