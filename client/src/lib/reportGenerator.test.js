// client/src/lib/reportGenerator.test.js
// Regression guard for buildPanel() workstream-group filter bug (Phase 6 fix).
// Run: node --test client/src/lib/reportGenerator.test.js
import { describe, it } from 'node:test';

// NOTE: reportGenerator.js is an ESM module (uses export). To test it from node:test,
// use a dynamic import inside an async test.
// When the buildPanel fix is implemented in Plan 06-02, replace t.todo stubs below
// with real assertions using the dynamically-imported module.

describe('reportGenerator buildPanel() workstream filter', () => {
  it('matches actions whose workstream is a sub-key of the ELT group (not the group key itself)');
  it('returns non-empty lookingAhead bullets when actions exist for the group sub-workstreams');
  it('falls back to "Continue current work items" only when no actions match the group sub-workstreams');
});
