/* =========================================================
   Department of Physiology — interactions
   ========================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICON = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M8 11h6"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>',
};

/* ---------- splash ---------- */
function dismissSplash() {
  const s = $('#splash');
  if (!s) return;
  s.classList.add('done');
  setTimeout(() => s.remove(), 1000);
}
if (reduceMotion) {
  $('#splash')?.remove();
} else {
  window.addEventListener('load', () => setTimeout(dismissSplash, 1700));
  // safety: never trap the user behind the splash
  setTimeout(dismissSplash, 3200);
}

/* ---------- year ---------- */
$('#year').textContent = new Date().getFullYear();

/* ---------- header scroll state ---------- */
const header = $('#header');
const onScroll = () => {
  header.classList.toggle('scrolled', window.scrollY > 12);
  toTop.classList.toggle('show', window.scrollY > 600);
};
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- mobile nav ---------- */
const nav = $('#nav');
const menuBtn = $('#menuBtn');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
$$('#nav a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  menuBtn.setAttribute('aria-expanded', 'false');
}));

/* ---------- scroll reveal ---------- */
if (reduceMotion) {
  $$('.reveal').forEach(el => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal:not(.in)').forEach(el => io.observe(el));
}

/* ---------- count up ---------- */
function countUp(el, to) {
  if (reduceMotion || !Number.isFinite(to)) { el.textContent = to; return; }
  const dur = 900, start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* =========================================================
   FACULTY
   ========================================================= */

const grid = $('#facultyGrid');
const countLabel = $('#facultyCountLabel');
const searchInput = $('#facultySearch');
const searchWrap = $('#searchWrap');
const searchClear = $('#searchClear');
let facultyData = [];
let query = '';

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function initials(n) {
  return n.replace(/^Dr\.\s*/i, '').split(/\s+/).slice(0, 3).map(x => x[0]).join('').toUpperCase();
}

function skeletonCards(n = 6) {
  grid.innerHTML = Array.from({ length: n }, (_, i) => `
    <div class="faculty-card skeleton ${i === 0 ? 'featured' : ''}">
      <div class="avatar"></div>
      <div class="body" style="flex:1">
        <div class="ln sm"></div><div class="ln md"></div><div class="ln lg"></div>
      </div>
    </div>`).join('');
}

function cardHTML(f, i) {
  const photo = f.photo
    ? `<img src="${esc(f.photo)}" alt="${esc(f.name)}" loading="lazy">`
    : esc(f.initials || initials(f.name));
  const tint = i % 3 === 1 ? ' pine' : '';
  return `
    <button class="faculty-card ${i === 0 && !query ? 'featured' : ''}" type="button" data-id="${esc(f.id)}" aria-label="View profile of ${esc(f.name)}">
      <span class="glare" aria-hidden="true"></span>
      <span class="avatar${tint}">${photo}</span>
      <span class="body">
        <span class="role">${esc(f.role || 'Faculty')}</span>
        <h3>${esc(f.name)}</h3>
        ${f.designation ? `<span class="desig">${esc(f.designation)}</span>` : ''}
        <span class="hint">View profile ${ICON.arrow}</span>
      </span>
    </button>`;
}

function stateHTML(icon, title, body, retry = false) {
  return `<div class="grid-state">
      ${icon}
      <h4>${title}</h4>
      <p>${body}</p>
      ${retry ? `<button class="btn secondary" id="retryBtn" type="button" style="margin-top:6px">Try again</button>` : ''}
    </div>`;
}

function render() {
  const q = query.trim().toLowerCase();
  const list = q
    ? facultyData.filter(f => `${f.name} ${f.designation || ''} ${f.role || ''}`.toLowerCase().includes(q))
    : facultyData;

  if (!list.length) {
    grid.innerHTML = q
      ? stateHTML(ICON.empty, 'No matching faculty', `Nothing matches “${esc(query)}”. Try a different name or designation.`)
      : stateHTML(ICON.empty, 'No faculty yet', 'Faculty profiles will appear here once they are added.');
    countLabel.textContent = q ? '0 results' : '';
    return;
  }

  grid.innerHTML = list.map((f, i) => cardHTML(f, i)).join('');
  countLabel.innerHTML = q
    ? `<b>${list.length}</b> of ${facultyData.length} shown`
    : `<b>${facultyData.length}</b> faculty members`;
}

async function fetchFaculty() {
  // Primary: Supabase REST (public read via RLS).
  try {
    const r = await fetch(`${window.SUPABASE_URL}/rest/v1/faculty?select=*&order=sort_order.asc`, {
      headers: { apikey: window.SUPABASE_ANON, Authorization: `Bearer ${window.SUPABASE_ANON}` }
    });
    if (r.ok) {
      const rows = await r.json();
      if (Array.isArray(rows) && rows.length) return rows;
    }
  } catch { /* fall through to snapshot */ }

  // Fallback: deployed snapshot, so the public list survives if the project pauses.
  try {
    const r = await fetch('/data/faculty.json');
    if (r.ok) {
      const d = await r.json();
      if (d && Array.isArray(d.faculty)) return d.faculty;
    }
  } catch { /* give up */ }

  throw new Error('unavailable');
}

async function loadFaculty() {
  skeletonCards();
  countLabel.textContent = 'Loading…';
  try {
    facultyData = await fetchFaculty();
    const n = facultyData.length;
    $('#panelCount').textContent = n;
    countUp($('#facultyCount'), n);
    render();
  } catch (e) {
    grid.innerHTML = stateHTML(ICON.warn, 'Faculty unavailable', 'We could not load faculty profiles right now. Please check your connection and try again.', true);
    countLabel.textContent = '';
    $('#retryBtn')?.addEventListener('click', loadFaculty);
    toast('Could not load faculty profiles.', 'Retry', loadFaculty);
  }
}

/* search */
searchInput.addEventListener('input', () => {
  query = searchInput.value;
  searchWrap.classList.toggle('has-value', query.length > 0);
  render();
});
searchClear.addEventListener('click', () => {
  searchInput.value = '';
  query = '';
  searchWrap.classList.remove('has-value');
  render();
  searchInput.focus();
});

/* delegated card click */
grid.addEventListener('click', (e) => {
  const card = e.target.closest('.faculty-card[data-id]');
  if (card) openProfile(card.dataset.id);
});

/* =========================================================
   MODAL (accessible)
   ========================================================= */

const modal = $('#profileModal');
const modalClose = $('#modalClose');
const profileContent = $('#profileContent');
let lastFocused = null;

function openProfile(id) {
  const f = facultyData.find(x => x.id === id);
  if (!f) return;
  const photo = f.photo
    ? `<img class="avatar" style="object-fit:cover" src="${esc(f.photo)}" alt="${esc(f.name)}">`
    : `<span class="avatar">${esc(f.initials || initials(f.name))}</span>`;
  const section = (h, v, isLink) => v
    ? `<div class="profile-section"><h4>${h}</h4><p>${isLink ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : esc(v)}</p></div>`
    : '';
  profileContent.innerHTML = `
    <div class="profile-head">
      ${photo}
      <div>
        <span class="profile-label">${esc(f.role || 'Faculty')}</span>
        <h2 id="profileName">${esc(f.name)}</h2>
        ${f.designation ? `<p class="desig">${esc(f.designation)}</p>` : ''}
      </div>
    </div>
    ${section('Qualification', f.qualification)}
    ${section('About', f.about)}
    ${section('Research interests', f.research)}
    ${section('Email', f.email, true)}
    <button class="edit-profile-btn" type="button" data-edit="${esc(f.id)}">${ICON.edit} Edit profile</button>`;

  profileContent.querySelector('[data-edit]')?.addEventListener('click', () => startEdit(f.id));

  lastFocused = document.activeElement;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  modalClose.focus();
}

function closeProfile() {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  lastFocused?.focus?.();
}

modalClose.addEventListener('click', closeProfile);
modal.addEventListener('click', e => { if (e.target === modal) closeProfile(); });
document.addEventListener('keydown', (e) => {
  if (!modal.classList.contains('show')) return;
  if (e.key === 'Escape') closeProfile();
  if (e.key === 'Tab') {
    const f = $$('button, a[href], input, [tabindex]:not([tabindex="-1"])', modal).filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

async function startEdit(id) {
  sessionStorage.setItem('editFacultyId', id);
  location.href = '/admin.html';
}

/* =========================================================
   BACK TO TOP + TOASTS
   ========================================================= */

const toTop = $('#toTop');
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

const toastWrap = $('#toasts');
function toast(message, actionLabel, action) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="ic">${ICON.warn}</span><span class="grow">${esc(message)}</span>`;
  if (actionLabel && action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = actionLabel;
    b.addEventListener('click', () => { remove(); action(); });
    el.appendChild(b);
  }
  toastWrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const remove = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); };
  setTimeout(remove, 6000);
}

/* ---------- go ---------- */
onScroll();
loadFaculty();

/* =========================================================
   INTERACTION LAYER — progress, scroll-spy, cursor, 3D, tilt
   ========================================================= */

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* scroll progress bar */
const prog = $('#scrollProgress');
function updateProgress() {
  const el = document.documentElement;
  const max = el.scrollHeight - el.clientHeight;
  prog.style.transform = `scaleX(${max > 0 ? el.scrollTop / max : 0})`;
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

/* scroll-spy nav */
const spySections = ['home', 'about', 'faculty', 'academics', 'research', 'facilities', 'contact']
  .map(id => document.getElementById(id)).filter(Boolean);
const navLinks = $$('#nav a');
function spy() {
  const y = window.scrollY + 130;
  let current = spySections[0] ? spySections[0].id : '';
  for (const s of spySections) if (s.offsetTop <= y) current = s.id;
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
}
window.addEventListener('scroll', spy, { passive: true });
spy();

/* custom cursor ring (augments native cursor) */
if (finePointer && !reduceMotion) {
  const ring = $('#cursorRing');
  const interactive = 'a, button, input, textarea, select, .faculty-card, [role="button"]';
  let rx = innerWidth / 2, ry = innerHeight / 2, tx = rx, ty = ry;
  document.body.classList.add('cursor-on');
  addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  addEventListener('mousedown', () => ring.classList.add('down'));
  addEventListener('mouseup', () => ring.classList.remove('down'));
  addEventListener('mouseover', e => { if (e.target.closest && e.target.closest(interactive)) ring.classList.add('active'); });
  addEventListener('mouseout', e => {
    const to = e.relatedTarget;
    if (e.target.closest && e.target.closest(interactive) && !(to && to.closest && to.closest(interactive))) ring.classList.remove('active');
  });
  addEventListener('mouseleave', () => document.body.classList.remove('cursor-on'));
  addEventListener('mouseenter', () => document.body.classList.add('cursor-on'));
  let sc = 1;
  (function loop() {
    rx += (tx - rx) * 0.2; ry += (ty - ry) * 0.2;
    const target = ring.classList.contains('active') ? 1.5 : 1;
    sc += (target - sc) * 0.2;
    ring.style.transform = `translate(${rx}px, ${ry}px) scale(${sc})`;
    requestAnimationFrame(loop);
  })();
}

/* 3D tilt on faculty cards */
if (finePointer && !reduceMotion) {
  grid.addEventListener('mousemove', e => {
    const card = e.target.closest('.faculty-card');
    if (!card || card.classList.contains('skeleton')) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.classList.add('tilting');
    card.style.transform = `translateY(-6px) rotateX(${(0.5 - py) * 9}deg) rotateY(${(px - 0.5) * 11}deg)`;
    card.style.setProperty('--gx', (px * 100) + '%');
    card.style.setProperty('--gy', (py * 100) + '%');
  });
  grid.addEventListener('mouseout', e => {
    const card = e.target.closest('.faculty-card');
    if (card && !card.contains(e.relatedTarget)) { card.classList.remove('tilting'); card.style.transform = ''; }
  });
}

/* magnetic primary buttons */
if (finePointer && !reduceMotion) {
  $$('.btn.primary').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

/* hero 3D molecular point cloud (hand-rolled, no dependency) */
(function hero3d() {
  const canvas = $('#hero3d');
  const hero = $('#home');
  if (!canvas || !hero) return;
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const N = (reduceMotion || innerWidth < 760) ? 130 : 230;

  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const phi = Math.acos(1 - 2 * t);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    pts.push({ x: Math.sin(phi) * Math.cos(theta), y: Math.sin(phi) * Math.sin(theta), z: Math.cos(phi) });
  }
  const edges = [];
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
      if (dx * dx + dy * dy + dz * dz < 0.072) edges.push([i, j]);
    }

  let W = 0, H = 0, rot = 0, px = 0, py = 0, tpx = 0, tpy = 0, visible = true;
  function size() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  addEventListener('resize', size);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  if (!reduceMotion) addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    if (e.clientY > r.bottom) return;
    tpx = (e.clientX / innerWidth) - 0.5;
    tpy = (e.clientY / r.height) - 0.5;
  }, { passive: true });

  function render() {
    const rad = Math.min(W, H) * 0.5, cx = W * 0.59, cy = H * 0.5;
    const ax = py * 0.55, ay = rot + px * 0.8;
    const cosY = Math.cos(ay), sinY = Math.sin(ay), cosX = Math.cos(ax), sinX = Math.sin(ax);
    const proj = pts.map(p => {
      let x = p.x * cosY - p.z * sinY;
      let z1 = p.x * sinY + p.z * cosY;
      let y = p.y * cosX - z1 * sinX;
      const z = p.y * sinX + z1 * cosX;
      const persp = 1 / (1.85 - z * 0.6);
      return { sx: cx + x * rad * persp, sy: cy + y * rad * persp, z, persp };
    });
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (const [i, j] of edges) {
      const a = proj[i], b = proj[j];
      const alpha = 0.05 + ((a.z + b.z) / 2 + 1) / 2 * 0.1;
      ctx.strokeStyle = `rgba(22,53,40,${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }
    for (const q of proj) {
      const depth = (q.z + 1) / 2;
      ctx.beginPath();
      ctx.arc(q.sx, q.sy, (0.7 + depth * 1.9) * q.persp, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(194,59,34,${(0.16 + depth * 0.5).toFixed(3)})`;
      ctx.fill();
    }
  }

  if (reduceMotion) {
    render();
    addEventListener('resize', render);
  } else {
    (function frame() {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      rot += 0.0016;
      px += (tpx - px) * 0.05; py += (tpy - py) * 0.05;
      render();
    })();
  }
})();
