function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const callback = String(p.callback || '');
  try {
    let payload = {};
    if (p.payload) {
      payload = JSON.parse(p.payload);
    } else {
      payload = { action: p.action || 'health', authToken: p.authToken || '' };
      if (p.inquiry) payload.inquiry = JSON.parse(p.inquiry);
      if (p.template) payload.template = JSON.parse(p.template);
      if (p.centre) payload.centre = JSON.parse(p.centre);
      if (p.id) payload.id = p.id;
      if (p.code) payload.code = p.code;
    }
    return respond_(runApi_(payload), callback);
  } catch (err) {
    return respond_({ success: false, error: String(err.message || err) }, callback);
  }
}

function doPost(e) {
  const callback = String((e && e.parameter && e.parameter.callback) || '');
  try {
    let p = {};
    const contents = e && e.postData ? String(e.postData.contents || '') : '';
    if (contents) {
      try {
        p = JSON.parse(contents);
      } catch (parseErr) {
        if (e.parameter && e.parameter.payload) p = JSON.parse(e.parameter.payload);
        else if (e.parameter && e.parameter.action) p = e.parameter;
        else throw parseErr;
      }
    } else if (e && e.parameter && e.parameter.payload) {
      p = JSON.parse(e.parameter.payload);
    } else if (e && e.parameter) {
      p = e.parameter;
    }
    return respond_(runApi_(p), callback);
  } catch (err) {
    console.error(err);
    return respond_({ success: false, error: String(err.message || err) }, callback);
  }
}

function runApi_(p) {
  if (typeof p.inquiry === 'string') p.inquiry = JSON.parse(p.inquiry);
  if (typeof p.template === 'string') p.template = JSON.parse(p.template);
  if (typeof p.centre === 'string') p.centre = JSON.parse(p.centre);
  const action = String(p.action || '');
  if (action === 'health' || !action) {
    return { success: true, data: { service: 'Student Inquiry Management API', status: 'ok', time: isoNow_() } };
  }
  const user = requireUser_(p);
  let data = {};
  switch (action) {
    case 'listInquiries': data = { inquiries: records_('Inquiries') }; break;
    case 'listCentres': data = { centres: records_('Centres') }; break;
    case 'listTemplates': data = { templates: records_('MessageTemplates') }; break;
    case 'dashboard': data = { inquiries: records_('Inquiries'), centres: records_('Centres'), templates: records_('MessageTemplates') }; break;
    case 'saveInquiry': assertRole_(user, ['Admin', 'Staff']); data = { inquiry: saveInquiry_(p.inquiry, user) }; break;
    case 'updateInquiry': assertRole_(user, ['Admin', 'Staff']); data = { inquiry: updateInquiry_(p.inquiry, user) }; break;
    case 'deleteInquiry': assertRole_(user, ['Admin']); data = { deleted: deleteInquiry_(p.id, user) }; break;
    case 'saveTemplate': assertRole_(user, ['Admin']); data = { template: saveTemplate_(p.template, user) }; break;
    case 'deleteTemplate': assertRole_(user, ['Admin']); data = { deleted: deleteRecord_('MessageTemplates', p.id) }; break;
    case 'syncGoogleForm': assertRole_(user, ['Admin', 'Staff']); data = syncGoogleForm_(); break;
    case 'saveCentre': assertRole_(user, ['Admin']); data = { centre: saveCentre_(p.centre, user) }; break;
    case 'deleteCentre': assertRole_(user, ['Admin']); data = { deleted: deleteRecord_('Centres', p.code, 'code') }; break;
    case 'seedDemoData': assertRole_(user, ['Admin']); data = seedDemoData_(); break;
    case 'clearDemoData': assertRole_(user, ['Admin']); data = clearDemoData_(); break;
    default: throw new Error('Unknown API action.');
  }
  return { success: true, data: data };
}

