-- ============================================================
--  schema.sql  —  Run this in Supabase SQL Editor
--  Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Drop existing tables (safe re-run) ──────────────────────
DROP TABLE IF EXISTS attendance    CASCADE;
DROP TABLE IF EXISTS grades        CASCADE;
DROP TABLE IF EXISTS fees          CASCADE;
DROP TABLE IF EXISTS enrollments   CASCADE;
DROP TABLE IF EXISTS courses       CASCADE;
DROP TABLE IF EXISTS applications  CASCADE;
DROP TABLE IF EXISTS students      CASCADE;
DROP TABLE IF EXISTS teachers      CASCADE;
DROP TABLE IF EXISTS users         CASCADE;
DROP TABLE IF EXISTS departments   CASCADE;

-- ── Departments ─────────────────────────────────────────────
CREATE TABLE departments (
  id         SERIAL PRIMARY KEY,
  code       VARCHAR(20)  UNIQUE NOT NULL,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT now()
);

-- ── Users (auth) ────────────────────────────────────────────
CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin','teacher','student')),
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE,
  status        VARCHAR(20)  DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  DEFAULT now()
);

-- ── Students ────────────────────────────────────────────────
CREATE TABLE students (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID         REFERENCES users(id) ON DELETE SET NULL,
  student_code  VARCHAR(20)  UNIQUE NOT NULL,  -- e.g. SU-2024-001
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100),
  phone         VARCHAR(20),
  dept_id       INT          REFERENCES departments(id),
  semester      VARCHAR(10),
  gender        VARCHAR(10)  CHECK (gender IN ('Male','Female','Other')),
  blood_group   VARCHAR(5),
  date_of_birth DATE,
  address       TEXT,
  nationality   VARCHAR(50)  DEFAULT 'Bangladeshi',
  gpa           NUMERIC(4,2) DEFAULT 0.00,
  status        VARCHAR(20)  DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Graduated')),
  enrolled_at   DATE         DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ  DEFAULT now(),
  updated_at    TIMESTAMPTZ  DEFAULT now()
);

-- ── Teachers ────────────────────────────────────────────────
CREATE TABLE teachers (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  teacher_code VARCHAR(20) UNIQUE NOT NULL,  -- e.g. TCH-001
  full_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(100),
  phone       VARCHAR(20),
  dept_id     INT          REFERENCES departments(id),
  designation VARCHAR(100),
  joining_date DATE,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

-- ── Applications ────────────────────────────────────────────
CREATE TABLE applications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_code    VARCHAR(20) UNIQUE NOT NULL,  -- e.g. APP-001
  full_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(100),
  phone       VARCHAR(20),
  dept_id     INT          REFERENCES departments(id),
  gender      VARCHAR(10),
  date_of_birth DATE,
  father_name VARCHAR(100),
  address     TEXT,
  blood_group VARCHAR(5),
  nationality VARCHAR(50)  DEFAULT 'Bangladeshi',
  ssc_gpa     NUMERIC(4,2),
  hsc_gpa     NUMERIC(4,2),
  semester    VARCHAR(10),
  status      VARCHAR(20)  DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  reviewed_by UUID         REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

-- ── Courses ─────────────────────────────────────────────────
CREATE TABLE courses (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(20) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  dept_id     INT          REFERENCES departments(id),
  credits     INT          DEFAULT 3,
  total_seats INT          DEFAULT 60,
  teacher_id  UUID         REFERENCES teachers(id),
  semester    VARCHAR(10),
  created_at  TIMESTAMPTZ  DEFAULT now()
);

-- ── Enrollments (student ↔ course) ─────────────────────────
CREATE TABLE enrollments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID        REFERENCES students(id) ON DELETE CASCADE,
  course_id   UUID        REFERENCES courses(id)  ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, course_id)
);

-- ── Grades ──────────────────────────────────────────────────
CREATE TABLE grades (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID        REFERENCES students(id) ON DELETE CASCADE,
  course_id   UUID        REFERENCES courses(id)  ON DELETE CASCADE,
  midterm     NUMERIC(5,2) DEFAULT 0,
  final_exam  NUMERIC(5,2) DEFAULT 0,
  assignment  NUMERIC(5,2) DEFAULT 0,
  total       NUMERIC(5,2) GENERATED ALWAYS AS
              (midterm + final_exam + assignment) STORED,
  grade_point NUMERIC(4,2),
  letter_grade VARCHAR(5),
  remarks     TEXT,
  entered_by  UUID        REFERENCES users(id),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, course_id)
);

