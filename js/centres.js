window.Centres = (() => {
  function render() {
    const rows = App.state.centres || [];
    document.getElementById("view").innerHTML = `
      <div class="card">
        <div class="card-head"><h3>Centre Management</h3></div>
        ${Auth.canManageSettings() ? `
        <form id="cForm" class="form-grid">
          <div class="field"><label>Centre Name</label><input id="cName" required></div>
          <div class="field"><label>Centre Code</label><input id="cCode" required placeholder="HMT"></div>
          <div class="field"><label>Status</label><select id="cStatus"><option>Active</option><option>Inactive</option></select></div>
          <div class="form-actions full"><button class="btn btn-primary" type="submit">Save centre</button></div>
        </form>` : `<p class="muted">Staff can view centres. Only Admin can add or delete.</p>`}
      </div>
      <div class="card">
        <div class="table-wrap"><table>
          <thead><tr><th>Name</th><th>Code</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.map((c) => `<tr>
            <td>${Utils.esc(c.name)}</td><td>${Utils.esc(c.code)}</td>
            <td><span class="badge ${c.status === "Active" ? "success" : "warning"}">${Utils.esc(c.status)}</span></td>
            <td>${Auth.canManageSettings() ? `<button class="btn btn-sm btn-danger" data-code="${Utils.esc(c.code)}">Delete</button>` : ""}</td>
          </tr>`).join("")}</tbody>
        </table></div>
      </div>`;

    const form = document.getElementById("cForm");
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await API.saveCentre({ name: document.getElementById("cName").value, code: document.getElementById("cCode").value, status: document.getElementById("cStatus").value });
        await App.load();
        render();
        App.toast("Centre saved", "success");
      } catch (err) { App.toast(err.message, "error"); }
    };
    document.querySelectorAll("[data-code]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Delete this centre?")) return;
        try {
          await API.deleteCentre(b.dataset.code);
          await App.load();
          render();
          App.toast("Centre deleted", "success");
        } catch (err) { App.toast(err.message, "error"); }
      };
    });
  }
  return { render };
})();
