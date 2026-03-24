// bigpanda-app/lib/file-gen/types.ts
export interface EltSlideJson {
  title: string;
  customer: string;
  period: string;       // e.g. "March 2026"
  slides: Array<{
    heading: string;
    bullets: string[];
    notes?: string;     // presenter notes
  }>;
}

export interface HtmlSkillJson {
  title: string;
  html: string;         // self-contained HTML string with inline CSS
}

export interface FileGenParams {
  skillName: string;
  outputText: string;   // raw full_output from skill_runs — may have markdown fences
  project: { id: number; customer: string; name: string };
}

export interface FileGenResult {
  filepath: string;
  filename: string;
}
