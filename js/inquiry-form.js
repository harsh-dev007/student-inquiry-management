window.InquiryForm = (() => {
  function val(id) { return document.getElementById(id)?.value?.trim() || ""; }

  function setError(id, msg) {
    const field = document.getElementById(id)?.closest(".field");
    if (!field) return;
    field.classList.toggle("error", !!msg);
    const err = field.querySelector(".err");
    if (err) err.textContent = msg || "";
  }

  function collect() {
    return {
      inquiryDate: val("inquiryDate"),
      centreName: val("centreName"),
      studentName: val("studentName"),
      studentSurname: val("studentSurname"),
      parentName: val("parentName"),
      parentSurname: val("parentSurname"),
      standard: val("standard"),
      motherName: val("motherName"),
      motherPhone: val("motherPhone"),
      fatherName: val("fatherName"),
      fatherPhone: val("fatherPhone"),
      schoolName: val("schoolName"),
      schoolTiming: val("schoolTiming"),
      demo1Date: val("demo1Date"),
      demo1Attendance: val("demo1Attendance"),
      demo2Date: val("demo2Date"),
      demo2Attendance: val("demo2Attendance"),
      demo3Date: val("demo3Date"),
      demo3Attendance: val("demo3Attendance"),
      status: val("status") || "Pending",
      remark: val("remark")
    };
  }

  function clientValidate(data) {
    let ok = true;
    const req = [
      ["inquiryDate", "Inquiry date is required."],
      ["centreName", "Centre name is required."],
      ["studentName", "Student name is required."],
      ["standard", "Standard is required."]
    ];
    req.forEach(([id, msg]) => {
      const bad = !data[id];
      setError(id, bad ? msg : "");
      if (bad) ok = false;
    });
    if (!Utils.isIndianPhone(data.motherPhone) && !Utils.isIndianPhone(data.fatherPhone)) {
      setError("motherPhone", "Enter at least one valid 10-digit Indian mobile.");
      setError("fatherPhone", "Enter at least one valid 10-digit Indian mobile.");
      ok = false;
    } else {
      setError("motherPhone", data.motherPhone && !Utils.isIndianPhone(data.motherPhone) ? "Invalid number." : "");
      setError("fatherPhone", data.fatherPhone && !Utils.isIndianPhone(data.fatherPhone) ? "Invalid number." : "");
      if (data.motherPhone && !Utils.isIndianPhone(data.motherPhone)) ok = false;
      if (data.fatherPhone && !Utils.isIndianPhone(data.fatherPhone)) ok = false;
    }
    return ok;
  }

  function options(list, selected) {
    return list.map((x) => `<option ${x === selected ? "selected" : ""}>${Utils.esc(x)}</option>`).join("");
  }

  function render(id) {
    const row = id ? App.state.inquiries.find((x) => x.id === id) : null;
    const centres = (App.state.centres || []).filter((c) => c.status !== "Inactive");
    const source = row ? row.source : "Self";
    document.getElementById("view").innerHTML = `
      <div class="card">
        <h3>${row ? "Edit inquiry" : "Add inquiry"}</h3>
        <p class="muted">Source is set automatically to <span class="badge ${Utils.sourceClass(source)}">${Utils.esc(source)}</span>. Staff never type it.</p>
        <form id="inqForm" class="form-grid" novalidate>
          <div class="section-title">Basic Information</div>
          <div class="field"><label for="inquiryDate">Inquiry Date</label><input id="inquiryDate" type="date" value="${Utils.esc(row?.inquiryDate?.slice(0, 10) || Utils.today())}" required><div class="err"></div></div>
          <div class="field"><label for="centreName">Centre Name</label><select id="centreName">${centres.map((c) => `<option ${c.name === row?.centreName ? "selected" : ""}>${Utils.esc(c.name)}</option>`).join("")}</select><div class="err"></div></div>
          <div class="field"><label>Source</label><input value="${Utils.esc(source)}" disabled></div>
          <div class="field"><label>Serial Number</label><input value="${Utils.esc(row?.serialNo || "Auto")}" disabled></div>

          <div class="section-title">Student Information</div>
          <div class="field"><label for="studentName">Student Full Name</label><input id="studentName" value="${Utils.esc(row?.studentName || "")}"><div class="err"></div></div>
          <div class="field"><label for="studentSurname">Student Surname</label><input id="studentSurname" value="${Utils.esc(row?.studentSurname || "")}"></div>
          <div class="field"><label for="parentName">Parent Full Name</label><input id="parentName" value="${Utils.esc(row?.parentName || "")}"></div>
          <div class="field"><label for="parentSurname">Parent Surname</label><input id="parentSurname" value="${Utils.esc(row?.parentSurname || "")}"></div>
          <div class="field"><label for="standard">Standard / Grade</label><select id="standard">${options(APP_CONFIG.STANDARDS, row?.standard)}</select><div class="err"></div></div>

          <div class="section-title">Contact Information</div>
          <div class="field"><label for="motherName">Mother's Name</label><input id="motherName" value="${Utils.esc(row?.motherName || "")}"></div>
          <div class="field"><label for="motherPhone">Mother's Mobile</label>
            <div class="phone-row"><input id="motherPhone" inputmode="numeric" value="${Utils.esc(row?.motherPhone || "")}">
            <button type="button" class="btn" id="waM">WhatsApp</button></div><div class="err"></div></div>
          <div class="field"><label for="fatherName">Father's Name</label><input id="fatherName" value="${Utils.esc(row?.fatherName || "")}"></div>
          <div class="field"><label for="fatherPhone">Father's Mobile</label>
            <div class="phone-row"><input id="fatherPhone" inputmode="numeric" value="${Utils.esc(row?.fatherPhone || "")}">
            <button type="button" class="btn" id="waF">WhatsApp</button></div><div class="err"></div></div>

          <div class="section-title">School Information</div>
          <div class="field"><label for="schoolName">School Name</label><input id="schoolName" value="${Utils.esc(row?.schoolName || "")}"></div>
          <div class="field"><label for="schoolTiming">School Timing</label><input id="schoolTiming" placeholder="8:00 AM - 2:00 PM" value="${Utils.esc(row?.schoolTiming || "")}"></div>

          <div class="section-title">Demo Details</div>
          <div class="field"><label>Demo Day 1 Date</label><input id="demo1Date" type="date" value="${Utils.esc((row?.demo1Date || "").slice(0, 10))}"></div>
          <div class="field"><label>Demo Day 1 Attendance</label><select id="demo1Attendance">${options(APP_CONFIG.ATTENDANCE_VALUES, row?.demo1Attendance)}</select></div>
          <div class="field"><label>Demo Day 2 Date</label><input id="demo2Date" type="date" value="${Utils.esc((row?.demo2Date || "").slice(0, 10))}"></div>
          <div class="field"><label>Demo Day 2 Attendance</label><select id="demo2Attendance">${options(APP_CONFIG.ATTENDANCE_VALUES, row?.demo2Attendance)}</select></div>
          <div class="field"><label>Demo Day 3 Date</label><input id="demo3Date" type="date" value="${Utils.esc((row?.demo3Date || "").slice(0, 10))}"></div>
          <div class="field"><label>Demo Day 3 Attendance</label><select id="demo3Attendance">${options(APP_CONFIG.ATTENDANCE_VALUES, row?.demo3Attendance)}</select></div>

          <div class="section-title">Admission</div>
          <div class="field"><label for="status">Admission Status</label><select id="status">${options(APP_CONFIG.STATUS_VALUES, row?.status || "Pending")}</select></div>
          <div class="field full"><label for="remark">Remark</label><textarea id="remark">${Utils.esc(row?.remark || "")}</textarea></div>

          <div class="form-actions full">
            <button class="btn btn-primary" type="submit" id="saveBtn">Save Inquiry</button>
            <button class="btn btn-success" type="button" id="saveWa">Save & WhatsApp</button>
            <button class="btn" type="button" onclick="App.go('inquiries')">Cancel</button>
            <button class="btn" type="reset">Clear</button>
          </div>
        </form>
      </div>`;

    document.getElementById("waM").onclick = () => WhatsApp.open(val("motherPhone"), WhatsApp.fill(WhatsApp.templateByName("Welcome Message").body, collect()));
    document.getElementById("waF").onclick = () => WhatsApp.open(val("fatherPhone"), WhatsApp.fill(WhatsApp.templateByName("Welcome Message").body, collect()));
    document.getElementById("saveWa").onclick = () => save(row, true);
    document.getElementById("inqForm").onsubmit = (e) => { e.preventDefault(); save(row, false); };
  }

  async function save(row, thenWhatsApp) {
    const data = collect();
    if (!clientValidate(data)) return;
    const dups = Utils.findDuplicates(App.state.inquiries, data, row?.id);
    if (dups.length && !confirm("A similar inquiry already exists. Do you want to continue?")) return;
    const btn = document.getElementById("saveBtn");
    btn.disabled = true;
    btn.textContent = "Saving...";
    try {
      if (row) await API.updateInquiry({ ...data, id: row.id });
      else await API.saveInquiry(data);
      try { await App.load(); } catch (_) { /* row may already be in the Sheet */ }
      App.toast("Inquiry saved successfully.", "success");
      if (thenWhatsApp) WhatsApp.send({ ...row, ...data }, "mother", "Welcome Message");
      App.go("inquiries");
    } catch (e) {
      const payload = row ? { ...data, id: row.id } : data;
      FailDrafts.add(payload, e.message, row ? "updateInquiry" : "saveInquiry");
      App.toast((e.message || "Could not save to Google Sheet") + " Saved as a fail draft. Open Failed drafts to retry.", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Save Inquiry";
      }
    }
  }

  return { render };
})();
