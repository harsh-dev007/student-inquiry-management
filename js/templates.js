window.Templates = (() => {
  function render() {
    const rows = App.state.templates || [];
    document.getElementById("view").innerHTML = `
      <div class="card">
        <h3>Message Templates / Media</h3>
        <p class="muted">WhatsApp opens a pre-filled chat. This page cannot silently send a message. Use public Drive/YouTube HTTPS links for pamphlet/video.</p>
        ${Auth.canManageSettings() ? `
        <form id="tForm" class="form-grid">
          <input type="hidden" id="tId">
          <div class="field"><label>Name</label><input id="tName" required></div>
          <div class="field"><label>Media URL (optional)</label><input id="tMedia" placeholder="https://"></div>
          <div class="field full"><label>Message</label><textarea id="tBody" required></textarea>
            <p class="hint">Variables: {student_name} {parent_name} {centre_name} {school_name} {standard} {demo_date} {media_url}</p></div>
          <div class="form-actions full"><button class="btn btn-primary" type="submit">Save template</button></div>
        </form>` : ""}
      </div>
      <div class="template-grid">${rows.map((t) => `<div class="template-card">
        <h4>${Utils.esc(t.name)}</h4>
        <pre>${Utils.esc(t.body)}</pre>
        ${t.mediaUrl ? `<p class="muted">${Utils.esc(t.mediaUrl)}</p>` : ""}
        <div class="action-row">
          <button class="btn btn-sm" data-pick="${Utils.esc(t.id)}">Send to inquiry…</button>
          ${Auth.canManageSettings() ? `<button class="btn btn-sm" data-edit="${Utils.esc(t.id)}">Edit</button>
          <button class="btn btn-sm btn-danger" data-del="${Utils.esc(t.id)}">Delete</button>` : ""}
        </div>
      </div>`).join("")}</div>`;

    const form = document.getElementById("tForm");
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await API.saveTemplate({
          id: document.getElementById("tId").value || undefined,
          name: document.getElementById("tName").value,
          body: document.getElementById("tBody").value,
          mediaUrl: document.getElementById("tMedia").value
        });
        await App.load();
        render();
        App.toast("Template saved", "success");
      } catch (err) { App.toast(err.message, "error"); }
    };
    document.querySelectorAll("[data-edit]").forEach((b) => {
      b.onclick = () => {
        const t = rows.find((x) => x.id === b.dataset.edit);
        if (!t) return;
        document.getElementById("tId").value = t.id;
        document.getElementById("tName").value = t.name;
        document.getElementById("tBody").value = t.body;
        document.getElementById("tMedia").value = t.mediaUrl || "";
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
    });
    document.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Delete this template?")) return;
        try { await API.deleteTemplate(b.dataset.del); await App.load(); render(); } catch (err) { App.toast(err.message, "error"); }
      };
    });
    document.querySelectorAll("[data-pick]").forEach((b) => {
      b.onclick = () => pickInquiry(b.dataset.pick);
    });
  }

  function pickInquiry(templateId) {
    const t = App.state.templates.find((x) => x.id === templateId);
    const list = App.state.inquiries.slice(0, 40);
    App.openModal(`<h3>Send “${Utils.esc(t.name)}”</h3>
      <p class="muted">Choose inquiry, then mother or father. WhatsApp will open with the message filled in.</p>
      ${list.map((x) => `<div class="stat-row">
        <span>${Utils.esc(Utils.fullName(x.studentName, x.studentSurname))} · ${Utils.esc(x.centreName)}</span>
        <span>
          <button class="btn btn-sm btn-success" data-send="mother" data-id="${Utils.esc(x.id)}">Mother</button>
          <button class="btn btn-sm btn-success" data-send="father" data-id="${Utils.esc(x.id)}">Father</button>
        </span>
      </div>`).join("")}`);
    document.querySelectorAll("[data-send]").forEach((btn) => {
      btn.onclick = () => {
        const row = App.state.inquiries.find((x) => x.id === btn.dataset.id);
        WhatsApp.send(row, btn.dataset.send, t.name);
      };
    });
  }

  return { render };
})();
