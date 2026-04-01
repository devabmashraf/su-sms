// api/applications.js
const router = require('express').Router();
const pool   = require('../config/db');
const { authenticate, requireRole } = require('./authMiddleware');

// GET all
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    let q = `SELECT a.*, d.code AS dept_code, d.name AS dept_name
             FROM applications a LEFT JOIN departments d ON d.id = a.dept_id WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND a.status = $${params.length}`; }
    q += ' ORDER BY a.created_at DESC';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch applications' }); }
});

// POST new application (public — no auth needed)
router.post('/', async (req, res) => {
  try {
    const { full_name, email, phone, dept_code, gender, date_of_birth,
            father_name, address, blood_group, nationality,
            ssc_gpa, hsc_gpa, semester } = req.body;
    if (!full_name || !dept_code) return res.status(400).json({ error: 'Name and department required' });

    const { rows: cnt } = await pool.query("SELECT COUNT(*) FROM applications");
    const code = `APP-${String(parseInt(cnt[0].count)+1).padStart(3,'0')}`;
    const { rows: dept } = await pool.query('SELECT id FROM departments WHERE code=$1',[dept_code]);
    if (!dept.length) return res.status(400).json({ error: 'Unknown department' });

    const { rows } = await pool.query(
      `INSERT INTO applications
         (app_code,full_name,email,phone,dept_id,gender,date_of_birth,father_name,
          address,blood_group,nationality,ssc_gpa,hsc_gpa,semester)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [code,full_name,email||null,phone||null,dept[0].id,gender||null,
       date_of_birth||null,father_name||null,address||null,blood_group||null,
       nationality||'Bangladeshi',ssc_gpa||null,hsc_gpa||null,semester||'1st']
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err.message); res.status(500).json({ error: 'Failed to submit application' }); }
});

// PATCH status (admin)
router.patch('/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE applications SET status=$1, notes=$2, reviewed_by=$3, reviewed_at=now()
       WHERE id=$4 RETURNING *`,
      [status, notes||null, req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Application not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to update status' }); }
});

// DELETE (admin)
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM applications WHERE id=$1', [req.params.id]);
    res.json({ message: 'Application deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

module.exports = router;
