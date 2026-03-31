// tests/ui/tab-registry.test.ts
// Tests for UI-03 — TAB_TEMPLATE_REGISTRY completeness
import { describe, it, expect } from 'vitest';
import { TAB_TEMPLATE_REGISTRY } from '@/lib/tab-template-registry';

describe('TAB_TEMPLATE_REGISTRY — UI-03', () => {
  it('TAB_TEMPLATE_REGISTRY has entries for all 11 required tab types', () => {
    const keys = Object.keys(TAB_TEMPLATE_REGISTRY);
    expect(keys).toHaveLength(11);
    expect(keys.sort()).toEqual([
      'actions',
      'architecture',
      'decisions',
      'history',
      'milestones',
      'overview',
      'plan',
      'risks',
      'skills',
      'stakeholders',
      'teams'
    ]);
  });

  it('each entry has a sections array', () => {
    const entries = Object.values(TAB_TEMPLATE_REGISTRY);
    for (const entry of entries) {
      expect(entry).toHaveProperty('sections');
      expect(Array.isArray(entry.sections)).toBe(true);
    }
  });

  it('skills entry has empty sections array', () => {
    expect(TAB_TEMPLATE_REGISTRY.skills.sections).toEqual([]);
  });

  it('each non-skills section has name and placeholderText', () => {
    // Check all tabs except skills (which has empty sections)
    const tabsToCheck = Object.keys(TAB_TEMPLATE_REGISTRY).filter(k => k !== 'skills');

    for (const tabKey of tabsToCheck) {
      const tab = TAB_TEMPLATE_REGISTRY[tabKey as keyof typeof TAB_TEMPLATE_REGISTRY];
      for (const section of tab.sections) {
        expect(section).toHaveProperty('name');
        expect(typeof section.name).toBe('string');
        expect(section.name.length).toBeGreaterThan(0);

        expect(section).toHaveProperty('placeholderText');
        expect(typeof section.placeholderText).toBe('string');
        expect(section.placeholderText.length).toBeGreaterThan(0);

        expect(section).toHaveProperty('requiredFields');
        expect(Array.isArray(section.requiredFields)).toBe(true);
      }
    }
  });
});
