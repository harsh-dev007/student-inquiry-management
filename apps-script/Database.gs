function setupDatabase() {
  const ss = getDb_();
  Object.keys(CONFIG.HEADERS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = CONFIG.HEADERS[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  });
  const centres = sheet_('Centres');
  if (centres.getLastRow() < 2) centres.getRange(2, 1, CONFIG.DEFAULT_CENTRES.length, 3).setValues(CONFIG.DEFAULT_CENTRES);
  const templates = sheet_('MessageTemplates');
  if (templates.getLastRow() < 2) {
    const t = [
      [Utilities.getUuid(), 'Welcome Message', 'Hello {parent_name},\nThank you for your inquiry regarding {student_name}.\nWe are happy to assist you with the admission process.\nThank you.\n{centre_name}', '', isoNow_(), isoNow_(), 'system'],
      [Utilities.getUuid(), 'Demo Reminder', "Hello {parent_name},\nThis is a reminder regarding {student_name}'s demo.\nDemo Date: {demo_date}\nThank you.\n{centre_name}", '', isoNow_(), isoNow_(), 'system'],
      [Utilities.getUuid(), 'Admission Follow-up', 'Hello {parent_name},\nWe are following up regarding {student_name}\'s admission.\nPlease let us know if you need any assistance.\n{centre_name}', '', isoNow_(), isoNow_(), 'system']
    ];
    templates.getRange(2, 1, t.length, t[0].length).setValues(t);
  }
  if (sheet_('Settings').getLastRow() < 2) {
    sheet_('Settings').getRange(2, 1, 4, 2).setValues([
      ['appName', 'Student Inquiry Management'],
      ['formResponseSheet', CONFIG.FORM_RESPONSE_SHEET_NAME],
      ['setupComplete', 'true'],
      ['lastFormSync', '']
    ]);
  }
  SpreadsheetApp.getUi().alert('Database sheets are ready.');
}

function records_(sheetName) {
  const sh = sheet_(sheetName); if (!sh) throw new Error(`Missing sheet: ${sheetName}`);
  const values = sh.getDataRange().getValues(); if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== '')).map(r => {
    const o = {}; headers.forEach((h, i) => o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]); return o;
  });
}
function appendRecord_(sheetName, obj) {
  const sh = sheet_(sheetName); const headers = CONFIG.HEADERS[sheetName];
  sh.appendRow(headers.map(h => obj[h] ?? ''));
}
function updateRecord_(sheetName, id, obj, idField = 'id') {
  const sh = sheet_(sheetName); const vals = sh.getDataRange().getValues(); const headers = vals[0]; const idx = headers.indexOf(idField);
  if (idx < 0) throw new Error('ID column missing');
  for (let r = 1; r < vals.length; r++) if (String(vals[r][idx]) === String(id)) {
    headers.forEach((h, c) => { if (Object.prototype.hasOwnProperty.call(obj, h)) sh.getRange(r + 1, c + 1).setValue(obj[h]); });
    return true;
  }
  return false;
}
function deleteRecord_(sheetName, id, idField = 'id') {
  const sh = sheet_(sheetName); const vals = sh.getDataRange().getValues(); const idx = vals[0].indexOf(idField);
  for (let r = 1; r < vals.length; r++) if (String(vals[r][idx]) === String(id)) { sh.deleteRow(r + 1); return true; }
  return false;
}
function nextSerial_() { return Math.max(0, ...records_('Inquiries').map(x => Number(x.serialNo) || 0)) + 1; }
function audit_(user, action, inquiryId, oldStatus, newStatus, details) {
  appendRecord_('AuditLog', { timestamp: isoNow_(), user: user || 'system', action, inquiryId: inquiryId || '', oldStatus: oldStatus || '', newStatus: newStatus || '', details: details || '' });
}
