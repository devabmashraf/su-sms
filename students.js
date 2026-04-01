// api/students.js — Full CRUD for students
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool   = require('../config/db');
const { authenticate, requireRole } = require('./authMiddleware');

// ── GET /api/students  (admin, teacher) ──────────────────
router.get('/', authenticate, requireRole('admin','teacher'), async (req, res) => {
  try {
    const { dept, status, search } = req.query;
    let q = `
      SELECT s.*, d.code AS dept_code, d.name AS dept_name,
             COALESCE(
               ROUND(AVG(CASE WHEN a.status='Present' THEN 100 ELSE 0 END),0), 0
             ) AS attendance_pct
      FROM students s
      LEFT JOIN departments  d ON d.id = s.dept_id
      LEFT JOIN attendance   a ON a.student_id = s.id
      WHERE 1=1`;
    const params = [];
    if (dept)   { params.push(dept);   q += ` AND d.code = $${params.length}`; }
    if (status) { params.push(status); q += ` AND s.status = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      q += ` AND (s.full_name ILIKE $${params.length} OR s.student_code ILIKE $${params.length} OR s.email ILIKE $${params.length})`;
    }
    q += ' GROUP BY s.id, d.code, d.name ORDER BY s.student_code';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// ── GET /api/students/me  (student — own profile) ────────
router.get('/me', authenticate, requireRole('student'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, d.code AS dept_code, d.name AS dept_name
       FROM students s
       LEFT JOIN departments d ON d.id = s.dept_id
       WHERE s.user_id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Profile not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/students/:id ─────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, d.code AS dept_code, d.name AS dept_name
       FROM students s
       LEFT JOIN departments d ON d.id = s.dept_id
       WHERE s.id = $1 OR s.student_code = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/students  (admin only) ─────────────────────
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      full_name, email, phone, dept_code, semester,
      gender, blood_group, date_of_birth, address,
      nationality, gpa, password = 'student123'
    } = req.body;

    if (!full_name || !dept_code)
      return res.status(400).json({ error: 'full_name and dept_code are required' });

    // Auto-generate student code
    const { rows: cnt } = await client.query("SELECT COUNT(*) FROM students");
    const num  = String(parseInt(cnt[0].count) + 1).padStart(3, '0');
    const year = new Date().getFullYear();
    const code = `SU-${year}-${num}`;

    // Get dept ID
    const { rows: depts } = await client.query(
      'SELECT id FROM departments WHERE code = $1', [dept_code]
    );
    if (!depts.length) return res.status(400).json({ error: 'Unknown department code' });

    // Create user account
    const hash = await bcrypt.hash(password, 10);
    const { rows: users } = await client.query(
      `INSERT INTO users (username, password_hash, role, full_name, email)
       VALUES ($1,$2,'student',$3,$4) RETURNING id`,
      [code, hash, full_name, email || null]
    );

    // Create student record
    const { rows: newStudent } = await client.query(
      `INSERT INTO students
         (user_id, student_code, full_name, email, phone, dept_id, semester,
          gender, blood_group, date_of_birth, address, nationality, gpa)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [users[0].id, code, full_name, email||null, phone||null,
       depts[0].id, semester||'1st', gender||null, blood_group||null,
       date_of_birth||null, address||null, nationality||'Bangladeshi', gpa||0]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...newStudent[0], student_code: code, login_id: code });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create student' });
  } finally {
    client.release();
  }
});

// ── PUT /api/students/:id  (admin) ───────────────────────
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { full_name, email, phone, semester, gender, blood_group,
            date_of_birth, address, gpa, status, dept_code } = req.body;

    let deptId = null;
    if (dept_code) {
      const { rows } = await pool.query('SELECT id FROM departments WHERE code=$1', [dept_code]);
      if (rows.length) deptId = rows[0].id;
    }

    const { rows } = await pool.query(
      `UPDATE students SET
         full_name     = COALESCE($1, full_name),
         email         = COALESCE($2, email),
         phone         = COALESCE($3, phone),
         semester      = COALESCE($4, semester),
         gender        = COALESCE($5, gender),
         blood_group   = COALESCE($6, blood_group),
         date_of_birth = COALESCE($7, date_of_birth),
         address       = COALESCE($8, address),
         gpa           = COALESCE($9, gpa),
         status        = COALESCE($10, status),
         dept_id       = COALESCE($11, dept_id)
       WHERE id = $12 RETURNING *`,
      [full_name, email, phone, semester, gender, blood_group,
       date_of_birth, address, gpa, status, deptId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// ── DELETE /api/students/:id  (admin) ────────────────────
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM students WHERE id = $1 RETURNING student_code', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: `Student ${rows[0].student_code} deleted` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

module.exports = router;
