/* ═══════════════════════════════════════════
   auth.js — Login membre, login admin, logout
══════════════════════════════════════════════ */

import { getMemberByName, getSettings } from './data.js';

const SESSION_KEY   = "pmg_session";
const LAST_USER_KEY = "pmg_last_user";

export let currentMember = null;
export let isAdmin       = false;

/* ── Pré-remplissage depuis la mémoire ── */

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

export function restoreSession(member) {
  currentMember = member;
  isAdmin       = false;
}

/* ── Login membre ── */

export function loginMember(rawPrenom, rawNom) {
  const prenom = rawPrenom.trim();
  const nom    = rawNom.trim();

  if (!prenom || !nom) {
    return { ok: false, error: "Veuillez saisir votre prénom et votre nom." };
  }

  const member = getMemberByName(prenom, nom);
  if (!member) {
    return { ok: false, error: "Nom introuvable. Contactez un responsable." };
  }

  currentMember = member;
  isAdmin       = false;
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    id: member.id, prenom: member.prenom, nom: member.nom,
    is_moderator: !!member.is_moderator,
  }));
  return { ok: true, member };
}

/* ── Login admin ── */

export function loginAdmin(pwd) {
  if (!pwd) {
    return { ok: false, error: "Veuillez saisir le mot de passe." };
  }
  const settings = getSettings();
  if (pwd !== settings.admin_pwd) {
    return { ok: false, error: "Mot de passe incorrect." };
  }
  isAdmin       = true;
  currentMember = null;
  return { ok: true };
}

/* ── Logout ── */

export function logout() {
  currentMember = null;
  isAdmin       = false;
  localStorage.removeItem(SESSION_KEY);
}

/* ── Binding écran login membre ── */

export function bindLoginScreen() {
  const inputPrenom = document.getElementById("login-prenom");
  const inputNom    = document.getElementById("login-nom");
  const btn         = document.getElementById("login-btn");
  const errEl       = document.getElementById("login-error");
  const adminBtn    = document.getElementById("admin-access-btn");
  const hint        = document.getElementById("login-prefill-hint");

  /* Pré-remplissage au chargement */
  const prefilled = _prefillLogin();
  if (prefilled) btn.focus();

  /* Masquer le hint dès que l'utilisateur tape */
  [inputPrenom, inputNom].forEach(el => {
    el.addEventListener("input", () => { if (hint) hint.hidden = true; });
  });

  btn.addEventListener("click", () => doLogin());
  [inputPrenom, inputNom].forEach(el => {
    el.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  });

  adminBtn.addEventListener("click", () => {
    errEl.hidden = true;
    window.showScreen("screen-admin-login");
    document.getElementById("admin-pwd").value    = "";
    document.getElementById("admin-error").hidden = true;
    document.getElementById("admin-pwd").focus();
  });

  function doLogin() {
    errEl.hidden = true;
    btn.disabled = true;
    try {
      const result = loginMember(inputPrenom.value, inputNom.value);
      if (!result.ok) {
        errEl.textContent = result.error;
        errEl.hidden      = false;
        inputPrenom.focus();
        return;
      }
      /* Mémoriser le dernier utilisateur (nom canonique depuis les données) */
      localStorage.setItem(LAST_USER_KEY, JSON.stringify({
        prenom: result.member.prenom,
        nom:    result.member.nom,
      }));
      inputPrenom.value = "";
      inputNom.value    = "";
      window.renderMemberScreen();
      window.showScreen("screen-member");
    } catch (e) {
      window.showError();
    } finally {
      btn.disabled = false;
    }
  }
}

/* ── Binding écran login admin ── */

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
        errEl.hidden      = false;
        input.focus();
        return;
      }
      input.value = "";
      window.renderAdminScreen();
      window.showScreen("screen-admin");
    } catch (e) {
      window.showError();
    } finally {
      btn.disabled = false;
    }
  }
}

/* ── Binding déconnexion ── */

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
