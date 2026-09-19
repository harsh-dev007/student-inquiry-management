window.Reports = (() => {
  function parseCsv(text) {
    const rows = [];
    let row = [], cell = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], next = text[i + 1];
      if (inQ) {
        if (ch === '"' && next === '"') { cell += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cell += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch !== "\r") cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => String(c).trim()));
  }

  function render() {
    const s = Dashboard.stats(App.state.inquiries || []);
    document.getElementById("view").innerHTML = `
      <div class="kpi-grid">
        <div class="kpi blue"><div class="kpi-icon">Σ</div><div><span>Total</span><strong>${s.total}</strong></div></div>
        <div class="kpi green"><div class="kpi-icon">✓</div><div><span>Admission OK</span><strong>${s.ok}</strong></div></div>
        <div class="kpi red"><div class="kpi-icon">✕</div><div><span>Not OK</span><strong>${s.notOk}</strong></div></div>
        <div class="kpi orange"><div class="kpi-icon">◷</div><div><span>Pending</span><strong>${s.pending}</strong></div></div>
        <div class="kpi navy"><div class="kpi-icon">D</div><div><span>Demo</span><strong>${s.demo}</strong></div></div>
      </div>
      <div class="card">
        <h3>Optional CSV import</h3>
        <p class="muted">Preview, validate, detect duplicates, then confirm. Never blindly inserts thousands of rows.</p>
        <input type="file" id="csvFile" accept=".csv,text/csv">
        <div id="preview" class="import-preview"></div>
      </div>`;
    document.getElementById("csvFile").onchange = (e) => preview(e.target.files[0]);
  }

  async function preview(file) {
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) { App.toast("CSV has no data rows.", "error"); return; }
    const headers = rows[0].map((h) => h.trim());
    const needed = ["studentName", "standard", "centreName", "inquiryDate"];
    const missing = needed.filter((h) => !headers.includes(h));
    const data = rows.slice(1, 51).map((r) => {
      const o = {};
      headers.forEach((h, i) => o[h] = r[i]);
      return o;
    });
    const dups = data.filter((o) => Utils.findDuplicates(App.state.inquiries, o).length);
    document.getElementById("preview").innerHTML = `
      <p>${missing.length ? `<span class="badge danger">Missing columns: ${Utils.esc(missing.join(", "))}</span>` : `<span class="badge success">Required columns present</span>`}
      · ${data.length} row(s) previewed (max 50) · ${dups.length} likely duplicate(s)</p>
      <div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${Utils.esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${data.slice(0, 8).map((o) => `<tr>${headers.map((h) => `<td>${Utils.esc(o[h])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      ${missing.length ? "" : `<button class="btn btn-primary" id="confirmImport">Confirm import of ${data.length} row(s)</button>`}`;
    const btn = document.getElementById("confirmImport");
    if (btn) btn.onclick = async () => {
      if (!confirm(`Import ${data.length} inquiries?`)) return;
      btn.disabled = true;
      let n = 0;
      try {
        for (const o of data) {
          o.status = o.status || "Pending";
          await API.saveInquiry(o);
          n++;
        }
        await App.load();
        App.toast(`Imported ${n} inquiries.`, "success");
        render();
      } catch (err) {
        App.toast(`Stopped after ${n}: ${err.message}`, "error");
      }
    };
  }

  function renderSettings() {
    document.getElementById("view").innerHTML = `
      <div class="card">
        <h3>Settings</h3>
        <p class="muted">Frontend config is public. Secrets stay in Google Apps Script / the Sheet.</p>
        <div class="field"><label>Apps Script Web App URL</label>
          <input id="apiUrl" value="${Utils.esc(API.getApiUrl())}">
          <p class="hint">Paste the /exec URL. Leave DEMO_MODE off to use Google Sheet.</p></div>
        <div class="field"><label>Demo mode</label>
          <select id="demoMode"><option value="false">Off — use Google Sheet</option><option value="true">On — browser sample data</option></select></div>
        <div class="field"><label>Working as</label>
          <select id="role"><option>Admin</option><option>Staff</option></select></div>
        <div class="form-actions">
          <button class="btn btn-primary" id="saveCfg">Save local settings</button>
          <button class="btn" id="seed">Load / seed sample data</button>
          <button class="btn btn-danger" id="clear">Remove demo data</button>
        </div>
      </div>
      <div class="card">
        <h3>Security</h3>
        <ul class="muted">
          <li>Never put service-account JSON, passwords, or sheet credentials in this frontend.</li>
          <li>GitHub Pages is a public static site. Only the Apps Script URL belongs in config.js.</li>
          <li>Client-side Admin/Staff switch is for local testing. Production uses Google sign-in + Users sheet.</li>
          <li>Deploy Apps Script as Web app, access: Anyone, then JSONP can reach the Sheet from localhost or Pages.</li>
        </ul>
      </div>`;
    document.getElementById("demoMode").value = String(window.APP_CONFIG.DEMO_MODE === true);
    document.getElementById("role").value = Auth.getRole();
    document.getElementById("saveCfg").onclick = () => {
      sessionStorage.setItem("apiUrl", document.getElementById("apiUrl").value.trim());
      window.APP_CONFIG.DEMO_MODE = document.getElementById("demoMode").value === "true";
      Auth.setRole(document.getElementById("role").value);
      Auth.renderChip();
      App.toast("Local settings saved. Click Refresh.", "success");
    };
    document.getElementById("seed").onclick = async () => {
      try { await API.seedDemoData(); await App.load(); App.go("dashboard"); App.toast("Sample data loaded", "success"); }
      catch (e) { App.toast(e.message, "error"); }
    };
    document.getElementById("clear").onclick = async () => {
      if (!confirm("Remove demo records?")) return;
      try { await API.clearDemoData(); await App.load(); App.go("dashboard"); App.toast("Demo data removed", "success"); }
      catch (e) { App.toast(e.message, "error"); }
    };
  }

  return { render, renderSettings };
})();
