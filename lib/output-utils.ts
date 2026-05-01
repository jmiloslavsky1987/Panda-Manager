// Pure utility module — no 'use client' directive.
// Safe to import in Vitest without Next.js environment setup.

export interface OutputRow {
  id: number;
  skill_name: string;
  project_id: number | null;
  project_name: string | null;
  filename: string | null;
  filepath: string | null;
  content: string | null;
  status: string;
  archived: boolean;
  created_at: string;
}

const HTML_SKILLS = new Set(['team-engagement-map', 'workflow-diagram']);

export function getOutputType(o: OutputRow): 'html' | 'markdown' | 'docx' | 'pptx' | 'file' {
  if (HTML_SKILLS.has(o.skill_name) || o.skill_name.includes('html') || o.filename?.endsWith('.html')) return 'html';
  if (o.filename?.endsWith('.docx')) return 'docx';
  if (o.filename?.endsWith('.pptx')) return 'pptx';
  if (!o.filename || o.content) return 'markdown'; // content-bearing, no binary extension
  return 'file';
}
