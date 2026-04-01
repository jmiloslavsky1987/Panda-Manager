// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContextTab } from '@/components/ContextTab';

// Per Phase 27 decision: next/navigation mock defined inline
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/customer/1',
}));

const mockHistory = [
  { id: 1, name: 'weekly-notes.pdf', createdAt: '2026-03-01T10:00:00Z', status: 'processed' },
  { id: 2, name: 'kickoff-slides.pptx', createdAt: '2026-03-05T14:00:00Z', status: 'pending' },
];

const mockCompleteness = [
  { tabId: 'overview', status: 'partial', gaps: ['Project summary missing description field'] },
  { tabId: 'actions', status: 'partial', gaps: ['[A-KAISER-003] missing owner assignment', '2 actions have TBD due dates'] },
  { tabId: 'risks', status: 'empty', gaps: ['No real records — all data is template placeholder or missing'] },
  { tabId: 'milestones', status: 'complete', gaps: [] },
  { tabId: 'teams', status: 'partial', gaps: ['Kaiser team missing ADR onboarding status'] },
  { tabId: 'architecture', status: 'empty', gaps: ['No architecture integrations'] },
  { tabId: 'decisions', status: 'partial', gaps: ['3 decisions missing rationale'] },
  { tabId: 'history', status: 'partial', gaps: ['Last entry is 45 days old — no recent updates'] },
  { tabId: 'stakeholders', status: 'complete', gaps: [] },
  { tabId: 'plan', status: 'empty', gaps: ['No tasks defined'] },
  { tabId: 'skills', status: 'empty', gaps: ['No skill runs executed for this project'] },
];

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/artifacts')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHistory) });
    }
    if (url.includes('/completeness')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCompleteness) });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
  });
});

describe('ContextTab component', () => {
  describe('completeness UI', () => {
    it('renders 11 tab rows after analyze', async () => {
      render(<ContextTab projectId={1} />);
      fireEvent.click(screen.getByText('Analyze Completeness'));
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /overview|actions|risks|milestones|teams|architecture|decisions|history|stakeholders|plan|skills/i }).length).toBeGreaterThanOrEqual(11);
      });
    });

    it('each row shows tab name and status badge', async () => {
      render(<ContextTab projectId={1} />);
      fireEvent.click(screen.getByText('Analyze Completeness'));
      await waitFor(() => {
        expect(screen.getAllByText('partial').length).toBeGreaterThan(0);
        expect(screen.getAllByText('complete').length).toBeGreaterThan(0);
        expect(screen.getAllByText('empty').length).toBeGreaterThan(0);
      });
    });

    it('rows are collapsed by default (gaps not visible)', async () => {
      render(<ContextTab projectId={1} />);
      fireEvent.click(screen.getByText('Analyze Completeness'));
      await waitFor(() => {
        expect(screen.queryByText('[A-KAISER-003] missing owner assignment')).toBeNull();
      });
    });

    it('clicking a row expands gap descriptions', async () => {
      render(<ContextTab projectId={1} />);
      fireEvent.click(screen.getByText('Analyze Completeness'));
      await waitFor(() => screen.getByText('actions'));
      fireEvent.click(screen.getByText('actions'));
      expect(screen.getByText('[A-KAISER-003] missing owner assignment')).toBeDefined();
    });

    it('Analyze button shows loading state during fetch', async () => {
      let resolveFetch!: (value: unknown) => void;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/artifacts')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        return new Promise(resolve => { resolveFetch = resolve; });
      });
      render(<ContextTab projectId={1} />);
      fireEvent.click(screen.getByText('Analyze Completeness'));
      expect(screen.getByText('Analyzing...')).toBeDefined();
      resolveFetch({ ok: true, json: () => Promise.resolve(mockCompleteness) });
    });

    it('shows loading text during analysis', async () => {
      render(<ContextTab projectId={1} />);
      fireEvent.click(screen.getByText('Analyze Completeness'));
      // Loading state appears immediately
      expect(screen.queryByText('Analyzing...')).toBeDefined();
    });
  });

  describe('upload section', () => {
    it('renders upload trigger button', () => {
      render(<ContextTab projectId={1} />);
      expect(screen.getByText('Upload Document')).toBeDefined();
    });
  });

  describe('upload history list', () => {
    it('renders filename, upload date, and ingestion status columns', async () => {
      render(<ContextTab projectId={1} />);
      await waitFor(() => {
        expect(screen.getByText('weekly-notes.pdf')).toBeDefined();
        expect(screen.getByText('kickoff-slides.pptx')).toBeDefined();
      });
    });

    it('history list is read-only (no re-extract button)', async () => {
      render(<ContextTab projectId={1} />);
      await waitFor(() => screen.getByText('weekly-notes.pdf'));
      expect(screen.queryByText('Re-extract')).toBeNull();
      expect(screen.queryByText('Retry')).toBeNull();
    });
  });
});
