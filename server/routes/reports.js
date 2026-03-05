// server/routes/reports.js
// Customer-scoped reports stub: POST /api/customers/:id/reports
// Distinct from the top-level POST /api/reports/generate (topLevelReports.js).
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');

router.post('/', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 5 (Report Generator)' });
}));

module.exports = router;
