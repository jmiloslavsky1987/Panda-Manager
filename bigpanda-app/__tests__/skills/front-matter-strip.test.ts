import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'fs/promises';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../../db', () => ({
  default: {
    insert: vi.fn(() => ({ values: vi.fn() })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) })) })),
  },
}));
vi.mock('../../db/schema', () => ({
  skillRuns: {},
  skillRunChunks: {},
}));
vi.mock('../../lib/skill-context', () => ({
  buildSkillContext: vi.fn(() => Promise.resolve({ userMessage: 'test context' })),
}));
vi.mock('../../lib/skill-context-teams', () => ({
  buildTeamsSkillContext: vi.fn(() => Promise.resolve('teams context')),
}));
vi.mock('../../lib/skill-context-arch', () => ({
  buildArchSkillContext: vi.fn(() => Promise.resolve('arch context')),
}));

const mockReadFile = vi.mocked(readFile);

describe('SkillOrchestrator - Front-matter stripping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Anthropic API key
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('strips YAML front-matter from skill content before using as systemPrompt', async () => {
    // Arrange: skill file with front-matter
    const skillFileContent = `---
label: Meeting Summary
description: Generate a meeting summary from notes or transcript
input_required: true
input_label: Transcript
schedulable: false
error_behavior: retry
---

# Meeting Summary Skill

You are an expert note-taker and PS consultant.`;

    mockReadFile.mockResolvedValue(skillFileContent);

    // We need to capture what systemPrompt is passed to the Anthropic API
    // Since the full orchestrator test would require mocking the entire Anthropic SDK,
    // this test validates the transformation logic in isolation

    // Import SkillOrchestrator here to ensure mocks are applied
    const { SkillOrchestrator } = await import('../../lib/skill-orchestrator');

    // Create a spy on the Anthropic client
    const mockStream = {
      on: vi.fn((event, handler) => {
        if (event === 'text') {
          // Simulate text event
          handler('test output');
        }
        return mockStream;
      }),
      finalMessage: vi.fn(() => Promise.resolve({})),
    };

    const mockClient = {
      messages: {
        countTokens: vi.fn(() => Promise.resolve({ input_tokens: 100 })),
        stream: vi.fn(() => mockStream),
      },
    };

    const orchestrator = new SkillOrchestrator();
    // @ts-ignore - accessing private property for testing
    orchestrator._client = mockClient;

    // Act: run the skill
    await orchestrator.run({
      skillName: 'meeting-summary',
      projectId: 1,
      runId: 1,
      skillsDir: '/test/skills',
    });

    // Assert: the systemPrompt should NOT contain the front-matter
    expect(mockClient.messages.countTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.not.stringContaining('---'),
      })
    );

    // Verify the system prompt starts with the actual content, not front-matter
    const countTokensCall = mockClient.messages.countTokens.mock.calls[0][0];
    expect(countTokensCall.system).toMatch(/^# Meeting Summary Skill/);
    expect(countTokensCall.system).not.toContain('label:');
    expect(countTokensCall.system).not.toContain('input_required:');
  });

  it('leaves content unchanged when no front-matter is present (legacy files)', async () => {
    // Arrange: skill file WITHOUT front-matter
    const skillFileContent = `# Meeting Summary Skill

You are an expert note-taker and PS consultant.`;

    mockReadFile.mockResolvedValue(skillFileContent);

    const { SkillOrchestrator } = await import('../../lib/skill-orchestrator');

    const mockStream = {
      on: vi.fn((event, handler) => {
        if (event === 'text') {
          handler('test output');
        }
        return mockStream;
      }),
      finalMessage: vi.fn(() => Promise.resolve({})),
    };

    const mockClient = {
      messages: {
        countTokens: vi.fn(() => Promise.resolve({ input_tokens: 100 })),
        stream: vi.fn(() => mockStream),
      },
    };

    const orchestrator = new SkillOrchestrator();
    // @ts-ignore
    orchestrator._client = mockClient;

    // Act
    await orchestrator.run({
      skillName: 'legacy-skill',
      projectId: 1,
      runId: 2,
      skillsDir: '/test/skills',
    });

    // Assert: content should be unchanged
    const countTokensCall = mockClient.messages.countTokens.mock.calls[0][0];
    expect(countTokensCall.system).toBe(skillFileContent);
  });

  describe('Body extraction from front-matter', () => {
    it.todo('Body extraction from file with trailing newline returns body without leading newline');

    it.todo('Body extraction from file without trailing newline after second --- returns empty string');
  });
});
