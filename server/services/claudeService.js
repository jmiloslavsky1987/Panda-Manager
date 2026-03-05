'use strict';
// server/services/claudeService.js
// Generates draft weekly update text (progress, decisions, outcomes) from customer YAML data.
// Uses claude-sonnet-4-6 with a non-streaming request — result pre-fills the Weekly Update Form.
// Requires ANTHROPIC_API_KEY in .env

const Anthropic = require('@anthropic-ai/sdk');

let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment');
    }
    _client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

/**
 * Build a concise context string from customer YAML for the draft prompt.
 * Keeps the prompt short to minimize cost — ~500 tokens of context.
 */
function buildContext(data) {
  const lines = [];
  const customerName = data.customer?.name ?? 'Unknown Customer';
  const goLive = data.project?.go_live_date ?? 'TBD';
  const daysUntil = goLive !== 'TBD'
    ? Math.ceil((new Date(goLive) - Date.now()) / 86_400_000)
    : null;

  lines.push(`Customer: ${customerName}`);
  lines.push(`Project: ${data.project?.name ?? 'BigPanda Implementation'}`);
  lines.push(`Go-live: ${goLive}${daysUntil !== null ? ` (${daysUntil < 0 ? Math.abs(daysUntil) + 'd overdue' : daysUntil + 'd away'})` : ''}`);
  lines.push('');

  // Workstream statuses — only show in_progress and non-zero
  const ws = data.workstreams ?? {};
  const activeWs = [];
  for (const [groupKey, group] of Object.entries(ws)) {
    for (const [subKey, sub] of Object.entries(group)) {
      if (sub.status === 'in_progress' || (sub.percent_complete ?? 0) > 0) {
        const label = subKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const blocker = sub.blockers ? ` [BLOCKER: ${sub.blockers}]` : '';
        activeWs.push(`  - ${label} (${sub.percent_complete ?? 0}%): ${sub.progress_notes || sub.status}${blocker}`);
      }
    }
  }
  if (activeWs.length > 0) {
    lines.push('Active workstreams:');
    lines.push(...activeWs);
    lines.push('');
  }

  // Recently completed actions (last 14 days or any with completed_date)
  const actions = data.actions ?? [];
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const recentDone = actions.filter(a =>
    a.status === 'completed' && (!a.completed_date || a.completed_date >= twoWeeksAgo)
  );
  if (recentDone.length > 0) {
    lines.push('Recently completed actions:');
    recentDone.slice(0, 8).forEach(a =>
      lines.push(`  - [${a.id}] ${a.description} (${a.owner})`)
    );
    lines.push('');
  }

  // Open overdue actions
  const today = new Date().toISOString().slice(0, 10);
  const overdue = actions.filter(a => a.status !== 'completed' && a.due && a.due < today);
  if (overdue.length > 0) {
    lines.push('Overdue open actions:');
    overdue.slice(0, 5).forEach(a =>
      lines.push(`  - [${a.id}] ${a.description} — due ${a.due} (${a.owner})`)
    );
    lines.push('');
  }

  // Open high risks
  const highRisks = (data.risks ?? []).filter(r => r.severity === 'high' && r.status === 'open');
  if (highRisks.length > 0) {
    lines.push('Open high risks:');
    highRisks.slice(0, 4).forEach(r => lines.push(`  - ${r.description}`));
    lines.push('');
  }

  // Recent artifact updates (last 14 days)
  const recentArtifacts = (data.artifacts ?? []).filter(a =>
    a.last_updated && a.last_updated >= twoWeeksAgo
  );
  if (recentArtifacts.length > 0) {
    lines.push('Recently updated artifacts:');
    recentArtifacts.slice(0, 5).forEach(a =>
      lines.push(`  - ${a.title} (${a.type}, ${a.status})`)
    );
    lines.push('');
  }

  // Previous history entry for continuity
  const prev = (data.history ?? [])[0];
  if (prev) {
    lines.push(`Last week (${prev.week_ending}):`);
    if (prev.progress) lines.push(`  Progress: ${prev.progress}`);
    if (prev.decisions) lines.push(`  Decisions: ${prev.decisions}`);
    if (prev.outcomes) lines.push(`  Outcomes: ${prev.outcomes}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate a draft weekly update from customer YAML data.
 * Returns { progress, decisions, outcomes } — all plain text strings.
 */
async function generateUpdateDraft(data) {
  const client = getClient();
  const context = buildContext(data);

  const systemPrompt =
    'You are a BigPanda implementation project manager. ' +
    'Write concise, professional weekly status update text based on the provided customer data. ' +
    'Each field should be 1-3 sentences of plain text (no bullet points, no markdown). ' +
    'Be specific — reference actual workstreams, actions, and artifacts from the data. ' +
    'Write from the perspective of the implementation team reporting to the customer.';

  const userPrompt =
    `Based on this customer project data, draft the three fields for this week's status update:\n\n` +
    `${context}\n` +
    `Respond with ONLY a JSON object with exactly three keys: "progress", "decisions", "outcomes". ` +
    `Each value is a plain text string (no bullet points). Example:\n` +
    `{"progress":"...","decisions":"...","outcomes":"..."}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = message.content[0]?.text ?? '';

  // Extract JSON from response (Claude may wrap it in markdown fences)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude response did not contain valid JSON: ' + raw.slice(0, 200));
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    progress: String(parsed.progress ?? ''),
    decisions: String(parsed.decisions ?? ''),
    outcomes: String(parsed.outcomes ?? ''),
  };
}

module.exports = { generateUpdateDraft };
