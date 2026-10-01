/**
 * Smart Library Management System — API server entry point.
 */
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config');
const { initDb, db } = require('./db');
const { attachUser } = require('./middleware/auth');
const { errorHandler, asyncH } = require('./middleware/error');
const { NotFoundError } = require('./errors');

// Ensure schema exists (and seed on very first run)
initDb();
const hasData = db.prepare('SELECT COUNT(*) n FROM books').get().n > 0;
if (config.seedOnStart && !hasData) {
  console.log('Empty database detected — seeding sample data...');
  require('./seed').seed();
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(cors({
  origin: config.clientOrigin.split(','),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(attachUser);

// Tiny request log in development
if (config.env === 'development') {
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) console.log(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// Simple health endpoint (also used by the client to detect the API)
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'smart-library-api' }));

// Routes ---------------------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/borrow', require('./routes/borrow'));
app.use('/api/users', require('./routes/users'));
app.use('/api/fines', require('./routes/fines'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));

// Serve the built React client in production ---------------------------------
const path = require('path');
const fs = require('fs');
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 for unknown API routes --------------------------------------------------
app.use('/api', (req, _res, next) => next(new NotFoundError(`API route not found: ${req.method} ${req.originalUrl}`)));

// Error handling ---------------------------------------------------------------
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Smart Library API listening on http://localhost:${config.port}`);
  console.log(`Allowed client origin: ${config.clientOrigin}`);
});
