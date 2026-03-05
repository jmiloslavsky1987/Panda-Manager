// server/routes/topLevelReports.js
// Top-level reports endpoint — canonical path per INFRA-06: POST /api/reports/generate
// Phase 5 (Report Generator) implements this stub.
// NOTE: This is separate from /api/customers/:id/reports which is a customer-scoped reports stub.
const router = require('express').Router();
const asyncWrapper = require('../middleware/asyncWrapper');

router.post('/generate', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 5 (Report Generator)' });
}));

module.exports = router;
