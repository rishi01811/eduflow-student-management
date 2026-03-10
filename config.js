// ============================================================
// Firebase Configuration
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBoP3eZ6D08TKVYMQFVHHLkJkbKYPK9seY",
  authDomain: "eduflow-appsaas.firebaseapp.com",
  projectId: "eduflow-appsaas",
  storageBucket: "eduflow-appsaas.firebasestorage.app",
  messagingSenderId: "871386211552",
  appId: "1:871386211552:web:fbbb7d74b6c74fb36a1c85",
  measurementId: "G-LRTL3NKVB0"
};

// Google OAuth Client ID (from Google Cloud Console → Credentials → OAuth 2.0 Client IDs)
const GOOGLE_CLIENT_ID = "871386211552-7tlovt270aj5ttcgi84fv6hs7bg78u2j.apps.googleusercontent.com";

// Initialize Firebase (compat SDK)
firebase.initializeApp(firebaseConfig);

// Export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence for Firestore
db.enablePersistence().catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser');
  }
});

// ============================================================
// DEMO MODE is OFF — Firebase is configured with real credentials
// Clear any leftover demo mode data from localStorage
// ============================================================
window.DEMO_MODE = false;
localStorage.removeItem('eduflow_demo_mode');
localStorage.removeItem('eduflow_user');
localStorage.removeItem('eduflow_students');
console.info('%c FIREBASE MODE ACTIVE — Connected to Firestore ',
  'background:#22c55e;color:white;padding:4px 8px;border-radius:4px;font-weight:bold');
