/**
 * Production calls Apps Script (JSONP avoids localhost CORS).
 * Demo mode uses sessionStorage only for local testing — not the production database.
 */
window.API = (() => {
  const KEYS = {
    inquiries: "simulatedInquiries",
    centres: "simulatedCentres",
    templates: "simulatedTemplates",
    lastSync: "simulatedLastSync",
    demoCleared: "demoDataCleared"
  };

  const DEFAULT_CENTRES = [
    { name: "Himatnagar", code: "HMT", status: "Active" },
    { name: "Modasa", code: "MDS", status: "Active" }
  ];

  const DEFAULT_TEMPLATES = [
    { id: "tpl_welcome", name: "Welcome Message", body: "Hello {parent_name},\n\nThank you for your inquiry regarding {student_name}.\n\nWe are happy to assist you with the admission process.\n\nThank you.\n{centre_name}", mediaUrl: "" },
    { id: "tpl_demo", name: "Demo Reminder", body: "Hello {parent_name},\n\nThis is a reminder regarding {student_name}'s demo.\n\nDemo Date: {demo_date}\n\nThank you.\n{centre_name}", mediaUrl: "" },
    { id: "tpl_followup", name: "Admission Follow-up", body: "Hello {parent_name},\n\nWe are following up regarding {student_name}'s admission.\n\nPlease let us know if you need any assistance.\n\n{centre_name}", mediaUrl: "" },
    { id: "tpl_pamphlet", name: "Send Pamphlet", body: "Hello {parent_name},\n\nPlease find our centre pamphlet here:\n{media_url}\n\n{centre_name}", mediaUrl: "https://example.com/pamphlet" },
    { id: "tpl_video", name: "Send Video", body: "Hello {parent_name},\n\nPlease watch this introduction video about {centre_name}:\n{media_url}\n\nThank you.", mediaUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
  ];

  const isDemo = () =>
    window.APP_CONFIG.DEMO_MODE === true ||
    !getApiUrl() ||
    getApiUrl().includes("PASTE_");

  function getApiUrl() {
    return sessionStorage.getItem("apiUrl") || window.APP_CONFIG.API_URL || "";
  }

  const load = (key, fallback) => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const store = (key, data) => sessionStorage.setItem(key, JSON.stringify(data));

  function buildSeedInquiries() {
    const names = ["Aarav Patel", "Diya Shah", "Rohan Mehta", "Anaya Desai", "Vivaan Joshi", "Myra Patel", "Reyansh Shah", "Kiara Mehta", "Advik Desai", "Ishaan Patel"];
    const parentFirst = ["Raj", "Neha", "Amit", "Pooja", "Kunal", "Riya", "Manish", "Nisha", "Suresh", "Kavita"];
    return names.map((full, i) => {
      const [first, ...rest] = full.split(" ");
      const surname = rest.join(" ");
      const status = i < 3 ? "Admission OK" : i < 5 ? "Admission Not OK" : "Pending";
      const attendedDemo = i < 5;
      return {
        id: `DEMO_${i + 1}`,
        serialNo: String(i + 1),
        inquiryDate: `2026-09-${String(4 + i).padStart(2, "0")}`,
        centreName: i % 2 ? "Modasa" : "Himatnagar",
        source: i % 3 === 0 ? "Google Form" : "Self",
        sourceRecordId: i % 3 === 0 ? `demo-form-${i + 1}` : "",
        studentName: first,
        studentSurname: surname,
        parentName: parentFirst[i],
        parentSurname: surname,
        standard: ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7"][i],
        motherName: `Mother ${i + 1}`,
        motherPhone: `98765${String(10000 + i)}`,
        fatherName: `Father ${i + 1}`,
        fatherPhone: `97654${String(10000 + i)}`,
        schoolName: "Demo Public School",
        schoolTiming: "8:00 AM - 2:00 PM",
        demo1Date: attendedDemo ? `2026-09-${String(10 + i).padStart(2, "0")}` : "",
        demo1Attendance: attendedDemo ? "Attended" : "",
        demo2Date: i < 3 ? `2026-09-${String(12 + i).padStart(2, "0")}` : "",
        demo2Attendance: i < 3 ? "Attended" : "",
        demo3Date: "",
        demo3Attendance: "",
        status,
        remark: "Demo record — safe to delete",
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "demo"
      };
    });
  }

  function ensureDemo() {
    if (!load(KEYS.centres, null)) store(KEYS.centres, DEFAULT_CENTRES);
    if (!load(KEYS.templates, null)) store(KEYS.templates, DEFAULT_TEMPLATES);
    if (sessionStorage.getItem(KEYS.demoCleared) === "1") {
      if (!load(KEYS.inquiries, null)) store(KEYS.inquiries, []);
      return;
    }
    if (!load(KEYS.inquiries, null)) store(KEYS.inquiries, buildSeedInquiries());
  }

  function validateInquiry(i) {
    if (!i.inquiryDate) throw new Error("Inquiry date is required.");
    if (!i.centreName) throw new Error("Centre name is required.");
    if (!String(i.studentName || "").trim()) throw new Error("Student name is required.");
    if (!i.standard) throw new Error("Standard is required.");
    if (!Utils.isIndianPhone(i.motherPhone) && !Utils.isIndianPhone(i.fatherPhone)) {
      throw new Error("Enter at least one valid 10-digit Indian parent mobile number.");
    }
    if (i.motherPhone && !Utils.isIndianPhone(i.motherPhone)) throw new Error("Invalid mother mobile number.");
    if (i.fatherPhone && !Utils.isIndianPhone(i.fatherPhone)) throw new Error("Invalid father mobile number.");
    if (!["Pending", "Admission OK", "Admission Not OK"].includes(i.status)) throw new Error("Invalid admission status.");
  }

  function nextSerial(inquiries) {
    return String(Math.max(0, ...inquiries.map((x) => Number(x.serialNo) || 0)) + 1);
  }

  async function demoRequest(payload) {
    await new Promise((r) => setTimeout(r, 160));
    ensureDemo();
    let inquiries = load(KEYS.inquiries, []);
    let centres = load(KEYS.centres, DEFAULT_CENTRES);
    let templates = load(KEYS.templates, DEFAULT_TEMPLATES);

    switch (payload.action) {
      case "health":
        return { success: true, data: { status: "ok", mode: "demo", time: new Date().toISOString() } };
      case "listInquiries":
      case "dashboard":
        return { success: true, data: { inquiries, centres, templates } };
      case "listCentres":
        return { success: true, data: { centres } };
      case "listTemplates":
        return { success: true, data: { templates } };
      case "saveInquiry": {
        const raw = { ...payload.inquiry };
        raw.id = Utils.uid("inq");
        raw.serialNo = nextSerial(inquiries);
        raw.source = "Self";
        raw.sourceRecordId = "";
        raw.createdAt = new Date().toISOString();
        raw.updatedAt = raw.createdAt;
        raw.createdBy = Auth.getRole();
        raw.motherPhone = Utils.normalizePhone(raw.motherPhone);
        raw.fatherPhone = Utils.normalizePhone(raw.fatherPhone);
        validateInquiry(raw);
        inquiries.push(raw);
        store(KEYS.inquiries, inquiries);
        return { success: true, data: { inquiry: raw } };
      }
      case "updateInquiry": {
        const idx = inquiries.findIndex((x) => x.id === payload.inquiry?.id);
        if (idx < 0) throw new Error("Inquiry not found.");
        const merged = {
          ...inquiries[idx],
          ...payload.inquiry,
          source: inquiries[idx].source,
          sourceRecordId: inquiries[idx].sourceRecordId,
          serialNo: inquiries[idx].serialNo,
          createdAt: inquiries[idx].createdAt,
          createdBy: inquiries[idx].createdBy,
          updatedAt: new Date().toISOString(),
          motherPhone: Utils.normalizePhone(payload.inquiry.motherPhone),
          fatherPhone: Utils.normalizePhone(payload.inquiry.fatherPhone)
        };
        validateInquiry(merged);
        inquiries[idx] = merged;
        store(KEYS.inquiries, inquiries);
        return { success: true, data: { inquiry: merged } };
      }
      case "deleteInquiry":
        if (!Auth.canDelete()) throw new Error("You are not authorized to perform this action.");
        store(KEYS.inquiries, inquiries.filter((x) => x.id !== payload.id));
        return { success: true, data: { deleted: true } };
      case "saveTemplate": {
        const t = {
          id: payload.template?.id || Utils.uid("tpl"),
          name: String(payload.template?.name || "").trim(),
          body: String(payload.template?.body || ""),
          mediaUrl: String(payload.template?.mediaUrl || "").trim(),
          createdAt: payload.template?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: Auth.getRole()
        };
        if (!t.name || !t.body) throw new Error("Template name and message are required.");
        const tIdx = templates.findIndex((x) => x.id === t.id);
        if (tIdx >= 0) templates[tIdx] = t; else templates.push(t);
        store(KEYS.templates, templates);
        return { success: true, data: { template: t } };
      }
      case "deleteTemplate":
        store(KEYS.templates, templates.filter((x) => x.id !== payload.id));
        return { success: true, data: { deleted: true } };
      case "saveCentre": {
        const c = {
          name: String(payload.centre?.name || "").trim(),
          code: String(payload.centre?.code || "").trim().toUpperCase(),
          status: payload.centre?.status || "Active"
        };
        if (!c.name || !c.code) throw new Error("Centre name and code are required.");
        if (centres.some((x) => x.code === c.code)) throw new Error("Centre code already exists.");
        centres.push(c);
        store(KEYS.centres, centres);
        return { success: true, data: { centre: c } };
      }
      case "deleteCentre":
        store(KEYS.centres, centres.filter((x) => x.code !== payload.code));
        return { success: true, data: { deleted: true } };
      case "syncGoogleForm": {
        const sourceRecordId = "demo-sync-" + Utils.today();
        const duplicate = inquiries.some((x) => x.sourceRecordId === sourceRecordId);
        let imported = 0;
        const duplicates = duplicate ? 1 : 0;
        if (!duplicate) {
          inquiries.push({
            id: Utils.uid("inq"),
            serialNo: nextSerial(inquiries),
            inquiryDate: Utils.today(),
            centreName: "Himatnagar",
            source: "Google Form",
            sourceRecordId,
            studentName: "Form",
            studentSurname: "Sample",
            parentName: "Parent",
            parentSurname: "Sample",
            standard: "5",
            motherName: "Mother Sample",
            motherPhone: "9876500000",
            fatherName: "Father Sample",
            fatherPhone: "9876500001",
            schoolName: "Google Form School",
            schoolTiming: "8:00 AM - 2:00 PM",
            demo1Date: "", demo1Attendance: "", demo2Date: "", demo2Attendance: "", demo3Date: "", demo3Attendance: "",
            status: "Pending",
            remark: "Imported from Google Form (demo sync)",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: "google-form"
          });
          store(KEYS.inquiries, inquiries);
          imported = 1;
        }
        const syncTime = new Date().toISOString();
        store(KEYS.lastSync, syncTime);
        return { success: true, data: { imported, duplicates, total: inquiries.filter((x) => x.source === "Google Form").length, lastSync: syncTime } };
      }
      case "seedDemoData":
        sessionStorage.removeItem(KEYS.demoCleared);
        store(KEYS.inquiries, buildSeedInquiries());
        store(KEYS.centres, DEFAULT_CENTRES);
        store(KEYS.templates, DEFAULT_TEMPLATES);
        return { success: true, data: { created: 10 } };
      case "clearDemoData":
        sessionStorage.setItem(KEYS.demoCleared, "1");
        store(KEYS.inquiries, []);
        return { success: true, data: { deleted: true } };
      default:
        throw new Error("Unknown API action.");
    }
  }

  const WRITE_ACTIONS = {
    saveInquiry: true, updateInquiry: true, deleteInquiry: true,
    saveTemplate: true, deleteTemplate: true, saveCentre: true, deleteCentre: true,
    syncGoogleForm: true, seedDemoData: true, clearDemoData: true
  };

  function parseGasText(text) {
    const raw = String(text || "").trim();
    if (!raw) throw new Error("Empty response from Google.");
    if (raw.startsWith("<") || raw.includes("<!DOCTYPE")) {
      throw new Error("Google returned a login/error page. Redeploy Web app: Who has access = Anyone, then New version.");
    }
    const jsonp = raw.match(/^[A-Za-z_][A-Za-z0-9_]*\(([\s\S]*)\);?$/);
    const body = jsonp ? jsonp[1] : raw;
    try {
      return JSON.parse(body);
    } catch {
      throw new Error("Google returned an invalid response. Redeploy Code.gs as a new Web app version.");
    }
  }

  async function postFetch(url, payload) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow",
        signal: ctrl.signal
      });
      const text = await res.text();
      return parseGasText(text);
    } catch (err) {
      if (err.name === "AbortError") throw new Error("Google Sheet request timed out.");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  function jsonp(url, payload) {
    return new Promise((resolve, reject) => {
      const cb = "gasCb" + Date.now() + Math.floor(Math.random() * 1e6);
      const script = document.createElement("script");
      let done = false;
      const timer = setTimeout(() => finish(new Error("Google Sheet request timed out. Redeploy: Who has access = Anyone.")), 18000);
      function finish(err, data) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { delete window[cb]; } catch (_) { window[cb] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
        if (err) reject(err);
        else resolve(data);
      }
      window[cb] = (data) => finish(null, data);
      script.onerror = () => finish(new Error("Could not reach Google Apps Script. Redeploy Web app with Who has access = Anyone."));
      script.onload = () => {
        setTimeout(() => {
          if (!done) finish(new Error("Google returned a red script error. Save uses POST now — paste the updated Code.gs and Deploy → New version."));
        }, 80);
      };
      const q = new URLSearchParams();
      q.set("callback", cb);
      q.set("action", payload.action || "health");
      if (payload.authToken) q.set("authToken", payload.authToken);
      if (payload.id) q.set("id", payload.id);
      if (payload.code) q.set("code", payload.code);
      if (payload.inquiry) q.set("inquiry", JSON.stringify(payload.inquiry));
      if (payload.template) q.set("template", JSON.stringify(payload.template));
      if (payload.centre) q.set("centre", JSON.stringify(payload.centre));
      script.src = `${url}?${q}`;
      document.head.appendChild(script);
    });
  }

  const LOADER_TEXT = {
    health: "Connecting…",
    dashboard: "Loading data…",
    listInquiries: "Loading inquiries…",
    listCentres: "Loading centres…",
    listTemplates: "Loading templates…",
    saveInquiry: "Saving inquiry…",
    updateInquiry: "Saving inquiry…",
    deleteInquiry: "Deleting inquiry…",
    saveCentre: "Saving centre…",
    deleteCentre: "Deleting centre…",
    saveTemplate: "Saving template…",
    deleteTemplate: "Deleting template…",
    syncGoogleForm: "Syncing Google Form…",
    seedDemoData: "Loading sample data…",
    clearDemoData: "Removing demo data…"
  };

  const request = async (payload) => {
    const label = LOADER_TEXT[payload.action] || "Please wait…";
    window.App?.showLoader?.(label);
    try {
      return await runRequest(payload);
    } finally {
      window.App?.hideLoader?.();
    }
  };

  const runRequest = async (payload) => {
    if (isDemo()) return demoRequest(payload);
    const url = getApiUrl();
    if (!url || url.includes("PASTE_")) {
      throw new Error("Unable to connect to database. Please configure the Apps Script Web App URL in Settings.");
    }
    const needAuth = window.APP_CONFIG.REQUIRE_GOOGLE_AUTH !== false;
    const token = Auth.getToken();
    if (needAuth && !token) throw new Error("Google sign-in is required.");
    const bodyPayload = needAuth ? { ...payload, authToken: token } : payload;

    let json;
    if (WRITE_ACTIONS[payload.action]) {
      try {
        json = await postFetch(url, bodyPayload);
      } catch (err) {
        const msg = String(err.message || err);
        if (/Failed to fetch|NetworkError|CORS|Load failed/i.test(msg)) {
          json = await jsonp(url, bodyPayload);
        } else {
          throw err;
        }
      }
    } else {
      json = await jsonp(url, bodyPayload);
    }
    if (!json || json.success === false) throw new Error(json?.error || "Request failed");
    return json;
  };

  return {
    request,
    isDemo,
    getApiUrl,
    listInquiries: () => request({ action: "listInquiries" }),
    saveInquiry: (inquiry) => request({ action: "saveInquiry", inquiry }),
    updateInquiry: (inquiry) => request({ action: "updateInquiry", inquiry }),
    deleteInquiry: (id) => request({ action: "deleteInquiry", id }),
    listCentres: () => request({ action: "listCentres" }),
    listTemplates: () => request({ action: "listTemplates" }),
    saveTemplate: (template) => request({ action: "saveTemplate", template }),
    deleteTemplate: (id) => request({ action: "deleteTemplate", id }),
    saveCentre: (centre) => request({ action: "saveCentre", centre }),
    deleteCentre: (code) => request({ action: "deleteCentre", code }),
    syncGoogleForm: () => request({ action: "syncGoogleForm" }),
    seedDemoData: () => request({ action: "seedDemoData" }),
    clearDemoData: () => request({ action: "clearDemoData" }),
    health: () => request({ action: "health" }),
    dashboard: () => request({ action: "dashboard" })
  };
})();
