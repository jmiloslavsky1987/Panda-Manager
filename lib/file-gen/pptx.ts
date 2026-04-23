// bigpanda-app/lib/file-gen/pptx.ts
import PptxGenJS from 'pptxgenjs';
import { mkdirSync } from 'fs';
import path from 'path';
import type { EltSlideJson, MetricItem } from './types';

// ─── BigPanda Brand Palette ───────────────────────────────────────────────────
const BP = {
  blue:        '0041F5',
  blueDark:    '0032C0',
  blueLight:   'C7DAFF',
  bluePale:    'EEF3FF',
  green:       '48E58F',
  greenDark:   '1BAD62',
  amber:       'FFC356',
  amberDark:   'E6993A',
  red:         'F8C7C3',
  redDark:     'D94F3D',
  nearBlack:   '1A1A1A',
  darkGrey:    '282828',
  midGrey:     '607177',
  lightGrey:   'F2F4F7',
  white:       'FFFFFF',
} as const;

// RAG status → accent color
const RAG: Record<string, string> = {
  green: BP.green,
  amber: BP.amber,
  red:   BP.redDark,
};

// Slide dimensions (16:9 in inches)
const W = 10;
const H = 5.625;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
}

function addBackground(slide: PptxGenJS.Slide, color: string) {
  slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color }, line: { color, width: 0 } });
}

function addHeader(slide: PptxGenJS.Slide, text: string, options?: { accent?: string; sub?: string }) {
  const accentColor = options?.accent ?? BP.blue;

  // Top accent bar
  slide.addShape('rect', { x: 0, y: 0, w: W, h: 0.08, fill: { color: accentColor }, line: { color: accentColor, width: 0 } });

  // Header background strip
  slide.addShape('rect', { x: 0, y: 0.08, w: W, h: 0.72, fill: { color: BP.darkGrey }, line: { color: BP.darkGrey, width: 0 } });

  // Title text
  slide.addText(text, {
    x: 0.35, y: 0.08, w: 8.6, h: 0.72,
    fontSize: 20, bold: true, color: BP.white, valign: 'middle',
    fontFace: 'Arial',
  });

  // Optional sub / period text top-right
  if (options?.sub) {
    slide.addText(options.sub, {
      x: 7.2, y: 0.08, w: 2.6, h: 0.72,
      fontSize: 10, color: BP.blueLight, valign: 'middle', align: 'right',
      fontFace: 'Arial',
    });
  }
}

function addFooter(slide: PptxGenJS.Slide, customer: string, period: string) {
  // Footer bar
  slide.addShape('rect', { x: 0, y: H - 0.3, w: W, h: 0.3, fill: { color: BP.darkGrey }, line: { color: BP.darkGrey, width: 0 } });
  slide.addText(`${customer}  ·  BigPanda  ·  ${period}`, {
    x: 0.35, y: H - 0.3, w: 6, h: 0.3,
    fontSize: 8, color: BP.midGrey, valign: 'middle',
    fontFace: 'Arial',
  });
  slide.addText('Confidential', {
    x: 7.5, y: H - 0.3, w: 2.15, h: 0.3,
    fontSize: 8, color: BP.midGrey, valign: 'middle', align: 'right',
    fontFace: 'Arial',
  });
}

function addStatusBadge(slide: PptxGenJS.Slide, status: 'green' | 'amber' | 'red') {
  const labels: Record<string, string> = { green: '● On Track', amber: '● At Risk', red: '● Off Track' };
  const colors: Record<string, string> = { green: BP.greenDark, amber: BP.amberDark, red: BP.redDark };
  slide.addText(labels[status], {
    x: W - 1.8, y: 0.82, w: 1.6, h: 0.28,
    fontSize: 9, bold: true, color: colors[status], align: 'right',
    fontFace: 'Arial',
  });
}

// ─── Slide builders ──────────────────────────────────────────────────────────

function buildCoverSlide(pres: PptxGenJS, data: EltSlideJson) {
  const s = pres.addSlide();

  // Full dark background
  addBackground(s, BP.darkGrey);

  // Left blue accent column
  s.addShape('rect', { x: 0, y: 0, w: 0.18, h: H, fill: { color: BP.blue }, line: { color: BP.blue, width: 0 } });

  // Bottom green accent bar
  s.addShape('rect', { x: 0, y: H - 0.12, w: W, h: 0.12, fill: { color: BP.green }, line: { color: BP.green, width: 0 } });

  // BP logotype placeholder (top-right)
  s.addText('BigPanda', {
    x: W - 2.2, y: 0.3, w: 1.9, h: 0.5,
    fontSize: 18, bold: true, color: BP.blue, align: 'right',
    fontFace: 'Arial',
  });

  // Customer name
  s.addText(data.customer, {
    x: 0.55, y: 1.4, w: 7, h: 0.7,
    fontSize: 28, bold: true, color: BP.white,
    fontFace: 'Arial',
  });

  // Title
  s.addText(data.title, {
    x: 0.55, y: 2.15, w: 7.5, h: 1.1,
    fontSize: 22, color: BP.blueLight,
    fontFace: 'Arial',
  });

  // Period pill
  s.addShape('rect', { x: 0.55, y: 3.45, w: 1.8, h: 0.38, fill: { color: BP.blue }, line: { color: BP.blue, width: 0 }, rectRadius: 0.05 });
  s.addText(data.period, {
    x: 0.55, y: 3.45, w: 1.8, h: 0.38,
    fontSize: 12, bold: true, color: BP.white, align: 'center', valign: 'middle',
    fontFace: 'Arial',
  });
}

