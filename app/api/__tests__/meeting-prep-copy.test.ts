import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Import stripMarkdown for testing
// ---------------------------------------------------------------------------
import { stripMarkdown } from '@/lib/strip-markdown';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stripMarkdown', () => {
  it('Test 3: stripMarkdown removes heading markers and bold/italic syntax', () => {
    const input = '# Header\n**bold** text';
    const result = stripMarkdown(input);
    expect(result).toBe('Header\nbold text');
  });

  it('Test 4: stripMarkdown removes bullet markers and link syntax, collapses 3+ blank lines to 2', () => {
    const input = '- First item\n* Second item\n+ Third item\n\n\n\nParagraph after\n[link text](http://example.com)';
    const result = stripMarkdown(input);
    expect(result).not.toContain('- First');
    expect(result).not.toContain('* Second');
    expect(result).not.toContain('[link text](http://example.com)');
    expect(result).toContain('link text');
    // 3+ blank lines should be collapsed to 2
    expect(result).not.toMatch(/\n{4,}/);
  });

  it('Test 5: stripMarkdown trims result', () => {
    const input = '\n\n# Padded heading\n\n';
    const result = stripMarkdown(input);
    expect(result).toBe('Padded heading');
  });
});
