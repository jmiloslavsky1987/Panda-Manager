// server/routes/customers.js
const router = require('express').Router();
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');
const yamlService = require('../services/yamlService');
// Build a minimal valid YAML scaffold for a new customer
function buildNewCustomerYaml(customerName, projectName, goLiveDate) {
  const slug = customerName.replace(/[^a-zA-Z0-9]/g, '_');
  const data = {
    customer: { name: customerName },
    project: {
      name: projectName || `${customerName} Implementation`,
      go_live_date: goLiveDate || '',
      percent_complete: 0,
      status: 'not_started',
    },
    workstreams: {
      adr: {
        inbound_integrations:   { status: 'not_started', percent_complete: 0, scope: [], progress_notes: '', blockers: '' },
        outbound_integrations:  { status: 'not_started', percent_complete: 0, scope: [], progress_notes: '', blockers: '' },
        normalization:          { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
        platform_configuration: { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
        correlation:            { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
        training_and_uat:       { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
      },
      biggy: {
        biggy_app_integration:      { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
        udc:                        { status: 'not_started', percent_complete: 0, scope: [], progress_notes: '', blockers: '' },
        real_time_integrations:     { status: 'not_started', percent_complete: 0, scope: [], progress_notes: '', blockers: '' },
        action_plans_configuration: { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
        workflows_configuration:    { status: 'not_started', percent_complete: 0, progress_notes: '', blockers: '' },
      },
    },
    actions: [],
    risks: [],
    milestones: [],
    artifacts: [],
    history: [],
  };
  const yamlString = yamlService.serializeYaml(data);
  const fileName = `${slug}_Master_Status.yaml`;
  return { data, yamlString, fileName };
}

// POST /api/customers — create a new customer YAML in Drive
router.post('/', asyncWrapper(async (req, res) => {
  const { customerName, projectName, goLiveDate, yamlContent } = req.body || {};
  if (!customerName || !customerName.trim()) {
    return res.status(422).json({ error: 'customerName is required' });
  }

  let yamlString, data;
  const slug = customerName.trim().replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${slug}_Master_Status.yaml`;

  if (yamlContent) {
    // Decode base64, parse, validate — use uploaded YAML as-is
    let decoded;
    try {
      decoded = Buffer.from(yamlContent, 'base64').toString('utf8');
    } catch (e) {
      return res.status(422).json({ error: 'yamlContent must be valid base64' });
    }
    try {
      data = yamlService.parseYaml(decoded);
    } catch (e) {
      return res.status(422).json({ error: `YAML parse error: ${e.message}` });
    }
    try {
      yamlService.validateYaml(data);
    } catch (e) {
      return res.status(422).json({ error: e.message, details: e.details });
    }
    yamlString = decoded; // write uploaded YAML verbatim (preserves formatting)
  } else {
    // No upload — generate template YAML
    ({ data, yamlString } = buildNewCustomerYaml(
      customerName.trim(),
      projectName?.trim() || '',
      goLiveDate?.trim() || ''
    ));
  }

  const file = await driveService.createYamlFile(fileName, yamlString);
  res.status(201).json({ fileId: file.id, ...data });
}));

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

// GET /api/customers/:id/yaml — return raw YAML string for the editor
router.get('/:id/yaml', asyncWrapper(async (req, res) => {
  const content = await driveService.readYamlFile(req.params.id);
  res.json({ content });
}));

// PUT /api/customers/:id/yaml — parse + validate + write raw YAML string
// The editor sends the raw string; we validate structure before writing to Drive.
router.put('/:id/yaml', asyncWrapper(async (req, res) => {
  const { content } = req.body;
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content must be a string' });
  }
  let data;
  try {
    data = yamlService.parseYaml(content);
  } catch (err) {
    return res.status(422).json({ error: `YAML parse error: ${err.message}` });
  }
  try {
    yamlService.validateYaml(data);
  } catch (err) {
    return res.status(422).json({ error: err.message, details: err.details });
  }
  await driveService.writeYamlFile(req.params.id, content);
  res.json({ content });
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
