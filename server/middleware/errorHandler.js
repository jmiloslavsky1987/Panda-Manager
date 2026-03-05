// server/middleware/errorHandler.js
// Express 4-argument error middleware (err, req, res, next) — must be last app.use()
// IMPORTANT: The 4th parameter (next) must be declared even if unused.
// Express identifies error middleware by arity (4 arguments).
// Removing 'next' causes Express to treat it as regular middleware, silently breaking error handling.
'use strict';

const { ValidationError } = require('../services/yamlService');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[Error]', err.message);

  if (err instanceof ValidationError) {
    return res.status(422).json({ error: err.message, details: err.details || null });
  }

  // Google Drive 404 (file not found or service account has no access)
  if (err.code === 404 || err.status === 404) {
    return res.status(404).json({ error: 'FILE_NOT_FOUND_OR_NO_ACCESS', message: err.message });
  }

  // Google Drive 403 (wrong scope or file not shared with service account)
  if (err.code === 403 || err.status === 403) {
    return res.status(403).json({ error: 'DRIVE_PERMISSION_DENIED', message: err.message });
  }

  res.status(err.statusCode || err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
