window.Utils = (() => {
  const esc = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const today = () => {
    const d = new Date();
    const tz = window.APP_CONFIG?.TIMEZONE || "Asia/Kolkata";
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    } catch {
      return d.toISOString().slice(0, 10);
    }
  };

  const digits = (value) => String(value || "").replace(/\D/g, "");

  const isIndianPhone = (value) => {
    const d = digits(value);
    if (d.length === 12 && d.startsWith("91")) return /^[6-9]\d{9}$/.test(d.slice(2));
    return /^[6-9]\d{9}$/.test(d);
  };

  const normalizePhone = (value) => {
    const d = digits(value);
    if (d.length === 12 && d.startsWith("91")) return d.slice(2);
    if (d.length === 11 && d.startsWith("0")) return d.slice(1);
    return d.length === 10 ? d : String(value || "").trim();
  };

  const waPhone = (value) => {
    const n = normalizePhone(value);
    return isIndianPhone(n) ? `91${n}` : "";
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const s = String(value).slice(0, 10);
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return esc(value);
    return `${d}-${m}-${y}`;
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return formatDate(value);
    return d.toLocaleString(window.APP_CONFIG?.DATE_FORMAT || "en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const fullName = (first, last) => `${first || ""} ${last || ""}`.trim();

  const startedDemo = (row) => {
    const attended = [row.demo1Attendance, row.demo2Attendance, row.demo3Attendance]
      .some((x) => String(x) === "Attended");
    const dated = [row.demo1Date, row.demo2Date, row.demo3Date].some(Boolean);
    return attended || dated;
  };

  const demoLabel = (row) => {
    const days = [
      row.demo1Attendance === "Attended" || row.demo1Date,
      row.demo2Attendance === "Attended" || row.demo2Date,
      row.demo3Attendance === "Attended" || row.demo3Date
    ].filter(Boolean).length;
    if (!days) return "—";
    return `${days}/3`;
  };

  const inDateRange = (isoDate, range) => {
    if (!range || range === "all") return true;
    const d = String(isoDate || "").slice(0, 10);
    if (!d) return false;
    const t = today();
    if (range === "today") return d === t;
    const dt = new Date(`${d}T00:00:00`);
    if (range === "week") {
      const now = new Date(`${t}T00:00:00`);
      const start = new Date(now);
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day);
      return dt >= start && dt <= now;
    }
    if (range === "month") return d.slice(0, 7) === t.slice(0, 7);
    if (range === "custom") {
      const from = document.getElementById("dateFrom")?.value;
      const to = document.getElementById("dateTo")?.value;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }
    return true;
  };

  const matchesSearch = (row, q) => {
    if (!q) return true;
    const hay = [
      row.studentName, row.studentSurname, row.parentName, row.parentSurname,
      row.motherPhone, row.fatherPhone, row.schoolName, row.serialNo, row.id
    ].join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  const findDuplicates = (inquiries, candidate, excludeId) => {
    const student = fullName(candidate.studentName, candidate.studentSurname).toLowerCase();
    const parent = fullName(candidate.parentName, candidate.parentSurname).toLowerCase();
    const phones = [normalizePhone(candidate.motherPhone), normalizePhone(candidate.fatherPhone)].filter((p) => p.length === 10);
    return (inquiries || []).filter((x) => {
      if (excludeId && x.id === excludeId) return false;
      const sameStudent = fullName(x.studentName, x.studentSurname).toLowerCase() === student && student;
      const sameParent = parent && fullName(x.parentName, x.parentSurname).toLowerCase() === parent;
      const samePhone = phones.some((p) => p === normalizePhone(x.motherPhone) || p === normalizePhone(x.fatherPhone));
      return (sameStudent && samePhone) || (sameStudent && sameParent && samePhone);
    });
  };

  const csvEscape = (value) => {
    const s = String(value ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const downloadCsv = (filename, rows, headers) => {
    const lines = [headers.join(",")];
    rows.forEach((row) => {
      lines.push(headers.map((h) => csvEscape(row[h])).join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const statusClass = (status) => {
    if (status === "Admission OK") return "success";
    if (status === "Admission Not OK") return "danger";
    return "warning";
  };

  const sourceClass = (source) => (source === "Google Form" ? "info" : "self");

  return {
    esc, uid, today, digits, isIndianPhone, normalizePhone, waPhone,
    formatDate, formatDateTime, fullName, startedDemo, demoLabel,
    inDateRange, matchesSearch, findDuplicates, csvEscape, downloadCsv,
    debounce, statusClass, sourceClass
  };
})();
