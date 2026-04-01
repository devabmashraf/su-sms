// api/grades.js
const router = require('express').Router();
const pool   = require('../config/db');
const { authenticate, requireRole } = require('./authMiddleware');

// GET grades for a student
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT g.*, c.code AS course_code, c.name AS course_name, c.credits
       FROM grades g
       JOIN courses c ON c.id = g.course_id
       WHERE g.student_id = $1
       ORDER BY c.code`,
      [req.params.studentId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch grades' }); }
});

// GET my grades (student)
router.get('/me', authenticate, requireRole('student'), async (req, res) => {
  try {
    const { rows: student } = await pool.query(
      'SELECT id FROM students WHERE user_id=$1', [req.user.id]
    );
    if (!student.length) return res.status(404).json({ error: 'Student not found' });
    const { rows } = await pool.query(
      `SELECT g.*, c.code AS course_code, c.name AS course_name, c.credits
       FROM grades g JOIN courses c ON c.id = g.course_id
       WHERE g.student_id = $1 ORDER BY c.code`,
      [student[0].id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST/PUT grade (teacher, admin)
router.post('/', authenticate, requireRole('admin','teacher'), async (req, res) => {
  try {
    const { student_id, course_id, midterm, final_exam, assignment } = req.body;
    const total = (midterm||0)+(final_exam||0)+(assignment||0);
    const gp    = total>=80?4.0:total>=70?3.5:total>=60?3.0:total>=50?2.0:0.0;
    const grade = gp>=4.0?'A+':gp>=3.5?'A':gp>=3.0?'B+':gp>=2.0?'B':'F';
    const { rows } = await pool.query(
      `INSERT INTO grades (student_id,course_id,midterm,final_exam,assignment,grade_point,letter_grade,entered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (student_id,course_id) DO UPDATE SET
         midterm=$3, final_exam=$4, assignment=$5,
         grade_point=$6, letter_grade=$7, entered_by=$8, updated_at=now()
       RETURNING *`,
      [student_id,course_id,midterm||0,final_exam||0,assignment||0,gp,grade,req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err.message); res.status(500).json({ error: 'Failed to save grade' }); }
});

module.exports = router;
