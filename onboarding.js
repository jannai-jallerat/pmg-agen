/* ═══════════════════════════════════════════
   onboarding.js — Visite guidée première connexion
══════════════════════════════════════════════ */

export function maybeShowOnboarding(member) {
  if (!member?.id) return;
  if (localStorage.getItem(`tpl_onboarding_${member.id}`)) return;
  _build(member);
}

/* ── Helpers ── */

function _ci(id = '') {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xfffffff;
  return h % 8;
}

function _ini(m) {
  return ((m.prenom || '')[0] || '').toUpperCase() +
         ((m.nom    || '')[0] || '').toUpperCase();
}

/* ── 6 étapes ── */

function _steps(member) {
  const p   = member.prenom || 'vous';
  const ini = _ini(member);
  const ci  = _ci(member.id);

  return [
    /* ── Étape 1 : Bienvenue ── */
    {
      html: `
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100%;gap:18px;background:var(--gray);padding:32px 20px;text-align:center">
  <div class="ob-wave">👋</div>
  <div class="inscrit-avatar av-${ci}"
    style="width:76px;height:76px;font-size:1.55rem;flex-shrink:0;box-shadow:0 4px 16px rgba(0,0,0,.18)">${ini}</div>
  <strong style="font-size:1.3rem;color:var(--text)">Bienvenue ${p} !</strong>
  <span style="font-size:.85rem;color:var(--text3)">TPL — Gare d'Agen</span>
  <div style="margin-top:6px;font-size:.84rem;color:var(--text2);line-height:1.65;max-width:270px;
    background:#fff;border-radius:10px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
    Voici comment fonctionne l'application en <b>6 étapes rapides</b>.
  </div>
</div>`,
      title: `Bienvenue ${p} !`,
      body: 'Laissez-nous vous guider en quelques étapes.'
    },

    /* ── Étape 2 : Le calendrier ── */
    {
      html: `
<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
  <header class="topbar" style="flex-shrink:0">
    <div class="topbar-left">
      <div class="logo-box logo-sm"><span class="logo-pm">TPL</span></div>
      <span class="topbar-title">Présentoir Mobile à la Gare</span>
    </div>
    <div class="topbar-right">
      <div class="inscrit-avatar av-${ci}" style="width:32px;height:32px;font-size:.75rem">${ini}</div>
    </div>
  </header>
  <div class="quota-bar" style="flex-shrink:0">
    <div class="quota-dots">
      <span class="quota-dot empty"></span><span class="quota-dot empty"></span>
    </div>
    <span class="quota-text">2 réservations disponibles</span>
  </div>
  <nav class="tabs" style="flex-shrink:0;pointer-events:none">
    <button class="tab active">Calendrier</button>
    <button class="tab">Mes inscriptions</button>
    <button class="tab">Urgences 🚨</button>
  </nav>
  <div style="flex:1;overflow:hidden">
    <div class="month-nav" style="position:relative">
      <button class="month-btn" style="position:relative">
        ‹
        <span class="ann-label" style="position:absolute;left:calc(100% + 6px);top:50%;
          transform:translateY(-50%);white-space:nowrap">Changer de mois</span>
      </button>
      <span class="month-label">Juin 2026</span>
      <button class="month-btn">›</button>
    </div>
    <div class="calendar-grid" style="position:relative">
      <div class="cal-header">
        <span>Lun</span><span>Mar</span><span>Mer</span>
        <span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
      </div>
      <div class="cal-body">
        <div class="cal-week">
          <div class="cal-day"><span class="cal-day-num">1</span><span class="cal-day-dot dot-green"></span></div>
          <div class="cal-day"><span class="cal-day-num">2</span><span class="cal-day-dot dot-green"></span></div>
          <div class="cal-day"><span class="cal-day-num">3</span><span class="cal-day-dot dot-gray"></span></div>
          <div class="cal-day"><span class="cal-day-num">4</span><span class="cal-day-dot dot-green"></span></div>
          <div class="cal-day"><span class="cal-day-num">5</span><span class="cal-day-dot dot-green"></span></div>
          <div class="cal-day"><span class="cal-day-num" style="color:var(--text3)">6</span></div>
          <div class="cal-day"><span class="cal-day-num" style="color:var(--text3)">7</span></div>
        </div>
        <div class="cal-week week-selected" style="position:relative">
          <div class="cal-day"><span class="cal-day-num">8</span><span class="cal-day-dot dot-orange"></span></div>
          <div class="cal-day"><span class="cal-day-num">9</span><span class="cal-day-dot dot-green"></span></div>
          <div class="cal-day"><span class="cal-day-num">10</span><span class="cal-day-dot dot-gray"></span></div>
          <div class="cal-day"><span class="cal-day-num">11</span><span class="cal-day-dot dot-green"></span></div>
          <div class="cal-day"><span class="cal-day-num">12</span><span class="cal-day-dot dot-green"></span></div>
          <div class="cal-day"><span class="cal-day-num" style="color:var(--text3)">13</span></div>
          <div class="cal-day"><span class="cal-day-num" style="color:var(--text3)">14</span></div>
          <span class="ann-circle" style="inset:-2px 0;border-radius:8px"></span>
          <span class="ann-label" style="position:absolute;top:calc(100% + 6px);left:0;right:0;
            text-align:center;white-space:nowrap">Cliquez sur une semaine</span>
        </div>
        <div class="cal-week">
          <div class="cal-day"><span class="cal-day-num">15</span><span class="cal-day-dot dot-green"></span></div>
          <div class="cal-day"><span class="cal-day-num">16</span><span class="cal-day-dot dot-green"></span></div>
          <div class="cal-day"><span class="cal-day-num">17</span><span class="cal-day-dot dot-red"></span></div>
          <div class="cal-day"><span class="cal-day-num">18</span><span class="cal-day-dot dot-green"></span></div>
          <div class="cal-day"><span class="cal-day-num">19</span><span class="cal-day-dot dot-green"></span></div>
          <div class="cal-day"><span class="cal-day-num" style="color:var(--text3)">20</span></div>
          <div class="cal-day"><span class="cal-day-num" style="color:var(--text3)">21</span></div>
        </div>
      </div>
      <!-- Légende dots -->
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px 6px;flex-wrap:wrap;position:relative">
        <span class="ann-circle" style="inset:-3px;border-radius:6px"></span>
        <span style="display:flex;align-items:center;gap:4px">
          <span class="cal-day-dot dot-green" style="width:9px;height:9px"></span>
          <span style="font-size:11px;font-weight:600;color:var(--text2)">Libre</span>
        </span>
        <span style="display:flex;align-items:center;gap:4px">
          <span class="cal-day-dot dot-orange" style="width:9px;height:9px"></span>
          <span style="font-size:11px;font-weight:600;color:var(--text2)">Inscrit</span>
        </span>
        <span style="display:flex;align-items:center;gap:4px">
          <span class="cal-day-dot dot-gray" style="width:9px;height:9px"></span>
          <span style="font-size:11px;font-weight:600;color:var(--text2)">Complet</span>
        </span>
        <span class="ann-label" style="position:absolute;bottom:calc(100% + 4px);left:4px;white-space:nowrap">
          Vert = libre · Orange = inscrit · Gris = complet
        </span>
      </div>
    </div>
  </div>
</div>`,
      title: 'Le calendrier',
      body: 'Cliquez sur une semaine pour voir les créneaux disponibles.'
    },

    /* ── Étape 3 : Les créneaux ── */
    {
      html: `
<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
  <header class="topbar" style="flex-shrink:0">
    <div class="topbar-left">
      <div class="logo-box logo-sm"><span class="logo-pm">TPL</span></div>
      <span class="topbar-title">Présentoir Mobile à la Gare</span>
    </div>
    <div class="topbar-right">
      <div class="inscrit-avatar av-${ci}" style="width:32px;height:32px;font-size:.75rem">${ini}</div>
    </div>
  </header>
  <nav class="tabs" style="flex-shrink:0;pointer-events:none">
    <button class="tab active">Calendrier</button>
    <button class="tab">Mes inscriptions</button>
    <button class="tab">Urgences 🚨</button>
  </nav>
  <div style="flex:1;overflow-y:auto;padding:.75rem 1.25rem 1.5rem">
    <p class="week-title">Semaine du 8 au 12 juin 2026</p>
    <!-- Créneau Lundi -->
    <div class="day-card" style="position:relative">
      <div class="day-card-header">
        <div>
          <div class="day-card-name">Lundi 8 juin</div>
          <div class="day-card-time">9h00 – 12h00</div>
        </div>
        <span class="badge badge-green" style="position:relative">
          1 place
          <span class="ann-circle" style="inset:-4px -6px;border-radius:20px"></span>
          <span class="ann-label" style="position:absolute;top:calc(100% + 6px);right:0;white-space:nowrap">
            Places disponibles
          </span>
        </span>
      </div>
      <div class="day-card-body">
        <div class="inscrit-row" style="position:relative">
          <div class="inscrit-avatar av-3" style="width:32px;height:32px;font-size:.75rem">MR</div>
          <div class="inscrit-info">
            <div class="inscrit-name">
              Marie Rousseau
              <span class="ann-label" style="position:absolute;right:0;top:0;white-space:nowrap">Votre co-équipier</span>
            </div>
          </div>
          <span class="ann-circle" style="inset:-4px;border-radius:8px"></span>
        </div>
      </div>
      <div class="day-card-action">
        <button class="btn btn-primary btn-full" style="position:relative;pointer-events:none">
          S'inscrire
          <span class="ann-label"
            style="position:absolute;right:calc(100% + 8px);top:50%;transform:translateY(-50%);white-space:nowrap">
            Réservez ici !
          </span>
          <span class="ann-arr ann-arr-right"
            style="position:absolute;right:calc(100% + 2px);top:50%;transform:translateY(-50%)"></span>
        </button>
      </div>
    </div>
    <!-- Créneau Mardi (inscrit) -->
    <div class="day-card" style="position:relative">
      <div class="day-card-header">
        <div>
          <div class="day-card-name">Mardi 9 juin</div>
          <div class="day-card-time">9h00 – 12h00</div>
        </div>
        <span class="badge badge-orange" style="position:relative">
          ✓ Inscrit
          <span class="ann-circle" style="inset:-4px -6px;border-radius:20px"></span>
          <span class="ann-label" style="position:absolute;top:calc(100% + 6px);right:0;white-space:nowrap">
            Vous êtes inscrit
          </span>
        </span>
      </div>
      <div class="day-card-body">
        <div class="inscrit-row">
          <div class="inscrit-avatar av-${ci}" style="width:32px;height:32px;font-size:.75rem">${ini}</div>
          <div class="inscrit-info">
            <div class="inscrit-name">${p} <span class="you-tag">(vous)</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
      title: 'Les créneaux',
      body: "Cliquez S'inscrire pour réserver. Vous voyez directement qui sera avec vous."
    },

    /* ── Étape 4 : Mes inscriptions ── */
    {
      html: `
<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
  <header class="topbar" style="flex-shrink:0">
    <div class="topbar-left">
      <div class="logo-box logo-sm"><span class="logo-pm">TPL</span></div>
      <span class="topbar-title">Présentoir Mobile à la Gare</span>
    </div>
    <div class="topbar-right">
      <div class="inscrit-avatar av-${ci}" style="width:32px;height:32px;font-size:.75rem">${ini}</div>
    </div>
  </header>
  <nav class="tabs" style="flex-shrink:0;pointer-events:none;position:relative">
    <button class="tab">Calendrier</button>
    <button class="tab active" style="position:relative">
      Mes inscriptions
      <span class="ann-circle" style="inset:-2px 0;border-radius:0 0 4px 4px;border-radius:4px"></span>
      <span class="ann-label" style="position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap">
        Vos créneaux à venir
      </span>
    </button>
    <button class="tab">Urgences 🚨</button>
  </nav>
  <div class="my-slots-wrap" style="flex:1;overflow-y:auto;padding-top:1rem">
    <!-- Inscription 1 -->
    <div class="my-slot-card" style="position:relative">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:700;font-size:.95rem;color:var(--text)">Lundi 8 juin</div>
          <div style="font-size:.78rem;color:var(--text3)">9h00 – 12h00</div>
        </div>
        <span class="badge badge-blue">À venir</span>
      </div>
      <div class="my-slot-coinscrits" style="position:relative">
        <div class="co-inscrits-label">Co-équipiers</div>
        <div class="inscrit-row" style="position:relative">
          <div class="inscrit-avatar av-3" style="width:28px;height:28px;font-size:.7rem">MR</div>
          <div class="inscrit-info">
            <div class="inscrit-name">Marie Rousseau</div>
            <a class="inscrit-tel" href="tel:0612345678">06 12 34 56 78</a>
          </div>
          <span class="ann-circle" style="inset:-4px;border-radius:8px"></span>
          <span class="ann-label" style="position:absolute;right:0;top:0;white-space:nowrap">
            Co-équipiers + téléphone
          </span>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm my-slot-desist-btn" style="position:relative;pointer-events:none;color:var(--red);border-color:var(--red)">
        Se désister
        <span class="ann-circle" style="inset:-4px;border-radius:8px"></span>
        <span class="ann-label" style="position:absolute;left:calc(100% + 6px);top:50%;transform:translateY(-50%);white-space:nowrap">
          Annuler si besoin
        </span>
      </button>
    </div>
    <!-- Inscription 2 -->
    <div class="my-slot-card">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:700;font-size:.95rem;color:var(--text)">Mardi 9 juin</div>
          <div style="font-size:.78rem;color:var(--text3)">9h00 – 12h00</div>
        </div>
        <span class="badge badge-blue">À venir</span>
      </div>
    </div>
  </div>
</div>`,
      title: 'Mes inscriptions',
      body: 'Retrouvez tous vos créneaux à venir et vos co-équipiers avec leur téléphone.'
    },

    /* ── Étape 5 : Le quota ── */
    {
      html: `
<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
  <header class="topbar" style="flex-shrink:0">
    <div class="topbar-left">
      <div class="logo-box logo-sm"><span class="logo-pm">TPL</span></div>
      <span class="topbar-title">Présentoir Mobile à la Gare</span>
    </div>
    <div class="topbar-right">
      <div class="inscrit-avatar av-${ci}" style="width:32px;height:32px;font-size:.75rem">${ini}</div>
    </div>
  </header>
  <div class="quota-bar" style="flex-shrink:0;position:relative">
    <div class="quota-dots" style="position:relative">
      <span class="quota-dot filled"></span>
      <span class="quota-dot filled"></span>
      <span class="ann-circle" style="inset:-6px -4px;border-radius:20px"></span>
      <span class="ann-label" style="position:absolute;top:calc(100% + 8px);left:0;white-space:nowrap">
        2 réservations max par jour
      </span>
    </div>
    <span class="quota-text" style="position:relative;margin-left:12px">
      Quota atteint
      <span class="ann-arr ann-arr-left" style="position:absolute;right:calc(100% + 4px);top:50%;transform:translateY(-50%)"></span>
    </span>
  </div>
  <nav class="tabs" style="flex-shrink:0;pointer-events:none">
    <button class="tab active">Calendrier</button>
    <button class="tab">Mes inscriptions</button>
    <button class="tab">Urgences 🚨</button>
  </nav>
  <div style="flex:1;overflow-y:auto;padding:.75rem 1.25rem 1.5rem">
    <p class="week-title">Semaine du 8 au 12 juin 2026</p>
    <div class="day-card">
      <div class="day-card-header">
        <div>
          <div class="day-card-name">Mercredi 10 juin</div>
          <div class="day-card-time">9h00 – 12h00</div>
        </div>
        <span class="badge badge-green">2 places</span>
      </div>
      <div class="day-card-body">
        <div class="places-libres">
          <i class="ti ti-users"></i> 2 places disponibles
        </div>
      </div>
      <div class="day-card-action" style="position:relative">
        <button class="btn btn-primary btn-full" disabled
          style="opacity:.5;cursor:not-allowed;pointer-events:none;position:relative">
          S'inscrire
          <span class="ann-circle" style="inset:-4px;border-radius:8px"></span>
          <span class="ann-label" style="position:absolute;right:0;bottom:calc(100% + 6px);white-space:nowrap">
            Quota atteint = bouton bloqué
          </span>
        </button>
        <p class="slot-quota-msg" style="position:relative">
          Disponible demain à 7h
          <span class="ann-arr ann-arr-left" style="position:absolute;right:calc(100% + 4px);top:50%;transform:translateY(-50%)"></span>
          <span class="ann-label" style="position:absolute;right:calc(100% + 14px);top:50%;transform:translateY(-50%);white-space:nowrap">
            Reset à 7h le lendemain
          </span>
        </p>
      </div>
    </div>
  </div>
</div>`,
      title: 'Le quota',
      body: 'Vous pouvez faire 2 réservations par jour. Si vous annulez, vous récupérez une réservation.'
    },

    /* ── Étape 6 : Urgences ── */
    {
      html: `
<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
  <header class="topbar" style="flex-shrink:0">
    <div class="topbar-left">
      <div class="logo-box logo-sm"><span class="logo-pm">TPL</span></div>
      <span class="topbar-title">Présentoir Mobile à la Gare</span>
    </div>
    <div class="topbar-right">
      <div class="inscrit-avatar av-${ci}" style="width:32px;height:32px;font-size:.75rem">${ini}</div>
    </div>
  </header>
  <nav class="tabs" style="flex-shrink:0;pointer-events:none">
    <button class="tab">Calendrier</button>
    <button class="tab">Mes inscriptions</button>
    <button class="tab active">Urgences 🚨</button>
  </nav>
  <div style="flex:1;overflow-y:auto;padding:1rem 1.25rem 1.5rem;display:flex;flex-direction:column;gap:.75rem">
    <!-- Responsables -->
    <div style="font-size:.7rem;font-weight:700;color:var(--text3);text-transform:uppercase;
      letter-spacing:.08em;margin-bottom:-.25rem">Responsables</div>
    <a href="tel:0600000001" style="background:#fff;border-radius:var(--radius);border:1px solid var(--gray2);
      padding:.85rem 1rem;display:flex;align-items:center;gap:.75rem;
      box-shadow:0 1px 3px rgba(0,0,0,.05);text-decoration:none;position:relative">
      <div class="inscrit-avatar av-0" style="width:40px;height:40px;font-size:.88rem;flex-shrink:0">JC</div>
      <div>
        <div style="font-weight:700;font-size:.9rem;color:var(--text)">Jean-Christophe A.</div>
        <div style="font-size:.82rem;color:var(--blue)">06 00 00 00 01</div>
      </div>
      <i class="ti ti-phone" style="margin-left:auto;color:var(--blue);font-size:1.2rem"></i>
      <span class="ann-circle" style="inset:-3px;border-radius:calc(var(--radius) + 3px)"></span>
      <span class="ann-label" style="position:absolute;right:0;bottom:calc(100% + 6px);white-space:nowrap">
        Appel direct en 1 tap
      </span>
    </a>
    <a href="tel:0600000002" style="background:#fff;border-radius:var(--radius);border:1px solid var(--gray2);
      padding:.85rem 1rem;display:flex;align-items:center;gap:.75rem;
      box-shadow:0 1px 3px rgba(0,0,0,.05);text-decoration:none;position:relative">
      <div class="inscrit-avatar av-2" style="width:40px;height:40px;font-size:.88rem;flex-shrink:0">KB</div>
      <div>
        <div style="font-weight:700;font-size:.9rem;color:var(--text)">Kailash B.</div>
        <div style="font-size:.82rem;color:var(--blue)">06 00 00 00 02</div>
      </div>
      <i class="ti ti-phone" style="margin-left:auto;color:var(--blue);font-size:1.2rem"></i>
      <span class="ann-circle" style="inset:-3px;border-radius:calc(var(--radius) + 3px)"></span>
    </a>
    <!-- Urgences nationales -->
    <div style="font-size:.7rem;font-weight:700;color:var(--text3);text-transform:uppercase;
      letter-spacing:.08em;margin-top:.25rem;margin-bottom:-.25rem">Numéros d'urgence</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;position:relative">
      <span class="ann-circle" style="inset:-6px;border-radius:calc(var(--radius) + 6px)"></span>
      <span class="ann-label" style="position:absolute;top:calc(100% + 8px);left:50%;
        transform:translateX(-50%);white-space:nowrap">Pompiers et Police</span>
      <a href="tel:18" style="background:#fff;border-radius:var(--radius);border:1px solid var(--gray2);
        padding:.75rem;text-align:center;text-decoration:none;
        box-shadow:0 1px 3px rgba(0,0,0,.05)">
        <div style="font-size:1.6rem;font-weight:800;color:#e74c3c">18</div>
        <div style="font-size:.72rem;color:var(--text2);font-weight:600">Pompiers</div>
      </a>
      <a href="tel:17" style="background:#fff;border-radius:var(--radius);border:1px solid var(--gray2);
        padding:.75rem;text-align:center;text-decoration:none;
        box-shadow:0 1px 3px rgba(0,0,0,.05)">
        <div style="font-size:1.6rem;font-weight:800;color:var(--blue)">17</div>
        <div style="font-size:.72rem;color:var(--text2);font-weight:600">Police</div>
      </a>
    </div>
  </div>
</div>`,
      title: 'Urgences',
      body: "En cas de problème à la gare, appelez directement depuis l'appli."
    },
  ];
}

/* ── Construction de l'overlay ── */

function _build(member) {
  const steps = _steps(member);
  const total = steps.length;
  let cur = 0;

  /* ── DOM ── */
  const overlay = document.createElement('div');
  overlay.className = 'ob-overlay';
  overlay.innerHTML = `
    <div class="ob-header">
      <span class="ob-step-label">Étape 1/${total}</span>
      <button class="ob-skip">Passer</button>
    </div>
    <div class="ob-progress">${_dots(0, total)}</div>
    <div class="ob-body">
      ${steps.map((s, i) => `
        <div class="ob-slide${i === 0 ? ' ob-slide-active' : ''}">
          <div class="ob-screen">${s.html}</div>
          <div class="ob-caption">
            <div class="ob-caption-title">${s.title}</div>
            <div class="ob-caption-body">${s.body}</div>
          </div>
        </div>`).join('')}
    </div>
    <div class="ob-nav">
      <button class="ob-prev" style="visibility:hidden">← Précédent</button>
      <button class="ob-next">Suivant →</button>
    </div>`;

  document.body.appendChild(overlay);

  const slideEls  = Array.from(overlay.querySelectorAll('.ob-slide'));
  const labelEl   = overlay.querySelector('.ob-step-label');
  const progressEl= overlay.querySelector('.ob-progress');
  const prevBtn   = overlay.querySelector('.ob-prev');
  const nextBtn   = overlay.querySelector('.ob-next');
  const skipBtn   = overlay.querySelector('.ob-skip');

  /* ── Animation slide ── */
  function goTo(n, dir) {
    if (n === cur) return;
    const from = slideEls[cur];
    const to   = slideEls[n];

    to.style.transition = 'none';
    to.style.transform  = `translateX(${dir * 100}%)`;
    to.classList.add('ob-slide-active');
    to.getBoundingClientRect();                       // force reflow

    from.style.transition = 'transform .3s ease-out';
    from.style.transform  = `translateX(${-dir * 100}%)`;
    to.style.transition   = 'transform .3s ease-out';
    to.style.transform    = 'translateX(0)';

    setTimeout(() => {
      from.classList.remove('ob-slide-active');
      from.style.transform = '';
      from.style.transition = '';
    }, 320);

    cur = n;
    _updateUI(n, total, labelEl, progressEl, prevBtn, nextBtn);
  }

  nextBtn.addEventListener('click', () => {
    if (cur === total - 1) _close(overlay, member.id);
    else goTo(cur + 1, 1);
  });
  prevBtn.addEventListener('click', () => {
    if (cur > 0) goTo(cur - 1, -1);
  });
  skipBtn.addEventListener('click', () => _close(overlay, member.id));

  /* Swipe horizontal */
  let _tx0 = null;
  overlay.addEventListener('touchstart', e => {
    _tx0 = e.touches[0].clientX;
  }, { passive: true });
  overlay.addEventListener('touchend', e => {
    if (_tx0 === null) return;
    const dx = e.changedTouches[0].clientX - _tx0;
    _tx0 = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && cur < total - 1) goTo(cur + 1,  1);
    if (dx > 0 && cur > 0)         goTo(cur - 1, -1);
  }, { passive: true });
}

function _updateUI(n, total, labelEl, progressEl, prevBtn, nextBtn) {
  labelEl.textContent      = `Étape ${n + 1}/${total}`;
  progressEl.innerHTML     = _dots(n, total);
  prevBtn.style.visibility = n === 0 ? 'hidden' : 'visible';
  nextBtn.textContent      = n === total - 1 ? "C'est parti !" : 'Suivant →';
  if (n === total - 1) nextBtn.classList.add('ob-next-finish');
  else                 nextBtn.classList.remove('ob-next-finish');
}

function _dots(active, total) {
  return Array.from({ length: total }, (_, i) =>
    `<span class="ob-dot${i === active ? ' ob-dot-active' : ''}"></span>`
  ).join('');
}

function _close(overlay, memberId) {
  localStorage.setItem(`tpl_onboarding_${memberId}`, 'done');
  overlay.style.transition = 'opacity .3s';
  overlay.style.opacity    = '0';
  setTimeout(() => overlay.remove(), 320);
}
