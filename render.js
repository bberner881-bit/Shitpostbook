/* Renders a composed page to an SVG string (interactive sheet / thumbnails) or to a canvas (PNG export).
   Both renderers read the same item list so the saved picture matches the screen. */
(function () {
  const INK = '#1a1a1a';
  const BASE_SW = 3.4;
  let uid = 0;

  // ---- text measuring (canvas, same fonts as the page) ----
  const mc = document.createElement('canvas').getContext('2d');
  const mcache = new Map();
  function measure(ch, font) {
    const key = font + '|' + ch;
    if (mcache.has(key)) return mcache.get(key);
    mc.font = `100px "${font}", Impact, "Arial Black", sans-serif`;
    const m = mc.measureText(ch);
    const h = mc.measureText('H');
    const out = { w: m.width, asc: h.actualBoundingBoxAscent || 72 };
    mcache.set(key, out);
    return out;
  }
  function ensureFonts(fonts, timeoutMs = 5000) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const loads = fonts.map(f => document.fonts.load(`100px "${f}"`).catch(() => null));
    const timeout = new Promise(res => setTimeout(res, timeoutMs));
    return Promise.race([Promise.all(loads), timeout]).then(() => { mcache.clear(); });
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fontStack = (f) => `${f}, Impact, 'Arial Black', sans-serif`;

  function strokeWidth(sh, t) {
    const s = t ? t.s : 1;
    let w = BASE_SW * (sh.sw || 1) / s;
    if (s < 0.5) w *= 0.8;
    return Math.round(w * 100) / 100;
  }
  function textStroke(size) { return Math.max(9, Math.min(17, size * 0.085)); }

  function motifTransform(t, sh) {
    if (!t && !sh.rot && !sh.dx) return '';
    let tr = '';
    if (t) tr += `translate(${t.x} ${t.y}) rotate(${t.rot}) scale(${t.s}) `;
    if (sh.dx || sh.dy) tr += `translate(${sh.dx || 0} ${sh.dy || 0}) `;
    if (sh.k === 'path' && sh.rot) tr += `rotate(${sh.rot}) `;
    return tr.trim();
  }

  // ---- SVG ----
  function toSVG(comp, fills, opts = {}) {
    const id = 'c' + (++uid);
    fills = fills || {};
    const parts = [];
    const cls = opts.className || 'sheet';
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${comp.W} ${comp.H}" class="${cls}" ${opts.attrs || ''}>`);
    parts.push(`<defs><clipPath id="${id}"><rect x="${comp.frame.x + 4}" y="${comp.frame.y + 4}" width="${comp.frame.w - 8}" height="${comp.frame.h - 8}" rx="${comp.frame.rx - 3}"/></clipPath></defs>`);
    parts.push(`<rect x="0" y="0" width="${comp.W}" height="${comp.H}" fill="#fff"/>`);
    for (const it of comp.items) {
      const sh = it.s;
      const isRegion = it.i != null;
      const fill = isRegion ? (fills[it.i] || it.df) : (sh.ink ? it.df : 'none');
      const stroke = sh.ink ? 'none' : INK;
      const common = [];
      if (isRegion) common.push(`class="r" data-r="${it.i}"`); else common.push('pointer-events="none"');
      common.push(`fill="${fill}"`);
      if (sh.k !== 'text') { common.push(`stroke="${stroke}"`); if (!sh.ink) common.push(`stroke-width="${strokeWidth(sh, it.t)}" stroke-linejoin="round" stroke-linecap="round"`); }
      const tr = motifTransform(it.t, sh);
      const c = common.join(' ');
      let el = '';
      switch (sh.k) {
        case 'path':
          el = (`<path d="${sh.d}" ${c}${tr ? ` transform="${tr}"` : ''}/>`); break;
        case 'circle':
          el = (`<circle cx="${sh.cx}" cy="${sh.cy}" r="${sh.r}" ${c}${tr ? ` transform="${tr}"` : ''}/>`); break;
        case 'ellipse': {
          let t2 = tr;
          if (sh.rot) t2 += (t2 ? ' ' : '') + (sh.pivot ? `rotate(${sh.rot})` : `rotate(${sh.rot} ${sh.cx} ${sh.cy})`);
          el = (`<ellipse cx="${sh.cx}" cy="${sh.cy}" rx="${sh.rx}" ry="${sh.ry}" ${c}${t2 ? ` transform="${t2}"` : ''}/>`); break;
        }
        case 'rect':
          el = (`<rect x="${sh.x}" y="${sh.y}" width="${sh.w}" height="${sh.h}" rx="${sh.rx || 0}" ${c}${tr ? ` transform="${tr}"` : ''}/>`); break;
        case 'text': {
          const cx = sh.x + sh.w / 2, cy = sh.y - sh.size * 0.35;
          el = (`<text x="${sh.x}" y="${sh.y}" font-size="${sh.size}" font-family="${esc(fontStack(sh.font))}" ${c} stroke="${INK}" stroke-width="${textStroke(sh.size)}" stroke-linejoin="round" paint-order="stroke fill" transform="rotate(${sh.rot} ${cx.toFixed(1)} ${cy.toFixed(1)})">${esc(sh.ch)}</text>`); break;
        }
      }
      parts.push(sh.clip ? `<g clip-path="url(#${id})">${el}</g>` : el);
    }
    parts.push('</svg>');
    return parts.join('');
  }

  // ---- Canvas ----
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function toCanvas(comp, fills, widthPx) {
    fills = fills || {};
    const k = widthPx / comp.W;
    const cv = document.createElement('canvas');
    cv.width = Math.round(comp.W * k); cv.height = Math.round(comp.H * k);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const it of comp.items) {
      const sh = it.s, isRegion = it.i != null;
      const fill = isRegion ? (fills[it.i] || it.df) : (sh.ink ? it.df : null);
      ctx.save();
      if (sh.clip) { roundRectPath(ctx, comp.frame.x + 4, comp.frame.y + 4, comp.frame.w - 8, comp.frame.h - 8, comp.frame.rx - 3); ctx.clip(); }
      if (it.t) { ctx.translate(it.t.x, it.t.y); ctx.rotate(it.t.rot * Math.PI / 180); ctx.scale(it.t.s, it.t.s); }
      if (sh.dx || sh.dy) ctx.translate(sh.dx || 0, sh.dy || 0);
      ctx.strokeStyle = INK;
      ctx.lineWidth = strokeWidth(sh, it.t);
      switch (sh.k) {
        case 'path': {
          if (sh.rot) ctx.rotate(sh.rot * Math.PI / 180);
          const p = new Path2D(sh.d);
          if (fill) { ctx.fillStyle = fill; ctx.fill(p); }
          if (!sh.ink) ctx.stroke(p);
          break;
        }
        case 'circle':
          ctx.beginPath(); ctx.arc(sh.cx, sh.cy, sh.r, 0, Math.PI * 2);
          if (fill) { ctx.fillStyle = fill; ctx.fill(); }
          if (!sh.ink) ctx.stroke();
          break;
        case 'ellipse':
          ctx.beginPath();
          if (sh.rot && sh.pivot) { ctx.rotate(sh.rot * Math.PI / 180); ctx.ellipse(sh.cx, sh.cy, sh.rx, sh.ry, 0, 0, Math.PI * 2); }
          else ctx.ellipse(sh.cx, sh.cy, sh.rx, sh.ry, (sh.rot || 0) * Math.PI / 180, 0, Math.PI * 2);
          if (fill) { ctx.fillStyle = fill; ctx.fill(); }
          if (!sh.ink) ctx.stroke();
          break;
        case 'rect':
          roundRectPath(ctx, sh.x, sh.y, sh.w, sh.h, sh.rx || 0);
          if (fill) { ctx.fillStyle = fill; ctx.fill(); }
          if (!sh.ink) ctx.stroke();
          break;
        case 'text': {
          const cx = sh.x + sh.w / 2, cy = sh.y - sh.size * 0.35;
          ctx.translate(cx, cy); ctx.rotate(sh.rot * Math.PI / 180);
          ctx.font = `${sh.size}px ${fontStack(sh.font)}`;
          ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
          ctx.lineWidth = textStroke(sh.size);
          ctx.strokeText(sh.ch, sh.x - cx, sh.y - cy);
          ctx.fillStyle = fill || '#fff';
          ctx.fillText(sh.ch, sh.x - cx, sh.y - cy);
          break;
        }
      }
      ctx.restore();
    }
    return cv;
  }

  window.RENDER = { measure, ensureFonts, toSVG, toCanvas };
})();
