/* ═══════════════════════════════════════════
   data.js — Utilitaires + stockage localStorage
   Source de vérité locale. Firebase est sync optionnel.
══════════════════════════════════════════════ */

/* ── Données de démonstration ── */

export const DEFAULT_MEMBERS = [
  { prenom: "Sophie",   nom: "Martin",  tel: "06 12 34 56 78", is_moderator: false },
  { prenom: "Pierre",   nom: "Leblanc", tel: "06 23 45 67 89", is_moderator: false },
  { prenom: "Isabelle", nom: "Roux",    tel: "06 34 56 78 90", is_moderator: false },
];

export const DEFAULT_SETTINGS = { admin_pwd: "1234", banner: "", places_default: "2" };

/* ── Générateur d'ID ── */

export function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/* ── Helpers localStorage ── */

export function _load(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : def;
  } catch { return def; }
}

export function _save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* ── Initialisation des données de démonstration ── */

export function initDemoData() {
  if (!localStorage.getItem("pmg_members"))       _save("pmg_members",       DEFAULT_MEMBERS.map(m => ({ ...m, id: genId() })));
  if (!localStorage.getItem("pmg_settings"))      _save("pmg_settings",      DEFAULT_SETTINGS);
  if (!localStorage.getItem("pmg_slots"))         _save("pmg_slots",         []);
  if (!localStorage.getItem("pmg_registrations")) _save("pmg_registrations", []);
  if (!localStorage.getItem("pmg_quotas"))        _save("pmg_quotas",        {});
}

/* ── Helpers date ── */

export function dateToKey(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function lastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0);
}

export function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth()    === d2.getMonth()    &&
         d1.getDate()     === d2.getDate();
}

export function isWeekday(d) {
  const dow = d.getDay();
  return dow >= 1 && dow <= 5;
}

export function formatDateFR(d) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function formatDateShort(d) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function getMondayOf(d) {
  const clone = new Date(d);
  const dow = clone.getDay() === 0 ? 7 : clone.getDay();
  clone.setDate(clone.getDate() - (dow - 1));
  clone.setHours(0, 0, 0, 0);
  return clone;
}

/* ── Helpers membres ── */

export function fullName(member) {
  return `${member.prenom} ${member.nom}`.trim();
}

