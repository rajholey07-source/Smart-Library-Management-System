/**
 * Custom API error classes used across the backend for clean HTTP error mapping.
 */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

class BadRequestError extends ApiError {
  constructor(message, details) {
    super(400, message, details);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'You must be signed in to do that.') {
    super(401, message);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(403, message);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'The requested record was not found.') {
    super(404, message);
  }
}

class ConflictError extends ApiError {
  constructor(message = 'This conflicts with an existing record.') {
    super(409, message);
  }
}

module.exports = { ApiError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError };
