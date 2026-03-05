// server/routes/workstreams.js
// mergeParams: true required — req.params.id is the customer file ID from parent route
'use strict';
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');
const yamlService = require('../services/yamlService');

const REQUIRED_GROUPS = ['adr', 'biggy'];

router.patch('/', asyncWrapper(async (req, res) => {
  const { id: fileId } = req.params;
  const newWorkstreams = req.body;

  // Validate required groups before reading Drive (fast-fail on bad body)
  for (const group of REQUIRED_GROUPS) {
    if (typeof newWorkstreams[group] !== 'object' || newWorkstreams[group] === null) {
      return res.status(422).json({ error: `Missing required workstream group: ${group}` });
    }
  }

  // Atomic: read -> replace workstreams key -> validate -> write
  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  data.workstreams = newWorkstreams;

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.json({ fileId, workstreams: data.workstreams });
}));

module.exports = router;
