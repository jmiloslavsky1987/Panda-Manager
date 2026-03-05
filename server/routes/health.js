// server/routes/health.js
const router = require('express').Router();
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');

router.get('/drive', asyncWrapper(async (req, res) => {
  const result = await driveService.checkDriveHealth();
  res.json(result);
}));

module.exports = router;
