/**
 * Status coercer functions for ingestion approve handlers
 * Created in Plan 51-03 as stub (blocking dependency for Wave 1 parallel execution)
 * Will be completed by Plan 51-02
 */

export type WbsItemStatus = 'not_started' | 'in_progress' | 'complete';
export type ArchNodeStatus = 'planned' | 'in_progress' | 'live';

/**
 * Coerce raw status string to valid WBS item status
 */
export function coerceWbsItemStatus(raw: string | undefined | null): WbsItemStatus | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();

  if (['complete', 'completed', 'done', 'finished'].includes(v)) return 'complete';
  if (['in_progress', 'in progress', 'ongoing', 'started', 'active'].includes(v)) return 'in_progress';
  if (['not_started', 'not started', 'pending', 'planned', 'todo', 'queued'].includes(v)) return 'not_started';

  return null; // unrecognized — caller will use default
}

/**
 * Coerce raw status string to valid architecture node status
 */
export function coerceArchNodeStatus(raw: string | undefined | null): ArchNodeStatus | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();

  if (['live', 'production', 'active', 'enabled', 'complete'].includes(v)) return 'live';
  if (['in_progress', 'in progress', 'ongoing', 'building', 'development'].includes(v)) return 'in_progress';
  if (['planned', 'planned', 'design', 'proposed', 'future'].includes(v)) return 'planned';

  return null; // unrecognized — caller will use default
}