function buildSectionSlide(pres: PptxGenJS, heading: string, customer: string, period: string) {
  const s = pres.addSlide();
  addBackground(s, BP.darkGrey);

  // Left blue bar
  s.addShape('rect', { x: 0, y: 0, w: 0.18, h: H, fill: { color: BP.blue }, line: { color: BP.blue, width: 0 } });

  s.addText(heading, {
    x: 0.55, y: 1.9, w: 8.5, h: 1.2,
    fontSize: 32, bold: true, color: BP.white,
    fontFace: 'Arial',
  });

  // Bottom accent
  s.addShape('rect', { x: 0, y: H - 0.12, w: W, h: 0.12, fill: { color: BP.blue }, line: { color: BP.blue, width: 0 } });
  addFooter(s, customer, period);
}

function buildBulletsSlide(
  pres: PptxGenJS,
  heading: string,
  bullets: string[],
  customer: string,
  period: string,
  status?: 'green' | 'amber' | 'red',
): PptxGenJS.Slide {
  const s = pres.addSlide();
  addBackground(s, BP.white);
  addHeader(s, heading, { accent: BP.blue, sub: period });
  addFooter(s, customer, period);

  if (status) addStatusBadge(s, status);

  // Content area background
  s.addShape('rect', { x: 0.3, y: 0.95, w: W - 0.6, h: H - 1.45, fill: { color: BP.lightGrey }, line: { color: BP.lightGrey, width: 0 } });

  // Left accent rule
  s.addShape('rect', { x: 0.3, y: 0.95, w: 0.05, h: H - 1.45, fill: { color: BP.blue }, line: { color: BP.blue, width: 0 } });

  const bulletItems = bullets.map(b => ({
    text: b,
    options: { bullet: { code: '2022' }, fontSize: 13, color: BP.nearBlack, paraSpaceAfter: 4, fontFace: 'Arial' } as PptxGenJS.TextPropsOptions,
  }));

  s.addText(bulletItems, {
    x: 0.45, y: 1.0, w: W - 0.85, h: H - 1.5,
    valign: 'top', fontFace: 'Arial',
  });
  return s;
}

function buildTwoColSlide(
  pres: PptxGenJS,
  heading: string,
  leftHeading: string,
  left: string[],
  rightHeading: string,
  right: string[],
  customer: string,
  period: string,
  status?: 'green' | 'amber' | 'red',
): PptxGenJS.Slide {
  const s = pres.addSlide();
  addBackground(s, BP.white);
  addHeader(s, heading, { accent: BP.blue, sub: period });
  addFooter(s, customer, period);

  if (status) addStatusBadge(s, status);

  const colY = 0.95;
  const colH = H - 1.45;
  const colW = (W - 0.75) / 2;

  // Left column
  s.addShape('rect', { x: 0.3, y: colY, w: colW, h: colH, fill: { color: BP.lightGrey }, line: { color: BP.lightGrey, width: 0 } });
  s.addShape('rect', { x: 0.3, y: colY, w: colW, h: 0.05, fill: { color: BP.blue }, line: { color: BP.blue, width: 0 } });
  if (leftHeading) {
    s.addText(leftHeading, {
      x: 0.35, y: colY + 0.06, w: colW - 0.1, h: 0.3,
      fontSize: 11, bold: true, color: BP.blue, fontFace: 'Arial',
    });
  }
  const leftItems = left.map(b => ({
    text: b,
    options: { bullet: { code: '2022' }, fontSize: 12, color: BP.nearBlack, paraSpaceAfter: 4, fontFace: 'Arial' } as PptxGenJS.TextPropsOptions,
  }));
  s.addText(leftItems, {
    x: 0.38, y: colY + (leftHeading ? 0.38 : 0.1), w: colW - 0.16, h: colH - (leftHeading ? 0.48 : 0.2),
    valign: 'top', fontFace: 'Arial',
  });

  // Right column
  const rx = 0.3 + colW + 0.15;
  s.addShape('rect', { x: rx, y: colY, w: colW, h: colH, fill: { color: BP.bluePale }, line: { color: BP.bluePale, width: 0 } });
  s.addShape('rect', { x: rx, y: colY, w: colW, h: 0.05, fill: { color: BP.green }, line: { color: BP.green, width: 0 } });
  if (rightHeading) {
    s.addText(rightHeading, {
      x: rx + 0.05, y: colY + 0.06, w: colW - 0.1, h: 0.3,
      fontSize: 11, bold: true, color: BP.greenDark, fontFace: 'Arial',
    });
  }
  const rightItems = right.map(b => ({
    text: b,
    options: { bullet: { code: '2022' }, fontSize: 12, color: BP.nearBlack, paraSpaceAfter: 4, fontFace: 'Arial' } as PptxGenJS.TextPropsOptions,
  }));
  s.addText(rightItems, {
    x: rx + 0.08, y: colY + (rightHeading ? 0.38 : 0.1), w: colW - 0.16, h: colH - (rightHeading ? 0.48 : 0.2),
    valign: 'top', fontFace: 'Arial',
  });
  return s;
}

