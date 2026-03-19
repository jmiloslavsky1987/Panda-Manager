/**
 * migrate-local.ts — Idempotent migration script for YAML context documents
 *
 * Reads all *.md files from ~/Documents/PM Application/ and imports them into
 * the PostgreSQL database.
 *
 * Three-case import logic:
 *   1. YAML frontmatter present → full import (project + workstreams + risks + milestones)
 *   2. No YAML frontmatter (Merck) → stub project row + console.warn
 *   3. Project already exists (by UPPER(customer)) → skip (idempotent)
 *
 * Run: npx tsx scripts/migrate-local.ts
 *
 * Source path: ~/Documents/PM Application/ (hardcoded for one-time migration)
 * Do NOT use settings.workspace_path — that is for OUTPUT files, not migration source.
 *
 * DATA-03: YAML import migration
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import ExcelJS from 'exceljs';
import { db } from '../db/index';
import {
  projects,
  workstreams,
  risks,
  milestones,
  engagementHistory,
  actions,
} from '../db/schema';
import { parseYaml } from '../../lib/yaml-export';
import { eq, sql } from 'drizzle-orm';

// ─── Source directory (locked) ────────────────────────────────────────────────

const SOURCE_DIR = path.join(os.homedir(), 'Documents', 'PM Application');

// ─── sanitizeYamlFrontmatter ──────────────────────────────────────────────────

/**
 * Pre-process YAML frontmatter string to fix common encoding issues found in
 * source context documents:
 *
 *   - Unescaped double-quote characters embedded inside YAML double-quoted scalars
 *     (e.g. `mitigation: "... expectation is "weeks" once ..."`)
 *     are escaped to `\"` so js-yaml can parse successfully.
 *
 * Approach: for each line, if a double-quoted YAML scalar value contains embedded
 * unescaped " characters, replace them.
 *
 * This handles malformed-but-human-readable YAML produced by copy-editing tools.
 */
