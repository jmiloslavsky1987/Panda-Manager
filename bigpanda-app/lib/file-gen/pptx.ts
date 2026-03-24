// bigpanda-app/lib/file-gen/pptx.ts
import PptxGenJS from 'pptxgenjs';
import { mkdirSync } from 'fs';
import path from 'path';
import type { EltSlideJson } from './types';

/**
 * Strip triple-backtick markdown fences that Claude wraps around JSON.
 * Claude reliably uses ```json\n...\n``` even when instructed otherwise.
 */
export function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
}

export async function generatePptx(data: EltSlideJson, outputPath: string): Promise<void> {
  mkdirSync(path.dirname(outputPath), { recursive: true });

  const pres = new PptxGenJS();
  // Title slide
  const titleSlide = pres.addSlide();
  titleSlide.addText(data.title, { x: 0.5, y: 1.5, w: 9, h: 1.5, fontSize: 36, bold: true, align: 'center' });
  titleSlide.addText(`${data.customer} — ${data.period}`, { x: 0.5, y: 3.2, w: 9, h: 0.6, fontSize: 20, align: 'center', color: '666666' });

  for (const slide of data.slides) {
    const s = pres.addSlide();
    s.addText(slide.heading, { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true });
    const bulletText = slide.bullets.map(b => ({ text: b, options: { bullet: true, fontSize: 18 } }));
    s.addText(bulletText, { x: 0.5, y: 1.3, w: 9, h: 4.5 });
    if (slide.notes) {
      s.addNotes(slide.notes);
    }
  }

  // pres.writeFile with absolute path — relative paths are resolved from process.cwd() in worker context
  await pres.writeFile({ fileName: outputPath });
}
