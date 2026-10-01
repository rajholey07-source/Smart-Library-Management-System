/**
 * Central configuration for the Smart Library Management System backend.
 * All values can be overridden through environment variables (see .env.example).
 */
const fs = require('fs');
const path = require('path');

/** Minimal .env loader (no external dependency): sets process.env from ../.env if present. */
(function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m || process.env[m[1]] !== undefined) continue;
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  } catch {
    /* ignore malformed .env */
  }
})();

const config = {
  env: process.env.NODE_ENV || 'development',
  // Guard against a PORT env var that is empty or non-numeric on some machines
  port: (() => { const p = Number(process.env.PORT); return Number.isInteger(p) && p > 0 && p < 65536 ? p : 4000; })(),
  // SQLite database file (relational, with foreign keys and constraints)
  dbFile: process.env.DB_FILE || path.join(__dirname, '..', 'data', 'library.db'),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  jwtRememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN || '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Library business rules
  borrowDays: Number(process.env.BORROW_DAYS || 14),
  maxBooksPerStudent: Number(process.env.MAX_BOOKS_PER_STUDENT || 5),
  finePerDay: Number(process.env.FINE_PER_DAY || 5), // currency units per overdue day
  seedOnStart: process.env.SEED_ON_START !== 'false', // auto-create sample data if DB is empty
};

module.exports = config;
