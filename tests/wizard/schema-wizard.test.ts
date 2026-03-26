import { describe, it, expect } from 'vitest';
import { projectStatusEnum, projects } from '../../db/schema';

describe('schema-wizard: projectStatusEnum includes draft', () => {
  it('enum values include draft', () => {
    const values = projectStatusEnum.enumValues;
    expect(values).toContain('draft');
  });

  it('enum values still include active, archived, closed', () => {
    const values = projectStatusEnum.enumValues;
    expect(values).toContain('active');
    expect(values).toContain('archived');
    expect(values).toContain('closed');
  });
});

describe('schema-wizard: projects table has new wizard columns', () => {
  it('projects table has description field', () => {
    expect(projects.description).toBeDefined();
  });

  it('projects table has start_date field', () => {
    expect(projects.start_date).toBeDefined();
  });

  it('projects table has end_date field', () => {
    expect(projects.end_date).toBeDefined();
  });
});
