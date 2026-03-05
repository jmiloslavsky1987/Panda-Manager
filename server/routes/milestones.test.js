// server/routes/milestones.test.js
// Wave 0: stubs only — all t.todo() so suite exits 0 before Wave 1 implementation
// Full assertions added in 02-02-PLAN.md (Wave 1 server plan)
'use strict';

const { describe, it } = require('node:test');

describe('PATCH /api/customers/:id/milestones/:milestoneId', () => {
  it('returns 200 with updated milestone when valid milestoneId provided', (t) => t.todo('implement in 02-02'));
  it('returns 404 when milestoneId not found in customer YAML', (t) => t.todo('implement in 02-02'));
  it('applies partial patch — only provided fields are updated, others preserved', (t) => t.todo('implement in 02-02'));
  it('writes updated YAML back to Drive atomically (mocked driveService)', (t) => t.todo('implement in 02-02'));
});
