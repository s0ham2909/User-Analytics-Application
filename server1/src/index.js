require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const { connect } = require('./db');
const eventsRouter = require('./routes/events');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 4000;
const ROOT = path.join(__dirname, '..', '..'); // project root (server/src/../..)

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '16kb' }));

// Ensure database connection for incoming requests (vital for Vercel serverless)
app.use(async (req, res, next) => {
  // Only connect for /api routes
  if (req.path.startsWith('/api')) {
    try {
      await connect();
    } catch (err) {
      console.error('[db] connection failure:', err.message);
      return res.status(500).json({ error: 'Database connection failed. Ensure MONGODB_URI is set.' });
    }
  }
  next();
});

// API
app.use('/api/events', eventsRouter);
app.use('/api', analyticsRouter);
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Tracker + demo site (same origin, http://localhost:4000)
app.use(express.static(path.join(ROOT, 'tracker')));
app.use(express.static(path.join(ROOT, 'demo')));

// Built dashboard (if `dashboard/dist` exists) at /dashboard
const dist = path.join(ROOT, 'dashboard', 'dist');
if (fs.existsSync(dist)) {
  app.use('/dashboard', express.static(dist));
  app.use('/dashboard', (req, res) => res.sendFile(path.join(dist, 'index.html'))); // SPA fallback
  console.log('[server] serving built dashboard at /dashboard');
}

// Unknown API route -> JSON 404
app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

// Error handler (bad JSON bodies, etc.)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'invalid JSON body' });
  }
  console.error('[server]', err);
  res.status(500).json({ error: 'server error' });
});

// Start server if executed directly (e.g. `npm start` or `node src/index.js`)
if (require.main === module) {
  connect()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[server] listening on http://localhost:${PORT}`);
        console.log(`[server] demo site:      http://localhost:${PORT}/`);
        console.log(`[server] dashboard:      http://localhost:${PORT}/dashboard (after build)`);
      });
    })
    .catch((err) => {
      console.error('[server] failed to start:', err.message);
      process.exit(1);
    });

  process.on('SIGINT', async () => {
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  });
}

// Export for Vercel serverless functions
module.exports = app;
