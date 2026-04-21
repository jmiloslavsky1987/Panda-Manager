/**
 * change-detection.ts — Pass 5 change detection for document extraction
 *
 * Phase 73.1 Plan 03 — Entity Lifecycle Management
 *
 * After Passes 1-4 extract new entities, Pass 5 compares them against existing
 * DB records using fuzzy matching and asks Claude to classify the intent:
 * - update: Fields changed (propose specific field updates)
 * - close: Status changed to completed/closed/resolved
 * - remove: Entity no longer exists in the document
 * - new: No match found (filtered out — not returned)
 *
 * Output is stored in extraction_jobs.proposed_changes_json for UI review.
 */

import Anthropic from '@anthropic-ai/sdk';
import { findSimilarEntities, MatchCandidate } from '@/lib/entity-matcher';
import type { ExtractionItem } from '@/lib/extraction-types';

export interface ProposedChange {
  intent: 'update' | 'close' | 'remove';
  entityType: string;
  existingId: number;
  existingRecord: Record<string, unknown>;
  proposedFields?: Record<string, unknown>;
  confidence: number;
  reasoning: string;
}

/**
 * Get the primary text field for an extraction item based on entity type.
 * This is used for fuzzy matching queries.
 */
function getPrimaryText(item: ExtractionItem): string | null {
  const f = item.fields;
  switch (item.entityType) {
    case 'action': return String(f.description ?? '');
    case 'risk': return String(f.description ?? '');
    case 'milestone': return String(f.name ?? '');
    case 'stakeholder': return String(f.name ?? '');
    case 'workstream': return String(f.name ?? '');
    case 'focus_area': return String(f.title ?? '');
    case 'e2e_workflow': return String(f.workflow_name ?? '');
    case 'task': return String(f.title ?? '');
    default: return null;
  }
}

/**
 * Run Pass 5 change detection on all extracted items.
 *
 * For each extracted item:
 * 1. Find similar entities in DB using pg_trgm similarity
 * 2. Ask Claude to classify intent (update/close/remove/new)
 * 3. Filter out low-confidence (<0.6) and 'new' intent results
 * 4. Return array of proposed changes for UI review
 *
 * @param allExtractedItems - All items extracted from Passes 1-4
 * @param projectId - Project ID for entity matching isolation
 * @param client - Anthropic client instance (reused from document-extraction)
 * @returns Array of proposed changes (excludes 'new' intent)
 */
export async function runPass5ChangeDetection(
  allExtractedItems: ExtractionItem[],
  projectId: number,
  client: Anthropic
): Promise<ProposedChange[]> {
  const changes: ProposedChange[] = [];

  for (const item of allExtractedItems) {
    const primaryText = getPrimaryText(item);
    if (!primaryText || primaryText.length < 10) continue;

    const candidates = await findSimilarEntities(item.entityType, primaryText, projectId);
    if (candidates.length === 0) continue;

    const prompt = `You are reviewing an entity extracted from a document against existing database records.

Extracted entity:
- Type: ${item.entityType}
- Fields: ${JSON.stringify(item.fields, null, 2)}

Existing records that may match:
${candidates.map((c, i) => `[${i}] ID=${c.id}: ${JSON.stringify(c)}`).join('\n')}

Does this extracted entity represent an UPDATE, CLOSURE (status changed to completed/closed/resolved), REMOVAL (entity no longer exists), or is it a NEW entity?

Respond with valid JSON only:
{
  "intent": "update" | "close" | "remove" | "new",
  "matchedId": <existing entity ID if not new, else null>,
  "confidence": <0.0 to 1.0>,
  "reasoning": "<1-2 sentence explanation>",
  "proposedFields": <object with changed fields if intent is "update", else null>
}`;

    try {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const result = JSON.parse(jsonMatch[0]) as {
        intent: string;
        matchedId: number | null;
        confidence: number;
        reasoning: string;
        proposedFields?: Record<string, unknown>;
      };

      if (result.intent === 'new' || !result.matchedId) continue;
      if (result.confidence < 0.6) continue;

      const existing = candidates.find(c => c.id === result.matchedId);
      if (!existing) continue;

      changes.push({
        intent: result.intent as ProposedChange['intent'],
        entityType: item.entityType,
        existingId: result.matchedId,
        existingRecord: existing as Record<string, unknown>,
        proposedFields: result.proposedFields ?? undefined,
        confidence: result.confidence,
        reasoning: result.reasoning,
      });
    } catch (err) {
      console.warn('[Pass5] change detection failed for item:', item.entityType, err);
      // Non-fatal — continue with next item
    }
  }

  return changes;
}
