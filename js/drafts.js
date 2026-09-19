/**
 * Failed Google Sheet writes are kept in this browser as a JSON notepad log.
 * Staff can retry each draft later without typing the form again.
 */
window.FailDrafts = (() => {
  const KEY = "inquiryFailDrafts";

  function list() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function persist(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    refreshBadge();
  }

  function count() {
    return list().length;
  }

  function get(id) {
    return list().find((d) => d.id === id) || null;
  }

  function sameDraft(a, b) {
    return a.action === b.action
      && String(a.payload?.id || "") === String(b.payload?.id || "")
      && String(a.payload?.studentName || "") === String(b.payload?.studentName || "")
      && String(a.payload?.studentSurname || "") === String(b.payload?.studentSurname || "")
      && String(a.payload?.inquiryDate || "") === String(b.payload?.inquiryDate || "")
      && String(a.payload?.motherPhone || "") === String(b.payload?.motherPhone || "")
      && String(a.payload?.fatherPhone || "") === String(b.payload?.fatherPhone || "");
  }

  function add(payload, error, action) {
    const items = list();
    const inquiry = { ...(payload || {}) };
    const nextAction = action || (inquiry.id ? "updateInquiry" : "saveInquiry");
    const existing = items.find((d) => sameDraft(d, { action: nextAction, payload: inquiry }));
    if (existing) {
      existing.lastError = String(error || "Failed to save to Google Sheet");
      existing.updatedAt = new Date().toISOString();
      persist(items);
      return existing;
    }
    const draft = {
      id: Utils.uid("draft"),
      action: nextAction,
      status: "failed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastError: String(error || "Failed to save to Google Sheet"),
      retryCount: 0,
      payload: inquiry
    };
    items.unshift(draft);
    persist(items);
    return draft;
  }

  function remove(id) {
    persist(list().filter((d) => d.id !== id));
  }

  function clearAll() {
    persist([]);
  }

  function markError(id, error) {
    const items = list();
    const draft = items.find((d) => d.id === id);
    if (!draft) return;
    draft.lastError = String(error || "Retry failed");
    draft.updatedAt = new Date().toISOString();
    draft.retryCount = (draft.retryCount || 0) + 1;
    persist(items);
  }

  function sheetPayload(draft) {
    const inquiry = { ...(draft.payload || {}) };
    if (draft.action === "updateInquiry" && inquiry.id) return inquiry;
    delete inquiry.id;
    delete inquiry.serialNo;
    delete inquiry.sourceRecordId;
    return inquiry;
  }

  async function retry(id) {
    const draft = get(id);
    if (!draft) throw new Error("Draft not found.");
    const inquiry = sheetPayload(draft);
    if (draft.action === "updateInquiry" && inquiry.id) await API.updateInquiry(inquiry);
    else await API.saveInquiry(inquiry);
    remove(id);
  }

  async function retryAll() {
    const ids = list().map((d) => d.id);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await retry(id);
        ok += 1;
      } catch (e) {
        markError(id, e.message);
        fail += 1;
      }
    }
    return { ok, fail };
  }

  function jsonText() {
    return JSON.stringify(list(), null, 2);
  }

  function downloadJson() {
    const blob = new Blob([jsonText() || "[]"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fail-drafts-${Utils.today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  async function copyJson() {
    const text = jsonText() || "[]";
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  function refreshBadge() {
    const el = document.getElementById("draftCount");
    if (!el) return;
    const n = count();
    el.hidden = n === 0;
    el.textContent = String(n);
  }

  function bannerHtml() {
    const n = count();
    if (!n) return "";
    return `<div class="card draft-banner">
      <div>
        <h3>${n} failed draft${n === 1 ? "" : "s"} waiting</h3>
        <p class="muted">These inquiries were not saved to Google Sheet. Open the notepad log and retry.</p>
      </div>
      <button class="btn btn-primary" type="button" onclick="App.go('drafts')">Open failed drafts</button>
    </div>`;
  }

  function cardHtml(d) {
    const p = d.payload || {};
    const name = Utils.fullName(p.studentName, p.studentSurname) || "Untitled inquiry";
    const kind = d.action === "updateInquiry" ? "Edit (retry update)" : "Add (retry save)";
    return `<article class="inq-card draft-card" data-id="${Utils.esc(d.id)}">
      <div class="card-head">
        <div>
          <h4>${Utils.esc(name)}</h4>
          <p class="muted">${Utils.esc(p.centreName || "—")} · ${Utils.formatDate(p.inquiryDate)} · ${Utils.esc(p.standard || "")}</p>
        </div>
        <span class="badge danger">Fail draft</span>
      </div>
      <p class="muted">${Utils.esc(kind)} · Saved ${Utils.formatDateTime(d.createdAt)}${d.retryCount ? ` · Retries ${d.retryCount}` : ""}</p>
      <p class="err-line">${Utils.esc(d.lastError || "Failed to add to Google Sheet")}</p>
      <div class="action-row">
        <button class="btn btn-primary btn-sm" data-retry="${Utils.esc(d.id)}">Retry save to sheet</button>
        <button class="btn btn-sm" data-json="${Utils.esc(d.id)}">View JSON</button>
        <button class="btn btn-sm btn-danger" data-del="${Utils.esc(d.id)}">Delete draft</button>
      </div>
      <pre class="code-block draft-json" id="json-${Utils.esc(d.id)}" hidden>${Utils.esc(JSON.stringify(d, null, 2))}</pre>
    </article>`;
  }

  function render() {
    const items = list();
    document.getElementById("view").innerHTML = `
      <div class="card table-card">
        <div class="card-head">
          <div>
            <h3>Failed drafts</h3>
            <p class="muted">Notepad JSON log in this browser. If Google Sheet save fails, the form is kept here so you can retry later.</p>
          </div>
          <div class="action-row">
            <button class="btn btn-sm btn-primary" id="retryAllDrafts" ${items.length ? "" : "disabled"}>Retry all</button>
            <button class="btn btn-sm" id="copyDraftLog">Copy JSON log</button>
            <button class="btn btn-sm" id="dlDraftLog">Download JSON</button>
            <button class="btn btn-sm btn-danger" id="clearDrafts" ${items.length ? "" : "disabled"}>Clear all</button>
          </div>
        </div>
        ${items.length
          ? items.map(cardHtml).join("")
          : `<div class="empty large">No failed drafts. New add/edit failures will appear here automatically.</div>`}
      </div>
      <div class="card">
        <h3>Full JSON log</h3>
        <p class="muted">This is the local notepad file (${KEY}). It is not uploaded until you click Retry.</p>
        <pre class="code-block" id="fullDraftLog">${Utils.esc(jsonText() || "[]")}</pre>
      </div>`;

    document.getElementById("retryAllDrafts").onclick = async () => {
      if (!items.length) return;
      try {
        const res = await retryAll();
        try { await App.load(); } catch (_) { /* sheet may still be down */ }
        render();
        App.toast(
          res.fail ? `${res.ok} saved, ${res.fail} still failed.` : `${res.ok} draft(s) saved to Google Sheet.`,
          res.fail ? "error" : "success"
        );
      } catch (e) {
        render();
        App.toast(e.message, "error");
      }
    };
    document.getElementById("copyDraftLog").onclick = async () => {
      try {
        await copyJson();
        App.toast("JSON log copied.", "success");
      } catch (e) {
        App.toast(e.message || "Could not copy.", "error");
      }
    };
    document.getElementById("dlDraftLog").onclick = () => {
      downloadJson();
      App.toast("JSON log downloaded.", "success");
    };
    document.getElementById("clearDrafts").onclick = () => {
      if (!items.length) return;
      if (!confirm("Delete all failed drafts from this browser? This cannot be undone.")) return;
      clearAll();
      render();
      App.toast("Failed drafts cleared.", "success");
    };

    document.getElementById("view").onclick = async (e) => {
      if (App.state.route !== "drafts") return;
      const retryBtn = e.target.closest("[data-retry]");
      const jsonBtn = e.target.closest("[data-json]");
      const delBtn = e.target.closest("[data-del]");
      if (retryBtn) {
        const id = retryBtn.getAttribute("data-retry");
        retryBtn.disabled = true;
        retryBtn.textContent = "Saving…";
        try {
          await retry(id);
          try { await App.load(); } catch (_) { /* saved even if refresh fails */ }
          render();
          App.toast("Saved to Google Sheet. Draft removed.", "success");
        } catch (err) {
          markError(id, err.message);
          render();
          App.toast(err.message, "error");
        }
        return;
      }
      if (jsonBtn) {
        const box = document.getElementById("json-" + jsonBtn.getAttribute("data-json"));
        if (box) box.hidden = !box.hidden;
        return;
      }
      if (delBtn) {
        const id = delBtn.getAttribute("data-del");
        if (!confirm("Delete this fail draft? The inquiry will not be sent to Google Sheet.")) return;
        remove(id);
        render();
        App.toast("Draft deleted.", "success");
      }
    };
  }

  return { list, add, remove, retry, retryAll, count, render, refreshBadge, bannerHtml, downloadJson };
})();
