/**
 * Global error-handling middleware. Maps ApiError subclasses, SQLite constraint
 * errors and anything unexpected to clean JSON error responses.
 */
const { ApiError } = require('../errors');
const { mapSqliteError } = require('../library');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  const mapped = mapSqliteError(err);
  if (mapped) error = mapped;

  if (!(error instanceof ApiError)) {
    console.error('Unhandled error:', err);
    error = new ApiError(500, 'Something went wrong on our side. Please try again.');
  }

  res.status(error.status).json({
    error: error.message,
    details: error.details || undefined,
  });
}

/** Wrap sync route handlers so thrown errors reach the error middleware. */
const asyncH = (fn) => (req, res, next) => {
  try {
    const out = fn(req, res, next);
    if (out && typeof out.catch === 'function') out.catch(next);
  } catch (e) {
    next(e);
  }
};

module.exports = { errorHandler, asyncH };
