/**
 * FRONTEND configuration only.
 * Never put Google service-account JSON, sheet credentials, or passwords here.
 * This file is public if you upload the project to GitHub Pages.
 *
 * Local test: keep DEMO_MODE true.
 * Shared database: paste Apps Script /exec URL, set DEMO_MODE false.
 */
window.APP_CONFIG = {
  APP_NAME: "Student Inquiry Management",
  APP_SUBTITLE: "Inquiry, Demo & Admission Tracking System",

  // Last working Apps Script Web App URL from your Google setup
  API_URL: "https://script.google.com/macros/s/AKfycbxOviEDTc3cEA1XcFEB3NkLfI_7Wa5lsTGGddXa2X7ZTDf286d096Rm-WGbKSRZyHPk/exec",

  // true  = sample data in this browser tab (session only)
  // false = Google Sheet via Apps Script
  DEMO_MODE: false,

  // false = easier first test (no Google sign-in)
  // true  = require Sign in with Google (production)
  REQUIRE_GOOGLE_AUTH: false,

  GOOGLE_CLIENT_ID: "YOUR_CLIENT_ID.apps.googleusercontent.com",

  DATE_FORMAT: "en-IN",
  TIMEZONE: "Asia/Kolkata",

  STANDARDS: ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "Other"],
  STATUS_VALUES: ["Pending", "Admission OK", "Admission Not OK"],
  SOURCE_VALUES: ["Google Form", "Self"],
  FUTURE_SOURCES: ["WhatsApp", "Phone Call", "Walk-in", "Referral", "Instagram", "Facebook", "Other"],
  ATTENDANCE_VALUES: ["", "Attended", "Not Attended"]
};
