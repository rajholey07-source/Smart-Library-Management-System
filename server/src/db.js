/**
 * Database bootstrap for the Smart Library Management System.
 * Creates the relational schema (users, categories, books, borrow_records, fines,
 * notifications, settings) with primary keys, foreign keys, constraints and timestamps.
 *
 * The schema is written in portable SQL so it can be mirrored on PostgreSQL/Supabase
 * with only minor dialect changes (see README for the Postgres notes).
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name      TEXT    NOT NULL,
  email          TEXT    NOT NULL UNIQUE,
  password_hash  TEXT    NOT NULL,
  role           TEXT    NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  student_id     TEXT    UNIQUE,
  is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS books (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT    NOT NULL,
  author          TEXT    NOT NULL,
  isbn            TEXT    NOT NULL UNIQUE,
  category_id     INTEGER REFERENCES categories(id),
  publisher       TEXT,
  publication_year INTEGER CHECK (publication_year IS NULL OR (publication_year >= 1500 AND publication_year <= 2100)),
  description     TEXT,
  total_copies    INTEGER NOT NULL DEFAULT 1 CHECK (total_copies > 0),
  available_copies INTEGER NOT NULL DEFAULT 1 CHECK (available_copies >= 0 AND available_copies <= total_copies),
  cover_url       TEXT,
  is_featured     INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS borrow_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id     INTEGER NOT NULL REFERENCES books(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  borrowed_at TEXT    NOT NULL DEFAULT (datetime('now')),
  due_date    TEXT    NOT NULL,
  returned_at TEXT,
  status      TEXT    NOT NULL DEFAULT 'BORROWED' CHECK (status IN ('BORROWED','RETURNED')),
  issued_by   INTEGER REFERENCES users(id),
  CHECK ( (status = 'RETURNED' AND returned_at IS NOT NULL) OR (status = 'BORROWED' AND returned_at IS NULL) )
);

CREATE INDEX IF NOT EXISTS idx_borrow_user_status ON borrow_records(user_id, status);
CREATE INDEX IF NOT EXISTS idx_borrow_book_status ON borrow_records(book_id, status);
CREATE INDEX IF NOT EXISTS idx_borrow_due ON borrow_records(status, due_date);

CREATE TABLE IF NOT EXISTS fines (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  borrow_record_id INTEGER NOT NULL UNIQUE REFERENCES borrow_records(id),
  user_id         INTEGER NOT NULL REFERENCES users(id),
  amount          REAL    NOT NULL CHECK (amount >= 0),
  days_overdue    INTEGER NOT NULL DEFAULT 0 CHECK (days_overdue >= 0),
  status          TEXT    NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID','PAID')),
  paid_at         TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  title      TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  type       TEXT    NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','danger')),
  is_read    INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('finePerDay',        '${config.finePerDay}'),
  ('borrowDays',        '${config.borrowDays}'),
  ('maxBooksPerStudent','${config.maxBooksPerStudent}'),
  ('libraryName',       'Smart Library Management System');
`;

function initDb() {
  db.exec(SCHEMA);
  return db;
}

if (require.main === module) {
  initDb();
  console.log(`Database schema created at ${config.dbFile}`);
}

module.exports = { db, initDb };
