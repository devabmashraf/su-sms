// api/fees.js
const router = require('express').Router();
const pool   = require('../config/db');
const { authenticate, requireRole } = require('./authMiddleware');

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.*, s.student_code, s.full_name, d.code AS dept_code
       FROM fees f JOIN students s ON s.id=f.student_id
       LEFT JOIN departments d ON d.id=s.dept_id
       ORDER BY f.due_date DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', authenticate, requireRole('student'), async (req, res) => {
  try {
    const { rows: st } = await pool.query('SELECT id FROM students WHERE user_id=$1',[req.user.id]);
    if (!st.length) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query(
      'SELECT * FROM fees WHERE student_id=$1 ORDER BY due_date DESC', [st[0].id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { student_id, semester, amount, due_date } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO fees (student_id,semester,amount,due_date)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [student_id, semester, amount, due_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create fee record' }); }
});

router.patch('/:id/pay', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { method } = req.body;
    const { rows } = await pool.query(
      `UPDATE fees SET status='Paid', paid_date=CURRENT_DATE, method=$1
       WHERE id=$2 RETURNING *`,
      [method||'Cash', req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to update fee' }); }
});

module.exports = router;
