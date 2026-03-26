import { describe, it, expect } from 'vitest';
import { TYPE_OPTIONS } from '../app/search/page';

describe('TYPE_OPTIONS', () => {
  it("contains an entry with value 'onboarding_steps'", () => {
    const values = TYPE_OPTIONS.map((opt) => opt.value);
    expect(values).toContain('onboarding_steps');
  });

  it("contains an entry with value 'onboarding_phases'", () => {
    const values = TYPE_OPTIONS.map((opt) => opt.value);
    expect(values).toContain('onboarding_phases');
  });

  it("contains an entry with value 'integrations'", () => {
    const values = TYPE_OPTIONS.map((opt) => opt.value);
    expect(values).toContain('integrations');
  });

  it("contains an entry with value 'time_entries'", () => {
    const values = TYPE_OPTIONS.map((opt) => opt.value);
    expect(values).toContain('time_entries');
  });

  it('has total length of 13 (1 All Types + 12 FTS tables)', () => {
    expect(TYPE_OPTIONS).toHaveLength(13);
  });
});
