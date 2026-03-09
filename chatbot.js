/**
 * chatbot.js — EduBot AI Chatbot Widget
 * Keyword-based response engine with dynamic DOM updates
 */

// ─── Bot Response Database ────────────────────────────────────
const BOT_RESPONSES = [
  {
    keywords: ['hello','hi','hey','howdy','good morning','good afternoon'],
    reply: "Hi there! 👋 I'm EduBot, your EduFlow assistant. I can help with student management, analytics, CSV import, and more. What can I do for you today?"
  },
  {
    keywords: ['student','students','how many','total','count'],
    reply: () => {
      const count = typeof allStudents !== 'undefined' ? allStudents.length : 0;
      const active = typeof allStudents !== 'undefined' ? allStudents.filter(s=>s.status==='Active').length : 0;
      return `📊 You currently have <strong>${count} students</strong> in the system, with <strong>${active} active</strong>. Head to the Students tab to view and manage them!`;
    }
  },
  {
    keywords: ['add student','new student','create student','enroll'],
    reply: "To add a new student, navigate to the <strong>Students</strong> section and click the <strong>'+ Add Student'</strong> button. You can also bulk-import via CSV in the <strong>Import/Export</strong> section! 📝"
  },
  {
    keywords: ['delete','remove','remove student'],
    reply: "To delete a student, go to the <strong>Students</strong> tab, find the student in the table, and click the 🗑 delete icon. You'll be asked to confirm before anything is removed."
  },
  {
    keywords: ['edit','update','modify','change'],
    reply: "To edit a student's information, click the ✏️ edit icon next to their name in the Students table. You can update their name, email, course, GPA, status, and more."
  },
  {
    keywords: ['csv','import','upload','bulk'],
    reply: "Use the <strong>Import/Export</strong> section (📁 in the sidebar) to bulk-add students via CSV. Download the template first to see the correct format. You can drag & drop your file or click to browse!"
  },
  {
    keywords: ['export','download','csv export'],
    reply: "Go to <strong>Import/Export</strong> and click <strong>'Export All Students'</strong> to download a CSV file of all your student records. It's UTF-8 encoded and includes 8 data columns."
  },
  {
    keywords: ['chart','graph','analytics','data','insight'],
    reply: "Check out the <strong>Analytics</strong> section 📈 for detailed charts including course distribution, status breakdown, GPA histogram, and monthly enrollment trends — all powered by Chart.js!"
  },
  {
    keywords: ['search','find','filter','look up'],
    reply: "You can search students in the <strong>Students</strong> tab using the search box. Filter by course or status using the dropdowns. You can also click column headers to sort the table!"
  },
  {
    keywords: ['course','courses','subjects'],
    reply: () => {
      const courses = typeof allStudents !== 'undefined' ? [...new Set(allStudents.map(s=>s.course))].filter(Boolean) : [];
      return courses.length
        ? `🎓 You have <strong>${courses.length} active courses</strong>: ${courses.join(', ')}. View them all in the <strong>Courses</strong> section!`
        : "🎓 No courses found yet. Add students with course assignments to populate this section.";
    }
  },
  {
    keywords: ['firebase','database','firestore','real','cloud'],
    reply: "EduFlow uses <strong>Firebase Firestore</strong> for real-time cloud storage and <strong>Firebase Auth</strong> for secure login. Currently running in Demo Mode — add your Firebase config in <code>config.js</code> to enable cloud sync!"
  },
  {
    keywords: ['login','logout','sign in','sign out','auth'],
    reply: "Authentication is handled by Firebase Auth. You can sign in with email/password or Google. To log out, click the ⎋ icon in the sidebar footer or go to Settings."
  },
  {
    keywords: ['password','reset','forgot'],
    reply: "To reset your password, go to the login page and click <strong>'Forgot password?'</strong>. A reset link will be sent to your email (requires Firebase setup for email delivery)."
  },
  {
    keywords: ['weather','temperature','forecast'],
    reply: "The weather widget on the Overview dashboard shows real-time conditions from Open-Meteo API based on your browser's location. It refreshes automatically when you load the dashboard! 🌤️"
  },
  {
    keywords: ['help','support','documentation','guide','docs'],
    reply: "Check out the <strong>Help & Docs</strong> section in the sidebar for guides on getting started, CSV import, and Firebase setup. Or just keep asking me — I'm here 24/7! 😊"
  },
  {
    keywords: ['gpa','grade','performance','score'],
    reply: () => {
      if (typeof allStudents === 'undefined' || !allStudents.length) return "GPA data isn't available yet — add students first!";
      const gpas = allStudents.filter(s=>s.gpa).map(s=>parseFloat(s.gpa));
      const avg  = (gpas.reduce((a,b)=>a+b,0)/gpas.length).toFixed(2);
      const high = Math.max(...gpas).toFixed(1);
      return `📚 Current class average GPA is <strong>${avg}</strong>. Highest GPA is <strong>${high}</strong>. Check the Analytics section for the full GPA distribution chart!`;
    }
  },
  {
    keywords: ['settings','profile','account','preferences'],
    reply: "Go to the <strong>Settings</strong> section (⚙️ in the sidebar) to update your display name, view your plan details, and manage your account."
  },
  {
    keywords: ['mobile','responsive','phone','tablet'],
    reply: "EduFlow is fully responsive! It works great on mobile and tablet. The sidebar collapses on small screens — tap the ☰ hamburger menu to open it. 📱"
  },
  {
    keywords: ['plan','pricing','upgrade','free','pro'],
    reply: "EduFlow is free for up to 100 students. The Pro Plan (shown in Settings) removes all limits and includes priority support. Upgrade when you're ready to scale! 🚀"
  },
  {
    keywords: ['thank','thanks','great','awesome','nice','good'],
    reply: "You're very welcome! 😊 Let me know if there's anything else I can help you with."
  },
  {
    keywords: ['bye','goodbye','see you','cya','later'],
    reply: "Goodbye! 👋 I'll be here whenever you need me. Have a great day!"
  },
];

