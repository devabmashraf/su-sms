// api/courses.js
const router = require('express').Router();
const pool   = require('../config/db');
const { authenticate, requireRole } = require('./authMiddleware');

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, d.code AS dept_code, d.name AS dept_name,
              t.full_name AS teacher_name,
              COUNT(e.student_id) AS enrolled
       FROM courses c
       LEFT JOIN departments d  ON d.id = c.dept_id
       LEFT JOIN teachers    t  ON t.id = c.teacher_id
       LEFT JOIN enrollments e  ON e.course_id = c.id
       GROUP BY c.id, d.code, d.name, t.full_name
       ORDER BY c.code`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { code, name, dept_code, credits, total_seats, semester, teacher_id } = req.body;
    const { rows: dept } = await pool.query('SELECT id FROM departments WHERE code=$1',[dept_code]);
    if (!dept.length) return res.status(400).json({ error: 'Unknown department' });
    const { rows } = await pool.query(
      `INSERT INTO courses (code,name,dept_id,credits,total_seats,semester,teacher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [code, name, dept[0].id, credits||3, total_seats||60, semester||'1st', teacher_id||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code==='23505') return res.status(409).json({ error: 'Course code already exists' });
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id=$1', [req.params.id]);
    res.json({ message: 'Course deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete course' }); }
});

module.exports = router;
