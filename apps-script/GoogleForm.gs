const FORM_MAP = {
  'Student Name': 'studentName',
  'Student Surname': 'studentSurname',
  'Parent Name': 'parentName',
  'Parent Surname': 'parentSurname',
  'Standard': 'standard',
  'Mother Name': 'motherName',
  'Mother Number': 'motherPhone',
  'Father Name': 'fatherName',
  'Father Number': 'fatherPhone',
  'School Name': 'schoolName',
  'School Timing': 'schoolTiming',
  'Centre Name': 'centreName'
};

function onFormSubmit(e) {
  try {
    const result = importFormEvent_(e);
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
function importFormEvent_(e) {
  const row = e && e.range ? e.range.getRow() : null;
  const sh = e && e.range ? e.range.getSheet() : sheet_(CONFIG.FORM_RESPONSE_SHEET_NAME);
  if (!sh) throw new Error('Google Form response sheet not found.');
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const values = sh.getRange(row || sh.getLastRow(), 1, 1, headers.length).getValues()[0];
  const raw = {}; headers.forEach((h, i) => raw[h] = values[i] instanceof Date ? values[i].toISOString() : values[i]);
  const sourceRecordId = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(raw), Utilities.Charset.UTF_8));
  if (records_('Inquiries').some(x => String(x.sourceRecordId) === sourceRecordId)) return { success: true, duplicate: true };
  const inquiry = mapFormRaw_(raw, sourceRecordId);
  appendRecord_('Inquiries', inquiry);
  appendRecord_('GoogleFormRaw', { sourceRecordId, receivedAt: isoNow_(), rawJson: JSON.stringify(raw), imported: 'true', inquiryId: inquiry.id });
  audit_('google-form', 'Imported Google Form inquiry', inquiry.id, '', 'Pending', sourceRecordId);
  return { success: true, duplicate: false, inquiryId: inquiry.id };
}
function mapFormRaw_(raw, sourceRecordId) {
  const get = k => raw[k] ?? '';
  const o = {
    id: Utilities.getUuid(), serialNo: nextSerial_(), inquiryDate: toDateString_(get('Timestamp') || get('Inquiry Date') || new Date()),
    centreName: String(get('Centre Name')).trim(), source: 'Google Form', sourceRecordId,
    studentName: String(get('Student Name')).trim(), studentSurname: String(get('Student Surname')).trim(),
    parentName: String(get('Parent Name')).trim(), parentSurname: String(get('Parent Surname')).trim(), standard: String(get('Standard')).trim(),
    motherName: String(get('Mother Name')).trim(), motherPhone: normalizePhone_(get('Mother Number')),
    fatherName: String(get('Father Name')).trim(), fatherPhone: normalizePhone_(get('Father Number')),
    schoolName: String(get('School Name')).trim(), schoolTiming: String(get('School Timing')).trim(),
    demo1Date: '', demo1Attendance: '', demo2Date: '', demo2Attendance: '', demo3Date: '', demo3Attendance: '',
    status: 'Pending', remark: '', createdAt: isoNow_(), updatedAt: isoNow_(), createdBy: 'google-form'
  };
  validateInquiry_(o); return o;
}
function syncGoogleForm_() {
  const sh = sheet_(CONFIG.FORM_RESPONSE_SHEET_NAME); if (!sh) throw new Error(`Response sheet "${CONFIG.FORM_RESPONSE_SHEET_NAME}" not found.`);
  const last = sh.getLastRow(); if (last < 2) return { imported: 0, duplicates: 0, total: 0 };
  let imported = 0, duplicates = 0;
  for (let r = 2; r <= last; r++) { const result = importFormEvent_({ range: sh.getRange(r, 1, 1, sh.getLastColumn()) }); if (result.duplicate) duplicates++; else imported++; }
  PropertiesService.getScriptProperties().setProperty('lastFormSync', isoNow_());
  return { imported, duplicates, total: last - 1 };
}
function toDateString_(v) { const d = new Date(v); return isNaN(d) ? Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd') : Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd'); }
function normalizePhone_(v) { let s = String(v || '').replace(/\D/g, ''); if (s.length === 10) return s; if (s.length === 12 && s.startsWith('91')) return s.slice(2); return String(v || '').trim(); }