function respond_(o, callback) {
  const text = JSON.stringify(o);
  if (callback && /^[A-Za-z_][A-Za-z0-9_]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + text + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function json_(o) {
  return respond_(o, '');
}

function validateInquiry_(i) {
  if (!i.inquiryDate) throw new Error('Inquiry date is required.');
  if (!i.centreName) throw new Error('Centre name is required.');
  if (!i.studentName) throw new Error('Student name is required.');
  if (!i.standard) throw new Error('Standard is required.');
  if (!CONFIG.SOURCE_VALUES.includes(i.source)) throw new Error('Invalid source.');
  if (!CONFIG.STATUS_VALUES.includes(i.status)) throw new Error('Invalid admission status.');
  if (!validPhone_(i.motherPhone) && !validPhone_(i.fatherPhone)) throw new Error('At least one valid Indian mobile number is required.');
  if (i.motherPhone && !validPhone_(i.motherPhone)) throw new Error('Invalid mother mobile number.');
  if (i.fatherPhone && !validPhone_(i.fatherPhone)) throw new Error('Invalid father mobile number.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(i.inquiryDate))) throw new Error('Invalid inquiry date.');
}
function validPhone_(v) { return /^\d{10}$/.test(String(v || '').replace(/\D/g, '')); }

function saveInquiry_(raw, user) {
  const i = Object.assign({}, raw);
  i.id = Utilities.getUuid(); i.serialNo = nextSerial_(); i.source = 'Self'; i.sourceRecordId = '';
  i.createdAt = isoNow_(); i.updatedAt = isoNow_(); i.createdBy = user.email;
  i.motherPhone = normalizePhone_(i.motherPhone); i.fatherPhone = normalizePhone_(i.fatherPhone);
  validateInquiry_(i);
  duplicateWarning_(i, ''); appendRecord_('Inquiries', i);
  audit_(user.email, 'Created inquiry', i.id, '', i.status, '');
  return i;
}
function updateInquiry_(raw, user) {
  if (!raw?.id) throw new Error('Inquiry ID is required.');
  const old = records_('Inquiries').find(x => String(x.id) === String(raw.id));
  if (!old) throw new Error('Inquiry not found.');
  const i = Object.assign({}, old, raw);
  i.source = old.source; i.sourceRecordId = old.sourceRecordId; i.serialNo = old.serialNo; i.updatedAt = isoNow_();
  i.motherPhone = normalizePhone_(i.motherPhone); i.fatherPhone = normalizePhone_(i.fatherPhone);
  validateInquiry_(i);
  duplicateWarning_(i, i.id); updateRecord_('Inquiries', i.id, i);
  audit_(user.email, old.status !== i.status ? 'Changed status' : 'Updated inquiry', i.id, old.status, i.status, '');
  return i;
}
function duplicateWarning_(i, excludeId) {
  const a = records_('Inquiries').filter(x => String(x.id) !== String(excludeId));
  const student = String(i.studentName || '').trim().toLowerCase();
  const phones = [normalizePhone_(i.motherPhone), normalizePhone_(i.fatherPhone)].filter(Boolean);
  const found = a.some(x => String(x.studentName || '').trim().toLowerCase() === student &&
    phones.some(p => p === normalizePhone_(x.motherPhone) || p === normalizePhone_(x.fatherPhone)));
  if (found) console.warn('Likely duplicate inquiry for ' + student);
}
function deleteInquiry_(id, user) {
  const ok = deleteRecord_('Inquiries', id);
  if (ok) audit_(user.email, 'Deleted inquiry', id, '', '', '');
  return ok;
}
function saveTemplate_(raw, user) {
  const t = {
    id: raw.id || Utilities.getUuid(), name: String(raw.name || '').trim(), body: String(raw.body || ''),
    mediaUrl: String(raw.mediaUrl || ''), createdAt: raw.createdAt || isoNow_(), updatedAt: isoNow_(), createdBy: user.email
  };
  if (!t.name || !t.body) throw new Error('Template name and body are required.');
  appendRecord_('MessageTemplates', t);
  return t;
}
function saveCentre_(raw, user) {
  const c = { name: String(raw.name || '').trim(), code: String(raw.code || '').trim().toUpperCase(), status: raw.status || 'Active' };
  if (!c.name || !c.code) throw new Error('Centre name and code are required.');
  if (records_('Centres').some(x => x.code === c.code)) throw new Error('Centre code already exists.');
  appendRecord_('Centres', c);
  return c;
}

function seedDemoData_() {
  const existing = records_('Inquiries').filter(x => String(x.createdBy) === 'demo');
  if (existing.length) return { created: 0, message: 'Demo data already exists.' };
  const names = ['Aarav Patel', 'Diya Shah', 'Rohan Mehta', 'Anaya Desai', 'Vivaan Joshi', 'Myra Patel', 'Reyansh Shah', 'Kiara Mehta', 'Advik Desai', 'Ishaan Patel'];
  names.forEach((n, idx) => {
    const first = n.split(' ')[0], last = n.split(' ').slice(1).join(' ');
    const status = idx < 3 ? 'Admission OK' : idx < 5 ? 'Admission Not OK' : 'Pending';
    const i = {
      id: 'DEMO_' + Utilities.getUuid(), serialNo: nextSerial_(),
      inquiryDate: Utilities.formatDate(new Date(Date.now() - idx * 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd'),
      centreName: idx % 2 ? 'Modasa' : 'Himatnagar', source: idx % 2 ? 'Self' : 'Google Form', sourceRecordId: 'DEMO_FORM_' + idx,
      studentName: first, studentSurname: last, parentName: 'Parent ' + (idx + 1), parentSurname: last, standard: String((idx % 12) + 1),
      motherName: 'Mother ' + (idx + 1), motherPhone: '90000' + String(10000 + idx), fatherName: 'Father ' + (idx + 1), fatherPhone: '91000' + String(10000 + idx),
      schoolName: 'Demo Public School', schoolTiming: '8:00 AM - 2:00 PM',
      demo1Date: idx < 5 ? Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd') : '', demo1Attendance: idx < 5 ? 'Attended' : '',
      demo2Date: idx < 3 ? Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd') : '', demo2Attendance: idx < 3 ? 'Attended' : '',
      demo3Date: '', demo3Attendance: '', status: status, remark: 'DEMO DATA - safe to delete',
      createdAt: isoNow_(), updatedAt: isoNow_(), createdBy: 'demo'
    };
    appendRecord_('Inquiries', i);
  });
  return { created: 10 };
}
function clearDemoData_() {
  const sh = sheet_('Inquiries'), vals = sh.getDataRange().getValues(), idx = vals[0].indexOf('createdBy');
  let n = 0;
  for (let r = vals.length - 1; r >= 1; r--) if (String(vals[r][idx]) === 'demo') { sh.deleteRow(r + 1); n++; }
  return { deleted: n };
}
