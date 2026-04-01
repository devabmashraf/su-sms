// api/auth.js — Login / logout / password-change routes
const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../config/db');
const { authenticate } = require('./authMiddleware');

// ── POST /api/auth/login ──────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });

    const { rows } = await pool.query(
      `SELECT u.*,
              s.student_code, s.dept_id AS student_dept, s.semester,
              t.teacher_code, t.dept_id AS teacher_dept, t.designation
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN teachers t ON t.user_id = u.id
       WHERE u.username = $1`,
      [username.trim()]
    );

    if (!rows.length)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];

    if (user.status === 'suspended')
      return res.status(403).json({ error: 'Account suspended. Contact admin.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' });

    // Update last_login
    await pool.query('UPDATE users SET last_login = now() WHERE id = $1', [user.id]);

    const payload = {
      id:       user.id,
      username: user.username,
      role:     user.role,
      name:     user.full_name,
      email:    user.email,
      // role-specific extras
      studentCode:  user.student_code  || null,
      teacherCode:  user.teacher_code  || null,
      deptId:       user.student_dept  || user.teacher_dept || null,
      semester:     user.semester      || null,
      designation:  user.designation   || null,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: payload });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

// ── POST /api/auth/change-password ───────────────────────
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Both fields required' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const { rows } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1', [req.user.id]
    );
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
