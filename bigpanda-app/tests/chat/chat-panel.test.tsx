// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation inline
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => '/projects/1'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock @ai-sdk/react
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(),
}));

// Mock ai package
vi.mock('ai', () => ({
  DefaultChatTransport: vi.fn(),
}));

describe('ChatPanel', () => {
  // Wave 0 RED stub pattern: const target: any = undefined; expect(target).toBeDefined()
  // ChatPanel component does not exist yet — these stubs will fail RED without import crashes

  const ChatPanel: any = undefined;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CHAT-01: Basic rendering and interactions', () => {
    it('renders without crashing', () => {
      expect(ChatPanel).toBeDefined();
      // Will implement:
      // const { useChat } = await import('@ai-sdk/react');
      // vi.mocked(useChat).mockReturnValue({
      //   messages: [],
      //   input: '',
      //   handleInputChange: vi.fn(),
      //   handleSubmit: vi.fn(),
      //   status: 'idle',
      //   setMessages: vi.fn(),
      // } as any);
      // render(<ChatPanel projectId={1} />);
      // expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('empty state shows 4 starter question buttons when messages is empty', () => {
      expect(ChatPanel).toBeDefined();
      // Will implement:
      // Mock useChat with empty messages array
      // render(<ChatPanel projectId={1} />);
      // const starterButtons = screen.getAllByRole('button', { name: /what|how|show|status/i });
      // expect(starterButtons).toHaveLength(4);
    });

    it('typing indicator renders when status is "submitted"', () => {
      expect(ChatPanel).toBeDefined();
      // Will implement:
      // Mock useChat with status: 'submitted'
      // render(<ChatPanel projectId={1} />);
      // expect(screen.getByText(/thinking/i)).toBeInTheDocument();
    });

    it('typing indicator renders when status is "streaming"', () => {
      expect(ChatPanel).toBeDefined();
      // Will implement:
      // Mock useChat with status: 'streaming'
      // render(<ChatPanel projectId={1} />);
      // expect(screen.getByText(/typing|streaming/i)).toBeInTheDocument();
    });

    it('clear conversation button is present in panel header', () => {
      expect(ChatPanel).toBeDefined();
      // Will implement:
      // render(<ChatPanel projectId={1} />);
      // expect(screen.getByRole('button', { name: /clear|reset/i })).toBeInTheDocument();
    });
  });

  describe('CHAT-02: Grounding UI signals', () => {
    it('"Answers are based on this project\'s live data" text is present', () => {
      expect(ChatPanel).toBeDefined();
      // Will implement:
      // render(<ChatPanel projectId={1} />);
      // expect(screen.getByText(/answers are based on.*live data/i)).toBeInTheDocument();
    });
  });
});
