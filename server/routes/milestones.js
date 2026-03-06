// server/routes/milestones.js
'use strict';
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');
const yamlService = require('../services/yamlService');

// GET /api/customers/:id/milestones — list milestones
router.get('/', asyncWrapper(async (req, res) => {
  const content = await driveService.readYamlFile(req.params.id);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);
  res.json(data.milestones ?? []);
}));

// POST /api/customers/:id/milestones — create new milestone with sequential M-### ID
router.post('/', asyncWrapper(async (req, res) => {
  const { id: fileId } = req.params;
  const { name, date, status } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const newId = yamlService.assignNextId('M', data.milestones ?? []);
  const newMilestone = {
    id: newId,
    name,
    date: date ?? '',
    status: status ?? 'upcoming',
  };

  data.milestones = [...(data.milestones ?? []), newMilestone];

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.status(201).json({ fileId, milestone: newMilestone });
}));

// PATCH /api/customers/:id/milestones/:milestoneId — inline field edit (atomic write)
// Body: partial milestone fields to update (e.g., { status: "complete", notes: "..." })
router.patch('/:milestoneId', asyncWrapper(async (req, res) => {
  const { id: fileId, milestoneId } = req.params;
  const patch = req.body;

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const milestoneIndex = (data.milestones ?? []).findIndex(m => m.id === milestoneId);
  if (milestoneIndex === -1) {
    return res.status(404).json({ error: 'Milestone not found' });
  }

  data.milestones[milestoneIndex] = { ...data.milestones[milestoneIndex], ...patch };

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.json({ fileId, milestoneId, milestone: data.milestones[milestoneIndex] });
}));

module.exports = router;
