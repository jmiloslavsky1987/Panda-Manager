// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamEngagementMap } from '@/components/teams/TeamEngagementMap';

// Mock sub-components to avoid server-side and complex dependencies
vi.mock('@/components/teams/BusinessOutcomesSection', () => ({
  BusinessOutcomesSection: () => null,
}));
vi.mock('@/components/teams/E2eWorkflowsSection', () => ({
  E2eWorkflowsSection: () => null,
}));
vi.mock('@/components/teams/TeamsEngagementSection', () => ({
  TeamsEngagementSection: () => null,
}));
vi.mock('@/components/teams/FocusAreasSection', () => ({
  FocusAreasSection: () => null,
}));
vi.mock('@/components/arch/TeamOnboardingTable', () => ({
  TeamOnboardingTable: () => null,
}));

const mockData = {
  businessOutcomes: [],
  e2eWorkflows: [],
  focusAreas: [],
  teamOnboardingStatus: [],
};

describe('TeamEngagementMap - 4-section structure (TEAM-01)', () => {
  it('renders exactly 4 sections', () => {
    render(<TeamEngagementMap projectId={1} customer="Test Corp" data={mockData as any} />);

    // Check for expected section headers
    expect(screen.getByText(/Business Value.*Outcomes/i)).toBeInTheDocument();
    expect(screen.getByText(/End-to-End Workflows/i)).toBeInTheDocument();
    expect(screen.getByText(/Teams.*Engagement/i)).toBeInTheDocument();
    expect(screen.getByText(/Focus Areas/i)).toBeInTheDocument();
  });

  it('does NOT render Architecture section', () => {
    render(<TeamEngagementMap projectId={1} customer="Test Corp" data={mockData as any} />);

    // Architecture section should not be present
    expect(screen.queryByText(/^Architecture$/i)).not.toBeInTheDocument();
  });

  it('uses plain text headers without numbered badges', () => {
    const { container } = render(<TeamEngagementMap projectId={1} customer="Test Corp" data={mockData as any} />);

    // Should not find SectionHeader component usage or numbered circle elements
    const numberedElements = container.querySelectorAll('[class*="circle"]');
    expect(numberedElements.length).toBe(0);
  });
});
