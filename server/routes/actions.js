// server/routes/actions.js
// mergeParams: true is REQUIRED — without it, req.params.id is undefined
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');
const yamlService = require('../services/yamlService');

router.get('/', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 3 (Action Manager)' });
}));

router.post('/', asyncWrapper(async (req, res) => {
  const { id: fileId } = req.params;
  const { description, owner, due, workstream } = req.body;

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const newId = yamlService.assignNextId('A', data.actions);
  const newAction = {
    id: newId,
    description: description ?? '',
    owner: owner ?? '',
    due: due ?? '',
    status: 'open',
    workstream: workstream ?? '',
    completed_date: '',
  };

  data.actions.push(newAction);

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.status(201).json({ fileId, action: newAction });
}));

router.patch('/:actionId', asyncWrapper(async (req, res) => {
  const { id: fileId, actionId } = req.params;
  const patch = req.body;

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const idx = data.actions.findIndex(a => a.id === actionId);
  if (idx === -1) {
    return res.status(404).json({ error: `Action ${actionId} not found` });
  }

  data.actions[idx] = { ...data.actions[idx], ...patch };

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.json({ fileId, actionId, action: data.actions[idx] });
}));

module.exports = router;
