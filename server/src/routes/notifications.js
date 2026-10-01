/**
 * In-app notifications API.
 * GET  /api/notifications?unread=1  — list (newest first) with unread count
 * PUT  /api/notifications/:id/read
 * PUT  /api/notifications/read-all
 */
const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { asyncH } = require('../middleware/error');
const { BadRequestError, NotFoundError } = require('../errors');

const router = express.Router();

router.get('/', requireAuth, asyncH((req, res) => {
  const onlyUnread = req.query.unread === '1';
  const limit = Math.min(50, Math.max(1, Number((req.query || {}).limit) || 20));
  const rows = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ${onlyUnread ? 'AND is_read = 0' : ''}
    ORDER BY created_at DESC, id DESC LIMIT ?
  `).all(req.user.id, limit);
  const unread = db.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.user.id).n;
  res.json({ notifications: rows, unread });
}));

router.put('/read-all', requireAuth, asyncH((req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
}));

router.put('/:id/read', requireAuth, asyncH((req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new BadRequestError('Invalid notification.');
  const row = db.prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) throw new NotFoundError('Notification not found.');
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  res.json({ ok: true });
}));

module.exports = router;
