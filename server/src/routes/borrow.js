/**
 * Borrowing API.
 * POST  /api/borrow            — student borrows a book (or admin issues on behalf)
 * GET   /api/borrow            — role-aware listing (own records vs all records)
 * PUT   /api/borrow/:id/return — return a book (owner or admin); auto-fine on overdue
 * POST  /api/borrow/overdue-check — admin: recompute overdue statuses (cron-style endpoint)
 */
const express = require('express');
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');
const { BadRequestError } = require('../errors');
const { borrowBook, returnBook, getSetting } = require('../library');
const { daysOverdue } = require('../utils');

const router = express.Router();

const RECORD_SELECT = `
  SELECT br.*,
    b.title, b.author, b.isbn, b.cover_url,
    c.name AS category_name,
    u.full_name AS borrower_name, u.email AS borrower_email, u.student_id,
    CASE WHEN br.status = 'BORROWED' AND br.due_date < date('now') THEN 1 ELSE 0 END AS is_overdue,
    CASE WHEN br.status = 'BORROWED'
         THEN MAX(0, CAST(julianday('now') - julianday(br.due_date) AS INTEGER))
         ELSE 0 END AS overdue_days
  FROM borrow_records br
  JOIN books b ON b.id = br.book_id
  LEFT JOIN categories c ON c.id = b.category_id
  JOIN users u ON u.id = br.user_id
`;

// POST /api/borrow  { book_id, user_id? }
router.post('/', requireAuth, asyncH((req, res) => {
  const body = req.body || {};
  const bookId = Number(body.book_id);
  if (!Number.isInteger(bookId)) throw new BadRequestError('Please provide a valid book.');

  let userId = req.user.id;
  let issuedBy = null;
  if (req.user.role === 'admin' && body.user_id) {
    userId = Number(body.user_id);
    issuedBy = req.user.id;
    if (!Number.isInteger(userId)) throw new BadRequestError('Invalid reader selected.');
  }

  const record = borrowBook(bookId, userId, issuedBy);
  const full = db.prepare(`${RECORD_SELECT} WHERE br.id = ?`).get(record.id);
  res.status(201).json({ record: full });
}));

// GET /api/borrow?status=&page=&limit=&q=&user_id=
router.get('/', requireAuth, asyncH((req, res) => {
  const q = req.query || {};
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 10));
  const offset = (page - 1) * limit;

  const clauses = [];
  const params = [];

  if (req.user.role !== 'admin') {
    clauses.push('br.user_id = ?');
    params.push(req.user.id);
  } else if (q.user_id) {
    clauses.push('br.user_id = ?');
    params.push(Number(q.user_id));
  }
  if (q.status === 'borrowed') clauses.push("br.status = 'BORROWED'");
  if (q.status === 'returned') clauses.push("br.status = 'RETURNED'");
  if (q.status === 'overdue') { clauses.push("br.status = 'BORROWED' AND br.due_date < date('now')"); }
  if (q.q) {
    clauses.push('(b.title LIKE ? OR u.full_name LIKE ? OR u.student_id LIKE ?)');
    params.push(`%${q.q}%`, `%${q.q}%`, `%${q.q}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) n FROM borrow_records br
    JOIN books b ON b.id = br.book_id JOIN users u ON u.id = br.user_id ${where}`).get(...params).n;

  const records = db.prepare(`${RECORD_SELECT} ${where}
    ORDER BY br.borrowed_at DESC, br.id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json({ records, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

// PUT /api/borrow/:id/return
router.put('/:id/return', requireAuth, asyncH((req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new BadRequestError('Invalid borrow record.');
  const result = returnBook(id, req.user);
  const full = db.prepare(`${RECORD_SELECT} WHERE br.id = ?`).get(id);
  res.json({ ...result, record: full });
}));

// POST /api/borrow/overdue-check (admin) — materializes fines for currently overdue loans
router.post('/overdue-check', requireAdmin, asyncH((req, res) => {
  const rows = db.prepare(`
    SELECT br.id, br.user_id, br.due_date, b.title
    FROM borrow_records br JOIN books b ON b.id = br.book_id
    WHERE br.status = 'BORROWED' AND br.due_date < date('now')
  `).all();

  const finePerDay = getSetting('finePerDay', 5);
  let created = 0;
  const insert = db.prepare(`
    INSERT INTO fines (borrow_record_id, user_id, amount, days_overdue, status)
    SELECT ?, ?, ?, ?, 'UNPAID'
    WHERE NOT EXISTS (SELECT 1 FROM fines WHERE borrow_record_id = ?)
  `);
  for (const r of rows) {
    const days = daysOverdue(r.due_date);
    if (days > 0) {
      const info = insert.run(r.id, r.user_id, days * finePerDay, days, r.id);
      if (info.changes > 0) {
        created += 1;
        require('../library').notify(
          r.user_id, 'Overdue notice',
          `Your copy of "${r.title}" is ${days} day(s) overdue. A fine of ${days * finePerDay} is accruing.`,
          'danger'
        );
      }
    }
  }
  res.json({ checked: rows.length, created });
}));

module.exports = router;
