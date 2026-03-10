/**
 * auth.js — Firebase Authentication Handler
 * Handles login, signup, Google sign-in, logout, password reset
 * Falls back to localStorage in DEMO_MODE
 */

// ─── Toast Helper ────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const iconSpan = document.createElement('span');
  iconSpan.textContent = icons[type] || 'ℹ️';
  toast.appendChild(iconSpan);
  const msgSpan = document.createElement('span');
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Validation Helpers ──────────────────────────────────────
function showErr(id, show = true) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('show', show);
}
function clearErrors(...ids) {
  ids.forEach(id => showErr(id, false));
}
function setLoading(btnId, spinnerId, isLoading) {
  const btn = document.getElementById(btnId);
  const sp  = document.getElementById(spinnerId);
  if (btn)  btn.disabled = isLoading;
  if (sp)   sp.classList.toggle('hidden', !isLoading);
}

// ─── Tab Switcher ────────────────────────────────────────────
function switchTab(tab) {
  const loginForm  = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const forgotForm = document.getElementById('forgotForm');
  const tabLogin   = document.getElementById('tabLogin');
  const tabSignup  = document.getElementById('tabSignup');

  [loginForm, signupForm, forgotForm].forEach(f => f && f.classList.add('hidden'));

  if (tab === 'login')  { loginForm?.classList.remove('hidden');  tabLogin?.classList.add('on');    tabSignup?.classList.remove('on'); }
  if (tab === 'signup') { signupForm?.classList.remove('hidden'); tabSignup?.classList.add('on');   tabLogin?.classList.remove('on'); }
  if (tab === 'forgot') { forgotForm?.classList.remove('hidden'); tabLogin?.classList.remove('on'); tabSignup?.classList.remove('on'); }
}

function showForgotPassword() { switchTab('forgot'); }

// ─── Demo Login (no Firebase) ────────────────────────────────
function handleDemoLogin() {
  const demoUser = { uid: 'demo-user-001', name: 'Demo Admin', email: 'demo@eduflow.app' };
  localStorage.setItem('eduflow_user', JSON.stringify(demoUser));
  localStorage.setItem('eduflow_demo_mode', 'true');
  showToast('Welcome to Demo Mode! 🎉', 'success');
  setTimeout(() => window.location.href = 'dashboard.html', 1000);
}

// ─── Login ───────────────────────────────────────────────────
function handleLogin() {
  clearErrors('loginEmailErr', 'loginPasswordErr', 'loginGeneralErr');
  const email    = document.getElementById('loginEmail')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;

  let valid = true;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('loginEmailErr'); valid = false; }
  if (!password || password.length < 6) { showErr('loginPasswordErr'); valid = false; }
  if (!valid) return;

  // Rate limit check
  if (typeof checkRateLimit === 'function' && !checkRateLimit('login')) return;

  // Demo mode bypass
  if (window.DEMO_MODE) {
    handleDemoLogin(); return;
  }

  setLoading('loginBtn', 'loginSpinner', true);

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      showToast('Welcome back! Redirecting…', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 800);
    })
    .catch(err => {
      setLoading('loginBtn', 'loginSpinner', false);
      const msg = typeof getAuthErrorMessage === 'function' ? getAuthErrorMessage(err) : 'An error occurred. Please try again.';
      if (msg) {
        const el = document.getElementById('loginGeneralErr');
        if (el) { el.textContent = msg; el.classList.add('show'); }
      }
    });
}

// ─── Signup ──────────────────────────────────────────────────
function handleSignup() {
  clearErrors('signupNameErr', 'signupEmailErr', 'signupPasswordErr', 'signupConfirmErr', 'signupGeneralErr');
  const name     = document.getElementById('signupName')?.value?.trim();
  const email    = document.getElementById('signupEmail')?.value?.trim();
  const password = document.getElementById('signupPassword')?.value;
  const confirm  = document.getElementById('signupConfirm')?.value;

  let valid = true;
  if (!name || name.length < 2)            { showErr('signupNameErr'); valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('signupEmailErr'); valid = false; }
  if (!password || password.length < 8)    { showErr('signupPasswordErr'); valid = false; }
  if (password !== confirm)                { showErr('signupConfirmErr'); valid = false; }
  if (!valid) return;

  // Rate limit check
  if (typeof checkRateLimit === 'function' && !checkRateLimit('signup')) return;

  if (window.DEMO_MODE) {
    handleDemoLogin(); return;
  }

  setLoading('signupBtn', 'signupSpinner', true);

  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => cred.user.updateProfile({ displayName: name }))
    .then(() => {
      showToast('Account created! Welcome to EduFlow 🎉', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 800);
    })
    .catch(err => {
      setLoading('signupBtn', 'signupSpinner', false);
      const msg = typeof getAuthErrorMessage === 'function' ? getAuthErrorMessage(err) : 'An error occurred. Please try again.';
      if (msg) {
        const el = document.getElementById('signupGeneralErr');
        if (el) { el.textContent = msg; el.classList.add('show'); }
      }
    });
}

