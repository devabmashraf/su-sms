# 🎓 Sonargaon University — Student Management System
### Full-Stack · Node.js + PostgreSQL (Supabase) + Vercel Hosting

---

## 📁 Project Structure

```
su-sms/
├── server.js              ← Express backend (entry point)
├── package.json
├── vercel.json            ← Vercel deployment config
├── .env.example           ← Copy to .env and fill in values
├── .gitignore
│
├── config/
│   ├── db.js              ← PostgreSQL connection pool
│   └── schema.sql         ← All tables + seed data (run in Supabase)
│
├── api/
│   ├── authMiddleware.js  ← JWT auth + role checking
│   ├── auth.js            ← Login, /me, change-password
│   ├── students.js        ← Full CRUD for students
│   ├── applications.js    ← Admission applications
│   ├── grades.js          ← Grade entry + retrieval
│   ├── attendance.js      ← Attendance tracking
│   ├── fees.js            ← Fee management
│   ├── courses.js         ← Course management
│   └── stats.js           ← Dashboard statistics
│
└── public/                ← Static frontend (served by Express/Vercel)
    ├── index.html         ← Redirects to login
    ├── login.html         ← Role-based login page
    ├── admin.html         ← Admin dashboard
    ├── student.html       ← Student portal
    ├── teacher.html       ← Teacher portal
    ├── css/app.css        ← Shared styles
    └── js/api.js          ← All API fetch calls
```

---

## 🚀 DEPLOYMENT GUIDE (Step by Step)

### STEP 1 — Create Supabase Database (Free)

1. Go to **https://supabase.com** and sign up (free)
2. Click **"New Project"**
   - Name: `su-sms`
   - Database Password: choose a strong password (save it!)
   - Region: choose closest to Bangladesh (e.g. Singapore)
3. Wait ~2 minutes for the project to start
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. Open `config/schema.sql` from this project, **copy all** and paste → click **Run**
6. You should see "Success. No rows returned" — all tables and seed data are created ✅
7. Go to **Project Settings** → **Database** → scroll to **Connection String**
8. Copy the **URI** format — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
   Replace `[YOUR-PASSWORD]` with the password you chose in step 2

---

### STEP 2 — Push Code to GitHub

1. Install Git if you haven't: https://git-scm.com
2. Create a new repository at **https://github.com/new**
   - Name: `su-sms`  |  Visibility: Private  |  Don't add README
3. Open terminal in the `su-sms/` folder and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/su-sms.git
   git push -u origin main
   ```

---

### STEP 3 — Deploy to Vercel (Free Hosting)

1. Go to **https://vercel.com** and sign up with GitHub
2. Click **"Add New Project"** → Import your `su-sms` repo
3. Vercel auto-detects the config. **Before deploying**, click **"Environment Variables"** and add:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | `postgresql://postgres:YOUR_PW@db.xxx.supabase.co:5432/postgres` |
   | `JWT_SECRET` | Any long random string, e.g. `mySuperSecretKey_SU_2024_!@#` |
   | `NODE_ENV` | `production` |

4. Click **"Deploy"** 🚀
5. In ~1 minute, you get a live URL like: `https://su-sms.vercel.app`

---

### STEP 4 — Test Your Live App

Open your Vercel URL and log in with these demo accounts:

| Role    | Username      | Password   |
|---------|---------------|------------|
| Admin   | `admin`       | `password` |
| Student | `SU-2024-001` | `password` |
| Teacher | `TCH-001`     | `password` |

> ⚠️ **Change passwords after first login!** The demo uses bcrypt hash for "password".
> To generate hashes for real passwords, run:
> ```bash
> node -e "const b=require('bcryptjs'); console.log(b.hashSync('YourNewPassword', 10))"
> ```
> Then update in Supabase SQL Editor:
> ```sql
> UPDATE users SET password_hash='$2a$10$...' WHERE username='admin';
> ```

---

## 💻 LOCAL DEVELOPMENT

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment file
cp .env.example .env
# Edit .env and add your DATABASE_URL and JWT_SECRET

# 3. Start development server
npm run dev

# 4. Open http://localhost:3000
```

---

## 🔐 Security Notes

- All passwords are hashed with **bcrypt** (10 rounds)
- All API routes except `/api/auth/login` require a valid **JWT token**
- Role-based access: admin-only routes reject teachers and students
- Rate limiting on login: max 20 attempts per 15 minutes
- The `.env` file is in `.gitignore` — **never commit it**

---

## 📊 Database Tables

| Table | Description |
|-------|-------------|
| `users` | Login accounts for all roles |
| `departments` | CSE, EEE, BBA, English, Mathematics, Physics |
| `students` | Student profiles linked to users |
| `teachers` | Teacher profiles linked to users |
| `applications` | Admission applications |
| `courses` | Available courses |
| `enrollments` | Student ↔ course mapping |
| `grades` | Marks per student per course |
| `attendance` | Daily attendance records |
| `fees` | Fee records per student |

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Any | Get current user |
| POST | `/api/auth/change-password` | Any | Change password |
| GET | `/api/students` | Admin/Teacher | List all students |
| POST | `/api/students` | Admin | Enroll new student |
| DELETE | `/api/students/:id` | Admin | Remove student |
| GET | `/api/students/me` | Student | Own profile |
| GET | `/api/applications` | Admin | All applications |
| POST | `/api/applications` | Public | Submit application |
| PATCH | `/api/applications/:id/status` | Admin | Approve/Reject |
| GET | `/api/grades/me` | Student | Own grades |
| POST | `/api/grades` | Teacher/Admin | Enter/update grades |
| GET | `/api/attendance/me` | Student | Own attendance |
| POST | `/api/attendance/bulk` | Teacher/Admin | Mark attendance |
| GET | `/api/fees` | Admin | All fees |
| GET | `/api/fees/me` | Student | Own fees |
| POST | `/api/fees` | Admin | Add fee record |
| PATCH | `/api/fees/:id/pay` | Admin | Mark fee paid |
| GET | `/api/courses` | Any | List courses |
| POST | `/api/courses` | Admin | Add course |
| GET | `/api/stats` | Admin | Dashboard stats |
