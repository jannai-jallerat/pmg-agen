/* ═══════════════════════════════════════════
   firebase.js — Couche sync non-bloquante
   localStorage reste la source de vérité.
   Firebase est fire-and-forget : l'appli ne se bloque JAMAIS.
══════════════════════════════════════════════ */

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs,
         deleteDoc, setDoc, writeBatch, query, where, orderBy, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBO-IsG95uFEJ8pbzFrZNHmdOi6MCcqAp0",
  authDomain:        "pmg-agen.firebaseapp.com",
  projectId:         "pmg-agen",
  storageBucket:     "pmg-agen.firebasestorage.app",
  messagingSenderId: "1061812432446",
  appId:             "1:1061812432446:web:fc6118f16b45d9eb8feb6f",
  measurementId:     "G-KD6NGMHT93",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ── Membres (doc ID = UUID local) ── */

async function fbGetMembers() {
  try {
    const snap = await getDocs(collection(db, "members"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

async function fbAddMember(member) {
  try {
    await setDoc(doc(db, "members", member.id), {
      prenom:       member.prenom,
      nom:          member.nom,
      tel:          member.tel || "",
      is_moderator: !!member.is_moderator,
    });
  } catch {}
}

async function fbDeleteMember(id) {
  try { await deleteDoc(doc(db, "members", id)); } catch {}
}

/* ── Paramètres (doc ID = clé) ── */

async function fbGetSettings() {
  try {
    const snap = await getDocs(collection(db, "settings"));
    const out  = {};
    snap.docs.forEach(d => { out[d.id] = d.data().value; });
    return out;
  } catch { return {}; }
}

async function fbUpdateSetting(key, value) {
  try {
    await setDoc(doc(db, "settings", key), { value: String(value) }, { merge: true });
  } catch {}
}

/* ── Créneaux (doc ID = date "YYYY-MM-DD") ── */

async function fbGetSlots(dateDebut, dateFin) {
  try {
    const q    = query(
      collection(db, "slots"),
      where("date", ">=", dateDebut),
      where("date", "<=", dateFin),
      orderBy("date"),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data() }));
  } catch { return []; }
}

async function fbGenerateMissingSlots(missingDates, places) {
  for (const date of missingDates) {
    try {
      await setDoc(doc(db, "slots", date), {
        date, places, is_closed: false, close_reason: null,
      }, { merge: true });
    } catch {}
  }
}

async function fbCloseSlot(date, reason) {
  try {
    await setDoc(doc(db, "slots", date),
      { is_closed: true, close_reason: reason || null }, { merge: true });
  } catch {}
}

async function fbOpenSlot(date) {
  try {
    await setDoc(doc(db, "slots", date),
      { is_closed: false, close_reason: null }, { merge: true });
  } catch {}
}

async function fbUpdateFutureSlotsPlaces(places, dates) {
  try {
    const batch = writeBatch(db);
    dates.forEach(date => batch.update(doc(db, "slots", date), { places }));
    await batch.commit();
  } catch {
    for (const date of dates) {
      try { await setDoc(doc(db, "slots", date), { places }, { merge: true }); } catch {}
    }
  }
}

/* ── Inscriptions (doc ID = UUID local) ── */

async function fbGetRegistrations(slotDate) {
  try {
    const q    = query(collection(db, "registrations"), where("slot_date", "==", slotDate));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

async function fbAddRegistration(reg) {
  try {
    const q    = query(collection(db, "registrations"), where("slot_date", "==", reg.slot_date));
    const snap = await getDocs(q);
    const regs = snap.docs.map(d => d.data());
    if (regs.some(r => r.member_id === reg.member_id)) return "DEJA_INSCRIT";
    const slotSnap = await getDoc(doc(db, "slots", reg.slot_date));
    const places   = slotSnap.exists() ? (slotSnap.data().places || 2) : 2;
    if (regs.length >= places) return "COMPLET";
    await setDoc(doc(db, "registrations", reg.id), {
      slot_date:     reg.slot_date,
      slot_id:       reg.slot_id,
      member_id:     reg.member_id,
      member_prenom: reg.member_prenom,
      member_nom:    reg.member_nom,
      member_tel:    reg.member_tel || "",
    });
    return "OK";
  } catch { return "ERROR"; }
}

/* ── Écoute temps réel (onSnapshot) ── */

function fbListenDay(slotDate, callback) {
  let slotDoc  = null;
  let regsData = null;

  function fire() {
    if (slotDoc !== null && regsData !== null) callback(slotDate, regsData, slotDoc);
  }

  const unsubSlot = onSnapshot(doc(db, "slots", slotDate), snap => {
    slotDoc = snap.exists() ? snap.data() : {};
    fire();
  }, () => {});

  const q = query(collection(db, "registrations"), where("slot_date", "==", slotDate));
  const unsubRegs = onSnapshot(q, snap => {
    regsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    fire();
  }, () => {});

  return () => { unsubSlot(); unsubRegs(); };
}

function fbListenWeek(dateDebut, dateFin, callback) {
  const q = query(
    collection(db, "registrations"),
    where("slot_date", ">=", dateDebut),
    where("slot_date", "<=", dateFin),
    orderBy("slot_date"),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => {});
}

async function fbDeleteRegistration(id) {
  try { await deleteDoc(doc(db, "registrations", id)); } catch {}
}

/* ── Quotas (doc ID = member_id) ── */

async function fbGetQuota(member_id) {
  try {
    const d = await getDoc(doc(db, "quotas", member_id));
    return d.exists() ? d.data() : null;
  } catch { return null; }
}

async function fbIncrementQuota(member_id, count, next_reset) {
  try {
    await setDoc(doc(db, "quotas", member_id), { count, next_reset });
  } catch {}
}

async function fbDecrementQuota(member_id, count) {
  try {
    await setDoc(doc(db, "quotas", member_id), { count }, { merge: true });
  } catch {}
}

/* ── Initialisation Firestore si vide ── */

async function fbSeedIfEmpty(defaultMembers, defaultSettings) {
  try {
    const snap = await getDocs(collection(db, "settings"));
    if (!snap.empty) return;
    await Promise.allSettled([
      ...Object.entries(defaultSettings).map(([k, v]) =>
        setDoc(doc(db, "settings", k), { value: String(v) })),
      ...defaultMembers.map(m =>
        setDoc(doc(db, "members", m.id), {
          prenom: m.prenom, nom: m.nom,
          tel: m.tel || "", is_moderator: false,
        })),
    ]);
  } catch {}
}

/* ── Exposition globale (non-bloquant : si ce module échoue, l'appli continue) ── */

window.fbFunctions = {
  fbGetMembers, fbAddMember, fbDeleteMember,
  fbGetSettings, fbUpdateSetting,
  fbGetSlots, fbGenerateMissingSlots, fbCloseSlot, fbOpenSlot, fbUpdateFutureSlotsPlaces,
  fbGetRegistrations, fbAddRegistration, fbDeleteRegistration,
  fbListenDay, fbListenWeek,
  fbGetQuota, fbIncrementQuota, fbDecrementQuota,
  fbSeedIfEmpty,
};
