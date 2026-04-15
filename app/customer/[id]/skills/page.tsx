// bigpanda-app/app/customer/[id]/skills/page.tsx
// Server Component shell — fetches recent runs server-side, renders SkillsTabClient
import { SkillsTabClient } from '../../../../components/SkillsTabClient';
import { getSkillRuns } from '../../../../lib/queries';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { resolveSkillsDir } from '../../../../lib/skill-path';
import { readSettings } from '../../../../lib/settings-core';
import type { SkillMeta } from '../../../../types/skills';
import { auth } from '../../../../lib/auth';
import { headers } from 'next/headers';
import { resolveRole } from '../../../../lib/auth-utils';
import { db } from '../../../../db';
import { projectMembers } from '../../../../db/schema';
import { and, eq } from 'drizzle-orm';

// Skills excluded from the Skills tab (backend processing skills, removed from catalog)
const EXCLUDED_SKILLS = new Set([
  'stakeholder-comms',
  'onboarding-checklist',
  'ai-plan-generator',
  'context-updater',      // backend processing skill per CONTEXT.md scope
]);

/**
 * parseSkillMeta — Parse YAML front-matter from skill .md file content
 * Returns SkillMeta with compliant=true if all required fields present and valid
 */
function parseSkillMeta(name: string, content: string): SkillMeta {
  // Default non-compliant stub
  const stub: SkillMeta = {
    name,
    label: '',
    description: '',
    inputRequired: false,
    inputLabel: '',
    schedulable: false,
    errorBehavior: 'retry',
    compliant: false,
  };

  // Check for front-matter block
  if (!content.startsWith('---')) {
    return stub;
  }

  // Extract front-matter (between first and second ---)
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return stub;
  }

  const frontMatter = match[1];
  const lines = frontMatter.split('\n');
  const fields: Record<string, string> = {};

  // Parse key-value pairs
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    fields[key] = value;
  }

  // Validate required fields
  const hasAllFields =
    fields.label &&
    fields.description &&
    fields.input_required !== undefined &&
    fields.input_label !== undefined &&
    fields.schedulable !== undefined &&
    fields.error_behavior !== undefined;

  if (!hasAllFields) {
    return { ...stub, label: fields.label || '', description: fields.description || '' };
  }

  // Validate field values
  const inputRequired = fields.input_required === 'true';
  const schedulable = fields.schedulable === 'true';
  const errorBehavior = fields.error_behavior;

  if (errorBehavior !== 'retry' && errorBehavior !== 'fail') {
    return { ...stub, label: fields.label, description: fields.description };
  }

  // All checks passed — compliant skill
  return {
    name,
    label: fields.label,
    description: fields.description,
    inputRequired,
    inputLabel: fields.input_label || '',
    schedulable,
    errorBehavior: errorBehavior as 'retry' | 'fail',
    compliant: true,
  };
}

/**
 * loadSkills — Server-side skill metadata loader
 * Reads all .md files from skills directory, parses front-matter, excludes backend processing skills
 */
async function loadSkills(): Promise<SkillMeta[]> {
  const settings = await readSettings();
  const skillsDir = resolveSkillsDir(settings.skill_path ?? '');
  let files: string[] = [];

  try {
    files = await readdir(skillsDir);
  } catch {
    return [];
  }

  const skills: SkillMeta[] = [];

  for (const file of files) {
    if (!file.endsWith('.md') || file === 'SKILLS-DESIGN-STANDARD.md') continue;
    const name = file.replace('.md', '');
    if (EXCLUDED_SKILLS.has(name)) continue;

    try {
      const content = await readFile(path.join(skillsDir, file), 'utf-8');
      skills.push(parseSkillMeta(name, content));
    } catch {
      // Skip unreadable files
    }
  }

  return skills;
}

export default async function SkillsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = parseInt(id);

  let recentRuns: Awaited<ReturnType<typeof getSkillRuns>> = [];
  try {
    recentRuns = await getSkillRuns(projectId, 10);
  } catch {
    // DB not available — render empty recent runs list
  }

  const skills = await loadSkills();

  // Resolve admin role for prompt editing feature
  const settings = await readSettings();
  const session = await auth.api.getSession({ headers: await headers() });
  let isAdmin = false;
  if (session?.user) {
    if (resolveRole(session) === 'admin') {
      isAdmin = true;
    } else {
      const [member] = await db.select({ role: projectMembers.role })
        .from(projectMembers)
        .where(and(eq(projectMembers.project_id, projectId), eq(projectMembers.user_id, session.user.id)))
        .limit(1);
      isAdmin = member?.role === 'admin';
    }
  }

  return (
    <SkillsTabClient
      projectId={projectId}
      recentRuns={recentRuns}
      skills={skills}
      promptEditingEnabled={settings.prompt_editing_enabled ?? false}
      isAdmin={isAdmin}
    />
  );
}
