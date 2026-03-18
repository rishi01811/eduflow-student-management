/**
 * students.js — Student CRUD Operations
 * Handles: add, edit, delete, list, search, filter, sort, paginate
 * Uses Firestore in production, localStorage in DEMO_MODE
 */

// ─── State ───────────────────────────────────────────────────
let allStudents     = [];
let filteredStudents = [];
let currentPage     = 1;
const PAGE_SIZE     = 10;
let sortField       = 'enrolledDate';
let sortDir         = 'desc';
let deleteTargetId  = null;

// ─── Per-user Firestore path helper ─────────────────────────
function getStudentsCollection(userId) {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) throw new Error("User not authenticated");
  return db.collection("users").doc(uid).collection("students");
}

// ─── Demo Data ───────────────────────────────────────────────
const DEMO_STUDENTS = [
  { id:'s1',  name:'Aditya Kumar',     email:'aditya@email.com',   course:'Data Science',       gpa:3.9, status:'Active',   phone:'555-0101', address:'Mumbai, India',       enrolledDate:'2024-01-15' },
  { id:'s2',  name:'Sara Reynolds',    email:'sara@email.com',     course:'Web Development',    gpa:3.6, status:'Active',   phone:'555-0102', address:'New York, USA',        enrolledDate:'2024-01-20' },
  { id:'s3',  name:'Marcus Lee',       email:'marcus@email.com',   course:'Machine Learning',   gpa:3.8, status:'Active',   phone:'555-0103', address:'Toronto, Canada',      enrolledDate:'2024-02-01' },
  { id:'s4',  name:'Sofia Patel',      email:'sofia@email.com',    course:'Cybersecurity',      gpa:3.7, status:'Pending',  phone:'555-0104', address:'London, UK',           enrolledDate:'2024-02-10' },
  { id:'s5',  name:'James Carter',     email:'james@email.com',    course:'Cloud Computing',    gpa:3.5, status:'Active',   phone:'555-0105', address:'Sydney, Australia',    enrolledDate:'2024-02-15' },
  { id:'s6',  name:'Priya Sharma',     email:'priya@email.com',    course:'Data Science',       gpa:4.0, status:'Active',   phone:'555-0106', address:'Delhi, India',         enrolledDate:'2024-03-01' },
  { id:'s7',  name:'Tom Wilson',       email:'tom@email.com',      course:'UX Design',          gpa:3.4, status:'Inactive', phone:'555-0107', address:'Chicago, USA',         enrolledDate:'2024-03-05' },
  { id:'s8',  name:'Mei Zhang',        email:'mei@email.com',      course:'Mobile Development', gpa:3.9, status:'Active',   phone:'555-0108', address:'Beijing, China',       enrolledDate:'2024-03-10' },
  { id:'s9',  name:'Carlos Ruiz',      email:'carlos@email.com',   course:'DevOps Engineering', gpa:3.6, status:'Active',   phone:'555-0109', address:'Madrid, Spain',        enrolledDate:'2024-03-20' },
  { id:'s10', name:'Anna Johnson',     email:'anna@email.com',     course:'Web Development',    gpa:3.3, status:'Pending',  phone:'555-0110', address:'Stockholm, Sweden',    enrolledDate:'2024-04-01' },
  { id:'s11', name:'David Okafor',     email:'david@email.com',    course:'Data Science',       gpa:3.7, status:'Active',   phone:'555-0111', address:'Lagos, Nigeria',       enrolledDate:'2024-04-05' },
  { id:'s12', name:'Lisa Chen',        email:'lisa@email.com',     course:'Machine Learning',   gpa:3.8, status:'Active',   phone:'555-0112', address:'Shanghai, China',      enrolledDate:'2024-04-10' },
  { id:'s13', name:'Ryan Murphy',      email:'ryan@email.com',     course:'Cybersecurity',      gpa:3.5, status:'Active',   phone:'555-0113', address:'Dublin, Ireland',      enrolledDate:'2024-04-15' },
  { id:'s14', name:'Nina Petrov',      email:'nina@email.com',     course:'Cloud Computing',    gpa:3.9, status:'Active',   phone:'555-0114', address:'Moscow, Russia',       enrolledDate:'2024-05-01' },
  { id:'s15', name:'Alex Thompson',    email:'alex@email.com',     course:'UX Design',          gpa:3.2, status:'Inactive', phone:'555-0115', address:'Dallas, USA',          enrolledDate:'2024-05-10' },
  { id:'s16', name:'Yuki Tanaka',      email:'yuki@email.com',     course:'Mobile Development', gpa:3.7, status:'Active',   phone:'555-0116', address:'Tokyo, Japan',         enrolledDate:'2024-05-15' },
  { id:'s17', name:'Emma Williams',    email:'emma@email.com',     course:'Data Science',       gpa:3.6, status:'Active',   phone:'555-0117', address:'Melbourne, Australia', enrolledDate:'2024-05-20' },
  { id:'s18', name:'Omar Hassan',      email:'omar@email.com',     course:'DevOps Engineering', gpa:3.4, status:'Pending',  phone:'555-0118', address:'Cairo, Egypt',         enrolledDate:'2024-06-01' },
  { id:'s19', name:'Isabella Costa',  email:'isa@email.com',      course:'Web Development',    gpa:3.8, status:'Active',   phone:'555-0119', address:'Sao Paulo, Brazil',    enrolledDate:'2024-06-05' },
  { id:'s20', name:'Kevin Park',       email:'kevin@email.com',    course:'Machine Learning',   gpa:3.5, status:'Active',   phone:'555-0120', address:'Seoul, South Korea',   enrolledDate:'2024-06-10' },
];

