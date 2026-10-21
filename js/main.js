// Mireia · Perruqueria i Estètica · "×400: desde el origen"
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const D = window.I18N;
  const WA = '34670327185';
  const hasGsap = !!window.gsap;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  let lang = '';
  try { lang = localStorage.getItem('mireia-lang') || ''; } catch (e) { /* sin almacenamiento */ }
  if (!D[lang]) { const n = (navigator.language || 'es').slice(0, 2).toLowerCase(); lang = D[n] ? n : 'es'; }
  const t = (k) => (D[lang][k] !== undefined ? D[lang][k] : D.es[k]);
  const fill = (s, o) => s.replace(/\{(\w)\}/g, (m, k) => (o[k] !== undefined ? o[k] : m));

  // ---------- horario (hora de Madrid) · índice 0 = lunes ----------
  const HOURS = [null, [540, 1080], [540, 1080], [540, 1080], [540, 1080], [540, 900], null];
  const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  function madridNow() {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = (type) => p.find((x) => x.type === type).value;
    return { d: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(g('weekday')), m: +g('hour') * 60 + +g('minute') };
  }
  function statusText() {
    const { d, m } = madridNow();
    const h = HOURS[d];
    if (h && m >= h[0] && m < h[1]) return { open: true, txt: fill(t('st.open'), { t: fmt(h[1]) }) };
    if (h && m < h[0]) return { open: false, txt: fill(t('st.today'), { t: fmt(h[0]) }) };
    for (let i = 1; i <= 7; i++) {
      const k = (d + i) % 7;
      if (HOURS[k]) {
        let day = t('days')[k];
        if (lang !== 'en') day = day.toLowerCase();
        return { open: false, txt: fill(t('st.next'), { d: day, t: fmt(HOURS[k][0]) }) };
      }
    }
    return { open: false, txt: '' };
  }
  function renderStatus() {
    const s = statusText();
    ['#status', '#status2'].forEach((sel) => { const el = $(sel); if (!el) return; el.classList.toggle('is-open', s.open); $('span', el).textContent = s.txt; });
  }
  function renderHours() {
    const { d } = madridNow();
    $('#horario').innerHTML = t('days').map((name, i) => {
      const h = HOURS[i];
      const cls = [i === d ? 'is-today' : '', h ? '' : 'is-off'].join(' ').trim();
      return `<li${cls ? ` class="${cls}"` : ''}><span>${name}${i === d ? ` · ${t('today')}` : ''}</span><span>${h ? `${fmt(h[0])} a ${fmt(h[1])}`.replace(' a ', lang === 'en' ? ' to ' : lang === 'fr' ? ' à ' : ' a ') : t('closed')}</span></li>`;
    }).join('');
  }

  // ---------- titular partido en palabras (para animarlo) ----------
  function splitWords(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1) walk(c);
      });
    };
    walk(el);
  }

  // ---------- idiomas ----------
  function applyLang(l) {
    lang = l;
    root.lang = l;
    $$('[data-i18n]').forEach((el) => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
    $$('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    $$('.langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    splitWords($('#hero-h'));
    renderHours();
    renderStatus();
    buildCita();
    labRender();
    setRail(railKey);
    try { localStorage.setItem('mireia-lang', l); } catch (e) { /* sin almacenamiento */ }
  }
  $$('.langs button').forEach((b) => b.addEventListener('click', () => { applyLang(b.dataset.lang); if (hasGsap) ScrollTrigger.refresh(); }));

  // ---------- objetivo del microscopio ----------
  const rail = $('#rail');
  let railKey = 'o.fibra';
  function setRail(key, mag, unit, anim) {
    railKey = key;
    if (mag) $('#railX').textContent = mag;
    if (unit) $('#railU').textContent = unit;
    $('#railN').textContent = t(key);
    if (anim && hasGsap && !reduced) gsap.fromTo(['#railX', '#railU', '#railN'], { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'expo.out', stagger: 0.05 });
  }

  // ---------- fibra ×400 ----------
  const canvas = $('#fiber');
  const lite = !fine || innerWidth < 760;
  const fiber = window.Fiber ? Fiber.create(canvas, { lite }) : null;
  if (!fiber) root.classList.add('no-gl');
  const hexs = (h) => (fiber ? fiber.hex(h) : [0, 0, 0]);
  const S = fiber ? fiber.S : null;

  function frames() {
    const asp = innerWidth / innerHeight;
    const portrait = asp < 0.9;
    // ty en fracción de media altura visible; view = anchura visible en unidades de la escena
    return portrait
      ? { hero: { tx: 0.2, ty: -0.58, rz: 0.48, ry: 0.22, view: 4.9 }, lab: { tx: 0, ty: 0.12, rz: 0.22, ry: 0.14, view: 5.2 } }
      : { hero: { tx: 0.9, ty: -0.42, rz: 0.15, ry: 0.32, view: 8.6 }, lab: { tx: 0, ty: 0.04, rz: 0.05, ry: 0.18, view: 9.4 } };
  }
  function place(f) {
    if (!S) return;
    const asp = innerWidth / innerHeight;
    S.tx = f.tx; S.rz = f.rz; S.ry = f.ry; S.view = f.view;
    S.ty = f.ty * (f.view / (2 * asp)); // media altura visible = view / (2·asp)
  }
  const pose = { k: 0 }; // 0 = portada, 1 = laboratorio
  function applyPose() {
    const fr = frames(), a = fr.hero, b = fr.lab, k = pose.k;
    const m = (x, y) => x + (y - x) * k;
    place({ tx: m(a.tx, b.tx), ty: m(a.ty, b.ty), rz: m(a.rz, b.rz), ry: m(a.ry, b.ry), view: m(a.view, b.view) * zoom.v });
  }
  const zoom = { v: 1 };

  if (fiber) {
    applyPose();
    addEventListener('resize', applyPose);
    if (fine) {
      addEventListener('pointermove', (e) => { S.mx = (e.clientX / innerWidth) * 2 - 1; S.my = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    } else if (hasGsap && !reduced) {
      gsap.to(S, { mx: 0.5, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }
    if (reduced) S.spin = 0.02;
    // solo se dibuja cuando se ve
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && !document.hidden) fiber.start(); else fiber.stop(); }));
    io.observe($('.micro'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) fiber.stop(); else if ($('.micro').getBoundingClientRect().bottom > 0) fiber.start(); });
  }

  // estados del pelo y tratamientos
  const HAIR = {
    seco: { dmg: 0.9, wave: 0.38, rad: 1, gloss: 0.2, col: '#5a3424' },
    rizado: { dmg: 0.55, wave: 0.8, rad: 1.04, gloss: 0.35, col: '#4a2a1d' },
    tenido: { dmg: 0.82, wave: 0.14, rad: 0.97, gloss: 0.18, col: '#82452f' },
    fino: { dmg: 0.45, wave: 0.1, rad: 0.7, gloss: 0.4, col: '#6b4a35' },
  };
  const REC = { seco: 'spa', rizado: 'spa', tenido: 'fibre', fino: 'spa' };
  const SW = { caoba: '#6e2a1c', chocolate: '#3b2219', cobre: '#a4502a', miel: '#c69a5e', azul: '#1d2230', verde: '#2f8a55' };
  const GLOW = { spa: '#cfe8ef', fibre: '#fff0dc', alisado: '#f6efe8' };
  function after(base, tr, sw) {
    const b = { ...base };
    if (tr === 'spa') Object.assign(b, { dmg: 0.1, rad: base.rad * 1.06, gloss: 0.78 });
    if (tr === 'fibre') Object.assign(b, { dmg: 0, gloss: 0.9 });
    if (tr === 'alisado') Object.assign(b, { dmg: 0.06, wave: 0, gloss: 1 });
    if (tr === 'color') Object.assign(b, { dmg: Math.min(base.dmg, 0.16), gloss: 0.82, col: SW[sw] });
    return b;
  }
  const lab = { hoy: null, tr: null, sw: 'caoba', applied: false, busy: false, before: null, after: null };

  const cut = (s) => (s.dmg > 0.6 ? 'abierta' : s.dmg > 0.25 ? 'entre' : 'sellada');
  const shine = (s) => { const g = s.gloss * (1 - s.dmg * 0.8); return g > 0.6 ? 'alto' : g > 0.3 ? 'medio' : 'bajo'; };
  const shape = (s) => (s.wave < 0.15 ? 'lisa' : s.wave < 0.6 ? 'ondulada' : 'rizada');
  function rd(fn, a, b) {
    const va = fn(a);
    if (!b) return t('v.' + va);
    const vb = fn(b);
    return va === vb ? t('v.' + va) : `${t('v.' + va)} → <b>${t('v.' + vb)}</b>`;
  }
  function labRender() {
    $$('#hoy button').forEach((b) => { const on = b.dataset.h === lab.hoy; b.setAttribute('aria-checked', String(on)); });
    $$('#trat button').forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.t === lab.tr));
      b.classList.toggle('is-rec', !!lab.hoy && REC[lab.hoy] === b.dataset.t);
    });
    $$('#sw button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.c === lab.sw)));
    $('#swRow').hidden = lab.tr !== 'color';
    const bf = lab.before, af = lab.applied ? lab.after : null;
    $('#rdCut').innerHTML = bf ? rd(cut, bf, af) : '·';
    $('#rdGloss').innerHTML = bf ? rd(shine, bf, af) : '·';
    $('#rdShape').innerHTML = bf ? rd(shape, bf, af) : '·';
    let msg = t('lab.idle');
    if (lab.hoy && !lab.tr) msg = `${t('rec')}: ${t('t.' + REC[lab.hoy])}.` + (lab.hoy === 'fino' ? ' ' + t('d.fino') : '');
    if (lab.tr) msg = t('d.' + lab.tr) + (lab.hoy === 'fino' && !lab.applied ? ' ' + t('d.fino') : '');
    $('#labMsg').textContent = msg;
    const apply = $('#apply');
    apply.disabled = !(lab.hoy && lab.tr) || lab.busy;
    apply.textContent = lab.applied ? t('again') : t('apply');
    const wa = $('#labWa');
    if (lab.applied) {
      const tn = t('t.' + lab.tr) + (lab.tr === 'color' ? ` (${t('sw.' + lab.sw)})` : '');
      wa.hidden = false;
      wa.textContent = fill(t('lab.cta'), { t: t('t.' + lab.tr) });
      wa.href = `https://wa.me/${WA}?text=${encodeURIComponent(fill(t('wa.lab'), { h: t('h.' + lab.hoy), t: tn }))}`;
    } else wa.hidden = true;
    $('#labTouch').classList.toggle('is-ready', !!(lab.hoy && lab.tr));
  }
  // anima el estado A (antes) hacia un preset
  function tweenState(target, preset, dur) {
    const col = hexs(preset.col);
    if (!hasGsap || reduced || !dur) { Object.assign(target, { dmg: preset.dmg, wave: preset.wave, rad: preset.rad, gloss: preset.gloss, col }); return; }
    gsap.to(target, { dmg: preset.dmg, wave: preset.wave, rad: preset.rad, gloss: preset.gloss, duration: dur, ease: 'power2.inOut' });
    const c = { r: target.col[0], g: target.col[1], b: target.col[2] };
    gsap.to(c, { r: col[0], g: col[1], b: col[2], duration: dur, ease: 'power2.inOut', onUpdate: () => { target.col = [c.r, c.g, c.b]; } });
  }
  function setB() {
    if (!S || !lab.before) return;
    lab.after = after(lab.before, lab.tr, lab.sw);
    S.B = { dmg: lab.after.dmg, wave: lab.after.wave, rad: lab.after.rad, gloss: lab.after.gloss, col: hexs(lab.after.col) };
  }
  function resetFront() {
    if (!S) return;
    if (hasGsap) gsap.killTweensOf(S, 'front,glowOn,bonds');
    S.front = -0.1; S.glowOn = 0; S.bonds = 0;
  }
  function chooseHoy(h) {
    if (lab.busy) return;
    lab.hoy = h; lab.applied = false;
    lab.before = { ...HAIR[h] };
    if (S) {
      resetFront();
      tweenState(S.A, HAIR[h], 0.9);
      if (lab.tr) setB(); else S.B = { ...S.A, col: S.A.col.slice() };
    }
    if (!lab.tr) lab.after = null; else lab.after = after(lab.before, lab.tr, lab.sw);
    labRender();
  }
  function chooseTr(tr) {
    if (lab.busy) return;
    if (!lab.hoy) chooseHoy(Object.keys(REC).find((k) => REC[k] === tr) || 'seco');
    if (lab.applied && S) { resetFront(); }
    lab.tr = tr; lab.applied = false;
    setB();
    labRender();
  }
  function finish() {
    lab.applied = true; lab.busy = false;
    if (S && hasGsap) gsap.to(S, { glowOn: 0, duration: 0.6 });
    if (S && hasGsap) gsap.to(S, { bonds: 0, duration: 3.5, delay: 0.8, ease: 'power1.in' });
    labRender();
  }
  function runApply() {
    if (!(lab.hoy && lab.tr) || lab.busy) return;
    if (!S) { finish(); return; }
    lab.busy = true; labRender();
    const go = () => {
      S.glow = hexs(GLOW[lab.tr] || lab.after.col);
      if (lab.tr === 'color') { const c = hexs(SW[lab.sw]); S.glow = c.map((v) => Math.min(1, v * 0.5 + 0.55)); }
      if (reduced || !hasGsap) { S.front = 1.1; S.bonds = 0; finish(); return; }
      // el barrido recorre solo el tramo que se ve; el resto de la fibra se completa fuera de pantalla
      const [lo, hi] = fiber.visRange();
      const from = Math.max(lo - 0.02, Math.min(S.front, hi));
      const tl = gsap.timeline({ onComplete: () => { S.front = 1.1; finish(); } });
      tl.to(S, { glowOn: 1, duration: 0.25 })
        .to(S, { bonds: lab.tr === 'fibre' ? 1 : 0, duration: 0.4 }, 0)
        .fromTo(S, { front: from }, { front: hi + 0.02, duration: 2.4 * Math.max(0.25, (hi + 0.02 - from) / (hi - lo + 0.04)), ease: 'power1.inOut' }, 0.05);
    };
    if (lab.applied && hasGsap && !reduced) {
      // otra vez: la fibra vuelve a su estado de antes y se repite
      const [lo, hi] = fiber.visRange();
      S.front = hi + 0.02;
      gsap.to(S, { front: lo - 0.02, glowOn: 0, bonds: 0, duration: 0.8, ease: 'power2.inOut', onComplete: () => { S.front = -0.05; lab.applied = false; go(); } });
    } else { if (lab.applied) S.front = -0.05; lab.applied = false; go(); }
  }
  $$('#hoy button').forEach((b) => b.addEventListener('click', () => chooseHoy(b.dataset.h)));
  $$('#trat button').forEach((b) => b.addEventListener('click', () => chooseTr(b.dataset.t)));
  $$('#sw button').forEach((b) => b.addEventListener('click', () => { if (lab.busy) return; lab.sw = b.dataset.c; if (lab.applied) resetFront(); lab.applied = false; setB(); labRender(); }));
  $('#apply').addEventListener('click', runApply);
  // teclado: flechas dentro de cada grupo de opciones
  $$('[role="radiogroup"]').forEach((g) => g.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const bs = $$('button', g), i = bs.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const n = bs[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length];
    n.focus(); n.click();
  }));

  // pasar el dedo por la fibra aplica el tratamiento
  const touch = $('#labTouch');
  if (fiber) {
    let drag = false;
    const sAt = (e) => { const r = canvas.getBoundingClientRect(); return fiber.sAt(e.clientX - r.left, e.clientY - r.top); };
    touch.addEventListener('pointerdown', (e) => {
      if (!(lab.hoy && lab.tr) || lab.busy) return;
      if (lab.applied) { resetFront(); lab.applied = false; labRender(); }
      drag = true; try { touch.setPointerCapture(e.pointerId); } catch (err) { /* puntero sintético */ }
      S.glow = hexs(GLOW[lab.tr] || '#ffffff');
      if (lab.tr === 'color') { const c = hexs(SW[lab.sw]); S.glow = c.map((v) => Math.min(1, v * 0.5 + 0.55)); }
      if (hasGsap) gsap.to(S, { glowOn: 1, bonds: lab.tr === 'fibre' ? 1 : 0, duration: 0.25 });
      const p = sAt(e); if (p) S.front = Math.max(S.front, p.s);
    });
    touch.addEventListener('pointermove', (e) => { if (!drag) return; const p = sAt(e); if (p) S.front = Math.max(S.front, p.s); });
    const end = () => {
      if (!drag) return; drag = false;
      const [lo, hi] = fiber.visRange();
      if (S.front > lo + (hi - lo) * 0.82) {
        lab.busy = true;
        const fin = () => { S.front = 1.1; finish(); };
        if (hasGsap) gsap.to(S, { front: hi + 0.02, duration: 0.5, ease: 'power2.out', onComplete: fin }); else fin();
      }
      else if (hasGsap) gsap.to(S, { glowOn: 0, duration: 0.5 });
    };
    touch.addEventListener('pointerup', end);
    touch.addEventListener('pointercancel', end);
  }

  // ---------- la raíz ×40 ----------
  const ticks = $('#ticks');
  if (ticks) {
    let s = '';
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2, l = i % 6 === 0 ? 7 : 3.5;
      const x1 = 100 + Math.cos(a) * 99, y1 = 100 + Math.sin(a) * 99, x2 = 100 + Math.cos(a) * (99 - l), y2 = 100 + Math.sin(a) * (99 - l);
      s += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
    }
    ticks.innerHTML = s;
  }
  const scalp = window.Scalp ? Scalp.create($('#scalp')) : null;
  const sc = { t: 0 };
  const steps = $$('.step');
  function stepTo(i) {
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    $('#ocState').dataset.i18n = 'raiz.l' + (i + 1);
    $('#ocState').textContent = t('raiz.l' + (i + 1));
    if (!scalp) return;
    if (!hasGsap || reduced) { sc.t = i; scalp.draw(i); return; }
    gsap.to(sc, { t: i, duration: 1.3, ease: 'power2.inOut', overwrite: true, onUpdate: () => scalp.draw(sc.t) });
  }
  steps[0].classList.add('is-on');

  // ---------- cita por WhatsApp ----------
  const SERV = ['s.diag', 's.spa', 's.caida', 's.fibre', 's.rizos', 's.absolut', 's.japo', 's.organico', 's.express', 's.mechas', 's.corte', 's.recogidos', 's.ext', 's.peinado', 's.radio', 's.dermapen', 's.depi', 's.mani'];
  const dlg = $('#cita');
  let citaDay = '';
  function buildCita() {
    const sel = $('#citaServ'), prev = sel.value;
    sel.innerHTML = `<option value="cita.unsure">${t('cita.unsure')}</option>` + SERV.map((k) => `<option value="${k}">${t(k)}</option>`).join('');
    if (prev) sel.value = prev;
    const days = t('days');
    $('#citaDays').innerHTML = [1, 2, 3, 4, 5].map((i) => `<label><input type="radio" name="day" value="${i}"${String(i) === citaDay ? ' checked' : ''}><span>${days[i]}</span></label>`).join('');
    $$('#citaDays input').forEach((r) => r.addEventListener('change', () => { citaDay = r.value; }));
  }
  function openCita(serv) {
    if (serv) $('#citaServ').value = serv;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else window.open(`https://wa.me/${WA}`, '_blank', 'noopener');
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cita]');
    if (b) { e.preventDefault(); openCita(b.dataset.serv); }
  });
  $$('.slide').forEach((s) => {
    s.tabIndex = 0; s.setAttribute('role', 'button');
    s.addEventListener('click', () => openCita(s.dataset.serv));
    s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCita(s.dataset.serv); } });
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  $('#citaSend').addEventListener('click', () => {
    const name = $('#citaName').value.trim();
    const serv = t($('#citaServ').value);
    const day = citaDay ? fill(t('wa.d'), { x: t('days')[+citaDay] }) : '';
    const w = ($('#citaWhen input:checked') || {}).value;
    const when = w ? fill(t('wa.w'), { x: t(w).toLowerCase() }) : '';
    const msg = fill(t(name ? 'wa.cita' : 'wa.cita0'), { n: name, s: serv, d: day, w: when });
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    dlg.close();
  });

  // ---------- primera pintura ----------
  applyLang(lang);
  setInterval(renderStatus, 60000);

  if (!hasGsap) { document.body.classList.remove('is-loading'); $('#loader') && $('#loader').remove(); return; }

  // ---------- intro: de ×1 a ×400 y el tratamiento que recorre la fibra ----------
  function heroIn(delay) {
    gsap.from('#hero-h .wi', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.05, delay, clearProps: 'transform' });
    gsap.from($$('.hero-sub, .hero-ctas > *, .hero-meta > li, .hero-cap'), { y: 18, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, delay: delay + 0.35, clearProps: 'opacity,transform' });
  }
  const introState = () => {
    if (!S) return;
    const a = { dmg: 0.85, wave: 0.28, rad: 1, gloss: 0.22, col: '#5d3324' };
    S.A = { ...a, col: hexs(a.col) };
    S.B = { dmg: 0.03, wave: 0.28, rad: 1, gloss: 0.95, col: hexs('#62301f') };
    S.front = -0.1; S.glow = hexs('#fff1e2');
  };
  const loader = $('#loader');
  const done = () => { document.body.classList.remove('is-loading'); rail.classList.add('is-on'); if (loader) loader.remove(); ScrollTrigger.refresh(); };
  if (reduced) {
    if (S) { introState(); S.A = { ...S.B, col: S.B.col.slice() }; }
    done();
  } else {
    introState();
    const cnt = { v: 1 };
    const tl = gsap.timeline({ onComplete: done });
    tl.to(cnt, { v: 400, duration: 1.7, ease: 'expo.in', onUpdate: () => { $('#ldx').textContent = '×' + Math.round(cnt.v); } })
      .fromTo('.loader-line i', { scaleY: 1, filter: 'blur(0px)' }, { scaleY: 26, filter: 'blur(5px)', duration: 1.7, ease: 'expo.in' }, 0)
      .add(() => { if (S) { zoom.v = 3.4; applyPose(); } }, 0)
      .to(loader, { opacity: 0, duration: 0.7, ease: 'power2.out' }, 1.55)
      .fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 1.5)
      .to(zoom, { v: 1, duration: 1.6, ease: 'expo.out', onUpdate: applyPose }, 1.5)
      .add(() => heroIn(0), 2.0);
    if (S) {
      tl.add(() => {
        const [lo, hi] = fiber.visRange();
        gsap.to(S, { glowOn: 1, duration: 0.3 });
        gsap.fromTo(S, { front: lo - 0.03 }, {
          front: hi + 0.03, duration: 2.1, ease: 'power1.inOut',
          onComplete: () => { S.front = 1.1; gsap.to(S, { glowOn: 0, duration: 0.5, onComplete: () => fiber.commit() }); },
        });
      }, 2.7);
    }
    // saltar la intro con un toque o una tecla
    const skip = () => { if (tl.progress() < 1) tl.progress(1); removeEventListener('keydown', skip); };
    addEventListener('keydown', skip);
    loader && loader.addEventListener('pointerdown', skip);
    setTimeout(() => { if (document.body.classList.contains('is-loading')) tl.progress(1); }, 7000);
  }

  // ---------- scroll ----------
  if (S) {
    ScrollTrigger.create({ trigger: '.lab', start: 'top bottom', end: 'top top', scrub: 0.6, onUpdate: (self) => { pose.k = self.progress; applyPose(); } });
  }
  // barra clara u oscura según la sección
  ['.raiz', '.trat', '.res', '.salon'].forEach((sel) => ScrollTrigger.create({ trigger: sel, start: 'top 64px', end: 'bottom 64px', onToggle: (s) => { if (s.isActive) $('#bar').classList.add('is-light'); } }));
  ['.micro', '.manos', '.foot'].forEach((sel) => ScrollTrigger.create({ trigger: sel, start: 'top 64px', end: 'bottom 64px', onToggle: (s) => { if (s.isActive) $('#bar').classList.remove('is-light'); } }));
  // objetivo
  $$('[data-mag]').forEach((sec) => ScrollTrigger.create({
    trigger: sec, start: 'top 55%', end: 'bottom 55%',
    onToggle: (s) => { if (s.isActive && railKey !== sec.dataset.o) setRail(sec.dataset.o, sec.dataset.mag, sec.dataset.unit, true); },
  }));
  // raíz: un paso por pantalla
  steps.forEach((st, i) => ScrollTrigger.create({ trigger: st, start: 'top 62%', end: 'bottom 38%', onToggle: (s) => { if (s.isActive) stepTo(i); } }));

  if (!reduced) {
    // titulares
    $$('.raiz .h2, .trat .h2, .res .h2, .manos .h2, .salon .h2').forEach((h) => gsap.from(h, { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play none none none' } }));
    $$('.lead').forEach((p) => gsap.from(p, { y: 20, opacity: 0, duration: 1, ease: 'expo.out', delay: 0.1, clearProps: 'opacity,transform', scrollTrigger: { trigger: p, start: 'top 90%', toggleActions: 'play none none none' } }));
    // portaobjetos que salen de su caja
    $$('.box').forEach((box) => gsap.from($$('.slide', box), { x: -36, rotate: -1.2, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, clearProps: 'opacity,transform', scrollTrigger: { trigger: box, start: 'top 82%', toggleActions: 'play none none none' } }));
    // enfoque: las fotos pasan de desenfocadas a nítidas al subir
    $$('.fig-m img').forEach((img) => gsap.fromTo(img, { filter: 'blur(16px)', scale: 1.14 }, { filter: 'blur(0px)', scale: 1, ease: 'none', scrollTrigger: { trigger: img.closest('.fig'), start: 'top 96%', end: 'top 42%', scrub: 0.4 } }));
    gsap.from('.who', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, clearProps: 'opacity,transform', scrollTrigger: { trigger: '.team', start: 'top 84%', toggleActions: 'play none none none' } });
    gsap.from('.quotes li', { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, clearProps: 'opacity,transform', scrollTrigger: { trigger: '.quotes', start: 'top 86%', toggleActions: 'play none none none' } });
    gsap.from('.revs-big', { scale: 0.86, opacity: 0, duration: 1.2, ease: 'expo.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: '.revs', start: 'top 84%', toggleActions: 'play none none none' } });
    // el salón: el círculo del ocular se abre
    gsap.fromTo('.salon-in', { clipPath: 'circle(8% at 50% 50%)' }, { clipPath: 'circle(50% at 50% 50%)', ease: 'none', scrollTrigger: { trigger: '.salon', start: 'top 85%', end: 'top 30%', scrub: 0.5 } });
    gsap.from('.salon-out', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: '.salon-photos', start: 'top 70%', toggleActions: 'play none none none' } });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
