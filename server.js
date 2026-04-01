// server.js — Main Express server for Sonargaon University SMS
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const rateLimit  = require('express-rate-limit');

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting — protect login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

// ── Serve static frontend ────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',         loginLimiter, require('./api/auth'));
app.use('/api/students',     require('./api/students'));
app.use('/api/applications', require('./api/applications'));
app.use('/api/grades',       require('./api/grades'));
app.use('/api/attendance',   require('./api/attendance'));
app.use('/api/fees',         require('./api/fees'));
app.use('/api/courses',      require('./api/courses'));
app.use('/api/stats',        require('./api/stats'));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── SPA fallback — send index.html for unknown routes ────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅  SU-SMS server running on http://localhost:${PORT}`);
});

module.exports = app; // needed for Vercel serverless
