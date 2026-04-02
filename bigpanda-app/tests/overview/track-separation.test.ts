// tests/overview/track-separation.test.ts
// Wave 0 RED stubs for WORK-01 — Dual-track onboarding UI (ADR/Biggy separation)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock fetch for API responses
global.fetch = vi.fn();

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

describe('OnboardingDashboard — Dual-track UI (WORK-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock grouped API response structure
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        adr: [
          {
            id: 1,
            name: 'Discovery & Kickoff',
            track: 'ADR',
            display_order: 1,
            steps: [],
          },
        ],
        biggy: [
          {
            id: 2,
            name: 'Discovery & Kickoff',
            track: 'Biggy',
            display_order: 1,
            steps: [],
          },
        ],
      }),
    });
  });

  it('renders ADR section with data-testid="adr-track"', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const adrSection: any = undefined;
    expect(adrSection).toBeDefined();
    // TODO Plan 33-03: render OnboardingDashboard, verify ADR section present
  });

  it('renders Biggy section with data-testid="biggy-track"', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const biggySection: any = undefined;
    expect(biggySection).toBeDefined();
    // TODO Plan 33-03: render OnboardingDashboard, verify Biggy section present
  });

  it('displays independent progress rings with correct percentages', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const adrProgress: any = undefined;
    const biggyProgress: any = undefined;
    expect(adrProgress).toBeDefined();
    expect(biggyProgress).toBeDefined();
    // TODO Plan 33-03: verify two progress rings exist, calculate percentages per track
  });

  it('filter bar applies to both ADR and Biggy columns simultaneously', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const sharedFilter: any = undefined;
    expect(sharedFilter).toBeDefined();
    // TODO Plan 33-03: change filter, verify both columns respond
  });

  it('phases with track="ADR" appear only in ADR column', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const adrPhasesInAdrColumn: any = undefined;
    expect(adrPhasesInAdrColumn).toBeDefined();
    // TODO Plan 33-03: verify ADR phases not in Biggy column
  });

  it('phases with track="Biggy" appear only in Biggy column', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const biggyPhasesInBiggyColumn: any = undefined;
    expect(biggyPhasesInBiggyColumn).toBeDefined();
    // TODO Plan 33-03: verify Biggy phases not in ADR column
  });
});