// ─── Init: load students from store ─────────────────────────
function initStudents(user) {
  if (isDemo()) {
    const stored = localStorage.getItem('eduflow_students');
    allStudents = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEMO_STUDENTS));
    if (!stored) saveDemo();
    renderAll();
    return Promise.resolve();
  } else {
    return new Promise((resolve) => {
      let resolved = false;
      const currentUser = user || auth.currentUser;
      console.log('[EduFlow] initStudents called, current user:', currentUser ? currentUser.uid : 'NULL');
      if (!currentUser) {
        console.warn('[EduFlow] No authenticated user — cannot load students');
        allStudents = [];
        renderAll();
        resolve();
        return;
      }
      getStudentsCollection(currentUser.uid).orderBy('createdAt','desc')
        .onSnapshot(snapshot => {
          console.log('[EduFlow] Firestore snapshot received, docs:', snapshot.size);
          allStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderAll();
          if (!resolved) { resolved = true; resolve(); }
        }, err => {
          console.error('[EduFlow] Firestore onSnapshot error:', err.code, err.message);
          allStudents = [];
          renderAll();
          showToast('Could not load students: ' + (err.code || err.message), 'error');
          if (!resolved) { resolved = true; resolve(); }
        });
    });
  }
}

function isDemo() {
  return window.DEMO_MODE === true;
}

function saveDemo() {
  localStorage.setItem('eduflow_students', JSON.stringify(allStudents));
}

// ─── Render All Tables / UI ──────────────────────────────────
function renderAll() {
  filterStudents();
  updateStatCards();
  updateCourseFilter();
  updateCoursesGrid();
  updateExportCount();
  updateStudentBadge();
  if (window.dashboardChartsReady) refreshCharts();
}

