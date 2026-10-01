/**
 * Dashboard & reports API (admin).
 * GET /api/dashboard/stats   — headline counters, recent transactions, popular books, monthly chart data
 * GET /api/dashboard/reports — most borrowed, most active students, monthly borrowing, overdue, fines summary
 */
const express = require('express');
const { db } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', requireAdmin, asyncH((req, res) => {
  const totalBooks = db.prepare('SELECT COALESCE(SUM(total_copies),0) n FROM books').get().n;
  const availableBooks = db.prepare('SELECT COALESCE(SUM(available_copies),0) n FROM books').get().n;
  const borrowedBooks = db.prepare("SELECT COUNT(*) n FROM borrow_records WHERE status='BORROWED'").get().n;
  const overdueBooks = db.prepare("SELECT COUNT(*) n FROM borrow_records WHERE status='BORROWED' AND due_date < date('now')").get().n;
  const totalStudents = db.prepare("SELECT COUNT(*) n FROM users WHERE role='student'").get().n;
  const activeStudents = db.prepare("SELECT COUNT(*) n FROM users WHERE role='student' AND is_active=1").get().n;
  const unpaidFines = db.prepare("SELECT COALESCE(SUM(amount),0) n FROM fines WHERE status='UNPAID'").get().n;
  const collectedFines = db.prepare("SELECT COALESCE(SUM(amount),0) n FROM fines WHERE status='PAID'").get().n;

  const recent = db.prepare(`
    SELECT br.id, br.book_id, br.user_id, br.borrowed_at, br.due_date, br.returned_at, br.status,
      b.title, u.full_name AS borrower_name,
      CASE WHEN br.status='BORROWED' AND br.due_date < date('now') THEN 1 ELSE 0 END AS is_overdue
    FROM borrow_records br JOIN books b ON b.id = br.book_id JOIN users u ON u.id = br.user_id
    ORDER BY br.id DESC LIMIT 8
  `).all();

  const popular = db.prepare(`
    SELECT b.id, b.title, b.author, b.cover_url,
      COUNT(br.id) AS borrow_count,
      (SELECT COUNT(*) FROM borrow_records x WHERE x.book_id = b.id AND x.status='BORROWED') AS currently_out
    FROM books b LEFT JOIN borrow_records br ON br.book_id = b.id
    GROUP BY b.id ORDER BY borrow_count DESC, b.title LIMIT 6
  `).all();

  // Borrowings per month for the last 6 months (label + counts)
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', borrowed_at) AS ym,
           COUNT(*) AS borrow_count,
           SUM(CASE WHEN returned_at IS NOT NULL THEN 1 ELSE 0 END) AS return_count
    FROM borrow_records
    WHERE borrowed_at >= date('now', '-5 months', 'start of month')
    GROUP BY ym ORDER BY ym
  `).all();

  const monthLabels = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const byMonth = Object.fromEntries(monthLabels.map((m) => [m, { borrow_count: 0, return_count: 0 }]));
  for (const row of monthly) {
    if (byMonth[row.ym]) byMonth[row.ym] = { borrow_count: row.borrow_count, return_count: row.return_count };
  }
  const chart = monthLabels.map((m) => ({
    month: new Date(`${m}-01T00:00:00Z`).toLocaleString('en-US', { month: 'short', year: '2-digit' }),
    ...byMonth[m],
  }));

  const categories = db.prepare(`
    SELECT COALESCE(c.name, 'Uncategorized') AS name, COUNT(b.id) AS book_count,
      COALESCE(SUM(b.available_copies),0) AS available
    FROM books b LEFT JOIN categories c ON c.id = b.category_id
    GROUP BY c.id ORDER BY book_count DESC
  `).all();

  res.json({
    stats: {
      totalBooks, availableBooks, borrowedBooks, overdueBooks,
      totalStudents, activeStudents, unpaidFines, collectedFines,
      totalTitles: db.prepare('SELECT COUNT(*) n FROM books').get().n,
    },
    recent, popular, chart, categories,
  });
}));

// GET /api/dashboard/reports
router.get('/reports', requireAdmin, asyncH((req, res) => {
  const mostBorrowed = db.prepare(`
    SELECT b.id, b.title, b.author, COUNT(br.id) AS borrow_count
    FROM books b LEFT JOIN borrow_records br ON br.book_id = b.id
    GROUP BY b.id ORDER BY borrow_count DESC, b.title LIMIT 10
  `).all();

  const mostActive = db.prepare(`
    SELECT u.id, u.full_name, u.student_id,
      COUNT(br.id) AS borrow_count,
      SUM(CASE WHEN br.status='BORROWED' THEN 1 ELSE 0 END) AS currently_borrowed
    FROM users u LEFT JOIN borrow_records br ON br.user_id = u.id
    WHERE u.role='student'
    GROUP BY u.id ORDER BY borrow_count DESC, u.full_name LIMIT 10
  `).all();

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', borrowed_at) AS ym, COUNT(*) AS borrow_count,
      SUM(CASE WHEN returned_at IS NOT NULL THEN 1 ELSE 0 END) AS return_count
    FROM borrow_records GROUP BY ym ORDER BY ym
  `).all();

  const overdue = db.prepare(`
    SELECT br.id, br.book_id, br.user_id, b.title, u.full_name AS borrower_name, u.student_id,
      br.due_date, CAST(julianday('now') - julianday(br.due_date) AS INTEGER) AS days_overdue
    FROM borrow_records br JOIN books b ON b.id = br.book_id JOIN users u ON u.id = br.user_id
    WHERE br.status='BORROWED' AND br.due_date < date('now')
    ORDER BY days_overdue DESC
  `).all();

  const returned = db.prepare(`
    SELECT COUNT(*) n FROM borrow_records WHERE status='RETURNED'
  `).get().n;
  const totalBorrows = db.prepare('SELECT COUNT(*) n FROM borrow_records').get().n;
  const availableBooks = db.prepare('SELECT COALESCE(SUM(available_copies),0) n FROM books').get().n;
  const totalBooks = db.prepare('SELECT COALESCE(SUM(total_copies),0) n FROM books').get().n;

  const fines = db.prepare(`
    SELECT COUNT(*) AS count, COALESCE(SUM(CASE WHEN status='UNPAID' THEN amount ELSE 0 END),0) AS unpaid,
      COALESCE(SUM(CASE WHEN status='PAID' THEN amount ELSE 0 END),0) AS paid
    FROM fines
  `).get();

  res.json({
    mostBorrowed, mostActive, monthly, overdue,
    summary: { returned, totalBorrows, availableBooks, totalBooks, fines },
  });
}));

module.exports = router;
