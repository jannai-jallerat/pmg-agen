/* ═══════════════════════════════════════════
   auth.js — Login membre (PIN local), login admin, logout
══════════════════════════════════════════════ */

import { getMemberByName, getSettings } from './data.js';

const SESSION_KEY   = "pmg_session";
const LAST_USER_KEY = "pmg_last_user";
const PIN_PREFIX    = "pmg_pin_";
const PIN_LENGTH    = 4;

export let currentMember = null;
export let isAdmin       = false;

let _pendingMember  = null;  // membre trouvé, en attente de PIN
let _pendingIsReset = false; // vrai si l'admin a déclenché un reset PIN

/* ── Crypto SHA-256 ── */

async function hashPIN(pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function _pinKey(id) { return PIN_PREFIX + id; }

/* ── Session ── */

export function restoreSession(member) {
  currentMember = member;
  isAdmin       = false;
}

/* ── Connexion effective (appelée UNE SEULE FOIS après validation PIN) ── */

function connectMember(member) {
  currentMember  = member;
  isAdmin        = false;
  _pendingMember = null;
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    id: member.id, prenom: member.prenom, nom: member.nom,
    is_moderator: !!member.is_moderator,
  }));
  window.renderMemberScreen();
  window.showScreen("screen-member");
}

/* ── Login admin ── */

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
  currentMember   = null;
  isAdmin         = false;
  _pendingMember  = null;
  _pendingIsReset = false;
  localStorage.removeItem(SESSION_KEY);
}

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

function _goLogin() {
  window.showScreen("screen-login");
  document.getElementById("login-error").hidden = true;
  const prefilled = _prefillLogin();
  if (prefilled) document.getElementById("login-btn").focus();
  else           document.getElementById("login-prenom").focus();
}

/* ════════════════════════════════════════
   SCREEN LOGIN (prénom + nom)
════════════════════════════════════════ */

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

  async function doLogin() {
    errEl.hidden = true;
    btn.disabled = true;

    const prenom = inputPrenom.value.trim();
    const nom    = inputNom.value.trim();

    if (!prenom || !nom) {
      errEl.textContent = "Veuillez saisir votre prénom et votre nom.";
      errEl.hidden = false;
      btn.disabled = false;
      inputPrenom.focus();
      return;
    }

    try {
      const member = getMemberByName(prenom, nom);
      if (!member) {
        errEl.textContent = "Nom introuvable. Contactez un responsable.";
        errEl.hidden = false;
        btn.disabled = false;
        inputPrenom.focus();
        return;
      }

      localStorage.setItem(LAST_USER_KEY, JSON.stringify({
        prenom: member.prenom, nom: member.nom,
      }));
      inputPrenom.value = "";
      inputNom.value    = "";

      _pendingMember  = member;
      _pendingIsReset = false;

      /* Vérification Firebase du flag pin_reset (max 3 s, non bloquant) */
      window.showSpinner();
      try {
        const fresh = await Promise.race([
          window.fbFunctions?.fbGetMember(member.id) ?? Promise.resolve(null),
          new Promise(r => setTimeout(() => r(null), 3000)),
        ]);
        if (fresh?.pin_reset === true) _pendingIsReset = true;
      } catch {}
      window.hideSpinner();

      if (_pendingIsReset) {
        /* Admin a demandé un reset → ignorer le PIN local */
        localStorage.removeItem(_pinKey(member.id));
        _resetChoosePin();
        window.showScreen("screen-choose-pin");
        return;
      }

      const storedPin = localStorage.getItem(_pinKey(member.id));
      if (!storedPin) {
        _resetChoosePin();
        window.showScreen("screen-choose-pin");
      } else {
        _resetPinPad();
        window.showScreen("screen-pin");
      }
    } catch {
      window.hideSpinner();
      window.showError();
    } finally {
      btn.disabled = false;
    }
  }
}

/* ════════════════════════════════════════
   SCREEN PIN (pavé numérique)
════════════════════════════════════════ */

let _pinEntry = "";

function _resetPinPad() {
  _pinEntry = "";
  _renderPinDots();
  document.getElementById("pin-error").hidden      = true;
  document.getElementById("pin-forgot-msg").hidden = true;
  const nameEl = document.getElementById("pin-member-name");
  if (nameEl && _pendingMember) {
    nameEl.textContent = _pendingMember.prenom + " " + _pendingMember.nom;
  }
}

function _renderPinDots() {
  document.querySelectorAll(".pin-dot").forEach((dot, i) => {
    dot.classList.toggle("filled", i < _pinEntry.length);
  });
}

