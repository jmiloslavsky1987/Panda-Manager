// server/routes/history.js
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');
const yamlService = require('../services/yamlService');
const claudeService = require('../services/claudeService');

// GET /api/customers/:id/history/draft
// Reads customer YAML and asks Claude to draft this week's progress, decisions, outcomes.
// Returns { progress, decisions, outcomes } — plain text strings to pre-fill the Weekly Update Form.
router.get('/draft', asyncWrapper(async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
  }
  const { id: fileId } = req.params;
  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  const draft = await claudeService.generateUpdateDraft(data);
  res.json(draft);
}));

router.post('/', asyncWrapper(async (req, res) => {
  const { id: fileId } = req.params;
  const entry = req.body;

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  // Normalize entry: coerce all percent_complete values to integers (Pitfall 5)
  const normalizedEntry = { ...entry };
  if (normalizedEntry.workstreams && typeof normalizedEntry.workstreams === 'object') {
    for (const [groupKey, group] of Object.entries(normalizedEntry.workstreams)) {
      for (const [subKey, sub] of Object.entries(group)) {
        normalizedEntry.workstreams = {
          ...normalizedEntry.workstreams,
          [groupKey]: {
            ...normalizedEntry.workstreams[groupKey],
            [subKey]: {
              ...sub,
              percent_complete: parseInt(sub.percent_complete, 10) || 0,
            },
          },
        };
      }
    }
  }

  // PREPEND — history[0] is always most recent (NEVER push)
  data.history.unshift(normalizedEntry);

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.status(201).json({ fileId, entry: normalizedEntry });
}));

module.exports = router;
