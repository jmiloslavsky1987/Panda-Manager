// server/routes/risks.js
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');

router.get('/', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 2 (Customer Overview)' });
}));

router.patch('/:riskId', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 2 (Customer Overview)' });
}));

module.exports = router;
