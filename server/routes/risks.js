// server/routes/risks.js
'use strict';
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');
const yamlService = require('../services/yamlService');

// GET /api/customers/:id/risks — list risks (read from full customer YAML)
router.get('/', asyncWrapper(async (req, res) => {
  const content = await driveService.readYamlFile(req.params.id);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);
  res.json(data.risks ?? []);
}));

// PATCH /api/customers/:id/risks/:riskId — inline field edit (atomic write)
// Body: partial risk fields to update (e.g., { status: "mitigated", mitigation: "..." })
// Pattern: read → parse → validate → find → merge → validate → normalize → serialize → write
router.patch('/:riskId', asyncWrapper(async (req, res) => {
  const { id: fileId, riskId } = req.params;
  const patch = req.body;

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const riskIndex = (data.risks ?? []).findIndex(r => r.id === riskId);
  if (riskIndex === -1) {
    return res.status(404).json({ error: 'Risk not found' });
  }

  data.risks[riskIndex] = { ...data.risks[riskIndex], ...patch };

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.json({ fileId, riskId, risk: data.risks[riskIndex] });
}));

module.exports = router;
