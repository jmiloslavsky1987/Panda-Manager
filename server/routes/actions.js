// server/routes/actions.js
// mergeParams: true is REQUIRED — without it, req.params.id is undefined
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');

router.get('/', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 3 (Action Manager)' });
}));

router.post('/', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 3 (Action Manager)' });
}));

router.patch('/:actionId', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 3 (Action Manager)' });
}));

module.exports = router;
