/**
 * Core library business logic: borrowing, returning, fines, recommendations.
 * All multi-step operations run inside SQLite transactions so data can never
 * end up inconsistent (e.g. a borrow record without decrementing availability).
 */
const { db } = require('./db');
const { BadRequestError, ConflictError, NotFoundError } = require('./errors');
const { isoDay, daysOverdue } = require('./utils');

const getSetting = (key, fallback) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : fallback;
};

function notify(userId, title, message, type = 'info') {
  db.prepare(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)'
  ).run(userId, title, message, type);
}

/**
 * Borrow a book for a user (used by both student self-borrow and admin issue).
 * Guards: active user, book exists, copies available, per-user active limit.
 */
const borrowBook = (bookId, userId, issuedById) => db.transaction(() => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new NotFoundError('User not found.');
  if (!user.is_active) throw new ConflictError('This account is deactivated and cannot borrow books.');

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
  if (!book) throw new NotFoundError('Book not found.');

  const already = db.prepare(
    "SELECT id FROM borrow_records WHERE book_id = ? AND user_id = ? AND status = 'BORROWED'"
  ).get(bookId, userId);
  if (already) throw new ConflictError(`This reader already has "${book.title}" borrowed.`);

  const maxBooks = getSetting('maxBooksPerStudent', 5);
  const activeCount = db.prepare(
    "SELECT COUNT(*) c FROM borrow_records WHERE user_id = ? AND status = 'BORROWED'"
  ).get(userId).c;
  if (activeCount >= maxBooks) {
    throw new ConflictError(`Borrowing limit reached (${maxBooks} books). Return a book first.`);
  }

  // Re-check availability inside the transaction (prevents race conditions)
  const fresh = db.prepare('SELECT available_copies, title FROM books WHERE id = ?').get(bookId);
  if (!fresh || fresh.available_copies <= 0) {
    throw new ConflictError('No copies of this book are available right now.');
  }

  const borrowDays = getSetting('borrowDays', 14);
  const today = isoDay(0);
  const due = isoDay(borrowDays);
  const info = db.prepare(`
    INSERT INTO borrow_records (book_id, user_id, borrowed_at, due_date, status, issued_by)
    VALUES (?, ?, ?, ?, 'BORROWED', ?)
  `).run(bookId, userId, today, due, issuedById ?? userId);

  db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(bookId);

  notify(
    userId,
    'Book borrowed successfully',
    `You borrowed "${book.title}". Please return it by ${due}.`,
    'success'
  );

  return {
    id: info.lastInsertRowid,
    book_id: bookId,
    user_id: userId,
    borrowed_at: today,
    due_date: due,
    status: 'BORROWED',
  };
})();

/**
 * Return a borrowed book. If overdue, automatically creates an unpaid fine
 * (days overdue x fine-per-day). Idempotency guard: cannot return twice.
 */
