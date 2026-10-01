/**
 * Books API.
 * Public:  GET /api/books (search/filter/paginate), GET /api/books/:id (+related),
 *          GET /api/books/meta/filters, GET /api/books/recommendations (auth),
 *          GET /api/books/featured, GET /api/books/recent.
 * Admin:   POST /api/books, PUT /api/books/:id, DELETE /api/books/:id.
 */
const express = require('express');
const { db } = require('../db');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');
const { cleanString, requireFields, validISBN, intInRange } = require('../validate');
const { NotFoundError, BadRequestError, ConflictError } = require('../errors');
const { recommendForUser, mapSqliteError } = require('../library');

const router = express.Router();

const BOOK_SELECT = 'b.*, c.name AS category_name';
const BOOK_FROM = ' FROM books b LEFT JOIN categories c ON c.id = b.category_id ';
const BORROW_COUNT = ' (SELECT COUNT(*) FROM borrow_records br WHERE br.book_id = b.id) AS borrow_count ';

// Helper: parse shared query params
function parseQuery(q) {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(q.limit) || 12));
  return {
    page,
    limit,
    offset: (page - 1) * limit,
    q: cleanString(q.q),
    category: cleanString(q.category),
    author: cleanString(q.author),
    availability: cleanString(q.availability), // '' | 'available' | 'unavailable'
    sort: cleanString(q.sort) || 'title',
  };
}

