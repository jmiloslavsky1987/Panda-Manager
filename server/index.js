// server/index.js
require('dotenv').config();
const express = require('express');

const app = express();

// Body parsing — 2mb limit (YAML Editor in Phase 5 sends full YAML strings)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/customers', require('./routes/customers'));

// Top-level reports route — canonical POST /api/reports/generate per INFRA-06
app.use('/api/reports', require('./routes/topLevelReports'));

// Child routers for nested resources — mergeParams: true inside each router file
// Mounted AFTER the parent /api/customers route
app.use('/api/customers/:id/actions', require('./routes/actions'));
app.use('/api/customers/:id/risks', require('./routes/risks'));
app.use('/api/customers/:id/milestones', require('./routes/milestones'));
app.use('/api/customers/:id/artifacts', require('./routes/artifacts'));
app.use('/api/customers/:id/history', require('./routes/history'));
app.use('/api/customers/:id/reports', require('./routes/reports'));

// Error handler — MUST be last middleware (4-argument signature identifies it to Express)
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] Express running on http://localhost:${PORT}`);
});

module.exports = app; // Export for testing with supertest
