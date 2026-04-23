// bigpanda-app/lib/file-gen/types.ts

export type SlideLayout = 'bullets' | 'two-col' | 'metrics' | 'section';

export interface MetricItem {
  value: string;   // e.g. "93.6%"
  label: string;   // e.g. "Noise Reduction"
  sub?: string;    // e.g. "vs 89% last period"
}

export interface EltSlideJson {
  title: string;
  customer: string;
  period: string;
  slides: Array<{
    heading: string;
    layout?: SlideLayout;         // defaults to 'bullets'
    bullets?: string[];
    left?: string[];              // two-col: left column bullets
    right?: string[];             // two-col: right column bullets
    left_heading?: string;        // two-col: optional column heading
    right_heading?: string;
    metrics?: MetricItem[];       // metrics layout: up to 4 stat callouts
    status?: 'green' | 'amber' | 'red';  // optional RAG indicator in header
    notes?: string;
  }>;
}

export interface HtmlSkillJson {
  title: string;
  html: string;
}

export interface FileGenParams {
  skillName: string;
  outputText: string;
  project: { id: number; customer: string; name: string };
}

export interface FileGenResult {
  filepath: string;
  filename: string;
}
