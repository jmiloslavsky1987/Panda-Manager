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

const TOKEN_BUDGET = 80_000;
const MODEL = 'claude-sonnet-4-6';

export interface SkillRunParams {
  skillName: string;
  projectId: number;
  runId: number;        // DB serial ID of the skill_runs row
  input?: Record<string, string>; // e.g. { transcript: '...' }
  skillsDir?: string;   // override default skills directory (for testing)
}

export class SkillOrchestrator {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async run(params: SkillRunParams): Promise<void> {
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

    // 2. Assemble context from DB
    const context = await buildSkillContext(
      params.projectId,
      params.skillName,
      params.input
    );

    // 3. Token budget guard (SKILL-02)
    // Pass identical {model, system, messages} to countTokens and stream
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: context.userMessage },
    ];

    const tokenCount = await this.client.messages.countTokens({
      model: MODEL,
      system: systemPrompt,
      messages,
    });

    console.log(`[skill-orchestrator] ${params.skillName} input_tokens: ${tokenCount.input_tokens} / budget: ${TOKEN_BUDGET}`);

    if (tokenCount.input_tokens > TOKEN_BUDGET) {
      console.log(`[skill-orchestrator] ${params.skillName} over budget — truncating context`);
      const truncated = context.withTruncatedHistory(5);
      messages[0] = { role: 'user', content: truncated.userMessage };
    }

    // 4. Stream from Claude, write chunks to DB incrementally
    const stream = this.client.messages.stream({
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
