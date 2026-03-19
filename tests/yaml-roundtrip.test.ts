/**
 * yaml-roundtrip.test.ts
 * Asserts that the YAML export utility:
 *   - Produces a document with all 9 REQUIRED_TOP_LEVEL_KEYS
 *   - round-trip serialise→parse produces deep-equal output
 *   - Empty/missing sections emit 'key: []\n', not omitted
 *   - Document starts with '---\n'
 *
 * DATA-05: YAML round-trip stability with js-yaml settings:
 *   sortKeys: false, lineWidth: -1, schema: yaml.JSON_SCHEMA
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildYamlDocument,
  parseYaml,
  serializeProjectToYaml,
  REQUIRED_TOP_LEVEL_KEYS,
} from '../lib/yaml-export.js';

const SAMPLE_PROJECT = { customer: 'KAISER' };

const SAMPLE_SECTIONS = {
  project: { name: 'Kaiser PA3.0', go_live_target: '2026-Q3' },
  overall_status: 'On track',
  workstreams: [{ name: 'ADR' }],
  actions: [],
  risks: [],
  milestones: [],
  artifacts: [],
  history: [{ date: '2026-01-01', content: 'Kickoff', source: 'yaml' }],
};

describe('yaml round-trip', () => {
  test('buildYamlDocument produces string starting with "---\\n"', () => {
    const yamlStr = buildYamlDocument(SAMPLE_PROJECT, SAMPLE_SECTIONS);
    assert.ok(
      yamlStr.startsWith('---\n'),
      `Expected YAML to start with "---\\n", got: ${yamlStr.slice(0, 20)}`
    );
  });

  test('buildYamlDocument output contains all 9 REQUIRED_TOP_LEVEL_KEYS', () => {
    const yamlStr = buildYamlDocument(SAMPLE_PROJECT, SAMPLE_SECTIONS);
    for (const key of REQUIRED_TOP_LEVEL_KEYS) {
      assert.ok(
        yamlStr.includes(key + ':'),
        `Expected YAML to contain required key "${key}:" — got:\n${yamlStr}`
      );
    }
  });

  test('missing sections emit empty arrays (not omitted)', () => {
    const yamlStr = buildYamlDocument(SAMPLE_PROJECT, {});
    assert.ok(yamlStr.includes('actions: []\n'), 'Expected "actions: []\\n" for missing actions');
    assert.ok(yamlStr.includes('risks: []\n'), 'Expected "risks: []\\n" for missing risks');
    assert.ok(yamlStr.includes('history: []\n'), 'Expected "history: []\\n" for missing history');
  });

  test('serializeProjectToYaml + parseYaml round-trip produces deep-equal object', () => {
    const obj = {
      customer: 'AMEX',
      project: { name: 'AMEX PA3.0' },
      status: 'active',
      workstreams: [],
      actions: [],
      risks: [],
      milestones: [],
      artifacts: [],
      history: [],
    };
    const yamlStr = serializeProjectToYaml(obj);
    const parsed = parseYaml(yamlStr);
    assert.deepStrictEqual(parsed, obj, 'Expected round-trip parse to produce deep-equal object');
  });

  test('parseYaml does not coerce yes/no to booleans', () => {
    const obj = { status: 'active', flag: 'yes', disabled: 'no' };
    const yamlStr = serializeProjectToYaml(obj);
    const parsed = parseYaml(yamlStr) as typeof obj;
    assert.strictEqual(parsed.flag, 'yes', 'Expected "yes" to remain string, not be coerced to true');
    assert.strictEqual(parsed.disabled, 'no', 'Expected "no" to remain string, not be coerced to false');
  });

  test('REQUIRED_TOP_LEVEL_KEYS has exact 9 keys in correct order', () => {
    const EXPECTED = ['customer', 'project', 'status', 'workstreams', 'actions', 'risks', 'milestones', 'artifacts', 'history'];
    assert.deepStrictEqual(REQUIRED_TOP_LEVEL_KEYS, EXPECTED);
  });
});
