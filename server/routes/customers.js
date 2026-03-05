// server/routes/customers.js
const router = require('express').Router();
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');
const yamlService = require('../services/yamlService');

// GET /api/customers — list all customers
router.get('/', asyncWrapper(async (req, res) => {
  const files = await driveService.listCustomerFiles();
  const customers = await Promise.all(
    files.map(async (file) => {
      const content = await driveService.readYamlFile(file.id);
      const data = yamlService.parseYaml(content);
      yamlService.validateYaml(data);
      return { fileId: file.id, ...data };
    })
  );
  res.json(customers);
}));

// GET /api/customers/:id — single customer by Drive file ID
router.get('/:id', asyncWrapper(async (req, res) => {
  const content = await driveService.readYamlFile(req.params.id);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);
  res.json({ fileId: req.params.id, ...data });
}));

// PUT /api/customers/:id — atomic full YAML replacement
// Used by YAML Editor (Phase 5); atomic write pattern: parse → validate → serialize → write
router.put('/:id', asyncWrapper(async (req, res) => {
  const data = req.body;
  yamlService.validateYaml(data);
  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(req.params.id, yamlString);
  res.json({ fileId: req.params.id, ...data });
}));

module.exports = router;
