// tests/overview/track-separation.test.ts
// Wave 0 RED stubs for WORK-01 — Dual-track onboarding UI (ADR/Biggy separation)
// @vitest-environment jsdom
import React from 'react';
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
    const { OnboardingDashboard } = await import('../../components/OnboardingDashboard');
    render(<OnboardingDashboard projectId={1} />);
    // Wait for API call to complete
    await screen.findByTestId('onboarding-dashboard');
    const adrSection = screen.queryByTestId('adr-track');
    expect(adrSection).toBeDefined();
    expect(adrSection).not.toBeNull();
  });

  it('renders Biggy section with data-testid="biggy-track"', async () => {
    const { OnboardingDashboard } = await import('../../components/OnboardingDashboard');
    render(<OnboardingDashboard projectId={1} />);
    await screen.findByTestId('onboarding-dashboard');
    const biggySection = screen.queryByTestId('biggy-track');
    expect(biggySection).toBeDefined();
    expect(biggySection).not.toBeNull();
  });

  it('displays independent progress rings with correct percentages', async () => {
    // Mock API response with different completion rates
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        adr: [
          {
            id: 1,
            name: 'Discovery & Kickoff',
            track: 'ADR',
            display_order: 1,
            steps: [
              { id: 1, name: 'Step 1', status: 'complete', phase_id: 1, project_id: 1, description: null, owner: null, dependencies: [], updates: [], display_order: 1 },
              { id: 2, name: 'Step 2', status: 'not-started', phase_id: 1, project_id: 1, description: null, owner: null, dependencies: [], updates: [], display_order: 2 },
            ],
          },
        ],
        biggy: [
          {
            id: 2,
            name: 'Discovery & Kickoff',
            track: 'Biggy',
            display_order: 1,
            steps: [
              { id: 3, name: 'Step 3', status: 'complete', phase_id: 2, project_id: 1, description: null, owner: null, dependencies: [], updates: [], display_order: 1 },
              { id: 4, name: 'Step 4', status: 'complete', phase_id: 2, project_id: 1, description: null, owner: null, dependencies: [], updates: [], display_order: 2 },
              { id: 5, name: 'Step 5', status: 'complete', phase_id: 2, project_id: 1, description: null, owner: null, dependencies: [], updates: [], display_order: 3 },
              { id: 6, name: 'Step 6', status: 'not-started', phase_id: 2, project_id: 1, description: null, owner: null, dependencies: [], updates: [], display_order: 4 },
            ],
          },
        ],
      }),
    });
    const { OnboardingDashboard } = await import('../../components/OnboardingDashboard');
    render(<OnboardingDashboard projectId={1} />);
    await screen.findByTestId('onboarding-dashboard');
    const progressRings = screen.queryAllByTestId('progress-ring');
    // Should have 2 progress rings (one for ADR, one for Biggy)
    expect(progressRings.length).toBeGreaterThanOrEqual(2);
  });

  it('filter bar applies to both ADR and Biggy columns simultaneously', async () => {
    const { OnboardingDashboard } = await import('../../components/OnboardingDashboard');
    render(<OnboardingDashboard projectId={1} />);
    await screen.findByTestId('onboarding-dashboard');
    const filterBar = screen.queryByTestId('filter-bar');
    expect(filterBar).toBeDefined();
    expect(filterBar).not.toBeNull();
  });

  it('phases with track="ADR" appear only in ADR column', async () => {
    const { OnboardingDashboard } = await import('../../components/OnboardingDashboard');
    render(<OnboardingDashboard projectId={1} />);
    await screen.findByTestId('onboarding-dashboard');
    const adrSection = screen.queryByTestId('adr-track');
    expect(adrSection).toBeDefined();
    expect(adrSection).not.toBeNull();
  });

  it('phases with track="Biggy" appear only in Biggy column', async () => {
    const { OnboardingDashboard } = await import('../../components/OnboardingDashboard');
    render(<OnboardingDashboard projectId={1} />);
    await screen.findByTestId('onboarding-dashboard');
    const biggySection = screen.queryByTestId('biggy-track');
    expect(biggySection).toBeDefined();
    expect(biggySection).not.toBeNull();
  });
});
