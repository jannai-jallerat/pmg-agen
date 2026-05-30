/* ═══════════════════════════════════════════
   calendar.js — Logique calendrier partagée
══════════════════════════════════════════════ */

import {
  isWeekday, dateToKey, keyToDate, sameDay, lastDayOfMonth, getMondayOf,
  formatDateShort, getInitials, fullName, getAvatarColorIndex, getAvatarBgColor,
} from './data.js';

export const DAYS_FR   = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const        MONTHS_FR = [
  "janvier","février","mars","avril","mai","juin",
  "juillet","août","septembre","octobre","novembre","décembre"
];

/* ── Verrouillage du mois suivant (vue membre) ── */

export function isMonthAccessibleForMember(year, month) {
  const today    = new Date();
  const curYear  = today.getFullYear();
  const curMonth = today.getMonth();
  const day      = today.getDate();

  const offset = (year - curYear) * 12 + (month - curMonth);
  if (offset < 0)  return false;
  if (offset <= 2) return true;
  if (offset === 3) return day >= 15;
  return false;
}

export function lockedMonthMessage(targetYear, targetMonth) {
  const today    = new Date();
  const curYear  = today.getFullYear();
  const curMonth = today.getMonth();
  const offset   = (targetYear - curYear) * 12 + (targetMonth - curMonth);
  const unlockMonth = (curMonth + offset - 2) % 12;
  return `Disponible le 15 ${MONTHS_FR[unlockMonth]}`;
}

/* ── Dots calendrier (slotsMap passé en paramètre) ── */

export function getDotClass(dateKey, memberId, slotsMap) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = keyToDate(dateKey);
  if (!isWeekday(d) || d < today) return null;

  const slot = slotsMap[dateKey];
  if (!slot) return null;
  if (slot.is_closed) return "dot-red";

  const max = slot.places || 2;
  if (memberId && slot.inscrits && slot.inscrits.some(m => m.id === memberId)) return "dot-orange";
  if (slot.inscrits && slot.inscrits.length >= max) return "dot-gray";
  return "dot-green";
}

export function getDotClassAdmin(dateKey, slotsMap) {
  const slot = slotsMap[dateKey];
  if (!slot || !isWeekday(keyToDate(dateKey))) return null;
  if (slot.is_closed) return "dot-red";
  const max = slot.places || 2;
  if (slot.inscrits && slot.inscrits.length >= max) return "dot-gray";
  return "dot-green";
}

/* ── Grille mensuelle ── */

export function buildMonthWeeks(year, month) {
  const first  = new Date(year, month, 1);
  const last   = lastDayOfMonth(year, month);
  const cursor = getMondayOf(first);
  const weeks  = [];

  while (cursor <= last) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i));
    }
    weeks.push(week);
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

export function renderCalendarGrid(container, year, month, memberId, selectedWeek, onWeekClick, slotsMap) {
  container.innerHTML = "";
  const today       = new Date(); today.setHours(0, 0, 0, 0);
  const weeks       = buildMonthWeeks(year, month);
  const isAdminView = (memberId === null);

  for (const week of weeks) {
    const weekRow   = document.createElement("div");
    weekRow.className = "cal-week";

    const monday    = week[0];
    const friday    = week[4];
    const mondayKey = dateToKey(monday);
    const isPast    = friday < today;

    const weekYear  = monday.getFullYear();
    const weekMonth = monday.getMonth();
    const isLocked  = !isAdminView &&
                      weekMonth !== month &&
                      !isMonthAccessibleForMember(weekYear, weekMonth);

    if (isPast)   weekRow.classList.add("week-past");
    if (isLocked) weekRow.classList.add("week-locked");
    if (selectedWeek === mondayKey) weekRow.classList.add("week-selected");

    if (!isPast && !isLocked) {
      weekRow.addEventListener("click", () => onWeekClick(mondayKey));
    }

    for (const day of week) {
      const dayEl = document.createElement("div");
      dayEl.className = "cal-day";
      if (day.getMonth() !== month) dayEl.classList.add("other-month");
      if (sameDay(day, today))      dayEl.classList.add("today");

      const numEl = document.createElement("div");
      numEl.className   = "cal-day-num";
      numEl.textContent = day.getDate();
      dayEl.appendChild(numEl);

      if (isWeekday(day) && !isPast) {
        const key      = dateToKey(day);
        const dotClass = isAdminView
          ? getDotClassAdmin(key, slotsMap)
          : getDotClass(key, memberId, slotsMap);
        if (dotClass) {
          const dot = document.createElement("div");
          dot.className = `cal-day-dot ${dotClass}`;
          dayEl.appendChild(dot);
        }
      }

      weekRow.appendChild(dayEl);
    }

    container.appendChild(weekRow);
  }
}

