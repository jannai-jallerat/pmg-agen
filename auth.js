/* ═══════════════════════════════════════════
   auth.js — Authentification token/PIN/code invitation
══════════════════════════════════════════════ */

import { getSettings, _load } from './data.js';

const LAST_USER_KEY = "pmg_last_user";
const TOKEN_KEY     = "pmg_token";

export let currentMember = null;
export let isAdmin       = false;

let _pendingPrenom = "";
let _pendingNom    = "";

/* ── Fallback local (PIN hash en cache localStorage) ── */

async function _hashPIN(pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function _localPinVerify(prenom, nom, pin) {
  try {
    const members = _load("pmg_members", []);
    const pinHash = await _hashPIN(pin);
    return members.find(m =>
      m.prenom?.toLowerCase() === prenom.toLowerCase() &&
      m.nom?.toLowerCase()    === nom.toLowerCase()    &&
      m.pin_hash              === pinHash              &&
      m.invite_used           === true
    ) || null;
  } catch { return null; }
}

/* ── Session ── */

export function restoreSession(member) {
  currentMember = member;
  isAdmin       = false;
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

function _saveLastUser(prenom, nom) {
  localStorage.setItem(LAST_USER_KEY, JSON.stringify({ prenom, nom }));
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
  const token = localStorage.getItem(TOKEN_KEY);
  currentMember = null;
  isAdmin       = false;
  localStorage.removeItem(TOKEN_KEY);
  window.clearMemberListeners?.();
  window.clearAdminListeners?.();
  if (token) window.fbFunctions?.fbRevokeToken(token);
}

/* ═══════════════════════════════
   ÉCRAN LOGIN PRINCIPAL
═══════════════════════════════ */

export function bindLoginScreen() {
  const inputPrenom = document.getElementById("login-prenom");
  const inputNom    = document.getElementById("login-nom");
  const btn         = document.getElementById("login-btn");
  const firstBtn    = document.getElementById("first-login-link");
  const errEl       = document.getElementById("login-error");
  const adminBtn    = document.getElementById("admin-access-btn");
  const hint        = document.getElementById("login-prefill-hint");

  const prefilled = _prefillLogin();
  if (prefilled) btn.focus();

  [inputPrenom, inputNom].forEach(el => {
    el.addEventListener("input", () => { if (hint) hint.hidden = true; });
  });

  firstBtn?.addEventListener("click", () => {
    errEl.hidden = true;
    const p = inputPrenom.value.trim();
    const n = inputNom.value.trim();
    document.getElementById("first-prenom").value = p;
    document.getElementById("first-nom").value    = n;
    document.getElementById("first-invite").value       = "";
    document.getElementById("first-pin").value          = "";
    document.getElementById("first-pin-confirm").value  = "";
    document.getElementById("first-error").hidden = true;
    window.showScreen("screen-first-login");
    (p ? document.getElementById("first-invite") : document.getElementById("first-prenom")).focus();
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
    const token = localStorage.getItem(TOKEN_KEY);

    try {
      if (token && window.fbFunctions?.fbVerifyToken) {
        window.showSpinner?.();
        const timeout8s = new Promise((_, rej) =>
          setTimeout(() => rej(new Error("TIMEOUT")), 8000)
        );

        let member;
        let tokenExplicitlyInvalid = false;

        try {
          member = await Promise.race([
            window.fbFunctions.fbVerifyToken(token),
            timeout8s,
          ]);
          // fbVerifyToken retourne null = token introuvable (Firestore joignable)
          if (member === null) tokenExplicitlyInvalid = true;
        } catch {
          // Erreur réseau ou timeout : on garde le token, on passe en PIN
          member = undefined;
        }

        // Ne supprime le token que si Firestore a confirmé qu'il est invalide
        if (tokenExplicitlyInvalid) localStorage.removeItem(TOKEN_KEY);

        if (member) {
          currentMember = member;
          isAdmin = false;
          _saveLastUser(member.prenom, member.nom);
          inputPrenom.value = "";
          inputNom.value    = "";
          window.renderMemberScreen();
          window.showScreen("screen-member");
          return;
        }
      }
      // Pas de token valide ou vérifiable → PIN
      _pendingPrenom = prenom;
      _pendingNom    = nom;
      document.getElementById("pin-screen-name").textContent = `${prenom} ${nom}`;
      _resetPinPad();
      window.showScreen("screen-pin");
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
   ÉCRAN PREMIÈRE CONNEXION
═══════════════════════════════ */

export function bindFirstLoginScreen() {
  const btn     = document.getElementById("first-login-btn");
  const backBtn = document.getElementById("first-back-btn");
  const errEl   = document.getElementById("first-error");
  const codeEl  = document.getElementById("first-invite");

  codeEl.addEventListener("input", function () {
    this.value = this.value.toUpperCase();
  });

  backBtn.addEventListener("click", () => {
    errEl.hidden = true;
    window.showScreen("screen-login");
    _prefillLogin();
  });

  btn.addEventListener("click", () => doFirstLogin());
  ["first-prenom","first-nom","first-invite","first-pin","first-pin-confirm"].forEach(id => {
    document.getElementById(id).addEventListener("keydown", e => { if (e.key === "Enter") doFirstLogin(); });
  });

  async function doFirstLogin() {
    const prenom     = document.getElementById("first-prenom").value.trim();
    const nom        = document.getElementById("first-nom").value.trim();
    const inviteCode = document.getElementById("first-invite").value.trim().toUpperCase();
    const pin        = document.getElementById("first-pin").value;
    const pinConfirm = document.getElementById("first-pin-confirm").value;
    errEl.hidden = true;

    if (!prenom || !nom) {
      errEl.textContent = "Prénom et nom obligatoires."; errEl.hidden = false; return;
    }
    if (inviteCode.length < 8) {
      errEl.textContent = "Code d'invitation invalide (format PMG-XXXX)."; errEl.hidden = false; return;
    }
    if (!/^\d{4}$/.test(pin)) {
      errEl.textContent = "Le PIN doit contenir exactement 4 chiffres."; errEl.hidden = false; return;
    }
    if (pin !== pinConfirm) {
      errEl.textContent = "Les deux PIN ne correspondent pas."; errEl.hidden = false; return;
    }

    if (!window.fbFunctions?.fbFirstLogin) {
      errEl.textContent = "Service indisponible. Vérifiez votre connexion internet.";
      errEl.hidden = false; return;
    }

    btn.disabled = true;
    window.showSpinner?.();
    try {
      let timeoutHandle;
      const timeout15s = new Promise((_, rej) => {
        timeoutHandle = setTimeout(() => rej(new Error("TIMEOUT")), 15000);
      });
      const member = await Promise.race([
        window.fbFunctions.fbFirstLogin(prenom, nom, inviteCode, pin),
        timeout15s,
      ]);
      clearTimeout(timeoutHandle);
      currentMember = member;
      isAdmin = false;
      _saveLastUser(member.prenom, member.nom);
      ["first-prenom","first-nom","first-invite","first-pin","first-pin-confirm"]
        .forEach(id => { document.getElementById(id).value = ""; });
      window.renderMemberScreen();
      window.showScreen("screen-member");
      window.showToast("Compte activé ! Bienvenue.");
    } catch (e) {
      errEl.textContent = e.message === "INVALID_INVITE"
        ? "Code d'invitation invalide ou déjà utilisé."
        : e.message === "TIMEOUT"
        ? "Connexion lente. Vérifiez votre réseau et réessayez."
        : "Erreur de connexion. Vérifiez votre connexion internet.";
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
      window.hideSpinner?.();
    }
  }
}

/* ═══════════════════════════════
   ÉCRAN PIN (pavé numérique)
═══════════════════════════════ */

let _pinDigits = [];

function _resetPinPad() {
  _pinDigits = [];
  _updatePinDots();
  document.getElementById("pin-error").hidden = true;
}

function _updatePinDots() {
  for (let i = 0; i < 4; i++) {
    document.getElementById(`pin-dot-${i}`)
      ?.classList.toggle("filled", i < _pinDigits.length);
  }
}

export function bindPinScreen() {
  const pad     = document.getElementById("pin-pad");
  const backBtn = document.getElementById("pin-back-btn");
  const delBtn  = document.getElementById("pin-del-btn");
  const errEl   = document.getElementById("pin-error");

  pad.addEventListener("click", e => {
    const key = e.target.closest("[data-digit]");
    if (!key || _pinDigits.length >= 4) return;
    _pinDigits.push(key.dataset.digit);
    _updatePinDots();
    if (_pinDigits.length === 4) _submitPin();
  });

  delBtn.addEventListener("click", () => {
    _pinDigits.pop();
    _updatePinDots();
    errEl.hidden = true;
  });

  backBtn.addEventListener("click", () => {
    _resetPinPad();
    window.showScreen("screen-login");
  });

  async function _submitPin() {
    const pin = _pinDigits.join("");
    errEl.hidden = true;
    window.showSpinner?.();
    try {
      let member = null;

      if (window.fbFunctions?.fbLoginWithPIN) {
        let timeoutHandle;
        const timeout8s = new Promise((_, rej) => {
          timeoutHandle = setTimeout(() => rej(new Error("TIMEOUT")), 8000);
        });
        try {
          member = await Promise.race([
            window.fbFunctions.fbLoginWithPIN(_pendingPrenom, _pendingNom, pin),
            timeout8s,
          ]);
          clearTimeout(timeoutHandle);
        } catch (e) {
          clearTimeout(timeoutHandle);
          if (e.message === "INVALID_PIN") {
            // PIN clairement incorrect — pas besoin de fallback local
            throw e;
          }
          // Erreur réseau ou timeout → tenter la vérification locale
          member = await _localPinVerify(_pendingPrenom, _pendingNom, pin);
          if (!member) throw e; // local aussi échoue → remonte l'erreur d'origine
        }
      } else {
        // Firebase non disponible — vérification locale uniquement
        member = await _localPinVerify(_pendingPrenom, _pendingNom, pin);
        if (!member) throw new Error("INVALID_PIN");
      }

      currentMember = member;
      isAdmin = false;
      _saveLastUser(member.prenom, member.nom);
      _resetPinPad();
      window.renderMemberScreen();
      window.showScreen("screen-member");
    } catch (e) {
      _pinDigits = [];
      _updatePinDots();
      if (e.message === "TIMEOUT") {
        errEl.textContent = "Connexion lente. Vérifiez votre réseau et réessayez.";
      } else if (e.message === "INVALID_PIN") {
        errEl.textContent = "PIN incorrect. Réessayez.";
      } else {
        errEl.textContent = "Impossible de se connecter. Vérifiez votre réseau.";
      }
      errEl.hidden = false;
    } finally {
      window.hideSpinner?.();
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
