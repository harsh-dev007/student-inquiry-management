window.WhatsApp = (() => {
  function fill(template, inquiry) {
    const demoDate = inquiry.demo1Date || inquiry.demo2Date || inquiry.demo3Date || "";
    const map = {
      "{student_name}": Utils.fullName(inquiry.studentName, inquiry.studentSurname),
      "{parent_name}": Utils.fullName(inquiry.parentName, inquiry.parentSurname) || inquiry.motherName || inquiry.fatherName || "Parent",
      "{centre_name}": inquiry.centreName || "",
      "{school_name}": inquiry.schoolName || "",
      "{standard}": inquiry.standard || "",
      "{demo_date}": Utils.formatDate(demoDate),
      "{media_url}": inquiry.mediaUrl || ""
    };
    let body = String(template || "");
    Object.keys(map).forEach((k) => { body = body.split(k).join(map[k]); });
    return body;
  }

  function open(phone, message) {
    const intl = Utils.waPhone(phone);
    if (!intl) {
      App.toast("Valid 10-digit Indian mobile number is required for WhatsApp.", "error");
      return;
    }
    const url = `https://wa.me/${intl}?text=${encodeURIComponent(message || "")}`;
    window.open(url, "_blank", "noopener");
  }

  function templateByName(name) {
    return (App.state.templates || []).find((t) => t.name === name) || {};
  }

  function send(inquiry, which, templateName) {
    const phone = which === "father" ? inquiry.fatherPhone : inquiry.motherPhone;
    const tpl = templateByName(templateName);
    const body = fill(tpl.body || "Hello {parent_name},\n\nRegarding {student_name} at {centre_name}.\n\nThank you.", { ...inquiry, mediaUrl: tpl.mediaUrl });
    open(phone, body);
  }

  return { fill, open, send, templateByName };
})();
