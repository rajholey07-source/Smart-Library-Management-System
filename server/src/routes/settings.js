/**
 * Settings API (admin) — configurable library rules used by the business logic.
 * GET /api/settings (admin)
 * PUT /api/settings (admin)
 */
const express = require('express');
const { db } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');
const { intInRange, cleanString } = require('../validate');

const router = express.Router();

const INT_KEYS = {
  finePerDay: [1, 500, 'Fine per day'],
  borrowDays: [1, 90, 'Borrow period (days)'],
  maxBooksPerStudent: [1, 20, 'Max books per student'],
};

router.get('/', requireAdmin, asyncH((req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  res.json({ settings: out });
}));

router.put('/', requireAdmin, asyncH((req, res) => {
  const body = req.body || {};
  const updates = [];

  for (const [key, [min, max]] of Object.entries(INT_KEYS)) {
    if (body[key] !== undefined) {
      const n = intInRange(body[key], min, max, INT_KEYS[key][2]);
      updates.push([key, String(n)]);
    }
  }
  if (body.libraryName !== undefined) {
    const name = cleanString(body.libraryName);
    if (name.length < 3) throw new (require('../errors').BadRequestError)('Library name is too short.');
    updates.push(['libraryName', name]);
  }

  if (!updates.length) throw new (require('../errors').BadRequestError)('Nothing to update.');
  const stmt = db.prepare("INSERT INTO settings (key, value, updated_at=datetime('now')) VALUES (?, ?) " +
    "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')");
  const tx = db.transaction(() => {
    for (const [k, v] of updates) stmt.run(k, v);
  });
  tx();

  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  res.json({ settings: out });
}));

module.exports = router;
