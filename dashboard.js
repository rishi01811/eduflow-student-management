/**
 * dashboard.js — Main Dashboard Controller
 * Handles: navigation, chart rendering, weather API, init
 */

// ─── Chart Instances ──────────────────────────────────────────
let registrationsChart = null;
let courseChart        = null;
let barChart           = null;
let statusChart        = null;
let gpaChart           = null;
window.dashboardChartsReady = false;

// ─── Chart.js Global Defaults ────────────────────────────────
if (typeof Chart !== 'undefined') {
  Chart.defaults.color            = '#a1a1aa';
  Chart.defaults.borderColor      = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family      = "'Outfit', sans-serif";
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.tooltip.backgroundColor = '#18181b';
  Chart.defaults.plugins.tooltip.borderColor     = 'rgba(255,255,255,0.1)';
  Chart.defaults.plugins.tooltip.borderWidth     = 1;
  Chart.defaults.plugins.tooltip.padding         = 12;
  Chart.defaults.plugins.tooltip.titleColor      = '#f4f4f5';
  Chart.defaults.plugins.tooltip.bodyColor       = '#a1a1aa';
}

// ─── Color Palette for charts ─────────────────────────────────
const CHART_COLORS = [
  '#6366f1','#22d3ee','#10b981','#f59e0b','#f43f5e',
  '#818cf8','#67e8f9','#6ee7b7','#fcd34d','#fb7185',
  '#a78bfa','#34d399'
];

// ─── Navigation ───────────────────────────────────────────────
let currentSection = 'overview';

function navigate(section) {
  currentSection = section;

  // Update sidebar active state — uses .sb-item class and 'on' toggle
  document.querySelectorAll('.sb-item').forEach(el => el.classList.remove('on'));
  const activeNav = document.getElementById('nav-' + section);
  if (activeNav) activeNav.classList.add('on');

  // Hide all sections — uses .pg-section class and 'on' toggle
  document.querySelectorAll('.pg-section').forEach(s => s.classList.remove('on'));
  const target = document.getElementById(`section-${section}`);
  if (target) target.classList.add('on');

  // Section-specific actions
  if (section === 'analytics') initAnalyticsCharts();
  if (section === 'csv') updateExportCount();
  closeSidebar();
}

// ─── Mobile Sidebar ───────────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('sb-open');
  document.getElementById('sbOverlay')?.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('sb-open');
  document.getElementById('sbOverlay')?.classList.remove('show');
  document.body.style.overflow = '';
}

