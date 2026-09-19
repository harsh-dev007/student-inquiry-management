window.GoogleForm = (() => {
  async function render() {
    const rows = App.state.inquiries.filter((x) => x.source === "Google Form");
    const lastSync = sessionStorage.getItem("simulatedLastSync") || sessionStorage.getItem("lastLiveSync");
    const syncLabel = lastSync ? Utils.formatDateTime(lastSync) : "Not synced yet";

    document.getElementById("view").innerHTML = `
      <div class="kpi-grid">
        <div class="kpi blue"><div class="kpi-icon">G</div><div><span>Total Google Form Inquiries</span><strong>${rows.length}</strong></div></div>
        <div class="kpi green"><div class="kpi-icon">✓</div><div><span>Imported</span><strong id="gfImported">${rows.length}</strong></div></div>
        <div class="kpi orange"><div class="kpi-icon">◷</div><div><span>Pending Import</span><strong id="gfPending">0</strong></div></div>
        <div class="kpi red"><div class="kpi-icon">!</div><div><span>Duplicates Prevented</span><strong id="gfDup">0</strong></div></div>
      </div>
      <div class="card">
        <div class="card-head">
          <div>
            <h3>Google Form Submissions</h3>
            <p class="muted">Imported records appear in Inquiries with <span class="badge info">🔵 Google Form</span>. Last sync: <strong id="gfSync">${Utils.esc(syncLabel)}</strong></p>
          </div>
          <button class="btn btn-primary" id="syncBtn">↻ Sync Now</button>
        </div>
        <div id="gfTable">${tableHtml(rows)}</div>
      </div>
      <div class="card">
        <h3>Field mapping (by question title, not column order)</h3>
        <pre class="code-block">Student Name      → studentName
Student Surname   → studentSurname
Parent Name       → parentName
Parent Surname    → parentSurname
Standard          → standard
Mother Name       → motherName
Mother Number     → motherPhone
Father Name       → fatherName
Father Number     → fatherPhone
School Name       → schoolName
School Timing     → schoolTiming
Centre Name       → centreName

Do NOT ask Source on the form. Backend sets Source = Google Form.</pre>
      </div>`;

    document.getElementById("syncBtn").onclick = async () => {
      const btn = document.getElementById("syncBtn");
      try {
        btn.disabled = true;
        btn.textContent = "Syncing…";
        const result = await API.syncGoogleForm();
        const d = result.data || {};
        sessionStorage.setItem("lastLiveSync", d.lastSync || new Date().toISOString());
        if (d.duplicates) document.getElementById("gfDup").textContent = d.duplicates;
        await App.load();
        render();
        App.toast(`Sync complete — ${d.imported || 0} imported, ${d.duplicates || 0} duplicate(s) skipped`, "success");
      } catch (e) {
        App.toast(e.message, "error");
      } finally {
        btn.disabled = false;
        btn.textContent = "↻ Sync Now";
      }
    };
  }

  function tableHtml(rows) {
    if (!rows.length) {
      return `<div class="empty large">No Google Form records yet.<br><span class="muted">Configure the Apps Script trigger or click Sync Now.</span></div>`;
    }
    return `<div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Student</th><th>Parent</th><th>Centre</th><th>Imported</th><th>Source</th><th>Status</th></tr></thead>
      <tbody>${rows.map((x) => `<tr>
        <td>${Utils.formatDate(x.inquiryDate)}</td>
        <td><strong>${Utils.esc(Utils.fullName(x.studentName, x.studentSurname))}</strong></td>
        <td>${Utils.esc(Utils.fullName(x.parentName, x.parentSurname))}</td>
        <td>${Utils.esc(x.centreName)}</td>
        <td><span class="badge success">✓ Yes</span></td>
        <td><span class="badge info">🔵 Google Form</span></td>
        <td><span class="badge ${Utils.statusClass(x.status)}">${Utils.esc(x.status || "Pending")}</span></td>
      </tr>`).join("")}</tbody>
    </table></div>`;
  }

  return { render };
})();
