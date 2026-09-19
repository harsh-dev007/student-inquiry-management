window.App = (() => {
  const state = { inquiries: [], centres: [], templates: [], route: "dashboard", editId: null, lastUpdated: null };

  const titles = {
    dashboard: "Dashboard",
    add: "Add Inquiry",
    edit: "Edit Inquiry",
    inquiries: "All Inquiries",
    pending: "Pending Inquiry",
    demo: "Demo Students",
    ok: "Admission OK",
    notok: "Admission Not OK",
    "google-form": "Google Form Data",
    drafts: "Failed drafts",
    centres: "Centres",
    templates: "Message Templates",
    reports: "Reports",
    export: "Export to Excel",
    settings: "Settings"
  };

  function toast(msg, type) {
    const el = document.getElementById("toast");
    el.hidden = false;
    el.className = "toast " + (type || "");
    el.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 3800);
  }

  function openModal(html) {
    const m = document.getElementById("modal");
    const o = document.getElementById("overlay");
    m.innerHTML = html + `<div class="form-actions" style="margin-top:14px"><button class="btn" id="closeModal">Close</button></div>`;
    m.hidden = false; o.hidden = false;
    document.getElementById("closeModal").onclick = closeModal;
    o.onclick = closeModal;
  }
  function closeModal() {
    document.getElementById("modal").hidden = true;
    document.getElementById("overlay").hidden = true;
  }

  function setConn(ok, label) {
    const el = document.getElementById("connPill");
    el.className = "conn-pill " + (ok ? "ok" : "err");
    el.textContent = label;
  }

  let loaderCount = 0;
  function showLoader(message) {
    loaderCount += 1;
    const el = document.getElementById("loader");
    const text = document.getElementById("loaderText");
    if (text) text.textContent = message || "Please wait…";
    if (el) el.hidden = false;
  }
  function hideLoader() {
    loaderCount = Math.max(0, loaderCount - 1);
    if (loaderCount === 0) {
      const el = document.getElementById("loader");
      if (el) el.hidden = true;
    }
  }

  async function load() {
    try {
      const res = await API.dashboard();
      const d = res.data || {};
      state.inquiries = d.inquiries || [];
      state.centres = d.centres || [];
      state.templates = d.templates || state.templates || [];
      if (!state.centres.length) {
        try {
          const c = await API.listCentres();
          state.centres = c.data?.centres || [];
        } catch (_) { /* keep existing */ }
      }
      if (!state.templates.length) {
        try {
          const t = await API.listTemplates();
          state.templates = t.data?.templates || [];
        } catch (_) { /* keep existing */ }
      }
      state.lastUpdated = new Date();
      document.getElementById("lastUpdated").textContent = "Last updated: " + Utils.formatDateTime(state.lastUpdated);
      setConn(true, API.isDemo() ? "Demo mode" : "Connected · Sheet");
    } catch (e) {
      setConn(false, "Unable to connect");
      toast(e.message || "Unable to connect to database. Please check your internet connection and try again.", "error");
      throw e;
    }
  }

  function render() {
    document.getElementById("pageTitle").textContent = titles[state.route] || "Dashboard";
    document.querySelectorAll(".nav button").forEach((b) => {
      b.classList.toggle("active", b.dataset.route === state.route || (state.route === "edit" && b.dataset.route === "add"));
    });
    const map = {
      dashboard: Dashboard.render,
      add: () => InquiryForm.render(),
      edit: () => InquiryForm.render(state.editId),
      inquiries: () => Inquiries.render("inquiries"),
      pending: () => Inquiries.render("pending"),
      demo: () => Inquiries.render("demo"),
      ok: () => Inquiries.render("ok"),
      notok: () => Inquiries.render("notok"),
      export: () => Inquiries.render("export"),
      "google-form": GoogleForm.render,
      drafts: FailDrafts.render,
      centres: Centres.render,
      templates: Templates.render,
      reports: Reports.render,
      settings: Reports.renderSettings
    };
    (map[state.route] || Dashboard.render)();
  }

  function go(route, id) {
    state.route = route;
    state.editId = id || null;
    location.hash = route === "edit" && id ? `edit/${id}` : route;
    document.getElementById("sidebar").classList.remove("open");
    render();
  }

  function parseHash() {
    const h = (location.hash || "#dashboard").replace("#", "");
    if (h.startsWith("edit/")) { state.route = "edit"; state.editId = h.slice(5); return; }
    state.route = titles[h] ? h : "dashboard";
  }

  async function init() {
    Auth.renderChip();
    document.getElementById("menuBtn").onclick = () => document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("overlay").onclick = () => document.getElementById("sidebar").classList.remove("open");
    document.getElementById("refreshBtn").onclick = async () => {
      try { await load(); render(); toast("Refreshed", "success"); } catch (_) { /* toast already shown */ }
    };
    document.getElementById("nav").onclick = (e) => {
      const btn = e.target.closest("button[data-route]");
      if (btn) go(btn.dataset.route);
    };
    window.addEventListener("hashchange", () => { parseHash(); render(); });
    parseHash();
    FailDrafts.refreshBadge();
    try {
      await load();
    } catch (_) {
      state.inquiries = [];
      state.centres = [];
      state.templates = [];
    }
    render();
  }

  return { state, load, render, go, toast, openModal, closeModal, showLoader, hideLoader, init };
})();

window.addEventListener("DOMContentLoaded", () => {
  if (typeof App !== "undefined" && typeof App.init === "function") App.init();
});