export function bindPinScreen() {
  const pad       = document.getElementById("pin-pad");
  const errEl     = document.getElementById("pin-error");
  const backBtn   = document.getElementById("pin-back-btn");
  const forgotBtn = document.getElementById("pin-forgot-btn");
  const forgotMsg = document.getElementById("pin-forgot-msg");

  pad.addEventListener("click", async e => {
    const btn = e.target.closest("[data-digit]");
    if (!btn) return;
    const digit = btn.dataset.digit;

    if (digit === "del") {
      _pinEntry = _pinEntry.slice(0, -1);
      _renderPinDots();
      errEl.hidden = true;
      return;
    }

    if (_pinEntry.length >= PIN_LENGTH) return;
    _pinEntry += digit;
    _renderPinDots();

    if (_pinEntry.length === PIN_LENGTH) {
      await _verifyPIN(errEl);
    }
  });

  backBtn.addEventListener("click", () => {
    _pendingMember  = null;
    _pendingIsReset = false;
    _pinEntry = "";
    _goLogin();
  });

  forgotBtn.addEventListener("click", () => {
    forgotMsg.hidden = false;
  });
}

async function _verifyPIN(errEl) {
  try {
    const storedHash  = localStorage.getItem(_pinKey(_pendingMember.id));
    const enteredHash = await hashPIN(_pinEntry);
    if (enteredHash === storedHash) {
      connectMember(_pendingMember);
    } else {
      _pinEntry = "";
      _renderPinDots();
      errEl.textContent = "PIN incorrect. Réessayez.";
      errEl.hidden      = false;
    }
  } catch {
    window.showError();
  }
}

/* ════════════════════════════════════════
   SCREEN CHOISIR PIN
════════════════════════════════════════ */

function _resetChoosePin() {
  const i1 = document.getElementById("choose-pin-input");
  const i2 = document.getElementById("choose-pin-confirm");
  if (i1) i1.value = "";
  if (i2) i2.value = "";
  document.getElementById("choose-pin-error").hidden = true;
  const nameEl = document.getElementById("choose-pin-name");
  if (nameEl && _pendingMember) {
    nameEl.textContent = _pendingMember.prenom + " " + _pendingMember.nom;
  }
  setTimeout(() => document.getElementById("choose-pin-input")?.focus(), 50);
}

export function bindChoosePinScreen() {
  const input   = document.getElementById("choose-pin-input");
  const confirm = document.getElementById("choose-pin-confirm");
  const btn     = document.getElementById("choose-pin-btn");
  const backBtn = document.getElementById("choose-pin-back");
  const errEl   = document.getElementById("choose-pin-error");

  btn.addEventListener("click", () => doChoosePin());
  [input, confirm].forEach(el => {
    el.addEventListener("keydown", e => { if (e.key === "Enter") doChoosePin(); });
  });

  backBtn.addEventListener("click", () => {
    _pendingMember  = null;
    _pendingIsReset = false;
    _goLogin();
    errEl.hidden = true;
  });

  async function doChoosePin() {
    const p1 = input.value.trim();
    const p2 = confirm.value.trim();
    errEl.hidden = true;

    if (!/^\d{4}$/.test(p1)) {
      errEl.textContent = "Le PIN doit être composé de 4 chiffres.";
      errEl.hidden = false;
      input.focus();
      return;
    }
    if (p1 !== p2) {
      errEl.textContent = "Les deux codes ne correspondent pas.";
      errEl.hidden = false;
      confirm.focus();
      return;
    }

    btn.disabled = true;
    try {
      const hash = await hashPIN(p1);
      localStorage.setItem(_pinKey(_pendingMember.id), hash);

      /* Si c'était un reset admin : remettre pin_reset à false dans Firebase */
      if (_pendingIsReset) {
        window.fbFunctions?.fbSetPinReset(_pendingMember.id, false);
        _pendingIsReset = false;
      }

      connectMember(_pendingMember);
    } catch {
      window.showError();
    } finally {
      btn.disabled = false;
    }
  }
}

/* ════════════════════════════════════════
   SCREEN LOGIN ADMIN
════════════════════════════════════════ */

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
    _goLogin();
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
    } catch {
      window.showError();
    } finally {
      btn.disabled = false;
    }
  }
}

/* ════════════════════════════════════════
   DÉCONNEXION
════════════════════════════════════════ */

export function bindLogoutButtons() {
  function _onLogout() {
    logout();
    _goLogin();
  }
  document.getElementById("member-logout").addEventListener("click", _onLogout);
  document.getElementById("admin-logout").addEventListener("click",  _onLogout);
}
