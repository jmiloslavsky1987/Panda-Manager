// server/routes/artifacts.js
// mergeParams: true is REQUIRED — without it, req.params.id is undefined
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');
const yamlService = require('../services/yamlService');

router.post('/', asyncWrapper(async (req, res) => {
  const { id: fileId } = req.params;
  const { type, title, description, status, owner } = req.body;

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const newId = yamlService.assignNextId('X', data.artifacts);
  const today = new Date().toISOString().split('T')[0];

  const newArtifact = {
    id: newId,
    type: type ?? 'document',
    title: title ?? '',
    description: description ?? '',
    status: status ?? 'active',
    owner: owner ?? '',
    last_updated: today,
    related_topics: [],
    linked_actions: [],
  };

  data.artifacts.push(newArtifact);

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.status(201).json({ fileId, artifact: newArtifact });
}));

router.patch('/:artifactId', asyncWrapper(async (req, res) => {
  const { id: fileId, artifactId } = req.params;
  const patch = req.body;

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const idx = data.artifacts.findIndex(a => a.id === artifactId);
  if (idx === -1) {
    return res.status(404).json({ error: `Artifact ${artifactId} not found` });
  }

  const today = new Date().toISOString().split('T')[0];
  data.artifacts[idx] = { ...data.artifacts[idx], ...patch, last_updated: today };

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.json({ fileId, artifactId, artifact: data.artifacts[idx] });
}));

module.exports = router;
