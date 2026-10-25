/* سرمشق — اپلیکیشن ایستا (بدون نیاز به build). محتوا از content/content.js خوانده می‌شود. */
(function () {
  'use strict';

  /* ---------- ابزارها ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const fa = n => String(n).replace(/\d/g, d => FA[d]);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = s => String(s).toLowerCase()
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه').replace(/[أإآ]/g, 'ا')
    .replace(/[ً-ْٰـ‌‍‎‏]/g, '')
    .replace(/[۰-۹]/g, d => FA.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
  const faDate = ts => { try { return new Date(ts).toLocaleDateString('fa-IR', { dateStyle: 'medium' }); } catch (e) { return ''; } };

  /* ---------- ذخیره‌سازی (فقط روی دستگاه کاربر) ---------- */
  const KEY = 'sarmashgh.v1';
  const state = { done: {}, star: {}, sims: [], theme: null };
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* نادیده */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* نادیده */ } };

  /* ---------- خواندن محتوا ---------- */
  function parseContent(txt) {
    const groups = [];
    let g = null, c = null, q = null;
    const used = new Set();
    for (const raw of String(txt).split('\n')) {
      const line = raw.replace(/\s+$/, '');
      if (line.startsWith('# ')) {
        const [t, id] = line.slice(2).split('|').map(s => s.trim());
        const m = t.match(/^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*(.*)$/u);
        g = { id: id || 'g' + groups.length, icon: m ? m[1] : '📚', title: m ? m[2] : t, desc: '', cats: [] };
        groups.push(g); c = q = null; continue;
      }
      if (line.startsWith('## ') && g) { c = { id: g.id + '-' + hash(line), title: line.slice(3).trim(), desc: '', qs: [], g }; g.cats.push(c); q = null; continue; }
      if (line.startsWith('> ')) { if (c && !c.qs.length) c.desc = line.slice(2).trim(); else if (g && !c) g.desc = line.slice(2).trim(); continue; }
      if (line.startsWith('### ') && c) {
        let id = hash(norm(line.slice(4))); while (used.has(id)) id += 'x'; used.add(id);
        q = { id, q: line.slice(4).trim(), raw: [], c, g, i: c.qs.length }; c.qs.push(q); continue;
      }
      if (q) q.raw.push(line);
    }
    for (const gr of groups) for (const ca of gr.cats) for (const qq of ca.qs) {
      qq.a = qq.raw.join('\n').trim(); delete qq.raw;
      qq.blocks = parseAnswer(qq.a);
      qq.hay = norm(qq.q + ' ' + qq.a);
    }
    return groups;
  }
  function parseAnswer(a) {
    const out = []; let para = [], list = null;
    const flushP = () => { if (para.length) { out.push({ t: 'p', x: para.join(' ') }); para = []; } };
    const flushL = () => { if (list) { out.push(list); list = null; } };
    for (const l0 of a.split('\n')) {
      const l = l0.trim();
      if (!l) { flushP(); flushL(); continue; }
      if (l.startsWith('💡')) { flushP(); flushL(); out.push({ t: 'tip', x: l.replace(/^💡\s*/, '') }); continue; }
      let m;
      if ((m = l.match(/^[-*]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
      if ((m = l.match(/^\d+\.\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
      flushL(); para.push(l);
    }
    flushP(); flushL();
    return out;
  }
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[[^\]\n]{1,60}\]|\.{3}/g, m => '<span class="fill">' + m + '</span>');
  function ansHTML(blocks) {
    return blocks.map(b => b.t === 'p' ? '<p>' + inline(b.x) + '</p>'
      : b.t === 'tip' ? '<div class="tip">💡 ' + inline(b.x) + '</div>'
      : '<' + b.t + '>' + b.items.map(i => '<li>' + inline(i) + '</li>').join('') + '</' + b.t + '>').join('');
  }

  let GROUPS = [];
  try { GROUPS = parseContent(window.SARMASHGH_CONTENT || ''); } catch (e) { console.error(e); }
  const ALLQ = GROUPS.flatMap(g => g.cats.flatMap(c => c.qs));
  const QBYID = Object.fromEntries(ALLQ.map(q => [q.id, q]));
  const gById = id => GROUPS.find(g => g.id === id);
  const gStats = g => { const qs = g.cats.flatMap(c => c.qs); const d = qs.filter(q => state.done[q.id]).length; return { n: qs.length, d, p: qs.length ? Math.round(d / qs.length * 100) : 0 }; };
  const totalDone = () => ALLQ.filter(q => state.done[q.id]).length;

  /* ---------- پیام کوتاه ---------- */
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

  /* ---------- تم ---------- */
  function applyTheme() {
    const t = state.theme || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
  }
  applyTheme();
  $('#themeBtn').addEventListener('click', () => {
    state.theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; save(); applyTheme();
  });

  /* ---------- مسیریابی ---------- */
  const main = $('#main');
  let cleanup = null;
  const TITLES = { home: 'سرمشق | آمادگی مصاحبه دانشگاه فرهنگیان', prep: 'آمادگی مصاحبه | سرمشق', sim: 'شبیه‌ساز مصاحبه | سرمشق', about: 'درباره سرمشق' };
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const params = new URLSearchParams(qs || '');
    return { route: parts[0] || 'home', arg: parts[1] || '', q: params.get('q') || '' };
  }
  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    const r = parseHash();
    const fn = { home: renderHome, prep: renderPrep, sim: renderSim, about: renderAbout }[r.route] || renderHome;
    document.title = TITLES[r.route] || TITLES.home;
    $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === (TITLES[r.route] ? r.route : 'home')));
    fn(r);
    if (!r.q) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------- صفحه اصلی ---------- */
  function renderHome() {
    const nQ = ALLQ.length, nC = GROUPS.reduce((s, g) => s + g.cats.length, 0), d = totalDone();
    const pct = nQ ? Math.round(d / nQ * 100) : 0;
    const last = state.sims[state.sims.length - 1];
    main.innerHTML = `
    <section class="hero">
      <div>
        <h1>مسیر روشن تا <em>مصاحبه فرهنگیان</em></h1>
        <p class="lead">سرمشق؛ گروهی از دانشجویان دانشگاه فرهنگیان اصفهان که در راهنمایی، آموزش و مشاوره کنکور فرهنگیان و فرایند مصاحبه کنارتان هستند. به‌جای فایل‌های PDF خسته‌کننده، همه‌چیز اینجا تعاملی و روی گوشی‌تان در دسترس است.</p>
        <div class="hero__cta">
          <a class="btn btn--amber btn--lg" href="#/prep">شروع آمادگی مصاحبه</a>
          <a class="btn btn--ghost btn--lg" href="#/sim">آزمون تصادفی مصاحبه</a>
        </div>
      </div>
      <div class="hero__art"><img src="assets/logo.jpg" alt="نشان سرمشق: مشعل و قلم بر کتاب باز" width="380" height="380"></div>
    </section>
    <div class="stats">
      <div class="stat"><b>${fa(nQ)}</b><span>پرسش‌وپاسخ مصاحبه</span></div>
      <div class="stat"><b>${fa(GROUPS.length)}</b><span>مسیر اصلی</span></div>
      <div class="stat"><b>${fa(nC)}</b><span>دسته‌بندی موضوعی</span></div>
      <div class="stat"><b>PDF</b><span>دانلود جزوه با یک کلیک</span></div>
    </div>

    <section class="section">
      <div class="section__h"><h2>از کجا شروع کنیم؟</h2><a href="#/prep">همه‌ی بخش‌ها ←</a></div>
      <div class="grid grid--2">
        ${GROUPS.map(g => { const s = gStats(g); return `
        <a class="card path" href="#/prep/${esc(g.id)}">
          <span class="ico">${esc(g.icon)}</span>
          <h3>${esc(g.title)}</h3>
          <p>${esc(g.desc)}</p>
          <div class="meta"><span class="chip">${fa(s.n)} سؤال · ${fa(g.cats.length)} دسته</span><span class="muted small">${fa(s.d)} تمرین‌شده</span></div>
          <div class="bar"><i style="width:${s.p}%"></i></div>
        </a>`; }).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section__h"><h2>چه امکاناتی دارد؟</h2></div>
      <div class="grid grid--3">
        <div class="card feature"><span class="ico">🔎</span><h3>جستجوی سریع</h3><p>در همه‌ی سؤال‌ها و پاسخ‌ها جستجو کنید؛ حتی با تایپ ساده و بدون نیم‌فاصله.</p></div>
        <div class="card feature"><span class="ico">✅</span><h3>علامت‌گذاری و پیشرفت</h3><p>سؤال‌هایی که تمرین کرده‌اید را تیک بزنید و پیشرفتتان را ببینید. سؤال‌های سخت را نشان‌دار کنید.</p></div>
        <div class="card feature"><span class="ico">🎲</span><h3>شبیه‌ساز مصاحبه</h3><p>سؤال تصادفی بگیرید، با زمان‌سنج پاسخ دهید و میزان آمادگی‌تان را بسنجید.</p></div>
        <div class="card feature"><span class="ico">📄</span><h3>جزوه‌ی PDF تمیز</h3><p>کل مطالب یا بخش‌های انتخابی را به‌صورت جزوه‌ی مرتب چاپ یا ذخیره کنید.</p></div>
      </div>
    </section>

    <section class="section">
      <div class="card mypanel">
        <div class="ring" style="--p:${pct}"><span>${fa(pct)}٪</span></div>
        <div>
          <h2 style="margin:0 0 4px;font-size:1.2rem">پیشرفت شما</h2>
          <p class="muted" style="margin:0">${d ? `${fa(d)} از ${fa(nQ)} سؤال را تمرین کرده‌اید.` : 'هنوز سؤالی را علامت نزده‌اید؛ از بخش آمادگی مصاحبه شروع کنید.'}
          ${last ? `<br>آخرین آزمون: <b>${fa(last.pct)}٪</b> (${faDate(last.t)})` : ''}</p>
          <p class="muted small" style="margin:6px 0 0">پیشرفت فقط روی همین دستگاه ذخیره می‌شود.</p>
        </div>
        <a class="btn" href="#/sim">یک آزمون بده</a>
      </div>
    </section>`;
  }

  /* ---------- آمادگی مصاحبه ---------- */
  const view = { gid: null, filter: 'all', query: '', limit: 60 };
  function qHTML(q, opts = {}) {
    const done = !!state.done[q.id], star = !!state.star[q.id];
    return `<div class="q${done ? ' is-done' : ''}${opts.open ? ' open' : ''}" data-id="${q.id}">
      <button class="q__h" type="button" aria-expanded="${!!opts.open}">
        <span class="q__no">${fa(q.i + 1)}</span>
        <span class="q__t">${esc(q.q)}${opts.crumb ? `<span class="q__crumb">${esc(q.g.title)} › ${esc(q.c.title)}</span>` : ''}</span>
        <span class="q__chev" aria-hidden="true">▾</span>
      </button>
      <div class="q__b">
        <div class="ans" data-lazy="1"></div>
        <div class="q__act">
          <button class="tg tg--done" type="button" data-act="done" aria-pressed="${done}">✓ تمرین کردم</button>
          <button class="tg tg--star" type="button" data-act="star" aria-pressed="${star}">${star ? '★' : '☆'} نشان‌دار</button>
        </div>
      </div>
    </div>`;
  }
  function fillAns(qel) {
    const a = $('.ans', qel);
    if (a && a.dataset.lazy) { a.innerHTML = ansHTML(QBYID[qel.dataset.id].blocks); delete a.dataset.lazy; }
  }
  function passes(q) {
    if (view.filter === 'todo' && state.done[q.id]) return false;
    if (view.filter === 'star' && !state.star[q.id]) return false;
    return true;
  }
  function renderList() {
    const box = $('#plist'); if (!box) return;
    const tokens = norm(view.query).split(/\s+/).filter(Boolean);
    if (tokens.length) {
      const res = ALLQ.filter(q => tokens.every(t => q.hay.includes(t)) && passes(q));
      if (!res.length) { box.innerHTML = '<div class="empty">نتیجه‌ای پیدا نشد. عبارت دیگری را امتحان کنید.</div>'; return; }
      const shown = res.slice(0, view.limit);
      box.innerHTML = `<p class="muted small">${fa(res.length)} نتیجه</p>` + shown.map(q => qHTML(q, { crumb: true })).join('') +
        (res.length > shown.length ? `<div class="more"><button class="btn btn--ghost" data-act="more" type="button">نمایش بیشتر</button></div>` : '');
      return;
    }
    const g = gById(view.gid) || GROUPS[0];
    let any = false;
    const html = g.cats.map((c, ci) => {
      const qs = c.qs.filter(passes); if (!qs.length) return '';
      any = true;
      const d = c.qs.filter(q => state.done[q.id]).length;
      return `<details class="cat" data-cid="${c.id}"${ci === 0 && view.filter === 'all' ? ' open' : ''}>
        <summary><span class="cat__t">${esc(c.title)}</span><span class="cat__n">${fa(d)} از ${fa(c.qs.length)}</span></summary>
        <div class="cat__body">
          ${c.desc ? `<div class="cat__desc">${esc(c.desc)}</div>` : ''}
          <div class="cat__tools"><button class="tg" data-act="expand" type="button">باز کردن همه</button><button class="tg" data-act="collapse" type="button">بستن همه</button></div>
          ${qs.map(q => qHTML(q)).join('')}
        </div></details>`;
    }).join('');
    box.innerHTML = any ? html : `<div class="empty">${view.filter === 'star' ? 'هنوز سؤالی را نشان‌دار نکرده‌اید.' : 'همه‌ی سؤال‌های این بخش را تمرین کرده‌اید 🎉'}</div>`;
  }
  function renderTabs() {
    const box = $('#ptabs'); if (!box) return;
    box.innerHTML = GROUPS.map(g => { const s = gStats(g); return `<button class="tab" role="tab" data-gid="${esc(g.id)}" aria-selected="${g.id === view.gid}">
      <b>${esc(g.icon)} ${esc(g.title)}</b><small>${fa(s.d)} از ${fa(s.n)} سؤال</small><div class="bar"><i style="width:${s.p}%"></i></div></button>`; }).join('');
    const g = gById(view.gid); $('#gdesc').textContent = g ? g.desc : '';
  }
  function renderPrep(r) {
    if (r.arg && gById(r.arg)) view.gid = r.arg;
    if (!view.gid) view.gid = GROUPS[0] && GROUPS[0].id;
    view.limit = 60;
    main.innerHTML = `
    <div class="prep__head">
      <h1>آمادگی مصاحبه</h1>
      <div class="toolbar">
        <label class="search"><input id="psearch" type="search" placeholder="جستجو در همه‌ی سؤال‌ها و پاسخ‌ها…" value="${esc(view.query)}" autocomplete="off"></label>
        <div class="seg" role="group" aria-label="فیلتر">
          <button type="button" data-filter="all" aria-pressed="${view.filter === 'all'}">همه</button>
          <button type="button" data-filter="todo" aria-pressed="${view.filter === 'todo'}">تمرین‌نشده</button>
          <button type="button" data-filter="star" aria-pressed="${view.filter === 'star'}">نشان‌دار</button>
        </div>
      </div>
    </div>
    <div class="tabs" id="ptabs" role="tablist"></div>
    <p class="gdesc" id="gdesc"></p>
    <div id="plist"></div>`;
    renderTabs(); renderList();
    $('#psearch').addEventListener('input', debounce(e => { view.query = e.target.value; view.limit = 60; renderList(); }, 150));
    if (r.q) openQuestion(r.q);
  }
  function openQuestion(id) {
    const q = QBYID[id]; if (!q) return;
    view.gid = q.g.id; view.query = ''; view.filter = 'all';
    const si = $('#psearch'); if (si) si.value = '';
    $$('.seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === 'all'));
    renderTabs(); renderList();
    const det = $(`details[data-cid="${q.c.id}"]`); if (det) det.open = true;
    const el = $(`.q[data-id="${id}"]`);
    if (el) { el.classList.add('open'); $('.q__h', el).setAttribute('aria-expanded', 'true'); fillAns(el); setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }
  }
  function refreshQ(el) {
    const id = el.dataset.id, done = !!state.done[id], star = !!state.star[id];
    el.classList.toggle('is-done', done);
    const bd = $('[data-act="done"]', el), bs = $('[data-act="star"]', el);
    bd.setAttribute('aria-pressed', done); bs.setAttribute('aria-pressed', star); bs.textContent = (star ? '★' : '☆') + ' نشان‌دار';
    const det = el.closest('details.cat');
    if (det) { const c = ALLQ.find(q => q.id === id).c; $('.cat__n', det).textContent = fa(c.qs.filter(q => state.done[q.id]).length) + ' از ' + fa(c.qs.length); }
    renderTabs();
  }

  /* ---------- شبیه‌ساز ---------- */
  const sim = { phase: 'setup', groups: null, n: 10, timer: true, onlyNew: false, list: [], i: 0, revealed: false, rates: [], secs: 0, tick: null };
  const SECS = 60;
  function stopTick() { if (sim.tick) { clearInterval(sim.tick); sim.tick = null; } }
  function renderSim() {
    cleanup = stopTick;
    if (!sim.groups) sim.groups = GROUPS.filter((g, i) => i < 2).map(g => g.id);
    if (sim.phase === 'setup') return simSetup();
    if (sim.phase === 'run') return simRun();
    return simResult();
  }
  function simSetup() {
    const pool = poolQs();
    main.innerHTML = `<div class="sim">
      <h1>شبیه‌ساز مصاحبه</h1>
      <p class="muted">سؤال تصادفی می‌گیرید، <b>بلند و واقعی</b> جواب می‌دهید و بعد پاسخ نمونه را می‌بینید. در پایان، خودتان نمره می‌دهید و میزان آمادگی‌تان را می‌سنجید.</p>
      <div class="card">
        <h3>از کدام بخش‌ها؟</h3>
        <div class="opt-row">${GROUPS.map(g => `<label class="pill"><input type="checkbox" name="sg" value="${esc(g.id)}"${sim.groups.includes(g.id) ? ' checked' : ''}> ${esc(g.icon)} ${esc(g.title)}</label>`).join('')}</div>
        <h3>چند سؤال؟</h3>
        <div class="opt-row">${[5, 10, 15, 20].map(n => `<label class="pill"><input type="radio" name="sn" value="${n}"${sim.n === n ? ' checked' : ''}> ${fa(n)} سؤال</label>`).join('')}</div>
        <div class="opt-row">
          <label class="pill"><input type="checkbox" id="stimer"${sim.timer ? ' checked' : ''}> ⏱ زمان‌سنج ${fa(SECS)} ثانیه‌ای</label>
          <label class="pill"><input type="checkbox" id="snew"${sim.onlyNew ? ' checked' : ''}> فقط سؤال‌های تمرین‌نشده</label>
        </div>
        <button class="btn btn--amber btn--lg" id="sstart" type="button"${pool.length ? '' : ' disabled'}>شروع آزمون</button>
        <span class="muted small" id="spool"> ${fa(pool.length)} سؤال در دسترس است</span>
      </div>
      ${state.sims.length ? `<div class="card" style="margin-top:16px"><h3>آزمون‌های اخیر</h3><ul class="hist">${state.sims.slice(-5).reverse().map(s => `<li><span>${faDate(s.t)} · ${fa(s.n)} سؤال</span><b>${fa(s.pct)}٪</b></li>`).join('')}</ul></div>` : ''}
    </div>`;
    const sync = () => {
      sim.groups = $$('input[name="sg"]:checked').map(i => i.value);
      sim.n = +($('input[name="sn"]:checked') || { value: 10 }).value;
      sim.timer = $('#stimer').checked; sim.onlyNew = $('#snew').checked;
      const p = poolQs(); $('#spool').textContent = ' ' + fa(p.length) + ' سؤال در دسترس است'; $('#sstart').disabled = !p.length;
    };
    $$('.sim input').forEach(i => i.addEventListener('change', sync));
    $('#sstart').addEventListener('click', () => { sync(); const p = poolQs(); if (!p.length) return;
      sim.list = shuffle(p).slice(0, sim.n); sim.i = 0; sim.rates = []; sim.revealed = false; sim.phase = 'run'; renderSim(); });
  }
  const poolQs = () => ALLQ.filter(q => sim.groups.includes(q.g.id) && (!sim.onlyNew || !state.done[q.id]));
  function startTimer() {
    stopTick(); sim.secs = SECS;
    if (!sim.timer) return;
    sim.tick = setInterval(() => {
      sim.secs = Math.max(0, sim.secs - 1);
      const t = $('#stimerv'); if (t) { t.textContent = fa(sim.secs) + ' ثانیه'; t.classList.toggle('low', sim.secs <= 10); }
      if (!sim.secs) stopTick();
    }, 1000);
  }
  function simRun() {
    const q = sim.list[sim.i], n = sim.list.length;
    main.innerHTML = `<div class="sim"><div class="card">
      <div class="sim__meta"><span>سؤال ${fa(sim.i + 1)} از ${fa(n)} · <span class="chip">${esc(q.c.title)}</span></span>${sim.timer ? `<span class="timer" id="stimerv">${fa(SECS)} ثانیه</span>` : ''}</div>
      <div class="bar" style="margin-top:8px"><i style="width:${Math.round(sim.i / n * 100)}%"></i></div>
      <div class="sim__q">${esc(q.q)}</div>
      <div id="sbody">${sim.revealed ? revealHTML(q) : `
        <textarea id="sdraft" placeholder="می‌توانید پیش‌نویس کوتاه بنویسید (ذخیره نمی‌شود) یا فقط بلند جواب بدهید…" aria-label="پیش‌نویس پاسخ"></textarea>
        <div class="opt-row" style="margin-top:12px"><button class="btn btn--amber" id="sreveal" type="button">نمایش پاسخ نمونه</button><button class="btn btn--ghost" id="sskip" type="button">رد کردن</button></div>`}
      </div></div>
      <p style="text-align:center"><button class="btn btn--ghost btn--sm" id="squit" type="button">پایان آزمون</button></p></div>`;
    if (!sim.revealed) startTimer(); else stopTick();
    const rv = $('#sreveal'); if (rv) rv.addEventListener('click', () => { sim.revealed = true; simRun(); });
    const sk = $('#sskip'); if (sk) sk.addEventListener('click', () => rate(0));
    $$('.rate button').forEach(b => b.addEventListener('click', () => rate(+b.dataset.r)));
    $('#squit').addEventListener('click', () => { if (confirm('آزمون همین‌جا تمام شود؟')) finishSim(); });
  }
  const revealHTML = q => `<div class="ans">${ansHTML(q.blocks)}</div>
    <p class="muted small" style="margin-top:10px">پاسخ خودتان چقدر به این نزدیک بود؟</p>
    <div class="rate"><button class="r2" data-r="2" type="button">😎 مسلط بودم</button><button class="r1" data-r="1" type="button">🤔 نیاز به مرور</button><button class="r0" data-r="0" type="button">😅 بلد نبودم</button></div>`;
  function rate(v) {
    sim.rates[sim.i] = v; sim.i++; sim.revealed = false;
    if (sim.i >= sim.list.length) finishSim(); else simRun();
  }
  function finishSim() {
    stopTick();
    const n = sim.rates.length;
    if (!n) { sim.phase = 'setup'; return renderSim(); }
    const pct = Math.round(sim.rates.reduce((a, b) => a + b, 0) / (n * 2) * 100);
    state.sims.push({ t: Date.now(), pct, n }); state.sims = state.sims.slice(-30); save();
    sim.phase = 'done'; renderSim();
  }
  function simResult() {
    const n = sim.rates.length, pct = state.sims[state.sims.length - 1].pct;
    const used = sim.list.slice(0, n);
    const weak = used.filter((q, i) => sim.rates[i] < 2), strong = used.filter((q, i) => sim.rates[i] === 2);
    const level = pct >= 80 ? 'عالی! آماده‌ی مصاحبه‌اید 🔥' : pct >= 50 ? 'در مسیر خوبی هستید؛ کمی مرور لازم است 💪' : 'نیاز به مرور بیشتر دارید؛ از بخش آمادگی شروع کنید 📚';
    main.innerHTML = `<div class="sim"><div class="card result">
      <div class="big">${fa(pct)}٪</div><h2>${level}</h2>
      <p class="muted">${fa(strong.length)} سؤال مسلط · ${fa(weak.length)} سؤال برای مرور · از ${fa(n)} سؤال</p>
      <div class="opt-row" style="justify-content:center">
        <button class="btn btn--amber" id="rstar" type="button"${weak.length ? '' : ' disabled'}>☆ نشان‌دار کردن سؤال‌های ضعیف</button>
        <button class="btn btn--ghost" id="rdone" type="button"${strong.length ? '' : ' disabled'}>✓ ثبت مسلط‌ها به‌عنوان تمرین‌شده</button>
        <button class="btn" id="ragain" type="button">آزمون جدید</button>
      </div></div>
      ${weak.length ? `<div class="card" style="margin-top:16px"><h3>برای مرور</h3><ul class="weak">${weak.map(q => `<li><a href="#/prep/${esc(q.g.id)}?q=${q.id}">${esc(q.q)}</a></li>`).join('')}</ul></div>` : ''}
    </div>`;
    $('#rstar').addEventListener('click', () => { weak.forEach(q => state.star[q.id] = 1); save(); toast('سؤال‌های ضعیف نشان‌دار شدند'); });
    $('#rdone').addEventListener('click', () => { strong.forEach(q => state.done[q.id] = 1); save(); toast('ثبت شد'); });
    $('#ragain').addEventListener('click', () => { sim.phase = 'setup'; renderSim(); });
  }

  /* ---------- درباره ---------- */
  function renderAbout() {
    main.innerHTML = `<div class="about">
      <h1>درباره‌ی سرمشق</h1>
      <div class="grid grid--2">
        <div class="card"><p><b>سرمشق</b> گروهی از دانشجویان دانشگاه فرهنگیان اصفهان است که در حوزه‌ی راهنمایی، آموزش و مشاوره برای قبولی در کنکور فعالیت می‌کنند؛ با تمرکز بر <b>کنکور فرهنگیان</b> و <b>فرایند مصاحبه</b>.</p>
          <p>ما خودمان این مسیر را رفته‌ایم و می‌خواهیم تجربه و مطالب مرتب را در اختیار داوطلبان بعدی بگذاریم؛ ساده، شفاف و قابل‌اعتماد.</p>
          <div class="contact">
            <a class="btn" href="https://t.me/sarmashgh_cfu" target="_blank" rel="noopener">کانال تلگرام سرمشق</a>
            <a class="btn btn--ghost" href="https://t.me/Sarmashgh_Admin" target="_blank" rel="noopener">پیام به ادمین: @Sarmashgh_Admin</a>
          </div></div>
        <div class="card" style="display:grid;place-items:center"><img src="assets/logo.jpg" alt="نشان سرمشق" width="260" height="260" style="border-radius:50%"></div>
      </div>
      <section class="section"><div class="section__h"><h2>هدف‌های ما</h2></div>
        <div class="grid grid--3">
          <div class="card goal"><i>🎯</i><div><b>راهنمایی دقیق</b><p class="muted" style="margin:0">مسیر کنکور و گزینش فرهنگیان را قدم‌به‌قدم توضیح می‌دهیم.</p></div></div>
          <div class="card goal"><i>🧭</i><div><b>مشاوره‌ی همدلانه</b><p class="muted" style="margin:0">از تجربه‌ی دانشجویان همین دانشگاه کمک بگیرید.</p></div></div>
          <div class="card goal"><i>🎓</i><div><b>آمادگی مصاحبه</b><p class="muted" style="margin:0">بانک پرسش‌وپاسخ، شبیه‌ساز و جزوه‌ی قابل‌چاپ.</p></div></div>
        </div></section>
      <section class="section"><div class="card"><h3>نکته‌ی مهم درباره‌ی پاسخ‌ها</h3>
        <p class="muted" style="margin:0">پاسخ‌ها «نمونه» هستند و برای فهمیدن ساختار یک پاسخ خوب نوشته شده‌اند. در مصاحبه، آن‌ها را با اطلاعات واقعی، تجربه‌ی خودتان و زبان طبیعی بگویید. در پرسش‌های فقهی، رساله‌ی مرجع تقلید خود را مبنا قرار دهید و برای اخبار و موضوعات جاری، منابع رسمی را بررسی کنید.</p></div></section>
    </div>`;
  }

  /* ---------- رویدادهای مشترک (delegation) ---------- */
  main.addEventListener('click', e => {
    const t = e.target.closest('button, .tab');
    if (!t) return;
    if (t.classList.contains('q__h')) {
      const qel = t.closest('.q'); const open = qel.classList.toggle('open'); t.setAttribute('aria-expanded', open); if (open) fillAns(qel); return;
    }
    const act = t.dataset.act;
    if (act === 'done' || act === 'star') {
      const qel = t.closest('.q'), id = qel.dataset.id, store = state[act];
      if (store[id]) delete store[id]; else store[id] = 1;
      save(); refreshQ(qel);
      if (act === 'done' && view.filter === 'todo' && state.done[id]) { /* حفظ در لیست تا کاربر جابه‌جا نشود */ }
      return;
    }
    if (act === 'expand' || act === 'collapse') {
      $$('.q', t.closest('.cat__body')).forEach(q => { const o = act === 'expand'; q.classList.toggle('open', o); $('.q__h', q).setAttribute('aria-expanded', o); if (o) fillAns(q); }); return;
    }
    if (act === 'more') { view.limit += 60; renderList(); return; }
    if (t.dataset.filter) { view.filter = t.dataset.filter; $$('.seg button').forEach(b => b.setAttribute('aria-pressed', b === t)); renderList(); return; }
    if (t.classList.contains('tab')) { view.gid = t.dataset.gid; view.query = ''; const si = $('#psearch'); if (si) si.value = ''; history.replaceState(null, '', '#/prep/' + view.gid); renderTabs(); renderList(); return; }
  });

  /* ---------- جزوه PDF ---------- */
  const dlg = $('#pdfDlg');
  function openPdfDialog() {
    $('#pdfGroups').innerHTML = GROUPS.map(g => `<label class="check"><input type="checkbox" name="pg" value="${esc(g.id)}" checked> ${esc(g.icon)} ${esc(g.title)} <span class="muted small">(${fa(gStats(g).n)} سؤال)</span></label>`).join('');
    if (typeof dlg.showModal === 'function') dlg.showModal(); else buildAndPrint();
  }
  function buildPrint() {
    const ids = $$('input[name="pg"]:checked').map(i => i.value);
    const withA = $('#pdfAnswers').checked, starOnly = $('#pdfStarOnly').checked;
    const gs = GROUPS.filter(g => ids.includes(g.id)).map(g => ({ g, cats: g.cats.map(c => ({ c, qs: c.qs.filter(q => !starOnly || state.star[q.id]) })).filter(x => x.qs.length) })).filter(x => x.cats.length);
    if (!gs.length) return null;
    const total = gs.reduce((s, x) => s + x.cats.reduce((a, y) => a + y.qs.length, 0), 0);
    let html = `<section class="p-cover"><img src="assets/logo.jpg" alt=""><h1>جزوه‌ی آمادگی مصاحبه</h1><p>دانشگاه فرهنگیان</p><p>${withA ? 'پرسش‌وپاسخ' : 'برگه‌ی خودآزمایی'} · ${fa(total)} سؤال</p><p>گروه سرمشق — دانشجویان دانشگاه فرهنگیان اصفهان</p><p class="muted">${faDate(Date.now())}</p><div class="p-contact">t.me/sarmashgh_cfu · @Sarmashgh_Admin</div></section>`;
    html += `<section class="p-toc"><h2>فهرست مطالب</h2>${gs.map(x => `<div class="g">${esc(x.g.icon)} ${esc(x.g.title)}</div><ol>${x.cats.map(y => `<li>${esc(y.c.title)} <span class="muted">(${fa(y.qs.length)})</span></li>`).join('')}</ol>`).join('')}</section>`;
    for (const x of gs) {
      html += `<section class="p-group"><h1>${esc(x.g.icon)} ${esc(x.g.title)}</h1>`;
      for (const y of x.cats) {
        html += `<div class="p-cat"><h2>${esc(y.c.title)}</h2>${y.c.desc ? `<p class="d">${esc(y.c.desc)}</p>` : ''}`;
        y.qs.forEach((q, i) => { html += `<div class="p-q"><h3><span>${fa(i + 1)}.</span>${esc(q.q)}</h3>${withA ? `<div class="ans">${ansHTML(q.blocks)}</div>` : '<div class="blank"></div><div class="blank"></div>'}</div>`; });
        html += '</div>';
      }
      html += '</section>';
    }
    html += `<p class="p-foot">سرمشق · t.me/sarmashgh_cfu — پاسخ‌ها نمونه‌اند؛ با اطلاعات و زبان خودتان بیان کنید.</p>`;
    return html;
  }
  function buildAndPrint() {
    const html = buildPrint();
    if (!html) { toast('بخشی برای چاپ انتخاب نشده است'); return; }
    const root = $('#printRoot'); root.innerHTML = html;
    const imgs = $$('img', root); let left = imgs.length;
    const go = () => setTimeout(() => window.print(), 150);
    if (!left) return go();
    imgs.forEach(im => { if (im.complete) { if (!--left) go(); } else { im.onload = im.onerror = () => { if (!--left) go(); }; } });
  }
  $('#pdfBtn').addEventListener('click', openPdfDialog);
  $('#pdfGo').addEventListener('click', () => { dlg.close(); buildAndPrint(); });
  window.addEventListener('afterprint', () => { $('#printRoot').innerHTML = ''; });

  /* ---------- شروع ---------- */
  if (!GROUPS.length) main.innerHTML = '<div class="empty">محتوا بارگذاری نشد. فایل content/content.js را بررسی کنید.</div>';
  else route();
})();
