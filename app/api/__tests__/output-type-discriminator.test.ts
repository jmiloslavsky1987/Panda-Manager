// @vitest-environment jsdom
// Tests for getOutputType discriminator and XSS sanitization in ReactMarkdown
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Tests 1-6: getOutputType discriminator
// ---------------------------------------------------------------------------

// These imports will fail until lib/output-utils.ts is created (RED phase)
import { getOutputType, type OutputRow } from '@/lib/output-utils';

function makeRow(overrides: Partial<OutputRow> = {}): OutputRow {
  return {
    id: 1,
    skill_name: 'test-skill',
    project_id: null,
    project_name: null,
    filename: null,
    filepath: null,
    content: null,
    status: 'completed',
    archived: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('getOutputType discriminator', () => {
  it('Test 1: returns html for skill_name containing html', () => {
    const row = makeRow({ skill_name: 'html-report' });
    expect(getOutputType(row)).toBe('html');
  });

  it('Test 2: returns html for filename ending .html', () => {
    const row = makeRow({ filename: 'report.html' });
    expect(getOutputType(row)).toBe('html');
  });

  it('Test 3: returns docx for filename ending .docx', () => {
    const row = makeRow({ filename: 'document.docx' });
    expect(getOutputType(row)).toBe('docx');
  });

  it('Test 4: returns pptx for filename ending .pptx', () => {
    const row = makeRow({ filename: 'presentation.pptx' });
    expect(getOutputType(row)).toBe('pptx');
  });

  it('Test 5: returns markdown for row with content and no filename', () => {
    const row = makeRow({ content: '# Meeting Summary\n\nSome text here.', filename: null });
    expect(getOutputType(row)).toBe('markdown');
  });

  it('Test 6: returns file for row with filepath only', () => {
    const row = makeRow({ filepath: '/some/path/file.pdf', filename: 'file.pdf', content: null });
    expect(getOutputType(row)).toBe('file');
  });
});

// ---------------------------------------------------------------------------
// Test 9: XSS sanitization via rehype-sanitize + ReactMarkdown
// ---------------------------------------------------------------------------
import React from 'react';
import { render } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

describe('ReactMarkdown XSS sanitization', () => {
  it('Test 9: rehypeSanitize strips <script> tags from rendered output', () => {
    const { container } = render(
      React.createElement(ReactMarkdown, { rehypePlugins: [rehypeSanitize] }, '<script>alert(1)</script>')
    );
    expect(container.querySelector('script')).toBeNull();
  });
});
