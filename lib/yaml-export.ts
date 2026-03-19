/**
 * yaml-export.ts — YAML serialization utility for BigPanda Project Assistant
 *
 * Provides round-trip stable YAML export with exact settings required for
 * Cowork skill compatibility:
 *   - sortKeys: false   — preserve insertion order (NEVER change)
 *   - lineWidth: -1     — no line folding (NEVER change)
 *   - noRefs: true      — disable YAML anchors (NEVER change)
 *   - JSON_SCHEMA       — parse-only: prevents yes/no boolean coercion
 *
 * Used by: migration script (Plan 01-05), all Phase 2+ skill runs.
 */

// Note: 'server-only' import omitted intentionally — next/compiled version throws
// unconditionally in Node.js test context (not just in RSC client context).
// Next.js enforces server/client boundaries at build time via RSC analysis.
// The bigpanda-app/lib/yaml-export.ts counterpart (Phase 2+) will include it.
import yaml from 'js-yaml';

// ─── Required top-level keys ─────────────────────────────────────────────────
// Non-negotiable order — Cowork skills validate these keys exist in this sequence.

export const REQUIRED_TOP_LEVEL_KEYS = [
  'customer',
  'project',
  'status',
  'workstreams',
  'actions',
  'risks',
  'milestones',
  'artifacts',
  'history',
] as const;

export type RequiredTopLevelKey = typeof REQUIRED_TOP_LEVEL_KEYS[number];

// ─── ProjectSections type ────────────────────────────────────────────────────

export interface ProjectSections {
  project?: Record<string, unknown>;
  overall_status?: string;   // DB field name — maps to YAML 'status' key
  status?: string;           // alternative if already mapped
  workstreams?: unknown[];
  actions?: unknown[];
  risks?: unknown[];
  milestones?: unknown[];
  artifacts?: unknown[];
  history?: unknown[];       // maps from engagement_history rows
  [key: string]: unknown;
}

// ─── parseYaml ───────────────────────────────────────────────────────────────

/**
 * Parse YAML content using JSON_SCHEMA to prevent boolean coercion.
 * JSON_SCHEMA treats 'yes'/'no'/'true'/'false' as plain strings, not booleans.
 * Use this for ALL incoming YAML parsing in migration script and skill runs.
 */
export function parseYaml(content: string): unknown {
  return yaml.load(content, { schema: yaml.JSON_SCHEMA });
}

// ─── serializeProjectToYaml ──────────────────────────────────────────────────

/**
 * Serialize a plain object to YAML string with exact round-trip settings.
 * Do NOT pass schema to dump — schema is parse-only (avoids stringify issues).
 */
export function serializeProjectToYaml(data: Record<string, unknown>): string {
  return yaml.dump(data, {
    sortKeys: false,
    lineWidth: -1,
    noRefs: true,
  });
}

// ─── buildYamlDocument ───────────────────────────────────────────────────────

/**
 * Build a complete YAML project context document.
 *
 * Constructs a document object with keys in REQUIRED_TOP_LEVEL_KEYS order,
 * using empty arrays for any missing sections (keys are never omitted).
 *
 * Key mappings:
 *   YAML 'status'  ← sections.overall_status ?? sections.status ?? ''
 *   YAML 'history' ← sections.history ?? []  (maps from engagement_history rows)
 *
 * @param project  Project identity — must include customer name
 * @param sections Optional sections data (missing keys default to empty arrays)
 * @returns Full YAML document string with frontmatter markers and footer comment
 */
export function buildYamlDocument(
  project: { customer: string },
  sections: ProjectSections = {}
): string {
  const doc: Record<string, unknown> = {};

  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (key === 'customer') {
      doc.customer = project.customer;
    } else if (key === 'status') {
      doc.status = sections.overall_status ?? sections.status ?? '';
    } else if (key === 'history') {
      doc.history = sections.history ?? [];
    } else {
      // All other keys: use sections value or empty array
      doc[key] = sections[key] ?? [];
    }
  }

  const yamlContent = serializeProjectToYaml(doc);
  return `---\n${yamlContent}---\n\n# ${project.customer} — BigPanda PA 3.0 Project Context\n`;
}