export function refreshDots(calBody, year, month, memberId, slotsMap) {
  const isAdminView = (memberId === null);
  const today       = new Date(); today.setHours(0, 0, 0, 0);
  const allWeeks    = buildMonthWeeks(year, month);
  const weekRows    = calBody.querySelectorAll(".cal-week");

  weekRows.forEach((weekRow, wi) => {
    const weekDates = allWeeks[wi];
    if (!weekDates) return;
    if (weekDates[4] < today) return;

    weekRow.querySelectorAll(".cal-day").forEach((dayEl, di) => {
      const day = weekDates[di];
      if (!day || !isWeekday(day)) return;

      const existing = dayEl.querySelector(".cal-day-dot");
      if (existing) existing.remove();

      const key      = dateToKey(day);
      const dotClass = isAdminView
        ? getDotClassAdmin(key, slotsMap)
        : getDotClass(key, memberId, slotsMap);

      if (dotClass) {
        const dot = document.createElement("div");
        dot.className = `cal-day-dot ${dotClass}`;
        dayEl.appendChild(dot);
      }
    });
  });
}

/* ── Label semaine ── */

export function weekRangeLabel(mondayKey) {
  const mon  = keyToDate(mondayKey);
  const fri  = new Date(mon); fri.setDate(mon.getDate() + 4);
  const monS = `${mon.getDate()} ${MONTHS_FR[mon.getMonth()]}`;
  const friS = `${fri.getDate()} ${MONTHS_FR[fri.getMonth()]}`;
  return `Semaine du ${monS} au ${friS}`;
}

/* ── Badges ── */

export function buildMemberBadge(slot, memberId) {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const slotDate = keyToDate(slot.date);

  if (slotDate < today)   return `<span class="badge badge-gray">Passé</span>`;
  if (slot.is_closed)     return `<span class="badge badge-red"><i class="ti ti-x"></i> Fermé</span>`;

  const count     = slot.inscrits ? slot.inscrits.length : 0;
  const isInscrit = slot.inscrits && slot.inscrits.some(m => m.id === memberId);

  if (isInscrit)                return `<span class="badge badge-orange">✓ Inscrit</span>`;
  if (count >= slot.places)     return `<span class="badge badge-gray">Complet</span>`;
  const free = slot.places - count;
  return `<span class="badge badge-green">${free} place${free > 1 ? "s" : ""}</span>`;
}

export function buildAdminBadge(slot) {
  if (slot.is_closed) return `<span class="badge badge-red"><i class="ti ti-x"></i> Fermé</span>`;
  const count = slot.inscrits ? slot.inscrits.length : 0;
  if (count >= slot.places)   return `<span class="badge badge-gray">Complet</span>`;
  const free = slot.places - count;
  return `<span class="badge badge-green">${free} place${free > 1 ? "s" : ""}</span>`;
}

/* ── Ligne inscrit ── */

export function buildInscritRow(member, isMe, showRemove, slotId) {
  const idx        = getAvatarColorIndex(member.id);
  const init       = getInitials(fullName(member));
  const youTag     = isMe ? `<span class="you-tag">(vous)</span>` : "";
  const tel        = member.tel
    ? `<a class="inscrit-tel" href="tel:${member.tel.replace(/\s/g, "")}">${member.tel}</a>`
    : "";
  const removeBtn  = showRemove
    ? `<button class="btn-remove-inscrit"
         data-action="remove"
         data-slot-id="${slotId}"
         data-member-id="${member.id}"
         title="Retirer ${fullName(member)}">
         <i class="ti ti-x"></i>
       </button>`
    : "";

  return `
    <div class="inscrit-row">
      <div class="inscrit-avatar av-${idx}" style="background:${getAvatarBgColor(idx)}">${init}</div>
      <div class="inscrit-info">
        <div class="inscrit-name">${fullName(member)}${youTag}</div>
        ${tel}
      </div>
      ${removeBtn}
    </div>`;
}
