window.Inquiries = (() => {
  const EXPORT_HEADERS = [
    "id", "serialNo", "inquiryDate", "centreName", "source", "sourceRecordId",
    "studentName", "studentSurname", "parentName", "parentSurname", "standard",
    "motherName", "motherPhone", "fatherName", "fatherPhone", "schoolName", "schoolTiming",
    "demo1Date", "demo1Attendance", "demo2Date", "demo2Attendance", "demo3Date", "demo3Attendance",
    "status", "remark", "createdAt", "updatedAt", "createdBy"
  ];

  function preset(route) {
    if (route === "pending") return { status: "Pending" };
    if (route === "ok") return { status: "Admission OK" };
    if (route === "notok") return { status: "Admission Not OK" };
    if (route === "demo") return { demo: true };
    return {};
  }

  function applyFilters(rows) {
    const q = document.getElementById("q")?.value || "";
    const centre = document.getElementById("fCentre")?.value || "";
    const source = document.getElementById("fSource")?.value || "";
    const status = document.getElementById("fStatus")?.value || "";
    const range = document.getElementById("fDate")?.value || "all";
    const custom = document.getElementById("customDates");
    if (custom) custom.classList.toggle("show", range === "custom");
    return rows.filter((x) => {
      if (!Utils.matchesSearch(x, q)) return false;
      if (centre && x.centreName !== centre) return false;
      if (source && x.source !== source) return false;
      if (status && x.status !== status) return false;
      if (window._listPreset?.status && x.status !== window._listPreset.status) return false;
      if (window._listPreset?.demo && !Utils.startedDemo(x)) return false;
      return Utils.inDateRange(x.inquiryDate, range);
    });
  }

  function render(route) {
    window._listPreset = preset(route);
    const centres = App.state.centres || [];
    const filtered = applyFilters(App.state.inquiries || []);
    const title = {
      inquiries: "All Inquiries", pending: "Pending Inquiry", demo: "Demo Students",
      ok: "Admission OK", notok: "Admission Not OK", export: "Export to Excel"
    }[route] || "Inquiries";

    document.getElementById("view").innerHTML = `
      <div class="card table-card">
        <div class="card-head">
          <div><h3>${title}</h3><p class="muted">${filtered.length} record(s)</p></div>
          <div class="action-row">
            <button class="btn btn-sm" id="expFilter">Export current filter</button>
            ${route === "export" ? `
              <button class="btn btn-sm" id="expAll">Export all</button>
              <button class="btn btn-sm" id="expPending">Export pending</button>
              <button class="btn btn-sm" id="expOk">Export admission OK</button>
              <button class="btn btn-sm" id="expNot">Export not OK</button>
            ` : ""}
            <button class="btn btn-primary btn-sm" onclick="App.go('add')">＋ Add</button>
          </div>
        </div>
        <div class="filters">
          <input class="search-field" id="q" placeholder="Search student, parent, phone, school, serial…">
          <select id="fCentre"><option value="">All Centres</option>${centres.map((c) => `<option>${Utils.esc(c.name)}</option>`).join("")}</select>
          <select id="fSource"><option value="">All Sources</option><option>Google Form</option><option>Self</option></select>
          <select id="fStatus"><option value="">All Status</option><option>Pending</option><option>Admission OK</option><option>Admission Not OK</option></select>
          <select id="fDate"><option value="all">All dates</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="custom">Custom range</option></select>
        </div>
        <div class="custom-dates" id="customDates">
          <div class="field"><label>From</label><input type="date" id="dateFrom"></div>
          <div class="field"><label>To</label><input type="date" id="dateTo"></div>
        </div>
        <div class="desktop-table table-wrap">${tableHtml(filtered)}</div>
        <div class="inquiry-cards">${cardsHtml(filtered)}</div>
      </div>`;

    ["q", "fCentre", "fSource", "fStatus", "fDate", "dateFrom", "dateTo"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", () => refreshTable());
      if (el) el.addEventListener("change", () => refreshTable());
    });
    bindExport(route);
    bindRowActions();
  }

  function refreshTable() {
    const filtered = applyFilters(App.state.inquiries || []);
    const wrap = document.querySelector(".desktop-table");
    const cards = document.querySelector(".inquiry-cards");
    if (wrap) wrap.innerHTML = tableHtml(filtered);
    if (cards) cards.innerHTML = cardsHtml(filtered);
    bindRowActions();
  }

  function tableHtml(rows) {
    if (!rows.length) return `<div class="empty">No inquiries match these filters.</div>`;
    return `<table><thead><tr>
      <th>#</th><th>Date</th><th>Student Name</th><th>Parent Name</th><th>Std</th>
      <th>Centre</th><th>School</th><th>Source</th><th>Demo</th><th>Status</th>
      <th>Mother</th><th>Father</th><th>Remark</th><th>Actions</th>
    </tr></thead><tbody>${rows.map(rowHtml).join("")}</tbody></table>`;
  }

  function rowHtml(x) {
    return `<tr>
      <td>${Utils.esc(x.serialNo)}</td>
      <td>${Utils.formatDate(x.inquiryDate)}</td>
      <td><strong>${Utils.esc(Utils.fullName(x.studentName, x.studentSurname))}</strong></td>
      <td>${Utils.esc(Utils.fullName(x.parentName, x.parentSurname))}</td>
      <td>${Utils.esc(x.standard)}</td>
      <td>${Utils.esc(x.centreName)}</td>
      <td>${Utils.esc(x.schoolName)}</td>
      <td><span class="badge ${Utils.sourceClass(x.source)}">${x.source === "Google Form" ? "🔵 Google Form" : "🟢 Self"}</span></td>
      <td>${Utils.esc(Utils.demoLabel(x))}</td>
      <td><span class="badge ${Utils.statusClass(x.status)}">${Utils.esc(x.status)}</span></td>
      <td>${Utils.esc(x.motherPhone)}</td>
      <td>${Utils.esc(x.fatherPhone)}</td>
      <td>${Utils.esc(x.remark)}</td>
      <td>${actions(x)}</td>
    </tr>`;
  }

  function cardsHtml(rows) {
    if (!rows.length) return "";
    return rows.map((x) => `<div class="inq-card">
      <h4>${Utils.esc(Utils.fullName(x.studentName, x.studentSurname))} <span class="badge ${Utils.statusClass(x.status)}">${Utils.esc(x.status)}</span></h4>
      <p class="muted">${Utils.esc(x.centreName)} · ${Utils.formatDate(x.inquiryDate)} · Std ${Utils.esc(x.standard)}</p>
      <p>${Utils.esc(x.schoolName || "")}</p>
      <div class="action-row">${actions(x)}</div>
    </div>`).join("");
  }

  function actions(x) {
    return `<div class="action-row">
      <button class="btn btn-sm btn-success" data-wa="mother" data-id="${Utils.esc(x.id)}">WhatsApp Mother</button>
      <button class="btn btn-sm btn-success" data-wa="father" data-id="${Utils.esc(x.id)}">WhatsApp Father</button>
      <button class="btn btn-sm" data-view="${Utils.esc(x.id)}">View</button>
      <button class="btn btn-sm" data-edit="${Utils.esc(x.id)}">Edit</button>
      ${Auth.canDelete() ? `<button class="btn btn-sm btn-danger" data-del="${Utils.esc(x.id)}">Delete</button>` : ""}
    </div>`;
  }

  function bindRowActions() {
    document.querySelectorAll("[data-wa]").forEach((b) => {
      b.onclick = () => {
        const row = App.state.inquiries.find((x) => x.id === b.dataset.id);
        if (row) WhatsApp.send(row, b.dataset.wa, "Welcome Message");
      };
    });
    document.querySelectorAll("[data-edit], [data-view]").forEach((b) => {
      b.onclick = () => App.go("edit", b.dataset.edit || b.dataset.view);
    });
    document.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Delete this inquiry? This cannot be undone.")) return;
        try {
          await API.deleteInquiry(b.dataset.del);
          await App.load();
          render(App.state.route);
          App.toast("Inquiry deleted", "success");
        } catch (e) { App.toast(e.message, "error"); }
      };
    });
  }

  function bindExport(route) {
    const download = (name, rows) => Utils.downloadCsv(name, rows, EXPORT_HEADERS);
    const all = App.state.inquiries || [];
    const btn = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    btn("expFilter", () => download("inquiries-filtered.csv", applyFilters(all)));
    btn("expAll", () => download("inquiries-all.csv", all));
    btn("expPending", () => download("inquiries-pending.csv", all.filter((x) => x.status === "Pending")));
    btn("expOk", () => download("inquiries-admission-ok.csv", all.filter((x) => x.status === "Admission OK")));
    btn("expNot", () => download("inquiries-admission-not-ok.csv", all.filter((x) => x.status === "Admission Not OK")));
    if (route === "export") {
      /* already bound */
    }
  }

  return { render, EXPORT_HEADERS };
})();
