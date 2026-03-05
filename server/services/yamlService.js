// server/services/yamlService.js
// YAML data integrity layer — all reads and writes go through here
// CRITICAL: JSON_SCHEMA prevents boolean coercion (on/off/yes/no stay as strings)
'use strict';

const yaml = require('js-yaml');

const REQUIRED_TOP_LEVEL_KEYS = [
  'customer', 'project', 'status', 'workstreams',
  'actions', 'risks', 'milestones', 'artifacts', 'history',
];

const ARRAY_FIELDS = ['actions', 'risks', 'milestones', 'artifacts', 'history'];

function parseYaml(content) {
  // JSON_SCHEMA: prevents yes/no/on/off → boolean coercion (YAML 1.1 legacy behavior)
  return yaml.load(content, { schema: yaml.JSON_SCHEMA });
}

function serializeYaml(data) {
  return yaml.dump(data, {
    sortKeys: false,    // Preserve insertion order — never alphabetize
    lineWidth: -1,      // No line-folding — preserves multiline string style
    noRefs: true,       // Disable YAML anchors/aliases — not needed, avoids edge cases
  });
}

class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.statusCode = 422;
  }
}

function validateYaml(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ValidationError('YAML root must be an object');
  }

  const keys = Object.keys(data);
  const missing = REQUIRED_TOP_LEVEL_KEYS.filter(k => !keys.includes(k));

  if (missing.length > 0) {
    throw new ValidationError(`Missing required keys: ${missing.join(', ')}`, { missing });
  }
  // Extra keys are allowed — real customer files may have additional top-level fields

  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(data[field])) {
      throw new ValidationError(
        `Field '${field}' must be an array, got: ${data[field] === null ? 'null' : typeof data[field]}`,
        { field }
      );
    }
  }
}

function normalizeForSerialization(data) {
  const normalized = { ...data };
  for (const field of ARRAY_FIELDS) {
    if (normalized[field] === undefined || normalized[field] === null) {
      normalized[field] = [];
    }
  }
  return normalized;
}

function assignNextId(prefix, allItems) {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  let maxNum = 0;
  for (const item of allItems) {
    const match = item.id && item.id.match(pattern);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

module.exports = {
  parseYaml,
  serializeYaml,
  validateYaml,
  normalizeForSerialization,
  assignNextId,
  ValidationError,
  REQUIRED_TOP_LEVEL_KEYS,
};
