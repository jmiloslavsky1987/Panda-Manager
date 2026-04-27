import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// PREP-04 (SSE endpoint): /api/daily-prep/generate route exists, is a POST
//   endpoint, uses SSE streaming, calls Claude directly (no BullMQ, no skill_runs).
// PREP-05 (parallel generation): page fires parallel fetch+ReadableStream per
//   selected card; Generate Prep button disabled while any card is loading.
// PREP-06 (brief rendering): DailyPrepCard renders brief inline with
//   ReactMarkdown; Copy button present; LocalStorage persistence by selectedDate.
// ---------------------------------------------------------------------------

const routePath = path.resolve(__dirname, '../../app/api/daily-prep/generate/route.ts');
const pagePath = path.resolve(__dirname, '../../app/daily-prep/page.tsx');
const cardPath = path.resolve(__dirname, '../../components/DailyPrepCard.tsx');

describe('PREP-04: /api/daily-prep/generate SSE endpoint', () => {
  it('PREP-04 Test 1: route file exists at app/api/daily-prep/generate/route.ts', () => {
    expect(existsSync(routePath)).toBe(true);
  });

  it('PREP-04 Test 2: route exports export const dynamic = force-dynamic', () => {
    const source = readFileSync(routePath, 'utf-8');
    expect(source).toContain("export const dynamic = 'force-dynamic'");
  });

  it('PREP-04 Test 3: route exports a POST function', () => {
    const source = readFileSync(routePath, 'utf-8');
    expect(source).toContain('export async function POST');
  });

  it('PREP-04 Test 4: route uses requireSession for auth guard', () => {
    const source = readFileSync(routePath, 'utf-8');
    expect(source).toContain('requireSession');
  });

  it('PREP-04 Test 5: route does NOT insert a skillRuns row (no BullMQ)', () => {
    const source = readFileSync(routePath, 'utf-8');
    expect(source).not.toContain('skillRuns');
    expect(source).not.toContain('BullMQ');
    expect(source).not.toContain("Queue('");
  });

  it('PREP-04 Test 6: route uses resolveSkillsDir to resolve skill path', () => {
    const source = readFileSync(routePath, 'utf-8');
    expect(source).toContain('resolveSkillsDir');
  });

  it('PREP-04 Test 7: route reads meeting-prep.md skill file', () => {
    const source = readFileSync(routePath, 'utf-8');
    expect(source).toContain('meeting-prep.md');
  });

  it('PREP-04 Test 8: route calls Anthropic messages.stream with claude-sonnet-4-6', () => {
    const source = readFileSync(routePath, 'utf-8');
    expect(source).toContain('claude-sonnet-4-6');
    expect(source).toContain('messages.stream');
  });

  it('PREP-04 Test 9: route emits SSE text/event-stream content-type header', () => {
    const source = readFileSync(routePath, 'utf-8');
    expect(source).toContain('text/event-stream');
  });

  it('PREP-04 Test 10: route sends event: done signal when generation completes', () => {
    const source = readFileSync(routePath, 'utf-8');
    expect(source).toContain('event: done');
  });

  it('PREP-04 Test 11: route calls buildMeetingPrepContext when projectId is provided', () => {
    const source = readFileSync(routePath, 'utf-8');
    expect(source).toContain('buildMeetingPrepContext');
  });

  it('PREP-04 Test 12: route strips YAML front-matter from skill file before using as system prompt', () => {
    const source = readFileSync(routePath, 'utf-8');
    expect(source).toContain('stripFrontMatter');
  });

  it('PREP-04 Test 13: route has no module-scope DB imports', () => {
    const source = readFileSync(routePath, 'utf-8');
    const lines = source.split('\n');
    const importLines = lines.filter(l => l.trim().startsWith('import'));
    const hasDbImport = importLines.some(l => l.includes("from '@/db'") && !l.includes('//'));
    expect(hasDbImport).toBe(false);
  });
});

describe('PREP-05: parallel generation + loading state', () => {
  it('PREP-05 Test 1: page source contains handleGenerate function', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain('handleGenerate');
  });

  it('PREP-05 Test 2: handleGenerate fires fetch to /api/daily-prep/generate', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain('/api/daily-prep/generate');
  });

  it('PREP-05 Test 3: page uses ReadableStream reader to consume SSE (fetch+ReadableStream pattern)', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain('getReader');
    expect(source).toContain('TextDecoder');
  });

  it('PREP-05 Test 4: page sets briefStatus to loading before fetch starts', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain("'loading'");
    expect(source).toContain('briefStatus');
  });

  it('PREP-05 Test 5: Generate Prep button is disabled while any card has briefStatus = loading', () => {
    const source = readFileSync(pagePath, 'utf-8');
    // Must check for loading in the disabled condition
    expect(source).toContain("briefStatus === 'loading'");
  });

  it('PREP-05 Test 6: page fires all requests in parallel (forEach, not sequential await)', () => {
    const source = readFileSync(pagePath, 'utf-8');
    // Uses forEach with async callback for parallel firing (not Promise.all with map)
    // or at minimum fires without awaiting each sequentially
    expect(source).toContain('forEach');
  });

  it('PREP-05 Test 7: page sets briefStatus to done and selected to false after generation', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain("briefStatus: 'done'");
    expect(source).toContain("selected: false");
  });

  it('PREP-05 Test 8: page sets briefStatus to error on fetch failure', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain("briefStatus: 'error'");
  });
});

describe('PREP-06: inline brief rendering, Copy button, LocalStorage', () => {
  it('PREP-06 Test 1: DailyPrepCard imports ReactMarkdown', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain('ReactMarkdown');
  });

  it('PREP-06 Test 2: DailyPrepCard imports rehype-sanitize', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain('rehypeSanitize');
  });

  it('PREP-06 Test 3: DailyPrepCard renders ReactMarkdown for brief content', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain('<ReactMarkdown');
    expect(source).toContain('rehypePlugins');
  });

  it('PREP-06 Test 4: DailyPrepCard shows loading state when briefStatus is loading', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain("briefStatus === 'loading'");
    expect(source).toContain('Generating');
  });

  it('PREP-06 Test 5: DailyPrepCard shows error state when briefStatus is error', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain("briefStatus === 'error'");
    expect(source).toContain('Generation failed');
  });

  it('PREP-06 Test 6: DailyPrepCard has Copy button with Copied! feedback', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain('Copy');
    expect(source).toContain('Copied!');
    expect(source).toContain('copy-brief-button');
  });

  it('PREP-06 Test 7: DailyPrepCard has Collapse button when expanded', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain('Collapse');
    expect(source).toContain('onToggleExpand');
  });

  it('PREP-06 Test 8: page persists briefs to LocalStorage keyed by selectedDate', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain('daily-prep-briefs:${selectedDate}');
    expect(source).toContain('localStorage.setItem');
  });

  it('PREP-06 Test 9: page sets expanded to true after brief generation completes', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain('expanded: true');
  });
});
