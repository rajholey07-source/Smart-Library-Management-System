/**
 * Users API (admin) + self-profile endpoints for students.
 * GET   /api/users            (admin)  — search/filter/paginate
 * GET   /api/users/:id        (admin)  — details + borrowing history
 * PUT   /api/users/:id        (admin)  — edit info, activate/deactivate
 * PUT   /api/users/me/profile (auth)   — student updates own name
 */
const express = require('express');
const { db } = require('../db');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');
const { cleanString, requireFields, requireValidEmail, requireValidPassword, validPassword } = require('../validate');
const { NotFoundError, BadRequestError, ConflictError } = require('../errors');
const { hashPassword, verifyPassword } = require('../utils');

const router = express.Router();

const USER_SELECT = `
  SELECT u.id, u.full_name, u.email, u.role, u.student_id, u.is_active, u.created_at,
    (SELECT COUNT(*) FROM borrow_records br WHERE br.user_id = u.id AND br.status = 'BORROWED') AS active_borrows,
    (SELECT COUNT(*) FROM borrow_records br WHERE br.user_id = u.id) AS total_borrows,
    (SELECT COALESCE(SUM(amount),0) FROM fines f WHERE f.user_id = u.id AND f.status = 'UNPAID') AS unpaid_fines
  FROM users u
`;

// GET /api/users?role=&q=&status=&page=&limit=&sort=
router.get('/', requireAdmin, asyncH((req, res) => {
  const q = req.query || {};
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 10));
  const offset = (page - 1) * limit;

  const clauses = [];
  const params = [];
  if (q.role === 'student' || q.role === 'admin') { clauses.push('u.role = ?'); params.push(q.role); }
  if (q.status === 'active') clauses.push('u.is_active = 1');
  if (q.status === 'inactive') clauses.push('u.is_active = 0');
  if (q.q) {
    clauses.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)');
    params.push(`%${q.q}%`, `%${q.q}%`, `%${q.q}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const sortMap = {
    name: 'u.full_name COLLATE NOCASE ASC',
    newest: 'u.created_at DESC, u.id DESC',
    borrows: 'total_borrows DESC, u.full_name COLLATE NOCASE ASC',
  };
  const orderBy = sortMap[q.sort] || sortMap.name;

  const total = db.prepare(`SELECT COUNT(*) n FROM users u ${where}`).get(...params).n;
  const users = db.prepare(`${USER_SELECT} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  res.json({ users, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

// GET /api/users/:id — details + borrowing history + fines
router.get('/:id', requireAdmin, asyncH((req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new BadRequestError('Invalid user id.');
  const user = db.prepare(`${USER_SELECT} WHERE u.id = ?`).get(id);
  if (!user) throw new NotFoundError('User not found.');

  const history = db.prepare(`
    SELECT br.id, br.book_id, b.title, b.author, br.borrowed_at, br.due_date, br.returned_at, br.status,
      CASE WHEN br.status='BORROWED' AND br.due_date < date('now') THEN 1 ELSE 0 END AS is_overdue
    FROM borrow_records br JOIN books b ON b.id = br.book_id
    WHERE br.user_id = ? ORDER BY br.borrowed_at DESC, br.id DESC LIMIT 50
  `).all(id);

  const fines = db.prepare(`
    SELECT f.*, b.title FROM fines f
    JOIN borrow_records br ON br.id = f.borrow_record_id
    JOIN books b ON b.id = br.book_id
    WHERE f.user_id = ? ORDER BY f.created_at DESC
  `).all(id);

  res.json({ user, history, fines });
}));

// PUT /api/users/:id (admin)
router.put('/:id', requireAdmin, asyncH((req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new BadRequestError('Invalid user id.');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) throw new NotFoundError('User not found.');

  const body = req.body || {};

  // Deactivate guard: an admin cannot lock themselves out
  if (body.is_active !== undefined && user.role === 'admin' && Number(body.is_active) === 0) {
    throw new BadRequestError('Admin accounts cannot be deactivated.');
  }

  const fullName = body.full_name !== undefined ? cleanString(body.full_name) : user.full_name;
  const email = body.email !== undefined ? cleanString(body.email).toLowerCase() : user.email;
  const studentId = body.student_id !== undefined ? (cleanString(body.student_id) || null) : user.student_id;
  const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : user.is_active;

  if (!fullName) throw new BadRequestError('Full name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new BadRequestError('Please enter a valid email.');

  try {
    db.prepare(`
      UPDATE users SET full_name=?, email=?, student_id=?, is_active=?, updated_at=datetime('now')
      WHERE id=?
    `).run(fullName, email, studentId, isActive, id);
  } catch (err) {
    const { mapSqliteError } = require('../library');
    const mapped = mapSqliteError(err);
    if (mapped) throw mapped;
    throw err;
  }

  // Notify the student when their account is deactivated/reactivated
  if (body.is_active !== undefined && isActive !== user.is_active) {
    db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(
      id,
      isActive ? 'Account reactivated' : 'Account deactivated',
      isActive
        ? 'Your library account has been reactivated. You can borrow books again.'
        : 'Your library account has been deactivated. Please contact the library desk.',
      isActive ? 'success' : 'warning'
    );
  }

  const updated = db.prepare('SELECT id, full_name, email, role, student_id, is_active, created_at FROM users WHERE id = ?').get(id);
  res.json({ user: updated });
}));

// PUT /api/users/me/profile (auth) — students update their own display name
router.put('/me/profile', requireAuth, asyncH((req, res) => {
  const fullName = cleanString((req.body || {}).full_name);
  if (fullName.length < 3) throw new BadRequestError('Please enter your full name.');
  db.prepare("UPDATE users SET full_name=?, updated_at=datetime('now') WHERE id=?").run(fullName, req.user.id);
  const user = db.prepare('SELECT id, full_name, email, role, student_id, is_active, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  res.json({ user });
}));

module.exports = router;
