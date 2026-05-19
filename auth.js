/* ═══════════════════════════════════════════
   auth.js — Authentification prénom + nom
══════════════════════════════════════════════ */

import { getSettings } from './data.js';

const LAST_USER_KEY = "pmg_last_user";

export let currentMember = null;
export let isAdmin       = false;

/* ── Pré-remplissage ── */

function _prefillLogin() {
  const saved = localStorage.getItem(LAST_USER_KEY);
  if (!saved) return false;
  try {
    const { prenom, nom } = JSON.parse(saved);
    if (!prenom && !nom) return false;
    document.getElementById("login-prenom").value = prenom || "";
    document.getElementById("login-nom").value    = nom    || "";
    const hint = document.getElementById("login-prefill-hint");
    if (hint) hint.hidden = false;
    return true;
  } catch { return false; }
}

function _saveLastUser(prenom, nom) {
  localStorage.setItem(LAST_USER_KEY, JSON.stringify({ prenom, nom }));
}

/* ── Session ── */

export function restoreSession(member) {
  currentMember = member;
  isAdmin       = false;
}

/* ── Admin login ── */

export function loginAdmin(pwd) {
  if (!pwd) return { ok: false, error: "Veuillez saisir le mot de passe." };
  const settings = getSettings();
  if (pwd !== settings.admin_pwd) return { ok: false, error: "Mot de passe incorrect." };
  isAdmin       = true;
  currentMember = null;
  return { ok: true };
}

/* ── Logout ── */

export function logout() {
  currentMember = null;
  isAdmin       = false;
  window.clearMemberListeners?.();
  window.clearAdminListeners?.();
}

/* ═══════════════════════════════
   ÉCRAN LOGIN PRINCIPAL
═══════════════════════════════ */

export function bindLoginScreen() {
  const inputPrenom = document.getElementById("login-prenom");
  const inputNom    = document.getElementById("login-nom");
  const btn         = document.getElementById("login-btn");
  const errEl       = document.getElementById("login-error");
  const adminBtn    = document.getElementById("admin-access-btn");
  const hint        = document.getElementById("login-prefill-hint");

  const prefilled = _prefillLogin();
  if (prefilled) btn.focus();

  [inputPrenom, inputNom].forEach(el => {
    el.addEventListener("input", () => { if (hint) hint.hidden = true; });
  });

  adminBtn.addEventListener("click", () => {
    errEl.hidden = true;
    window.showScreen("screen-admin-login");
    document.getElementById("admin-pwd").value    = "";
    document.getElementById("admin-error").hidden = true;
    document.getElementById("admin-pwd").focus();
  });

  btn.addEventListener("click", () => doLogin());
  [inputPrenom, inputNom].forEach(el => {
    el.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  });

  async function doLogin() {
    const prenom = inputPrenom.value.trim();
    const nom    = inputNom.value.trim();
    errEl.hidden = true;

    if (!prenom || !nom) {
      errEl.textContent = "Veuillez saisir votre prénom et votre nom.";
      errEl.hidden = false; return;
    }

    btn.disabled = true;
    window.showSpinner?.();

    try {
      // Recherche Firebase avec timeout 8s, fallback localStorage
      let members = [];
      if (window.fbFunctions?.fbGetMembers) {
        const timeout8s = new Promise((_, rej) =>
          setTimeout(() => rej(new Error("TIMEOUT")), 8000)
        );
        try {
          members = await Promise.race([window.fbFunctions.fbGetMembers(), timeout8s]);
        } catch {
          // Timeout ou erreur réseau — fallback localStorage ci-dessous
        }
      }
      if (members.length === 0) {
        members = JSON.parse(localStorage.getItem("pmg_members") || "[]");
      }

      const member = members.find(m =>
        m.prenom?.toLowerCase() === prenom.toLowerCase() &&
        m.nom?.toLowerCase()    === nom.toLowerCase()
      ) || null;

      if (!member) {
        errEl.textContent = "Nom introuvable. Vérifiez votre prénom et votre nom.";
        errEl.hidden = false;
        return;
      }

      currentMember = member;
      isAdmin = false;
      _saveLastUser(member.prenom, member.nom);
      window.clearMemberListeners?.();
      inputPrenom.value = "";
      inputNom.value    = "";
      window.renderMemberScreen();
      window.showScreen("screen-member");
    } catch (e) {
      errEl.textContent = "Erreur de connexion. Vérifiez votre connexion internet.";
      errEl.hidden = false;
    } finally {
      window.hideSpinner?.();
      btn.disabled = false;
    }
  }
}

/* ═══════════════════════════════
   ÉCRAN LOGIN ADMIN
═══════════════════════════════ */

export function bindAdminLoginScreen() {
  const input = document.getElementById("admin-pwd");
  const btn   = document.getElementById("admin-login-btn");
  const back  = document.getElementById("admin-back-btn");
  const errEl = document.getElementById("admin-error");

  btn.addEventListener("click", () => doAdminLogin());
  input.addEventListener("keydown", e => { if (e.key === "Enter") doAdminLogin(); });

  back.addEventListener("click", () => {
    errEl.hidden = true;
    input.value  = "";
    window.showScreen("screen-login");
    document.getElementById("login-error").hidden = true;
    const prefilled = _prefillLogin();
    if (prefilled) document.getElementById("login-btn").focus();
    else            document.getElementById("login-prenom").focus();
  });

  function doAdminLogin() {
    errEl.hidden = true;
    btn.disabled = true;
    try {
      const result = loginAdmin(input.value);
      if (!result.ok) {
        errEl.textContent = result.error;
        errEl.hidden = false;
        input.focus();
        return;
      }
      input.value = "";
      window.renderAdminScreen();
      window.showScreen("screen-admin");
    } catch {
      window.showError();
    } finally {
      btn.disabled = false;
    }
  }
}

/* ═══════════════════════════════
   DÉCONNEXION
═══════════════════════════════ */

export function bindLogoutButtons() {
  function _onLogout() {
    logout();
    window.showScreen("screen-login");
    document.getElementById("login-error").hidden = true;
    const prefilled = _prefillLogin();
    if (prefilled) document.getElementById("login-btn").focus();
    else            document.getElementById("login-prenom").focus();
  }
  document.getElementById("member-logout").addEventListener("click", _onLogout);
  document.getElementById("admin-logout").addEventListener("click", _onLogout);
}
