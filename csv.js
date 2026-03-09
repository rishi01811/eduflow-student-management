/**
 * csv.js — CSV Import & Export Module
 * Handles drag-and-drop upload, parsing, validation, and CSV export
 */

// ─── State ───────────────────────────────────────────────────
let pendingCsvRows = [];

// ─── Required CSV headers ────────────────────────────────────
const REQUIRED_HEADERS = ['name', 'email', 'course'];
const ALL_HEADERS      = ['name', 'email', 'course', 'gpa', 'status', 'phone', 'address', 'enrolledDate'];

// ─── Drag-and-drop handlers ───────────────────────────────────
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('dropZone')?.classList.add('drag');
}
function handleDragLeave(e) {
  e.preventDefault();
  document.getElementById('dropZone')?.classList.remove('drag');
}
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('dropZone')?.classList.remove('drag');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleCsvFile(file);
}

// ─── File picker / drop handler ──────────────────────────────
function handleCsvFile(file) {
  if (!file) return;
  if (!file.name.endsWith('.csv')) {
    showToast('Please upload a .csv file.', 'error'); return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('File size exceeds 5MB limit.', 'error'); return;
  }
  const reader = new FileReader();
  reader.onload = e => parseCsv(e.target.result, file.name);
  reader.readAsText(file);
}

// ─── Parse CSV text ───────────────────────────────────────────
function parseCsv(text, filename) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) { showToast('CSV must have a header row and at least one data row.', 'error'); return; }

  // Parse header
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());

  // Validate required headers
  const missing = REQUIRED_HEADERS.filter(r => !headers.includes(r));
  if (missing.length) {
    showToast(`CSV missing required columns: ${missing.join(', ')}`, 'error');
    showCsvPreview(`❌ Invalid CSV format — missing columns: <strong>${missing.join(', ')}</strong>`, 'error');
    return;
  }

  // Parse rows
  const rows = [];
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseCsvLine(line);
    const row  = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });

    // Validate row
    const rowErrors = [];
    if (!row.name) rowErrors.push('name required');
    if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) rowErrors.push('invalid email');
    if (!row.course) rowErrors.push('course required');
    if (row.gpa && (isNaN(parseFloat(row.gpa)) || parseFloat(row.gpa) < 0 || parseFloat(row.gpa) > 4)) rowErrors.push('GPA must be 0–4');

    if (rowErrors.length) {
      errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
    } else {
      rows.push({
        name:         row.name,
        email:        row.email,
        course:       row.course,
        gpa:          parseFloat(row.gpa) || 0,
        status:       row.status || 'Active',
        phone:        row.phone || '',
        address:      row.address || '',
        enrolledDate: row.enrolleddate || row.enrolledDate || new Date().toISOString().split('T')[0],
        createdAt:    new Date().toISOString(),
      });
    }
  }

  pendingCsvRows = rows;

  // Show preview
  const importBtn = document.getElementById('importBtn');
  if (importBtn) {
    importBtn.style.display = rows.length > 0 ? 'flex' : 'none';
    importBtn.textContent = `⬆ Import ${rows.length} Students`;
  }

  let previewHtml = `
    <div style="font-weight:700;margin-bottom:8px;">📄 ${escHtml(filename)}</div>
    <div style="color:var(--green);margin-bottom:4px;">✅ ${rows.length} valid row(s) ready to import</div>`;
  if (errors.length) {
    previewHtml += `<div style="color:var(--red);margin-top:8px;">⚠️ ${errors.length} row(s) skipped:</div>
      <div style="margin-top:6px;font-size:11px;color:var(--red);line-height:1.8;">${errors.map(escHtml).join('<br/>')}</div>`;
  }
  if (rows.length > 0) {
    previewHtml += `
      <div style="margin-top:12px;font-size:11px;font-weight:700;color:var(--text-3);margin-bottom:6px;">PREVIEW (first 3 rows):</div>
      <div style="font-size:11px;font-family:var(--mono);color:var(--text-2);line-height:1.7;">
        ${rows.slice(0,3).map(r => `${escHtml(r.name)} &lt;${escHtml(r.email)}&gt; — ${escHtml(r.course)}`).join('<br/>')}
      </div>`;
  }
  showCsvPreview(previewHtml, rows.length > 0 ? 'success' : 'error');
}

function showCsvPreview(html, type = 'info') {
  const el = document.getElementById('csvPreview');
  if (!el) return;
  el.classList.add('show');
  el.style.borderLeft = `3px solid ${type==='error'?'var(--red)':type==='success'?'var(--green)':'var(--blue)'}`;
  el.innerHTML = html;
}

// ─── CSV line parser (handles quoted fields) ──────────────────
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ─── Import Rows to Store ─────────────────────────────────────
function importCsvStudents() {
  if (!pendingCsvRows.length) {
    showToast('No valid rows to import.', 'error'); return;
  }
  // Rate limit check
  if (typeof checkRateLimit === 'function' && !checkRateLimit('csvImport')) return;
  const importBtn = document.getElementById('importBtn');
  if (importBtn) { importBtn.textContent = '⏳ Importing…'; importBtn.disabled = true; }

  if (isDemo()) {
    pendingCsvRows.forEach(row => {
      row.id = 's' + Date.now() + Math.random().toString(36).slice(2);
      allStudents.unshift(row);
    });
    saveDemo();
    renderAll();
    finishImport(pendingCsvRows.length);
  } else {
    // Batch write to Firestore
    const batch = db.batch();
    pendingCsvRows.forEach(row => {
      const ref = getStudentsCollection().doc();
      batch.set(ref, row);
    });
    batch.commit()
      .then(() => finishImport(pendingCsvRows.length))
      .catch(err => {
        showToast('Import failed. Please try again.', 'error');
        if (importBtn) { importBtn.textContent = `⬆ Import ${pendingCsvRows.length} Students`; importBtn.disabled = false; }
      });
  }
}

function finishImport(count) {
  pendingCsvRows = [];
  const importBtn = document.getElementById('importBtn');
  if (importBtn) { importBtn.style.display = 'none'; importBtn.disabled = false; }
  document.getElementById('csvPreview')?.classList.remove('show');
  const fileInput = document.getElementById('csvFileInput');
  if (fileInput) fileInput.value = '';
  showToast(`✅ ${count} students imported successfully!`, 'success');
  navigate('students');
}

// ─── Export to CSV ────────────────────────────────────────────
function exportStudentsCsv() {
  if (!allStudents.length) {
    showToast('No students to export.', 'info'); return;
  }

  const rows = [
    // Header row
    ALL_HEADERS.join(','),
    // Data rows
    ...allStudents.map(s => ALL_HEADERS.map(h => {
      let val = s[h] || '';
      // CSV injection protection
      if (typeof sanitizeCsvCell === 'function') val = sanitizeCsvCell(val);
      // Escape fields that contain commas or quotes
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    }).join(','))
  ];

  const csv  = rows.join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `eduflow_students_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`📥 Exported ${allStudents.length} students!`, 'success');
}

// ─── Download Template ────────────────────────────────────────
function downloadTemplate() {
  const rows = [
    ALL_HEADERS.join(','),
    '"John Smith","john.smith@email.com","Data Science","3.8","Active","555-0100","123 Main St, New York","2024-01-15"',
    '"Jane Doe","jane.doe@email.com","Web Development","3.5","Active","555-0200","456 Oak Ave, Chicago","2024-02-01"',
  ];
  const csv  = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'eduflow_import_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📋 Template downloaded!', 'success');
}
