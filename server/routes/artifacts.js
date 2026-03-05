// server/routes/artifacts.js
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');

router.get('/', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 4 (Artifact Manager)' });
}));

router.post('/', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 4 (Artifact Manager)' });
}));

router.patch('/:artifactId', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 4 (Artifact Manager)' });
}));

module.exports = router;