function buildWhere({ q, category, author, availability }) {
  const clauses = [];
  const params = [];
  if (q) {
    clauses.push('(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR c.name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (category) { clauses.push('c.name = ?'); params.push(category); }
  if (author) { clauses.push('b.author = ?'); params.push(author); }
  if (availability === 'available') clauses.push('b.available_copies > 0');
  if (availability === 'unavailable') clauses.push('b.available_copies = 0');
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params };
}

const SORTS = {
  title: 'b.title COLLATE NOCASE ASC',
  author: 'b.author COLLATE NOCASE ASC',
  newest: 'b.created_at DESC, b.id DESC',
  popular: 'borrow_count DESC NULLS LAST, b.title COLLATE NOCASE ASC',
  available: 'b.available_copies DESC, b.title COLLATE NOCASE ASC',
};

// GET /api/books
router.get('/', asyncH((req, res) => {
  const p = parseQuery(req.query);
  const { where, params } = buildWhere(p);

  const orderBy = SORTS[p.sort] || SORTS.title;

  const total = db.prepare(`
    SELECT COUNT(*) AS n FROM books b LEFT JOIN categories c ON c.id = b.category_id ${where}
  `).get(...params).n;

  const rows = db.prepare(`
    SELECT ${BOOK_SELECT}, ${BORROW_COUNT} ${BOOK_FROM} ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, p.limit, p.offset);

  res.json({
    books: rows,
    total,
    page: p.page,
    pages: Math.max(1, Math.ceil(total / p.limit)),
  });
}));

// GET /api/books/meta/filters — categories + authors for filter panels
router.get('/meta/filters', asyncH((req, res) => {
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all();
  const authors = db.prepare('SELECT DISTINCT author FROM books ORDER BY author COLLATE NOCASE').all()
    .map((r) => r.author);
  res.json({ categories, authors });
}));

// GET /api/books/featured
router.get('/featured', asyncH((req, res) => {
  const rows = db.prepare(`
    SELECT ${BOOK_SELECT}, ${BORROW_COUNT} ${BOOK_FROM}
    WHERE b.is_featured = 1 AND b.available_copies > 0
    ORDER BY borrow_count DESC, b.title LIMIT 8
  `).all();
  res.json({ books: rows });
}));

// GET /api/books/recent
router.get('/recent', asyncH((req, res) => {
  const rows = db.prepare(`
    SELECT ${BOOK_SELECT} ${BOOK_FROM} ORDER BY b.created_at DESC, b.id DESC LIMIT 8
  `).all();
  res.json({ books: rows });
}));

// GET /api/books/recommendations — rule-based, for the signed-in reader
router.get('/recommendations', requireAuth, asyncH((req, res) => {
  res.json({ books: recommendForUser(req.user.id, 8) });
}));

// GET /api/books/:id — includes related books (same category, excluding self)
router.get('/:id', asyncH((req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new BadRequestError('Invalid book id.');
  const book = db.prepare(`SELECT ${BOOK_SELECT} ${BOOK_FROM} WHERE b.id = ?`).get(id);
  if (!book) throw new NotFoundError('Book not found.');

  const related = book.category_id
    ? db.prepare(`
        SELECT ${BOOK_SELECT} ${BOOK_FROM}
        WHERE b.category_id = ? AND b.id != ?
        ORDER BY b.available_copies DESC, b.title LIMIT 4
      `).all(book.category_id, id)
    : [];
  res.json({ book, related });
}));

function validateBookPayload(body, { partial = false } = {}) {
  const data = {
    title: cleanString(body.title),
    author: cleanString(body.author),
    isbn: cleanString(body.isbn),
    category_id: body.category_id ? Number(body.category_id) : null,
    publisher: cleanString(body.publisher) || null,
    publication_year: body.publication_year ? Number(body.publication_year) : null,
    description: cleanString(body.description) || null,
    total_copies: body.total_copies !== undefined ? Number(body.total_copies) : undefined,
    available_copies: body.available_copies !== undefined ? Number(body.available_copies) : undefined,
    cover_url: cleanString(body.cover_url) || null,
    is_featured: body.is_featured ? 1 : 0,
  };

  const details = [];
  if (!data.title) details.push('Title is required.');
  if (!data.author) details.push('Author is required.');
  if (!data.isbn) details.push('ISBN is required.');
  if (data.isbn && !validISBN(data.isbn)) details.push('ISBN format looks invalid.');
  if (details.length) throw new BadRequestError('Please fix the highlighted fields.', details);

  if (!partial) {
    if (data.total_copies === undefined) data.total_copies = 1;
    if (data.available_copies === undefined) data.available_copies = data.total_copies;
  }

  if (data.total_copies !== undefined) intInRange(data.total_copies, 1, 10000, 'Total copies');
  if (data.available_copies !== undefined) intInRange(data.available_copies, 0, 10000, 'Available copies');
  if (data.total_copies !== undefined && data.available_copies !== undefined
      && data.available_copies > data.total_copies) {
    throw new BadRequestError('Available copies cannot exceed total copies.');
  }
  if (data.publication_year !== null && data.publication_year !== undefined) {
    intInRange(data.publication_year, 1500, 2100, 'Publication year');
  }

  if (data.category_id !== null) {
    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(data.category_id);
    if (!cat) throw new BadRequestError('Selected category does not exist.');
  }
  return data;
}

// POST /api/books (admin)
router.post('/', requireAdmin, asyncH((req, res) => {
  const data = validateBookPayload(req.body || {});
  try {
    const info = db.prepare(`
      INSERT INTO books (title, author, isbn, category_id, publisher, publication_year,
                         description, total_copies, available_copies, cover_url, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.title, data.author, data.isbn, data.category_id, data.publisher,
      data.publication_year, data.description, data.total_copies, data.available_copies,
      data.cover_url, data.is_featured);
    const book = db.prepare(`SELECT ${BOOK_SELECT} ${BOOK_FROM} WHERE b.id = ?`).get(info.lastInsertRowid);
    res.status(201).json({ book });
  } catch (err) {
    const mapped = mapSqliteError(err);
    if (mapped) throw mapped;
    throw err;
  }
}));

// PUT /api/books/:id (admin)
router.put('/:id', requireAdmin, asyncH((req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new BadRequestError('Invalid book id.');
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!existing) throw new NotFoundError('Book not found.');

  const data = validateBookPayload({ ...existing, ...(req.body || {}) }, { partial: true });

  // If total copies is being reduced, clamp availability sensibly.
  if (data.total_copies !== undefined) {
    const activeBorrows = db.prepare(
      "SELECT COUNT(*) c FROM borrow_records WHERE book_id = ? AND status = 'BORROWED'"
    ).get(id).c;
    if (data.total_copies < activeBorrows) {
      throw new BadRequestError(
        `Cannot set total copies to ${data.total_copies}: ${activeBorrows} copy(ies) are currently borrowed.`
      );
    }
    if (data.available_copies === undefined) {
      data.available_copies = data.total_copies - activeBorrows;
    }
  }

  try {
    db.prepare(`
      UPDATE books SET title=?, author=?, isbn=?, category_id=?, publisher=?, publication_year=?,
        description=?, total_copies=?, available_copies=?, cover_url=?, is_featured=?,
        updated_at=datetime('now')
      WHERE id=?
    `).run(data.title, data.author, data.isbn, data.category_id, data.publisher,
      data.publication_year, data.description, data.total_copies, data.available_copies,
      data.cover_url, data.is_featured, id);
  } catch (err) {
    const mapped = mapSqliteError(err);
    if (mapped) throw mapped;
    throw err;
  }

  const book = db.prepare(`SELECT ${BOOK_SELECT} ${BOOK_FROM} WHERE b.id = ?`).get(id);
  res.json({ book });
}));

// DELETE /api/books/:id (admin) — blocked while copies are out with readers
router.delete('/:id', requireAdmin, asyncH((req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new BadRequestError('Invalid book id.');
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!existing) throw new NotFoundError('Book not found.');

  const active = db.prepare(
    "SELECT COUNT(*) c FROM borrow_records WHERE book_id = ? AND status = 'BORROWED'"
  ).get(id).c;
  if (active > 0) {
    throw new ConflictError(`Cannot delete: ${active} copy(ies) are currently borrowed.`);
  }

  db.prepare('DELETE FROM fines WHERE borrow_record_id IN (SELECT id FROM borrow_records WHERE book_id = ?)').run(id);
  db.prepare('DELETE FROM borrow_records WHERE book_id = ?').run(id);
  db.prepare('DELETE FROM books WHERE id = ?').run(id);
  res.json({ ok: true });
}));

module.exports = router;
