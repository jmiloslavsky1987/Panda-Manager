// server/routes/risks.test.js
// Wave 0: stubs only — all t.todo() so suite exits 0 before Wave 1 implementation
// Full assertions added in 02-02-PLAN.md (Wave 1 server plan)
'use strict';

const { describe, it } = require('node:test');

describe('PATCH /api/customers/:id/risks/:riskId', () => {
  it('returns 200 with updated risk when valid riskId provided', (t) => t.todo('implement in 02-02'));
  it('returns 404 when riskId not found in customer YAML', (t) => t.todo('implement in 02-02'));
  it('applies partial patch — only provided fields are updated, others preserved', (t) => t.todo('implement in 02-02'));
  it('writes updated YAML back to Drive atomically (mocked driveService)', (t) => t.todo('implement in 02-02'));
  it('returns 422 when patch would create invalid YAML', (t) => t.todo('implement in 02-02'));
});
