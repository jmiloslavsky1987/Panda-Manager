import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamEngagementMap from '@/components/teams/TeamEngagementMap';

describe('TeamEngagementMap - 4-section structure (TEAM-01)', () => {
  it('renders exactly 4 sections', () => {
    render(<TeamEngagementMap projectId={1} />);

    // Check for expected section headers
    expect(screen.getByText(/Business Value.*Outcomes/i)).toBeInTheDocument();
    expect(screen.getByText(/End-to-End Workflows/i)).toBeInTheDocument();
    expect(screen.getByText(/Teams.*Engagement/i)).toBeInTheDocument();
    expect(screen.getByText(/Focus Areas/i)).toBeInTheDocument();
  });

  it('does NOT render Architecture section', () => {
    render(<TeamEngagementMap projectId={1} />);

    // Architecture section should not be present
    expect(screen.queryByText(/Architecture/i)).not.toBeInTheDocument();
  });

  it('uses plain text headers without numbered badges', () => {
    const { container } = render(<TeamEngagementMap projectId={1} />);

    // Should not find SectionHeader component usage or numbered circle elements
    const numberedElements = container.querySelectorAll('[class*="circle"]');
    expect(numberedElements.length).toBe(0);
  });
});
