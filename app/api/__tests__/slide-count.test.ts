import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';

// ---------------------------------------------------------------------------
// Helper: count ppt/slides/slideN.xml entries in a ZIP buffer
// This logic mirrors what app/api/outputs/[id]/slide-count/route.ts does
// ---------------------------------------------------------------------------
async function countSlidesInBuffer(buffer: ArrayBuffer): Promise<number> {
  const JSZipLib = await import('jszip');
  const zip = await JSZipLib.default.loadAsync(buffer);
  return Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).length;
}

// ---------------------------------------------------------------------------
// Helper: build an in-memory ZIP with N slide entries
// ---------------------------------------------------------------------------
async function buildMockPptxZip(slideCount: number): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (let i = 1; i <= slideCount; i++) {
    zip.file(`ppt/slides/slide${i}.xml`, `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`);
  }
  // Add some unrelated files that should NOT be counted
  zip.file('ppt/slides/_rels/slide1.xml.rels', '<Relationships/>');
  zip.file('[Content_Types].xml', '<Types/>');
  const uint8 = await zip.generateAsync({ type: 'uint8array' });
  return uint8.buffer as ArrayBuffer;
}

describe('PPTX slide count extraction', () => {
  it('Test 7: returns correct count for ZIP with 3 slide entries', async () => {
    const buffer = await buildMockPptxZip(3);
    const count = await countSlidesInBuffer(buffer);
    expect(count).toBe(3);
  });

  it('Test 8: returns 0 for ZIP with no ppt/slides/ entries', async () => {
    const zip = new JSZip();
    zip.file('ppt/presentation.xml', '<p:presentation/>');
    zip.file('[Content_Types].xml', '<Types/>');
    const uint8 = await zip.generateAsync({ type: 'uint8array' });
    const buffer = uint8.buffer as ArrayBuffer;
    const count = await countSlidesInBuffer(buffer);
    expect(count).toBe(0);
  });
});
