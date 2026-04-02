// tests/overview/completeness-removal.test.ts
// Wave 0 RED stubs for WORK-02 — Project Completeness removal
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

describe('Overview Page — Completeness removal (WORK-02)', () => {
  it('does NOT render completeness score bar element', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const completenessBar: any = undefined;
    expect(completenessBar).toBeNull();
    // TODO Plan 33-03: render overview page, verify no completeness score bar
  });

  it('does NOT render below-60% warning banner', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const warningBanner: any = undefined;
    expect(warningBanner).toBeNull();
    // TODO Plan 33-03: render overview page, verify no warning banner
  });

  it('does NOT include "Project Completeness" text', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const completenessText: any = undefined;
    expect(completenessText).toBeNull();
    // TODO Plan 33-03: render overview page, use screen.queryByText('Project Completeness')
  });

  it('does NOT include yellow warning banner class', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const yellowBannerClass: any = undefined;
    expect(yellowBannerClass).toBeNull();
    // TODO Plan 33-03: render overview page, verify no bg-yellow-50 or similar classes
  });
});
