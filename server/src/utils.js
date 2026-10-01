/**
 * Shared helper functions for the Smart Library Management System backend.
 */
const crypto = require('crypto');

/** ISO date (YYYY-MM-DD) for a day offset from now (or from a given date). */
function isoDay(offsetDays, from = new Date()) {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `dueDate` (YYYY-MM-DD) to today. Negative if not yet due. */
function daysOverdue(dueDate, now = new Date()) {
  const due = new Date(`${dueDate}T00:00:00Z`);
  const today = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.floor((today - due) / 86400000);
}

/** Parse a duration string like '8h' or '7d' into milliseconds. */
function ms(str) {
  const m = /^(\d+)([smhd])$/.exec(String(str));
  if (!m) return 8 * 3600 * 1000;
  const n = Number(m[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
  return n * unit;
}

/** Generate a signed token: base64url(payloadJson).base64url(hmacSignature). */
function signToken(payload, secret, expiresIn) {
  const bodyObject = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + ms(expiresIn)) / 1000),
  };
  const body = Buffer.from(JSON.stringify(bodyObject)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** Verify a signed token; returns the payload or null when invalid/expired. */
function verifyToken(token, secret) {
  try {
    if (typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const expected = crypto.createHmac('sha256', secret).update(body).digest();
    const given = Buffer.from(sig, 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Hash a password with scrypt (salted). Format: scrypt$salt$hashHex. */
function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

/** Verify a password against a stored scrypt hash (timing-safe). */
function verifyPassword(plain, stored) {
  try {
    const [scheme, salt, hashHex] = String(stored).split('$');
    if (scheme !== 'scrypt' || !salt || !hashHex) return false;
    const check = crypto.scryptSync(String(plain), salt, 64);
    const expected = Buffer.from(hashHex, 'hex');
    if (check.length !== expected.length) return false;
    return crypto.timingSafeEqual(check, expected);
  } catch {
    return false;
  }
}

module.exports = { isoDay, daysOverdue, ms, signToken, verifyToken, hashPassword, verifyPassword };