// Default fallback
const FALLBACK_RESPONSES = [
  "I'm not sure about that one! 🤔 Try asking about students, courses, CSV import/export, analytics, or Firebase setup.",
  "Hmm, I didn't quite catch that. You can ask me about managing students, viewing analytics, or importing CSV files!",
  "That's outside my current knowledge base. 📚 Try asking: 'how do I add a student?' or 'show me analytics'.",
  "I'm still learning! Try asking about student management, CSV import, or how to use the dashboard features."
];

// ─── Chatbot State ────────────────────────────────────────────
let chatOpen = false;
let messageCount = 0;

// ─── Toggle ───────────────────────────────────────────────────
function toggleChatbot() {
  chatOpen = !chatOpen;
  const panel = document.getElementById('chatbotPanel');
  const fab   = document.getElementById('chatbotFab');
  if (!panel) return;

  panel.classList.toggle('open', chatOpen);
  if (fab) fab.textContent = chatOpen ? '✕' : '🤖';

  if (chatOpen && messageCount === 0) {
    // Welcome message
    setTimeout(() => addBotMessage("Hey! 👋 I'm <strong>EduBot</strong>, your EduFlow assistant. I can help you manage students, understand analytics, import CSV files, and more. What would you like to know?"), 300);
    setTimeout(() => addQuickReplies(['How many students?', 'Add a student', 'Import CSV', 'View analytics']), 800);
  }

  if (chatOpen) {
    setTimeout(() => document.getElementById('chatInput')?.focus(), 350);
  }
}

// ─── Send Message ─────────────────────────────────────────────
function sendChatMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;

  // Rate limit check
  if (typeof checkRateLimit === 'function' && !checkRateLimit('chatbot')) return;

  input.value = '';
  addUserMessage(message);
  showTypingIndicator();
  setTimeout(() => {
    removeTypingIndicator();
    const response = getBotResponse(message);
    addBotMessage(response);
  }, 600 + Math.random() * 600);
}

// ─── Get Bot Response ─────────────────────────────────────────
function getBotResponse(input) {
  const lower = input.toLowerCase();
  for (const rule of BOT_RESPONSES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return typeof rule.reply === 'function' ? rule.reply() : rule.reply;
    }
  }
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

// ─── DOM Helpers — uses correct CSS classes from dashboard.html ──
function addUserMessage(text) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  messageCount++;
  const el = document.createElement('div');
  el.className = 'bot-msg u';
  el.innerHTML = `<div class="bot-bubble">${escHtml(text)}</div>`;
  msgs.appendChild(el);
  scrollToBottom();
}

function addBotMessage(html) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  messageCount++;
  const el = document.createElement('div');
  el.className = 'bot-msg b';
  el.innerHTML = `
    <div class="bot-av">🤖</div>
    <div class="bot-bubble">${html}</div>`;
  msgs.appendChild(el);
  scrollToBottom();
}

function addQuickReplies(options) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const el = document.createElement('div');
  el.className = 'bot-msg b';
  el.style.flexWrap = 'wrap';
  el.innerHTML = `
    <div class="bot-av" style="visibility:hidden;">🤖</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
      ${options.map(o => `<button onclick="handleQuickReply('${escAttr(o)}')" style="background:var(--bg-2);border:1px solid var(--border);color:var(--blue);padding:5px 12px;border-radius:99px;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:var(--font);" onmouseover="this.style.background='rgba(59,130,246,0.15)'" onmouseout="this.style.background='var(--bg-2)'">${escHtml(o)}</button>`).join('')}
    </div>`;
  msgs.appendChild(el);
  scrollToBottom();
}

function handleQuickReply(text) {
  addUserMessage(text);
  showTypingIndicator();
  setTimeout(() => {
    removeTypingIndicator();
    addBotMessage(getBotResponse(text));
  }, 500);
}

function showTypingIndicator() {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const el = document.createElement('div');
  el.className = 'bot-msg b';
  el.id = 'typingIndicator';
  el.innerHTML = `
    <div class="bot-av">🤖</div>
    <div class="bot-bubble" style="padding:10px 14px;">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>`;
  msgs.appendChild(el);
  scrollToBottom();
}

function removeTypingIndicator() {
  document.getElementById('typingIndicator')?.remove();
}

function scrollToBottom() {
  const msgs = document.getElementById('chatMessages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}
