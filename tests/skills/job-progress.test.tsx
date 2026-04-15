// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SkillsTabClient } from '@/components/SkillsTabClient';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: mockReplace
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => '')
  }),
  usePathname: () => '/customer/1/skills'
}));

global.fetch = vi.fn();

describe('SkillsTabClient - Job Progress', () => {
  const mockRecentRuns = [
    {
      id: 1,
      run_id: 'run-123',
      project_id: 1,
      skill_name: 'weekly-customer-status',
      status: 'completed' as const,
      input: null,
      full_output: 'Output here',
      error_message: null,
      started_at: new Date('2026-04-06T12:00:00Z'),
      completed_at: new Date('2026-04-06T12:05:00Z'),
      created_at: new Date('2026-04-06T12:00:00Z')
    }
  ];

  const mockSkills = [
    {
      name: 'weekly-customer-status',
      label: 'Weekly Customer Status',
      description: 'Generate weekly status',
      inputRequired: false,
      inputLabel: '',
      schedulable: true,
      errorBehavior: 'retry' as const,
      compliant: true
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ runId: 'new-run-456' })
    });
  });

  it('shows elapsed time counter when job is running', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SkillsTabClient projectId={1} recentRuns={mockRecentRuns} skills={mockSkills} promptEditingEnabled={false} isAdmin={false} initialJobs={[]} />);

    const runButton = document.querySelector('[data-skill="weekly-customer-status"] [data-run]') as HTMLButtonElement;
    await user.click(runButton);

    // Wait for elapsed time to appear
    await waitFor(() => {
      expect(screen.getByText(/0m/)).toBeInTheDocument();
    });
  });

  it('shows spinner when job is running', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SkillsTabClient projectId={1} recentRuns={mockRecentRuns} skills={mockSkills} promptEditingEnabled={false} isAdmin={false} initialJobs={[]} />);

    const runButton = document.querySelector('[data-skill="weekly-customer-status"] [data-run]') as HTMLButtonElement;
    await user.click(runButton);

    // Should show spinner (animated SVG)
    await waitFor(() => {
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  it('shows Cancel button for running jobs', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SkillsTabClient projectId={1} recentRuns={mockRecentRuns} skills={mockSkills} promptEditingEnabled={false} isAdmin={false} initialJobs={[]} />);

    const runButton = document.querySelector('[data-skill="weekly-customer-status"] [data-run]') as HTMLButtonElement;
    await user.click(runButton);

    // Should show Cancel button
    await waitFor(() => {
      expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    });
  });

  it('clicking Cancel stops the job', async () => {
    const user = userEvent.setup({ delay: null });
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: 'new-run-456' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, status: 'cancelled' })
      });

    render(<SkillsTabClient projectId={1} recentRuns={mockRecentRuns} skills={mockSkills} promptEditingEnabled={false} isAdmin={false} initialJobs={[]} />);

    const runButton = document.querySelector('[data-skill="weekly-customer-status"] [data-run]') as HTMLButtonElement;
    await user.click(runButton);

    const cancelButton = await screen.findByText(/cancel/i);
    await user.click(cancelButton);

    // Should call cancel endpoint
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/skills/runs/new-run-456/cancel'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    // Should refresh router
    expect(mockRefresh).toHaveBeenCalled();
  });

  it.skip('stops polling when terminal status reached', async () => {
    // This test verifies the polling mechanism exists and cleans up properly
    // We test the behavior indirectly by checking that the useEffect sets up interval correctly
    const user = userEvent.setup({ delay: null });

    // Mock to return completed status immediately on first poll
    let callCount = 0;
    (global.fetch as any).mockImplementation((url: string) => {
      callCount++;
      if (url.includes('/run')) {
        // Initial trigger
        return Promise.resolve({
          ok: true,
          json: async () => ({ runId: 'new-run-456' })
        });
      } else if (url.includes('/runs/new-run-456')) {
        // Return completed immediately to avoid waiting 5s
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'completed', run_id: 'new-run-456' })
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    render(<SkillsTabClient projectId={1} recentRuns={mockRecentRuns} skills={mockSkills} promptEditingEnabled={false} isAdmin={false} initialJobs={[]} />);

    const runButton = document.querySelector('[data-skill="weekly-customer-status"] [data-run]') as HTMLButtonElement;
    await user.click(runButton);

    // Job should start (elapsed time appears)
    await waitFor(() => {
      expect(screen.getByText(/0m/)).toBeInTheDocument();
    });

    // Wait for polling to trigger and job to complete (timer removed after 5s poll + completion)
    await waitFor(() => {
      expect(screen.queryByText(/0m/)).not.toBeInTheDocument();
    }, { timeout: 7000 }); // 5s poll interval + 2s buffer

    // Router should refresh when terminal state reached
    expect(mockRefresh).toHaveBeenCalled();
  }, 10000);

  it('does NOT navigate to skill run page after trigger', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SkillsTabClient projectId={1} recentRuns={mockRecentRuns} skills={mockSkills} promptEditingEnabled={false} isAdmin={false} initialJobs={[]} />);

    const runButton = document.querySelector('[data-skill="weekly-customer-status"] [data-run]') as HTMLButtonElement;
    await user.click(runButton);

    // Wait for elapsed time to confirm job started
    await waitFor(() => {
      expect(screen.getByText(/0m/)).toBeInTheDocument();
    });

    // Should NOT call router.push
    expect(mockPush).not.toHaveBeenCalled();
  });
});
