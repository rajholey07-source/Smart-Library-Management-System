/**
 * Authentication routes: register, login, logout, me, change password.
 * Security: scrypt-hashed passwords, httpOnly signed session cookie, role checks,
 * no demo bypass — the only admin is created through seeding.
 */
const express = require('express');
const { db } = require('../db');
const config = require('../config');
const { signToken, verifyPassword, hashPassword } = require('../utils');
const { requireAuth } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');
const { cleanString, requireFields, requireValidEmail, requireValidPassword } = require('../validate');
const { ConflictError, UnauthorizedError } = require('../errors');

const router = express.Router();

const COOKIE_BASE = { httpOnly: true, sameSite: 'lax', path: '/' };

function publicUser(u) {
  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    student_id: u.student_id,
    is_active: u.is_active,
    created_at: u.created_at,
  };
}

function setSession(res, user, remember) {
  const ttl = remember ? config.jwtRememberExpiresIn : config.jwtExpiresIn;
  const token = signToken({ sub: user.id, role: user.role }, config.jwtSecret, ttl);
  res.cookie('token', token, { ...COOKIE_BASE, maxAge: require('../utils').ms(ttl) });
}

// POST /api/auth/register  (students only — admins are provisioned, never self-registered)
router.post('/register', asyncH((req, res) => {
  const body = req.body || {};
  requireFields(body, ['full_name', 'email', 'student_id', 'password', 'confirm_password']);
  requireValidEmail(body);
  requireValidPassword(body);

  if (String(body.password) !== String(body.confirm_password)) {
    throw new ConflictError('Passwords do not match.', ['confirm_password must match password.']);
  }
  if (cleanString(body.student_id).length < 3) {
    throw new ConflictError('Student ID must be at least 3 characters.', ['student_id is too short.']);
  }

  const email = cleanString(body.email).toLowerCase();
  const studentId = cleanString(body.student_id);

  const exists = db.prepare('SELECT id FROM users WHERE email = ? OR (student_id IS NOT NULL AND student_id = ?)')
    .get(email, studentId);
  if (exists) throw new ConflictError('An account with this email or student ID already exists.');

  const info = db.prepare(`
    INSERT INTO users (full_name, email, password_hash, role, student_id)
    VALUES (?, ?, ?, 'student', ?)
  `).run(cleanString(body.full_name), email, hashPassword(body.password), studentId);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  setSession(res, user, false);

  db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(
    user.id,
    'Welcome to the library portal',
    'Your student account has been created successfully. You can now search the catalog and borrow books.',
    'success'
  );

  res.status(201).json({ user: publicUser(user) });
}));

// POST /api/auth/login  { email, password, remember }
router.post('/login', asyncH((req, res) => {
  const body = req.body || {};
  requireFields(body, ['email', 'password']);
  const email = cleanString(body.email).toLowerCase();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(body.password, user.password_hash)) {
    throw new UnauthorizedError('Invalid email or password.');
  }
  if (!user.is_active) {
    throw new UnauthorizedError('This account has been deactivated. Please contact the library desk.');
  }

  setSession(res, user, Boolean(body.remember));
  res.json({ user: publicUser(user) });
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...COOKIE_BASE });
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', asyncH((req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ user: publicUser(req.user) });
}));

// PUT /api/auth/change-password
router.put('/change-password', requireAuth, asyncH((req, res) => {
  const body = req.body || {};
  requireFields(body, ['current_password', 'new_password']);
  requireValidPassword(body, 'new_password');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!verifyPassword(body.current_password, user.password_hash)) {
    throw new UnauthorizedError('Current password is incorrect.');
  }

  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(hashPassword(body.new_password), user.id);
  res.json({ ok: true, message: 'Password updated successfully.' });
}));

module.exports = router;