// ─── Date greeting ────────────────────────────────────────────
function updateDateDisplay() {
  const el = document.getElementById('overviewDate');
  if (!el) return;
  const now = new Date();
  const h   = now.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const greetEl = document.getElementById('greetingTitle');
  if (greetEl) greetEl.textContent = greeting + ' ☀️';
  el.textContent = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ─── User profile in UI ───────────────────────────────────────
function populateUserUI(user) {
  const name   = user.displayName || user.name || user.email?.split('@')[0] || 'Admin';
  const initAv = name.split(' ').slice(0,2).map(p=>p[0]?.toUpperCase()||'').join('');
  const el = id => document.getElementById(id);
  if (el('sidebarUserName')) el('sidebarUserName').textContent = name;
  if (el('topbarName'))      el('topbarName').textContent = name.split(' ')[0];
  if (el('sidebarAvatar'))   el('sidebarAvatar').textContent = initAv;
  if (el('topbarAvatar'))    el('topbarAvatar').textContent = initAv;
  if (el('settingsName'))    el('settingsName').value = name;
  if (el('settingsEmail'))   el('settingsEmail').value = user.email || '';
}

// ─── Weather Widget ───────────────────────────────────────────
async function loadWeather() {
  try {
    // Try to get user location
    const pos = await new Promise((res, rej) =>
      navigator.geolocation?.getCurrentPosition(res, rej, { timeout: 5000 })
    ).catch(() => null);

    let lat = 40.7128, lon = -74.0060, city = 'New York'; // Default

    if (pos) {
      lat  = pos.coords.latitude;
      lon  = pos.coords.longitude;
      try {
        const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const geoData = await geo.json();
        city = geoData.address?.city || geoData.address?.town || geoData.address?.state || 'Your Location';
      } catch {}
    }

    // Fetch weather from Open-Meteo (free, no API key)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&temperature_unit=celsius&windspeed_unit=kmh`;
    const res  = await fetch(url);
    const data = await res.json();
    const w    = data.current_weather;

    const weatherIcons = {
      0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
      45:'🌫️', 48:'🌫️',
      51:'🌦️', 53:'🌦️', 55:'🌧️',
      61:'🌧️', 63:'🌧️', 65:'🌧️',
      71:'❄️', 73:'❄️', 75:'❄️',
      80:'🌦️', 81:'🌦️', 82:'⛈️',
      95:'⛈️', 96:'⛈️', 99:'⛈️'
    };
    const conditions = {
      0:'Clear Sky', 1:'Mainly Clear', 2:'Partly Cloudy', 3:'Overcast',
      45:'Foggy', 48:'Icy Fog',
      51:'Light Drizzle', 53:'Drizzle', 55:'Heavy Drizzle',
      61:'Light Rain', 63:'Moderate Rain', 65:'Heavy Rain',
      71:'Light Snow', 73:'Snow', 75:'Heavy Snow',
      80:'Rain Showers', 81:'Moderate Showers', 82:'Violent Showers',
      95:'Thunderstorm', 96:'Hail Storm', 99:'Heavy Hail'
    };

    const code = w.weathercode;
    document.getElementById('weatherIcon').textContent      = weatherIcons[code] || '🌡️';
    document.getElementById('weatherTemp').textContent      = Math.round(w.temperature) + '°C';
    document.getElementById('weatherCondition').textContent = conditions[code] || 'Unknown';
    document.getElementById('weatherLocation').textContent  = `📍 ${city}`;
  } catch (err) {
    document.getElementById('weatherTemp').textContent      = '—°';
    document.getElementById('weatherCondition').textContent = 'Weather unavailable';
    document.getElementById('weatherLocation').textContent  = 'Location not shared';
    console.warn('Weather fetch failed:', err);
  }
}

// ─── Overview Charts ──────────────────────────────────────────
function initOverviewCharts() {
  initRegistrationsChart('6m');
  initCourseDonutChart();
  window.dashboardChartsReady = true;
}

function initRegistrationsChart(period = '6m') {
  const canvas = document.getElementById('registrationsChart');
  if (!canvas) return;

  const months = period === '12m' ? 12 : 6;
  const labels = [];
  const data   = [];
  const now    = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d    = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key  = d.toISOString().slice(0, 7);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    if (typeof allStudents !== 'undefined' && allStudents.length) {
      const count = allStudents.filter(s => (s.enrolledDate||'').startsWith(key)).length;
      data.push(count || Math.floor(Math.random() * 8) + 2);
    } else {
      data.push(Math.floor(Math.random() * 15) + 3);
    }
  }

  if (registrationsChart) registrationsChart.destroy();

  registrationsChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'New Students',
        data,
        borderColor:     '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        borderWidth:     2.5,
        fill:            true,
        tension:         0.45,
        pointBackgroundColor: '#6366f1',
        pointBorderColor:     '#09090b',
        pointBorderWidth:     2,
        pointRadius:          4,
        pointHoverRadius:     7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} new student${ctx.parsed.y !== 1 ? 's' : ''}`
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' } },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { stepSize: 1 },
          beginAtZero: true
        }
      }
    }
  });
}

function initCourseDonutChart() {
  const canvas = document.getElementById('courseChart');
  if (!canvas) return;

  const courseMap = {};
  (typeof allStudents !== 'undefined' ? allStudents : []).forEach(s => {
    if (s.course) courseMap[s.course] = (courseMap[s.course] || 0) + 1;
  });

  const labels = Object.keys(courseMap);
  const data   = Object.values(courseMap);

  if (courseChart) courseChart.destroy();

  courseChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: CHART_COLORS,
        borderColor:     '#09090b',
        borderWidth:     3,
        hoverOffset:     6,
      }]
    },
    options: {
      responsive: true,
      cutout:    '70%',
      plugins: {
        legend: {
          position:  'bottom',
          labels:    { padding: 10, font: { size: 11 } }
        }
      }
    }
  });
}

function switchChartPeriod(period, btn) {
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  initRegistrationsChart(period);
}

// ─── Analytics Charts ─────────────────────────────────────────
function initAnalyticsCharts() {
  const students = typeof allStudents !== 'undefined' ? allStudents : [];
  initBarChart(students);
  initStatusChart(students);
  initGpaChart(students);
  renderTopCourses(students);
}

function initBarChart(students) {
  const canvas = document.getElementById('barChart');
  if (!canvas) return;
  const courseMap = {};
  students.forEach(s => { if(s.course) courseMap[s.course] = (courseMap[s.course]||0)+1; });
  const labels = Object.keys(courseMap).sort((a,b) => courseMap[b]-courseMap[a]);
  const data   = labels.map(l => courseMap[l]);
  if (barChart) barChart.destroy();
  barChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Students',
        data,
        backgroundColor: CHART_COLORS,
        borderRadius:    6,
        borderSkipped:   false,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 30 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

function initStatusChart(students) {
  const canvas = document.getElementById('statusChart');
  if (!canvas) return;
  const counts = { Active: 0, Inactive: 0, Pending: 0 };
  students.forEach(s => { if (s.status in counts) counts[s.status]++; });
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Active','Inactive','Pending'],
      datasets: [{
        data: [counts.Active, counts.Inactive, counts.Pending],
        backgroundColor: ['#10b981','#4a5568','#f59e0b'],
        borderColor:     '#09090b',
        borderWidth:     3,
        hoverOffset:     6,
      }]
    },
    options: {
      responsive: true, cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { padding: 12 } } }
    }
  });
}

function initGpaChart(students) {
  const canvas = document.getElementById('gpaChart');
  if (!canvas) return;
  const buckets = { '<2.0':0,'2.0–2.5':0,'2.5–3.0':0,'3.0–3.5':0,'3.5–4.0':0,'4.0':0 };
  students.forEach(s => {
    const g = parseFloat(s.gpa);
    if (!g) return;
    if (g < 2.0)       buckets['<2.0']++;
    else if (g < 2.5)  buckets['2.0–2.5']++;
    else if (g < 3.0)  buckets['2.5–3.0']++;
    else if (g < 3.5)  buckets['3.0–3.5']++;
    else if (g < 4.0)  buckets['3.5–4.0']++;
    else               buckets['4.0']++;
  });
  if (gpaChart) gpaChart.destroy();
  gpaChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: Object.keys(buckets),
      datasets: [{
        label: 'Students',
        data:  Object.values(buckets),
        backgroundColor: 'rgba(99,102,241,0.6)',
        borderColor:     '#6366f1',
        borderWidth:     1.5,
        borderRadius:    4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

function renderTopCourses(students) {
  const el = document.getElementById('topCoursesList');
  if (!el) return;
  const courseMap = {};
  students.forEach(s => { if(s.course) courseMap[s.course] = (courseMap[s.course]||0)+1; });
  const sorted = Object.entries(courseMap).sort((a,b) => b[1]-a[1]).slice(0,6);
  const max    = sorted[0]?.[1] || 1;
  el.innerHTML = sorted.map(([course, count], i) => `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:600;color:var(--text-2);">${typeof escHtml === 'function' ? escHtml(course) : course}</span>
        <span style="font-size:12px;font-weight:700;color:${CHART_COLORS[i]};">${count}</span>
      </div>
      <div style="height:4px;background:var(--border);border-radius:99px;overflow:hidden;">
        <div style="height:100%;width:${(count/max*100).toFixed(0)}%;background:${CHART_COLORS[i]};border-radius:99px;transition:width 0.6s ease;"></div>
      </div>
    </div>`).join('');
}

// ─── Refresh Charts (called when student data updates) ────────
function refreshCharts() {
  if (currentSection === 'overview') {
    initOverviewCharts();
  } else if (currentSection === 'analytics') {
    initAnalyticsCharts();
  }
}

// ─── Main Init ────────────────────────────────────────────────
 document.addEventListener('DOMContentLoaded', () => {
  console.log('[EduFlow] DOMContentLoaded — starting auth guard');
  // Auth guard
  initAuthGuard(async user => {
    console.log('[EduFlow] Auth callback fired, user:', user?.uid || user?.email || 'unknown');
    populateUserUI(user);
    updateDateDisplay();

    try {
      await initStudents(user);   // wait for Firestore data
      console.log('[EduFlow] initStudents complete, allStudents count:', allStudents.length);
    } catch (err) {
      console.error('[EduFlow] initStudents failed:', err);
    }

    initOverviewCharts();   // charts render after data loads
    loadWeather();
  });
});