-- ── Attendance ──────────────────────────────────────────────
CREATE TABLE attendance (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID        REFERENCES students(id) ON DELETE CASCADE,
  course_id   UUID        REFERENCES courses(id)  ON DELETE CASCADE,
  date        DATE        NOT NULL,
  status      VARCHAR(10) DEFAULT 'Present' CHECK (status IN ('Present','Absent','Late')),
  marked_by   UUID        REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, course_id, date)
);

-- ── Fees ────────────────────────────────────────────────────
CREATE TABLE fees (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID        REFERENCES students(id) ON DELETE CASCADE,
  semester    VARCHAR(10) NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  due_date    DATE,
  paid_date   DATE,
  method      VARCHAR(30),
  status      VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Paid','Pending','Overdue','Waived')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes for performance ─────────────────────────────────
CREATE INDEX idx_students_dept     ON students(dept_id);
CREATE INDEX idx_students_status   ON students(status);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_attendance_date   ON attendance(date);
CREATE INDEX idx_grades_student    ON grades(student_id);
CREATE INDEX idx_fees_student      ON fees(student_id);
CREATE INDEX idx_fees_status       ON fees(status);

-- ── Auto-update updated_at trigger ─────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_students_updated
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
--  SEED DATA
-- ============================================================

-- Departments
INSERT INTO departments (code, name) VALUES
  ('CSE',  'Computer Science & Engineering'),
  ('EEE',  'Electrical & Electronic Engineering'),
  ('BBA',  'Business Administration'),
  ('ENG',  'English'),
  ('MATH', 'Mathematics'),
  ('PHY',  'Physics');

-- Users (passwords are bcrypt hashes of the shown passwords)
-- admin / admin123  |  student1 / student123  |  teacher1 / teacher123
INSERT INTO users (username, password_hash, role, full_name, email, status) VALUES
  ('admin',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'admin', 'Md. Ashraf Bin Mohsin', 'admin@su.edu.bd', 'active'),

  ('SU-2024-001',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'student', 'Rahim Uddin', 'rahim@su.edu.bd', 'active'),

  ('SU-2024-002',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'student', 'Fatema Akter', 'fatema@su.edu.bd', 'active'),

  ('SU-2024-003',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'student', 'Karim Hossain', 'karim@su.edu.bd', 'active'),

  ('SU-2024-004',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'student', 'Nasrin Begum', 'nasrin@su.edu.bd', 'active'),

  ('SU-2024-005',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'student', 'Jamal Ahmed', 'jamal@su.edu.bd', 'active'),

  ('TCH-001',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'teacher', 'Dr. Hasan', 'hasan@su.edu.bd', 'active'),

  ('TCH-002',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'teacher', 'Prof. Rina', 'rina@su.edu.bd', 'active');

-- NOTE: The hash above is for password "password" — change after first login!
-- To generate a real hash, run:  node -e "const b=require('bcryptjs');console.log(b.hashSync('admin123',10))"

-- Students
INSERT INTO students (user_id, student_code, full_name, email, phone, dept_id, semester, gender, blood_group, gpa, status)
SELECT u.id, 'SU-2024-001','Rahim Uddin','rahim@su.edu.bd','01712345678',
       (SELECT id FROM departments WHERE code='CSE'),'5th','Male','B+',3.75,'Active'
FROM users u WHERE u.username='SU-2024-001';

INSERT INTO students (user_id, student_code, full_name, email, phone, dept_id, semester, gender, blood_group, gpa, status)
SELECT u.id,'SU-2024-002','Fatema Akter','fatema@su.edu.bd','01812345678',
       (SELECT id FROM departments WHERE code='EEE'),'3rd','Female','A+',3.90,'Active'
FROM users u WHERE u.username='SU-2024-002';

INSERT INTO students (user_id, student_code, full_name, email, phone, dept_id, semester, gender, blood_group, gpa, status)
SELECT u.id,'SU-2024-003','Karim Hossain','karim@su.edu.bd','01912345678',
       (SELECT id FROM departments WHERE code='BBA'),'7th','Male','O+',3.20,'Active'
FROM users u WHERE u.username='SU-2024-003';

INSERT INTO students (user_id, student_code, full_name, email, phone, dept_id, semester, gender, blood_group, gpa, status)
SELECT u.id,'SU-2024-004','Nasrin Begum','nasrin@su.edu.bd','01612345678',
       (SELECT id FROM departments WHERE code='ENG'),'1st','Female','AB+',3.55,'Active'
FROM users u WHERE u.username='SU-2024-004';

INSERT INTO students (user_id, student_code, full_name, email, phone, dept_id, semester, gender, blood_group, gpa, status)
SELECT u.id,'SU-2024-005','Jamal Ahmed','jamal@su.edu.bd','01512345678',
       (SELECT id FROM departments WHERE code='CSE'),'3rd','Male','B-',2.80,'Active'
FROM users u WHERE u.username='SU-2024-005';

-- Teachers
INSERT INTO teachers (user_id, teacher_code, full_name, email, phone, dept_id, designation, joining_date)
SELECT u.id,'TCH-001','Dr. Hasan','hasan@su.edu.bd','01812000001',
       (SELECT id FROM departments WHERE code='CSE'),'Associate Professor','2018-09-01'
FROM users u WHERE u.username='TCH-001';

INSERT INTO teachers (user_id, teacher_code, full_name, email, phone, dept_id, designation, joining_date)
SELECT u.id,'TCH-002','Prof. Rina','rina@su.edu.bd','01812000002',
       (SELECT id FROM departments WHERE code='EEE'),'Professor','2015-03-15'
FROM users u WHERE u.username='TCH-002';

-- Applications
INSERT INTO applications (app_code, full_name, email, dept_id, gender, ssc_gpa, hsc_gpa, status, created_at) VALUES
  ('APP-001','Tariq Islam','tariq@g.com',(SELECT id FROM departments WHERE code='CSE'),'Male',4.5,4.0,'Pending',now()-interval'2 days'),
  ('APP-002','Roksana Khanam','roksana@g.com',(SELECT id FROM departments WHERE code='EEE'),'Female',4.8,4.5,'Approved',now()-interval'5 days'),
  ('APP-003','Mamun Rashid','mamun@g.com',(SELECT id FROM departments WHERE code='BBA'),'Male',3.9,3.5,'Pending',now()-interval'1 day'),
  ('APP-004','Shirin Akter','shirin@g.com',(SELECT id FROM departments WHERE code='ENG'),'Female',4.2,4.0,'Approved',now()-interval'10 days'),
  ('APP-005','Belal Hossain','belal@g.com',(SELECT id FROM departments WHERE code='CSE'),'Male',3.5,3.0,'Rejected',now()-interval'15 days');

-- Courses
INSERT INTO courses (code, name, dept_id, credits, total_seats, semester)
SELECT 'CSE301','Data Structures',(SELECT id FROM departments WHERE code='CSE'),3,60,'5th';
INSERT INTO courses (code, name, dept_id, credits, total_seats, semester)
SELECT 'CSE303','Algorithms',(SELECT id FROM departments WHERE code='CSE'),3,55,'5th';
INSERT INTO courses (code, name, dept_id, credits, total_seats, semester)
SELECT 'EEE101','Circuit Theory',(SELECT id FROM departments WHERE code='EEE'),4,50,'1st';
INSERT INTO courses (code, name, dept_id, credits, total_seats, semester)
SELECT 'BBA101','Business Fundamentals',(SELECT id FROM departments WHERE code='BBA'),3,70,'1st';
INSERT INTO courses (code, name, dept_id, credits, total_seats, semester)
SELECT 'ENG101','English Literature',(SELECT id FROM departments WHERE code='ENG'),3,45,'1st';
INSERT INTO courses (code, name, dept_id, credits, total_seats, semester)
SELECT 'MTH101','Calculus I',(SELECT id FROM departments WHERE code='MATH'),4,60,'1st';

-- Fees
INSERT INTO fees (student_id, semester, amount, due_date, paid_date, method, status)
SELECT s.id,'Semester 5',12500,'2024-08-15','2024-08-10','bKash','Paid'
FROM students s WHERE s.student_code='SU-2024-001';

INSERT INTO fees (student_id, semester, amount, due_date, status)
SELECT s.id,'Semester 6',12500,'2025-01-15',  'Pending'
FROM students s WHERE s.student_code='SU-2024-001';

INSERT INTO fees (student_id, semester, amount, due_date, paid_date, method, status)
SELECT s.id,'Semester 3',12500,'2024-08-15','2024-08-12','Bank','Paid'
FROM students s WHERE s.student_code='SU-2024-002';
