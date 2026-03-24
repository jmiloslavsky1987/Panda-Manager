import os from 'os';
import path from 'path';
import { readSettings } from '../settings-core';
import { generatePptx, stripFences } from './pptx';
import { generateHtml } from './html';
import type { FileGenParams, FileGenResult, EltSlideJson, HtmlSkillJson } from './types';

const SKILL_EXT: Record<string, string> = {
  'elt-external-status': 'pptx',
  'elt-internal-status': 'pptx',
  'team-engagement-map': 'html',
  'workflow-diagram': 'html',
};

const SKILL_PREFIX: Record<string, string> = {
  'elt-external-status': 'ELT-External',
  'elt-internal-status': 'ELT-Internal',
  'team-engagement-map': 'Team-Engagement-Map',
  'workflow-diagram': 'Workflow-Diagram',
};

async function buildOutputPath(skillName: string, customer: string): Promise<FileGenResult> {
  const settings = await readSettings();
  // workspace_path may be:
  //   ~/...         → replace ~ with homedir
  //   /Documents/   → relative to homedir (leading slash = relative to home, not absolute)
  //   /absolute/    → treat as absolute
  const wp = settings.workspace_path;
  let base: string;
  if (wp.startsWith('~/') || wp === '~') {
    base = wp.replace(/^~/, os.homedir());
  } else if (wp.startsWith('/') && !wp.startsWith('/Users') && !wp.startsWith('/home')) {
    // Relative-to-homedir form: e.g. '/Documents/PM Application'
    base = path.join(os.homedir(), wp);
  } else {
    base = wp;
  }

  const safeCustomer = customer.replace(/[^a-zA-Z0-9 _-]/g, '_');
  const customerDir = path.join(base, safeCustomer);
  const date = new Date().toISOString().slice(0, 7); // "2026-03"
  const slug = customer.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  const ext = SKILL_EXT[skillName];
  const prefix = SKILL_PREFIX[skillName];
  const filename = `${prefix}-${slug}-${date}.${ext}`;
  return { filepath: path.join(customerDir, filename), filename };
}

export async function generateFile(params: FileGenParams): Promise<FileGenResult> {
  const { skillName, outputText, project } = params;
  const raw = stripFences(outputText);
  const { filepath, filename } = await buildOutputPath(skillName, project.customer ?? project.name);

  if (SKILL_EXT[skillName] === 'pptx') {
    const data: EltSlideJson = JSON.parse(raw);
    await generatePptx(data, filepath);
  } else if (SKILL_EXT[skillName] === 'html') {
    const data: HtmlSkillJson = JSON.parse(raw);
    generateHtml(data.html, filepath);
  } else {
    throw new Error(`generateFile: unknown file skill '${skillName}'`);
  }

  return { filepath, filename };
}
