import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

describe('html-generator', () => {
  const tmpDir = path.join(os.tmpdir(), 'html-gen-test-' + process.pid);

  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('SKILL-07: generateHtml writes .html file to disk at expected path', async () => {
    const { generateHtml } = await import('../html');
    mkdirSync(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, 'output.html');
    const html = '<html><body><h1>Test</h1></body></html>';

    generateHtml(html, outputPath);

    expect(existsSync(outputPath)).toBe(true);
    expect(readFileSync(outputPath, 'utf-8')).toBe(html);
  });

  it('SKILL-08: generateHtml for workflow-diagram creates per-customer directory if absent', async () => {
    const { generateHtml } = await import('../html');
    const nestedDir = path.join(tmpDir, 'customer', 'subdir');
    const outputPath = path.join(nestedDir, 'workflow.html');
    const html = '<html><body>Diagram</body></html>';

    // Directory does not exist — should be created by generateHtml
    expect(existsSync(nestedDir)).toBe(false);
    generateHtml(html, outputPath);
    expect(existsSync(outputPath)).toBe(true);
  });

  it('generateFile() with skillName workflow-diagram returns FileGenResult with .html extension', async () => {
    const { generateFile } = await import('../index');

    const outputText = JSON.stringify({ title: 'Workflow Diagram', html: '<html><body>Graph</body></html>' });
    const result = await generateFile({
      skillName: 'workflow-diagram',
      outputText,
      project: { id: 1, customer: 'TestCo', name: 'TestCo Project' },
    });

    expect(result.filepath).toMatch(/\.html$/);
    expect(result.filename).toMatch(/\.html$/);
    // Clean up the created file
    try { rmSync(result.filepath); } catch {}
  });
});
