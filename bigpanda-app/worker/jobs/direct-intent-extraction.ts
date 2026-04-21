/**
 * direct-intent-extraction.ts — Pre-pass for detecting explicit lifecycle instructions
 *
 * Phase 73.1 Plan 07 — Gap Closure (Gap 1)
 *
 * Runs BEFORE Passes 1-4 to detect documents that explicitly instruct:
 * - "Close action X"
 * - "Remove section Y"
 * - "Merge workflows A and B"
 * - "Update milestone Z status to completed"
 *
 * Standard extraction passes mis-classify these as decision/history/note types.
 * Direct intent extraction bypasses classification and extracts lifecycle intents directly.
 */

import Anthropic from '@anthropic-ai/sdk';

export interface DirectIntentItem {
  intent: 'update' | 'close' | 'remove' | 'merge';
  entityType: string;
  entityName: string;  // Name/description from document
  proposedFields?: Record<string, unknown>;  // For update/merge intents
  sourceExcerpt: string;  // Where this instruction appeared
  reasoning: string;
}

/**
 * Run direct-intent extraction pre-pass.
 *
 * Asks Claude to identify explicit lifecycle instructions in the document
 * BEFORE standard entity extraction runs. This prevents instructional text
 * from being mis-classified as decision/history/note types.
 *
 * @param documentText - Full document text
 * @param projectId - Project ID (for logging/debugging only, not used in extraction)
 * @param client - Anthropic client instance
 * @returns Array of direct intent items
 */
export async function runDirectIntentExtraction(
  documentText: string,
  projectId: number,
  client: Anthropic
): Promise<DirectIntentItem[]> {
  if (!documentText || documentText.trim().length < 50) return [];

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      tools: [
        {
          name: 'extract_lifecycle_instructions',
          description: 'Extract explicit instructions to update, close, remove, or merge existing entities from a document.',
          input_schema: {
            type: 'object',
            properties: {
              instructions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    intent: {
                      type: 'string',
                      enum: ['update', 'close', 'remove', 'merge'],
                      description: 'The lifecycle operation being instructed'
                    },
                    entityType: {
                      type: 'string',
                      description: 'The type of entity (action, risk, milestone, workstream, decision, workflow, etc.)'
                    },
                    entityName: {
                      type: 'string',
                      description: 'The name or description of the entity being referenced'
                    },
                    proposedFields: {
                      type: 'object',
                      description: 'For update/merge intents: which fields should change and to what values',
                      additionalProperties: true
                    },
                    sourceExcerpt: {
                      type: 'string',
                      description: 'Direct quote from document where this instruction appears'
                    },
                    reasoning: {
                      type: 'string',
                      description: '1-2 sentence explanation of why this is a lifecycle instruction'
                    }
                  },
                  required: ['intent', 'entityType', 'entityName', 'sourceExcerpt', 'reasoning']
                }
              }
            },
            required: ['instructions']
          }
        }
      ],
      messages: [
        {
          role: 'user',
          content: `You are analyzing a document to find explicit instructions about updating, closing, removing, or merging existing entities.

IMPORTANT: Only extract instructions that EXPLICITLY state a lifecycle action:
- "Action X is now complete" → close intent
- "Remove the Y section" → remove intent
- "Update milestone Z to in-progress" → update intent
- "Merge workflows A and B" → merge intent

DO NOT extract:
- New entities being described
- Status reports without action verbs
- Historical context or background

Document text:
${documentText}

Use the extract_lifecycle_instructions tool to return any explicit lifecycle instructions found.
If no explicit instructions are found, return an empty instructions array.`
        }
      ]
    });

    const toolUse = response.content.find(c => c.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') return [];

    const input = toolUse.input as { instructions: DirectIntentItem[] };
    console.log(`[Direct Intent Pre-pass] Found ${input.instructions.length} lifecycle instructions`);

    return input.instructions;

  } catch (err) {
    console.warn('[Direct Intent Pre-pass] Non-fatal error:', err);
    return [];
  }
}
