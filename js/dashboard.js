window.Dashboard = (() => {
  function stats(rows) {
    return {
      total: rows.length,
      ok: rows.filter((x) => x.status === "Admission OK").length,
      notOk: rows.filter((x) => x.status === "Admission Not OK").length,
      pending: rows.filter((x) => x.status === "Pending").length,
      demo: rows.filter(Utils.startedDemo).length
    };
  }

  function render() {
    const rows = App.state.inquiries || [];
    const s = stats(rows);
    const recent = [...rows].sort((a, b) => String(b.inquiryDate).localeCompare(String(a.inquiryDate))).slice(0, 8);
    const sources = {};
    const centres = {};
    rows.forEach((x) => {
      sources[x.source || "Unknown"] = (sources[x.source || "Unknown"] || 0) + 1;
      centres[x.centreName || "Other"] = (centres[x.centreName || "Other"] || 0) + 1;
    });
    const maxC = Math.max(1, ...Object.values(centres));

    document.getElementById("view").innerHTML = `
      ${typeof FailDrafts !== "undefined" ? FailDrafts.bannerHtml() : ""}
      <div class="hero">
        <div>
          <h2>Welcome</h2>
          <p>Track inquiries, demos and admissions across centres. Google Form and staff entries share one sheet.</p>
        </div>
        <button class="btn" onclick="App.go('add')">＋ Add Inquiry</button>
      </div>
      <div class="kpi-grid">
        <div class="kpi blue"><div class="kpi-icon">Σ</div><div><span>Total Inquiries</span><strong>${s.total}</strong></div></div>
        <div class="kpi green"><div class="kpi-icon">✓</div><div><span>Admission OK</span><strong>${s.ok}</strong></div></div>
        <div class="kpi red"><div class="kpi-icon">✕</div><div><span>Admission Not OK</span><strong>${s.notOk}</strong></div></div>
        <div class="kpi orange"><div class="kpi-icon">◷</div><div><span>Pending Inquiries</span><strong>${s.pending}</strong></div></div>
        <div class="kpi navy"><div class="kpi-icon">D</div><div><span>Demo Students</span><strong>${s.demo}</strong></div></div>
      </div>
      ${!rows.length ? emptyBanner() : ""}
      <div class="grid-2">
        <div class="card">
          <h3>Source statistics</h3>
          ${Object.keys(sources).length ? Object.entries(sources).map(([k, v]) => `<div class="stat-row"><span>${k === "Google Form" ? "🔵 Google Form" : "🟢 " + Utils.esc(k)}</span><strong>${v}</strong></div>`).join("") : `<p class="muted">No data yet.</p>`}
        </div>
        <div class="card">
          <h3>Centre statistics</h3>
          ${Object.keys(centres).length ? Object.entries(centres).map(([k, v]) => `<div class="stat-row"><div style="flex:1"><span>${Utils.esc(k)}</span><div class="bar"><span style="width:${(v / maxC) * 100}%"></span></div></div><strong>${v}</strong></div>`).join("") : `<p class="muted">No data yet.</p>`}
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Recent inquiries</h3><button class="btn btn-sm" onclick="App.go('inquiries')">View all</button></div>
        ${recent.length ? `<div class="table-wrap"><table>
          <thead><tr><th>Student</th><th>Centre</th><th>Source</th><th>Status</th></tr></thead>
          <tbody>${recent.map((x) => `<tr>
            <td><strong>${Utils.esc(Utils.fullName(x.studentName, x.studentSurname))}</strong></td>
            <td>${Utils.esc(x.centreName)}</td>
            <td><span class="badge ${Utils.sourceClass(x.source)}">${Utils.esc(x.source)}</span></td>
            <td><span class="badge ${Utils.statusClass(x.status)}">${Utils.esc(x.status)}</span></td>
          </tr>`).join("")}</tbody>
        </table></div>` : `<div class="empty">No recent inquiries.</div>`}
      </div>`;
  }

  function emptyBanner() {
    if (API.isDemo()) {
      return `<div class="card demo-banner"><h3>No inquiries loaded</h3><p class="muted">Demo mode stores sample data in this browser tab only. Click below to load 10 sample records.</p><button class="btn btn-primary" id="loadDemoBtn">Load sample data</button></div>`;
    }
    return `<div class="card demo-banner"><h3>Google Sheet is empty</h3><p class="muted">The app is connected. Add your first inquiry, or seed sample rows from Settings.</p><button class="btn btn-primary" onclick="App.go('add')">＋ Add Inquiry</button></div>`;
  }

  function bind() {
    const btn = document.getElementById("loadDemoBtn");
    if (btn) btn.onclick = async () => {
      try {
        await API.seedDemoData();
        await App.load();
        render();
        bind();
        App.toast("Sample data loaded", "success");
      } catch (e) { App.toast(e.message, "error"); }
    };
  }

  return { render: () => { render(); bind(); }, stats };
})();
