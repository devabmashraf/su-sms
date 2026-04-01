/* public/js/api.js — All API calls to the backend */

const BASE = '/api';

// ── Token helpers ────────────────────────────────────────────
const auth = {
  getToken() { return localStorage.getItem('su_token'); },
  getUser()  {
    try { return JSON.parse(localStorage.getItem('su_user')); }
    catch { return null; }
  },
  save(token, user) {
    localStorage.setItem('su_token', token);
    localStorage.setItem('su_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('su_token');
    localStorage.removeItem('su_user');
  },
  isLoggedIn() { return !!this.getToken(); },
};

// ── Core fetch wrapper ───────────────────────────────────────
async function apiFetch(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);

  // Token expired → back to login
  if (res.status === 401) {
    auth.clear();
    window.location.href = '/login.html';
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  // Auth
  login:          (creds)    => apiFetch('POST',  '/auth/login',           creds),
  me:             ()         => apiFetch('GET',   '/auth/me'),
  changePassword: (body)     => apiFetch('POST',  '/auth/change-password', body),

  // Students
  getStudents:    (params)   => apiFetch('GET',   '/students'  + buildQuery(params)),
  getStudent:     (id)       => apiFetch('GET',   `/students/${id}`),
  getMyProfile:   ()         => apiFetch('GET',   '/students/me'),
  createStudent:  (data)     => apiFetch('POST',  '/students',       data),
  updateStudent:  (id, data) => apiFetch('PUT',   `/students/${id}`, data),
  deleteStudent:  (id)       => apiFetch('DELETE',`/students/${id}`),

  // Applications
  getApplications:(params)   => apiFetch('GET',   '/applications' + buildQuery(params)),
  submitApp:      (data)     => apiFetch('POST',  '/applications',       data),
  updateAppStatus:(id, body) => apiFetch('PATCH', `/applications/${id}/status`, body),
  deleteApp:      (id)       => apiFetch('DELETE',`/applications/${id}`),

  // Grades
  getMyGrades:    ()         => apiFetch('GET',   '/grades/me'),
  getGrades:      (studentId)=> apiFetch('GET',   `/grades/student/${studentId}`),
  saveGrade:      (data)     => apiFetch('POST',  '/grades', data),

  // Attendance
  getMyAttendance:()         => apiFetch('GET',   '/attendance/me'),
  getCourseAtt:   (cId,date) => apiFetch('GET',   `/attendance/course/${cId}?date=${date}`),
  bulkAttendance: (data)     => apiFetch('POST',  '/attendance/bulk', data),

  // Fees
  getAllFees:      ()         => apiFetch('GET',   '/fees'),
  getMyFees:      ()         => apiFetch('GET',   '/fees/me'),
  createFee:      (data)     => apiFetch('POST',  '/fees',           data),
  markFeePaid:    (id, method)=> apiFetch('PATCH', `/fees/${id}/pay`, { method }),

  // Courses
  getCourses:     ()         => apiFetch('GET',   '/courses'),
  createCourse:   (data)     => apiFetch('POST',  '/courses',        data),
  deleteCourse:   (id)       => apiFetch('DELETE',`/courses/${id}`),

  // Stats
  getStats:       ()         => apiFetch('GET',   '/stats'),
};

function buildQuery(params = {}) {
  const q = Object.entries(params)
    .filter(([,v]) => v !== undefined && v !== '' && v !== null)
    .map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return q ? '?' + q : '';
}
