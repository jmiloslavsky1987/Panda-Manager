// server/routes/reports.js
// Customer-scoped reports: POST /api/customers/:id/reports/pptx
'use strict';

const router        = require('express').Router({ mergeParams: true });
const asyncWrapper  = require('../middleware/asyncWrapper');
const driveService  = require('../services/driveService');
const yamlService   = require('../services/yamlService');
const { generatePptxBase64 } = require('../services/pptxService');

/**
 * POST /api/customers/:id/reports/pptx
 * Body: { type: 'elt_external' | 'elt_internal' }
 * Returns: { base64: string, filename: string }
 */
router.post('/pptx', asyncWrapper(async (req, res) => {
  const { id: fileId } = req.params;
  const { type } = req.body;

  if (!['elt_external', 'elt_internal'].includes(type)) {
    return res.status(400).json({ error: 'type must be elt_external or elt_internal' });
  }

  const content  = await driveService.readYamlFile(fileId);
  const customer = yamlService.parseYaml(content);

  const { base64, filename } = await generatePptxBase64(customer, type);
  res.json({ base64, filename });
}));

module.exports = router;
