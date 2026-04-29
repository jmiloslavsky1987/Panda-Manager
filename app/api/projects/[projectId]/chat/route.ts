// app/api/projects/[projectId]/chat/route.ts
// POST streaming chat handler with anti-hallucination system prompt
// Uses Vercel AI SDK for streaming and Anthropic Claude for responses

import { requireProjectRole } from "@/lib/auth-server";
import { buildChatContext } from "@/lib/chat-context-builder";
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { UIMessage } from 'ai';
import { NextRequest } from "next/server";
import { allWriteTools } from './tools';

// MANDATORY for SSE streaming in Next.js App Router
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/projects/[projectId]/chat
 *
 * Streams AI chat responses using project-scoped DB context.
 * Implements CHAT-01 (streaming) and CHAT-02 (anti-hallucination constraints).
 *
 * Security: requireSession() at handler level (CVE-2025-29927 defense-in-depth).
 * Context: Project data snapshot built once per request via buildChatContext().
 * Streaming: Vercel AI SDK streamText + toUIMessageStreamResponse().
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  // Validate projectId
  const { projectId } = await context.params;
  const numericId = parseInt(projectId, 10);
  if (isNaN(numericId)) {
    return Response.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  // Auth gate
  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  // Parse request body
  let body: { messages: UIMessage[]; activeTab?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const activeTab = body.activeTab ?? 'unknown';

  // Build project context snapshot
  const projectContext = await buildChatContext(numericId);

  // Anti-hallucination system prompt (CHAT-02 constraints)
  const systemPrompt = `You are an AI assistant for a project management system. You help answer questions about a specific project using ONLY the data provided below.

CRITICAL CONSTRAINTS:
1. ONLY use information present in the project data below
2. NEVER invent facts, numbers, dates, or names not in the data
3. ALWAYS cite record IDs inline when referencing any record (e.g., "Action A-12345-001 is overdue")
4. If asked about something not in the data, respond: "I don't see that information in this project's current data"
5. Do not use your general knowledge about project management — stick to THIS project's data

<project_data>
${projectContext}
</project_data>

Answer questions helpfully and conversationally, but always ground your responses in the data above.

WRITE OPERATIONS:
You have tools to create, update, and delete project records. Rules:
1. If the user's intent to mutate is ambiguous, ask ONE clarifying question before proposing a mutation
2. When the user is on a specific tab, default to that tab's entities if entity type is unspecified
3. After a confirmed mutation, reply with a short status: "✓ [EntityType] created: [name/description]" or "Cancelled — no changes made."
4. Never execute a write tool based on implicit assumption — surface a confirmation card first (needsApproval handles this automatically)
5. Batch mutations are allowed: propose multiple cards in one turn for requests like "mark all Sarah's actions as done"
6. CRITICAL: Update/delete tools require the numeric db_id field shown as (db_id:N) in the data above. NEVER pass the external_id string (like R-1-001) as the id — always use the integer db_id.

Current workspace tab: ${activeTab}`;

  // Stream response using Vercel AI SDK + Anthropic
  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    messages: await convertToModelMessages(body.messages),
    temperature: 0.3, // Lower temperature reduces hallucination risk
    tools: allWriteTools(numericId),
    stopWhen: stepCountIs(3),
  });

  // Return UI message stream response (compatible with useChat hook)
  return result.toUIMessageStreamResponse();
}
