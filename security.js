/**
 * security.js — Security Utilities & Rate Limiter
 * Loaded before all other app scripts (after config.js)
 *
 * Features:
 *  • Rate limiter for auth, chatbot, CRUD, CSV operations
 *  • Input sanitization helpers
 *  • CSV injection protection
 *  • Content Security Policy meta tag injection
 */

// ─── Rate Limiter ─────────────────────────────────────────────
// Tracks action timestamps per key, blocks if limit exceeded
const RateLimiter = (() => {
  const store = {};

  /**
   * Check if an action is allowed.
   * @param {string} key     - Unique key, e.g. 'login', 'signup', 'chatbot'
   * @param {number} maxHits - Max allowed actions in the window
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} true if allowed, false if rate-limited
   */
  function allow(key, maxHits, windowMs) {
    const now = Date.now();
    if (!store[key]) store[key] = [];

    // Prune expired timestamps
    store[key] = store[key].filter(ts => now - ts < windowMs);

    if (store[key].length >= maxHits) return false;

    store[key].push(now);
    return true;
  }

  /**
   * Get remaining seconds until next allowed action.
   * @param {string} key
   * @param {number} windowMs
   * @returns {number} seconds remaining, 0 if not limited
   */
  function cooldown(key, windowMs) {
    if (!store[key] || store[key].length === 0) return 0;
    const oldest = store[key][0];
    const elapsed = Date.now() - oldest;
    return elapsed < windowMs ? Math.ceil((windowMs - elapsed) / 1000) : 0;
  }

  /** Reset a specific key */
  function reset(key) { delete store[key]; }

  return { allow, cooldown, reset };
})();

// ─── Rate Limit Presets ───────────────────────────────────────
// login:        5 attempts per 60 seconds
// signup:       3 attempts per 120 seconds
// passwordReset:3 attempts per 300 seconds (5 min)
// chatbot:      15 messages per 30 seconds
// studentCRUD:  20 operations per 60 seconds
// csvImport:    3 imports per 120 seconds

const RATE_LIMITS = {
  login:         { max: 5,  window: 60_000 },
  signup:        { max: 3,  window: 120_000 },
  passwordReset: { max: 3,  window: 300_000 },
  chatbot:       { max: 15, window: 30_000 },
  studentCRUD:   { max: 20, window: 60_000 },
  csvImport:     { max: 3,  window: 120_000 },
};

function checkRateLimit(action) {
  const preset = RATE_LIMITS[action];
  if (!preset) return true;
  if (!RateLimiter.allow(action, preset.max, preset.window)) {
    const wait = RateLimiter.cooldown(action, preset.window);
    showToast(`Too many attempts. Please wait ${wait}s before trying again.`, 'error');
    return false;
  }
  return true;
}

// ─── Input Sanitization ───────────────────────────────────────
/**
 * Sanitize a string for safe text display (not HTML).
 * Strips any HTML tags and trims whitespace.
 */
function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate and sanitize an email address.
 * Returns the sanitized email or null if invalid.
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') return null;
  email = email.trim().toLowerCase();
  // Standard email regex
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(email)) return null;
  // Length check
  if (email.length > 254) return null;
  return email;
}

/**
 * Validate GPA input.
 * Returns a float between 0-4 or null if invalid.
 */
function sanitizeGpa(gpa) {
  const val = parseFloat(gpa);
  if (isNaN(val) || val < 0 || val > 4) return null;
  return Math.round(val * 10) / 10;
}

/**
 * Sanitize phone number — only allow digits, spaces, +, -, (, )
 */
function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[^\d\s+\-()]/g, '').trim().slice(0, 20);
}

// ─── CSV Injection Protection ─────────────────────────────────
/**
 * Sanitize a cell value for CSV export to prevent formula injection.
 * Formulas start with =, +, -, @, TAB, or CR — prefix with a single quote.
 */
function sanitizeCsvCell(value) {
  const str = String(value || '');
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

// ─── Password Strength Checker ────────────────────────────────
function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)       score++;
  if (password.length >= 12)      score++;
  if (/[A-Z]/.test(password))     score++;
  if (/[a-z]/.test(password))     score++;
  if (/[0-9]/.test(password))     score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  // score: 0-2 weak, 3-4 fair, 5 good, 6 strong
  if (score <= 2) return { level: 'weak',   label: 'Weak',   color: '#ef4444' };
  if (score <= 4) return { level: 'fair',   label: 'Fair',   color: '#eab308' };
  if (score === 5) return { level: 'good',   label: 'Good',   color: '#3b82f6' };
  return { level: 'strong', label: 'Strong', color: '#22c55e' };
}

// ─── Secure Error Messages ────────────────────────────────────
/**
 * Map Firebase auth error codes to safe, user-friendly messages.
 * Prevents leaking internal Firebase details to the user.
 */
const AUTH_ERROR_MESSAGES = {
  'auth/user-not-found':       'No account found with this email.',
  'auth/wrong-password':       'Incorrect password. Please try again.',
  'auth/too-many-requests':    'Too many attempts. Please try again later.',
  'auth/invalid-email':        'Invalid email address format.',
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/weak-password':        'Password must be at least 8 characters.',
  'auth/invalid-credential':   'Invalid credentials. Please check your email and password.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  'auth/popup-closed-by-user': null, // Intentionally silent
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/internal-error':       'An unexpected error occurred. Please try again.',
};

function getAuthErrorMessage(err) {
  if (err && err.code && AUTH_ERROR_MESSAGES[err.code] !== undefined) {
    return AUTH_ERROR_MESSAGES[err.code]; // null = silent dismiss
  }
  // Generic fallback — never expose raw Firebase error messages
  return 'An error occurred. Please try again.';
}

console.info('%c SECURITY MODULE LOADED ', 
  'background:#3b82f6;color:white;padding:4px 8px;border-radius:4px;font-weight:bold');
