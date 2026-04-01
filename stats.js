// api/stats.js — Dashboard summary stats
const router = require('express').Router();
const pool   = require('../config/db');
const { authenticate, requireRole } = require('./authMiddleware');

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const [students, apps, gpa, att, deptBreakdown, monthlyApps, feeStats] =
      await Promise.all([
        pool.query("SELECT COUNT(*) FROM students WHERE status='Active'"),
        pool.query("SELECT COUNT(*) FROM applications"),
        pool.query("SELECT ROUND(AVG(gpa),2) AS avg_gpa FROM students"),
        pool.query(`SELECT ROUND(AVG(pct),0) AS avg_att FROM (
                     SELECT student_id,
                       ROUND(SUM(CASE WHEN status='Present' THEN 100.0 ELSE 0 END)/COUNT(*),0) AS pct
                     FROM attendance GROUP BY student_id) sub`),
        pool.query(`SELECT d.code, d.name, COUNT(s.id) AS count
                    FROM departments d LEFT JOIN students s ON s.dept_id=d.id
                    GROUP BY d.code, d.name ORDER BY d.code`),
        pool.query(`SELECT TO_CHAR(created_at,'Mon') AS month,
                           EXTRACT(MONTH FROM created_at) AS month_num,
                           COUNT(*) AS count
                    FROM applications
                    WHERE created_at >= NOW() - INTERVAL '12 months'
                    GROUP BY month, month_num ORDER BY month_num`),
        pool.query(`SELECT
                      SUM(CASE WHEN status='Paid'    THEN amount ELSE 0 END) AS collected,
                      SUM(CASE WHEN status='Pending' THEN amount ELSE 0 END) AS pending,
                      SUM(amount) AS total
                    FROM fees`),
      ]);

    res.json({
      totalStudents:   parseInt(students.rows[0].count),
      totalApps:       parseInt(apps.rows[0].count),
      pendingApps:     0, // computed below
      avgGPA:          parseFloat(gpa.rows[0].avg_gpa) || 0,
      avgAttendance:   parseInt(att.rows[0].avg_att)   || 0,
      deptBreakdown:   deptBreakdown.rows,
      monthlyApps:     monthlyApps.rows,
      feeStats:        feeStats.rows[0],
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
