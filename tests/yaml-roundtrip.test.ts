/**
 * yaml-roundtrip.test.ts — Wave 0 stub (RED)
 * Asserts that serializing a sample project object to YAML and re-parsing it
 * produces an identical result (round-trip stable).
 *
 * DATA-05: YAML round-trip stability with js-yaml settings:
 *   sortKeys: false, lineWidth: -1, schema: yaml.JSON_SCHEMA
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// These imports will fail until Plan 01-04 creates the yaml-export library (correct RED state)
import { buildYamlDocument, parseYaml, REQUIRED_TOP_LEVEL_KEYS } from '../lib/yaml-export.js';

describe('yaml round-trip', () => {
  test('serializes and re-parses to produce deep-equal object', async () => {
    const sampleProject = {
      name: 'Kaiser PA3.0',
      customer: 'KAISER',
      status: 'active',
      workstreams: [],
      actions: [],
      risks: [],
      milestones: [],
      artifacts: [],
      stakeholders: [],
    };

    const yamlStr = buildYamlDocument(sampleProject);
    const parsed = parseYaml(yamlStr);

    assert.deepStrictEqual(
      parsed,
      sampleProject,
      'Expected round-trip parse to produce deep-equal object'
    );
  });

  test('serialized YAML contains all 9 REQUIRED_TOP_LEVEL_KEYS', async () => {
    const sampleProject = {
      name: 'AMEX PA3.0',
      customer: 'AMEX',
      status: 'active',
      workstreams: [],
      actions: [],
      risks: [],
      milestones: [],
      artifacts: [],
      stakeholders: [],
    };

    const yamlStr = buildYamlDocument(sampleProject);

    for (const key of REQUIRED_TOP_LEVEL_KEYS) {
      assert.ok(
        yamlStr.includes(key + ':'),
        `Expected YAML to contain required key "${key}:"`
      );
    }
  });

  test('serialized YAML starts with frontmatter marker ---', async () => {
    const sampleProject = {
      name: 'Test Project',
      customer: 'TEST',
      status: 'active',
      workstreams: [],
      actions: [],
      risks: [],
      milestones: [],
      artifacts: [],
      stakeholders: [],
    };

    const yamlStr = buildYamlDocument(sampleProject);
    assert.ok(
      yamlStr.startsWith('---\n'),
      `Expected YAML to start with "---\\n", got: ${yamlStr.slice(0, 20)}`
    );
  });
});
