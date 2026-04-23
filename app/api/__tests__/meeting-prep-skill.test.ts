import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that load the modules
// ---------------------------------------------------------------------------

// Mock buildMeetingPrepContext
vi.mock('@/lib/meeting-prep-context', () => ({
  buildMeetingPrepContext: vi.fn().mockResolvedValue('## Meeting Prep Context'),
}));

// Mock buildSkillContext
vi.mock('@/lib/skill-context', () => ({
  buildSkillContext: vi.fn().mockResolvedValue({
    userMessage: 'Generic skill context',
    withTruncatedHistory: vi.fn().mockReturnValue({ userMessage: 'Truncated context' }),
  }),
}));

// Mock buildTeamsSkillContext
vi.mock('@/lib/skill-context-teams', () => ({
  buildTeamsSkillContext: vi.fn().mockResolvedValue('Teams context'),
}));

// Mock buildArchSkillContext
vi.mock('@/lib/skill-context-arch', () => ({
  buildArchSkillContext: vi.fn().mockResolvedValue('Arch context'),
}));

// Mock DB
vi.mock('@/db', () => ({
  default: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
  },
}));

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', async () => {
  const mockStream = {
    on: vi.fn().mockImplementation(function(event: string, cb: (text: string) => void) {
      if (event === 'text') cb('mock output');
      return mockStream;
    }),
    finalMessage: vi.fn().mockResolvedValue({}),
  };
  const mockCountTokens = vi.fn().mockResolvedValue({ input_tokens: 1000 });
  class MockAnthropic {
    messages = {
      stream: vi.fn().mockReturnValue(mockStream),
      countTokens: mockCountTokens,
    };
  }
  return { default: MockAnthropic };
});

// Mock fs/promises readFile to return a fake SKILL.md
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('# Meeting Prep Skill\nYou are an expert.'),
}));

import { SkillOrchestrator } from '@/lib/skill-orchestrator';
import { buildMeetingPrepContext } from '@/lib/meeting-prep-context';
import { buildSkillContext } from '@/lib/skill-context';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SkillOrchestrator — meeting-prep branch', () => {
  let orchestrator: SkillOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new SkillOrchestrator();
  });

  it('Test 1: SkillOrchestrator uses buildMeetingPrepContext when skillName is meeting-prep', async () => {
    await orchestrator.run({
      skillName: 'meeting-prep',
      projectId: 42,
      runId: 1,
      skillsDir: '/fake/skills',
    });

    expect(buildMeetingPrepContext).toHaveBeenCalledWith(42, undefined);
  });

  it('Test 2: Other skill names continue to use the existing buildSkillContext path', async () => {
    await orchestrator.run({
      skillName: 'sprint-summary-generator',
      projectId: 42,
      runId: 1,
      skillsDir: '/fake/skills',
    });

    expect(buildMeetingPrepContext).not.toHaveBeenCalled();
    expect(buildSkillContext).toHaveBeenCalled();
  });
});
