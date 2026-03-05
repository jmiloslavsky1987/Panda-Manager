// server/routes/history.js
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');

router.post('/', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 4 (Weekly Update Form)' });
}));

module.exports = router;
