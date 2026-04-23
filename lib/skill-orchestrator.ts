// bigpanda-app/lib/skill-orchestrator.ts
// Core engine for all skill invocations.
// Pure service class — no HTTP, no BullMQ imports.
// Called by: worker/jobs/skill-run.ts (scheduled/manual jobs)
// Called by: app/api/skills routes (SSE trigger)

import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import path from 'path';
import db from '../db';
import { skillRuns, skillRunChunks } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { buildSkillContext } from './skill-context';
import { buildTeamsSkillContext } from './skill-context-teams';
import { buildArchSkillContext } from './skill-context-arch';
import { buildMeetingPrepContext } from './meeting-prep-context';
import type { MCPServerConfig } from './settings-core';

const TOKEN_BUDGET = 80_000;
const MODEL = 'claude-sonnet-4-6';

export interface SkillRunParams {
  skillName: string;
  projectId: number;
  runId: number;        // DB serial ID of the skill_runs row
  input?: Record<string, string>; // e.g. { transcript: '...' }
  skillsDir?: string;   // override default skills directory (for testing)
  mcpServers?: MCPServerConfig[]; // optional; [] and undefined both mean non-MCP path
}

export class SkillOrchestrator {
  // Lazy client — created on first use so ANTHROPIC_API_KEY is read at call time,
  // not at module load time (which happens before env-loader sets process.env).
  private _client: Anthropic | null = null;
  private get client(): Anthropic {
    if (!this._client) {
      this._client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    return this._client;
  }

  async run(params: SkillRunParams): Promise<void> {
    // All callers pass skillsDir after Phase 43 migration; this fallback is retained for safety
    const skillsDir = params.skillsDir ?? path.join(process.cwd(), 'skills');
    const skillPath = path.join(skillsDir, params.skillName + '.md');

    // 1. Load SKILL.md — hot-reload, never cached (SKILL-14)
    let systemPrompt: string;
    try {
      systemPrompt = await readFile(skillPath, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`SKILL_NOT_FOUND:${params.skillName}`);
      }
      throw err;
    }

    // Strip YAML front-matter if present (SKILL-01: front-matter must not reach Claude)
    if (systemPrompt.startsWith('---')) {
      systemPrompt = systemPrompt.replace(/^---[\s\S]*?---\n?/, '').trim();
    }

    // 2. Assemble context from DB
    // Per-skill context builders for team-engagement-map and workflow-diagram inject
    // only the relevant DB tables into Claude's user message (TEAMS-10, ARCH-10).
    // All other skills continue to use buildSkillContext unchanged.
    let skillSpecificContext: string | null = null;
    if (params.skillName === 'team-engagement-map') {
      skillSpecificContext = await buildTeamsSkillContext(params.projectId);
    } else if (params.skillName === 'workflow-diagram') {
      skillSpecificContext = await buildArchSkillContext(params.projectId);
    } else if (params.skillName === 'meeting-prep') {
      skillSpecificContext = await buildMeetingPrepContext(params.projectId, params.input?.transcript);
    }

    const context = await buildSkillContext(
      params.projectId,
      params.skillName,
      params.input
    );

    // 3. Token budget guard (SKILL-02)
    // Pass identical {model, system, messages} to countTokens and stream
    const userMessageContent = skillSpecificContext !== null
      ? skillSpecificContext
      : context.userMessage;

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userMessageContent },
    ];

    const tokenCount = await this.client.messages.countTokens({
      model: MODEL,
      system: systemPrompt,
      messages,
    });

    console.log(`[skill-orchestrator] ${params.skillName} input_tokens: ${tokenCount.input_tokens} / budget: ${TOKEN_BUDGET}`);

    if (tokenCount.input_tokens > TOKEN_BUDGET) {
      console.log(`[skill-orchestrator] ${params.skillName} over budget — truncating context`);
      // Per-skill context builders (teams/arch) do not contain engagement history;
      // truncation only applies to the shared buildSkillContext path.
      if (skillSpecificContext === null) {
        const truncated = context.withTruncatedHistory(5);
        messages[0] = { role: 'user', content: truncated.userMessage };
      }
    }

    // 4. Stream from Claude, write chunks to DB incrementally
    const useMCP = (params.mcpServers?.length ?? 0) > 0;

    // NOTE: intentionally log server count, NOT server names/tokens
    console.log(`[skill-orchestrator] ${params.skillName} mcp_enabled: ${useMCP} servers: ${params.mcpServers?.length ?? 0}`);

    // StreamLike: minimal structural type shared by both MessageStream and BetaMessageStream.
    // The SDK exposes compatible .on('text',...) and .finalMessage() on both, but the union
    // type is not callable due to differing generics — cast to this shared interface.
    type StreamLike = {
      on(event: 'text', listener: (text: string) => void): unknown;
      finalMessage(): Promise<unknown>;
    };

    const stream: StreamLike = useMCP
      ? this.client.beta.messages.stream(
          {
            model: MODEL,
            max_tokens: 8192,
            system: systemPrompt,
            messages,
            mcp_servers: params.mcpServers!.map(s => ({
              type: 'url' as const,
              url: s.url,
              name: s.name,
              authorization_token: s.apiKey,
            })),
            tools: params.mcpServers!.map(s => ({
              type: 'mcp_toolset' as const,
              mcp_server_name: s.name,
              ...(s.allowedTools?.length
                ? {
                    default_config: { enabled: false },
                    configs: Object.fromEntries(
                      s.allowedTools.map(t => [t, { enabled: true }])
                    ),
                  }
                : {}),
            })),
          },
          { headers: { 'anthropic-beta': 'mcp-client-2025-11-20' } }
        )
      : this.client.messages.stream({
          model: MODEL,
          max_tokens: 8192,
          system: systemPrompt,
          messages,
        });

    let seqNum = 0;
    // Batch chunks: flush every 10 text deltas or on stream end
    // Avoids out-of-order seq numbers from concurrent inserts (research open question #2)
    const pendingChunks: Array<{ run_id: number; seq: number; chunk: string }> = [];

    const flushChunks = async () => {
      if (pendingChunks.length === 0) return;
      const toInsert = pendingChunks.splice(0, pendingChunks.length);
      await db.insert(skillRunChunks).values(toInsert);
    };

    stream.on('text', (text: string) => {
      pendingChunks.push({ run_id: params.runId, seq: seqNum++, chunk: text });
      // Flush every 10 chunks to balance latency vs. connection overhead
      if (pendingChunks.length >= 10) {
        flushChunks().catch(err => console.error('[orchestrator] chunk flush error', err));
      }
    });

    await stream.finalMessage();

    // Final flush of remaining chunks
    await flushChunks();

    // 5. Write full output text to skill_runs.full_output for SSE reconnect
    const allChunksResult = await db.select().from(skillRunChunks)
      .where(eq(skillRunChunks.run_id, params.runId));
    const reconstructed = allChunksResult
      .filter(c => c.chunk !== '__DONE__')
      .sort((a, b) => a.seq - b.seq)
      .map(c => c.chunk)
      .join('');

    await db.update(skillRuns)
      .set({ full_output: reconstructed })
      .where(sql`id = ${params.runId}`);

    // 6. Write __DONE__ sentinel so SSE endpoint knows to close
    await db.insert(skillRunChunks).values({
      run_id: params.runId,
      seq: seqNum,
      chunk: '__DONE__',
    });
  }
}