const returnBook = (borrowRecordId, actor) => db.transaction(() => {
  const rec = db.prepare(`
    SELECT br.*, b.title, b.id AS book_id
    FROM borrow_records br JOIN books b ON b.id = br.book_id
    WHERE br.id = ?
  `).get(borrowRecordId);
  if (!rec) throw new NotFoundError('Borrow record not found.');

  const isOwner = actor.role !== 'admin' && rec.user_id === actor.id;
  if (actor.role !== 'admin' && !isOwner) {
    throw new NotFoundError('Borrow record not found.');
  }
  if (rec.status === 'RETURNED') {
    throw new ConflictError('This book has already been returned.');
  }

  const today = isoDay(0);
  const overdue = Math.max(0, daysOverdue(rec.due_date, new Date()));

  db.prepare(`
    UPDATE borrow_records SET status = 'RETURNED', returned_at = ? WHERE id = ?
  `).run(today, borrowRecordId);

  db.prepare('UPDATE books SET available_copies = MIN(total_copies, available_copies + 1) WHERE id = ?')
    .run(rec.book_id);

  let fine = null;
  if (overdue > 0) {
    const amount = overdue * getSetting('finePerDay', 5);
    const existing = db.prepare('SELECT id FROM fines WHERE borrow_record_id = ?').get(borrowRecordId);
    if (existing) {
      db.prepare('UPDATE fines SET amount = ?, days_overdue = ?, status = ? WHERE id = ?')
        .run(amount, overdue, 'UNPAID', existing.id);
      fine = { id: existing.id, amount, days_overdue: overdue, status: 'UNPAID' };
    } else {
      const finfo = db.prepare(`
        INSERT INTO fines (borrow_record_id, user_id, amount, days_overdue, status)
        VALUES (?, ?, ?, ?, 'UNPAID')
      `).run(borrowRecordId, rec.user_id, amount, overdue);
      fine = { id: finfo.lastInsertRowid, amount, days_overdue: overdue, status: 'UNPAID' };
    }
    notify(
      rec.user_id,
      'Fine generated',
      `"${rec.title}" was returned ${overdue} day(s) late. A fine of ${amount} has been added to your account.`,
      'warning'
    );
  } else {
    notify(rec.user_id, 'Return successful', `"${rec.title}" was returned on time. Thank you!`, 'success');
  }

  return { record_id: borrowRecordId, returned_on: today, days_overdue: overdue, fine };
})();

/** Rule-based recommendations for a user. */
function recommendForUser(userId, limit = 8) {
  const topCategories = db.prepare(`
    SELECT b.category_id, COUNT(*) AS n
    FROM borrow_records br JOIN books b ON b.id = br.book_id
    WHERE br.user_id = ? AND b.category_id IS NOT NULL
    GROUP BY b.category_id ORDER BY n DESC LIMIT 2
  `).all(userId);

  const out = [];
  const seen = new Set();

  // 1) Books from the user's favourite categories that they haven't borrowed
  for (const { category_id } of topCategories) {
    const rows = db.prepare(`
      SELECT b.*, c.name AS category_name,
        (SELECT COUNT(*) FROM borrow_records br2 WHERE br2.book_id = b.id) AS borrow_count
      FROM books b LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.category_id = ? AND b.id NOT IN (SELECT book_id FROM borrow_records WHERE user_id = ?)
      ORDER BY borrow_count DESC, b.title LIMIT ?
    `).all(category_id, userId, limit);
    for (const r of rows) {
      if (!seen.has(r.id) && out.length < limit) { seen.add(r.id); out.push(r); }
    }
  }

  // 2) Fall back / fill with globally popular books the user hasn't borrowed
  if (out.length < limit) {
    const rows = db.prepare(`
      SELECT b.*, c.name AS category_name,
        (SELECT COUNT(*) FROM borrow_records br2 WHERE br2.book_id = b.id) AS borrow_count
      FROM books b LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.id NOT IN (SELECT book_id FROM borrow_records WHERE user_id = ?)
      ORDER BY borrow_count DESC, b.title LIMIT ?
    `).all(userId, limit);
    for (const r of rows) {
      if (!seen.has(r.id) && out.length < limit) { seen.add(r.id); out.push(r); }
    }
  }
  return out;
}

/** Wrap a better-sqlite3 constraint failure into a friendly ApiError. */
function mapSqliteError(err) {
  const msg = String(err && err.message);
  if (/UNIQUE constraint failed: books\.isbn/i.test(msg)) {
    return new ConflictError('A book with this ISBN already exists.');
  }
  if (/UNIQUE constraint failed: users\.email/i.test(msg)) {
    return new ConflictError('An account with this email already exists.');
  }
  if (/UNIQUE constraint failed: users\.student_id/i.test(msg)) {
    return new ConflictError('This student ID is already registered.');
  }
  if (/FOREIGN KEY constraint failed/i.test(msg)) {
    return new BadRequestError('This operation references a record that does not exist.');
  }
  if (/CHECK constraint failed/i.test(msg)) {
    return new BadRequestError('Invalid values: copies must be positive and availability cannot exceed total copies.');
  }
  return null;
}

module.exports = { getSetting, notify, borrowBook, returnBook, recommendForUser, mapSqliteError, db };
