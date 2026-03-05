// server/middleware/asyncWrapper.js
// Wraps async route handlers to forward thrown errors to Express error middleware.
// Works identically in Express 4 and 5 (Express 5 also propagates natively, but
// asyncWrapper is more explicit and documents intent).
'use strict';

const asyncWrapper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncWrapper;
