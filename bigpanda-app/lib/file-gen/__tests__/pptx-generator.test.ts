import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

describe('pptx-generator', () => {
  const tmpDir = path.join(os.tmpdir(), 'pptx-gen-test-' + process.pid);

  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('SKILL-05: generatePptx writes a file to disk given valid EltSlideJson', async () => {
    const { generatePptx } = await import('../pptx');
    mkdirSync(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, 'output.pptx');

    const data = {
      title: 'ELT External Status',
      customer: 'Acme Corp',
      period: 'March 2026',
      slides: [
        { heading: 'Progress', bullets: ['On track', 'All milestones met'], notes: 'Presenter note' },
      ],
    };

    await generatePptx(data, outputPath);
    expect(existsSync(outputPath)).toBe(true);
  });

  it('SKILL-06: generatePptx for internal status uses direct tone JSON structure', async () => {
    const { generatePptx } = await import('../pptx');
    mkdirSync(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, 'internal.pptx');

    const data = {
      title: 'ELT Internal Status',
      customer: 'Acme Corp',
      period: 'March 2026',
      slides: [
        { heading: 'Risks', bullets: ['Delayed timeline', 'Resource constraint'] },
        { heading: 'Actions', bullets: ['Escalate to PM', 'Schedule review'] },
      ],
    };

    await generatePptx(data, outputPath);
    expect(existsSync(outputPath)).toBe(true);
  });

  it('strips markdown fences from Claude output before JSON.parse', async () => {
    const { stripFences } = await import('../pptx');

    const withJsonFence = '```json\n{"key":"value"}\n```';
    const withPlainFence = '```\n{"key":"value"}\n```';
    const plain = '{"key":"value"}';

    expect(stripFences(withJsonFence)).toBe('{"key":"value"}');
    expect(stripFences(withPlainFence)).toBe('{"key":"value"}');
    expect(stripFences(plain)).toBe('{"key":"value"}');
  });
});
