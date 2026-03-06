// client/src/lib/reportGenerator.test.js
// Regression guard for buildPanel() workstream-group filter bug (Phase 6 fix).
// Run: node --test client/src/lib/reportGenerator.test.js
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

// NOTE: reportGenerator.js is an ESM module (uses export). To test it from node:test,
// use a dynamic import inside an async test.

let generateExternalELT;
before(async () => {
  const mod = await import('./reportGenerator.js');
  generateExternalELT = mod.generateExternalELT;
});

// Minimal customer fixture for testing (no Drive dependency)
function buildMinimalCustomer(actions) {
  return {
    customer: { name: 'Test Co', program: 'Test', go_live_target: '2026-12-01' },
    status: 'on_track',
    workstreams: { adr: {}, biggy: {} },
    history: [],
    actions,
    risks: [],
    milestones: [],
    artifacts: [],
  };
}

describe('reportGenerator buildPanel() workstream filter', () => {
  it('matches actions whose workstream is a sub-key of the ELT group (not the group key itself)', async () => {
    const customer = buildMinimalCustomer([
      { id: 'A-001', description: 'Set up inbound', workstream: 'inbound_integrations', status: 'open', due: '' }
    ]);
    const slides = generateExternalELT(customer);
    // Slide 4 is ADR Detail — find all sections and look for Looking Ahead content
    const adrSlide = slides.find(s => s.title?.includes('ADR'));
    const lookingAheadSection = adrSlide?.sections?.find(s => s.content?.includes('Looking Ahead'));
    assert.ok(lookingAheadSection?.content?.includes('Set up inbound'), 'Expected action description in Looking Ahead');
  });

  it('returns non-empty lookingAhead bullets when actions exist for the group sub-workstreams', async () => {
    const customer = buildMinimalCustomer([
      { id: 'A-001', description: 'Configure workflow', workstream: 'workflows_configuration', status: 'open', due: '' }
    ]);
    const slides = generateExternalELT(customer);
    const biggySlide = slides.find(s => s.title?.includes('Biggy'));
    const lookingAheadSection = biggySlide?.sections?.find(s => s.content?.includes('Looking Ahead'));
    assert.ok(lookingAheadSection?.content?.includes('Configure workflow'), 'Expected biggy action in Looking Ahead');
  });

  it('falls back to "Continue current work items" only when no actions match the group sub-workstreams', async () => {
    const customer = buildMinimalCustomer([]); // no actions
    const slides = generateExternalELT(customer);
    const adrSlide = slides.find(s => s.title?.includes('ADR'));
    const lookingAheadSection = adrSlide?.sections?.find(s => s.content?.includes('Looking Ahead'));
    assert.ok(lookingAheadSection?.content?.includes('Continue current work items'));
  });
});