function buildMetricsSlide(
  pres: PptxGenJS,
  heading: string,
  metrics: MetricItem[],
  bullets: string[],
  customer: string,
  period: string,
): PptxGenJS.Slide {
  const s = pres.addSlide();
  addBackground(s, BP.white);
  addHeader(s, heading, { accent: BP.blue, sub: period });
  addFooter(s, customer, period);

  const capped = metrics.slice(0, 4);
  const count = capped.length;
  const cardW = (W - 0.6) / count;
  const cardH = 1.7;
  const cardY = 1.0;

  capped.forEach((m, i) => {
    const cx = 0.3 + i * cardW;
    // Card background alternates blue / pale
    const cardBg = i % 2 === 0 ? BP.blue : BP.darkGrey;
    s.addShape('rect', { x: cx, y: cardY, w: cardW - 0.1, h: cardH, fill: { color: cardBg }, line: { color: cardBg, width: 0 } });

    // Big number
    s.addText(m.value, {
      x: cx + 0.1, y: cardY + 0.15, w: cardW - 0.3, h: 0.85,
      fontSize: 32, bold: true, color: BP.white, align: 'center', valign: 'middle',
      fontFace: 'Arial',
    });
    // Label
    s.addText(m.label, {
      x: cx + 0.05, y: cardY + 1.05, w: cardW - 0.2, h: 0.38,
      fontSize: 11, color: BP.blueLight, align: 'center',
      fontFace: 'Arial',
    });
    // Sub
    if (m.sub) {
      s.addText(m.sub, {
        x: cx + 0.05, y: cardY + 1.42, w: cardW - 0.2, h: 0.25,
        fontSize: 9, color: BP.midGrey, align: 'center',
        fontFace: 'Arial',
      });
    }
  });

  // Supporting bullets below cards
  if (bullets.length > 0) {
    s.addShape('rect', { x: 0.3, y: cardY + cardH + 0.12, w: W - 0.6, h: H - cardY - cardH - 0.55, fill: { color: BP.lightGrey }, line: { color: BP.lightGrey, width: 0 } });
    s.addShape('rect', { x: 0.3, y: cardY + cardH + 0.12, w: 0.05, h: H - cardY - cardH - 0.55, fill: { color: BP.green }, line: { color: BP.green, width: 0 } });
    const bItems = bullets.map(b => ({
      text: b,
      options: { bullet: { code: '2022' }, fontSize: 12, color: BP.nearBlack, paraSpaceAfter: 3, fontFace: 'Arial' } as PptxGenJS.TextPropsOptions,
    }));
    s.addText(bItems, {
      x: 0.45, y: cardY + cardH + 0.16, w: W - 0.85, h: H - cardY - cardH - 0.65,
      valign: 'top', fontFace: 'Arial',
    });
  }
  return s;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generatePptx(data: EltSlideJson, outputPath: string): Promise<void> {
  mkdirSync(path.dirname(outputPath), { recursive: true });

  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'BigPanda';
  pres.company = 'BigPanda';
  pres.subject = data.title;
  pres.title = data.title;

  buildCoverSlide(pres, data);

  for (const slide of data.slides) {
    const layout = slide.layout ?? 'bullets';
    const bullets = slide.bullets ?? [];

    if (layout === 'section') {
      buildSectionSlide(pres, slide.heading, data.customer, data.period);
      continue;
    }

    if (layout === 'two-col') {
      const s = buildTwoColSlide(
        pres,
        slide.heading,
        slide.left_heading ?? 'Progress',
        slide.left ?? [],
        slide.right_heading ?? 'Looking Ahead',
        slide.right ?? [],
        data.customer,
        data.period,
        slide.status,
      );
      if (slide.notes) s.addNotes(slide.notes);
      continue;
    }

    if (layout === 'metrics' && slide.metrics?.length) {
      const s = buildMetricsSlide(pres, slide.heading, slide.metrics, bullets, data.customer, data.period);
      if (slide.notes) s.addNotes(slide.notes);
      continue;
    }

    // Default: bullets
    const s = buildBulletsSlide(pres, slide.heading, bullets, data.customer, data.period, slide.status);
    if (slide.notes) s.addNotes(slide.notes);
  }

  await pres.writeFile({ fileName: outputPath });
}
