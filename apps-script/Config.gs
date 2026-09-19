/**
 * Configuration for the Apps Script backend.
 * Run setupDatabase() once after creating the spreadsheet.
 */
const CONFIG = {
  SPREADSHEET_ID: '', // Leave blank when this script is bound to the database Sheet.
  FORM_RESPONSE_SHEET_NAME: 'Form Responses 1',
  TIMEZONE: 'Asia/Kolkata',
  ALLOWED_ORIGINS: [
    'http://127.0.0.1:8080',
    'http://localhost:8080',
    'https://YOUR-USERNAME.github.io'
  ],
  GOOGLE_CLIENT_ID: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  REQUIRE_GOOGLE_AUTH: false,
  USERS_SHEET: 'Users',
  DEFAULT_CENTRES: [
    ['Himatnagar', 'HMT', 'Active'],
    ['Modasa', 'MDS', 'Active']
  ],
  SOURCE_VALUES: ['Google Form', 'Self'],
  STATUS_VALUES: ['Pending', 'Admission OK', 'Admission Not OK'],
  ATTENDANCE_VALUES: ['', 'Attended', 'Not Attended'],
  HEADERS: {
    Inquiries: ['id', 'serialNo', 'inquiryDate', 'centreName', 'source', 'sourceRecordId', 'studentName', 'studentSurname', 'parentName', 'parentSurname', 'standard', 'motherName', 'motherPhone', 'fatherName', 'fatherPhone', 'schoolName', 'schoolTiming', 'demo1Date', 'demo1Attendance', 'demo2Date', 'demo2Attendance', 'demo3Date', 'demo3Attendance', 'status', 'remark', 'createdAt', 'updatedAt', 'createdBy'],
    Centres: ['name', 'code', 'status'],
    MessageTemplates: ['id', 'name', 'body', 'mediaUrl', 'createdAt', 'updatedAt', 'createdBy'],
    Settings: ['key', 'value'],
    AuditLog: ['timestamp', 'user', 'action', 'inquiryId', 'oldStatus', 'newStatus', 'details'],
    GoogleFormRaw: ['sourceRecordId', 'receivedAt', 'rawJson', 'imported', 'inquiryId'],
    Users: ['email', 'name', 'role', 'active']
  }
};

function getDb_() {
  const id = CONFIG.SPREADSHEET_ID || PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}
function now_() { return new Date(); }
function isoNow_() { return new Date().toISOString(); }
function sheet_(name) { return getDb_().getSheetByName(name); }
