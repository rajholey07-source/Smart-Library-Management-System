/**
 * Fines API (admin + own fines for students).
 * GET  /api/fines                 (admin: all; student: own)
 * PUT  /api/fines/:id/pay         (admin) — mark a fine as paid
 * PUT  /api/fines/:id/unpay       (admin) — revert a paid fine (correction)
 * PUT  /api/fines/pay-all/:userId (admin) — settle all unpaid fines of a student
 */
const express = require('express');
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');
const { BadRequestError, NotFoundError } = require('../errors');
const { notify } = require('../library');

const router = express.Router();

const FINE_SELECT = `
  SELECT f.*, b.title AS book_title, b.author, u.full_name AS borrower_name, u.student_id, u.email AS borrower_email
  FROM fines f
  JOIN borrow_records br ON br.id = f.borrow_record_id
  JOIN books b ON b.id = br.book_id
  JOIN users u ON u.id = f.user_id
`;

// GET /api/fines?status=&q=&page=&limit=
router.get('/', requireAuth, asyncH((req, res) => {
  const q = req.query || {};
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 10));
  const offset = (page - 1) * limit;

  const clauses = [];
  const params = [];
  if (req.user.role !== 'admin') {
    clauses.push('f.user_id = ?');
    params.push(req.user.id);
  } else if (q.user_id) {
    clauses.push('f.user_id = ?');
    params.push(Number(q.user_id));
  }
  if (q.status === 'unpaid') clauses.push("f.status = 'UNPAID'");
  if (q.status === 'paid') clauses.push("f.status = 'PAID'");
  if (q.q) {
    clauses.push('(u.full_name LIKE ? OR u.student_id LIKE ? OR b.title LIKE ?)');
    params.push(`%${q.q}%`, `%${q.q}%`, `%${q.q}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) n FROM fines f
    JOIN users u ON u.id = f.user_id JOIN borrow_records br ON br.id = f.borrow_record_id
    JOIN books b ON b.id = br.book_id ${where}`).get(...params).n;

  const fines = db.prepare(`${FINE_SELECT} ${where} ORDER BY f.created_at DESC, f.id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  const summary = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN status='UNPAID' THEN amount ELSE 0 END),0) AS unpaid_total,
           COALESCE(SUM(CASE WHEN status='PAID' THEN amount ELSE 0 END),0) AS paid_total,
           SUM(CASE WHEN status='UNPAID' THEN 1 ELSE 0 END) AS unpaid_count
    FROM fines
  `).get();

  res.json({ fines, total, page, pages: Math.max(1, Math.ceil(total / limit)), summary });
}));

// PUT /api/fines/:id/pay
router.put('/:id/pay', requireAdmin, asyncH((req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new BadRequestError('Invalid fine id.');
  const fine = db.prepare('SELECT * FROM fines WHERE id = ?').get(id);
  if (!fine) throw new NotFoundError('Fine not found.');
  if (fine.status === 'PAID') throw new BadRequestError('This fine is already paid.');

  db.prepare("UPDATE fines SET status='PAID', paid_at=datetime('now') WHERE id=?").run(id);
  notify(fine.user_id, 'Fine settled', 'Your library fine has been marked as paid. Thank you!', 'success');
  const updated = db.prepare(`${FINE_SELECT} WHERE f.id = ?`).get(id);
  res.json({ fine: updated });
}));

// PUT /api/fines/:id/unpay (admin correction)
router.put('/:id/unpay', requireAdmin, asyncH((req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new BadRequestError('Invalid fine id.');
  const fine = db.prepare('SELECT * FROM fines WHERE id = ?').get(id);
  if (!fine) throw new NotFoundError('Fine not found.');

  db.prepare("UPDATE fines SET status='UNPAID', paid_at=NULL WHERE id=?").run(id);
  const updated = db.prepare(`${FINE_SELECT} WHERE f.id = ?`).get(id);
  res.json({ fine: updated });
}));

// PUT /api/fines/pay-all/:userId (admin)
router.put('/pay-all/:userId', requireAdmin, asyncH((req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) throw new BadRequestError('Invalid user id.');
  const info = db.prepare("UPDATE fines SET status='PAID', paid_at=datetime('now') WHERE user_id=? AND status='UNPAID'")
    .run(userId);
  if (info.changes > 0) {
    notify(userId, 'Fines settled', `${info.changes} fine(s) on your account were marked as paid.`, 'success');
  }
  res.json({ paid: info.changes });
}));

module.exports = router;