export function sanitizeYamlFrontmatter(yamlStr: string): string {
  return yamlStr
    .split('\n')
    .map((line) => {
      // Match lines with double-quoted YAML scalar values:
      //   key: "value possibly containing "inner quotes""
      // Regex: leading whitespace + optional key + colon + space + double-quoted value
      const match = line.match(/^(\s*(?:[^:"]*:\s*))"(.*)"(\s*)$/);
      if (!match) return line;

      const [, prefix, inner, suffix] = match;

      // Check if inner content contains unescaped double-quotes
      // (i.e. " not preceded by \)
      if (!inner.includes('"')) return line;

      // Escape all unescaped double-quotes in the inner content
      const sanitized = inner.replace(/(?<!\\)"/g, '\\"');
      return `${prefix}"${sanitized}"${suffix}`;
    })
    .join('\n');
}

// ─── extractFrontmatter ───────────────────────────────────────────────────────

/**
 * Extract YAML frontmatter from a Markdown file.
 * Returns { yaml: string, body: string } if frontmatter found,
 * or { yaml: null, body: content } if no frontmatter.
 *
 * Detection: file must start with '---' on the first line.
 */
export function extractFrontmatter(content: string): { yaml: string | null; body: string } {
  if (!content.startsWith('---')) return { yaml: null, body: content };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { yaml: null, body: content };
  return { yaml: content.slice(4, end), body: content.slice(end + 4) };
}

// ─── normalizeCustomerName ────────────────────────────────────────────────────

/**
 * Normalize a full customer name string to an uppercase key.
 *
 * Examples:
 *   'Kaiser Permanente'       → 'KAISER'
 *   'American Express (AMEX)' → 'AMEX'
 *   'MERCK'                   → 'MERCK'
 *
 * Strategy:
 *   1. If name contains parenthesized acronym like "(AMEX)", use that.
 *   2. Otherwise, use the first word uppercased.
 */
export function normalizeCustomerName(rawName: string): string {
  const trimmed = rawName.trim();

  // Check for parenthesized acronym: e.g. "American Express (AMEX)"
  const acronymMatch = trimmed.match(/\(([A-Z]+)\)$/);
  if (acronymMatch) {
    return acronymMatch[1];
  }

  // Use first word, uppercased
  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord.toUpperCase();
}

// ─── extractCustomerFromFilename ──────────────────────────────────────────────

/**
 * Extract customer key from a filename.
 * Assumes format: <CUSTOMER>_Project_Context*.md
 * e.g. 'MERCK_Project_Context_2026-03-16 copy.md' → 'MERCK'
 */
export function extractCustomerFromFilename(filename: string): string {
  const baseName = path.basename(filename, path.extname(filename));
  const firstPart = baseName.split('_')[0];
  return firstPart.toUpperCase();
}

// ─── normalizeWorkstreams ─────────────────────────────────────────────────────

/**
 * Convert YAML workstreams (object or array) to a flat array for DB insert.
 *
 * YAML source format (nested object):
 *   workstreams:
 *     compliance_and_governance:
 *       status: yellow
 *       notes: ...
 *     integrations_and_configuration:
 *       status: yellow
 *       notes: ...
 *
 * Returns array of: { name, current_status, state, source }
 */
function normalizeWorkstreams(
  raw: unknown,
  source: string
): Array<{
  name: string;
  current_status: string | null;
  track: string | null;
  lead: string | null;
  last_updated: string | null;
  state: string | null;
  source: string;
}> {
  if (!raw || typeof raw !== 'object') return [];

  // Array format (future-proof)
  if (Array.isArray(raw)) {
    return raw
      .filter((ws) => ws && typeof ws === 'object')
      .map((ws: Record<string, unknown>) => ({
        name: String(ws.name ?? ''),
        current_status: ws.current_status != null ? String(ws.current_status) : null,
        track: ws.track != null ? String(ws.track) : null,
        lead: ws.lead != null ? String(ws.lead) : null,
        last_updated: ws.last_updated != null ? String(ws.last_updated) : null,
        state: ws.state != null ? String(ws.state) : null,
        source,
      }))
      .filter((ws) => ws.name);
  }

  // Object (nested dict) format — most common in source docs
  const wsObj = raw as Record<string, unknown>;
  return Object.entries(wsObj)
    .filter(([, val]) => val && typeof val === 'object')
    .map(([key, val]) => {
      const ws = val as Record<string, unknown>;
      // Handle nested workstreams (e.g. AMEX has adr.inbound_integrations)
      // If the value contains sub-keys that are themselves objects, treat as nested track
      const subKeys = Object.keys(ws).filter(
        (k) => ws[k] && typeof ws[k] === 'object' && !Array.isArray(ws[k])
      );
      if (subKeys.length > 0 && !('status' in ws) && !('notes' in ws)) {
        // Nested track — flatten each sub-workstream with parent prefix
        return subKeys.map((subKey) => {
          const sub = ws[subKey] as Record<string, unknown>;
          return {
            name: `${key}.${subKey}`,
            current_status: sub.status != null ? String(sub.status) : null,
            track: key,
            lead: sub.lead != null ? String(sub.lead) : null,
            last_updated: sub.last_updated != null ? String(sub.last_updated) : null,
            state: sub.state != null ? String(sub.state) : null,
            source,
          };
        });
      }

      return [
        {
          name: key,
          current_status: ws.status != null ? String(ws.status) : null,
          track: null,
          lead: ws.lead != null ? String(ws.lead) : null,
          last_updated: ws.last_updated != null ? String(ws.last_updated) : null,
          state: null,
          source,
        },
      ];
    })
    .flat();
}

// ─── normalizeItems ───────────────────────────────────────────────────────────

/**
 * Normalize a YAML array of risks or milestones.
 * Maps: id → external_id (source YAML uses 'id:' not 'external_id:')
 */
function normalizeItems(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item: Record<string, unknown>) => {
      // Map 'id' → 'external_id' (source YAML uses 'id' key)
      const normalized = { ...item };
      if (!normalized.external_id && normalized.id) {
        normalized.external_id = normalized.id;
      }
      return normalized;
    });
}

// ─── runMigration ─────────────────────────────────────────────────────────────

export async function runMigration(): Promise<{ inserted: number; skipped: number }> {
  let files: string[];
  try {
    files = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.md'));
  } catch (err) {
    console.error(`[migrate] Cannot read source directory ${SOURCE_DIR}:`, err);
    throw err;
  }

  if (files.length === 0) {
    console.warn(`[migrate] No .md files found in ${SOURCE_DIR}`);
    return { inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;

  for (const filename of files) {
    const filepath = path.join(SOURCE_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    const { yaml: yamlStr } = extractFrontmatter(content);

    if (yamlStr === null) {
      // No frontmatter — create stub project
      const customer = extractCustomerFromFilename(filename);

      // Check if already exists
      const existingRows = await db
        .select({ id: projects.id })
        .from(projects)
        .where(sql`UPPER(${projects.customer}) = ${customer}`);

      if (existingRows.length > 0) {
        console.log(`[migrate] Project ${customer} already exists — skipping stub`);
        skipped++;
      } else {
        await db.insert(projects).values({
          name: `${customer} PA3.0`,
          customer,
          status: 'active',
          source_file: filename,
        });
        console.warn(
          `[migrate] ${filename} has no YAML frontmatter — stub project created. Manual data entry required.`
        );
        inserted++;
      }
      continue;
    }

    // Parse YAML frontmatter (sanitize first to handle embedded unescaped quotes)
    const data = parseYaml(sanitizeYamlFrontmatter(yamlStr)) as Record<string, unknown>;

    const rawCustomer = String(data.customer ?? '');
    const customer = normalizeCustomerName(rawCustomer);

    if (!customer) {
      console.warn(`[migrate] ${filename}: could not determine customer name — skipping`);
      continue;
    }

    // Check if project already exists (by normalized customer, case-insensitive)
    const existingRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(sql`UPPER(${projects.customer}) = ${customer}`);

    if (existingRows.length > 0) {
      console.log(`[migrate] Project ${customer} already exists — skipping`);
      skipped++;
      continue;
    }

    // Extract project-level fields
    const projectName =
      data.project != null ? String(data.project) : `${customer} Project`;
    const overall_status =
      data.overall_status != null ? String(data.overall_status) : null;
    const status_summary =
      data.status_summary != null ? String(data.status_summary) : null;
    const go_live_target =
      data.go_live_target != null ? String(data.go_live_target) : null;
    const last_updated =
      data.last_updated != null ? String(data.last_updated) : null;

    // Insert project
    const [insertedProject] = await db
      .insert(projects)
      .values({
        name: projectName,
        customer,
        status: 'active',
        overall_status,
        status_summary,
        go_live_target,
        last_updated,
        source_file: filename,
      })
      .returning({ id: projects.id });

    const projectId = insertedProject.id;
    console.log(`[migrate] Inserted project ${customer} (id=${projectId}) from ${filename}`);
    inserted++;

    // ── Workstreams ──────────────────────────────────────────────────────────
    const wsRows = normalizeWorkstreams(data.workstreams, 'yaml');
    for (const ws of wsRows) {
      // Idempotency: check by (project_id, name)
      const existingWs = await db
        .select({ id: workstreams.id })
        .from(workstreams)
        .where(
          sql`${workstreams.project_id} = ${projectId} AND ${workstreams.name} = ${ws.name}`
        );

      if (existingWs.length === 0) {
        await db.insert(workstreams).values({
          project_id: projectId,
          name: ws.name,
          current_status: ws.current_status,
          track: ws.track,
          lead: ws.lead,
          last_updated: ws.last_updated,
          state: ws.state,
          source: ws.source,
        });
      }
    }
    if (wsRows.length > 0) {
      console.log(`[migrate]   Imported ${wsRows.length} workstreams for ${customer}`);
    }

    // ── Risks ────────────────────────────────────────────────────────────────
    const riskItems = normalizeItems(data.risks);
    for (const risk of riskItems) {
      const extId = risk.external_id != null ? String(risk.external_id) : null;
      if (!extId) continue;

      // Idempotency: check by (project_id, external_id)
      const existingRisk = await db
        .select({ id: risks.id })
        .from(risks)
        .where(
          sql`${risks.project_id} = ${projectId} AND ${risks.external_id} = ${extId}`
        );

      if (existingRisk.length === 0) {
        const description =
          risk.description != null ? String(risk.description) : 'No description';
        const severityRaw =
          risk.severity != null ? String(risk.severity) : null;
        const severity =
          severityRaw === 'low' ||
          severityRaw === 'medium' ||
          severityRaw === 'high' ||
          severityRaw === 'critical'
            ? severityRaw
            : null;

        await db.insert(risks).values({
          project_id: projectId,
          external_id: extId,
          description,
          severity,
          owner: risk.owner != null ? String(risk.owner) : null,
          mitigation: risk.mitigation != null ? String(risk.mitigation) : null,
          status: risk.status != null ? String(risk.status) : null,
          last_updated: risk.last_updated != null ? String(risk.last_updated) : null,
          source: 'yaml',
        });
      }
    }
    if (riskItems.length > 0) {
      console.log(`[migrate]   Imported ${riskItems.length} risks for ${customer}`);
    }

    // ── Milestones ───────────────────────────────────────────────────────────
    const milestoneItems = normalizeItems(data.milestones);
    for (const ms of milestoneItems) {
      const extId = ms.external_id != null ? String(ms.external_id) : null;
      if (!extId) continue;

      // Idempotency: check by (project_id, external_id)
      const existingMs = await db
        .select({ id: milestones.id })
        .from(milestones)
        .where(
          sql`${milestones.project_id} = ${projectId} AND ${milestones.external_id} = ${extId}`
        );

      if (existingMs.length === 0) {
        const name = ms.name != null ? String(ms.name) : 'Untitled milestone';

        await db.insert(milestones).values({
          project_id: projectId,
          external_id: extId,
          name,
          status: ms.status != null ? String(ms.status) : null,
          target: ms.target != null ? String(ms.target) : null,
          date: ms.date != null ? String(ms.date) : null,
          notes: ms.notes != null ? String(ms.notes) : null,
          owner: ms.owner != null ? String(ms.owner) : null,
          source: 'yaml',
        });
      }
    }
    if (milestoneItems.length > 0) {
      console.log(`[migrate]   Imported ${milestoneItems.length} milestones for ${customer}`);
    }

    // ── Engagement History ───────────────────────────────────────────────────
    // 'history' key in YAML (if present) maps to engagementHistory table
    const historyItems = Array.isArray(data.history) ? data.history : [];
    for (const entry of historyItems) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as Record<string, unknown>;
      const entryContent =
        item.content != null ? String(item.content) :
        item.summary != null ? String(item.summary) :
        item.notes != null ? String(item.notes) : null;
      if (!entryContent) continue;

      await db.insert(engagementHistory).values({
        project_id: projectId,
        date: item.date != null ? String(item.date) : null,
        content: entryContent,
        source: 'yaml',
      });
    }
    if (historyItems.length > 0) {
      console.log(`[migrate]   Imported ${historyItems.length} history entries for ${customer}`);
    }
  }

  console.log(`[migrate] Complete — Projects: ${inserted} inserted, ${skipped} skipped`);
  return { inserted, skipped };
}

// ─── importXlsx ───────────────────────────────────────────────────────────────

/**
 * importXlsx — Supplement DB with data from PA3_Action_Tracker.xlsx
 *
 * Runs AFTER runMigration() (YAML import). YAML wins on all field conflicts:
 * existing rows by external_id are never overwritten by xlsx data.
 *
 * Sheets handled (by name, never by index):
 *   1. "Open Actions"     → actions table, source='xlsx_open', status='open'
 *   2. "Open Risks"       → risks table, source='xlsx_risks'
 *   3. "Open Questions"   → actions table, type='question', source='xlsx_questions'
 *   4. "Workstream Notes" → workstreams table (UPDATE only — no insert)
 *   5. "Completed"        → actions table, source='xlsx_completed', status='completed'
 *
 * All row data:
 *   - Row 1: title row (skip)
 *   - Row 2: column headers (use to build dynamic header→colIndex map)
 *   - Row 3+: data rows
 *
 * Idempotency: deduped by (project_id, external_id) — safe to run multiple times.
 *
 * DATA-04: xlsx supplement import
 */
export async function importXlsx(): Promise<void> {
  // ── Locate the xlsx file ──────────────────────────────────────────────────
  let xlsxFiles: string[];
  try {
    xlsxFiles = fs.readdirSync(SOURCE_DIR).filter(
      (f) => f.includes('PA3_Action_Tracker') && f.endsWith('.xlsx')
    );
  } catch (err) {
    console.warn(`[migrate-xlsx] Cannot read SOURCE_DIR ${SOURCE_DIR} — skipping xlsx import`);
    return;
  }

  if (xlsxFiles.length === 0) {
    console.warn('[migrate-xlsx] PA3_Action_Tracker.xlsx not found in SOURCE_DIR — skipping');
    return;
  }

  const xlsxPath = path.join(SOURCE_DIR, xlsxFiles[0]);
  console.log(`[migrate-xlsx] Reading ${xlsxPath}`);

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(xlsxPath);
  } catch (err) {
    console.error('[migrate-xlsx] Failed to read xlsx file:', err);
    throw err;
  }

  // ── Helper: build header → column-index map from row 2 ───────────────────
  function buildHeaderMap(sheet: ExcelJS.Worksheet): Record<string, number> {
    const headerRow = sheet.getRow(2);
    const map: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const key = String(cell.value ?? '').trim();
      if (key) map[key] = colNumber;
    });
    return map;
  }

  // ── Helper: look up project_id by customer name (normalized to UPPERCASE) ─
  async function getProjectId(customer: string): Promise<number | null> {
    const norm = customer.trim().toUpperCase();
    if (!norm) return null;
    const result = await db
      .select({ id: projects.id })
      .from(projects)
      .where(sql`UPPER(${projects.customer}) = ${norm}`)
      .limit(1);
    return result[0]?.id ?? null;
  }

  // ── Helper: collect data rows (skip title row 1 and header row 2) ─────────
  function collectRows(sheet: ExcelJS.Worksheet): ExcelJS.Row[] {
    const rows: ExcelJS.Row[] = [];
    sheet.eachRow((row, idx) => {
      if (idx > 2) rows.push(row);
    });
    return rows;
  }

  // ── Helper: safe cell string value ───────────────────────────────────────
  function cellStr(row: ExcelJS.Row, colIndex: number | undefined): string | null {
    if (colIndex === undefined) return null;
    const cell = row.getCell(colIndex);
    const val = cell.value;
    if (val === null || val === undefined) return null;
    // ExcelJS may return Date objects for date cells — convert to ISO string
    if (val instanceof Date) return val.toISOString().split('T')[0];
    const str = String(val).trim();
    return str === '' ? null : str;
  }

  // ============================================================
  // Sheet 1: Open Actions → actions table (source='xlsx_open')
  // ============================================================
  const openActionsSheet = workbook.getWorksheet('🔴 Open Actions') ?? workbook.getWorksheet('Open Actions');
  if (openActionsSheet) {
    const headers = buildHeaderMap(openActionsSheet);
    const rows = collectRows(openActionsSheet);
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const customer = cellStr(row, headers['Customer']);
      const externalId = cellStr(row, headers['ID']);
      if (!externalId || !customer) { skipped++; continue; }

      const projectId = await getProjectId(customer);
      if (!projectId) {
        console.warn(`[migrate-xlsx] Open Actions: no project for customer '${customer}' — skipping ${externalId}`);
        skipped++;
        continue;
      }

      // Idempotency check
      const existing = await db
        .select({ id: actions.id })
        .from(actions)
        .where(sql`${actions.project_id} = ${projectId} AND ${actions.external_id} = ${externalId}`)
        .limit(1);
      if (existing.length > 0) { skipped++; continue; }

      const description = cellStr(row, headers['Description']) ?? 'No description';
      await db.insert(actions).values({
        project_id: projectId,
        external_id: externalId,
        description,
        owner: cellStr(row, headers['Owner']),
        due: cellStr(row, headers['Due']),
        status: 'open',
        last_updated: cellStr(row, headers['Last Updated']),
        notes: cellStr(row, headers['Notes']),
        type: 'action',
        source: 'xlsx_open',
      });
      inserted++;
    }
    console.log(`[migrate-xlsx] Open Actions: ${inserted} inserted, ${skipped} skipped`);
  } else {
    console.warn('[migrate-xlsx] Sheet "Open Actions" not found — skipping');
  }

  // ============================================================
  // Sheet 2: Open Risks → risks table (source='xlsx_risks')
  // ============================================================
  const openRisksSheet = workbook.getWorksheet('⚠️ Open Risks') ?? workbook.getWorksheet('Open Risks');
  if (openRisksSheet) {
    const headers = buildHeaderMap(openRisksSheet);
    const rows = collectRows(openRisksSheet);
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const customer = cellStr(row, headers['Customer']);
      const externalId = cellStr(row, headers['ID']);
      if (!externalId || !customer) { skipped++; continue; }

      const projectId = await getProjectId(customer);
      if (!projectId) {
        console.warn(`[migrate-xlsx] Open Risks: no project for customer '${customer}' — skipping ${externalId}`);
        skipped++;
        continue;
      }

      // Idempotency check
      const existing = await db
        .select({ id: risks.id })
        .from(risks)
        .where(sql`${risks.project_id} = ${projectId} AND ${risks.external_id} = ${externalId}`)
        .limit(1);
      if (existing.length > 0) { skipped++; continue; }

      const description = cellStr(row, headers['Description']) ?? 'No description';
      const severityRaw = cellStr(row, headers['Severity'])?.toLowerCase() ?? null;
      const severity =
        severityRaw === 'low' || severityRaw === 'medium' ||
        severityRaw === 'high' || severityRaw === 'critical'
          ? (severityRaw as 'low' | 'medium' | 'high' | 'critical')
          : null;

      await db.insert(risks).values({
        project_id: projectId,
        external_id: externalId,
        description,
        severity,
        owner: cellStr(row, headers['Owner']),
        mitigation: cellStr(row, headers['Mitigation Summary']),
        status: cellStr(row, headers['Status']),
        source: 'xlsx_risks',
      });
      inserted++;
    }
    console.log(`[migrate-xlsx] Open Risks: ${inserted} inserted, ${skipped} skipped`);
  } else {
    console.warn('[migrate-xlsx] Sheet "Open Risks" not found — skipping');
  }

  // ============================================================
  // Sheet 3: Open Questions → actions table (type='question', source='xlsx_questions')
  // Q-NNN IDs stored as actions with type='question'
  // ============================================================
  const openQuestionsSheet = workbook.getWorksheet('❓ Open Questions') ?? workbook.getWorksheet('Open Questions');
  if (openQuestionsSheet) {
    const headers = buildHeaderMap(openQuestionsSheet);
    const rows = collectRows(openQuestionsSheet);
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const customer = cellStr(row, headers['Customer']);
      const externalId = cellStr(row, headers['ID']);
      if (!externalId || !customer) { skipped++; continue; }

      const projectId = await getProjectId(customer);
      if (!projectId) {
        console.warn(`[migrate-xlsx] Open Questions: no project for customer '${customer}' — skipping ${externalId}`);
        skipped++;
        continue;
      }

      // Idempotency check
      const existing = await db
        .select({ id: actions.id })
        .from(actions)
        .where(sql`${actions.project_id} = ${projectId} AND ${actions.external_id} = ${externalId}`)
        .limit(1);
      if (existing.length > 0) { skipped++; continue; }

      // "Question" column contains the question text (mapped like Description)
      const questionCol = headers['Question'] ?? headers['Description'];
      const description = cellStr(row, questionCol) ?? 'No description';

      await db.insert(actions).values({
        project_id: projectId,
        external_id: externalId,
        description,
        owner: cellStr(row, headers['Owner']),
        status: 'open',
        notes: cellStr(row, headers['Notes']),
        type: 'question',
        source: 'xlsx_questions',
      });
      inserted++;
    }
    console.log(`[migrate-xlsx] Open Questions: ${inserted} inserted, ${skipped} skipped`);
  } else {
    console.warn('[migrate-xlsx] Sheet "Open Questions" not found — skipping');
  }

  // ============================================================
  // Sheet 4: Workstream Notes → UPDATE workstreams (never insert)
  // Updates current_status, lead, last_updated for matching workstream rows
  // ============================================================
  const workstreamNotesSheet = workbook.getWorksheet('📋 Workstream Notes') ?? workbook.getWorksheet('Workstream Notes');
  if (workstreamNotesSheet) {
    const headers = buildHeaderMap(workstreamNotesSheet);
    const rows = collectRows(workstreamNotesSheet);
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const customer = cellStr(row, headers['Customer']);
      const workstreamName = cellStr(row, headers['Workstream']);
      if (!customer || !workstreamName) { skipped++; continue; }

      const projectId = await getProjectId(customer);
      if (!projectId) {
        console.warn(`[migrate-xlsx] Workstream Notes: no project for customer '${customer}' — skipping`);
        skipped++;
        continue;
      }

      const current_status = cellStr(row, headers['Current Status Summary']);
      const lead = cellStr(row, headers['Lead(s)']);
      const last_updated = cellStr(row, headers['Last Updated']);

      // UPDATE existing workstream row (LOWER-normalized name match) — never insert
      const result = await db
        .update(workstreams)
        .set({
          ...(current_status !== null ? { current_status } : {}),
          ...(lead !== null ? { lead } : {}),
          ...(last_updated !== null ? { last_updated } : {}),
        })
        .where(
          sql`${workstreams.project_id} = ${projectId} AND LOWER(${workstreams.name}) = LOWER(${workstreamName})`
        );

      // drizzle update returns an object; check rowCount to determine if matched
      const rowCount = (result as unknown as { rowCount?: number }).rowCount ?? 0;
      if (rowCount > 0) {
        updated++;
      } else {
        console.warn(`[migrate-xlsx] Workstream Notes: no matching workstream '${workstreamName}' for ${customer} — skipping`);
        skipped++;
      }
    }
    console.log(`[migrate-xlsx] Workstream Notes: ${updated} updated, ${skipped} skipped`);
  } else {
    console.warn('[migrate-xlsx] Sheet "Workstream Notes" not found — skipping');
  }

  // ============================================================
  // Sheet 5: Completed → actions table (status='completed', source='xlsx_completed')
  // Columns: Customer, ID, Description, Owner, Completed (date)
  // ============================================================
  const completedSheet = workbook.getWorksheet('✅ Completed') ?? workbook.getWorksheet('Completed');
  if (completedSheet) {
    const headers = buildHeaderMap(completedSheet);
    const rows = collectRows(completedSheet);
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const customer = cellStr(row, headers['Customer']);
      const externalId = cellStr(row, headers['ID']);
      if (!externalId || !customer) { skipped++; continue; }

      const projectId = await getProjectId(customer);
      if (!projectId) {
        console.warn(`[migrate-xlsx] Completed: no project for customer '${customer}' — skipping ${externalId}`);
        skipped++;
        continue;
      }

      // Idempotency check
      const existing = await db
        .select({ id: actions.id })
        .from(actions)
        .where(sql`${actions.project_id} = ${projectId} AND ${actions.external_id} = ${externalId}`)
        .limit(1);
      if (existing.length > 0) { skipped++; continue; }

      const description = cellStr(row, headers['Description']) ?? 'No description';
      await db.insert(actions).values({
        project_id: projectId,
        external_id: externalId,
        description,
        owner: cellStr(row, headers['Owner']),
        due: cellStr(row, headers['Completed']), // 'Completed' date stored in due field
        status: 'completed',
        type: 'action',
        source: 'xlsx_completed',
      });
      inserted++;
    }
    console.log(`[migrate-xlsx] Completed: ${inserted} inserted, ${skipped} skipped`);
  } else {
    console.warn('[migrate-xlsx] Sheet "Completed" not found — skipping');
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

// Run migration when executed directly (not when imported as module)
// ES module: check if this file is the entry point via import.meta.url
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('migrate-local.ts') ||
    process.argv[1].endsWith('migrate-local.js'));

if (isMain) {
  (async () => {
    await runMigration();   // Phase 1: YAML context doc import
    await importXlsx();     // Phase 2: xlsx supplement import
    process.exit(0);
  })().catch((err) => {
    console.error('[migrate] Fatal error:', err);
    process.exit(1);
  });
}