export function getInitials(nameStr) {
  return nameStr.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

export function getAvatarColorIndex(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
  return hash % 8;
}

export function getAvatarBgColor(idx) {
  const colors = [
    "#3b82f6","#8b5cf6","#10b981","#f59e0b",
    "#ef4444","#06b6d4","#84cc16","#ec4899",
  ];
  return colors[idx % colors.length];
}

/* ── Membres ── */

export function getMembers() {
  return _load("pmg_members", []).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

export function getMemberById(id) {
  return _load("pmg_members", []).find(m => m.id === id) ?? null;
}

export function getMemberByName(prenom, nom) {
  const p = prenom.toLowerCase().trim();
  const n = nom.toLowerCase().trim();
  return _load("pmg_members", []).find(m =>
    m.prenom.toLowerCase().trim() === p &&
    m.nom.toLowerCase().trim()    === n
  ) ?? null;
}

export function addMember({ prenom, nom, tel }) {
  const members = _load("pmg_members", []);
  const member  = { id: genId(), prenom, nom, tel: tel || "", is_moderator: false };
  members.push(member);
  _save("pmg_members", members);
  window.fbFunctions?.fbAddMember(member);
  return member;
}

export function deleteMember(id) {
  _save("pmg_members",       _load("pmg_members", []).filter(m => m.id !== id));
  _save("pmg_registrations", _load("pmg_registrations", []).filter(r => r.member_id !== id));
  const quotas = _load("pmg_quotas", {});
  delete quotas[id];
  _save("pmg_quotas", quotas);
  window.fbFunctions?.fbDeleteMember(id);
}

export function setModerator(memberId, value) {
  _save("pmg_members",
    _load("pmg_members", []).map(m =>
      m.id === memberId ? { ...m, is_moderator: value } : m
    )
  );
  const m = getMemberById(memberId);
  if (m) window.fbFunctions?.fbAddMember(m);
}

export function importMembers(members) {
  const existing    = _load("pmg_members", []);
  const existingSet = new Set(
    existing.map(m => `${m.prenom.toLowerCase().trim()}|${m.nom.toLowerCase().trim()}`)
  );
  const toInsert = members.filter(m =>
    m.prenom.trim() && m.nom.trim() &&
    !existingSet.has(`${m.prenom.toLowerCase().trim()}|${m.nom.toLowerCase().trim()}`)
  );
  const newMembers = toInsert.map(m => ({
    id: genId(), prenom: m.prenom.trim(), nom: m.nom.trim(),
    tel: (m.tel || "").trim(), is_moderator: false,
  }));
  newMembers.forEach(m => existing.push(m));
  _save("pmg_members", existing);
  newMembers.forEach(m => window.fbFunctions?.fbAddMember(m));
  return { imported: toInsert.length, ignored: members.length - toInsert.length };
}

/* ── Paramètres ── */

export function getSettings() {
  return _load("pmg_settings", DEFAULT_SETTINGS);
}

export function updateSetting(key, value) {
  const s = getSettings();
  s[key] = String(value);
  _save("pmg_settings", s);
  window.fbFunctions?.fbUpdateSetting(key, value);
}

export function updateFutureSlotsPlaces(places) {
  const today = dateToKey(new Date());
  const slots = _load("pmg_slots", []);
  let count = 0;
  const updated = slots.map(s => {
    if (s.date >= today) { count++; return { ...s, places }; }
    return s;
  });
  _save("pmg_slots", updated);
  window.fbFunctions?.fbUpdateFutureSlotsPlaces(places, today);
  return count;
}

/* ── Créneaux ── */

export function getSlots(dateDebut, dateFin) {
  return _load("pmg_slots", [])
    .filter(s => s.date >= dateDebut && s.date <= dateFin)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function generateMissingSlots() {
  const settings = getSettings();
  const places   = parseInt(settings.places_default) || 2;
  const today    = new Date();

  const months = [
    { year: today.getFullYear(), month: today.getMonth() },
    {
      year:  today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear(),
      month: (today.getMonth() + 1) % 12,
    },
  ];

  const allDates = [];
  for (const { year, month } of months) {
    const cur     = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    while (cur <= lastDay) {
      if (isWeekday(cur)) allDates.push(dateToKey(new Date(cur)));
      cur.setDate(cur.getDate() + 1);
    }
  }

  if (allDates.length === 0) return;

  const existing      = _load("pmg_slots", []);
  const existingDates = new Set(existing.map(s => s.date));
  const missing       = allDates.filter(d => !existingDates.has(d));
  if (missing.length === 0) return;

  missing.forEach(date => existing.push({
    id: genId(), date, places,
    heure_debut: null, heure_fin: null, lieu: null,
    is_closed: false, close_reason: null,
  }));
  _save("pmg_slots", existing);
  window.fbFunctions?.fbGenerateMissingSlots(missing, places);
}

export function closeSlot(slotId, reason) {
  const slots = _load("pmg_slots", []);
  const slot  = slots.find(s => s.id === slotId);
  _save("pmg_slots", slots.map(s =>
    s.id === slotId ? { ...s, is_closed: true, close_reason: reason || null } : s
  ));
  if (slot) window.fbFunctions?.fbCloseSlot(slot.date, reason || null);
}

export function openSlot(slotId) {
  const slots = _load("pmg_slots", []);
  const slot  = slots.find(s => s.id === slotId);
  _save("pmg_slots", slots.map(s =>
    s.id === slotId ? { ...s, is_closed: false, close_reason: null } : s
  ));
  if (slot) window.fbFunctions?.fbOpenSlot(slot.date);
}

/* ── Inscriptions ── */

export function addRegistration(slotId, memberId) {
  const regs   = _load("pmg_registrations", []);
  const member = getMemberById(memberId);
  const slot   = _load("pmg_slots", []).find(s => s.id === slotId);
  const reg    = { id: genId(), slot_id: slotId, member_id: memberId, registered_at: new Date().toISOString() };
  regs.push(reg);
  _save("pmg_registrations", regs);
  if (slot && member) {
    window.fbFunctions?.fbAddRegistration({
      id:            reg.id,
      slot_id:       slotId,
      slot_date:     slot.date,
      member_id:     memberId,
      member_prenom: member.prenom,
      member_nom:    member.nom,
      member_tel:    member.tel || "",
    });
  }
  return reg;
}

export function deleteRegistration(slotId, memberId) {
  const regs = _load("pmg_registrations", []);
  const reg  = regs.find(r => r.slot_id === slotId && r.member_id === memberId);
  _save("pmg_registrations", regs.filter(r => !(r.slot_id === slotId && r.member_id === memberId)));
  if (reg) window.fbFunctions?.fbDeleteRegistration(reg.id);
}

export function getSlotsWithRegistrations(dateDebut, dateFin) {
  const slots = getSlots(dateDebut, dateFin);
  if (slots.length === 0) return {};

  const members  = _load("pmg_members", []);
  const regs     = _load("pmg_registrations", []);
  const slotsMap = {};

  for (const slot of slots) {
    const slotRegs  = regs.filter(r => r.slot_id === slot.id);
    slot.inscrits   = slotRegs.map(r => {
      const m = members.find(x => x.id === r.member_id) || {};
      return { id: r.member_id, prenom: m.prenom || "?", nom: m.nom || "", tel: m.tel || "" };
    });
    slotsMap[slot.date] = slot;
  }
  return slotsMap;
}

/* ── Inscriptions à venir (membre) ── */

export function getMemberUpcomingRegistrations(memberId) {
  const today = dateToKey(new Date());
  const regs  = _load("pmg_registrations", []).filter(r => r.member_id === memberId);
  const slots = _load("pmg_slots", []);
  return regs
    .map(r => {
      const slot = slots.find(s => s.id === r.slot_id);
      return slot ? { registrationId: r.id, ...slot } : null;
    })
    .filter(r => r && r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getMemberUpcomingCount(memberId) {
  return getMemberUpcomingRegistrations(memberId).length;
}

/* ── Quotas ── */

export const QUOTA_MAX = 2;

export function getQuotaState(memberId) {
  const now    = new Date();
  const quotas = _load("pmg_quotas", {});
  let   q      = quotas[memberId] || { count: 0, next_reset: null };

  if (q.next_reset && now >= new Date(q.next_reset)) {
    q = { count: 0, next_reset: null };
    quotas[memberId] = q;
    _save("pmg_quotas", quotas);
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);
  const nextResetLabel = tomorrow.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  }) + " à 7h00";

  return { count: q.count, max: QUOTA_MAX, canSignup: q.count < QUOTA_MAX, nextResetLabel };
}

export function incrementQuota(memberId) {
  const state = getQuotaState(memberId);
  if (!state.canSignup) return false;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);

  const quotas   = _load("pmg_quotas", {});
  const cur      = quotas[memberId] || { count: 0, next_reset: null };
  const newQuota = { count: cur.count + 1, next_reset: tomorrow.toISOString() };
  quotas[memberId] = newQuota;
  _save("pmg_quotas", quotas);
  window.fbFunctions?.fbIncrementQuota(memberId, newQuota.count, newQuota.next_reset);
  return true;
}

export function decrementQuota(memberId) {
  const quotas   = _load("pmg_quotas", {});
  const cur      = quotas[memberId];
  if (!cur) return;
  const newCount = Math.max(0, cur.count - 1);
  quotas[memberId] = { ...cur, count: newCount };
  _save("pmg_quotas", quotas);
  window.fbFunctions?.fbDecrementQuota(memberId, newCount);
}
