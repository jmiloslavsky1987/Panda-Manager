/**
 * app/api/skills/[skillName]/prompt/route.ts
 *
 * GET  /api/skills/[skillName]/prompt — Read skill prompt (split front-matter + body)
 * PATCH /api/skills/[skillName]/prompt — Update skill prompt body (admin-only, requires prompt_editing_enabled)
 *
 * SKILL-03b implementation: Atomic file writes, Design Standard validation, audit logging
 */

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-server';
import { resolveRole } from '@/lib/auth-utils';
import { readSettings } from '@/lib/settings-core';
import { resolveSkillsDir } from '@/lib/skill-path';
import { db } from '@/db';
import { auditLog } from '@/db/schema';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';

/**
 * splitSkillFile — Extract front-matter and body from skill .md file
 * Returns { frontMatter: '---\n...\n---', body: '...' }
 */
function splitSkillFile(content: string): { frontMatter: string; body: string } {
  if (!content.startsWith('---')) {
    return { frontMatter: '', body: content };
  }

  // Extract front-matter block (first --- to second ---)
  const fmMatch = content.match(/^(---\n[\s\S]*?\n---)/);
  if (!fmMatch) {
    return { frontMatter: '', body: content };
  }

  const frontMatter = fmMatch[1];

  // Extract body after front-matter (with optional newline after second ---)
  const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  const body = bodyMatch ? bodyMatch[1] : '';

  return { frontMatter, body };
}

/**
 * validateSkillDesignStandard — Check if skill content conforms to Design Standard
 * Returns { valid: true } or { valid: false, error: string }
 */
function validateSkillDesignStandard(content: string): { valid: true } | { valid: false; error: string } {
  // Check for front-matter block
  if (!content.startsWith('---')) {
    return { valid: false, error: 'Missing front-matter block (must start with ---)' };
  }

  // Extract front-matter
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return { valid: false, error: 'Malformed front-matter block (missing closing ---)' };
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
  const requiredFields = ['label', 'description', 'input_required', 'input_label', 'schedulable', 'error_behavior'];
  const missingFields = requiredFields.filter(f => fields[f] === undefined);

  if (missingFields.length > 0) {
    return { valid: false, error: `Missing required fields: ${missingFields.join(', ')}` };
  }

  // Validate error_behavior enum
  const errorBehavior = fields.error_behavior;
  if (errorBehavior !== 'retry' && errorBehavior !== 'fail') {
    return { valid: false, error: `error_behavior must be 'retry' or 'fail', got '${errorBehavior}'` };
  }

  return { valid: true };
}

/**
 * GET /api/skills/[skillName]/prompt
 * Returns { frontMatter: string, body: string }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ skillName: string }> }
) {
  // Auth check
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { skillName } = await params;

  try {
    // Resolve skill file path
    const settings = await readSettings();
    const skillsDir = resolveSkillsDir(settings.skill_path ?? '');
    const filePath = path.join(skillsDir, `${skillName}.md`);

    // Check if file exists
    try {
      await fsPromises.access(filePath);
    } catch {
      return NextResponse.json(
        { error: `Skill '${skillName}' not found` },
        { status: 404 }
      );
    }

    // Read and split file content
    const content = await fsPromises.readFile(filePath, 'utf-8');
    const { frontMatter, body } = splitSkillFile(content);

    return NextResponse.json({ frontMatter, body });
  } catch (error) {
    console.error('[GET /api/skills/[skillName]/prompt] Error:', error);
    return NextResponse.json(
      { error: 'Failed to read skill file' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/skills/[skillName]/prompt
 * Body: { body: string }
 * Writes atomically with backup and audit log
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ skillName: string }> }
) {
  // Auth check
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  // Admin role check
  const role = resolveRole(session!);
  if (role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Admin role required' },
      { status: 403 }
    );
  }

  // Check if prompt editing is enabled in settings
  const settings = await readSettings();
  if (!settings.prompt_editing_enabled) {
    return NextResponse.json(
      { error: 'Prompt editing is disabled' },
      { status: 403 }
    );
  }

  const { skillName } = await params;

  try {
    // Parse request body
    const { body: newBody } = await request.json();
    if (typeof newBody !== 'string') {
      return NextResponse.json(
        { error: 'Body must be a string' },
        { status: 400 }
      );
    }

    // Resolve skill file path
    const skillsDir = resolveSkillsDir(settings.skill_path ?? '');
    const filePath = path.join(skillsDir, `${skillName}.md`);

    // Read current file content
    let oldContent: string;
    try {
      oldContent = await fsPromises.readFile(filePath, 'utf-8');
    } catch {
      return NextResponse.json(
        { error: `Skill '${skillName}' not found` },
        { status: 404 }
      );
    }

    // Extract existing front-matter
    const { frontMatter, body: oldBody } = splitSkillFile(oldContent);
    if (!frontMatter) {
      return NextResponse.json(
        { error: 'Cannot edit skill without front-matter block' },
        { status: 400 }
      );
    }

    // Reconstruct file with new body
    const newContent = `${frontMatter}\n${newBody.trimStart()}`;

    // Validate Design Standard compliance
    const validation = validateSkillDesignStandard(newContent);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Prompt body does not conform to Design Standard: ${validation.error}` },
        { status: 422 }
      );
    }

    // Create backup
    const backupPath = `${filePath}.${Date.now()}.bak`;
    await fsPromises.writeFile(backupPath, oldContent, 'utf-8');

    // Atomic write: write to temp file, then rename
    const tempPath = `${filePath}.tmp.${process.pid}`;
    await fsPromises.writeFile(tempPath, newContent, 'utf-8');
    fs.renameSync(tempPath, filePath);

    // Insert audit log (AFTER successful file write)
    await db.insert(auditLog).values({
      entity_type: 'skill_prompt',
      entity_id: null,
      action: 'edit',
      actor_id: session!.user.id,
      before_json: { content: oldBody },
      after_json: { content: newBody.trimStart() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[PATCH /api/skills/[skillName]/prompt] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update skill file' },
      { status: 500 }
    );
  }
}
