import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/projects/[projectId]/chat/route';

// Mock dependencies
vi.mock('@/lib/auth-server', () => ({
  requireSession: vi.fn(),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-anthropic-model'),
}));

vi.mock('ai', () => ({
  streamText: vi.fn(),
  convertToModelMessages: vi.fn((msgs) => msgs),
}));

vi.mock('@/lib/chat-context-builder', () => ({
  buildChatContext: vi.fn(),
}));

describe('POST /api/projects/[projectId]/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CHAT-01: Authentication and basic streaming', () => {
    it('returns 401 when requireSession returns redirectResponse', async () => {
      const { requireSession } = await import('@/lib/auth-server');
      vi.mocked(requireSession).mockResolvedValueOnce({
        session: null,
        redirectResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      });

      const request = new NextRequest('http://localhost:3000/api/projects/1/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId: '1' }) });
      expect(response.status).toBe(401);
    });

    it('returns streaming response (status 200) for authenticated request', async () => {
      const { requireSession } = await import('@/lib/auth-server');
      const { streamText } = await import('ai');
      const { buildChatContext } = await import('@/lib/chat-context-builder');

      vi.mocked(requireSession).mockResolvedValueOnce({
        session: { user: { id: 'test-user' } } as any,
        redirectResponse: null
      });
      vi.mocked(buildChatContext).mockResolvedValueOnce('Mock project context');

      const mockStream = {
        toUIMessageStreamResponse: vi.fn(() => new Response('mock-stream', { status: 200 }))
      };
      vi.mocked(streamText).mockReturnValueOnce(mockStream as any);

      const request = new NextRequest('http://localhost:3000/api/projects/1/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId: '1' }) });
      expect(response.status).toBe(200);
    });

    it('invalid projectId (NaN) returns 400', async () => {
      const { requireSession } = await import('@/lib/auth-server');
      vi.mocked(requireSession).mockResolvedValueOnce({
        session: { user: { id: 'test-user' } } as any,
        redirectResponse: null
      });

      const request = new NextRequest('http://localhost:3000/api/projects/invalid/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId: 'invalid' }) });
      expect(response.status).toBe(400);
    });
  });

  describe('CHAT-02: System prompt constraints', () => {
    it('system prompt includes "ONLY use information present" constraint', async () => {
      const { requireSession } = await import('@/lib/auth-server');
      const { streamText } = await import('ai');
      const { buildChatContext } = await import('@/lib/chat-context-builder');

      vi.mocked(requireSession).mockResolvedValueOnce({
        session: { user: { id: 'test-user' } } as any,
        redirectResponse: null
      });
      vi.mocked(buildChatContext).mockResolvedValueOnce('Mock context');

      const mockStream = {
        toUIMessageStreamResponse: vi.fn(() => new Response('mock'))
      };
      vi.mocked(streamText).mockReturnValueOnce(mockStream as any);

      const request = new NextRequest('http://localhost:3000/api/projects/1/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
      });
      await POST(request, { params: Promise.resolve({ projectId: '1' }) });

      const streamTextCall = vi.mocked(streamText).mock.calls[0][0];
      const systemPrompt = streamTextCall.system;
      expect(systemPrompt).toContain('ONLY use information present');
    });

    it('system prompt includes "NEVER invent facts" constraint', async () => {
      const { requireSession } = await import('@/lib/auth-server');
      const { streamText } = await import('ai');
      const { buildChatContext } = await import('@/lib/chat-context-builder');

      vi.mocked(requireSession).mockResolvedValueOnce({
        session: { user: { id: 'test-user' } } as any,
        redirectResponse: null
      });
      vi.mocked(buildChatContext).mockResolvedValueOnce('Mock context');

      const mockStream = {
        toUIMessageStreamResponse: vi.fn(() => new Response('mock'))
      };
      vi.mocked(streamText).mockReturnValueOnce(mockStream as any);

      const request = new NextRequest('http://localhost:3000/api/projects/1/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
      });
      await POST(request, { params: Promise.resolve({ projectId: '1' }) });

      const streamTextCall = vi.mocked(streamText).mock.calls[0][0];
      const systemPrompt = streamTextCall.system;
      expect(systemPrompt).toContain('NEVER invent facts');
    });

    it('system prompt requires inline record ID citations', async () => {
      const { requireSession } = await import('@/lib/auth-server');
      const { streamText } = await import('ai');
      const { buildChatContext } = await import('@/lib/chat-context-builder');

      vi.mocked(requireSession).mockResolvedValueOnce({
        session: { user: { id: 'test-user' } } as any,
        redirectResponse: null
      });
      vi.mocked(buildChatContext).mockResolvedValueOnce('Mock context');

      const mockStream = {
        toUIMessageStreamResponse: vi.fn(() => new Response('mock'))
      };
      vi.mocked(streamText).mockReturnValueOnce(mockStream as any);

      const request = new NextRequest('http://localhost:3000/api/projects/1/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
      });
      await POST(request, { params: Promise.resolve({ projectId: '1' }) });

      const streamTextCall = vi.mocked(streamText).mock.calls[0][0];
      const systemPrompt = streamTextCall.system;
      expect(systemPrompt).toMatch(/ALWAYS cite.*record.*ID/i);
    });
  });
});
