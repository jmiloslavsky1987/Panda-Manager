import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// OUT-01 (PDF / print export): daily-prep page has an "Export" button that
//   triggers window.print(); @media print rules hide non-brief UI; DailyPrepCard
//   marks brief sections with data-print-visible; "Export All" triggers print
//   with all cards expanded.
// ---------------------------------------------------------------------------

const pagePath = path.resolve(__dirname, '../../app/daily-prep/page.tsx');
const globalsPath = path.resolve(__dirname, '../../app/globals.css');
const cardPath = path.resolve(__dirname, '../../components/DailyPrepCard.tsx');

describe('OUT-01: window.print() export trigger', () => {
  it('OUT-01 Test 1: daily-prep page.tsx contains window.print()', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain('window.print()');
  });

  it('OUT-01 Test 2: daily-prep page.tsx contains "Export" button text', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain('Export');
  });

  it('OUT-01 Test 4: daily-prep page.tsx contains "Export All" text', () => {
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain('Export All');
  });
});

describe('OUT-01: @media print CSS rules', () => {
  it('OUT-01 Test 3: globals.css contains @media print rules', () => {
    const source = readFileSync(globalsPath, 'utf-8');
    expect(source).toContain('@media print');
  });
});

describe('OUT-01: DailyPrepCard print-friendly attributes', () => {
  it('OUT-01 Test 5: DailyPrepCard.tsx contains data-print-visible attribute', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain('data-print-visible');
  });
});
