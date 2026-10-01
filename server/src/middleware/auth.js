/**
 * Authentication and role-based access control middleware.
 * - Reads the httpOnly token from the `token` cookie.
 * - attachUser: resolves the current user for every request (null if not signed in).
 * - requireAuth / requireAdmin: guard protected routes.
 */
const { db } = require('../db');
const config = require('../config');
const { verifyToken } = require('../utils');
const { UnauthorizedError, ForbiddenError } = require('../errors');

function attachUser(req, _res, next) {
  req.user = null;
  const token = req.cookies && req.cookies.token;
  if (token) {
    const payload = verifyToken(token, config.jwtSecret);
    if (payload && payload.sub) {
      const user = db.prepare(
        'SELECT id, full_name, email, role, student_id, is_active FROM users WHERE id = ?'
      ).get(payload.sub);
      if (user && user.is_active) req.user = user;
    }
  }
  next();
}

function requireAuth(req, _res, next) {
  if (!req.user) throw new UnauthorizedError();
  next();
}

function requireAdmin(req, _res, next) {
  if (!req.user) throw new UnauthorizedError();
  if (req.user.role !== 'admin') throw new ForbiddenError('Admin access required.');
  next();
}

module.exports = { attachUser, requireAuth, requireAdmin };
