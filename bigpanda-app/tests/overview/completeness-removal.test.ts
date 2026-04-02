// tests/overview/completeness-removal.test.ts
// Wave 0 RED tests for WORK-02 — Project Completeness removal
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Overview Page — Completeness removal (WORK-02)', () => {
  const pageFilePath = join(__dirname, '../../app/customer/[id]/overview/page.tsx');
  let pageContent: string;

  // Read file once for all tests
  try {
    pageContent = readFileSync(pageFilePath, 'utf-8');
  } catch {
    pageContent = '';
  }

  it('does NOT include "Project Completeness" text', () => {
    expect(pageContent).not.toContain('Project Completeness');
  });

  it('does NOT include completeness score calculation', () => {
    expect(pageContent).not.toContain('computeCompletenessScore');
  });

  it('does NOT include getBannerData function call', () => {
    expect(pageContent).not.toContain('getBannerData');
  });

  it('does NOT include yellow warning banner (bg-yellow-50)', () => {
    expect(pageContent).not.toContain('bg-yellow-50');
  });

  it('does NOT include completeness imports', () => {
    expect(pageContent).not.toContain('TableCounts');
  });

  it('does NOT fetch table counts for completeness', () => {
    // Check that the file doesn't have the SCORED_TABS pattern
    expect(pageContent).not.toContain('SCORED_TABS');
  });
});
