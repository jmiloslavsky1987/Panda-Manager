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
// Only entity types where lifecycle changes (close/update/remove) are meaningful.
// Stakeholders and focus_areas are mentioned in every doc with no status transitions.
const LIFECYCLE_ENTITY_TYPES = new Set(['action', 'risk', 'milestone', 'workstream', 'businessOutcome', 'team_pathway']);

function getPrimaryText(item: ExtractionItem): string | null {
  if (!LIFECYCLE_ENTITY_TYPES.has(item.entityType)) return null;
  const f = item.fields;
  switch (item.entityType) {
    case 'action': return String(f.description ?? '');
    case 'risk': return String(f.description ?? '');
    case 'milestone': return String(f.name ?? '');
    case 'workstream': return String(f.name ?? '');
    case 'businessOutcome': return String(f.title ?? '');
    case 'team_pathway': return String(f.team_name ?? '');
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

    // Short-circuit: if direct-intent pre-pass already determined the intent, skip LLM call
    const directIntent = item.fields._direct_intent as string | undefined;
    if (directIntent && ['update', 'close', 'remove'].includes(directIntent)) {
      // Use the highest-similarity candidate as the match
      const topCandidate = candidates.reduce((best, c) => c.similarity > best.similarity ? c : best, candidates[0]);
      if (topCandidate && topCandidate.similarity >= 0.5) {
        changes.push({
          intent: directIntent as ProposedChange['intent'],
          entityType: item.entityType,
          existingId: topCandidate.id,
          existingRecord: topCandidate as Record<string, unknown>,
          proposedFields: directIntent === 'update'
            ? Object.fromEntries(Object.entries(item.fields).filter(([k]) => k !== '_direct_intent'))
            : undefined,
          confidence: Math.min(0.95, topCandidate.similarity + 0.2),
          reasoning: `Direct intent extraction identified this as "${directIntent}" based on explicit lifecycle language in the document.`,
        });
        continue;
      }
    }

    const prompt = `You are reviewing an entity extracted from a document against existing database records.

Extracted entity:
- Type: ${item.entityType}
- Fields: ${JSON.stringify(item.fields, null, 2)}

Existing records that may match:
${candidates.map((c, i) => `[${i}] ID=${c.id}: ${JSON.stringify(c)}`).join('\n')}

TASK: Determine if this extracted entity represents a MEANINGFUL change to an existing record.

INTENT CLASSIFICATION RULES — read carefully:

"close" intent — use this when the document states the item is FINISHED or NO LONGER ACTIVE:
  - Actions/tasks: "completed", "done", "finished", "closed", "is now COMPLETED", "was completed"
  - Risks: "mitigated", "resolved", "is now MITIGATED", "risk has been mitigated", "accepted"
  - Milestones: "complete", "completed", "done", "achieved"
  - Workstreams: "complete", "closed", "finished"
  ★ IMPORTANT: If the sourceExcerpt or fields contain words like "COMPLETED", "MITIGATED", "RESOLVED",
    "is closed", "is done", "now complete" — this is ALWAYS "close" intent, not "update".

"update" intent — use ONLY when a specific field value changed but the item is still ACTIVE:
  - Status changed to at_risk, in_progress, blocked (not to closed/done/mitigated states)
  - Target date changed (milestone pushed or pulled)
  - Owner reassigned
  - New notes or mitigation steps added
  ★ Do NOT use "update" if the change is a closure. Closure words always map to "close".

"remove" intent — use ONLY when the document EXPLICITLY states the item is cancelled or no longer exists.

"new" intent — use when:
  - The document merely MENTIONS the existing item without changing it
  - You cannot match this to an existing record with >= 0.85 confidence
  - The change is ambiguous

STRICT RULES:
1. Confidence >= 0.85 required for any intent other than "new"
2. The entity must be the SAME logical item — same description, same name — not just related
3. If unsure whether it is "close" or "update": if the item reached its end-state, choose "close"

Respond with valid JSON only:
{
  "intent": "update" | "close" | "remove" | "new",
  "matchedId": <existing entity ID if match found, else null>,
  "confidence": <0.0 to 1.0>,
  "reasoning": "<1-2 sentence explanation citing specific evidence from the extracted fields>",
  "proposedFields": <object with only the changed field names and their new values if intent is "update", else null>
}`;

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        temperature: 0,
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
      if (result.confidence < 0.85) continue;

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
