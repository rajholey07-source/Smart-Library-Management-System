/**
 * Validation helpers for API payloads. Throw ApiError subclasses on failure
 * so routes can return clean 400 responses with field-level details.
 */
const { BadRequestError } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// ISBN-10/13 with optional hyphens/spaces; final char may be X (ISBN-10)
const ISBN_RE = /^[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9Xx]$/;

function cleanString(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function requireFields(body, fields) {
  const details = [];
  for (const f of fields) {
    if (!cleanString(body[f])) details.push(`${f} is required.`);
  }
  if (details.length) throw new BadRequestError('Please fix the highlighted fields.', details);
}

function validEmail(email) {
  return EMAIL_RE.test(cleanString(email));
}

function validISBN(isbn) {
  return ISBN_RE.test(cleanString(isbn));
}

function validPassword(pw) {
  return typeof pw === 'string' && pw.length >= 8;
}

function intInRange(value, min, max, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new BadRequestError(`${label} must be an integer between ${min} and ${max}.`);
  }
  return n;
}

function requireValidEmail(body, field = 'email') {
  if (!validEmail(body[field])) {
    throw new BadRequestError('Please enter a valid email address.', [`${field} is invalid.`]);
  }
}

function requireValidPassword(body, field = 'password') {
  if (!validPassword(body[field])) {
    throw new BadRequestError('Password must be at least 8 characters long.', [`${field} is too short.`]);
  }
}

module.exports = {
  cleanString,
  requireFields,
  validEmail,
  validISBN,
  validPassword,
  intInRange,
  requireValidEmail,
  requireValidPassword,
  EMAIL_RE,
  ISBN_RE,
};
