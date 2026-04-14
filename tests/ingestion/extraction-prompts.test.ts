// bigpanda-app/tests/ingestion/extraction-prompts.test.ts
// Phase 53 Wave 0: RED test stubs for prompt intelligence improvements (EXTR-02 through EXTR-07)
// These tests document behavioral expectations for prompt enhancements in Wave 1.

import { describe, it, expect } from 'vitest';
import { EXTRACTION_BASE, PASS_PROMPTS, PASS_0_PROMPT } from '../../worker/jobs/document-extraction';

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

// ── Phase 57: Synthesis-first extraction for unstructured notes ──────────────

describe('SYNTH-01: Global inference posture in EXTRACTION_BASE', () => {
  it('EXTRACTION_BASE contains inference-first posture instruction for unstructured documents', () => {
    // RED: fails until Plan 01 rewrites EXTRACTION_BASE global posture
    const hasInferencePosture = /unstructured/i.test(EXTRACTION_BASE) &&
      /infer/i.test(EXTRACTION_BASE);
    expect(hasInferencePosture).toBe(true);
  });
});

describe('SYNTH-02: Pass 0 document type classification', () => {
  it('PASS_0_PROMPT outputs document_type XML tag', () => {
    // RED: fails until Plan 01 rewrites PASS_0_PROMPT with classification step
    expect(PASS_0_PROMPT).toContain('document_type');
  });
});

describe('SYNTH-03: Pass 0 entity type prediction', () => {
  it('PASS_0_PROMPT outputs likely_entity_types XML tag', () => {
    // RED: fails until Plan 01 rewrites PASS_0_PROMPT with entity prediction step
    expect(PASS_0_PROMPT).toContain('likely_entity_types');
  });
});

describe('SYNTH-04: Transcript-mode conditional instructions in all pass prompts', () => {
  it('PASS_PROMPTS[1] contains transcript-mode conditional extraction instruction', () => {
    // RED: fails until Plan 01 adds conditional behavior to Pass 1
    expect(PASS_PROMPTS[1].toLowerCase()).toContain('transcript');
  });
  it('PASS_PROMPTS[2] contains transcript-mode conditional extraction instruction', () => {
    // RED: fails until Plan 01 adds conditional behavior to Pass 2
    expect(PASS_PROMPTS[2].toLowerCase()).toContain('transcript');
  });
  it('PASS_PROMPTS[3] contains transcript-mode conditional extraction instruction', () => {
    // RED: fails until Plan 01 adds conditional behavior to Pass 3
    expect(PASS_PROMPTS[3].toLowerCase()).toContain('transcript');
  });
});

describe('SYNTH-05: Confidence calibration and singleton enforcement', () => {
  it('EXTRACTION_BASE includes confidence rubric with 0.5-0.7 range for inferred entities', () => {
    // RED: fails until Plan 01 adds confidence calibration rubric
    const hasCalibrationRange = EXTRACTION_BASE.includes('0.5') && EXTRACTION_BASE.includes('0.7');
    expect(hasCalibrationRange).toBe(true);
  });

  it('PASS_PROMPTS[3] weekly_focus description includes SINGLETON marker', () => {
    // RED: fails until Plan 01 adds SINGLETON enforcement to weekly_focus
    const weeklyFocusIdx = PASS_PROMPTS[3].indexOf('weekly_focus');
    const singletonIdx = PASS_PROMPTS[3].indexOf('SINGLETON');
    expect(weeklyFocusIdx).toBeGreaterThan(-1);
    expect(singletonIdx).toBeGreaterThan(-1);
  });

  it('PASS_PROMPTS[2] before_state description includes SINGLETON marker', () => {
    // RED: fails until Plan 01 adds SINGLETON enforcement to before_state
    expect(PASS_PROMPTS[2].indexOf('SINGLETON')).toBeGreaterThan(-1);
  });

  it('PASS_PROMPTS[3] e2e_workflow description includes assembly-from-scattered-mentions guidance', () => {
    // RED: fails until Plan 01 adds assembly guidance to e2e_workflow description
    expect(PASS_PROMPTS[3].toLowerCase()).toContain('scattered');
  });
});

// ── Phase 57 gap-closure: arch phase inference & bidirectional track matching ─

describe('ARCH-PHASE-01: PASS_PROMPTS[2] architecture entity phase guidance', () => {
  it('Pass 2 prompt defines architecture phase as a pipeline stage name, not a status word', () => {
    // The architecture entity description must guide the AI to set phase = stage name.
    // Without this, documents produce phase="production"/"in progress" and cards land in no column.
    const pass2 = PASS_PROMPTS[2];
    expect(pass2).toContain('architecture');
    expect(pass2).toContain('phase');
  });

  it('Pass 2 prompt distinguishes architecture vs arch_node vs integration entity types', () => {
    // Critical disambiguation — missing this causes tools to be extracted as the wrong type.
    const pass2 = PASS_PROMPTS[2];
    expect(pass2).toContain('arch_node');
    expect(pass2).toContain('integration');
  });
});

describe('ARCH-PHASE-02: approve route uses bidirectional ilike for arch_track lookup', () => {
  it('approve/route.ts imports `or` and `sql` from drizzle-orm for bidirectional matching', async () => {
    // The bridge must use OR(archTracks.name ilike %track%, track ilike %archTracks.name%)
    // so that "ADR" matches "ADR Track" AND "ADR Track" matches "ADR".
    const fs = await import('node:fs/promises');
    const src = await fs.readFile(
      new URL('../../app/api/ingestion/approve/route.ts', import.meta.url),
      'utf-8'
    );
    // Both `or` and `sql` must be imported
    expect(src).toMatch(/import\s*\{[^}]*\bor\b[^}]*\}\s*from\s*['"]drizzle-orm['"]/);
    expect(src).toMatch(/import\s*\{[^}]*\bsql\b[^}]*\}\s*from\s*['"]drizzle-orm['"]/);
  });

  it('approve/route.ts uses concat in the bidirectional ilike for arch_track lookup', async () => {
    // Verify the bidirectional pattern: sql`${archTrackName} ilike concat('%', ${archTracks.name}, '%')`
    const fs = await import('node:fs/promises');
    const src = await fs.readFile(
      new URL('../../app/api/ingestion/approve/route.ts', import.meta.url),
      'utf-8'
    );
    expect(src).toContain('concat');
    // The or() wrapping both ilike directions
    const bridgeSection = src.slice(src.indexOf('Bridge: also upsert'));
    expect(bridgeSection).toContain('or(');
    expect(bridgeSection).toContain('ilike(archTracks.name');
  });
});
