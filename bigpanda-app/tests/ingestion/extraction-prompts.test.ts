// bigpanda-app/tests/ingestion/extraction-prompts.test.ts
// Phase 53 Wave 0: RED test stubs for prompt intelligence improvements (EXTR-02 through EXTR-07)
// These tests document behavioral expectations for prompt enhancements in Wave 1.

import { describe, it, expect } from 'vitest';
import { EXTRACTION_BASE, PASS_PROMPTS } from '../../worker/jobs/document-extraction';

describe('EXTR-02: XML tag structure for document content', () => {
  it('EXTRACTION_BASE includes <document> tag', () => {
    // RED: fails until Plan 02 wraps document content in <document> tags
    expect(EXTRACTION_BASE).toContain('<document>');
  });
});

describe('EXTR-03: pass-specific examples with <example> blocks', () => {
  it('PASS_PROMPTS[1] contains <example> block', () => {
    // RED: fails until Plan 02 adds examples to pass 1 prompt
    expect(PASS_PROMPTS[1]).toContain('<example>');
  });

  it('PASS_PROMPTS[2] contains <example> block', () => {
    // RED: fails until Plan 02 adds examples to pass 2 prompt
    expect(PASS_PROMPTS[2]).toContain('<example>');
  });

  it('PASS_PROMPTS[3] contains <example> block', () => {
    // RED: fails until Plan 02 adds examples to pass 3 prompt
    expect(PASS_PROMPTS[3]).toContain('<example>');
  });
});

describe('EXTR-04: inline inference hints co-located with field descriptions', () => {
  it('parent_section_name field description includes inline inference hint', () => {
    // RED: fails until Plan 02 adds inline hints after field definitions
    // Looking for a hint immediately after parent_section_name field description
    const parentSectionMatch = EXTRACTION_BASE.match(/parent_section_name.*?(?:infer|use|look for|from)/is);
    expect(parentSectionMatch).not.toBeNull();
  });

  it('track field description includes inline inference hint', () => {
    // RED: fails until Plan 02 adds inline hints for track inference
    const trackMatch = EXTRACTION_BASE.match(/track.*?(?:infer from|use|surrounding)/is);
    expect(trackMatch).not.toBeNull();
  });
});

describe('EXTR-05: lookup tables for status normalization', () => {
  it('EXTRACTION_BASE includes status lookup table with pipe delimiters', () => {
    // RED: fails until Plan 02 adds status lookup tables
    // Looking for table-style format like "| not_started |" or "| in_progress |"
    const hasTable = /\|\s*not_started\s*\||\|\s*in_progress\s*\||\|\s*complete\s*\|/i.test(EXTRACTION_BASE);
    expect(hasTable).toBe(true);
  });

  it('EXTRACTION_BASE includes mapping rows for status variants', () => {
    // RED: fails until Plan 02 adds status variant mappings
    // Looking for explicit mapping like "done" → "complete" or similar
    const hasMappings = /(?:done|finished|todo).*?(?:→|->|maps to)/i.test(EXTRACTION_BASE);
    expect(hasMappings).toBe(true);
  });
});

describe('EXTR-06: justification requirement for null dates', () => {
  it('EXTRACTION_BASE requires justification for null dates', () => {
    // RED: fails until Plan 02 adds justification requirement
    // Current text says "use null only when no signal" — need stronger "justify" language
    const hasJustification = /justif(?:y|ication)|explain.*?null|null.*?only when/i.test(EXTRACTION_BASE);
    expect(hasJustification).toBe(true);
  });

  it('EXTRACTION_BASE contains phrase requiring explicit justification for null dates', () => {
    // RED: fails until Plan 02 updates null date guidance
    expect(EXTRACTION_BASE.toLowerCase()).toMatch(/justif(?:y|ication)/);
  });
});

describe('EXTR-07: section scanning and self-check instructions in pass prompts', () => {
  it('each pass prompt contains section scanning instruction', () => {
    // RED: fails until Plan 02 adds "scan" instructions to pass prompts
    for (const passNum of [1, 2, 3] as const) {
      const passPrompt = PASS_PROMPTS[passNum];
      expect(passPrompt.toLowerCase()).toContain('scan');
    }
  });

  it('each pass prompt contains self-check step', () => {
    // RED: fails until Plan 02 adds self-check/verification instructions
    for (const passNum of [1, 2, 3] as const) {
      const passPrompt = PASS_PROMPTS[passNum];
      const hasSelfCheck = /self.check|verify your output|double.check/i.test(passPrompt);
      expect(hasSelfCheck).toBe(true);
    }
  });
});