// ─── Google Sign-In (via Google Identity Services) ───────────
function handleGoogleSignIn() {
  if (window.DEMO_MODE) { handleDemoLogin(); return; }

  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'email profile',
    callback: (response) => {
      if (response.error) {
        console.error('GIS error:', response);
        showToast('Google sign-in failed. Please try again.', 'error');
        return;
      }
      // Use the access token to create a Firebase credential
      const credential = firebase.auth.GoogleAuthProvider.credential(null, response.access_token);
      auth.signInWithCredential(credential)
        .then(() => {
          showToast('Signed in with Google! ✅', 'success');
          setTimeout(() => window.location.href = 'dashboard.html', 800);
        })
        .catch(err => {
          console.error('Firebase credential error:', err);
          showToast('Google sign-in failed. Please try again.', 'error');
        });
    },
  });

  tokenClient.requestAccessToken();
}

// ─── Password Reset ──────────────────────────────────────────
function handlePasswordReset() {
  const email  = document.getElementById('resetEmail')?.value?.trim();
  const msgEl  = document.getElementById('resetMsg');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (msgEl) { msgEl.textContent = 'Please enter a valid email.'; msgEl.style.color = 'var(--red)'; msgEl.style.display = 'block'; }
    return;
  }
  // Rate limit check
  if (typeof checkRateLimit === 'function' && !checkRateLimit('passwordReset')) return;
  if (window.DEMO_MODE) {
    if (msgEl) { msgEl.textContent = 'Reset email sent (demo mode)!'; msgEl.style.color = 'var(--green)'; msgEl.style.display = 'block'; }
    return;
  }
  auth.sendPasswordResetEmail(email)
    .then(() => {
      if (msgEl) { msgEl.textContent = 'Reset link sent! Check your inbox.'; msgEl.style.color = 'var(--green)'; msgEl.style.display = 'block'; }
    })
    .catch(err => {
      const msg = typeof getAuthErrorMessage === 'function' ? getAuthErrorMessage(err) : 'An error occurred. Please try again.';
      if (msgEl && msg) { msgEl.textContent = msg; msgEl.style.color = 'var(--red)'; msgEl.style.display = 'block'; }
    });
}

// ─── Logout ──────────────────────────────────────────────────
function handleLogout() {
  localStorage.removeItem('eduflow_user');
  localStorage.removeItem('eduflow_demo_mode');
  if (!window.DEMO_MODE) {
    auth.signOut().catch(console.error);
  }
  window.location.href = 'login.html';
}

// ─── Auth Guard (for dashboard.html) ────────────────────────
function initAuthGuard(callback) {
  if (window.DEMO_MODE) {
    // Demo mode: check localStorage for demo user
    const demoUser = localStorage.getItem('eduflow_user');
    if (demoUser) {
      const user = JSON.parse(demoUser);
      if (typeof callback === 'function') callback(user);
    } else {
      window.location.href = 'login.html';
    }
    return;
  }
  // Firebase auth state
  auth.onAuthStateChanged(user => {
    if (user) {
      if (typeof callback === 'function') callback(user);
    } else {
      window.location.href = 'login.html';
    }
  });
}

// ─── Save Settings ───────────────────────────────────────────
function saveSettings() {
  const name = document.getElementById('settingsName')?.value?.trim();
  if (!name) { showToast('Please enter a display name.', 'error'); return; }
  
  if (window.DEMO_MODE) {
    const user = JSON.parse(localStorage.getItem('eduflow_user') || '{}');
    user.name = name;
    localStorage.setItem('eduflow_user', JSON.stringify(user));
    document.getElementById('sidebarUserName').textContent = name;
    document.getElementById('topbarName').textContent = name.split(' ')[0];
    showToast('Settings saved!', 'success');
    return;
  }
  auth.currentUser?.updateProfile({ displayName: name })
    .then(() => showToast('Profile updated!', 'success'))
    .catch(err => showToast('Failed to update profile. Please try again.', 'error'));
}

function showDeleteAccount() {
  if (confirm('Are you absolutely sure? This cannot be undone.')) {
    showToast('Account deletion requires Firebase setup.', 'info');
  }
}

// ─── Auto-redirect if already logged in (login page) ────────
if (window.location.pathname.includes('login.html') || window.location.pathname.endsWith('login')) {
  if (window.DEMO_MODE) {
    const demoUser = localStorage.getItem('eduflow_user');
    if (demoUser) window.location.href = 'dashboard.html';
  } else if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(u => { if (u) window.location.href = 'dashboard.html'; });
  }
}
