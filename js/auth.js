window.Auth = (() => {
  const KEY = "simRole";

  function getRole() {
    return sessionStorage.getItem(KEY) || "Admin";
  }

  function setRole(role) {
    sessionStorage.setItem(KEY, role);
  }

  function getToken() {
    return sessionStorage.getItem("googleIdToken") || "";
  }

  function isAdmin() {
    return getRole() === "Admin";
  }

  function canDelete() {
    return isAdmin();
  }

  function canManageSettings() {
    return isAdmin();
  }

  function renderChip() {
    const el = document.getElementById("userChip");
    if (!el) return;
    el.textContent = getRole();
  }

  return { getRole, setRole, getToken, isAdmin, canDelete, canManageSettings, renderChip };
})();
