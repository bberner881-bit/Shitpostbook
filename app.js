/* Fucking Color This! — app: routing, the Filthy Lineup, Pick by Mood, the coloring desk. */
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const app = $('#app');
  const TOTAL = DESIGNS.length;

  // ------------------------------------------------------------ storage
  const LS = {
    get(k, d) { try { const v = localStorage.getItem('fct.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('fct.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem('fct.' + k); } catch (e) { } },
  };
  const state = {
    color: LS.get('color', '#ff3ea5'),
    set: LS.get('set', 'markers'),
    tool: 'fill',
    recent: LS.get('recent', []),
    done: new Set(LS.get('done', [])),
    zoom: LS.get('zoom', 1),
    filter: { status: 'all', mood: 0 },
  };
  const fillsOf = (id) => LS.get('fills.' + id, {});
  const saveFills = (id, fills) => { if (Object.keys(fills).length) LS.set('fills.' + id, fills); else LS.del('fills.' + id); };
  const hasFills = (id) => Object.keys(fillsOf(id)).length > 0;

  // ------------------------------------------------------------ palettes
  const PALETTES = {
    markers: { name: 'Markers', colors: ['#ff3ea5', '#ff5c5c', '#ff8a2a', '#ffe03a', '#b6ff3a', '#6cff5c', '#3ae8a6', '#3ee9ff', '#3aa0ff', '#6c6cff', '#a06cff', '#e05cff', '#c2185b', '#d32f2f', '#ef6c00', '#f9a825', '#7cb342', '#2e7d32', '#00897b', '#0097a7', '#1565c0', '#283593', '#6a1b9a', '#1a1a1a'] },
    pencils: { name: 'Pencil crayons', colors: ['#f48fb1', '#ef9a9a', '#ffcc80', '#fff59d', '#c5e1a5', '#a5d6a7', '#80cbc4', '#80deea', '#90caf9', '#9fa8da', '#ce93d8', '#bcaaa4', '#e57373', '#ba68c8', '#7986cb', '#4fc3f7', '#4db6ac', '#aed581', '#dce775', '#ffd54f', '#ffb74d', '#a1887f', '#90a4ae', '#616161'] },
    neon: { name: 'Neon gel pens', colors: ['#ff00a8', '#ff2d2d', '#ff6a00', '#ffee00', '#aaff00', '#00ff66', '#00ffd5', '#00e5ff', '#0088ff', '#5d5dff', '#b400ff', '#ff00ff', '#ff5ec4', '#ff7b7b', '#ffa65c', '#fff66b', '#ccff66', '#66ffa6', '#66ffe6', '#66f0ff', '#66b8ff', '#9e9eff', '#d166ff', '#ff66ff'] },
    pastels: { name: 'Pastels', colors: ['#ffd1dc', '#ffc8b4', '#ffe8a3', '#fff5b8', '#d8f3c6', '#c8f0d6', '#c6efe8', '#c9eefa', '#cfe0ff', '#dcd6ff', '#ecd4ff', '#ffd6f5', '#f6c1c1', '#f8dcc4', '#f3ecc2', '#e3f1c9', '#cbe8d6', '#c5e5e5', '#cddcf2', '#d8d2f0', '#e8d0ea', '#f1d3dd', '#e5e1d8', '#d8dde3'] },
    earthy: { name: 'Earthy', colors: ['#7b3f00', '#a0522d', '#c27c3a', '#d9a066', '#e8c48a', '#f2dcb3', '#556b2f', '#6b8e23', '#8fbc5a', '#2f4f4f', '#4e6e81', '#7a9aa8', '#3e2723', '#5d4037', '#8d6e63', '#a1887f', '#bcaaa4', '#d7ccc8', '#33691e', '#558b2f', '#827717', '#37474f', '#546e7a', '#78909c'] },
    gothic: { name: 'Gothic', colors: ['#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#b30000', '#e60000', '#ff1a1a', '#4a0072', '#7b1fa2', '#9c27b0', '#0d0d1a', '#1b1b3a', '#2d2d5a', '#3a0a0a', '#5c0a0a', '#800000', '#006064', '#004d40', '#1b5e20', '#b8860b', '#ffd700', '#f5f5f5'] },
  };

  // ------------------------------------------------------------ compose cache
  const comps = new Map();
  function compOf(d) {
    if (!comps.has(d.id)) comps.set(d.id, composeDesign(d, RENDER.measure));
    return comps.get(d.id);
  }
  const byId = (id) => DESIGNS.find(d => d.id === Number(id));
  const slug = (d) => d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // ------------------------------------------------------------ toast
  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // ------------------------------------------------------------ progress
  function updateProgress() {
    $('#progress-text').textContent = `${state.done.size} / ${TOTAL}`;
    $('#progress-bar').style.width = (state.done.size / TOTAL * 100) + '%';
  }
  function setDone(id, on) {
    if (on) state.done.add(id); else state.done.delete(id);
    LS.set('done', [...state.done]);
    updateProgress();
  }

  // ------------------------------------------------------------ gate
  function gate() {
    const g = $('#gate');
    if (LS.get('gate', false)) return;
    g.hidden = false;
    $('#gate-yes').onclick = () => { LS.set('gate', true); g.hidden = true; };
    $('#gate-no').onclick = () => { $('.gate-actions', g).hidden = true; $('#gate-nope').hidden = false; };
  }

  // ------------------------------------------------------------ thumbnails (lazy)
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target; io.unobserve(el);
      const d = byId(el.dataset.id);
      el.innerHTML = RENDER.toSVG(compOf(d), fillsOf(d.id), { className: 'thumb-svg', attrs: 'aria-hidden="true"' });
    }
  }, { rootMargin: '300px' });

  function card(d) {
    const done = state.done.has(d.id), started = hasFills(d.id);
    const m = MOODS[d.m];
    return `<article class="card ${done ? 'done' : ''}">
      <a class="thumb" href="#/page/${d.id}" data-id="${d.id}" aria-label="Color ${d.name}"></a>
      ${done ? '<span class="ribbon">DONE</span>' : started ? '<span class="started">IN PROGRESS</span>' : ''}
      <div class="meta">
        <span class="num">PAGE ${String(d.id).padStart(2, '0')}</span>
        <a class="name" href="#/page/${d.id}" style="color:inherit;text-decoration:none">${d.name}</a>
        <div class="row"><span class="mood mood-${d.m}">${m.name}</span>
          <label class="check" title="Tick it off The Filthy Lineup"><input type="checkbox" data-done="${d.id}" ${done ? 'checked' : ''}> Finished</label></div>
      </div></article>`;
  }
  function wireCards(root) {
    $$('.thumb', root).forEach(el => io.observe(el));
    $$('input[data-done]', root).forEach(cb => cb.addEventListener('change', () => {
      setDone(Number(cb.dataset.done), cb.checked);
      cb.closest('.card').classList.toggle('done', cb.checked);
      const art = cb.closest('.card');
      let rib = $('.ribbon', art);
      if (cb.checked && !rib) { rib = document.createElement('span'); rib.className = 'ribbon'; rib.textContent = 'DONE'; art.insertBefore(rib, art.children[1]); }
      if (!cb.checked && rib) rib.remove();
      toast(cb.checked ? 'Ticked off. Look at you, finishing things.' : 'Un-finished. No judgment.');
    }));
  }
  function filtered(list) {
    return list.filter(d => {
      if (state.filter.mood && d.m !== state.filter.mood) return false;
      const st = state.filter.status;
      if (st === 'done') return state.done.has(d.id);
      if (st === 'started') return hasFills(d.id) && !state.done.has(d.id);
      if (st === 'new') return !hasFills(d.id) && !state.done.has(d.id);
      return true;
    });
  }

  // ------------------------------------------------------------ views
  function viewLineup() {
    // a pre-coloured page 1 for the hero, like a cover
    const hero = DESIGNS[0];
    const rng = motifRng(99);
    const comp = compOf(hero);
    const heroFills = {};
    const pal = PALETTES.markers.colors;
    comp.items.forEach(it => { if (it.i != null && it.i > 0) heroFills[it.i] = pal[Math.floor(rng() * 12)]; });
    heroFills[0] = '#fff7d6';
    app.innerHTML = `
      <section class="hero">
        <div>
          <h1 class="rainbow">Color Away<br>the Bullshit!</h1>
          <p>Life is stressful, people can be idiots, and sometimes the only healthy response is a page full of profanity. This is the web edition of the <strong>Fucking Color This!</strong> coloring books: ${TOTAL} bold, vulgar word designs dressed up in flowers, mushrooms, skulls and checkerboards. Tap a shape, pick a color, feel better.</p>
          <p>Pick by mood, not by page number. Tick each one off The Filthy Lineup. Save it, print it, send it to the coworker who has seen things.</p>
          <div class="actions">
            <a class="btn big pink" href="#/page/1">Start at Page 1</a>
            <a class="btn big" href="#/mood">Pick by Mood</a>
            <button class="btn big cyan" id="surprise">Surprise me</button>
          </div>
        </div>
        <div class="hero-cover">${RENDER.toSVG(comp, heroFills, { className: 'cover-svg', attrs: 'aria-hidden="true"' })}
          <div class="sticker"><div><b>${TOTAL}</b>ways to color through the bullshit</div></div></div>
      </section>
      <h2 class="section-title">The Filthy Lineup</h2>
      <p class="lead">All ${TOTAL} designs, easy to medium complexity, large clean outlines. Your progress is saved on this device.</p>
      <div class="toolbar" id="filters">
        ${[['all', 'All'], ['new', 'Not started'], ['started', 'In progress'], ['done', 'Finished']].map(([k, l]) => `<button class="chip ${state.filter.status === k ? 'on' : ''}" data-status="${k}">${l}</button>`).join('')}
        <span class="spacer"></span>
        <button class="chip ${state.filter.mood === 0 ? 'on' : ''}" data-mood="0">Any mood</button>
        ${[1, 2, 3, 4, 5].map(m => `<button class="chip ${state.filter.mood === m ? 'on' : ''}" data-mood="${m}"><i class="dot" style="background:${MOODS[m].color}"></i>${MOODS[m].name}</button>`).join('')}
      </div>
      <div class="grid" id="grid"></div>`;
    const grid = $('#grid');
    const draw = () => {
      const list = filtered(DESIGNS);
      grid.innerHTML = list.length ? list.map(card).join('') : `<p class="lead">Nothing here yet. Go make a mess.</p>`;
      wireCards(grid);
    };
    draw();
    $('#filters').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.status) state.filter.status = b.dataset.status;
      if (b.dataset.mood != null) state.filter.mood = Number(b.dataset.mood);
      $$('[data-status]').forEach(x => x.classList.toggle('on', x.dataset.status === state.filter.status));
      $$('[data-mood]').forEach(x => x.classList.toggle('on', Number(x.dataset.mood) === state.filter.mood));
      draw();
    });
    $('#surprise').onclick = () => surprise();
  }

  function surprise(mood) {
    let pool = DESIGNS.filter(d => !state.done.has(d.id) && (!mood || d.m === mood));
    if (!pool.length) pool = DESIGNS.filter(d => !mood || d.m === mood);
    const d = pool[Math.floor(Math.random() * pool.length)];
    location.hash = '#/page/' + d.id;
  }

  function viewMood(level) {
    level = Number(level) || 0;
    const counts = {}; DESIGNS.forEach(d => counts[d.m] = (counts[d.m] || 0) + 1);
    app.innerHTML = `
      <h1 class="section-title rainbow" style="font-size:clamp(34px,6vw,60px)">Pick by Mood</h1>
      <p class="lead">"Something gentle" and "the nuclear option" are different coloring sessions. Where are you at today?</p>
      <div class="moods">
        ${[1, 2, 3, 4, 5].map(m => `<button class="mood-card" style="background:${MOODS[m].color}; ${level === m ? 'outline:4px solid #fff; outline-offset:2px;' : ''}" data-mood="${m}">
          <small>LEVEL ${m}</small><h3>${MOODS[m].name}</h3><p>${MOODS[m].blurb}</p><small>${counts[m] || 0} pages</small></button>`).join('')}
      </div>
      <div class="toolbar">
        <button class="btn cyan" id="surprise">Surprise me${level ? ' · ' + MOODS[level].name : ''}</button>
        ${level ? '<a class="btn ghost" href="#/mood">Show every mood</a>' : ''}
      </div>
      <div class="grid" id="grid"></div>`;
    const list = level ? DESIGNS.filter(d => d.m === level) : DESIGNS;
    $('#grid').innerHTML = list.map(card).join('');
    wireCards($('#grid'));
    $$('.mood-card').forEach(b => b.onclick = () => { location.hash = '#/mood/' + b.dataset.mood; });
    $('#surprise').onclick = () => surprise(level);
  }

  function viewAbout() {
    app.innerHTML = `
      <section class="about">
        <h1 class="rainbow">Officially Out of Fucks</h1>
        <p><strong>Fucking Color This!</strong> is an adult coloring book series for people who are officially out of fucks to give. From Dano Unsupervised and author Daniel C Willox, every paperback packs 40 bold, funny and outrageously vulgar word designs, one slogan per page, dressed up in flowers, mushrooms, skulls, checkerboards and bad decisions.</p>
        <p>This is the <strong>web edition</strong>: the same idea, in your browser, free. Our house rule still applies: once a slogan appears in one book, it is never recycled into another. So every one of these ${TOTAL} pages is new. New shelf, new insults, new favorites.</p>
        <div class="cols">
          <div class="panel"><h3>How to color</h3>
            <p><strong>Tap a shape</strong> to fill it with the current color. Drag across shapes to fill a bunch at once.</p>
            <p><strong>Eraser</strong> puts a shape back to white. <strong>Eyedropper</strong> grabs a color you already used.</p>
            <p><strong>Fuck it</strong> colors the whole page at random when you cannot be bothered. Undo exists. So does redo.</p>
            <p>Pinch or use the zoom slider for the small bits. Everything saves on your device as you go.</p></div>
          <div class="panel"><h3>What you get</h3>
            <p>${TOTAL} unique swear word coloring pages, easy to medium complexity, large clean outlines.</p>
            <p>The Filthy Lineup, a checkbox tracker for every design, plus Pick by Mood to help you choose your next page.</p>
            <p>Save any page as a PNG, share it straight from your phone, or print a blank copy for real pencils. Every design sits in a clean frame with an even margin, so finished pages look sharp and frame-ready.</p></div>
        </div>
        <p style="margin-top:18px">Strictly adults only, obviously. This series does not do inspirational quotes about journeys and it does not apologize. It does make an excellent gift for the coworker who has seen things, the friend who swears like a sailor, and anyone who has ever smiled politely while screaming internally.</p>
        <p>Want the paper version with the solid black backs and the single-sided pages? <a href="https://www.amazon.ca/dp/B0HQJYFW2M" target="_blank" rel="noopener">The books are on Amazon</a>. Finished a page you are proud of? Post a photo and share it with a friend. Reviews and shares are how a foul-mouthed little series like this survives.</p>
        <p><strong>Color away the bullshit.</strong></p>
        <div class="toolbar"><a class="btn big pink" href="#/">Back to The Filthy Lineup</a><button class="btn ghost" id="reset">Wipe my progress on this device</button></div>
      </section>`;
    $('#reset').onclick = () => {
      if (!confirm('Wipe every coloured page and the Lineup ticks on this device? This cannot be undone.')) return;
      DESIGNS.forEach(d => LS.del('fills.' + d.id));
      state.done.clear(); LS.set('done', []); updateProgress();
      toast('Clean slate. Fresh out of fucks again.');
    };
  }

  // ------------------------------------------------------------ coloring desk
  let desk = null; // live session for the open page
  function viewPage(id) {
    const d = byId(id);
    if (!d) { location.hash = '#/'; return; }
    const comp = compOf(d);
    const fills = fillsOf(d.id);
    const m = MOODS[d.m];
    const prev = d.id > 1 ? d.id - 1 : TOTAL, next = d.id < TOTAL ? d.id + 1 : 1;
    app.innerHTML = `
      <div class="color-view">
        <section class="desk">
          <div class="desk-head">
            <span class="num">PAGE ${String(d.id).padStart(2, '0')} / ${TOTAL}</span>
            <h2>${d.name}</h2>
            <span class="mood mood-${d.m}">${m.name}</span>
            <span class="spacer"></span>
            <div class="tool-row">
              <button class="btn sm ghost" id="undo" title="Undo (Ctrl+Z)">↶ Undo</button>
              <button class="btn sm ghost" id="redo" title="Redo (Ctrl+Y)">↷ Redo</button>
              <button class="btn sm ghost" id="clear">Clear page</button>
            </div>
          </div>
          <div class="sheet-wrap" id="wrap">${RENDER.toSVG(comp, fills, { attrs: 'id="sheet"' })}</div>
          <div class="desk-foot">
            <label class="zoom">Zoom <input type="range" id="zoom" min="1" max="3" step="0.1" value="${state.zoom}"></label>
            <span class="spacer"></span>
            <a class="btn sm ghost" href="#/page/${prev}">← Page ${prev}</a>
            <a class="btn sm ghost" href="#/">Lineup</a>
            <a class="btn sm ghost" href="#/page/${next}">Page ${next} →</a>
          </div>
        </section>
        <aside class="tools">
          <div class="panel"><h3>Tool</h3>
            <div class="tool-row">
              <button class="btn sm on" data-tool="fill" title="Tap a shape to fill it">🪣 Fill</button>
              <button class="btn sm" data-tool="erase" title="Back to white">🧽 Eraser</button>
              <button class="btn sm" data-tool="pick" title="Grab a color from the page">💉 Eyedropper</button>
              <button class="btn sm purple" id="auto" title="Color the whole page at random">🎲 Fuck it</button>
            </div></div>
          <div class="panel"><h3>Colors</h3>
            <div class="current"><div class="swatch-big" id="cur-sw"></div><div><div class="lbl">Current color</div><div class="hex" id="cur-hex"></div></div></div>
            <div class="sets" id="sets">${Object.entries(PALETTES).map(([k, p]) => `<button class="chip ${state.set === k ? 'on' : ''}" data-set="${k}">${p.name}</button>`).join('')}</div>
            <div class="swatches" id="swatches"></div>
            <label class="custom">Custom <input type="color" id="custom" value="${state.color}"></label>
            <div class="recent" id="recent"></div></div>
          <div class="panel"><h3>Done with it?</h3>
            <label class="finish"><input type="checkbox" id="finished" ${state.done.has(d.id) ? 'checked' : ''}> Mark finished on the Lineup</label>
            <div class="tool-row" style="margin-top:12px">
              <button class="btn sm green" id="save">⬇ Save PNG</button>
              <button class="btn sm cyan" id="share">Share</button>
              <button class="btn sm" id="print-color">🖨 Print colored</button>
              <button class="btn sm ghost" id="print-blank">Print blank</button>
            </div>
            <p class="hint">Blank prints are made for pencils, gel pens and markers. For heavy or alcohol markers, slip a sheet of cardstock behind the page. Finished pages are frame-ready.</p>
          </div>
        </aside>
      </div>`;

    const svg = $('#sheet'), wrap = $('#wrap');
    desk = { d, comp, fills, undo: [], redo: [], stroke: null, painting: false, saveT: null };
    const regionEls = new Map(); $$('.r', svg).forEach(el => regionEls.set(Number(el.dataset.r), el));
    const defaultOf = (i) => comp.items.find(it => it.i === i).df;

    const persist = () => { clearTimeout(desk.saveT); desk.saveT = setTimeout(() => saveFills(d.id, desk.fills), 250); };
    const applyFill = (i, color) => {
      const el = regionEls.get(i); if (!el) return;
      if (color == null || color === defaultOf(i)) { delete desk.fills[i]; el.setAttribute('fill', defaultOf(i)); }
      else { desk.fills[i] = color; el.setAttribute('fill', color); }
    };
    const paintRegion = (i) => {
      const prev = desk.fills[i] || null;
      let next;
      if (state.tool === 'fill') next = state.color;
      else if (state.tool === 'erase') next = null;
      else { const c = desk.fills[i] || defaultOf(i); setColor(c); setTool('fill'); toast('Picked ' + c); return; }
      if (prev === next) return;
      if (!desk.stroke) desk.stroke = [];
      if (!desk.stroke.some(s => s.i === i)) desk.stroke.push({ i, prev, next });
      applyFill(i, next); persist();
    };
    const endStroke = () => {
      desk.painting = false;
      if (desk.stroke && desk.stroke.length) { desk.undo.push(desk.stroke); desk.redo.length = 0; if (desk.undo.length > 200) desk.undo.shift(); }
      desk.stroke = null; updateUndo();
      if (state.tool === 'fill') pushRecent(state.color);
    };
    const updateUndo = () => { $('#undo').disabled = !desk.undo.length; $('#redo').disabled = !desk.redo.length; };
    const regionAt = (e) => { const t = e.target.closest ? e.target.closest('.r') : null; return t ? Number(t.dataset.r) : null; };
    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const i = regionAt(e); if (i == null) return;
      desk.painting = true; paintRegion(i); e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!desk.painting || state.tool === 'pick') return;
      // on touch the target sticks to the first element, so look under the finger
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const t = el && el.closest ? el.closest('.r') : null;
      if (t) paintRegion(Number(t.dataset.r));
    });
    window.addEventListener('pointerup', endStroke, { passive: true });
    window.addEventListener('pointercancel', endStroke, { passive: true });

    $('#undo').onclick = () => { const s = desk.undo.pop(); if (!s) return; s.forEach(x => applyFill(x.i, x.prev)); desk.redo.push(s); persist(); updateUndo(); };
    $('#redo').onclick = () => { const s = desk.redo.pop(); if (!s) return; s.forEach(x => applyFill(x.i, x.next)); desk.undo.push(s); persist(); updateUndo(); };
    $('#clear').onclick = () => {
      const keys = Object.keys(desk.fills).map(Number); if (!keys.length) return;
      const s = keys.map(i => ({ i, prev: desk.fills[i], next: null }));
      s.forEach(x => applyFill(x.i, null)); desk.undo.push(s); desk.redo.length = 0; persist(); updateUndo();
      toast('Wiped. Back to a blank page.');
    };
    $('#auto').onclick = () => {
      const pal = PALETTES[state.set].colors;
      const s = [];
      comp.items.forEach(it => {
        if (it.i == null || it.i === 0) return;
        const next = pal[Math.floor(Math.random() * pal.length)];
        s.push({ i: it.i, prev: desk.fills[it.i] || null, next }); applyFill(it.i, next);
      });
      desk.undo.push(s); desk.redo.length = 0; persist(); updateUndo();
      toast('Fuck it. Colored.');
    };
    updateUndo();

    // tools & colors
    function setTool(t) { state.tool = t; $$('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); svg.classList.toggle('erase', t === 'erase'); svg.classList.toggle('pick', t === 'pick'); }
    $$('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
    function setColor(c) {
      state.color = c; LS.set('color', c);
      $('#cur-sw').style.background = c; $('#cur-hex').textContent = c.toUpperCase(); $('#custom').value = c;
      $$('#swatches .sw, #recent .sw').forEach(s => s.classList.toggle('on', s.dataset.c === c));
      if (state.tool !== 'fill') setTool('fill');
    }
    function pushRecent(c) {
      state.recent = [c, ...state.recent.filter(x => x !== c)].slice(0, 10); LS.set('recent', state.recent); drawRecent();
    }
    function drawSwatches() {
      const pal = PALETTES[state.set];
      $('#swatches').innerHTML = pal.colors.map(c => `<button class="sw ${c === state.color ? 'on' : ''}" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('');
      $$('#swatches .sw').forEach(s => s.onclick = () => setColor(s.dataset.c));
      $$('#sets .chip').forEach(ch => ch.classList.toggle('on', ch.dataset.set === state.set));
    }
    function drawRecent() {
      $('#recent').innerHTML = state.recent.map(c => `<button class="sw ${c === state.color ? 'on' : ''}" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('');
      $$('#recent .sw').forEach(s => s.onclick = () => setColor(s.dataset.c));
    }
    $$('#sets .chip').forEach(ch => ch.onclick = () => { state.set = ch.dataset.set; LS.set('set', state.set); drawSwatches(); });
    $('#custom').addEventListener('input', (e) => setColor(e.target.value));
    $('#custom').addEventListener('change', (e) => pushRecent(e.target.value));
    drawSwatches(); drawRecent(); setColor(state.color); setTool('fill');

    // zoom
    const zoomInput = $('#zoom');
    const applyZoom = () => {
      const z = Number(zoomInput.value); state.zoom = z; LS.set('zoom', z);
      if (z <= 1) { svg.style.width = ''; wrap.classList.remove('zoomed'); }
      else { const base = Math.min(wrap.clientWidth - 28, 760); svg.style.width = Math.round(base * z) + 'px'; wrap.classList.add('zoomed'); }
    };
    zoomInput.addEventListener('input', applyZoom); applyZoom();

    // finish / export / print / share
    $('#finished').addEventListener('change', (e) => { setDone(d.id, e.target.checked); toast(e.target.checked ? 'Ticked off The Filthy Lineup.' : 'Un-ticked. Take your time.'); });
    const makePNG = () => new Promise(res => RENDER.toCanvas(comp, desk.fills, 1700).toBlob(res, 'image/png'));
    const fileName = `fucking-color-this-${String(d.id).padStart(2, '0')}-${slug(d)}.png`;
    $('#save').onclick = async () => {
      const blob = await makePNG(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000); toast('Saved. Fridge-worthy.');
    };
    $('#share').onclick = async () => {
      const blob = await makePNG(); const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Fucking Color This!', text: `I colored "${d.name}". Color away the bullshit: ${location.origin}${location.pathname}` }); } catch (e) { /* cancelled */ }
      } else { $('#save').click(); toast('Sharing is not supported here, so it downloaded instead.'); }
    };
    const printWith = (fills) => {
      const sheet = $('#print-sheet'); sheet.innerHTML = RENDER.toSVG(comp, fills, { className: 'print-svg' });
      window.print(); setTimeout(() => { sheet.innerHTML = ''; }, 1000);
    };
    $('#print-color').onclick = () => printWith(desk.fills);
    $('#print-blank').onclick = () => printWith({});
  }

  // keyboard
  window.addEventListener('keydown', (e) => {
    if (!desk || !(e.ctrlKey || e.metaKey)) return;
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); $('#undo') && $('#undo').click(); }
    else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); $('#redo') && $('#redo').click(); }
  });

  // ------------------------------------------------------------ router
  function route() {
    desk = null;
    const h = location.hash.replace(/^#\/?/, '');
    const [a, b] = h.split('/');
    let nav = 'lineup';
    if (a === 'page' && b) { viewPage(b); nav = ''; }
    else if (a === 'mood') { viewMood(b); nav = 'mood'; }
    else if (a === 'about') { viewAbout(); nav = 'about'; }
    else viewLineup();
    $$('.nav a').forEach(x => x.classList.toggle('on', x.dataset.nav === nav));
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------ boot
  async function boot() {
    gate(); updateProgress();
    app.innerHTML = '<p class="lead" style="text-align:center;padding:60px 0">Sharpening the pencils…</p>';
    await RENDER.ensureFonts(DESIGN_FONTS);
    window.addEventListener('hashchange', route);
    route();
  }
  boot();
})();