// ─── Filter + Sort + Paginate ────────────────────────────────
function filterStudents() {
  const search   = (document.getElementById('studentSearch')?.value || '').toLowerCase();
  const course   = document.getElementById('courseFilter')?.value  || '';
  const status   = document.getElementById('statusFilter')?.value  || '';
  const global   = (document.getElementById('globalSearch')?.value || '').toLowerCase();
  const query    = search || global;

  filteredStudents = allStudents.filter(s => {
    const matchSearch = !query ||
      s.name.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      (s.phone||'').includes(query);
    const matchCourse = !course  || s.course  === course;
    const matchStatus = !status  || s.status  === status;
    return matchSearch && matchCourse && matchStatus;
  });

  // Sort
  filteredStudents.sort((a, b) => {
    let va = a[sortField] || '', vb = b[sortField] || '';
    if (typeof va === 'number') return sortDir === 'asc' ? va-vb : vb-va;
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  currentPage = 1;
  renderStudentsTable();
  renderRecentStudents();
}

function sortStudents(field) {
  if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortField = field; sortDir = 'asc'; }
  document.querySelectorAll('.sort-arr').forEach(el => el.textContent = '↕');
  const icon = document.getElementById('sort-' + field);
  if (icon) icon.textContent = sortDir === 'asc' ? '↑' : '↓';
  filterStudents();
}

// ─── Status Badge Helper ──────────────────────────────────────
function statusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'active')   return 'badge badge-green';
  if (s === 'inactive') return 'badge badge-zinc';
  if (s === 'pending')  return 'badge badge-yellow';
  return 'badge badge-zinc';
}

// ─── Render Students Table ────────────────────────────────────
function renderStudentsTable() {
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  const totalPages  = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const start       = (currentPage - 1) * PAGE_SIZE;
  const paginated   = filteredStudents.slice(start, start + PAGE_SIZE);

  if (paginated.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="tbl-empty">
          <div class="tbl-empty-ico">🎓</div>
          <div class="tbl-empty-lbl">No students found. <button onclick="openAddModal()" style="background:none;border:none;color:var(--blue);cursor:pointer;font-weight:600;">Add one?</button></div>
        </div>
      </td></tr>`;
  } else {
    tbody.innerHTML = paginated.map(s => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="s-av">${initials(s.name)}</div>
            <div>
              <div class="s-name">${escHtml(s.name)}</div>
              <div class="s-email">${escHtml(s.email)}</div>
            </div>
          </div>
        </td>
        <td><span class="badge" style="${courseBadgeStyle(s.course)}padding:3px 10px;border-radius:var(--r-full);font-size:11px;font-weight:500;">${escHtml(s.course)}</span></td>
        <td><span style="font-weight:700;font-family:var(--mono);color:${gpaColor(s.gpa)}">${s.gpa ? Number(s.gpa).toFixed(1) : '—'}</span></td>
        <td><span class="${statusBadgeClass(s.status)}">${escHtml(s.status||'')}</span></td>
        <td style="color:var(--text-2);font-size:12px;">${formatDate(s.enrolledDate)}</td>
        <td style="text-align:right;white-space:nowrap;">
          <button class="row-btn" onclick="openEditModal('${s.id}')" title="Edit">✏️</button>
          <button class="row-btn del" onclick="openDeleteModal('${s.id}','${escAttr(s.name)}')" title="Delete">🗑</button>
        </td>
      </tr>`).join('');
  }

  // Table info
  const infoEl = document.getElementById('tableInfo');
  if (infoEl) {
    if (filteredStudents.length === 0) {
      infoEl.textContent = '0 students';
    } else {
      infoEl.textContent = `Showing ${start+1}–${Math.min(start+PAGE_SIZE, filteredStudents.length)} of ${filteredStudents.length} students`;
    }
  }

  // Pagination
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pag = document.getElementById('pagination');
  if (!pag) return;
  let html = '';
  if (currentPage > 1) html += `<button class="pg-btn" onclick="goPage(${currentPage-1})">‹</button>`;
  for (let p = Math.max(1,currentPage-2); p <= Math.min(totalPages,currentPage+2); p++) {
    html += `<button class="pg-btn ${p===currentPage?'on':''}" onclick="goPage(${p})">${p}</button>`;
  }
  if (currentPage < totalPages) html += `<button class="pg-btn" onclick="goPage(${currentPage+1})">›</button>`;
  pag.innerHTML = html;
}

