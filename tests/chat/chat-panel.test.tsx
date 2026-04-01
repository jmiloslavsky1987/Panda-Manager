// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatPanel } from '../../components/chat/ChatPanel';
import { useChat } from '@ai-sdk/react';

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

// Mock @ai-sdk/react with a vi.fn() that will be configured per test
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(),
}));

// Mock ai package
vi.mock('ai', () => ({
  DefaultChatTransport: vi.fn(),
}));

describe('ChatPanel', () => {
  const mockSendMessage = vi.fn();
  const mockSetMessages = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Configure default return value
    vi.mocked(useChat).mockReturnValue({
      messages: [],
      sendMessage: mockSendMessage,
      status: 'ready',
      error: null,
      setMessages: mockSetMessages,
    } as any);
  });

  describe('CHAT-01: Basic rendering and interactions', () => {
    it('renders without crashing', () => {
      render(<ChatPanel projectId={123} initialContext="test context" />);
      expect(screen.getByPlaceholderText(/Ask a question/i)).toBeDefined();
    });

    it('empty state shows 4 starter question buttons when messages is empty', () => {
      render(<ChatPanel projectId={123} initialContext="test context" />);

      expect(screen.getByText(/What are the open actions/i)).toBeDefined();
      expect(screen.getByText(/Any overdue milestones/i)).toBeDefined();
      expect(screen.getByText(/Summarize the current risks/i)).toBeDefined();
      expect(screen.getByText(/Who are the key stakeholders/i)).toBeDefined();
    });

    it('typing indicator renders when status is "submitted"', () => {
      vi.mocked(useChat).mockReturnValue({
        messages: [],
        sendMessage: mockSendMessage,
        status: 'submitted',
        error: null,
        setMessages: mockSetMessages,
      } as any);

      render(<ChatPanel projectId={123} initialContext="test context" />);
      expect(screen.getByText(/Thinking/i)).toBeDefined();
    });

    it('typing indicator renders when status is "streaming"', () => {
      vi.mocked(useChat).mockReturnValue({
        messages: [],
        sendMessage: mockSendMessage,
        status: 'streaming',
        error: null,
        setMessages: mockSetMessages,
      } as any);

      render(<ChatPanel projectId={123} initialContext="test context" />);
      expect(screen.getByText(/Thinking/i)).toBeDefined();
    });

    it('clear conversation button is present in panel header', () => {
      vi.mocked(useChat).mockReturnValue({
        messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'test' }] }],
        sendMessage: mockSendMessage,
        status: 'ready',
        error: null,
        setMessages: mockSetMessages,
      } as any);

      render(<ChatPanel projectId={123} initialContext="test context" />);
      expect(screen.getByText(/Clear conversation/i)).toBeDefined();
    });
  });

  describe('CHAT-02: Grounding UI signals', () => {
    it('"Answers are based on this project\'s live data" text is present', () => {
      render(<ChatPanel projectId={123} initialContext="test context" />);
      expect(screen.getByText(/Answers are based on this project's live data/i)).toBeDefined();
    });
  });
});
