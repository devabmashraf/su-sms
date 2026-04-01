// api/attendance.js
const router = require('express').Router();
const pool   = require('../config/db');
const { authenticate, requireRole } = require('./authMiddleware');

// GET my attendance summary (student)
router.get('/me', authenticate, requireRole('student'), async (req, res) => {
  try {
    const { rows: st } = await pool.query('SELECT id FROM students WHERE user_id=$1',[req.user.id]);
    if (!st.length) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query(
      `SELECT c.code, c.name AS course_name,
              COUNT(*) AS total_classes,
              SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) AS present,
              ROUND(SUM(CASE WHEN a.status='Present' THEN 100.0 ELSE 0 END)/COUNT(*),1) AS pct
       FROM attendance a JOIN courses c ON c.id=a.course_id
       WHERE a.student_id=$1 GROUP BY c.code, c.name ORDER BY c.code`,
      [st[0].id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET attendance for a course on a date (teacher)
router.get('/course/:courseId', authenticate, requireRole('admin','teacher'), async (req, res) => {
  try {
    const { date } = req.query;
    const { rows } = await pool.query(
      `SELECT s.student_code, s.full_name, a.status, a.date
       FROM students s
       LEFT JOIN attendance a ON a.student_id=s.id AND a.course_id=$1 AND a.date=$2
       ORDER BY s.student_code`,
      [req.params.courseId, date || new Date().toISOString().split('T')[0]]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST bulk attendance (teacher/admin)
router.post('/bulk', authenticate, requireRole('admin','teacher'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { course_id, date, records } = req.body;
    // records = [{student_id, status}]
    for (const r of records) {
      await client.query(
        `INSERT INTO attendance (student_id,course_id,date,status,marked_by)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (student_id,course_id,date) DO UPDATE SET status=$4, marked_by=$5`,
        [r.student_id, course_id, date, r.status, req.user.id]
      );
    }
    await client.query('COMMIT');
    res.json({ message: `Attendance recorded for ${records.length} students` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to record attendance' });
  } finally { client.release(); }
});

module.exports = router;
