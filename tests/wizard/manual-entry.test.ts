import { describe, it, expect } from 'vitest';
import { buildEntityPayload } from '../../components/wizard/ManualEntryStep';

describe('manual-entry: buildEntityPayload', () => {
  it('returns object with title field for action entity type', () => {
    const result = buildEntityPayload('action', { title: 'test' });
    expect(result).toHaveProperty('title', 'test');
  });

  it('returns empty object for unknown entity type', () => {
    const result = buildEntityPayload('unknown_entity_type_xyz', { foo: 'bar' });
    expect(result).toEqual({});
  });

  it('returns object with correct fields for risk entity type', () => {
    const result = buildEntityPayload('risk', { description: 'Security risk', severity: 'high' });
    expect(result).toHaveProperty('description', 'Security risk');
  });

  it('returns object with name for stakeholder entity type', () => {
    const result = buildEntityPayload('stakeholder', { name: 'Alice', role: 'PM' });
    expect(result).toHaveProperty('name', 'Alice');
  });
});