function goPage(p) { currentPage = p; renderStudentsTable(); }

// ─── Recent Students (Overview) ───────────────────────────────
function renderRecentStudents() {
  const tbody = document.getElementById('recentStudentsBody');
  if (!tbody) return;
  const recent = [...allStudents].sort((a,b)=>(b.enrolledDate||'').localeCompare(a.enrolledDate||'')).slice(0,5);
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="tbl-empty" style="padding:24px;">No students yet.</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(s => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="s-av">${initials(s.name)}</div>
          <div>
            <div class="s-name" style="font-size:12px;">${escHtml(s.name)}</div>
            <div class="s-email">${escHtml(s.email)}</div>
          </div>
        </div>
      </td>
      <td><span class="badge" style="${courseBadgeStyle(s.course)}padding:3px 10px;border-radius:var(--r-full);font-size:11px;font-weight:500;">${escHtml(s.course)}</span></td>
      <td><span class="${statusBadgeClass(s.status)}">${escHtml(s.status||'')}</span></td>
      <td style="color:var(--text-2);font-size:11px;">${formatDate(s.enrolledDate)}</td>
    </tr>`).join('');
}

// ─── Stat Cards ───────────────────────────────────────────────
function updateStatCards() {
  const el = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  const active  = allStudents.filter(s => s.status === 'Active').length;
  const courses = [...new Set(allStudents.map(s => s.course))].length;
  const now     = new Date();
  const thisMonth = allStudents.filter(s => {
    const d = new Date(s.enrolledDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  el('statTotal',   allStudents.length);
  el('statCourses', courses);
  el('statActive',  active);
  el('statNew',     thisMonth);
  el('studentCountBadge', allStudents.length);
}

// ─── Course Filter Dropdown ───────────────────────────────────
function updateCourseFilter() {
  const sel = document.getElementById('courseFilter');
  if (!sel) return;
  const courses = [...new Set(allStudents.map(s=>s.course))].sort();
  const current = sel.value;
  sel.innerHTML = '<option value="">All Courses</option>' +
    courses.map(c => `<option value="${escAttr(c)}" ${c===current?'selected':''}>${escHtml(c)}</option>`).join('');
}

// ─── Courses Grid ─────────────────────────────────────────────
function updateCoursesGrid() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;
  const courseMap = {};
  allStudents.forEach(s => {
    if (!s.course) return;
    if (!courseMap[s.course]) courseMap[s.course] = { total:0, active:0 };
    courseMap[s.course].total++;
    if (s.status==='Active') courseMap[s.course].active++;
  });
  const courses = Object.keys(courseMap).sort();
  if (!courses.length) {
    grid.innerHTML = '<div class="card" style="padding:16px;text-align:center;color:var(--text-3);grid-column:1/-1;">No courses found. Add students to see courses.</div>';
    return;
  }
  const icons = { 'Data Science':'📊','Web Development':'🌐','Machine Learning':'🤖','Cybersecurity':'🔐','Cloud Computing':'☁️','UX Design':'🎨','Mobile Development':'📱','DevOps Engineering':'⚙️' };
  grid.innerHTML = courses.map(c => `
    <div class="card" style="padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div class="stat-ico" style="font-size:1.2rem;">${icons[c]||'🎓'}</div>
        <span class="badge badge-green" style="font-size:10px;">Active</span>
      </div>
      <div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--text-1);">${courseMap[c].total}</div>
      <div style="font-size:12px;color:var(--text-3);margin-top:2px;">${escHtml(c)}</div>
      <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);">
        <span>Active: <strong style="color:var(--green);">${courseMap[c].active}</strong></span>
        <span>Rate: <strong style="color:var(--blue);">${Math.round(courseMap[c].active/courseMap[c].total*100)}%</strong></span>
      </div>
    </div>`).join('');
}

function updateExportCount() {
  const el = document.getElementById('exportCount');
  if (el) el.textContent = allStudents.length;
}
function updateStudentBadge() {
  const el = document.getElementById('studentCountBadge');
  if (el) el.textContent = allStudents.length;
}

// ─── Add / Edit Modal ─────────────────────────────────────────
function openAddModal() {
  document.getElementById('editStudentId').value = '';
  document.getElementById('modalTitle').textContent = 'Add Student';
  document.getElementById('modalBtnText').textContent = 'Add Student';
  clearModalFields();
  document.getElementById('fieldDate').value = new Date().toISOString().split('T')[0];
  openModal('studentModal');
}

function openEditModal(id) {
  const s = allStudents.find(s => s.id === id);
  if (!s) return;
  document.getElementById('editStudentId').value = id;
  document.getElementById('modalTitle').textContent = 'Edit Student';
  document.getElementById('modalBtnText').textContent = 'Save Changes';
  document.getElementById('fieldName').value    = s.name    || '';
  document.getElementById('fieldEmail').value   = s.email   || '';
  document.getElementById('fieldCourse').value  = s.course  || '';
  document.getElementById('fieldGpa').value     = s.gpa     || '';
  document.getElementById('fieldPhone').value   = s.phone   || '';
  document.getElementById('fieldStatus').value  = s.status  || 'Active';
  document.getElementById('fieldAddress').value = s.address || '';
  document.getElementById('fieldDate').value    = s.enrolledDate || '';
  openModal('studentModal');
}

function clearModalFields() {
  ['fieldName','fieldEmail','fieldCourse','fieldGpa','fieldPhone','fieldAddress','fieldDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('fieldStatus').value = 'Active';
  ['errName','errEmail','errCourse'].forEach(id => showErr(id, false));
}

function closeStudentModal() { closeModal('studentModal'); }

function submitStudentForm() {
  // Validate
  const name   = document.getElementById('fieldName').value.trim();
  const email  = document.getElementById('fieldEmail').value.trim();
  const course = document.getElementById('fieldCourse').value;
  let valid = true;
  showErr('errName',  !name);   if (!name)  valid = false;
  showErr('errEmail', !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) valid = false;
  showErr('errCourse', !course); if (!course) valid = false;
  if (!valid) return;

  // Rate limit check
  if (typeof checkRateLimit === 'function' && !checkRateLimit('studentCRUD')) return;

  const id = document.getElementById('editStudentId').value;
  const data = {
    name:          typeof sanitizeText === 'function' ? sanitizeText(name) : name,
    email:         typeof sanitizeEmail === 'function' ? (sanitizeEmail(email) || email) : email,
    course:        typeof sanitizeText === 'function' ? sanitizeText(course) : course,
    gpa:           typeof sanitizeGpa === 'function' ? (sanitizeGpa(document.getElementById('fieldGpa').value) ?? 0) : (parseFloat(document.getElementById('fieldGpa').value) || 0),
    phone:         typeof sanitizePhone === 'function' ? sanitizePhone(document.getElementById('fieldPhone').value) : document.getElementById('fieldPhone').value.trim(),
    status:        document.getElementById('fieldStatus').value,
    address:       typeof sanitizeText === 'function' ? sanitizeText(document.getElementById('fieldAddress').value) : document.getElementById('fieldAddress').value.trim(),
    enrolledDate:  document.getElementById('fieldDate').value,
    updatedAt:     new Date().toISOString(),
  };

  const btnText = document.getElementById('modalBtnText');
  const spinner = document.getElementById('modalSpinner');
  btnText.style.display = 'none';
  spinner.classList.remove('hidden');

  if (id) {
    updateStudent(id, data, () => { closeStudentModal(); showToast('Student updated successfully!', 'success'); });
  } else {
    data.createdAt = new Date().toISOString();
    addStudent(data, () => { closeStudentModal(); showToast('Student added successfully!', 'success'); });
  }
}

// ─── CRUD: Add ────────────────────────────────────────────────
function addStudent(data, callback) {
  if (isDemo()) {
    data.id = 's' + Date.now();
    allStudents.unshift(data);
    saveDemo();
    renderAll();
    callback();
  } else {
    getStudentsCollection().add(data)
      .then(callback)
      .catch(err => { showToast('Failed to add student. Please try again.', 'error'); resetModalBtn(); });
  }
}

// ─── CRUD: Update ─────────────────────────────────────────────
function updateStudent(id, data, callback) {
  if (isDemo()) {
    const idx = allStudents.findIndex(s => s.id === id);
    if (idx !== -1) allStudents[idx] = { ...allStudents[idx], ...data };
    saveDemo();
    renderAll();
    callback();
  } else {
    getStudentsCollection().doc(id).update(data)
      .then(callback)
      .catch(err => { showToast('Failed to update student. Please try again.', 'error'); resetModalBtn(); });
  }
}

// ─── CRUD: Delete ─────────────────────────────────────────────
function openDeleteModal(id, name) {
  deleteTargetId = id;
  const el = document.getElementById('deleteStudentName');
  if (el) el.textContent = name;
  openModal('deleteModal');
}
function closeDeleteModal() { closeModal('deleteModal'); deleteTargetId = null; }

function confirmDelete() {
  if (!deleteTargetId) return;
  // Rate limit check
  if (typeof checkRateLimit === 'function' && !checkRateLimit('studentCRUD')) return;
  const id = deleteTargetId;
  closeDeleteModal();
  if (isDemo()) {
    allStudents = allStudents.filter(s => s.id !== id);
    saveDemo();
    renderAll();
    showToast('Student removed.', 'success');
  } else {
    getStudentsCollection().doc(id).delete()
      .then(() => showToast('Student removed.', 'success'))
      .catch(err => showToast('Failed to delete student. Please try again.', 'error'));
  }
}

// ─── Modal Helpers ────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  resetModalBtn();
}
function resetModalBtn() {
  const btn  = document.getElementById('modalBtnText');
  const spin = document.getElementById('modalSpinner');
  if (btn)  btn.style.display = '';
  if (spin) spin.classList.add('hidden');
}

// ─── Global Search ────────────────────────────────────────────
function handleGlobalSearch(query) {
  if (query.length > 0) navigate('students');
  filterStudents();
}

// ─── Utility Formatters ───────────────────────────────────────
function initials(name) {
  return (name||'?').split(' ').slice(0,2).map(p=>p[0]?.toUpperCase()||'').join('');
}
function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
}
function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function gpaColor(gpa) {
  if (!gpa) return 'var(--text-3)';
  if (gpa >= 3.7) return 'var(--green)';
  if (gpa >= 3.0) return '#22d3ee';
  return 'var(--yellow)';
}
const COURSE_COLORS = {
  'Data Science':       'background:rgba(99,102,241,0.12);color:#818cf8;',
  'Web Development':    'background:rgba(34,211,238,0.12);color:#67e8f9;',
  'Machine Learning':   'background:rgba(16,185,129,0.12);color:#6ee7b7;',
  'Cybersecurity':      'background:rgba(244,63,94,0.12);color:#fb7185;',
  'Cloud Computing':    'background:rgba(245,158,11,0.12);color:#fcd34d;',
  'UX Design':          'background:rgba(167,139,250,0.12);color:#c4b5fd;',
  'Mobile Development': 'background:rgba(251,146,60,0.12);color:#fdba74;',
  'DevOps Engineering': 'background:rgba(148,163,184,0.12);color:#94a3b8;',
};
function courseBadgeStyle(course) {
  return COURSE_COLORS[course] || 'background:rgba(255,255,255,0.06);color:var(--text-2);';
}

// ─── Close modals on backdrop click ──────────────────────────
document.addEventListener('click', e => {
  if (e.target.classList.contains('overlay') && e.target.classList.contains('open')) {
    document.querySelectorAll('.overlay.open').forEach(m => m.classList.remove('open'));
    resetModalBtn();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.open').forEach(m => m.classList.remove('open'));
    resetModalBtn();
  }
});
